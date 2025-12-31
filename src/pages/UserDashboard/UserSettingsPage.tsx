import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Save, Lock, Bell, ArrowLeft, Shield } from 'lucide-react';
import UserLayout from '../../components/UserLayout';
import Button from '../../components/Button';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import { RootState } from '../../store';

const UserSettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState({
        email: true,
        browser: true,
        marketing: false
    });

    const handleSave = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        dispatch(showToast({ message: t('settingsPage.saveSuccess'), type: 'success' }));
    };

    return (
        <UserLayout>
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="glass-button p-2 rounded-full"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('settingsPage.title')}</h1>
                        <p className="text-slate-600 dark:text-slate-400">{t('settingsPage.subtitle')}</p>
                    </div>
                </div>

                <div className="space-y-6">


                    {/* Notifications */}
                    <div className="glass-panel p-6 rounded-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-pink-500/10 rounded-xl">
                                <Bell className="w-6 h-6 text-pink-500" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('settingsPage.notifications.title')}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 transition-colors hover:border-pink-500/30">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{t('settingsPage.notifications.email')}</p>
                                    <p className="text-sm text-slate-500">{t('settingsPage.notifications.emailDesc')}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifications.email}
                                        onChange={e => setNotifications({ ...notifications, email: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-500"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 transition-colors hover:border-pink-500/30">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{t('settingsPage.notifications.browser')}</p>
                                    <p className="text-sm text-slate-500">{t('settingsPage.notifications.browserDesc')}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifications.browser}
                                        onChange={e => setNotifications({ ...notifications, browser: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="glass-panel p-6 rounded-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/10 rounded-xl">
                                <Shield className="w-6 h-6 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('settingsPage.security.title')}</h2>
                        </div>

                        <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Lock size={16} className="text-slate-400" />
                                    {t('settingsPage.security.changePassword')}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">{t('settingsPage.security.changePasswordDesc')}</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/change-password')}
                                className="glass-button w-full sm:w-auto"
                            >
                                {t('settingsPage.security.update')}
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-center sm:justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            isLoading={loading}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/30 px-8 py-3 rounded-xl font-bold text-lg"
                        >
                            <Save size={20} className="mr-2" />
                            {t('settingsPage.saveChanges')}
                        </Button>
                    </div>
                </div>
            </div>
        </UserLayout>
    );
};

export default UserSettingsPage;
