import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, ArrowRight, RotateCcw, Award, ChevronRight, ChevronDown, Lock, CheckCircle } from 'lucide-react';
import { quizzesService } from '../../services/quizzes';
import Button from '../../components/Button';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import UserQuizTakingPage from './UserQuizTakingPage';

const UserQuizInterface: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState<Record<string, any[]>>({});
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [unlockedIndex, setUnlockedIndex] = useState(0);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            // Revert to standard list endpoint for users to avoid permission issues
            const res = await quizzesService.list();
            const items = (res as any)?.data || (Array.isArray(res) ? res : (res as any)?.items) || [];
            console.log('Raw Quizzes from API (User List):', items);

            // Filter out deleted or locally hidden quizzes
            // First pass: Basic property check
            const potentialItems = items.filter((quiz: any) => {
                const id = quiz.id || quiz._id;

                // Check if hidden locally
                const hiddenQuizzes = JSON.parse(localStorage.getItem('hidden_quizzes') || '[]');
                if (hiddenQuizzes.includes(id)) return false;

                // Check deleted status
                if (quiz.deleted || quiz.isDeleted) return false;

                // Check isLocked status (User Request: only show unlocked quizzes)
                // We default to true (show) if isLocked is missing to be safe, 
                // but if it's explicitly true, we hide it.
                if (quiz.isLocked === true) return false;

                return true;
            });

            // Second pass: Validate by fetching attempts
            // This is critical because some deleted quizzes might still be returned by the list API
            // but will fail with 400/404 when we try to interact with them.
            const attemptsData: Record<string, any[]> = {};
            const validItems: any[] = [];

            await Promise.all(potentialItems.map(async (quiz: any) => {
                const quizId = quiz.id || quiz._id;
                try {
                    const attemptsRes = await quizzesService.getAttempts(quizId);
                    const attemptsItems = (attemptsRes as any)?.data || (Array.isArray(attemptsRes) ? attemptsRes : (attemptsRes as any)?.items) || [];
                    attemptsData[quizId] = attemptsItems;
                    validItems.push(quiz);
                } catch (err: any) {
                    // If we get a 400 or 404, assume the quiz is invalid/deleted and exclude it
                    if (err?.response?.status === 400 || err?.response?.status === 404 || err?.status === 400 || err?.status === 404) {
                        console.warn(`Excluding invalid quiz ${quizId} (likely deleted):`, err);
                    } else {
                        // For other errors (500, network), we might still want to show it or at least log it
                        console.error(`Failed to fetch attempts for quiz ${quizId}`, err);
                        // Decided: If we can't fetch attempts, we probably shouldn't show it as "active" 
                        // to prevent user frustration, but strictly only filtering 4xx is safer for flakes.
                        // However, to be safe against the specific issue USER reported, we filter it.
                    }
                }
            }));

            console.log('Active Quizzes (Validated):', validItems);

            // Sort to ensure consistent order (e.g., by created date)
            const sortedItems = [...validItems].sort((a: any, b: any) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            setQuizzes(sortedItems);
            setAttempts(attemptsData);

            // Determine unlocked index based on fetched attempts
            let lastCompletedIndex = -1;
            sortedItems.forEach((quiz: any, index: number) => {
                const quizId = quiz.id || quiz._id;
                const quizAttempts = attemptsData[quizId] || [];
                // Check if there are any attempts
                if (quizAttempts.length > 0) {
                    lastCompletedIndex = index;
                }
            });

            const nextIndex = lastCompletedIndex + 1;
            const newUnlockedIndex = Math.min(nextIndex, sortedItems.length - 1);

            setUnlockedIndex(newUnlockedIndex);
            // Default to showing the active unlocked quiz

            // Only update current index if we are at 0 (initial load)
            // or if the current index is now out of bounds
            if (currentQuizIndex === 0 || currentQuizIndex >= sortedItems.length) {
                setCurrentQuizIndex(newUnlockedIndex);
            }

        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
            dispatch(showToast({ message: 'Failed to load quizzes', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const fetchAttempts = async (quizId: string) => {
        if (attempts[quizId]) return;

        try {
            const res = await quizzesService.getAttempts(quizId);
            const items = (res as any)?.data || (Array.isArray(res) ? res : (res as any)?.items) || [];
            setAttempts(prev => ({ ...prev, [quizId]: items }));
        } catch (error) {
            console.error('Failed to fetch attempts:', error);
        }
    };

    // Load attempts when current index changes, effectively lazy loading when user navigates
    useEffect(() => {
        if (quizzes.length > 0) {
            const quiz = quizzes[currentQuizIndex];
            if (quiz) {
                fetchAttempts(quiz.id || quiz._id);
            }
        }
    }, [currentQuizIndex, quizzes]);

    const formatDate = (attempt: any): string => {
        const dateString = attempt?.createdAt || attempt?.completedAt || attempt?.submittedAt || attempt?.timestamp;
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'N/A';
        }
    };

    if (loading) {
        return <div className="py-12 text-center text-slate-500">Loading quizzes...</div>;
    }

    // If a quiz is selected, show the quiz taking page
    if (selectedQuizId) {
        return (
            <UserQuizTakingPage
                quizId={selectedQuizId}
                onBack={() => {
                    setSelectedQuizId(null);
                    fetchQuizzes(); // Refresh to update attempts
                }}
            />
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between px-2 sm:px-0">
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-white">Quiz Path</h3>
            </div>

            {quizzes.length > 0 ? (
                <div className="flex flex-col items-center max-w-2xl mx-auto px-2 sm:px-4">
                    {/* Progress Indicator */}
                    <div className="w-full mb-4 sm:mb-6">
                        <div className="flex justify-between text-xs sm:text-sm text-slate-500 mb-2">
                            <span>Quiz {currentQuizIndex + 1} of {quizzes.length}</span>
                            <span className="hidden xs:inline">{Math.round(((currentQuizIndex + 1) / quizzes.length) * 100)}% Progress</span>
                            <span className="xs:hidden">{Math.round(((currentQuizIndex + 1) / quizzes.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-pink-600 transition-all duration-300"
                                style={{ width: `${((currentQuizIndex + 1) / quizzes.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="w-full flex justify-between items-center mb-4 sm:mb-6 gap-2">
                        <button
                            onClick={() => setCurrentQuizIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuizIndex === 0}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px] ${currentQuizIndex === 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="hidden sm:inline">← Previous</span>
                            <span className="sm:hidden">←</span>
                        </button>

                        <div className="flex gap-2">
                            {currentQuizIndex < unlockedIndex ? (
                                <span className="text-green-600 text-xs sm:text-sm font-medium flex items-center px-2 sm:px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                                    <span className="hidden xs:inline">Completed</span>
                                    <span className="xs:hidden">✓</span>
                                </span>
                            ) : currentQuizIndex === unlockedIndex ? (
                                <span className="text-pink-600 text-xs sm:text-sm font-medium flex items-center px-2 sm:px-3 py-1 bg-pink-50 dark:bg-pink-900/20 rounded-full animate-pulse">
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
                            onClick={() => setCurrentQuizIndex(prev => Math.min(quizzes.length - 1, prev + 1))}
                            disabled={currentQuizIndex >= unlockedIndex || currentQuizIndex === quizzes.length - 1}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all min-h-[44px] ${currentQuizIndex >= unlockedIndex || currentQuizIndex === quizzes.length - 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-900/20'
                                }`}
                        >
                            <span className="hidden sm:inline">Next →</span>
                            <span className="sm:hidden">→</span>
                        </button>
                    </div>

                    {/* Quiz Card */}
                    {(() => {
                        const quiz = quizzes[currentQuizIndex];
                        const isCompleted = currentQuizIndex < unlockedIndex;
                        const isLocked = !isCompleted && currentQuizIndex > unlockedIndex;
                        const quizAttempts = attempts[quiz.id || quiz._id] || [];
                        const bestScore = quizAttempts.length > 0
                            ? Math.max(...quizAttempts.map(a => a.score))
                            : null;

                        return (
                            <div className={`w-full bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border transition-all ${isLocked
                                ? 'border-slate-200 dark:border-slate-700 opacity-75'
                                : isCompleted
                                    ? 'border-green-200 dark:border-green-900/50 bg-green-50/10'
                                    : 'border-pink-200 dark:border-pink-900 ring-1 ring-pink-100 dark:ring-pink-900/30 shadow-md'
                                }`}>
                                <div className="p-4 sm:p-6 md:p-8">
                                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                                        <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${isLocked
                                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                            : isCompleted
                                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                                            }`}>
                                            {isCompleted ? <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" /> : (isLocked ? <Lock className="w-6 h-6 sm:w-7 sm:h-7" /> : <CheckSquare className="w-6 h-6 sm:w-7 sm:h-7" />)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${isLocked
                                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                }`}>
                                                {quiz.difficulty || 'Medium'}
                                            </span>
                                        </div>
                                    </div>

                                    <h4 className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 ${isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                        {quiz.title}
                                    </h4>

                                    <p className={`text-sm sm:text-base mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-none ${isLocked ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {quiz.description}
                                    </p>

                                    <div className={`flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-6 sm:mb-8 ${isLocked ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>{quiz.timeLimit || 10} mins</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Award className="w-4 h-4" />
                                            <span>{quiz.questions?.length || 0} Questions</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                                        {isLocked ? (
                                            <div className="flex items-center text-slate-400 text-xs sm:text-sm font-medium w-full justify-center py-2">
                                                <span className="hidden sm:inline">Complete previous quiz to unlock</span>
                                                <span className="sm:hidden">Locked</span>
                                            </div>
                                        ) : (
                                            <div className="w-full">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
                                                    <div>
                                                        {bestScore !== null && (
                                                            <div className="text-xs sm:text-sm">
                                                                Best Score: <span className={`font-bold ${bestScore >= 80 ? 'text-green-600' : 'text-orange-500'
                                                                    }`}>{bestScore}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Calculate next quiz ID for "next" navigation after completion?
                                                            // Usually we just go to the quiz page.
                                                            const nextIndex = currentQuizIndex + 1;
                                                            const nextQuizId = nextIndex < quizzes.length ? (quizzes[nextIndex].id || quizzes[nextIndex]._id) : null;

                                                            navigate(`/quizzes/${quiz.id || quiz._id}`, {
                                                                state: { nextQuizId }
                                                            });
                                                        }}
                                                        className="bg-pink-600 hover:bg-pink-700 text-white w-full sm:w-auto"
                                                    >
                                                        <span className="hidden sm:inline">{isCompleted ? 'Retake Quiz' : (bestScore !== null ? 'Improve Score' : 'Start Quiz')}</span>
                                                        <span className="sm:hidden">{isCompleted ? 'Retake' : (bestScore !== null ? 'Improve' : 'Start')}</span>
                                                    </Button>
                                                </div>

                                                {/* Recent Attempts Mini-view */}
                                                {!isLocked && quizAttempts.length > 0 && (
                                                    <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                                        <h5 className="text-xs font-semibold uppercase text-slate-500 mb-2">Recent History</h5>
                                                        <div className="space-y-2">
                                                            {quizAttempts.slice(0, 2).map((attempt: any) => (
                                                                <div key={attempt.id} className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">{formatDate(attempt)}</span>
                                                                    <span className="font-mono">{attempt.score}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        );
                    })()}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-slate-500">No quizzes available.</p>
                </div>
            )}
        </div>
    );
};

export default UserQuizInterface;
