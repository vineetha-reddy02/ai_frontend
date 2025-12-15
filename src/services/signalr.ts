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
export interface IceCandidatePayload {
    candidate: string;
    sdpMid: string;
    sdpMLineIndex: number;
}

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

    public async leaveCallSession(callId: string): Promise<void> {
        callLogger.signalrInvoke('LeaveCallSession', { callId });
        await this.invoke('LeaveCallSession', callId);
        callLogger.info('Left call session', { callId });
    }

    public async sendOffer(callId: string, sdpOffer: string): Promise<void> {
        callLogger.signalrInvoke('SendOffer', { callId, sdpLength: sdpOffer.length });
        callLogger.sdp('offer', 'sent', callId);
        await this.invoke('SendOffer', callId, sdpOffer);
    }

    public async sendAnswer(callId: string, sdpAnswer: string): Promise<void> {
        callLogger.signalrInvoke('SendAnswer', { callId, sdpLength: sdpAnswer.length });
        callLogger.sdp('answer', 'sent', callId);
        await this.invoke('SendAnswer', callId, sdpAnswer);
    }

    public async sendIceCandidate(callId: string, candidate: IceCandidatePayload): Promise<void> {
        callLogger.iceCandidate('sent', candidate);
        await this.invoke('SendIceCandidate', callId, candidate);
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

    // --- Event Buffering & Dispatch ---

    private messageBuffer = {
        offers: [] as string[],
        answers: [] as string[],
        candidates: [] as IceCandidatePayload[]
    };

    private externalHandlers = {
        onReceiveOffer: null as ((sdp: string) => void) | null,
        onReceiveAnswer: null as ((sdp: string) => void) | null,
        onReceiveIceCandidate: null as ((candidate: IceCandidatePayload) => void) | null
    };

    // --- External Event Subscription (for CallManager) ---

    public onReceiveOffer(callback: (sdp: string) => void) {
        this.externalHandlers.onReceiveOffer = callback;

        // Flush buffer immediately
        if (this.messageBuffer.offers.length > 0) {
            callLogger.info(`Flushing ${this.messageBuffer.offers.length} buffered Offers`);
            this.messageBuffer.offers.forEach(sdp => callback(sdp));
            this.messageBuffer.offers = [];
        }
    }

    public onReceiveAnswer(callback: (sdp: string) => void) {
        this.externalHandlers.onReceiveAnswer = callback;

        if (this.messageBuffer.answers.length > 0) {
            callLogger.info(`Flushing ${this.messageBuffer.answers.length} buffered Answers`);
            this.messageBuffer.answers.forEach(sdp => callback(sdp));
            this.messageBuffer.answers = [];
        }
    }

    public onReceiveIceCandidate(callback: (candidate: IceCandidatePayload) => void) {
        this.externalHandlers.onReceiveIceCandidate = callback;

        if (this.messageBuffer.candidates.length > 0) {
            callLogger.debug(`Flushing ${this.messageBuffer.candidates.length} buffered ICE Candidates`);
            this.messageBuffer.candidates.forEach(candidate => callback(candidate));
            this.messageBuffer.candidates = [];
        }
    }

    public offWebRTC() {
        callLogger.debug('Removing WebRTC event handlers');
        this.externalHandlers.onReceiveOffer = null;
        this.externalHandlers.onReceiveAnswer = null;
        this.externalHandlers.onReceiveIceCandidate = null;

        // Optional: Clear buffers on unmount? Or keep them just in case? 
        // Better to clear to avoid stale signals on next call.
        this.messageBuffer = { offers: [], answers: [], candidates: [] };
    }

    // --- Event Handlers (Server -> Client) ---

    private registerHandlers() {
        if (!this.connection) return;

        callLogger.debug('Registering SignalR event handlers');

        // ... [Items 1-6 remain unchanged, using simple replacement] ... 
        // We will target the WebRTC section specifically

        // 7. ReceiveOffer
        this.connection.on('ReceiveOffer', (sdp: string) => {
            callLogger.signalrEvent('ReceiveOffer', { sdpLength: sdp.length });
            callLogger.sdp('offer', 'received', 'current');

            if (this.externalHandlers.onReceiveOffer) {
                this.externalHandlers.onReceiveOffer(sdp);
            } else {
                callLogger.info('Buffered Offer (no handler attached)');
                this.messageBuffer.offers.push(sdp);
            }
        });

        // 8. ReceiveAnswer
        this.connection.on('ReceiveAnswer', (sdp: string) => {
            callLogger.signalrEvent('ReceiveAnswer', { sdpLength: sdp.length });
            callLogger.sdp('answer', 'received', 'current');

            if (this.externalHandlers.onReceiveAnswer) {
                this.externalHandlers.onReceiveAnswer(sdp);
            } else {
                callLogger.info('Buffered Answer (no handler attached)');
                this.messageBuffer.answers.push(sdp);
            }
        });

        // 9. ReceiveIceCandidate
        this.connection.on('ReceiveIceCandidate', (candidate: IceCandidatePayload) => {
            callLogger.signalrEvent('ReceiveIceCandidate', {
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex
            });
            callLogger.iceCandidate('received', candidate);

            if (this.externalHandlers.onReceiveIceCandidate) {
                this.externalHandlers.onReceiveIceCandidate(candidate);
            } else {
                // Buffer candidates too, they are critical
                this.messageBuffer.candidates.push(candidate);
            }
        });

        callLogger.info('SignalR event handlers registered');
    }
}

export const signalRService = new SignalRService();
