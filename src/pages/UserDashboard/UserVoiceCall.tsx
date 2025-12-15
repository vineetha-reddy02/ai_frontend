import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Clock, History, RefreshCw, ArrowLeft, ChevronDown } from 'lucide-react';
import callsService from '../../services/calls';
import Button from '../../components/Button';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { useVoiceCall } from '../../hooks/useVoiceCall';
import VoiceCallTimer from '../../components/VoiceCallTimer';
import UserStatusIndicator from '../../components/UserStatusIndicator';
import OnlineStatusIndicator from '../../components/OnlineStatusIndicator';
import { RootState } from '../../store';
import { callLogger } from '../../utils/callLogger';

const UserVoiceCall: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user: currentUser } = useSelector((state: RootState) => state.auth);
    const { initiateCall } = useVoiceCall();
    const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [userStatus, setUserStatus] = useState('online');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const {
        hasActiveSubscription,
        isTrialActive,
        voiceCallRemainingSeconds,
        hasVoiceCallTimeRemaining,
        voiceCallLimitSeconds,
        triggerUpgradeModal,
    } = useUsageLimits();

    const fetchAvailableUsers = async (options?: { silent?: boolean }) => {
        try {
            if (!options?.silent) setLoading(true);
            callLogger.debug('Fetching available users');

            const res = await callsService.availableUsers({ limit: 1000 });

            // ... (keep extracting logic same as before, no changes to logic) ... 

            // Log the full response structure to understand what we're getting
            if (!options?.silent) callLogger.debug('Available users API response:', res);

            // Try multiple ways to extract the data
            let items = [];

            if (Array.isArray(res)) {
                items = res;
                if (!options?.silent) callLogger.debug('Data extracted: Direct array');
            } else if ((res as any)?.data) {
                items = Array.isArray((res as any).data) ? (res as any).data : [(res as any).data];
                if (!options?.silent) callLogger.debug('Data extracted: From res.data');
            } else if ((res as any)?.items) {
                items = (res as any).items;
                if (!options?.silent) callLogger.debug('Data extracted: From res.items');
            } else {
                items = [res];
                if (!options?.silent) callLogger.debug('Data extracted: Wrapped response');
            }

            if (!options?.silent) {
                callLogger.debug('Extracted items count:', items.length);
                if (items.length > 0) {
                    callLogger.debug('First user structure:', items[0]);
                    callLogger.debug('First user keys:', Object.keys(items[0] || {}));
                }
            }

            // Filter to show only online users and EXCLUDE current user
            const onlineUsers = items.filter((user: any) => {
                if (!user) return false;
                // Exclude current user from list
                if (user.userId === currentUser?.id || user.id === currentUser?.id) return false;

                if (user.isOnline !== undefined) return user.isOnline;
                if (user.status === 'online' || user.status === 'Online') return true;
                if (user.availability === 'Online') return true;
                return true;
            });

            if (!options?.silent) callLogger.info(`Found ${onlineUsers.length} available users out of ${items.length} total`);

            setAvailableUsers(onlineUsers);
            setLastUpdated(new Date());
        } catch (error: any) {
            callLogger.error('Failed to fetch available users', error);
        } finally {
            if (!options?.silent) setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            callLogger.debug('Fetching call history');
            const res = await callsService.history({ limit: 1000 });
            const items = (res as any)?.data || (Array.isArray(res) ? res : (res as any)?.items) || [];
            callLogger.info(`Found ${items.length} call history items`);
            setHistory(items);
        } catch (error) {
            callLogger.error('Failed to fetch call history', error);
        } finally {
            setLoading(false);
        }
    };

    // Poll for updates and maintain 'Online' status
    useEffect(() => {
        if (activeTab === 'available') {
            fetchAvailableUsers(); // Initial load (shows loader)

            let pollCount = 0;
            const interval = setInterval(() => {
                pollCount++;
                fetchAvailableUsers({ silent: true }); // Silent poll

                // Every 6 polls (30 seconds), re-assert Online status (Heartbeat)
                if (pollCount % 6 === 0) {
                    callsService.updateAvailability('Online').catch(err =>
                        callLogger.warning('Heartbeat failed', err)
                    );
                }
            }, 5000);

            return () => clearInterval(interval);
        } else {
            fetchHistory();
        }
    }, [activeTab]);

    const handleInitiateCall = async (userId: string) => {
        callLogger.info('🎯 User clicked Call button', {
            targetUserId: userId,
            currentUserId: currentUser?.id
        });

        // Check if user has trial access or subscription
        if (!hasActiveSubscription && !isTrialActive) {
            callLogger.warning('Call blocked: No active subscription or trial');
            triggerUpgradeModal();
            dispatch(showToast({ message: 'Trial expired. Upgrade to Pro for unlimited calls!', type: 'warning' }));
            return;
        }

        // Check session time limit
        if (!hasVoiceCallTimeRemaining) {
            callLogger.warning('Call blocked: No remaining call time');
            dispatch(showToast({ message: 'Session limit reached. Please try again later.', type: 'warning' }));
            return;
        }

        callLogger.info('✅ Subscription and time checks passed, initiating call');
        callLogger.debug('User ID being sent as calleeId:', userId);

        // Use the new hook to initiate the call
        const result = await initiateCall(userId);

        if (result.success) {
            callLogger.info('✅ Call initiated successfully from UserVoiceCall', {
                callId: result.callId
            });
            dispatch(showToast({ message: 'Calling...', type: 'info' }));
        } else {
            callLogger.error('❌ Failed to initiate call from UserVoiceCall', result.error);
            dispatch(showToast({
                message: result.error || 'Failed to initiate call',
                type: 'error'
            }));
        }
    };

    const formatLastActive = (lastActiveTime?: string) => {
        if (!lastActiveTime) return 'Just now';

        const now = new Date();
        // Ensure the date is treated as UTC if no timezone offset is provided
        const timeStr = lastActiveTime.endsWith('Z') ? lastActiveTime : `${lastActiveTime}Z`;
        const lastActive = new Date(timeStr);
        const diffMs = now.getTime() - lastActive.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header with Session Timer */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {activeTab === 'available' ? 'Available Users' : 'Call History'}
                </h3>
                <div className="flex items-center gap-4">
                    {/* Session Timer/Status */}
                    {activeTab === 'available' && (
                        hasActiveSubscription ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span className="text-xs text-green-900 dark:text-green-200 whitespace-nowrap font-medium">
                                    Unlimited calls
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs text-blue-900 dark:text-blue-200 whitespace-nowrap">
                                    5 min/day
                                </span>
                                <span className="text-xs font-mono text-green-600 dark:text-green-400">
                                    {Math.floor(voiceCallRemainingSeconds / 60)}:{String(voiceCallRemainingSeconds % 60).padStart(2, '0')}
                                </span>
                            </div>
                        )
                    )}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'available' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                            onClick={() => setActiveTab('available')}
                        >
                            Available
                        </button>
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'available' && (
                <div className="space-y-4">
                    {/* Privacy Note */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex items-start gap-3">
                        <div className="text-blue-600 dark:text-blue-400 mt-1">
                            <User size={20} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-300">Privacy Notice</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                Voice Calling is designed for communication and learning purposes only. EduTalks Company is not responsible for any personal information you choose to share during calls. Please avoid sharing sensitive data, financial information, passwords, or any private details while using this feature.
                            </p>
                        </div>
                    </div>

                    {/* Status and Refresh */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Status:</span>
                            <div className="relative">
                                {/* Status Dot Indicator */}
                                <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${userStatus === 'online' ? 'bg-green-500' :
                                    userStatus === 'offline' ? 'bg-red-500' :
                                        'bg-orange-500'
                                    }`} />
                                <select
                                    className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-1.5 pl-8 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium shadow-sm transition-colors hover:border-blue-400"
                                    value={userStatus}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setUserStatus(newStatus);
                                        // Sync with backend
                                        if (newStatus === 'online' || newStatus === 'offline') {
                                            callsService.updateAvailability(newStatus === 'online' ? 'Online' : 'Offline')
                                                .catch(err => console.error('Failed to update availability', err));
                                        }
                                    }}
                                >
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="busy">Busy</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => fetchAvailableUsers()} leftIcon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}>
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-slate-500">Scanning availability...</div>
                    ) : availableUsers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableUsers.map((user) => (
                                <div key={user.userId || user.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 overflow-hidden">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={20} />
                                            )}
                                            {/* Real User Online Status from API */}
                                            <UserStatusIndicator
                                                isOnline={user.isOnline}
                                                status={user.status}
                                                availability={user.availability}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                {user.fullName || 'Unknown User'}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{user.preferredLanguage || 'English Learner'}</span>
                                                <span>•</span>
                                                <span className="text-green-600 dark:text-green-400">
                                                    {formatLastActive(user.lastActiveAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        leftIcon={<Phone size={16} />}
                                        onClick={() => handleInitiateCall(user.userId || user.id)}
                                    >
                                        Call
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <User className="text-slate-400" />
                            </div>
                            <p className="text-slate-500 mb-2">connect with your practice partner.</p>
                            <p className="text-sm text-slate-400 mb-4">Check back in a few minutes or set your status to Online.</p>
                            <Button variant="primary" onClick={() => navigate('/voice-calls')}>
                                CALL PARTNER
                            </Button>
                        </div>
                    )}
                </div>
            )}


            {activeTab === 'history' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-12 text-center text-slate-500">Loading history...</div>
                    ) : history.length > 0 ? (
                        <div className="space-y-3">
                            {history.map((call) => (
                                <div key={call.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500">
                                            <History size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">Call with {call.partner?.fullName || 'User'}</p>
                                            <p className="text-xs text-slate-500">{new Date(call.startTime).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Clock size={14} />
                                        <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            No recent calls found.
                        </div>
                    )}
                </div>

            )}
        </div>
    );
};

export default UserVoiceCall;
