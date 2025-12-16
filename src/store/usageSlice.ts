import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UsageData } from '../types';

const VOICE_CALL_LIMIT_SECONDS = 300; // 5 minutes per session
const TRIAL_DURATION_HOURS = 24;

// Helper to get today's date string (YYYY-MM-DD)
const getTodayDateString = (): string => {
    return new Date().toISOString().split('T')[0];
};

// Load initial state from localStorage
const loadUsageData = (): UsageData => {
    try {
        const stored = localStorage.getItem('usageData');
        if (stored) {
            const data: UsageData = JSON.parse(stored);
            return data;
        }
    } catch (error) {
        console.error('Error loading usage data:', error);
    }

    // Return default state
    return {
        voiceCallUsedSeconds: 0,
        voiceCallLimitSeconds: VOICE_CALL_LIMIT_SECONDS,
        lastResetDate: getTodayDateString(),
    };
};

const initialState: UsageData = loadUsageData();

export const usageSlice = createSlice({
    name: 'usage',
    initialState,
    reducers: {
        // Increment voice call usage by seconds
        incrementVoiceCallUsage: (state, action: PayloadAction<number>) => {
            state.voiceCallUsedSeconds = Math.min(
                state.voiceCallUsedSeconds + action.payload,
                state.voiceCallLimitSeconds
            );
            localStorage.setItem('usageData', JSON.stringify(state));
        },

        // Round up current usage to nearest minute (for when call ends)
        // Backend rounds any partial minute to full minute (e.g., 35 sec = 1 min)
        roundUpToNearestMinute: (state) => {
            const remainder = state.voiceCallUsedSeconds % 60;
            if (remainder > 0) {
                // Round up to next minute
                const roundedSeconds = state.voiceCallUsedSeconds + (60 - remainder);
                state.voiceCallUsedSeconds = Math.min(roundedSeconds, state.voiceCallLimitSeconds);
                localStorage.setItem('usageData', JSON.stringify(state));
            }
        },

        // Reset voice call session (called when call ends or daily)
        resetVoiceCallSession: (state) => {
            state.voiceCallUsedSeconds = 0;
            localStorage.setItem('usageData', JSON.stringify(state));
        },

        // Reset daily usage (called on new day)
        resetDailyUsage: (state) => {
            state.voiceCallUsedSeconds = 0;
            state.lastResetDate = getTodayDateString();
            localStorage.setItem('usageData', JSON.stringify(state));
        },

        // Check and auto-reset if needed
        checkAndReset: (state) => {
            const today = getTodayDateString();
            if (state.lastResetDate !== today) {
                state.voiceCallUsedSeconds = 0;
                state.lastResetDate = today;
                localStorage.setItem('usageData', JSON.stringify(state));
            }
        },
    },
});

export const {
    incrementVoiceCallUsage,
    roundUpToNearestMinute,
    resetVoiceCallSession,
    resetDailyUsage,
    checkAndReset,
} = usageSlice.actions;

export default usageSlice.reducer;

