import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VoiceCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  topicId?: string;
  topicTitle?: string;
  status: 'initiated' | 'ringing' | 'accepted' | 'ongoing' | 'completed' | 'rejected' | 'missed' | 'failed';
  initiatedAt: string;
  acceptedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  callQualityRating?: number;
}

export interface AvailableUser {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  status: 'Online' | 'Offline' | 'Busy';
  lastActiveAt?: string;
}

export interface CallInvitationEvent {
  callId: string;
  callerName: string;
  callerAvatar?: string;
  timestamp: string;
  expiresInSeconds: number;
}

interface CallState {
  calls: VoiceCall[];
  currentCall: VoiceCall | null;
  availableUsers: AvailableUser[];
  callHistory: VoiceCall[];
  isLoading: boolean;
  error: string | null;

  // Connection State
  signalRConnected: boolean;

  // Active Call State
  isCallActive: boolean;
  callState: 'idle' | 'initiating' | 'ringing' | 'incoming' | 'connecting' | 'active' | 'ending';
  incomingInvitation: CallInvitationEvent | null;

  // Media State (Non-serializable refs should be managed outside Redux, but we track status here)
  isMuted: boolean;
  isVideoEnabled: boolean; // Future proofing
  durationSeconds: number;

  // Rating Modal State
  lastCompletedCall: { callId: string; partnerName: string } | null;
  showRatingModal: boolean;
}

const initialState: CallState = {
  calls: [],
  currentCall: null,
  availableUsers: [],
  callHistory: [],
  isLoading: false,
  error: null,

  signalRConnected: false,

  isCallActive: false,
  callState: 'idle',
  incomingInvitation: null,

  isMuted: false,
  isVideoEnabled: false,
  durationSeconds: 0,

  lastCompletedCall: null,
  showRatingModal: false,
};

export const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSignalRConnected: (state, action: PayloadAction<boolean>) => {
      state.signalRConnected = action.payload;
    },
    setAvailableUsers: (state, action: PayloadAction<AvailableUser[]>) => {
      state.availableUsers = action.payload;
    },

    // Call Lifecycle
    initiateCall: (state, action: PayloadAction<VoiceCall>) => {
      state.currentCall = action.payload;
      state.callState = 'initiating';
      state.error = null;
    },
    setIncomingInvitation: (state, action: PayloadAction<CallInvitationEvent>) => {
      state.incomingInvitation = action.payload;
      state.callState = 'incoming';
    },
    clearIncomingInvitation: (state) => {
      state.incomingInvitation = null;
      if (state.callState === 'incoming') {
        state.callState = 'idle';
      }
    },
    acceptCall: (state, action: PayloadAction<VoiceCall>) => {
      state.currentCall = action.payload;
      state.callState = 'connecting';
      state.incomingInvitation = null;
    },
    setCallStatus: (state, action: PayloadAction<CallState['callState']>) => {
      state.callState = action.payload;
      if (action.payload === 'active') {
        state.isCallActive = true;
      }
    },
    updateCurrentCall: (state, action: PayloadAction<Partial<VoiceCall>>) => {
      if (state.currentCall) {
        state.currentCall = { ...state.currentCall, ...action.payload };
      }
    },

    // Call Controls
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    updateDuration: (state, action: PayloadAction<number>) => {
      state.durationSeconds = action.payload;
    },

    // Cleanup
    endCall: (state, action: PayloadAction<{ partnerName?: string } | undefined>) => {
      // Save call info for rating modal before clearing
      // Show rating modal if there was an active call (regardless of duration)
      if (state.currentCall && state.callState === 'active') {
        const partnerName = action?.payload?.partnerName || 'User';

        state.lastCompletedCall = {
          callId: state.currentCall.callId,
          partnerName: partnerName
        };
        state.showRatingModal = true;
      }

      state.currentCall = null;
      state.isCallActive = false;
      state.callState = 'idle';
      state.incomingInvitation = null;
      state.durationSeconds = 0;
      state.isMuted = false;
    },
    closeRatingModal: (state) => {
      state.showRatingModal = false;
      state.lastCompletedCall = null;
    },

    // History
    addCallToHistory: (state, action: PayloadAction<VoiceCall>) => {
      state.callHistory.unshift(action.payload);
    },
    setCallHistory: (state, action: PayloadAction<VoiceCall[]>) => {
      state.callHistory = action.payload;
    },

    // Emergency cleanup for stuck states
    forceResetCallState: (state) => {
      state.currentCall = null;
      state.isCallActive = false;
      state.callState = 'idle';
      state.incomingInvitation = null;
      state.durationSeconds = 0;
      state.isMuted = false;
      state.showRatingModal = false;
      state.lastCompletedCall = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setSignalRConnected,
  setAvailableUsers,
  initiateCall,
  setIncomingInvitation,
  clearIncomingInvitation,
  acceptCall,
  setCallStatus,
  updateCurrentCall,
  toggleMute,
  setMuted,
  updateDuration,
  endCall,
  closeRatingModal,
  addCallToHistory,
  setCallHistory,
  forceResetCallState,
} = callSlice.actions;

export default callSlice.reducer;
