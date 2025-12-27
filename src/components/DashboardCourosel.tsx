import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Slide {
    id: string;
    image: string;
    title: string;
    description: string;
    ctaText?: string;
    ctaLink?: string;
}

interface DashboardCarouselProps {
    slides: Slide[];
    autoPlayInterval?: number;
}

const DashboardCarousel: React.FC<DashboardCarouselProps> = ({
    slides,
    autoPlayInterval = 5000
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(nextSlide, autoPlayInterval);
        return () => clearInterval(interval);
    }, [isPaused, nextSlide, autoPlayInterval]);

    if (!slides.length) return null;

    return (
        <div
            className="relative w-full max-w-full overflow-hidden rounded-xl md:rounded-2xl shadow-xl group h-[200px] sm:h-[240px] md:h-[280px] mb-6 scrollbar-hide"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Slides */}
            <div
                className="flex transition-transform duration-700 ease-in-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {slides.map((slide) => (
                    <div
                        key={slide.id}
                        className="min-w-full h-full relative"
                    >
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-10">
                            <div className={`transform transition-all duration-700 delay-100 ${currentIndex === slides.findIndex(s => s.id === slide.id) ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2 text-white drop-shadow-md">
                                    {slide.title}
                                </h2>
                                <p className="text-sm sm:text-base md:text-lg text-slate-100 mb-2 md:mb-4 max-w-2xl drop-shadow-sm line-clamp-2">
                                    {slide.description}
                                </p>
                                {slide.ctaText && (
                                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 md:px-6 md:py-2 rounded-lg md:rounded-xl font-semibold transition-all hover:scale-105 shadow-lg flex items-center gap-2 text-xs md:text-sm">
                                        {slide.ctaText}
                                        <ChevronRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Buttons - Hidden on mobile, visible on hover on desktop */}
            <button
                onClick={prevSlide}
                className="hidden md:block absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-1.5 md:p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg border border-white/10"
                aria-label="Previous slide"
            >
                <ChevronLeft size={18} className="md:w-5 md:h-5" />
            </button>
            <button
                onClick={nextSlide}
                className="hidden md:block absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-1.5 md:p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg border border-white/10"
                aria-label="Next slide"
            >
                <ChevronRight size={18} className="md:w-5 md:h-5" />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 block ${index === currentIndex
                            ? 'bg-white opacity-100'
                            : 'bg-white/50 hover:bg-white/70'
                            }`}
                        style={{ aspectRatio: '1/1', minWidth: '8px', minHeight: '8px' }}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default DashboardCarousel;

