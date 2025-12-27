import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Loader, Clock, CheckCircle, XCircle } from 'lucide-react';
import { pronunciationService } from '../../services/pronunciation';
import PronunciationRecorder from '../../components/PronunciationRecorder';
import Button from '../../components/Button';
import { useDispatch } from 'react-redux';
import { showToast } from '../../store/uiSlice';
import { useUsageLimits } from '../../hooks/useUsageLimits';

const UserPronunciation: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [paragraphs, setParagraphs] = useState<any[]>([]);
    const [currentParaIndex, setCurrentParaIndex] = useState(() => {
        const stored = localStorage.getItem('pronunciation_unlocked_index');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [unlockedIndex, setUnlockedIndex] = useState(() => {
        const stored = localStorage.getItem('pronunciation_unlocked_index');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [loading, setLoading] = useState(false);
    const [practiceComplete, setPracticeComplete] = useState(false);
    const {
        hasActiveSubscription,
        isTrialActive,
        triggerUpgradeModal,
    } = useUsageLimits();

    useEffect(() => {
        fetchParagraphs();
    }, []);

    const fetchParagraphs = async () => {
        try {
            setLoading(true);
            const res = await pronunciationService.listParagraphs();
            const items = (res as any)?.data || (Array.isArray(res) ? res : (res as any)?.items) || [];
            setParagraphs(items);
        } catch (error) {
            console.error("Failed to fetch paragraphs", error);
            dispatch(showToast({ message: 'Failed to load specific paragraphs', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handlePronunciationSubmit = (result: any) => {
        // Handle result mapping from API (checks for nested scores object first)
        const accuracy = result.scores?.accuracy ?? result.pronunciationAccuracy ?? result.accuracy ?? 0;
        const fluency = result.scores?.fluency ?? result.fluencyScore ?? result.fluency ?? 0;
        const overall = result.scores?.overall ?? result.overallScore ?? result.OverallScore ?? 0;

        console.log('Pronunciation Result processed:', { accuracy, fluency, overall, result });

        if (accuracy >= 75) {
            dispatch(showToast({ message: `Great job! Accuracy: ${accuracy.toFixed(1)}%. Next paragraph unlocked!`, type: 'success' }));

            // Only unlock if we are at the current unlocked frontier
            if (currentParaIndex === unlockedIndex) {
                if (currentParaIndex < paragraphs.length - 1) {
                    setUnlockedIndex(prev => {
                        const next = prev + 1;
                        localStorage.setItem('pronunciation_unlocked_index', next.toString());
                        return next;
                    });
                }
            }
            // Always set practice complete to show the Next button
            setPracticeComplete(true);
        } else {
            dispatch(showToast({ message: `Accuracy: ${accuracy.toFixed(1)}%. Try again to reach 75%!`, type: 'info' }));
            setPracticeComplete(false);
        }
    };

    const handleNextParagraph = () => {
        if (currentParaIndex < paragraphs.length - 1) {
            setCurrentParaIndex(prev => prev + 1);
            setPracticeComplete(false);
        }
    };

    const handlePrevParagraph = () => {
        if (currentParaIndex > 0) {
            setCurrentParaIndex(prev => prev - 1);
            setPracticeComplete(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">AI Pronunciation Practice</h3>
                <div className="text-sm text-slate-500">
                    Progress: {paragraphs.length > 0 ? `${currentParaIndex + 1} / ${paragraphs.length}` : '0 / 0'}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : paragraphs.length > 0 ? (
                <div>
                    <div className="mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handlePrevParagraph} disabled={currentParaIndex === 0}>
                            Previous
                        </Button>
                        <div className="flex gap-2">
                            {practiceComplete && currentParaIndex < paragraphs.length - 1 && (
                                <span className="flex items-center text-green-600 text-sm font-medium animate-pulse">
                                    Unlocked!
                                </span>
                            )}
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleNextParagraph}
                                disabled={currentParaIndex >= unlockedIndex}
                            >
                                Next Paragraph
                            </Button>
                        </div>
                    </div>



                    {(hasActiveSubscription || isTrialActive) ? (
                        <PronunciationRecorder
                            paragraphId={paragraphs[currentParaIndex]?._id || paragraphs[currentParaIndex]?.id}
                            paragraphText={paragraphs[currentParaIndex]?.text || paragraphs[currentParaIndex]?.content}
                            onSubmit={handlePronunciationSubmit}
                            onNext={handleNextParagraph}
                            showNextButton={currentParaIndex < unlockedIndex}
                        />
                    ) : (
                        <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
                            <XCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                Your 24-hour trial has expired.
                            </p>
                            <Button variant="primary" onClick={triggerUpgradeModal}>
                                Upgrade to Pro
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Mic className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4 opacity-50" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        No paragraphs available for practice right now.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/daily-topics')}>
                        Check Daily Topics
                    </Button>
                </div>
            )}
        </div>
    );
};

export default UserPronunciation;

