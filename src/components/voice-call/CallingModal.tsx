import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PhoneOff, Phone, Clock, Loader2 } from 'lucide-react';
import { RootState } from '../../store';
import { endCall } from '../../store/callSlice';
import { useVoiceCall } from '../../hooks/useVoiceCall';
import { callLogger } from '../../utils/callLogger';

/**
 * CallingModal - Displayed when user initiates a call
 * Shows while waiting for the other user to respond
 */
const CallingModal: React.FC = () => {
    const dispatch = useDispatch();
    const { currentCall, callState } = useSelector((state: RootState) => state.call);
    const { cancelCall } = useVoiceCall();
    const [timeElapsed, setTimeElapsed] = useState(0);

    // Show this modal when we are in 'ringing' or 'connecting' state (outgoing call)
    const shouldShow = (callState === 'ringing' || callState === 'connecting') && currentCall;

    useEffect(() => {
        if (shouldShow) {
            callLogger.info('CallingModal displayed', {
                callId: currentCall?.callId,
                calleeName: currentCall?.calleeName,
                state: callState
            });
        }
    }, [shouldShow, currentCall?.callId, currentCall?.calleeName, callState]);

    // Timer for elapsed time
    useEffect(() => {
        if (shouldShow) {
            setTimeElapsed(0);
            const timer = setInterval(() => {
                setTimeElapsed(prev => {
                    const newTime = prev + 1;

                    // Log every 10 seconds
                    if (newTime % 10 === 0) {
                        callLogger.debug(`${callState} - ${newTime}s elapsed`, {
                            callId: currentCall?.callId
                        });
                    }

                    // Auto-cancel after 60 seconds for ringing, 30 seconds for connecting
                    const timeout = callState === 'ringing' ? 60 : 30;
                    if (newTime >= timeout) {
                        callLogger.warning(`Call ${callState} timeout (${timeout}s)`, {
                            callId: currentCall?.callId,
                            state: callState
                        });
                        handleCancel();
                        clearInterval(timer);
                        return timeout;
                    }

                    return newTime;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [shouldShow, currentCall?.callId, callState]);

    if (!shouldShow || !currentCall) return null;

    const handleCancel = async () => {
        callLogger.info('User clicked Cancel Call', { callId: currentCall.callId });
        await cancelCall('User cancelled');
    };

    const getStatusText = () => {
        if (callState === 'ringing') {
            return 'Calling...';
        }
        if (callState === 'connecting') {
            return 'Connecting...';
        }
        return 'Setting up call...';
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 transform transition-all">
                <div className="flex flex-col items-center text-center">
                    {/* Avatar/Profile Picture */}
                    <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-blue-100 dark:border-blue-900/50 shadow-lg">
                            {currentCall.calleeAvatar ? (
                                <img
                                    src={currentCall.calleeAvatar}
                                    alt={currentCall.calleeName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-white">
                                    {(currentCall.calleeName || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Animated ring effect */}
                        <div className="absolute inset-0 -z-10">
                            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
                            <div className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-30"
                                style={{ animationDelay: '0.5s' }} />
                        </div>

                        {/* Timer badge */}
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
                            <Clock size={14} />
                            <span>{Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')}</span>
                        </div>
                    </div>

                    {/* Name and Status */}
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {currentCall.calleeName}
                    </h3>

                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-8">
                        <Loader2 size={16} className="animate-spin" />
                        <p className="text-sm font-medium">
                            {getStatusText()}
                        </p>
                    </div>

                    {/* Topic if available */}
                    {currentCall.topicTitle && (
                        <div className="mb-6 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Topic</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {currentCall.topicTitle}
                            </p>
                        </div>
                    )}

                    {/* Cancel Button */}
                    <button
                        onClick={handleCancel}
                        className="group flex flex-col items-center gap-2 mt-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 shadow-md border border-red-200 dark:border-red-900">
                            <PhoneOff size={28} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Cancel
                        </span>
                    </button>

                    {/* Helper text */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
                        Waiting for {currentCall.calleeName} to answer...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CallingModal;
