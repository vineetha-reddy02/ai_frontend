import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone, PhoneOff, Clock } from 'lucide-react';
import { RootState } from '../../store';
import { clearIncomingInvitation } from '../../store/callSlice';
import { useVoiceCall } from '../../hooks/useVoiceCall';
import { callLogger } from '../../utils/callLogger';

const IncomingCallModal: React.FC = () => {
    const dispatch = useDispatch();
    const { incomingInvitation } = useSelector((state: RootState) => state.call);
    const { acceptCall, rejectCall } = useVoiceCall();
    const [timeLeft, setTimeLeft] = useState(60);
    const [isProcessing, setIsProcessing] = useState(false);

    // DEBUG: Log component mount
    useEffect(() => {
        console.log('🎬 IncomingCallModal MOUNTED');
        return () => {
            console.log('🎬 IncomingCallModal UNMOUNTED');
        };
    }, []);

    // DEBUG: Log incomingInvitation changes
    useEffect(() => {
        console.log('🔔 IncomingCallModal - incomingInvitation changed:', incomingInvitation);
    }, [incomingInvitation]);

    useEffect(() => {
        if (incomingInvitation) {
            console.log('📲 IncomingCallModal WILL DISPLAY');
            callLogger.info('📲 IncomingCallModal displayed', {
                callId: incomingInvitation.callId,
                callerName: incomingInvitation.callerName,
                expiresIn: incomingInvitation.expiresInSeconds
            });

            // Reset processing state for new call
            setIsProcessing(false);
            setTimeLeft(incomingInvitation.expiresInSeconds || 60);

            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    const newTime = prev - 1;

                    // Log every 10 seconds
                    if (newTime % 10 === 0 && newTime > 0) {
                        callLogger.debug(`Incoming call timer: ${newTime}s remaining`);
                    }

                    if (newTime <= 0) {
                        callLogger.warning('⏱️ Incoming call timeout (60s expired)');
                        clearInterval(timer);
                        handleDecline();
                        return 0;
                    }

                    return newTime;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [incomingInvitation]);

    // Ringtone effect
    useEffect(() => {
        if (!incomingInvitation) return;

        callLogger.debug('Starting ringtone playback');
        const audio = new Audio('/sounds/ringtone.mp3');
        audio.loop = true;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    callLogger.debug('✅ Ringtone playing');
                })
                .catch(error => {
                    if (error.name === 'NotAllowedError') {
                        callLogger.warning('Ringtone autoplay blocked. User interaction required.');
                    } else {
                        callLogger.warning('Ringtone playback failed', error);
                    }
                });
        }

        return () => {
            callLogger.debug('Stopping ringtone');
            audio.pause();
            audio.currentTime = 0;
        };
    }, [incomingInvitation?.callId]);

    if (!incomingInvitation) {
        console.log('⚪ IncomingCallModal - NO invitation, returning null');
        return null;
    }

    console.log('🟢 IncomingCallModal - RENDERING with invitation:', incomingInvitation);

    const handleAccept = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        callLogger.info('👍 User clicked Accept', {
            callId: incomingInvitation.callId
        });

        const result = await acceptCall(incomingInvitation.callId);

        if (result.success) {
            callLogger.info('✅ Call accepted successfully');
        } else {
            callLogger.error('❌ Failed to accept call', result.error);
            setIsProcessing(false); // Re-enable if failed, though likely we should just close
        }
    };

    const handleDecline = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        callLogger.info('👎 User clicked Decline (or timeout)', {
            callId: incomingInvitation.callId
        });

        const result = await rejectCall(incomingInvitation.callId);

        if (result.success) {
            callLogger.info('✅ Call rejected successfully');
        } else {
            callLogger.error('Failed to reject call (cleaning up anyway)', result.error);
        }

        dispatch(clearIncomingInvitation());
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 transform transition-all animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                            {incomingInvitation.callerAvatar ? (
                                <img
                                    src={incomingInvitation.callerAvatar}
                                    alt={incomingInvitation.callerName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-300">
                                    {incomingInvitation.callerName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 transform -translate-x-1/2 left-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">
                            <Clock size={12} /> {timeLeft}s
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {incomingInvitation.callerName}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                        Incoming Voice Call...
                    </p>

                    <div className="flex items-center gap-6 w-full justify-center">
                        <button
                            onClick={handleDecline}
                            disabled={isProcessing}
                            className={`flex flex-col items-center gap-2 group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-red-200 dark:border-red-900">
                                <PhoneOff size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Decline</span>
                        </button>

                        <button
                            onClick={handleAccept}
                            disabled={isProcessing}
                            className={`flex flex-col items-center gap-2 group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-green-200 dark:shadow-green-900/50 animate-pulse">
                                <Phone size={28} className="fill-current" />
                            </div>
                            <span className="text-xs font-medium text-gray-900 dark:text-white font-semibold">
                                {isProcessing ? '...' : 'Accept'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;