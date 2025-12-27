import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, BookOpen, Phone, CheckSquare } from 'lucide-react';
import Button from '../../components/Button';
import { Logo } from '../../components/common/Logo';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="cursor-pointer">
            <Logo />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" size="md">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="md">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Welcome to EduTalks
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Master English. Connect with the World.
          </p>
          <p className="text-lg text-slate-500 dark:text-slate-500 max-w-2xl mx-auto">
            Learn English through real conversations, AI-powered feedback, and daily practice with learners worldwide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link to="/register" className="flex-1 sm:flex-none">
              <Button variant="primary" size="lg" fullWidth>
                Get Started Free
              </Button>
            </Link>
            <Link to="/login" className="flex-1 sm:flex-none">
              <Button variant="outline" size="lg" fullWidth>
                Already Have Account?
              </Button>
            </Link>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            🎁 Get 24 hours of free trial - No credit card required
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16 text-slate-900 dark:text-white">
          Our Features
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Mic,
              title: 'AI Pronunciation',
              description: 'Perfect your pronunciation with AI-powered feedback and real-time analysis.',
            },
            {
              icon: BookOpen,
              title: 'Daily Topics',
              description: 'Learn new topics every day to improve your English vocabulary and grammar.',
            },
            {
              icon: Phone,
              title: 'Voice Calling',
              description: 'Practice speaking with other learners in real-time WebRTC calls.',
            },
            {
              icon: CheckSquare,
              title: 'Daily Quizzes',
              description: 'Test your knowledge with engaging and interactive quizzes daily.',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="card text-center hover:scale-105 transform transition-transform"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <p className="text-4xl font-bold">10K+</p>
              <p className="text-lg mt-2 opacity-90">Active Learners</p>
            </div>
            <div>
              <p className="text-4xl font-bold">500+</p>
              <p className="text-lg mt-2 opacity-90">Daily Topics</p>
            </div>
            <div>
              <p className="text-4xl font-bold">100+</p>
              <p className="text-lg mt-2 opacity-90">Quiz Questions</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white">
          Start Learning Today
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
          Join thousands of English learners and start your journey to fluency.
        </p>
        <Link to="/register">
          <Button variant="primary" size="lg">
            Create Free Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-800 text-white border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">EduTalks</h3>
              <p className="text-slate-400 text-sm">Master English. Connect with the World.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>© 2025 EduTalks — Master English. Connect with the World.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
