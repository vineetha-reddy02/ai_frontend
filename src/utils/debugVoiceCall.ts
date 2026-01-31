/**
 * Debug Utility for Voice Call System
 * 
 * This file provides global debug functions accessible from the browser console
 * to help diagnose incoming call issues.
 * 
 * Usage from browser console:
 * - window.debugVoiceCall.checkState() - Check current call state
 * - window.debugVoiceCall.checkSocket() - Check socket connection
 * - window.debugVoiceCall.forceIncomingCall() - Simulate incoming call
 */

import { store } from '../store';
import { setIncomingInvitation } from '../store/callSlice';
import { signalRService } from '../services/signalr';

const debugVoiceCall = {
    /**
     * Check current Redux state
     */
    checkState() {
        const state = store.getState();
        const callState = state.call;

        console.log('📊 ============ VOICE CALL STATE ============');
        console.log('Call State:', callState.callState);
        console.log('Current Call:', callState.currentCall);
        console.log('Incoming Invitation:', callState.incomingInvitation);
        console.log('Socket Connected:', callState.signalRConnected);
        console.log('Is Call Active:', callState.isCallActive);
        console.log('Is Muted:', callState.isMuted);
        console.log('Duration:', callState.durationSeconds);
        console.log('==========================================');

        return callState;
    },

    /**
     * Check socket connection status
     */
    checkSocket() {
        const state = store.getState();
        const isConnected = state.call.signalRConnected;

        console.log('🔌 ============ SOCKET STATUS ============');
        console.log('Connected:', isConnected ? '✅ YES' : '❌ NO');
        console.log('=========================================');

        if (!isConnected) {
            console.warn('⚠️ Socket is NOT connected. Incoming calls will not work!');
            console.log('💡 Try refreshing the page or check your internet connection.');
        }

        return isConnected;
    },

    /**
     * Simulate an incoming call (for testing)
     */
    forceIncomingCall() {
        console.log('🧪 Simulating incoming call...');

        const mockPayload = {
            callId: Date.now().toString(),
            callerName: 'Test Caller',
            callerAvatar: 'https://via.placeholder.com/150',
            timestamp: new Date().toISOString(),
            expiresInSeconds: 60
        };

        console.log('📦 Mock Payload:', mockPayload);
        store.dispatch(setIncomingInvitation(mockPayload));

        console.log('✅ Mock incoming call dispatched');
        console.log('💡 Check if IncomingCallModal appears');
    },

    /**
     * Get detailed system info
     */
    getSystemInfo() {
        const state = store.getState();
        const authState = state.auth;
        const callState = state.call;

        console.log('🖥️ ============ SYSTEM INFO ============');
        console.log('User:', authState.user?.fullName);
        console.log('Role:', authState.user?.role);
        console.log('Is Authenticated:', authState.isAuthenticated);
        console.log('Token Exists:', !!authState.token);
        console.log('Socket Connected:', callState.signalRConnected);
        console.log('Call State:', callState.callState);
        console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
        console.log('========================================');

        return {
            user: authState.user,
            isAuthenticated: authState.isAuthenticated,
            socketConnected: callState.signalRConnected,
            callState: callState.callState
        };
    }
};

// Expose to window for console access
if (typeof window !== 'undefined') {
    (window as any).debugVoiceCall = debugVoiceCall;
    console.log('🔧 Debug utilities loaded. Type "window.debugVoiceCall" in console to access.');
}

export default debugVoiceCall;
