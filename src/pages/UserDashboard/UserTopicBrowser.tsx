import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Star, CheckCircle, Lock } from 'lucide-react';
import Button from '../../components/Button';
import { topicsService } from '../../services/topics';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import UserTopicDetailsPage from './UserTopicDetailsPage';

const UserTopicBrowser: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
    const [unlockedIndex, setUnlockedIndex] = useState(0);
    const [allCompleted, setAllCompleted] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            setLoading(true);
            const res = await topicsService.list();
            let items = (res as any)?.data || (Array.isArray(res) ? res : (res as any)?.items) || [];

            // Sort by createdAt to ensure "created first" comes first
            const sortedItems = [...items].sort((a: any, b: any) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Progress is now primarily handled via Local Storage in the frontend
            // We skip the explicit per-item backend fetch to avoid 404s/overhead



            // Merge with Local Storage Progress (Fallback)
            try {
                const localCompleted = JSON.parse(localStorage.getItem('completedTopics') || '[]');
                if (Array.isArray(localCompleted)) {
                    items = items.map((item: any) => {
                        if (localCompleted.includes(item.id || item._id)) {
                            return { ...item, isCompleted: true };
                        }
                        return item;
                    });
                }
            } catch (e) {
                console.error('Error reading local progress', e);
            }

            setTopics(items);

            // Determine unlocked index based on completion status
            let lastCompletedIndex = -1;
            items.forEach((topic: any, index: number) => {
                if (topic.isCompleted || topic.completed) {
                    lastCompletedIndex = index;
                }
            });

            // The unlocked index is the one after the last completed one
            const nextIndex = lastCompletedIndex + 1;
            setUnlockedIndex(Math.min(nextIndex, items.length - 1));

            // Auto-advance to the latest unlocked item
            setCurrentTopicIndex(Math.min(nextIndex, items.length - 1));

        } catch (error) {
            console.error('Failed to fetch topics:', error);
            dispatch(showToast({ message: 'Failed to load topics', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (e: React.MouseEvent, topic: any) => {
        e.stopPropagation();
        try {
            if (topic.isFavorite) {
                await topicsService.unfavorite(topic.id || topic._id);
                dispatch(showToast({ message: 'Removed from favorites', type: 'success' }));
            } else {
                await topicsService.favorite(topic.id || topic._id);
                dispatch(showToast({ message: 'Added to favorites', type: 'success' }));
            }
            // Optimistic update
            setTopics(prev => prev.map(t => {
                if ((t.id || t._id) === (topic.id || topic._id)) {
                    return { ...t, isFavorite: !t.isFavorite };
                }
                return t;
            }));
        } catch (error: any) {
            console.error('Failed to toggle favorite', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Topic ID being used:', topic.id || topic._id);
            console.error('Topic object:', topic);
            const errorMsg = error.response?.data?.message || error.response?.data?.messages?.[0] || 'Action failed';
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        }
    };

    // If a topic is selected, show the detail view
    if (selectedTopicId) {
        return (
            <UserTopicDetailsPage
                topicId={selectedTopicId}
                onBack={() => {
                    setSelectedTopicId(null);
                    fetchTopics(); // Refresh to update completion status
                }}
            />
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between px-2 sm:px-0">
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-white">
                    Topics Path
                </h3>
            </div>

            {loading ? (
                <div className="py-12 text-center text-slate-500">Loading topics...</div>
            ) : topics.length > 0 ? (
                <div className="flex flex-col items-center max-w-2xl mx-auto px-2 sm:px-4">
                    {/* Progress Indicator */}
                    <div className="w-full mb-4 sm:mb-6">
                        <div className="flex justify-between text-xs sm:text-sm text-slate-500 mb-2">
                            <span>Topic {currentTopicIndex + 1} of {topics.length}</span>
                            <span className="hidden xs:inline">{Math.round(((currentTopicIndex + 1) / topics.length) * 100)}% Progress</span>
                            <span className="xs:hidden">{Math.round(((currentTopicIndex + 1) / topics.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${((currentTopicIndex + 1) / topics.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Navigation Controls - Top */}
                    <div className="w-full flex justify-between items-center mb-4 sm:mb-6 gap-2">
                        <button
                            onClick={() => setCurrentTopicIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentTopicIndex === 0}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px] ${currentTopicIndex === 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="hidden sm:inline">← Previous</span>
                            <span className="sm:hidden">←</span>
                        </button>

                        <div className="flex gap-2">
                            {currentTopicIndex < unlockedIndex ? (
                                <span className="text-green-600 text-xs sm:text-sm font-medium flex items-center px-2 sm:px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                                    <span className="hidden xs:inline">Completed</span>
                                    <span className="xs:hidden">✓</span>
                                </span>
                            ) : currentTopicIndex === unlockedIndex ? (
                                <span className="text-indigo-600 text-xs sm:text-sm font-medium flex items-center px-2 sm:px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full animate-pulse">
                                    <span className="hidden xs:inline">Current</span>
                                    <span className="xs:hidden">●</span>
                                </span>
                            ) : (
                                <span className="text-slate-400 text-xs sm:text-sm font-medium flex items-center px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    <span className="hidden xs:inline">Locked</span>
                                    <span className="xs:hidden">🔒</span>
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentTopicIndex(prev => Math.min(topics.length - 1, prev + 1))}
                            disabled={currentTopicIndex >= unlockedIndex || currentTopicIndex === topics.length - 1}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px] ${currentTopicIndex >= unlockedIndex || currentTopicIndex === topics.length - 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
                                }`}
                        >
                            <span className="hidden sm:inline">Next →</span>
                            <span className="sm:hidden">→</span>
                        </button>
                    </div>

                    {/* Current Topic Card */}
                    {(() => {
                        // If all completed and we are at the end, maybe show a "Course Complete" distinct card?
                        // For now, sticking to the standard card but with "Review" state

                        const topic = topics[currentTopicIndex];
                        const isCompleted = currentTopicIndex < unlockedIndex || (currentTopicIndex === unlockedIndex && allCompleted);
                        const isLocked = !isCompleted && currentTopicIndex > unlockedIndex;

                        return (
                            <div
                                className={`w-full bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border transition-all cursor-pointer ${isLocked
                                    ? 'border-slate-200 dark:border-slate-700 opacity-75'
                                    : isCompleted
                                        ? 'border-green-200 dark:border-green-900/50 bg-green-50/10'
                                        : 'border-indigo-100 dark:border-indigo-900/30 shadow-md transform hover:-translate-y-1'
                                    }`}
                                onClick={() => {
                                    if (!isLocked) {
                                        setSelectedTopicId(topic.id || topic._id);
                                    }
                                }}
                            >
                                <div className="flex justify-between items-start mb-4 sm:mb-6">
                                    <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${isLocked
                                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                        : isCompleted
                                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                        }`}>
                                        {isCompleted ? <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" /> : <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${isLocked
                                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                            }`}>
                                            {topic.level || 'General'}
                                        </span>
                                        {!isLocked && (
                                            <button
                                                className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${topic.isFavorite ? 'text-yellow-500' : 'text-slate-300'}`}
                                                onClick={(e) => toggleFavorite(e, topic)}
                                            >
                                                <Star size={20} className={topic.isFavorite ? "fill-current" : ""} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h4 className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 ${isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                                    }`}>
                                    {topic.title}
                                </h4>

                                <p className={`text-sm sm:text-base mb-6 sm:mb-8 line-clamp-2 sm:line-clamp-3 ${isLocked ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {topic.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    {isLocked ? (
                                        <div className="flex items-center text-slate-400 text-xs sm:text-sm font-medium">
                                            <Lock size={16} className="mr-2 flex-shrink-0" />
                                            <span className="hidden sm:inline">Locked • Complete previous topic</span>
                                            <span className="sm:hidden">Locked</span>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center text-sm sm:text-base font-semibold group cursor-pointer ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                            <span className="hidden sm:inline">{isCompleted ? 'Review Topic' : 'Start Learning'}</span>
                                            <span className="sm:hidden">{isCompleted ? 'Review' : 'Start'}</span>
                                            <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                        No topics available.
                    </p>
                </div>
            )}
        </div>
    );
};

export default UserTopicBrowser;

