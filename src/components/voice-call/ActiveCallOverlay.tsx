import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PhoneOff, Mic, MicOff, Clock } from 'lucide-react';
import { RootState } from '../../store';
import { updateDuration } from '../../store/callSlice';
import { incrementVoiceCallUsage, roundUpToNearestMinute } from '../../store/usageSlice';
import { useVoiceCall } from '../../hooks/useVoiceCall';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { callLogger } from '../../utils/callLogger';

const ActiveCallOverlay: React.FC = () => {
    const dispatch = useDispatch();
    const { currentCall, callState, isMuted, durationSeconds, isCallActive } = useSelector((state: RootState) => state.call);
    const { user } = useSelector((state: RootState) => state.auth);
    const { endCall, toggleMute } = useVoiceCall();
    const {
        voiceCallRemainingSeconds,
        hasActiveSubscription,
        isFreeTrial,
        voiceCallLimitSeconds
    } = useUsageLimits();

    const [showWarning, setShowWarning] = useState(false);

    // Show overlay when connecting, active, or ringing (outgoing)
    const shouldShow = ['connecting', 'active', 'ringing'].includes(callState) || isCallActive;

    // Determine partner details
    const isIncoming = currentCall?.calleeId === user?.id;
    const partnerName = isIncoming ? currentCall?.callerName : currentCall?.calleeName;
    const partnerAvatar = isIncoming ? currentCall?.callerAvatar : currentCall?.calleeAvatar;

    // Calculate remaining time for this call session
    const sessionRemainingSeconds = voiceCallRemainingSeconds - durationSeconds;
    // Free tier user = no active subscription (hasActiveSubscription already checks for paid plans)
    const isFreeTierUser = !hasActiveSubscription;

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
    };

    // Call duration timer with real-time usage tracking
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (callState === 'active') {
            callLogger.debug('Starting call duration timer');

            interval = setInterval(() => {
                dispatch(updateDuration(durationSeconds + 1));

                // Increment usage for free tier users in real-time
                if (isFreeTierUser && voiceCallLimitSeconds !== -1) {
                    dispatch(incrementVoiceCallUsage(1));
                }

                // Log every minute
                if ((durationSeconds + 1) % 60 === 0) {
                    const minutes = Math.floor((durationSeconds + 1) / 60);
                    callLogger.info(`📞 Call duration: ${minutes} minute(s)`, {
                        callId: currentCall?.callId
                    });
                }
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [callState, durationSeconds, dispatch, currentCall?.callId, isFreeTierUser, voiceCallLimitSeconds]);

    // Duration warning for free tier users
    useEffect(() => {
        if (!isFreeTierUser) {
            setShowWarning(false);
            return;
        }

        // Show warning when less than 1 minute remaining
        const warningThreshold = 60; // 60 seconds

        if (sessionRemainingSeconds <= warningThreshold && sessionRemainingSeconds > 0) {
            if (!showWarning) {
                setShowWarning(true);
                callLogger.warning(`⏰ Call time warning: ${sessionRemainingSeconds} seconds remaining`);
            }
        } else {
            setShowWarning(false);
        }
    }, [sessionRemainingSeconds, showWarning, isFreeTierUser]);

    // Auto-end call when time limit is reached
    useEffect(() => {
        if (!isFreeTierUser || !currentCall || callState !== 'active') return;

        // End call when time limit is exhausted
        if (sessionRemainingSeconds <= 0) {
            callLogger.warning('⏱️ Free trial time limit reached, auto-ending call');

            // Round up to nearest minute before ending
            dispatch(roundUpToNearestMinute());

            endCall('Free trial time limit reached');
        }
    }, [sessionRemainingSeconds, isFreeTierUser, currentCall, callState, endCall, dispatch]);

    if (!shouldShow || !currentCall) return null;

    const handleEndCall = async () => {
        callLogger.info('🔴 User clicked End Call', {
            callId: currentCall.callId,
            duration: durationSeconds
        });

        const result = await endCall();

        if (result.success) {
            // Round up to nearest minute for free tier users (matches backend billing)
            if (isFreeTierUser && voiceCallLimitSeconds !== -1) {
                dispatch(roundUpToNearestMinute());
                callLogger.info('⏱️ Rounded usage to nearest minute for free tier user');
            }

            callLogger.info('✅ Call ended successfully', {
                callId: currentCall.callId,
                finalDuration: formatTime(durationSeconds)
            });
        } else {
            callLogger.error('Error ending call (cleaned up anyway)', result.error);
        }
    };

    const handleToggleMute = async () => {
        const action = isMuted ? 'unmute' : 'mute';
        callLogger.info(`🎤 User toggled ${action} `, {
            callId: currentCall.callId
        });

        const result = await toggleMute();

        if (result.success) {
            callLogger.info(`✅ ${action} successful`, {
                newState: result.muted ? 'MUTED' : 'UNMUTED'
            });
        } else {
            callLogger.error(`Failed to ${action} (toggled locally anyway)`, result.error);
        }
    };

    const getStatusText = () => {
        if (callState === 'ringing') return 'Ringing...';
        if (callState === 'connecting') return 'Connecting...';
        return formatTime(durationSeconds);
    };

    const getStatusColor = () => {
        if (callState === 'ringing') return 'text-blue-600 dark:text-blue-400';
        if (callState === 'connecting') return 'text-yellow-600 dark:text-yellow-400';
        return 'text-green-600 dark:text-green-400';
    };

    return (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
            {/* Duration Warning Badge */}
            {showWarning && callState === 'active' && isFreeTierUser && (
                <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        ⏰ {formatTime(Math.max(0, sessionRemainingSeconds))} remaining
                    </p>
                </div>
            )}

            {/* Main Overlay */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-72 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 transition-all">
                {/* Header / Remote User */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                        {partnerAvatar ? (
                            <img
                                src={partnerAvatar}
                                alt={partnerName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-bold">
                                {(partnerName || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                            {partnerName}
                        </h4>
                        <p className={`text - sm font - medium ${callState === 'active' ? '' : 'animate-pulse'
                            } ${getStatusColor()} `}>
                            {getStatusText()}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-around w-full px-2">
                    {/* Mute Toggle */}
                    <button
                        onClick={handleToggleMute}
                        className={`p - 3 rounded - full transition - all ${isMuted
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                            } `}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    {/* End Call */}
                    <button
                        onClick={handleEndCall}
                        className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/40 transform transition-transform active:scale-95"
                        title="End Call"
                    >
                        <PhoneOff size={28} className="fill-current" />
                    </button>
                </div>

                {/* Connection Quality & Remaining Time */}
                {callState === 'active' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Connected</span>
                        </div>

                        {/* Free Tier Remaining Time Display */}
                        {isFreeTierUser && sessionRemainingSeconds > 0 && (
                            <div className="flex items-center justify-center gap-2 text-xs">
                                <Clock size={14} className="text-blue-500" />
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {formatTime(Math.max(0, sessionRemainingSeconds))} remaining
                                </span>
                            </div>
                        )}

                        {/* Time Limit Reached */}
                        {isFreeTierUser && sessionRemainingSeconds <= 0 && (
                            <div className="flex items-center justify-center gap-2 text-xs">
                                <span className="font-medium text-red-600 dark:text-red-400">
                                    Free trial time limit reached
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveCallOverlay;
