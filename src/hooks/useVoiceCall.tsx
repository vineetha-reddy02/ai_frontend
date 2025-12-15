import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
    initiateCall as initiateCallAction,
    acceptCall as acceptCallAction,
    setCallStatus,
    endCall as endCallAction,
    toggleMute as toggleMuteAction,
    clearIncomingInvitation,
} from '../store/callSlice';
import { callsService } from '../services/calls';
import { signalRService } from '../services/signalr';
import { callLogger } from '../utils/callLogger';
import { showToast } from '../store/uiSlice';

/**
 * Custom hook for managing voice calls
 * Provides a clean interface for call operations with comprehensive logging
 */
export const useVoiceCall = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { currentCall, callState, isMuted, incomingInvitation } = useSelector(
        (state: RootState) => state.call
    );

    /**
     * Initiate a call to another user
     */
    const initiateCall = async (calleeId: string, topicId?: string) => {
        try {
            callLogger.info('Initiating call', { calleeId, topicId, callerId: user?.id });

            // Prepare payload
            const payload: any = {
                calleeId: calleeId,
            };

            // Only add topicId if it exists
            if (topicId) {
                payload.topicId = topicId;
            }

            // 1. Call API to initiate
            callLogger.apiCall('POST', '/calls/initiate', payload);
            callLogger.debug('Sending payload to backend:', payload);

            const response: any = await callsService.initiate(payload);
            callLogger.apiResponse('/calls/initiate', true, response);

            const callData = response.data || response;

            // 2. Update Redux state
            dispatch(initiateCallAction({
                callId: callData.id || callData.callId,
                callerId: user?.id || '',
                callerName: user?.fullName || 'Me',
                callerAvatar: user?.avatar,
                calleeId: callData.calleeId || calleeId,
                calleeName: callData.calleeName || 'User',
                calleeAvatar: callData.calleeAvatar,
                topicId: topicId,
                topicTitle: callData.topicTitle,
                status: 'initiated',
                initiatedAt: new Date().toISOString(),
            }));

            callLogger.stateTransition('idle', 'initiating', callData.id || callData.callId);

            // 3. Join SignalR call session
            callLogger.signalrInvoke('JoinCallSession', callData.id || callData.callId);
            await signalRService.joinCallSession(callData.id || callData.callId);

            // 4. Set state to ringing (waiting for response)
            dispatch(setCallStatus('ringing'));
            callLogger.stateTransition('initiating', 'ringing', callData.id || callData.callId);

            callLogger.info('Call initiated successfully', { callId: callData.id || callData.callId });

            return { success: true, callId: callData.id || callData.callId };
        } catch (error: any) {
            callLogger.error('Failed to initiate call', error);
            callLogger.apiResponse('/calls/initiate', false, error);

            // Log detailed backend error information
            if (error?.response) {
                callLogger.error('❌ Backend Error Details:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    url: error.config?.url
                });
            }

            dispatch(endCallAction());

            const errorMessage = error?.response?.data?.message ||
                error?.response?.data?.title ||
                error?.message ||
                'Failed to initiate call';

            // Show validation errors if present
            const validationErrors = error?.response?.data?.errors;
            if (validationErrors) {
                callLogger.error('Validation Errors:', validationErrors);
            }

            dispatch(showToast({
                message: errorMessage,
                type: 'error'
            }));

            return { success: false, error: errorMessage };
        }
    };

    /**
     * Accept an incoming call
     */
    const acceptCall = async (callId: string) => {
        try {
            callLogger.info('Accepting call', { callId });

            // 1. Join SignalR group FIRST to ensure we occupy the channel before telling Caller we accepted.
            // This prevents the "Offer sent before Callee joined group" race condition.
            callLogger.signalrInvoke('JoinCallSession', callId);
            await signalRService.joinCallSession(callId);
            callLogger.info('Joined SignalR session early to receive Offer', { callId });

            // 2. Call API to confirm acceptance (Triggering CallAccepted event to Caller)
            callLogger.apiCall('POST', `/calls/${callId}/respond`, true);
            const response: any = await callsService.respond(callId, true);
            callLogger.apiResponse(`/calls/${callId}/respond`, true, response);

            const callData = response.data || response;

            // 3. Update Redux state
            dispatch(acceptCallAction({
                callId: callId,
                callerId: callData.callerId || '',
                callerName: callData.callerName || incomingInvitation?.callerName || 'Caller',
                callerAvatar: callData.callerAvatar || incomingInvitation?.callerAvatar,
                calleeId: user?.id || '',
                calleeName: user?.fullName || 'Me',
                calleeAvatar: user?.avatar,
                status: 'accepted',
                initiatedAt: callData.initiatedAt || new Date().toISOString(),
            }));

            callLogger.stateTransition('incoming', 'connecting', callId);

            callLogger.info('Call accepsted successfully', { callId });

            return { success: true };
        } catch (error: any) {
            callLogger.error('Failed to accept call', { callId, error });
            callLogger.apiResponse(`/calls/${callId}/respond`, false, error);

            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Failed to accept call';

            dispatch(showToast({
                message: errorMessage,
                type: 'error'
            }));

            dispatch(clearIncomingInvitation());

            return { success: false, error: errorMessage };
        }
    };

    /**
     * Reject an incoming call
     */
    const rejectCall = async (callId: string) => {
        try {
            callLogger.info('Rejecting call', { callId });

            // Call API to reject
            callLogger.apiCall('POST', `/calls/${callId}/respond`, false);
            await callsService.respond(callId, false);
            callLogger.apiResponse(`/calls/${callId}/respond`, true);

            // Clear invitation
            dispatch(clearIncomingInvitation());

            callLogger.info('Call rejected successfully', { callId });

            return { success: true };
        } catch (error: any) {
            callLogger.error('Failed to reject call', { callId, error });
            callLogger.apiResponse(`/calls/${callId}/respond`, false, error);

            // Clear anyway
            dispatch(clearIncomingInvitation());

            return { success: false, error: error?.message };
        }
    };

    /**
     * End an active call
     */
    const endCall = async (reason: string = 'User ended call') => {
        try {
            if (!currentCall) {
                callLogger.warning('Attempted to end call but no active call found');
                return { success: false, error: 'No active call' };
            }

            callLogger.info('Ending call', { callId: currentCall.callId, reason });

            // 1. Call API to end call
            callLogger.apiCall('POST', `/calls/${currentCall.callId}/end`, reason);
            await callsService.end(currentCall.callId, reason);
            callLogger.apiResponse(`/calls/${currentCall.callId}/end`, true);

            // 2. Leave SignalR session
            callLogger.signalrInvoke('LeaveCallSession', currentCall.callId);
            await signalRService.leaveCallSession(currentCall.callId);

            // 3. Update Redux state
            dispatch(endCallAction());
            callLogger.stateTransition(callState, 'idle', currentCall.callId);

            callLogger.info('Call ended successfully', { callId: currentCall.callId });

            return { success: true };
        } catch (error: any) {
            callLogger.error('Failed to end call properly', error);

            // End anyway to clean up state
            dispatch(endCallAction());

            return { success: false, error: error?.message };
        }
    };

    /**
     * Toggle mute state
     */
    const toggleMute = async () => {
        try {
            if (!currentCall) {
                callLogger.warning('Attempted to toggle mute but no active call');
                return { success: false };
            }

            const newMuteState = !isMuted;

            callLogger.info(`${newMuteState ? 'Muting' : 'Unmuting'} call`, {
                callId: currentCall.callId
            });

            // Call API
            if (newMuteState) {
                await callsService.mute(currentCall.callId);
            } else {
                await callsService.unmute(currentCall.callId);
            }

            // Update Redux
            dispatch(toggleMuteAction());

            callLogger.info(`Call ${newMuteState ? 'muted' : 'unmuted'}`, {
                callId: currentCall.callId
            });

            return { success: true, muted: newMuteState };
        } catch (error: any) {
            callLogger.error('Failed to toggle mute', error);

            // Toggle anyway for user feedback
            dispatch(toggleMuteAction());

            return { success: false, error: error?.message };
        }
    };

    /**
     * Cancel an outgoing call (before it's answered)
     */
    const cancelCall = async (reason: string = 'User cancelled call') => {
        try {
            if (!currentCall) {
                return { success: false, error: 'No active call' };
            }

            callLogger.info('Cancelling call', { callId: currentCall.callId, reason });

            // Call API to cancel
            callLogger.apiCall('POST', `/calls/${currentCall.callId}/cancel`, { reason });
            await callsService.cancel(currentCall.callId, reason);

            // Leave SignalR session
            await signalRService.leaveCallSession(currentCall.callId);

            // Update Redux state
            dispatch(endCallAction());
            callLogger.stateTransition(callState, 'idle', currentCall.callId);

            callLogger.info('Call cancelled successfully', { callId: currentCall.callId });

            return { success: true };
        } catch (error: any) {
            callLogger.error('Failed to cancel call', error);

            // End anyway
            dispatch(endCallAction());

            return { success: false, error: error?.message };
        }
    };

    return {
        // State
        currentCall,
        callState,
        isMuted,
        incomingInvitation,

        // Actions
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        cancelCall,
    };
};

export default useVoiceCall;

