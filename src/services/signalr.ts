import * as signalR from '@microsoft/signalr';
import { store } from '../store';
import {
    setSignalRConnected,
    setIncomingInvitation,
    CallInvitationEvent,
    acceptCall,
    setCallStatus,
    endCall,
    updateDuration
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
        register('CallAccepted', (payload: any) => {
            callLogger.signalrEvent('CallAccepted', payload);
            const callId = payload.callId || payload.CallId;
            callLogger.info('✅ Call accepted by callee', { callId });
            store.dispatch(setCallStatus('connecting'));

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

        // 4. CallEnded
        register('CallEnded', (payload: any) => {
            callLogger.signalrEvent('CallEnded', payload);

            const reason = payload.reason || payload.Reason;
            const callId = payload.callId || payload.CallId;
            const timestamp = payload.timestamp || payload.Timestamp;

            // Bypass backend duration limits as per user request
            if (reason && reason.toLowerCase().includes('maximum duration exceeded')) {
                callLogger.warning(`⚠️ Ignoring backend forced termination: ${reason}`, {
                    callId
                });
                return;
            }

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
        register('CallActive', (payload: any) => {
            callLogger.signalrEvent('CallActive', payload);
            const callId = payload.callId || payload.CallId;
            callLogger.info('🟢 Call is now active', { callId });
            store.dispatch(setCallStatus('active'));
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

        // Note: WebRTC signaling events (ReceiveOffer, ReceiveAnswer, ReceiveIceCandidate) 
        // have been removed as we're using pure Agora for audio streaming.
        // Agora handles its own media negotiation internally.

        callLogger.info('SignalR event handlers registered (Case-Insensitive)');
    }
}

export const signalRService = new SignalRService();