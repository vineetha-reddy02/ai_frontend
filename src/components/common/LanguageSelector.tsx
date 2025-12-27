import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { LANGUAGES, Language } from '../../constants/languages';

const STORAGE_KEY = 'edutalks_language_preference';
const DEFAULT_LANG_CODE = 'English';

export const LanguageSelector: React.FC = () => {
    // Initialize state from localStorage or default to English
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const found = LANGUAGES.find(l => l.name === saved || l.code === saved);
            if (found) return found;
        }
        return LANGUAGES.find(l => l.code === DEFAULT_LANG_CODE) || LANGUAGES[0];
    });

    const [isOpen, setIsOpen] = useState(false);
    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Persist to localStorage whenever selection changes
    useEffect(() => {
        if (selectedLanguage) {
            localStorage.setItem(STORAGE_KEY, selectedLanguage.name);
            // Dispatch custom event if other components need to know (optional but good for decoupled apps)
            window.dispatchEvent(new Event('languageChanged'));
        }
    }, [selectedLanguage]);

    // Close on click outside & Reset list view
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setTimeout(() => setShowAllLanguages(false), 200); // Reset after close animation
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (language: Language) => {
        setSelectedLanguage(language);
        setIsOpen(false);
        setShowAllLanguages(false);
    };

    // Filter languages for the "Clean" view
    // Always show English + Selected Language (if different)
    const priorityLanguages = LANGUAGES.filter(l =>
        l.code === 'English' || l.code === selectedLanguage.code
    );

    // Determine which list to show
    const displayedLanguages = showAllLanguages ? LANGUAGES : priorityLanguages;
    const hasMoreLanguages = !showAllLanguages && LANGUAGES.length > priorityLanguages.length;

    // Button Label Text
    const buttonLabel = selectedLanguage.code === 'English'
        ? 'English'
        : `English / ${selectedLanguage.name}`;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select Language"
            >
                {/* Mobile: Globe icon, Desktop: Flags */}
                <Globe size={20} className="sm:hidden text-slate-600 dark:text-slate-400" />
                <span className="hidden sm:flex items-center text-xl leading-none">
                    {selectedLanguage.code !== 'English' && (
                        <>
                            <span>🇬🇧</span>
                            <span className="mx-1 text-slate-300">/</span>
                        </>
                    )}
                    <span>{selectedLanguage.flag}</span>
                </span>

                <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200">
                    {buttonLabel}
                </span>

                <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-black/50 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                    role="listbox"
                >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Select Regional Language
                        </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {displayedLanguages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleSelect(lang)}
                                role="option"
                                aria-selected={selectedLanguage.code === lang.code}
                                className={`
                                    w-full text-left flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                                    ${selectedLanguage.code === lang.code
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                `}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-xl leading-none">{lang.flag}</span>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{lang.name}</span>
                                        <span className="text-xs opacity-75">{lang.nativeName}</span>
                                    </div>
                                </span>
                                {selectedLanguage.code === lang.code && (
                                    <Check size={16} className="text-blue-600 dark:text-blue-400" />
                                )}
                            </button>
                        ))}

                        {hasMoreLanguages && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAllLanguages(true);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
                            >
                                <Globe size={16} />
                                View All Languages...
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
