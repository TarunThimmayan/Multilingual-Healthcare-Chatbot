'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../utils/auth';

export default function AuthPage() {
  const router = useRouter();
  
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/');
    } else {
      // Redirect to signup page by default
      router.push('/auth/signup');
    }
  }, [router]);
  
  return null;
}
