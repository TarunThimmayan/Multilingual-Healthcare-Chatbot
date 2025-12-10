'use client';

import { useEffect, useState } from 'react';
import QuickLoader from './QuickLoader';

export default function InitialPageLoader() {
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Check if this is a browser refresh (not client-side navigation)
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isRefresh = navigation?.type === 'reload' || 
                      (typeof window.performance.navigation !== 'undefined' && 
                       (window.performance as any).navigation.type === 1); // TYPE_RELOAD = 1

    if (!isRefresh) {
      // Not a refresh, hide immediately
      setIsInitialLoad(false);
      return;
    }

    // For browser refresh, show loader until page is fully loaded and rendered
    let loadComplete = false;

    const handleComplete = () => {
      if (loadComplete) return;
      loadComplete = true;

      // Wait for next frame to ensure rendering is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Additional small delay for smooth transition
          setTimeout(() => {
            setIsInitialLoad(false);
          }, 200);
        });
      });
    };

    // Check multiple conditions for page readiness
    const checkReady = () => {
      // Page is loaded and DOM is ready
      if (document.readyState === 'complete') {
        // Wait a bit more for React hydration and initial render
        setTimeout(handleComplete, 300);
      }
    };

    // Check immediately
    checkReady();

    // Also listen for load event
    window.addEventListener('load', () => {
      setTimeout(handleComplete, 300);
    });

    // Fallback: hide after maximum time to prevent stuck loader
    const maxLoadTimer = setTimeout(() => {
      if (!loadComplete) {
        loadComplete = true;
        setIsInitialLoad(false);
      }
    }, 2500); // Max 2.5 seconds

    return () => {
      window.removeEventListener('load', checkReady);
      clearTimeout(maxLoadTimer);
    };
  }, []);

  if (!isInitialLoad) return null;

  return <QuickLoader />;
}

