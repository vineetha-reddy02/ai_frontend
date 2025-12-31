import * as signalR from '@microsoft/signalr';
import { store } from '../store';
import { callsService } from './calls';
import {
    setSignalRConnected,
    setIncomingInvitation,
    clearIncomingInvitation,
    CallInvitationEvent,
    acceptCall,
    setCallStatus,
    endCall,
    updateDuration,
    initiateCall,
    VoiceCall
} from '../store/callSlice';
import { callLogger } from '../utils/callLogger';

// Event types based on the spec
class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private token: string | null = null;
    private isConnecting = false;

    public setToken(token: string) {
        this.token = token;
        callLogger.debug('SignalR token set', { tokenLength: token.length });
    }

    private connectingPromise: Promise<void> | null = null;

    private subscriberCount = 0;

    public async connect(hubUrl: string): Promise<void> {
        this.subscriberCount++;
        callLogger.debug(`SignalR connect requested. Subscribers: ${this.subscriberCount}`);

        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            callLogger.signalrConnection('connected');
            return;
        }

        // Return existing promise if already connecting to avoid race conditions
        if (this.connectingPromise) {
            callLogger.debug('SignalR connection already in progress, awaiting existing promise');
            return this.connectingPromise;
        }

        this.isConnecting = true;
        callLogger.signalrConnection('connecting');
        callLogger.debug('SignalR hub URL', { hubUrl });

        this.connectingPromise = (async () => {
            try {
                this.connection = new signalR.HubConnectionBuilder()
                    .withUrl(hubUrl, {
                        accessTokenFactory: () => this.token || '',
                        skipNegotiation: true,
                        transport: signalR.HttpTransportType.WebSockets
                    })
                    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                    .configureLogging(signalR.LogLevel.Information)
                    .build();

                // Increase timeout to avoid premature disconnections (default is 30s)
                this.connection.serverTimeoutInMilliseconds = 120000; // 2 minutes
                callLogger.debug('Set SignalR server timeout to 120s');

                // Connection lifecycle handlers
                this.connection.onclose((error) => {
                    callLogger.signalrConnection('disconnected');
                    if (error) {
                        callLogger.error('SignalR connection closed with error', error);
                    } else {
                        callLogger.info('SignalR connection closed gracefully');
                    }
                    store.dispatch(setSignalRConnected(false));
                });

                this.connection.onreconnecting((error) => {
                    callLogger.signalrConnection('reconnecting');
                    store.dispatch(setSignalRConnected(false)); // Mark as disconnected during reconnect
                    if (error) {
                        callLogger.warning('SignalR reconnecting due to error', error);
                    }
                });

                this.connection.onreconnected((connectionId) => {
                    callLogger.signalrConnection('reconnected');
                    callLogger.info('SignalR reconnected', { connectionId });
                    store.dispatch(setSignalRConnected(true));
                });

                // Register event handlers before starting
                this.registerHandlers();

                await this.connection.start();
                callLogger.signalrConnection('connected');
                callLogger.info('SignalR connected successfully', {
                    connectionId: this.connection.connectionId
                });
                store.dispatch(setSignalRConnected(true));
            } catch (err) {
                callLogger.signalrConnection('disconnected');
                callLogger.error('SignalR connection failed', err);
                store.dispatch(setSignalRConnected(false));
                throw err;
            } finally {
                this.isConnecting = false;
                this.connectingPromise = null;
            }
        })();

        return this.connectingPromise;
    }

    public async disconnect(): Promise<void> {
        this.subscriberCount--;
        if (this.subscriberCount < 0) this.subscriberCount = 0;

        callLogger.debug(`SignalR disconnect requested. Subscribers remaining: ${this.subscriberCount}`);

        if (this.connectingPromise) {
            callLogger.debug('Waiting for pending connection to complete before disconnecting');
            try {
                await this.connectingPromise;
            } catch (err) {
                // Ignore errors from the pending connection as we are about to disconnect anyway
                callLogger.debug('Pending connection failed, proceeding with disconnect');
            }
        }

        // If there are still active subscribers (e.g., from a remount), DO NOT disconnect.
        if (this.subscriberCount > 0) {
            callLogger.info('Skipping SignalR disconnect as there are still active subscribers');
            return;
        }

        if (this.connection) {
            callLogger.info('Disconnecting SignalR');
            try {
                await this.connection.stop();
            } catch (err) {
                callLogger.warning('Error stopping SignalR connection', err);
            }
            this.connection = null;
            store.dispatch(setSignalRConnected(false));
            callLogger.signalrConnection('disconnected');
        }
    }

    // --- Hub Methods (Client -> Server) ---

    public async joinCallSession(callId: string): Promise<void> {
        callLogger.signalrInvoke('JoinCallSession', { callId });
        await this.invoke('JoinCallSession', callId);
        callLogger.info('Joined call session', { callId });
    }

    public async acceptCallInvitation(callId: string): Promise<void> {
        callLogger.signalrInvoke('AcceptCallInvitation', { callId });
        await this.invoke('AcceptCallInvitation', callId);
        callLogger.info('Accepted call invitation', { callId });
    }

    public async leaveCallSession(callId: string): Promise<void> {
        callLogger.signalrInvoke('LeaveCallSession', { callId });
        await this.invoke('LeaveCallSession', callId);
        callLogger.info('Left call session', { callId });
    }

    public async notifyCallActive(callId: string): Promise<void> {
        callLogger.signalrInvoke('NotifyCallActive', { callId });
        await this.invoke('NotifyCallActive', callId);
        callLogger.info('Notified backend: call is active', { callId });
    }

    private async invoke(methodName: string, ...args: any[]): Promise<void> {
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            const warning = `Cannot invoke ${methodName}: SignalR disconnected`;
            callLogger.warning(warning);
            return;
        }
        try {
            await this.connection.invoke(methodName, ...args);
        } catch (err) {
            callLogger.error(`Error invoking ${methodName}`, err);
            throw err;
        }
    }

    // --- Event Handlers (Server -> Client) ---

    private registerHandlers() {
        if (!this.connection) return;

        callLogger.debug('Registering SignalR event handlers');

        const register = (methodName: string, handler: (...args: any[]) => void) => {
            // Register PascalCase
            this.connection?.on(methodName, handler);
            // Register lowercase (as seen in logs)
            this.connection?.on(methodName.toLowerCase(), handler);
            // Register camelCase (just in case)
            this.connection?.on(methodName.charAt(0).toLowerCase() + methodName.slice(1), handler);
        };

        // 1. CallInvitation
        register('CallInvitation', (payload: any) => {
            callLogger.signalrEvent('CallInvitation', payload);

            // Normalize payload to handle PascalCase or camelCase
            const normalizedPayload: CallInvitationEvent = {
                callId: payload.callId || payload.CallId,
                callerName: payload.callerName || payload.CallerName,
                callerAvatar: payload.callerAvatar || payload.CallerAvatar,
                timestamp: payload.timestamp || payload.Timestamp,
                expiresInSeconds: payload.expiresInSeconds || payload.ExpiresInSeconds || 60
            };

            // Check if user is already in a call
            const state = store.getState();
            const currentCallState = state.call.callState;

            if (currentCallState !== 'idle') {
                // User is busy, auto-reject the incoming call
                callLogger.warning(`⛔ Auto-rejecting call from ${normalizedPayload.callerName} - User already in a call`, {
                    callId: normalizedPayload.callId,
                    currentState: currentCallState
                });

                // Reject the call via API
                import('../services/calls').then(({ callsService }) => {
                    callsService.respond(normalizedPayload.callId, false).catch(err => {
                        callLogger.error('Failed to auto-reject call', err);
                    });
                });

                // Show toast notification
                import('../store/uiSlice').then(({ showToast }) => {
                    store.dispatch(showToast({
                        message: `Missed call from ${normalizedPayload.callerName} - You were in another call`,
                        type: 'info'
                    }));
                });

                return; // Don't show the incoming call invitation
            }

            callLogger.info(`🔔 Incoming call from ${normalizedPayload.callerName}`, {
                callId: normalizedPayload.callId,
                expiresIn: normalizedPayload.expiresInSeconds
            });
            store.dispatch(setIncomingInvitation(normalizedPayload));
        });

        // 2. CallAccepted
        register('CallAccepted', async (payload: any) => {
            callLogger.signalrEvent('CallAccepted', payload);

            // Try all possible casing variants or direct string
            const callId = typeof payload === 'string' ? payload : (payload?.callId || payload?.CallId || payload?.id || payload?.Id);

            if (!callId) {
                callLogger.error('❌ CallAccepted event received but Call ID is missing!', payload);
                return;
            }

            // Check if we have currentCall state (needed for overlay). 
            // If random call, we might not have it yet.
            const state = store.getState();
            if (!state.call.currentCall) {
                callLogger.info('⚠️ currentCall is missing in CallAccepted (Random Call?), fetching details...', { callId });
                try {
                    const response = await callsService.getCall(callId);
                    const callData: any = (response as any).data || response;

                    // Map to VoiceCall object
                    const voiceCall: VoiceCall = {
                        callId: callData.id || callData.callId,
                        callerId: callData.callerId,
                        callerName: callData.callerName || 'Caller',
                        callerAvatar: callData.callerAvatar,
                        calleeId: callData.calleeId,
                        calleeName: callData.calleeName || 'User',
                        calleeAvatar: callData.calleeAvatar,
                        topicId: callData.topicId,
                        topicTitle: callData.topicTitle,
                        status: 'accepted',
                        initiatedAt: callData.initiatedAt || new Date().toISOString(),
                    };

                    store.dispatch(initiateCall(voiceCall));
                    callLogger.info('✅ Populated missing currentCall from API', { callId: voiceCall.callId });
                } catch (err) {
                    callLogger.error('Failed to fetch call details for random call', err);
                }
            }

            callLogger.info('✅ Call accepted by callee', { callId });
            store.dispatch(setCallStatus('connecting' as any));

            // Caller joins the session strictly AFTER Callee accepts
            callLogger.info('Joining session after acceptance', { callId });
            this.joinCallSession(callId).catch(err => {
                callLogger.error('Failed to join session after acceptance', err);
            });
        });

        // 3. CallRejected
        register('CallRejected', (payload: any) => {
            callLogger.signalrEvent('CallRejected', payload);
            const callId = payload.callId || payload.CallId;
            callLogger.warning('❌ Call rejected by callee', { callId });
            store.dispatch(endCall());
        });

        // 3.5 CallCancelled (Specific event for cancellation)
        register('CallCancelled', (payload: any) => {
            callLogger.signalrEvent('CallCancelled', payload);
            const callId = payload.callId || payload.CallId;
            callLogger.info('🚫 Call cancelled event received', { callId });

            import('../store/uiSlice').then(({ showToast }) => {
                store.dispatch(showToast({
                    message: 'Caller canceled the call',
                    type: 'info'
                }));
            });

            // Explicitly clear invitation and end call
            store.dispatch(clearIncomingInvitation());
            store.dispatch(endCall());
        });

        // 4. CallEnded
        register('CallEnded', (payload: any) => {
            callLogger.signalrEvent('CallEnded', payload);

            const reason = payload.reason || payload.Reason || 'No reason provided';
            const callId = payload.callId || payload.CallId;
            const timestamp = payload.timestamp || payload.Timestamp;

            // Log full payload for debugging auto-disconnect issues
            callLogger.info(`📞 CallEnded event received`, {
                reason,
                callId,
                timestamp,
                fullPayload: payload
            });

            // PRIORITY: Check for caller cancellation to show user feedback and close popup immediately
            if (reason && (reason.toLowerCase().includes('cancelled') || reason.toLowerCase().includes('canceled'))) {
                callLogger.info('Call cancelled by caller - closing popup', { callId });
                import('../store/uiSlice').then(({ showToast }) => {
                    store.dispatch(showToast({
                        message: 'Caller canceled the call',
                        type: 'info'
                    }));
                });

                // Explicitly clear invitation and end call state
                store.dispatch(clearIncomingInvitation());
                store.dispatch(endCall());
                return;
            }

            // Bypass backend duration limits as per user request
            // REMOVED: respecting backend termination to prevent stuck calls
            /*
            if (reason && reason.toLowerCase().includes('maximum duration exceeded')) {
                callLogger.warning(`⚠️ Ignoring backend forced termination: ${reason}`, {
                    callId
                });
                return;
            }
            */

            // Check for other backend-initiated endings that should be ignored
            // REMOVED: We now respect ALL backend termination signals to avoid desync
            /*
            if (reason && (
                reason.toLowerCase().includes('timeout') ||
                reason.toLowerCase().includes('duration limit') ||
                reason.toLowerCase().includes('time limit')
            )) {
                callLogger.warning(`⚠️ Ignoring backend timeout: ${reason}`, { callId });
                return;
            }
            */

            callLogger.info(`📞 Call ended: ${reason}`, {
                callId,
                timestamp
            });

            // Get current call state to extract partner name
            const state = store.getState();
            const currentCall = state.call.currentCall;
            const currentUser = state.auth.user;

            let partnerName = 'User';
            if (currentCall && currentUser) {
                const isIncoming = currentCall.calleeId === currentUser.id;
                partnerName = isIncoming ? currentCall.callerName : currentCall.calleeName;
            }

            // Ensure we dispatch endCall with partner name for rating modal
            store.dispatch(endCall({ partnerName }));
        });

        // 5. CallActive
        register('CallActive', async (payload: any) => {
            callLogger.signalrEvent('CallActive', payload);
            const callId = typeof payload === 'string' ? payload : (payload?.callId || payload?.CallId);
            callLogger.info('🟢 Call is now active', { callId });

            // Ensure we have currentCall state
            const state = store.getState();
            if (!state.call.currentCall && callId) {
                callLogger.info('⚠️ currentCall is missing in CallActive, fetching details...', { callId });
                try {
                    const response = await callsService.getCall(callId);
                    const callData: any = (response as any).data || response;

                    const voiceCall: VoiceCall = {
                        callId: callData.id || callData.callId,
                        callerId: callData.callerId,
                        callerName: callData.callerName || 'Caller',
                        callerAvatar: callData.callerAvatar,
                        calleeId: callData.calleeId,
                        calleeName: callData.calleeName || 'User',
                        calleeAvatar: callData.calleeAvatar,
                        topicId: callData.topicId,
                        topicTitle: callData.topicTitle,
                        status: 'ongoing',
                        initiatedAt: callData.initiatedAt || new Date().toISOString(),
                    };

                    store.dispatch(initiateCall(voiceCall));
                    callLogger.info('✅ Populated missing currentCall from API in CallActive');
                } catch (err) {
                    callLogger.error('Failed to fix missing state in CallActive', err);
                }
            }

            store.dispatch(setCallStatus('active' as any));
        });

        // 6. DurationWarning
        register('DurationWarning', (payload: { remainingMinutes: number; timestamp?: string }) => {
            callLogger.signalrEvent('DurationWarning', payload);
            callLogger.warning(`⏰ ${payload.remainingMinutes} minutes remaining`, payload);
        });

        // 7. CallUserBusy (when trying to call someone already in a call)
        register('CallUserBusy', (payload: any) => {
            callLogger.signalrEvent('CallUserBusy', payload);
            const userName = payload.userName || payload.UserName || 'User';
            callLogger.warning(`⛔ User is busy: ${userName}`, payload);

            // Clean up current call state
            store.dispatch(endCall());

            // Show toast notification
            import('../store/uiSlice').then(({ showToast }) => {
                store.dispatch(showToast({
                    message: `${userName} is currently in another call`,
                    type: 'warning'
                }));
            });
        });

        // 8. ParticipantLeft (when remote user leaves the call)
        register('ParticipantLeft', (payload: any) => {
            callLogger.signalrEvent('ParticipantLeft', payload);
            const userId = payload.userId || payload.UserId;
            callLogger.info(`👋 Participant left: ${userId}`, payload);

            // Don't auto-end call here - let CallEnded event handle it
            // This is just a notification that someone left
        });

        // Note: WebRTC signaling events (ReceiveOffer, ReceiveAnswer, ReceiveIceCandidate) 
        // have been removed as we're using pure Agora for audio streaming.
        // Agora handles its own media negotiation internally.

        callLogger.info('SignalR event handlers registered (Case-Insensitive)');
    }
}

export const signalRService = new SignalRService();