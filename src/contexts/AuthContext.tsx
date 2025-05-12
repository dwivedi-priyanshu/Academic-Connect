'use client';

import type { User, UserRole } from '@/types';
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { MOCK_USER_STUDENT, MOCK_USER_FACULTY, MOCK_USER_ADMIN } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate checking auth status from localStorage or API
    const storedUserRole = localStorage.getItem('academic-connect-role') as UserRole | null;
    if (storedUserRole) {
      handleLogin(storedUserRole, false); // Don't redirect if already on a page
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login' && !pathname.startsWith('/_next/')) {
       if (pathname !== '/') router.push('/login');
    }
    if (!isLoading && user && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router]);


  const handleLogin = (role: UserRole, shouldRedirect: boolean = true) => {
    let mockUser: User;
    if (role === 'Student') mockUser = MOCK_USER_STUDENT;
    else if (role === 'Faculty') mockUser = MOCK_USER_FACULTY;
    else mockUser = MOCK_USER_ADMIN;
    
    setUser(mockUser);
    localStorage.setItem('academic-connect-role', role);
    if (shouldRedirect) {
      router.push('/dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('academic-connect-role');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login: handleLogin, logout: handleLogout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
