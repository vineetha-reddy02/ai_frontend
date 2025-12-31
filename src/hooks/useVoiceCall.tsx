import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
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

            // 3. Set state to ringing (waiting for response)
            // Note: We DO NOT join the session yet. We wait for CallAccepted event.
            dispatch(setCallStatus('ringing'));
            callLogger.stateTransition('initiating', 'ringing', callData.id || callData.callId);

            callLogger.info('Call initiated successfully', { callId: callData.id || callData.callId });

            // Force availability to Offline so user disappears from list
            // We do this optimistically to prevent new calls
            callsService.updateAvailability('Offline').catch(err =>
                callLogger.warning('Failed to set busy status on initiate', err)
            );

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

            let errorMessage = error?.response?.data?.message ||
                error?.response?.data?.title ||
                error?.message ||
                'Failed to initiate call';

            // Check for specific error scenarios
            if (errorMessage.toLowerCase().includes('busy') ||
                errorMessage.toLowerCase().includes('in call') ||
                errorMessage.toLowerCase().includes('incall') ||
                errorMessage.toLowerCase().includes('another call') ||
                errorMessage.toLowerCase().includes('not joinable')) {
                errorMessage = 'This user is already in a call. Please try calling someone else.';
            } else if (errorMessage.toLowerCase().includes('offline') ||
                errorMessage.toLowerCase().includes('unavailable')) {
                errorMessage = 'User is currently offline or unavailable.';
            }

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

            // 1. Accept Invitation via SignalR FIRST
            // This triggers CallAccepted for the Caller, who then waits for us to JoinCallSession
            callLogger.signalrInvoke('AcceptCallInvitation', callId);
            await signalRService.acceptCallInvitation(callId);
            callLogger.info('Accepted invitation via SignalR', { callId });

            // 2. Call API to confirm acceptance (Keep for data consistency/logs if needed, but rely on SignalR for flow)
            // We do this concurrently or after to ensure SignalR is fast
            try {
                callLogger.apiCall('POST', `/calls/${callId}/respond`, true);
                callsService.respond(callId, true).catch(err => {
                    callLogger.warning('REST respond failed (likely handled by SignalR)', err);
                });
            } catch (ignore) { /* Ignore REST errors if SignalR worked */ }

            // 3. Join SignalR group
            // Now that we've accepted, we join the session to exchange WebRTC signals
            callLogger.signalrInvoke('JoinCallSession', callId);
            await signalRService.joinCallSession(callId);
            callLogger.info('Joined SignalR session', { callId });

            // 4. Update Redux state
            // We don't have the full response from REST if we skip waiting for it, so we rely on current user + invitation data
            dispatch(acceptCallAction({
                callId: callId,
                callerId: incomingInvitation?.callerName || '', // Fallback, we might not have ID here easily without REST response
                callerName: incomingInvitation?.callerName || 'Caller',
                callerAvatar: incomingInvitation?.callerAvatar,
                calleeId: user?.id || '',
                calleeName: user?.fullName || 'Me',
                calleeAvatar: user?.avatar,
                status: 'accepted',
                initiatedAt: new Date().toISOString(),
            }));

            callLogger.stateTransition('incoming', 'connecting', callId);

            callLogger.info('Call accepsted successfully', { callId });

            // Force availability to Offline so user disappears from list
            callsService.updateAvailability('Offline').catch(err =>
                callLogger.warning('Failed to set busy status on accept', err)
            );

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

            // Determine partner name before ending
            const isIncoming = currentCall.calleeId === user?.id;
            const partnerName = isIncoming ? currentCall.callerName : currentCall.calleeName;

            // 1. Call API to end call
            callLogger.apiCall('POST', `/calls/${currentCall.callId}/end`, reason);
            await callsService.end(currentCall.callId, reason);
            callLogger.apiResponse(`/calls/${currentCall.callId}/end`, true);

            // 2. Leave SignalR session
            callLogger.signalrInvoke('LeaveCallSession', currentCall.callId);
            await signalRService.leaveCallSession(currentCall.callId);

            // 3. Update Redux state with partner name for rating modal
            dispatch(endCallAction({ partnerName }));
            callLogger.stateTransition(callState, 'idle', currentCall.callId);

            callLogger.info('Call ended successfully', { callId: currentCall.callId });

            return { success: true };
        } catch (error: any) {
            callLogger.error('Failed to end call properly', error);

            // End anyway to clean up state
            const isIncoming = currentCall?.calleeId === user?.id;
            const partnerName = isIncoming ? currentCall?.callerName : currentCall?.calleeName;
            dispatch(endCallAction({ partnerName: partnerName || 'User' }));

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

            // Call API to cancel (using end endpoint as requested)
            callLogger.apiCall('POST', `/calls/${currentCall.callId}/end`, reason);
            await callsService.end(currentCall.callId, reason);

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

    /**
     * Automatically manage user availability status based on call state
     */
    useEffect(() => {
        // Note: 'InCall' status is managed automatically by the backend when users join/leave calls
        // We don't need to manually update it here as it causes 400 errors

        // Revert to 'Online' (or preferred status) when call ends (becomes idle)
        if (callState === 'idle' && user) {
            const preferredStatus = localStorage.getItem('user_availability_preference') === 'offline' ? 'Offline' : 'Online';
            callLogger.info(`Reverting availability to ${preferredStatus}`);
            callsService.updateAvailability(preferredStatus as 'Online' | 'Offline').catch(err => {
                callLogger.warning(`Failed to revert to ${preferredStatus} status`, err);
            });
        }
    }, [callState, user]);

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

