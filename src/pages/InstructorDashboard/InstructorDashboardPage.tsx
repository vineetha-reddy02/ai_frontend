import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    CheckSquare,
    Plus,
    TrendingUp,
    Users,
    DollarSign,
    Edit,
    Eye
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InstructorLayout from './InstructorLayout';
import { RootState } from '../../store';
import Button from '../../components/Button';
import { topicsService } from '../../services/topics';
import { quizzesService } from '../../services/quizzes';

const InstructorDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const [stats, setStats] = useState({
        topicsCount: 0,
        quizzesCount: 0,
        totalEarnings: 0,
        studentsReached: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            // Fetch instructor-specific data from API with large page size to get all items
            const [topicsRes, quizzesRes] = await Promise.all([
                topicsService.getInstructorTopics({ pageSize: 1000, pageNumber: 1 }),
                quizzesService.getInstructorQuizzes({ pageSize: 1000, pageNumber: 1 })
            ]);

            // Extract counts from API responses
            const topicsData = (topicsRes as any)?.data || (Array.isArray(topicsRes) ? topicsRes : []);
            const quizzesData = (quizzesRes as any)?.data || (Array.isArray(quizzesRes) ? quizzesRes : []);

            // Filter out deleted/hidden quizzes
            const hiddenQuizzes = JSON.parse(localStorage.getItem('hidden_quizzes') || '[]');
            const activeQuizzes = quizzesData.filter((q: any) => {
                const id = q.id || q._id;
                return !q.deleted && !q.isDeleted && !hiddenQuizzes.includes(id);
            });

            setStats({
                topicsCount: topicsData.length || 0,
                quizzesCount: activeQuizzes.length || 0,
                totalEarnings: 0, // TODO: Implement earnings API
                studentsReached: 0 // TODO: Implement students API
            });
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            id: 'topics',
            label: 'Topics Created',
            value: stats.topicsCount,
            icon: BookOpen,
            color: 'blue',
            bgColor: 'bg-blue-100 dark:bg-blue-900',
            textColor: 'text-blue-600 dark:text-blue-400',
            action: () => navigate('/instructor/topics')
        },
        {
            id: 'quizzes',
            label: 'Quizzes Created',
            value: stats.quizzesCount,
            icon: CheckSquare,
            color: 'green',
            bgColor: 'bg-green-100 dark:bg-green-900',
            textColor: 'text-green-600 dark:text-green-400',
            action: () => navigate('/instructor/quizzes')
        }
    ];

    return (
        <InstructorLayout>
            <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
                    {/* Welcome Section */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 md:p-6 lg:p-8 text-white mb-6 md:mb-8 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">
                                    Welcome back, {user?.fullName || 'Instructor'}! 👋
                                </h1>
                                <p className="text-indigo-100">
                                    Ready to create amazing content and inspire learners today?
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <TrendingUp className="w-16 h-16 text-white opacity-20" />
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                        {statCards.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={stat.id}
                                    onClick={stat.action}
                                    className="card hover:shadow-lg transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-3 ${stat.bgColor} rounded-lg group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-6 h-6 ${stat.textColor}`} />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {stat.label}
                                    </h3>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                        {loading ? '...' : stat.value}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                                Quick Actions
                            </h3>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => navigate('/instructor/topics/new')}
                                >
                                    Create New Topic
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => navigate('/instructor/quizzes/new')}
                                >
                                    Create New Quiz
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    leftIcon={<Edit className="w-4 h-4" />}
                                    onClick={() => navigate('/instructor/topics')}
                                >
                                    Manage Topics
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    leftIcon={<Edit className="w-4 h-4" />}
                                    onClick={() => navigate('/instructor/quizzes')}
                                >
                                    Manage Quizzes
                                </Button>
                            </div>
                        </div>

                        {/* Getting Started Guide */}
                        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
                            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                                Getting Started
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                        1
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            Create your first topic
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Share your knowledge with engaging daily topics
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                        2
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            Design interactive quizzes
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Test learner understanding with custom quizzes
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                        3
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            Track your impact
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Monitor earnings and student engagement
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>




                    {/* Content Overview */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Your Content
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Eye className="w-4 h-4" />}
                                onClick={() => navigate('/instructor/topics')}
                            >
                                View All
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 mb-2">
                                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h4 className="font-medium text-slate-900 dark:text-white">Topics</h4>
                                </div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                    {loading ? '...' : stats.topicsCount}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Total topics created
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 mb-2">
                                    <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <h4 className="font-medium text-slate-900 dark:text-white">Quizzes</h4>
                                </div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                    {loading ? '...' : stats.quizzesCount}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Total quizzes created
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </InstructorLayout>
    );
};

export default InstructorDashboardPage;