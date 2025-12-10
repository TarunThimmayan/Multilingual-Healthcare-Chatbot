'use client';

import { useEffect, useState } from 'react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Wait for Lottie animation to load and play (show for 4 seconds)
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 4000); // Show animation for 4 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationComplete) {
      // Fade out animation
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        // Call onComplete after fade out completes
        setTimeout(() => {
          onComplete();
        }, 600);
      }, 600);

      return () => clearTimeout(fadeTimer);
    }
  }, [animationComplete, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none'
      }}
    >
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_55%),radial-gradient(circle_at_85%_15%,rgba(34,197,94,0.24),transparent_55%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.97))]" />
      
      {/* Lottie Animation - Responsive sizing for mobile */}
      <div className="relative z-10 flex h-[250px] w-full max-w-sm items-center justify-center px-4 sm:h-[350px] sm:max-w-md md:h-[400px]">
        <iframe
          src="https://lottie.host/embed/69db2fef-793d-4e48-8034-e5cebe66dec9/Kz7csFK40D.lottie"
          className="h-full w-full border-0"
          title="Welcome Animation"
          allow="autoplay"
          loading="eager"
        />
      </div>

      {/* Welcome Text - Responsive for mobile */}
      <div className="relative z-10 mt-4 px-4 text-center sm:mt-6 sm:mt-8">
        <h1 className="mb-2 text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
          Welcome to Health Companion
        </h1>
        <p className="text-sm text-slate-300/80 sm:text-base md:text-lg">
          Your AI-powered health assistant is ready to help
        </p>
      </div>

      {/* Loading indicator */}
      {animationComplete && (
        <div className="relative z-10 mt-4 px-4 sm:mt-6 sm:mt-8">
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-300/80 sm:text-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>Loading your dashboard...</span>
          </div>
        </div>
      )}
    </div>
  );
}

