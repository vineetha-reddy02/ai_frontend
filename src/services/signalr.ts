import { io, Socket } from 'socket.io-client';
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

class SignalRService {
    private socket: Socket | null = null;
    private token: string | null = null;
    private isConnecting = false;
    private subscriberCount = 0;
    private hubUrl: string | null = null;

    public setToken(token: string) {
        this.token = token;
        callLogger.debug('Socket.io token set', { tokenLength: token.length });
    }

    public async connect(hubUrl: string): Promise<void> {
        this.subscriberCount++;
        this.hubUrl = hubUrl;

        if (this.socket?.connected) {
            callLogger.signalrConnection('connected');
            return;
        }

        if (this.isConnecting) return;

        this.isConnecting = true;
        callLogger.signalrConnection('connecting');

        // Extract root URL (remove /hubs/call-signaling)
        const rootUrl = hubUrl.replace(/\/hubs\/.*$/, '');

        try {
            this.socket = io(rootUrl, {
                auth: { token: this.token },
                transports: ['websocket'],
                autoConnect: false
            });

            this.socket.on('connect', () => {
                callLogger.signalrConnection('connected');
                callLogger.info('Socket.io connected successfully', { id: this.socket?.id });
                store.dispatch(setSignalRConnected(true));
                this.isConnecting = false;
            });

            this.socket.on('disconnect', (reason) => {
                callLogger.signalrConnection('disconnected');
                callLogger.info('Socket.io disconnected', { reason });
                store.dispatch(setSignalRConnected(false));
            });

            this.socket.on('connect_error', (error) => {
                callLogger.signalrConnection('disconnected');
                callLogger.error('Socket.io connection error', error);
                console.error('🔴 SOCKET CONNECTION ERROR:', error);
                store.dispatch(setSignalRConnected(false));
                this.isConnecting = false;
            });

            console.log('📝 Registering socket event handlers...');
            this.registerHandlers();
            console.log('✅ Event handlers registered');

            console.log('🔌 Attempting socket connection to:', rootUrl);
            this.socket.connect();

        } catch (err) {
            this.isConnecting = false;
            callLogger.error('Socket.io initialization failed', err);
            throw err;
        }
    }

    public async disconnect(): Promise<void> {
        this.subscriberCount--;
        if (this.subscriberCount <= 0) {
            this.subscriberCount = 0;
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
        }
    }

    // Emulate SignalR 'invoke'
    public async invoke(methodName: string, ...args: any[]): Promise<void> {
        if (!this.socket?.connected) {
            callLogger.warning(`Cannot emit ${methodName}: Socket disconnected`);
            return;
        }
        this.socket.emit(methodName, ...args);
    }

    // Emulate SignalR 'on' (used internally by registerHandlers)
    private on(event: string, handler: (...args: any[]) => void) {
        this.socket?.on(event, handler);
    }

    // --- Hub Methods ---
    public async joinCallSession(callId: string): Promise<void> {
        this.invoke('JoinCallSession', callId);
    }

    public async acceptCallInvitation(callId: string): Promise<void> {
        this.invoke('AcceptCallInvitation', callId);
    }

    public async leaveCallSession(callId: string): Promise<void> {
        this.invoke('LeaveCallSession', callId);
    }

    public async notifyCallActive(callId: string): Promise<void> {
        this.invoke('NotifyCallActive', callId);
    }

    private registerHandlers() {
        if (!this.socket) return;

        console.log('🎯 registerHandlers() called');
        console.log('🔌 Socket state:', this.socket.connected ? 'CONNECTED' : 'NOT CONNECTED');
        console.log('🆔 Socket ID:', this.socket.id || 'NOT YET ASSIGNED');

        // CATCH-ALL FOR DEBUGGING
        this.socket.onAny((eventName, ...args) => {
            console.log(`� [SOCKET ONANY] Event: ${eventName}`, args);
        });

        // 1. CallInvitation
        this.socket.on('CallInvitation', (payload: any) => {
            console.log('\n🔔 =============== INCOMING CALL EVENT ===============');
            console.log('📦 RAW Payload:', payload);
            console.log('📊 Current Call State:', store.getState().call.callState);
            console.log('=====================================================\n');

            callLogger.signalrEvent('CallInvitation', payload);
            const normalizedPayload: CallInvitationEvent = {
                callId: payload.callId,
                callerName: payload.callerName,
                callerAvatar: payload.callerAvatar,
                timestamp: payload.timestamp,
                expiresInSeconds: payload.expiresInSeconds || 60
            };

            const state = store.getState();
            if (state.call.callState !== 'idle') {
                console.log('⚠️ User is busy - auto-rejecting call. State:', state.call.callState);
                callsService.respond(normalizedPayload.callId, false).catch(() => { });
                return;
            }

            console.log('✅ Dispatching setIncomingInvitation to Redux');
            store.dispatch(setIncomingInvitation(normalizedPayload));

            // Log state after dispatch
            setTimeout(() => {
                console.log('💾 Redux State After Dispatch:', store.getState().call.incomingInvitation);
            }, 100);
        });

        // 2. CallAccepted
        this.socket.on('CallAccepted', async (payload: any) => {
            callLogger.signalrEvent('CallAccepted', payload);
            const callId = typeof payload === 'string' ? payload : payload.callId;

            store.dispatch(setCallStatus('connecting' as any));
            this.joinCallSession(callId);
        });

        // 3. CallRejected
        this.socket.on('CallRejected', (payload: any) => {
            callLogger.signalrEvent('CallRejected', payload);
            store.dispatch(endCall());
        });

        // 4. CallEnded
        this.socket.on('CallEnded', (payload: any) => {
            callLogger.signalrEvent('CallEnded', payload);
            const state = store.getState();
            const currentCall = state.call.currentCall;
            const currentUser = state.auth.user;

            let partnerName = 'User';
            if (currentCall && currentUser) {
                const isIncoming = currentCall.calleeId === currentUser.id;
                partnerName = isIncoming ? currentCall.callerName : currentCall.calleeName;
            }
            store.dispatch(endCall({ partnerName }));
        });

        // 5. CallActive
        this.socket.on('CallActive', (payload: any) => {
            callLogger.signalrEvent('CallActive', payload);
            store.dispatch(setCallStatus('active' as any));
        });
    }
}

export const signalRService = new SignalRService();