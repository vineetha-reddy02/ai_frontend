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
        trialActivatedAt: null,
        trialExpiresAt: null,
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
        // Activate trial period (called on user registration or first login)
        activateTrial: (state) => {
            if (!state.trialActivatedAt) {
                const now = new Date();
                // 18 minutes trial
                const expiresAt = new Date(now.getTime() + 18 * 60 * 1000);

                state.trialActivatedAt = now.toISOString();
                state.trialExpiresAt = expiresAt.toISOString();
                localStorage.setItem('usageData', JSON.stringify(state));
            }
        },

        // Increment voice call usage by seconds
        incrementVoiceCallUsage: (state, action: PayloadAction<number>) => {
            state.voiceCallUsedSeconds = Math.min(
                state.voiceCallUsedSeconds + action.payload,
                state.voiceCallLimitSeconds
            );
            localStorage.setItem('usageData', JSON.stringify(state));
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
    activateTrial,
    incrementVoiceCallUsage,
    resetVoiceCallSession,
    resetDailyUsage,
    checkAndReset,
} = usageSlice.actions;

export default usageSlice.reducer;
