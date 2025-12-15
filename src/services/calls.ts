import { apiService } from './api';

export const callsService = {
  // Call Discovery & Matching
  availableUsers: async (params?: Record<string, any>) => {
    console.log('[callsService] Calling /calls/available-users with params:', params);
    const response = await apiService.get('/calls/available-users', { params });
    console.log('[callsService] Available users response:', response);
    return response;
  },

  searchUsers: async (searchTerm: string, language?: string) =>
    apiService.get('/calls/search-users', { params: { searchTerm, language } }),

  updateAvailability: async (status: 'Online' | 'Offline') =>
    apiService.put('/calls/availability', { status }),

  // Call Management
  initiate: async (data: { calleeId: string; topicId?: string }) =>
    apiService.post('/calls/initiate', data),

  respond: async (callId: string, accept: boolean) =>
    apiService.post(`/calls/${callId}/respond`, accept), // Sending boolean directly as per spec

  end: async (callId: string, reason?: string) =>
    apiService.post(`/calls/${callId}/end`, JSON.stringify(reason || 'Ended by user'), { headers: { 'Content-Type': 'application/json' } }),

  cancel: async (callId: string, reason?: string) =>
    apiService.post(`/calls/${callId}/cancel`, { reason }),

  mute: async (callId: string) =>
    apiService.post(`/calls/${callId}/mute`),

  unmute: async (callId: string) =>
    apiService.post(`/calls/${callId}/unmute`),

  // Call Details
  getCall: async (callId: string) =>
    apiService.get(`/calls/${callId}`),

  getCallStatus: async (callId: string) =>
    apiService.get(`/calls/${callId}/status`),

  // Call Feedback & Rating
  rate: async (callId: string, rating: number) =>
    apiService.post(`/calls/${callId}/rate`, rating, { headers: { 'Content-Type': 'application/json' } }),

  submitFeedback: async (callId: string, feedback: {
    clarity?: number;
    pacing?: number;
    helpfulness?: number;
    instructorKnowledge?: number;
    notes?: string;
  }) =>
    apiService.post(`/calls/${callId}/feedback`, feedback),

  // Call History
  history: async (params?: Record<string, any>) =>
    apiService.get('/calls/history', { params }),

  getMyIncomingCalls: async (params?: Record<string, any>) =>
    apiService.get('/calls/incoming', { params }),

  getMyOutgoingCalls: async (params?: Record<string, any>) =>
    apiService.get('/calls/outgoing', { params }),

  // WebRTC Configuration
  webrtcConfig: async () =>
    apiService.get('/calls/webrtc-config'),

  getStunServers: async () =>
    apiService.get('/calls/stun-servers'),

  // Call Recording
  startRecording: async (callId: string) =>
    apiService.post(`/calls/${callId}/record/start`),

  stopRecording: async (callId: string) =>
    apiService.post(`/calls/${callId}/record/stop`),

  getRecording: async (callId: string) =>
    apiService.get(`/calls/${callId}/recording`),

  // Call Statistics
  getCallStats: async (params?: Record<string, any>) =>
    apiService.get('/calls/stats', { params }),

  getUserCallStats: async (userId: string) =>
    apiService.get(`/calls/users/${userId}/stats`),

  // Admin Operations
  adminGetAllCalls: async (params?: Record<string, any>) =>
    apiService.get('/admin/calls', { params }),

  adminFlagCall: async (callId: string, reason: string) =>
    apiService.post(`/admin/calls/${callId}/flag`, { reason }),

  adminGetCallTranscript: async (callId: string) =>
    apiService.get(`/admin/calls/${callId}/transcript`),

  // Call Scheduling
  scheduleCall: async (data: {
    calleeId: string;
    scheduledTime: string;
    topicId?: string;
    notes?: string;
  }) =>
    apiService.post('/calls/schedule', data),

  getScheduledCalls: async (params?: Record<string, any>) =>
    apiService.get('/calls/scheduled', { params }),

  updateScheduledCall: async (callId: string, data: any) =>
    apiService.put(`/calls/${callId}/schedule`, data),

  cancelScheduledCall: async (callId: string, reason?: string) =>
    apiService.post(`/calls/${callId}/schedule/cancel`, { reason }),

  // Instructor Call Preferences
  setCallAvailability: async (availability: {
    isAvailable: boolean;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  }) =>
    apiService.post('/calls/instructor/availability', availability),

  getCallPreferences: async () =>
    apiService.get('/calls/instructor/preferences'),

  updateCallPreferences: async (preferences: any) =>
    apiService.put('/calls/instructor/preferences', preferences),

  // Call Queue
  joinCallQueue: async (topicId?: string) =>
    apiService.post('/calls/queue/join', { topicId }),

  leaveCallQueue: async () =>
    apiService.post('/calls/queue/leave'),

  getQueuePosition: async () =>
    apiService.get('/calls/queue/position'),
};

export default callsService;
