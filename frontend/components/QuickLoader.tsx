'use client';

import { useEffect, useState } from 'react';

export default function QuickLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show loader for 1.5-2 seconds (1750ms = 1.75 seconds, middle of range)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1750); // 1.75 seconds - smooth transition within 1.5-2 second range

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-teal-950 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_55%),radial-gradient(circle_at_85%_15%,rgba(34,197,94,0.24),transparent_55%),linear-gradient(180deg,rgba(5,46,22,0.95),rgba(6,78,59,0.95))]" />
      
      {/* Lottie Animation - optimized for mobile */}
      <div className="relative z-10 flex h-[300px] w-full max-w-sm items-center justify-center px-4 sm:h-[400px] sm:max-w-md">
        <iframe
          src="https://lottie.host/embed/da9c6415-ea75-4962-8b1f-9ff97dc064eb/sbgqze1PcY.lottie"
          className="h-full w-full border-0"
          title="Loading Animation"
          allow="autoplay"
          style={{ pointerEvents: 'none' }}
          loading="eager"
        />
      </div>
    </div>
  );
}

