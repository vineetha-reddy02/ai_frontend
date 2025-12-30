import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Clock, History, RefreshCw, ArrowLeft, ChevronDown, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import callsService from '../../services/calls';
import Button from '../../components/Button';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { useVoiceCall } from '../../hooks/useVoiceCall';
import OnlineStatusIndicator from '../../components/OnlineStatusIndicator';
import {
    initiateCall as initiateCallAction,
    setCallStatus,
    VoiceCall
} from '../../store/callSlice';
import { RootState } from '../../store';
import { callLogger } from '../../utils/callLogger';

const UserVoiceCall: React.FC = () => {
    const { t, i18n } = useTranslation();
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
    const [findingPartner, setFindingPartner] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showVoiceCallLimitModal, setShowVoiceCallLimitModal] = useState(false);

    const {
        hasActiveSubscription,
        isTrialActive,
        isFreeTrial,
        voiceCallRemainingSeconds,
        hasVoiceCallTimeRemaining,
        voiceCallLimitSeconds,
        triggerUpgradeModal,
    } = useUsageLimits();

    const handleRandomCall = async () => {
        if (findingPartner) return;

        if (voiceCallLimitSeconds !== -1 && !hasVoiceCallTimeRemaining) {
            callLogger.warning('Call blocked: No remaining call time');
            setShowVoiceCallLimitModal(true);
            return;
        }

        if (!hasActiveSubscription && !isTrialActive) {
            callLogger.warning('Call blocked: No active subscription or trial');
            triggerUpgradeModal();
            dispatch(showToast({ message: t('voiceCall.trialExpired'), type: 'warning' }));
            return;
        }

        setFindingPartner(true);
        try {
            // Use server-side random matching
            const result = await callsService.initiateRandomCall({
                // Sending null for language to match ANY available user, regardless of language
                // This improves matching success rate when user pool is small
                preferredLanguage: null,
                topicId: null
            });

            // The API response should contain call details similar to initiate
            // But we might need to handle the response differently depending on how the backend returns it
            // Assuming successful 200 OK means call initiated/queued

            const callData: any = (result as any).data || result;

            // Check if we got an immediate match (Call ID present)
            if (callData && (callData.id || callData.callId)) {
                callLogger.info('✅ Immediate random match found!', { callId: callData.id || callData.callId });

                dispatch(initiateCallAction({
                    callId: callData.id || callData.callId,
                    callerId: currentUser?.id || '',
                    callerName: currentUser?.fullName || 'Me',
                    callerAvatar: currentUser?.avatar,
                    calleeId: callData.calleeId,
                    calleeName: callData.calleeName || 'Random User',
                    calleeAvatar: callData.calleeAvatar,
                    topicId: callData.topicId,
                    topicTitle: callData.topicTitle,
                    status: 'ringing', // Start as ringing, wait for acceptance
                    initiatedAt: new Date().toISOString(),
                }));

                // Force status to connecting
                dispatch(setCallStatus('ringing' as any));
                dispatch(showToast({ message: t('voiceCall.connecting'), type: 'success' }));
            } else {
                dispatch(showToast({ message: t('voiceCall.finding'), type: 'info' }));
            }

        } catch (error: any) {
            callLogger.error('Failed to initiate random call', error);

            // Log full error details for debugging
            console.error('Full Error Object:', error);
            console.log('Current availableUsers for debugging:', availableUsers);
            console.log('Sent preferredLanguage:', i18n.language || 'en');

            if (error.response?.data) {
                console.error('Error Response Data:', error.response.data);
            }

            dispatch(showToast({
                // Extract message from various possible backend error formats
                // The backend seems to return { messages: string[], succeeded: false } for logic failures
                message: error?.response?.data?.messages?.[0] ||
                    error?.response?.data?.detail ||
                    error?.response?.data?.title ||
                    error?.message ||
                    t('voiceCall.errorInitiating'),
                type: 'error'
            }));
        } finally {
            setFindingPartner(false);
        }
    };

    const fetchAvailableUsers = async (options?: { silent?: boolean }) => {
        try {
            if (!options?.silent) setLoading(true);
            callLogger.debug('Fetching available users');
            const res = await callsService.availableUsers({ limit: 1000 });
            if (!options?.silent) callLogger.debug('Available users API response:', res);
            let items = [];
            if (Array.isArray(res)) {
                items = res;
            } else if ((res as any)?.data) {
                items = Array.isArray((res as any).data) ? (res as any).data : [(res as any).data];
            } else if ((res as any)?.items) {
                items = (res as any).items;
            } else {
                items = [res];
            }
            const onlineUsers = items.filter((user: any) => {
                if (!user) return false;
                if (user.userId === currentUser?.id || user.id === currentUser?.id) return false;
                const status = user.status || user.availability || '';
                const statusLower = status.toLowerCase();
                if (statusLower !== 'online') return false;
                const subStatus = (user.subscriptionStatus || user.subscription?.status || '').toLowerCase();
                if (subStatus === 'expired' || subStatus === 'cancelled' || subStatus === 'past_due') return false;
                if (user.trialEndDate) {
                    const trialEnd = new Date(user.trialEndDate);
                    const now = new Date();
                    if (now >= trialEnd && subStatus !== 'active' && subStatus !== 'trialing' && subStatus !== 'succeeded') return false;
                }
                return true;
            });
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
            const res = await callsService.history({ pageSize: 100 });
            const items = (res as any)?.data || (Array.isArray(res) ? res : (res as any)?.items) || [];
            setHistory(items);
        } catch (error) {
            callLogger.error('Failed to fetch call history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'available') {
            fetchAvailableUsers();
            let pollCount = 0;
            const interval = setInterval(() => {
                pollCount++;
                fetchAvailableUsers({ silent: true });
                if (pollCount % 6 === 0) {
                    // Heartbeat to keep availability fresh (every 30 seconds)
                    // Silently fail if backend rejects (user might already be marked Online)
                    callsService.updateAvailability('Online').catch(() => {
                        // Ignore errors - backend might reject if status unchanged
                    });
                }
            }, 5000);
            return () => clearInterval(interval);
        } else {
            fetchHistory();
        }
    }, [activeTab]);

    const handleInitiateCall = async (userId: string) => {
        if (!hasActiveSubscription && !isTrialActive) {
            triggerUpgradeModal();
            dispatch(showToast({ message: t('voiceCall.trialExpired'), type: 'error' }));
            return;
        }
        if (voiceCallLimitSeconds !== -1 && !hasVoiceCallTimeRemaining) {
            setShowVoiceCallLimitModal(true);
            return;
        }
        const targetUser = availableUsers.find(u => (u.userId || u.id) === userId);
        if (!targetUser) {
            dispatch(showToast({ message: t('voiceCall.userOffline'), type: 'error' }));
            return;
        }
        const result = await initiateCall(userId);
        if (result.success) {
            dispatch(showToast({ message: t('voiceCall.calling'), type: 'info' }));
        } else {
            const apiError = result.error as any;
            const errorMessage = apiError?.data?.message || apiError?.message || 'Failed to initiate call';
            const errorStr = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
            if (errorStr.includes('busy') || errorStr.includes('in call') || errorStr.includes('not joinable')) {
                fetchAvailableUsers({ silent: true });
            }
            dispatch(showToast({ message: errorMessage, type: 'error' }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Tabs / Stats */}
            <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm">
                    <button
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'available'
                            ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        onClick={() => setActiveTab('available')}
                    >
                        {t('voiceCall.available')}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'history'
                            ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        onClick={() => setActiveTab('history')}
                    >
                        {t('voiceCall.history')}
                    </button>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 rounded-xl">
                        <div className={`w-2.5 h-2.5 rounded-full ${userStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : userStatus === 'offline' ? 'bg-red-500' : 'bg-orange-500'}`} />
                        <select
                            className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-sm font-medium focus:ring-0 cursor-pointer"
                            value={userStatus}
                            onChange={(e) => {
                                setUserStatus(e.target.value);
                                if (e.target.value === 'online' || e.target.value === 'offline') {
                                    callsService.updateAvailability(e.target.value === 'online' ? 'Online' : 'Offline').catch(console.error);
                                }
                            }}
                        >
                            <option value="online" className="bg-white dark:bg-slate-800">{t('voiceCall.online')}</option>
                            <option value="offline" className="bg-white dark:bg-slate-800">{t('voiceCall.offline')}</option>
                            <option value="busy" className="bg-white dark:bg-slate-800">{t('voiceCall.busy')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'available' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Random Call CTA */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative overflow-hidden glass-panel rounded-3xl p-8 sm:p-12 text-center group">
                            {/* Decorative Background Blobs inside card */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/20 transition-all duration-700" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 group-hover:bg-cyan-500/20 transition-all duration-700" />

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-[2px] shadow-lg shadow-violet-500/30">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center backdrop-blur-sm">
                                        <Phone className="w-10 h-10 text-violet-500 animate-pulse" />
                                    </div>
                                </div>

                                <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-4">
                                    {t('voiceCall.randomCallTitle')}
                                </h1>
                                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mb-8 leading-relaxed">
                                    {t('voiceCall.randomCallDesc')}
                                </p>

                                <button
                                    onClick={() => {
                                        if (voiceCallLimitSeconds !== -1 && !hasVoiceCallTimeRemaining) setShowVoiceCallLimitModal(true);
                                        else if (!hasActiveSubscription && !isTrialActive) triggerUpgradeModal();
                                        else setShowPrivacyModal(true);
                                    }}
                                    disabled={findingPartner || loading || availableUsers.length === 0}
                                    className={`relative group px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        {findingPartner ? <RefreshCw className="animate-spin" /> : <Sparkles className="animate-pulse" />}
                                        {findingPartner ? t('voiceCall.finding') : t('voiceCall.callRandom')}
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl" />
                                </button>

                                {availableUsers.length === 0 && !loading && (
                                    <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                            {t('voiceCall.noUsers')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats Table / Info */}
                    <div className="glass-panel p-6 rounded-3xl space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/10">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-4 h-4 text-violet-500" />
                                {t('voiceCall.usage')}
                            </h3>
                        </div>

                        {/* Usage Meter */}
                        <div className="space-y-4">
                            {hasActiveSubscription ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                                    <span className="text-lg font-bold text-green-600 dark:text-green-400 block mb-1">{t('voiceCall.unlimited')}</span>
                                    <span className="text-xs text-green-700/70 dark:text-green-300/70">Premium Active</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between text-sm font-medium mb-2">
                                        <span className="text-slate-500 dark:text-slate-400">{t('voiceCall.used')}</span>
                                        <span className="text-slate-900 dark:text-white">
                                            {Math.floor((voiceCallLimitSeconds - voiceCallRemainingSeconds) / 60)}m
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                                            style={{ width: `${((voiceCallLimitSeconds - voiceCallRemainingSeconds) / voiceCallLimitSeconds) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                                        <span>0m</span>
                                        <span>{Math.floor(voiceCallLimitSeconds / 60)}m Limit</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-200/50 dark:border-white/10">
                            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{t('voiceCall.onlineUsers')} ({availableUsers.length})</h4>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {availableUsers.map((u, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 p-[2px]">
                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'User')}`} alt="User" className="w-full h-full rounded-full border-2 border-white dark:border-slate-800" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.fullName}</p>
                                            <p className="text-xs text-green-500 font-medium">Online</p>
                                        </div>
                                    </div>
                                ))}
                                {availableUsers.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4 italic">No other users online.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="glass-panel p-1 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="py-20 text-center text-slate-500 animate-pulse">{t('voiceCall.loadingHistory')}</div>
                    ) : history.length > 0 ? (
                        <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                            {history.map((call) => {
                                const startTime = call.initiatedAt || call.startTime;
                                const duration = call.durationSeconds !== undefined ? call.durationSeconds : call.duration;
                                const isIncoming = call.isIncoming;
                                const status = call.status || 'Unknown';
                                return (
                                    <div key={call.callId} className="p-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                                                status === 'Missed' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                {isIncoming ? <ArrowLeft size={18} className="rotate-45" /> : <Phone size={18} />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-violet-500 transition-colors">
                                                    Voice Call
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span>{new Date(startTime?.endsWith('Z') ? startTime : `${startTime}Z`).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{new Date(startTime?.endsWith('Z') ? startTime : `${startTime}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300">
                                                <Clock size={12} />
                                                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                                            </div>
                                            <p className={`text-xs mt-1 font-medium ${status === 'Missed' ? 'text-red-500' :
                                                status === 'Completed' ? 'text-green-500' : 'text-slate-500'
                                                }`}>
                                                {status}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <History size={48} className="mb-4 opacity-50" />
                            <p>{t('voiceCall.noHistory')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Privacy Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                    <div className="glass-panel w-full max-w-md p-6 rounded-3xl animate-slideUp">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('voiceCall.privacyTitle')}</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-center mb-8 leading-relaxed">
                            {t('voiceCall.privacyDesc')}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPrivacyModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium">
                                {t('voiceCall.cancel')}
                            </button>
                            <button onClick={() => { setShowPrivacyModal(false); handleRandomCall(); }} className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-500/30">
                                {t('voiceCall.agree')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Limit Modal */}
            {showVoiceCallLimitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                    <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-slideUp text-center">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('voiceCall.limitReached')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">{t('voiceCall.limitDesc')}</p>
                        <Button className="w-full py-4 text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-xl" onClick={() => navigate('/subscriptions')}>
                            {t('voiceCall.upgradeNow')}
                        </Button>
                        <button onClick={() => setShowVoiceCallLimitModal(false)} className="mt-4 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                            {t('voiceCall.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserVoiceCall;
