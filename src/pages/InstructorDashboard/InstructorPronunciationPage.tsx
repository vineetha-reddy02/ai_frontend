import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Save, X, BookOpen, Volume2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../components/Button';
import { pronunciationService } from '../../services/pronunciation';
import { showToast } from '../../store/uiSlice';
import { useDispatch } from 'react-redux';
import { PronunciationParagraph } from '../../types';

const PronunciationContentManager: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [paragraphs, setParagraphs] = useState<PronunciationParagraph[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [currentParagraph, setCurrentParagraph] = useState<Partial<PronunciationParagraph>>({});

    useEffect(() => {
        loadParagraphs();
    }, []);

    const loadParagraphs = async (pageNumber = 1) => {
        try {
            setLoading(true);
            const res = await pronunciationService.getInstructorParagraphs({
                pageNumber,
                pageSize: 10
            });

            let rawItems: any[] = [];

            // Handle if response is already the array (from interceptor)
            if (Array.isArray(res)) {
                rawItems = res;
                // Check for attached metadata on the array (custom interceptor behavior)
                if ((res as any).totalPages) setTotalPages((res as any).totalPages);
                if ((res as any).currentPage) setPage((res as any).currentPage);
            } else {
                // Handle if response is the wrapper object
                const data = (res as any)?.data || (res as any)?.items;
                if (Array.isArray(data)) {
                    rawItems = data;
                }

                if ((res as any)?.totalPages) setTotalPages((res as any).totalPages);
                if ((res as any)?.currentPage) setPage((res as any).currentPage);
            }

            const items: PronunciationParagraph[] = rawItems.map((item: any) => ({
                id: item.id || item.Id,
                title: item.title || item.Title || '',
                text: item.text || item.Text,
                difficulty: item.difficulty || item.Difficulty,
                language: item.language || item.Language,
                createdBy: item.createdBy || item.CreatedBy,
                createdAt: item.createdAt || item.CreatedAt,
                phoneticTranscription: item.phoneticTranscription || item.PhoneticTranscription,
                referenceAudioUrl: item.referenceAudioUrl || item.ReferenceAudioUrl,
                wordCount: item.wordCount,
                estimatedDurationSeconds: item.estimatedDurationSeconds
            }));

            setParagraphs(items);
        } catch (error) {
            console.error('Failed to load paragraphs:', error);
            // dispatch(showToast({ message: 'Failed to load paragraphs', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (paragraph?: PronunciationParagraph) => {
        if (paragraph) {
            setCurrentParagraph(paragraph);
        } else {
            setCurrentParagraph({
                title: '',
                text: '',
                difficulty: 'Beginner',
                language: 'en-US',
                phoneticTranscription: '',
                referenceAudioUrl: ''
            });
        }
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this paragraph?')) return;

        try {
            await pronunciationService.deleteParagraph(id);
            dispatch(showToast({ message: 'Paragraph deleted', type: 'success' }));
            loadParagraphs();
        } catch (error) {
            console.error('Failed to delete paragraph:', error);
            dispatch(showToast({ message: 'Failed to delete paragraph', type: 'error' }));
        }
    };

    const handleSave = async () => {
        if (!currentParagraph.title?.trim()) {
            dispatch(showToast({ message: 'Title is required', type: 'error' }));
            return;
        }

        if (!currentParagraph.text?.trim()) {
            dispatch(showToast({ message: 'Text content is required', type: 'error' }));
            return;
        }

        try {
            setLoading(true);
            const payload = {
                Title: currentParagraph.title,
                Text: currentParagraph.text,
                Difficulty: currentParagraph.difficulty || 'Beginner',
                Language: currentParagraph.language || 'en-US',
                PhoneticTranscription: currentParagraph.phoneticTranscription,
                ReferenceAudioUrl: currentParagraph.referenceAudioUrl,
                ...(currentParagraph.id ? { Id: currentParagraph.id } : {})
            };

            if (currentParagraph.id) {
                await pronunciationService.updateParagraph(currentParagraph.id, payload);
                dispatch(showToast({ message: 'Paragraph updated', type: 'success' }));
            } else {
                await pronunciationService.createParagraph(payload);
                dispatch(showToast({ message: 'Paragraph created', type: 'success' }));
            }
            setIsEditing(false);
            loadParagraphs();
        } catch (error: any) {
            console.error('Failed to save paragraph:', error);
            const data = error?.response?.data;
            let message = data?.message || 'Failed to save paragraph';

            if (data?.errors) {
                if (Array.isArray(data.errors)) {
                    message = data.errors.map((e: any) => e.message || e).join(', ');
                } else {
                    message = JSON.stringify(data.errors);
                }
            } else if (data?.messages) {
                message = Array.isArray(data.messages) ? data.messages.join(', ') : data.messages;
            }

            dispatch(showToast({ message, type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/instructor-dashboard')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
                    </Button>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        Pronunciation Content
                    </h2>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEdit()}
                    leftIcon={<Plus size={16} />}
                >
                    Add Paragraph
                </Button>
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                            {currentParagraph.id ? 'Edit Paragraph' : 'New Paragraph'}
                        </h3>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                value={currentParagraph.title || ''}
                                onChange={(e) => setCurrentParagraph(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 mb-4"
                                placeholder="e.g., Daily Conversation Practice"
                            />

                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Text Content
                            </label>
                            <textarea
                                value={currentParagraph.text || ''}
                                onChange={(e) => setCurrentParagraph(prev => ({ ...prev, text: e.target.value }))}
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter the text for students to practice pronouncing..."
                            />
                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Phonetic Transcription (Optional)
                            </label>
                            <input
                                type="text"
                                value={currentParagraph.phoneticTranscription || ''}
                                onChange={(e) => setCurrentParagraph(prev => ({ ...prev, phoneticTranscription: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="/.../"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Reference Audio URL (Optional)
                            </label>
                            <input
                                type="text"
                                value={currentParagraph.referenceAudioUrl || ''}
                                onChange={(e) => setCurrentParagraph(prev => ({ ...prev, referenceAudioUrl: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Difficulty
                            </label>
                            <select
                                value={currentParagraph.difficulty || 'Beginner'}
                                onChange={(e) => setCurrentParagraph(prev => ({ ...prev, difficulty: e.target.value as any }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Language
                            </label>
                            <input
                                type="text"
                                value={currentParagraph.language || 'en-US'}
                                onChange={(e) => setCurrentParagraph(prev => ({ ...prev, language: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Paragraph'}
                        </Button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {paragraphs.length === 0 && !loading ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No pronunciation content found. Create one to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {paragraphs.map((para) => (
                            <div key={para.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4">
                                <div className="flex-1">
                                    <p className="text-slate-900 dark:text-white font-medium line-clamp-2">
                                        {para.text}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${para.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                            para.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {para.difficulty}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {para.language || 'en-US'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(para)}
                                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(para.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {
                paragraphs.length > 0 && (
                    <div className="flex items-center justify-between py-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadParagraphs(page - 1)}
                                disabled={page <= 1 || loading}
                                leftIcon={<ChevronLeft size={16} />}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadParagraphs(page + 1)}
                                disabled={page >= totalPages || loading}
                                rightIcon={<ChevronRight size={16} />}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PronunciationContentManager;