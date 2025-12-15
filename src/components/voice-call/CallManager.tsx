import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { callsService } from '../../services/calls';
import { signalRService, IceCandidatePayload } from '../../services/signalr';
import {
    endCall,
    setCallStatus,
} from '../../store/callSlice';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallOverlay from './ActiveCallOverlay';
import CallingModal from './CallingModal';
import { callLogger } from '../../utils/callLogger';

// Helper to get WebRTC config
const getWebRTCConfig = async () => {
    try {
        callLogger.debug('Fetching WebRTC config from backend');
        const res: any = await callsService.webrtcConfig();
        const data = res.data || res;
        callLogger.info('WebRTC config received', {
            iceServersCount: data.iceServers?.length
        });
        return { iceServers: data.iceServers };
    } catch (e) {
        callLogger.warning('Failed to fetch ICE servers, using default Google STUN', e);
        return {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };
    }
};

const CallManager: React.FC = () => {
    const dispatch = useDispatch();
    const { user, token } = useSelector((state: RootState) => state.auth);
    const { callState, currentCall, isMuted } = useSelector((state: RootState) => state.call);

    // Refs for WebRTC to avoid stale closures in callbacks
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream | null>(null);
    const incomingAudioRef = useRef<HTMLAudioElement | null>(null);

    // Log state changes for debugging
    useEffect(() => {
        callLogger.stateTransition('previous', callState, currentCall?.callId);
    }, [callState, currentCall?.callId]);

    useEffect(() => {
        if (currentCall) {
            callLogger.debug('Current call updated', {
                callId: currentCall.callId,
                status: currentCall.status,
                callerName: currentCall.callerName,
                calleeName: currentCall.calleeName
            });
        }
    }, [currentCall]);

    useEffect(() => {
        callLogger.debug(`Mute state: ${isMuted ? 'MUTED' : 'UNMUTED'}`);
    }, [isMuted]);

    // 1. Initialize SignalR on Auth Load
    useEffect(() => {
        if (token && user) {
            callLogger.info('Initializing SignalR for authenticated user', {
                userId: user.id,
                userName: user.fullName
            });

            signalRService.setToken(token);

            // Re-enabled SignalR connection
            const HUB_URL = 'https://edutalks-backend.lemonfield-c795bfef.centralindia.azurecontainerapps.io/hubs/call-signaling';

            callLogger.info('Connecting to SignalR hub', { hubUrl: HUB_URL });

            signalRService.connect(HUB_URL)
                .then(() => {
                    callLogger.info('✅ SignalR connection established successfully');
                    // Automatically set availability to Online so backend can route calls
                    callsService.updateAvailability('Online')
                        .then(() => callLogger.info('Updated availability to Online'))
                        .catch(err => callLogger.warning('Failed to auto-set availability', err));
                })
                .catch((error) => {
                    callLogger.error('❌ SignalR connection failed', error);
                });

            return () => {
                callLogger.info('Disconnecting SignalR on unmount');
                signalRService.disconnect();
            };
        }
    }, [token, user?.id]);

    // 2. Handle Cleanup of Media on Unmount or Call End
    useEffect(() => {
        if (callState === 'idle') {
            callLogger.debug('Call state is idle, cleaning up media resources');

            if (localStream.current) {
                callLogger.mediaStream('stopped', {
                    trackCount: localStream.current.getTracks().length
                });
                localStream.current.getTracks().forEach(track => {
                    track.stop();
                    callLogger.debug(`Stopped track: ${track.kind}`);
                });
                localStream.current = null;
            }

            if (peerConnection.current) {
                callLogger.connectionState('closing', currentCall?.callId);
                peerConnection.current.close();
                peerConnection.current = null;
                callLogger.info('Peer connection closed');
            }

            if (incomingAudioRef.current) {
                incomingAudioRef.current.srcObject = null;
                callLogger.debug('Cleared incoming audio element');
            }
        }
    }, [callState, currentCall?.callId]);

    // 3. Handle Mute Toggle (Hardware level)
    useEffect(() => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
                callLogger.debug(`Audio track ${isMuted ? 'disabled' : 'enabled'}`, {
                    trackId: track.id
                });
            });
        }
    }, [isMuted]);

    // 4. WebRTC - Initialize & Event subscription
    useEffect(() => {
        // Run logic while connecting OR active to keep listeners alive
        if ((callState === 'connecting' || callState === 'active') && currentCall) {
            // Pending buffers for signals arriving before PC is ready
            const pendingOffer = { current: null as string | null };
            const pendingCandidates = { current: [] as IceCandidatePayload[] };

            // We need a ref to the PC instance that is accessible inside the closures below immediately,
            // even before the async initialization completes and updates the top-level ref.
            // Actually, we can just use the top-level peerConnection.current, but we need to guard against it being null.

            // DEFINE LISTENERS FIRST so they are registered immediately
            const handleReceiveOffer = async (sdp: string) => {
                callLogger.sdp('offer', 'received', currentCall.callId);
                const pc = peerConnection.current;

                if (!pc) {
                    callLogger.info('⏳ Buffering SDP Offer (PC not ready)');
                    pendingOffer.current = sdp;
                    return;
                }

                try {
                    if (pc.signalingState !== 'stable') {
                        callLogger.warning('Signaling state not stable, ignoring offer', { state: pc.signalingState });
                        return; // Collision or renegotiation complexity
                    }
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await signalRService.sendAnswer(currentCall.callId, answer.sdp || '');
                } catch (error) {
                    callLogger.error('Error processing SDP offer', error);
                }
            };

            const handleReceiveAnswer = async (sdp: string) => {
                callLogger.sdp('answer', 'received', currentCall.callId);
                const pc = peerConnection.current;
                if (!pc) return; // Answers to us (Caller) shouldn't arrive before we exist

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
                } catch (error) {
                    callLogger.error('Error processing SDP answer', error);
                }
            };

            const handleReceiveIceCandidate = async (candidate: IceCandidatePayload) => {
                const pc = peerConnection.current;
                if (!pc) {
                    callLogger.debug('Buffering ICE candidate');
                    pendingCandidates.current.push(candidate);
                    return;
                }
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    callLogger.error('Error adding ICE candidate', e);
                }
            };

            // Register immediately!
            signalRService.onReceiveOffer(handleReceiveOffer);
            signalRService.onReceiveAnswer(handleReceiveAnswer);
            signalRService.onReceiveIceCandidate(handleReceiveIceCandidate);


            const initializePeer = async () => {
                let pc = peerConnection.current;

                // A. Initialization (ONCE per call)
                if (!pc) {
                    callLogger.info('🎙️ Initializing WebRTC Peer Connection', {
                        callId: currentCall.callId,
                        role: currentCall.callerId === user?.id ? 'caller' : 'callee'
                    });

                    try {
                        // Get User Media
                        callLogger.debug('Requesting microphone access');
                        const stream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                            },
                        });

                        localStream.current = stream;
                        callLogger.mediaStream('acquired', {
                            audioTracks: stream.getAudioTracks().length
                        });

                        // Create Peer Connection
                        const config = await getWebRTCConfig();
                        pc = new RTCPeerConnection(config);
                        peerConnection.current = pc; // Update ref immediately

                        callLogger.webrtc('Peer connection created', {
                            iceServers: config.iceServers.length
                        });

                        // Add Tracks
                        stream.getTracks().forEach(track => {
                            pc?.addTrack(track, stream);
                        });

                        // Handle Remote Stream
                        pc.ontrack = (event) => {
                            callLogger.webrtc('Remote stream received', {
                                streamCount: event.streams.length
                            });

                            const [remote] = event.streams;
                            remoteStream.current = remote;

                            if (incomingAudioRef.current) {
                                incomingAudioRef.current.srcObject = remote;
                                incomingAudioRef.current.play()
                                    .catch((error) => callLogger.error('Failed to play remote audio', error));
                            }
                        };

                        // Handle ICE Candidates
                        pc.onicecandidate = (event) => {
                            if (event.candidate) {
                                signalRService.sendIceCandidate(currentCall.callId, {
                                    candidate: event.candidate.candidate,
                                    sdpMid: event.candidate.sdpMid || '',
                                    sdpMLineIndex: event.candidate.sdpMLineIndex || 0
                                });
                            }
                        };

                        // Handle Connection State
                        pc.onconnectionstatechange = () => {
                            callLogger.connectionState(pc!.connectionState, currentCall.callId);

                            if (pc!.connectionState === 'connected') {
                                callLogger.info('🟢 WebRTC connection established!');
                                signalRService.notifyCallActive(currentCall.callId);
                                dispatch(setCallStatus('active'));
                            } else if (pc!.connectionState === 'failed') {
                                callLogger.error('❌ WebRTC connection failed');
                                dispatch(endCall());
                            }
                        };

                        // PROCESS BUFFERED SIGNALS
                        if (pendingOffer.current) {
                            callLogger.info('Processing buffered SDP Offer');
                            await handleReceiveOffer(pendingOffer.current);
                        }

                        if (pendingCandidates.current.length > 0) {
                            callLogger.info(`Processing ${pendingCandidates.current.length} buffered ICE candidates`);
                            for (const cand of pendingCandidates.current) {
                                await handleReceiveIceCandidate(cand);
                            }
                            pendingCandidates.current = [];
                        }

                        // Decide based on Role: Caller creates offer
                        if (currentCall.callerId === user?.id) {
                            callLogger.info('👤 I am the caller, creating SDP offer');
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            await signalRService.sendOffer(currentCall.callId, offer.sdp || '');
                        } else {
                            callLogger.info('📞 I am the callee, waiting for SDP offer');
                        }

                    } catch (err) {
                        callLogger.error('❌ Failed to initialize WebRTC', err);
                        dispatch(endCall());
                        return;
                    }
                } else {
                    callLogger.debug('Peer connection exists, re-registering listeners');
                }
            };

            initializePeer();

            // Cleanup handlers on unmount/state change
            return () => {
                callLogger.debug('Cleaning up WebRTC event handlers');
                signalRService.offWebRTC();
            };
        }
    }, [callState, currentCall, dispatch, user?.id]);

    return (
        <>
            <IncomingCallModal />
            <CallingModal />
            <ActiveCallOverlay />
            <audio ref={incomingAudioRef} autoPlay />
        </>
    );
};

export default CallManager;
