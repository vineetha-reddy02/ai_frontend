import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { callsService } from '../../services/calls';
import { signalRService } from '../../services/signalr';
import agoraService from '../../services/agora';
import {
    endCall,
    setCallStatus,
    forceResetCallState,
} from '../../store/callSlice';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallOverlay from './ActiveCallOverlay';
import CallingModal from './CallingModal';
import { callLogger } from '../../utils/callLogger';

/**
 * Convert GUID string to numeric UID for Agora
 * Backend expects integer UID, so we hash the GUID to a number
 */
const guidToNumericUid = (guid: string | number): number => {
    if (typeof guid === 'number') return guid >>> 0;
    if (!guid) return 0;
    // Remove hyphens and take first 8 characters
    const hex = String(guid).replace(/-/g, '').substring(0, 8);
    // Convert to integer (max 32-bit unsigned int)
    return parseInt(hex, 16) >>> 0;
};

const CallManager: React.FC = () => {
    console.log('🚀 CallManager FUNCTION CALLED');

    let dispatch: any, user: any, token: any, callState: any, currentCall: any, isMuted: any;

    try {
        dispatch = useDispatch();
        user = useSelector((state: RootState) => state.auth.user);
        token = useSelector((state: RootState) => state.auth.token);
        const callData = useSelector((state: RootState) => state.call);
        callState = callData.callState;
        currentCall = callData.currentCall;
        isMuted = callData.isMuted;

        console.log('✅ CallManager: Redux state extracted successfully', {
            hasUser: !!user,
            hasToken: !!token,
            callState
        });
    } catch (error) {
        console.error('❌ CallManager: FAILED to extract Redux state!', error);
        return null;
    }

    // Refs for Agora
    const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
    const isJoiningChannel = useRef<boolean>(false);
    const hasJoinedChannel = useRef<boolean>(false);
    const callStateRef = useRef(callState);

    // DEBUG: Log component mount
    useEffect(() => {
        console.log('🎬 CallManager MOUNTED');
        console.log('👤 Current User Context:', {
            id: user?.id,
            name: user?.fullName,
            role: user?.role,
            hasToken: !!token
        });
        return () => {
            console.log('🎬 CallManager UNMOUNTED');
        };
    }, []);

    // Update ref when state changes
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

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
        if (!token || !user) {
            console.warn('⚠️ CallManager: Skipping SignalR init (Missing token/user)');
            return;
        }

        console.log('🔌 CallManager: Initiating SignalR connection...');
        signalRService.setToken(token);

        const apiUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://edutalks-backend.lemonfield-c795bfef.centralindia.azurecontainerapps.io');
        const rootUrl = apiUrl.replace(/\/api.*$/, '');
        const HUB_URL = `${rootUrl}/hubs/call-signaling`;

        console.log('🔌 CallManager: Target HUB URL:', HUB_URL);

        signalRService.connect(HUB_URL)
            .then(() => {
                console.log('✅ CallManager: SignalR connected!');

                // Initial availability check
                const preferredStatus = localStorage.getItem('user_availability_preference') === 'offline' ? 'Offline' : 'Online';

                if (callStateRef.current === 'idle') {
                    callsService.updateAvailability(preferredStatus as 'Online' | 'Offline')
                        .then(() => console.log(`📡 Availability set to ${preferredStatus}`))
                        .catch(async (err) => {
                            const errMsg = JSON.stringify(err);
                            if (errMsg.toLowerCase().includes('active or pending call')) {
                                console.warn('⚠️ Stuck call detected. Running cleanup...');
                                try {
                                    await callsService.leaveCallQueue().catch(() => { });
                                    const [incoming, outgoing] = await Promise.all([
                                        callsService.getMyIncomingCalls({ status: 'initiated' }).catch(() => ({ data: [] })),
                                        callsService.getMyOutgoingCalls({ status: 'initiated' }).catch(() => ({ data: [] }))
                                    ]);
                                    const allCalls = [...((incoming as any)?.data || []), ...((outgoing as any)?.data || [])];
                                    for (const call of allCalls) {
                                        await callsService.end(call.id || call.callId, 'Cleanup').catch(() => { });
                                    }
                                    await callsService.updateAvailability(preferredStatus as 'Online' | 'Offline').catch(() => { });
                                } catch (e) {
                                    console.error('❌ Cleanup failed', e);
                                }
                            }
                        });
                }
            })
            .catch((error) => {
                console.error('❌ CallManager: SignalR connection FAILED', error);
            });

        return () => {
            console.log('🎬 CallManager: Cleaning up connection');
            signalRService.disconnect();
        };
    }, [token, user?.id]);

    // Auto-cleanup stuck states on mount
    useEffect(() => {
        // Check if we have a stuck state on mount (e.g., after page refresh)
        if (callState !== 'idle' && !hasJoinedChannel.current) {
            callLogger.warning('⚠️ Detected stuck call state on mount - auto-cleaning up', {
                stuckState: callState,
                currentCall: currentCall?.callId
            });

            // Force reset to idle
            dispatch(forceResetCallState());

            // Update availability back to Online (or preferred status)
            if (user) {
                const preferredStatus = localStorage.getItem('user_availability_preference') === 'offline' ? 'Offline' : 'Online';
                callsService.updateAvailability(preferredStatus as 'Online' | 'Offline')
                    .then(() => callLogger.info(`Reset availability to ${preferredStatus} after cleanup`))
                    .catch(err => callLogger.warning('Failed to reset availability', err));
            }
        }
    }, []); // Run only once on mount

    // 2. Handle Cleanup on Call End
    useEffect(() => {
        if (callState === 'idle') {
            callLogger.debug('Call state is idle, cleaning up Agora resources');

            if (hasJoinedChannel.current) {
                // Agora Cleanup
                agoraService.leaveChannel()
                    .then(() => {
                        callLogger.info('✅ Left Agora channel');
                        hasJoinedChannel.current = false;
                        isJoiningChannel.current = false;
                    })
                    .catch(err => callLogger.error('Error leaving Agora channel', err));
            }
        }
    }, [callState]);

    // Update availability based on call state changes
    useEffect(() => {
        if (callState === 'idle') {
            const preferredStatus = localStorage.getItem('user_availability_preference') === 'offline' ? 'Offline' : 'Online';
            callsService.updateAvailability(preferredStatus as 'Online' | 'Offline')
                .then(() => callLogger.info(`Updated availability to ${preferredStatus} (Call Ended)`))
                .catch(err => callLogger.warning('Failed to restore availability', err));
        } else {
            callsService.updateAvailability('Offline')
                .then(() => callLogger.info('Updated availability to Offline (Call Started)'))
                .catch(err => callLogger.warning('Failed to set offline status', err));
        }
    }, [callState]);

    // 3. Handle Mute Toggle
    useEffect(() => {
        if (hasJoinedChannel.current) {
            // Agora Mute
            agoraService.setMuted(isMuted)
                .then(() => {
                    callLogger.debug(`Agora audio ${isMuted ? 'muted' : 'unmuted'}`);
                })
                .catch(err => callLogger.error('Error toggling mute', err));
        }
    }, [isMuted]);

    // 4. Heartbeat for Offline Status (Prevent server-side timeout)
    useEffect(() => {
        let heartbeatInterval: NodeJS.Timeout | null = null;
        let storageInterval: NodeJS.Timeout | null = null;

        if (callState !== 'idle') {
            callLogger.info('Starting Offline heartbeat');
            // Initial pulse
            callsService.updateAvailability('Offline').catch(() => { });
            localStorage.setItem('voice_call_active_heartbeat', Date.now().toString());

            // Pulse API every 30 seconds
            heartbeatInterval = setInterval(() => {
                callLogger.debug('Sending Offline heartbeat');
                callsService.updateAvailability('Offline').catch(err =>
                    callLogger.warning('Failed to send Offline heartbeat', err)
                );
            }, 30000);

            // Pulse localStorage every 2 seconds to keep other tabs informing efficiently
            storageInterval = setInterval(() => {
                localStorage.setItem('voice_call_active_heartbeat', Date.now().toString());
            }, 2000);
        }

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (storageInterval) clearInterval(storageInterval);
            if (callState !== 'idle') {
                callLogger.info('Stopping Offline heartbeat');
            }
        };
    }, [callState]);

    // 5. Join Agora Channel
    useEffect(() => {
        const joinChannelWrapper = async () => {
            if (!currentCall || !user) return;
            // Prevent double join
            if (isJoiningChannel.current || hasJoinedChannel.current) return;

            // Only join when call is connecting or active
            if (callState !== 'connecting' && callState !== 'active') return;

            isJoiningChannel.current = true;

            try {
                callLogger.info('🎙️ Joining Agora channel', {
                    callId: currentCall.callId,
                    userId: user.id
                });

                const channelName = `call_${currentCall.callId}`;
                const numericUid = guidToNumericUid(user.id);

                // Fetch Agora token from backend
                let agoraToken: string | null = null;
                try {
                    const tokenResponse = await callsService.getAgoraToken(channelName, numericUid.toString()) as { token: string };
                    agoraToken = tokenResponse.token || null;
                    callLogger.info('✅ Agora token fetched successfully');
                } catch (error: any) {
                    callLogger.warning('Failed to fetch Agora token - proceeding without token', error.message);
                    // Continue without token (only works if App Certificate is disabled)
                }

                // Set up Agora event callbacks
                agoraService.setEventCallbacks({
                    onUserPublished: (remoteUser) => {
                        callLogger.info('✅ Remote user published audio', { uid: remoteUser.uid });
                        if (callState === 'connecting') {
                            dispatch(setCallStatus('active'));
                        }
                    },
                    onUserLeft: (remoteUser) => {
                        callLogger.info('👋 Remote user left channel', { uid: remoteUser.uid });
                        // End call immediately when partner leaves
                        const partnerName = currentCall.callerName || currentCall.calleeName || 'Unknown';
                        dispatch(endCall({ partnerName }));

                        import('../../store/uiSlice').then(({ showToast }) => {
                            dispatch(showToast({
                                message: 'Call ended: Partner disconnected',
                                type: 'info'
                            }) as any);
                        });
                    },
                    onConnectionStateChange: (state) => {
                        callLogger.info(`🔗 Agora connection state: ${state}`);
                        if (state === 'CONNECTED') {
                            dispatch(setCallStatus('active'));
                        } else if (state === 'DISCONNECTED' || state === 'FAILED') {
                            callLogger.error('Agora connection failed/disconnected');
                            // End call on connection failure
                            dispatch(endCall({ partnerName: currentCall.callerName || currentCall.calleeName || 'Unknown' }));
                        }
                    }
                });

                // Join Agora channel
                await agoraService.joinChannel(channelName, agoraToken, numericUid);

                hasJoinedChannel.current = true;
                isJoiningChannel.current = false;
                callLogger.info('✅ Successfully joined Agora channel');
                dispatch(setCallStatus('active'));

            } catch (error: any) {
                callLogger.error('❌ Failed to join Agora channel', error);
                isJoiningChannel.current = false;
                hasJoinedChannel.current = false;

                // End call on failure
                const partnerName = currentCall.callerName || currentCall.calleeName || 'Unknown';
                dispatch(endCall({ partnerName }));

                // Show error to user
                import('../../store/uiSlice').then(({ showToast }) => {
                    dispatch(showToast({
                        message: 'Failed to connect to voice call. Please try again.',
                        type: 'error'
                    }) as any);
                });
            }
        };

        joinChannelWrapper();
    }, [callState, currentCall, user, dispatch]);

    // 5. Cleanup on unmount
    useEffect(() => {
        return () => {
            if (hasJoinedChannel.current) {
                agoraService.leaveChannel().catch(err => callLogger.error('Error during unmount cleanup', err));
            }
        };
    }, []);

    // 6. Emergency Reset - Keyboard Shortcut (Ctrl+Shift+R) for debugging
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ctrl+Shift+R (or Cmd+Shift+R on Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                callLogger.warning('🚨 Emergency reset triggered via keyboard shortcut');

                // Leave Agora if joined
                if (hasJoinedChannel.current) {
                    agoraService.leaveChannel().catch(err =>
                        callLogger.error('Error leaving channel during emergency reset', err)
                    );
                    hasJoinedChannel.current = false;
                    isJoiningChannel.current = false;
                }

                // Force reset Redux state
                dispatch(forceResetCallState());

                // Reset availability
                const resetStatus = localStorage.getItem('user_availability_preference') === 'offline' ? 'Offline' : 'Online';
                callsService.updateAvailability(resetStatus as 'Online' | 'Offline').catch(err =>
                    callLogger.error('Error resetting availability', err)
                );

                // Show confirmation
                import('../../store/uiSlice').then(({ showToast }) => {
                    dispatch(showToast({
                        message: '🚨 Call state force-reset complete',
                        type: 'info'
                    }) as any);
                });
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [dispatch]);

    // Expose emergency reset function globally for console debugging
    useEffect(() => {
        (window as any).forceResetCall = () => {
            callLogger.warning('🚨 Emergency reset triggered via console');

            if (hasJoinedChannel.current) {
                agoraService.leaveChannel().catch(err =>
                    callLogger.error('Error leaving channel during emergency reset', err)
                );
                hasJoinedChannel.current = false;
                isJoiningChannel.current = false;
            }

            dispatch(forceResetCallState());
            const resetStatus = localStorage.getItem('user_availability_preference') === 'offline' ? 'Offline' : 'Online';
            callsService.updateAvailability(resetStatus as 'Online' | 'Offline').catch(err =>
                callLogger.error('Error resetting availability', err)
            );

            console.log('✅ Call state force-reset complete. You can now receive calls.');
        };

        return () => {
            delete (window as any).forceResetCall;
        };
    }, [dispatch]);

    // 7. Handle browser close/refresh during active call
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (callState !== 'idle' && currentCall) {
                callLogger.warning('Browser closing/refreshing during active call');

                // End the call via API
                callsService.end(currentCall.callId, 'Browser closed/refreshed').catch(err => {
                    callLogger.error('Failed to end call on browser close', err);
                });

                // Leave Agora channel
                if (hasJoinedChannel.current) {
                    agoraService.leaveChannel().catch(err => {
                        callLogger.error('Failed to leave Agora channel on browser close', err);
                    });
                }

                // Show browser confirmation (some browsers support this)
                e.preventDefault();
                e.returnValue = 'You are currently in a voice call. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [callState, currentCall]);

    return (
        <>
            {/* Incoming Call Modal */}
            <IncomingCallModal />

            {/* Calling Modal (Outgoing) */}
            <CallingModal />

            {/* Active Call Overlay */}
            {callState === 'active' && <ActiveCallOverlay />}

            {/* Hidden audio element for incoming call ringtone */}
            <audio
                ref={incomingAudioRef}
                src="/sounds/incoming-call.mp3"
                loop
                style={{ display: 'none' }}
            />
        </>
    );
};

export default CallManager;
