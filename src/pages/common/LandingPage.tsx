import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, BookOpen, Phone, CheckSquare, Rocket, Star, Zap, Twitter, Github, Linkedin, Instagram, Mail, ArrowRight } from 'lucide-react';
import Button from '../../components/Button';
import { Logo } from '../../components/common/Logo';

const LandingPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-dvh bg-white dark:bg-slate-900">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
                    <div className="cursor-pointer">
                        <Logo className="!text-xl sm:!text-2xl" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link to="/login">
                            <Button variant="outline" size="md" className="!px-2.5 !py-1.5 !text-xs sm:!px-4 sm:!py-2.5 sm:!text-base">
                                {t('landing.nav.login')}
                            </Button>
                        </Link>
                        <Link to="/register">
                            <Button variant="primary" size="md" className="!px-2.5 !py-1.5 !text-xs sm:!px-4 sm:!py-2.5 sm:!text-base whitespace-nowrap">
                                {t('landing.nav.getStarted')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            {/* Hero Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pt-24 pb-12 lg:pt-32 lg:pb-16 text-center overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] -z-10"></div>

                {/* Interactive Hero Avatars */}
                {/* Interactive Hero Watermarks */}
                <div className="hidden xl:block absolute top-1/2 -translate-y-1/2 left-20 w-48 h-48 animate-float pointer-events-none select-none z-0 opacity-20">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl transform scale-75"></div>
                    <img src="/assets/welcome-globe.svg" alt="Global Community" className="w-full h-full relative z-10 drop-shadow-2xl" />
                </div>

                <div className="hidden xl:block absolute top-1/2 -translate-y-1/2 right-20 w-48 h-48 animate-float animation-delay-2000 pointer-events-none select-none z-0 opacity-15">
                    <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-3xl transform scale-75"></div>
                    <img src="/assets/welcome-chat.svg" alt="Conversation" className="w-full h-full relative z-10 drop-shadow-2xl" />
                </div>

                <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
                        <span className="text-blue-500">Welcome to </span>
                        <span className="text-violet-600">EduTalks</span>
                    </h1>

                    <p className="text-xl sm:text-2xl font-medium text-slate-300">
                        Master English. Connect with the World.
                    </p>

                    <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Learn English through real conversations, AI-powered feedback, and daily practice with learners worldwide.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                        <Link to="/register">
                            <button className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-all shadow-lg shadow-blue-500/25 w-full sm:w-auto">
                                Get Started Free
                            </button>
                        </Link>
                        <Link to="/login">
                            <button className="px-8 py-3.5 bg-transparent border-2 border-blue-500 hover:bg-blue-500/10 text-white font-semibold rounded-lg text-lg transition-all w-full sm:w-auto">
                                Already Have Account?
                            </button>
                        </Link>
                    </div>

                    <p className="flex items-center justify-center gap-2 text-sm text-slate-400 font-medium pt-4">
                        <span className="text-xl">🎁</span>
                        Get 24 hours of free trial - No credit card required
                    </p>
                </div>
            </section>

            {/* Features Showcase Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-32">
                <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-slate-900 dark:text-white">
                    {t('landing.features.title')}
                </h2>

                {/* Feature 1: Voice Calling */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
                    <div className="flex-1 w-full relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src="/assets/voice-call.svg"
                            alt="Voice Call Interface"
                            className="relative rounded-3xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 bg-slate-900/50 backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                            <Phone className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {t('landing.features.voiceCalling.title')}
                        </h3>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('landing.features.voiceCalling.description')} Connect instantly with learning partners around the world. Our smart matching system ensures you always have someone to practice with.
                        </p>
                        <ul className="space-y-3">
                            {[
                                'Real-time P2P audio',
                                'Smart partner matching',
                                'Topic suggestions during calls'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/voice-calls" className="inline-block pt-4 text-indigo-500 font-semibold hover:text-indigo-600 transition-colors">
                            Start a Call &rarr;
                        </Link>
                    </div>
                </div>

                {/* Feature 2: Daily Topics (Reversed) */}
                <div className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-24">
                    <div className="flex-1 w-full relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src="/assets/topics.svg"
                            alt="Topics Interface"
                            className="relative rounded-3xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 bg-slate-900/50 backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-cyan-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {t('landing.features.dailyTopics.title')}
                        </h3>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('landing.features.dailyTopics.description')} Never run out of things to say. Explore our vast library of conversation starters, curated for every skill level.
                        </p>
                        <ul className="space-y-3">
                            {[
                                'Curated daily topics',
                                'Vocabulary suggestions',
                                'Level-based categorization'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/daily-topics" className="inline-block pt-4 text-cyan-500 font-semibold hover:text-cyan-600 transition-colors">
                            Explore Topics &rarr;
                        </Link>
                    </div>
                </div>

                {/* Feature 3: Quizzes */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
                    <div className="flex-1 w-full relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-amber-400 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src="/assets/quizzes.svg"
                            alt="Quiz Interface"
                            className="relative rounded-3xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 bg-slate-900/50 backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <CheckSquare className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {t('landing.features.dailyQuizzes.title')}
                        </h3>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('landing.features.dailyQuizzes.description')} Test your knowledge and track your progress with our gamified quizzes. Earn points and climb the leaderboard.
                        </p>
                        <ul className="space-y-3">
                            {[
                                'Instant feedback',
                                'Various difficulty levels',
                                'Track your mastery'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/quizzes" className="inline-block pt-4 text-amber-500 font-semibold hover:text-amber-600 transition-colors">
                            Take a Quiz &rarr;
                        </Link>
                    </div>
                </div>

                {/* Feature 4: AI Pronunciation (Reversed) */}
                <div className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-24">
                    <div className="flex-1 w-full relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src="/assets/ai-pronunciation.svg"
                            alt="AI Analysis"
                            className="relative rounded-3xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 bg-slate-900/50 backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <Mic className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {t('landing.features.aiPronunciation.title')}
                        </h3>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('landing.features.aiPronunciation.description')} Get instant, detailed feedback on your pronunciation using our advanced AI technology. Perfection is within reach.
                        </p>
                        <ul className="space-y-3">
                            {[
                                'Visual sound wave analysis',
                                'Accuracy scoring',
                                'Phoneme-level feedback'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/pronunciation" className="inline-block pt-4 text-emerald-500 font-semibold hover:text-emerald-600 transition-colors">
                            Analyze Voice &rarr;
                        </Link>
                    </div>
                </div>

            </section>

            {/* Stats Section */}
            <section className="bg-gradient-to-r from-primary-600 to-secondary-600 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8 text-center text-white">
                        <div>
                            <p className="text-4xl font-bold">10K+</p>
                            <p className="text-lg mt-2 opacity-90">{t('landing.stats.activeLearners')}</p>
                        </div>
                        <div>
                            <p className="text-4xl font-bold">500+</p>
                            <p className="text-lg mt-2 opacity-90">{t('landing.stats.dailyTopics')}</p>
                        </div>
                        <div>
                            <p className="text-4xl font-bold">100+</p>
                            <p className="text-lg mt-2 opacity-90">{t('landing.stats.quizQuestions')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Community Section */}
            <section className="bg-slate-50 dark:bg-slate-900/50 py-24 border-y border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
                        Join Our Global Community
                    </h2>
                    <p className="text-xl text-slate-600 dark:text-slate-400 mb-16 max-w-2xl mx-auto">
                        Connect with thousands of learners, practice real conversations, and make friends from around the world.
                    </p>

                    <div className="grid md:grid-cols-3 gap-12 items-end">
                        {/* Learner 1 */}
                        <div className="flex flex-col items-center group">
                            <div className="relative mb-8 transition-transform duration-500 hover:-translate-y-4">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-colors"></div>
                                <img src="/assets/learner-audio.svg" alt="Listening Practice" className="w-64 h-64 relative z-10 drop-shadow-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Immersive Listening</h3>
                            <p className="text-slate-600 dark:text-slate-400">Practice with native audio</p>
                        </div>

                        {/* Learner 3 (Center - Connect) */}
                        <div className="flex flex-col items-center group -mt-12">
                            <div className="relative mb-8 transition-transform duration-500 hover:scale-110">
                                <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-2xl group-hover:bg-pink-500/30 transition-colors"></div>
                                <img src="/assets/community-connect.svg" alt="Social Connection" className="w-80 h-80 relative z-10 drop-shadow-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Real Connections</h3>
                            <p className="text-slate-600 dark:text-slate-400">Make friends & learn together</p>
                        </div>

                        {/* Learner 2 */}
                        <div className="flex flex-col items-center group">
                            <div className="relative mb-8 transition-transform duration-500 hover:-translate-y-4">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-colors"></div>
                                <img src="/assets/learner-study.svg" alt="Focused Study" className="w-64 h-64 relative z-10 drop-shadow-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Structured Learning</h3>
                            <p className="text-slate-600 dark:text-slate-400">Master topics daily</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-slate-950 py-24 text-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 text-slate-800/50 transform -rotate-12">
                        <Rocket size={120} strokeWidth={1} />
                    </div>
                    <div className="absolute bottom-10 right-10 text-slate-800/50 transform rotate-12">
                        <Zap size={120} strokeWidth={1} />
                    </div>
                    <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>

                    {/* Gradient Blob */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -z-10"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="inline-block p-3 rounded-2xl bg-slate-900/50 border border-slate-800 mb-6 backdrop-blur-sm">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">
                        Start Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Today</span>
                    </h2>
                    <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Join thousands of English learners and start your journey to fluency. No credit card required.
                    </p>
                    <Link to="/register">
                        <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1">
                            Create Free Account
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-white border-t border-slate-900 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-600 p-2 rounded-lg">
                                    <Mic className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-bold text-2xl tracking-tight">EduTalks</h3>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Master English visually and verbally. Connect with the world through real-time conversations and AI-powered pronunciation feedback.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 hover:text-blue-400 transition-colors"><Twitter size={20} /></a>
                                <a href="#" className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"><Github size={20} /></a>
                                <a href="#" className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 hover:text-blue-600 transition-colors"><Linkedin size={20} /></a>
                                <a href="#" className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 hover:text-pink-500 transition-colors"><Instagram size={20} /></a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><BookOpen size={18} className="text-slate-500" /> Product</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Voice Rooms</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Daily Topics</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Pronunciation AI</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><CheckSquare size={18} className="text-slate-500" /> Company</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Success Stories</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Careers</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><Mail size={18} className="text-slate-500" /> Stay Updated</h4>
                            <p className="text-slate-400 text-sm mb-4">Subscribe to our newsletter for daily tips.</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                />
                                <button className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors">
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
                        <p>{t('landing.footer.copyright')}</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-slate-300 transition-colors">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
