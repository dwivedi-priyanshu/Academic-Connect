
'use client';

import type { User, UserRole } from '@/types';
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { loginUserAction, fetchUserForSessionAction } from '@/actions/auth-actions'; // Import new actions

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => Promise<boolean>; // Changed signature
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
    const restoreSession = async () => {
      setIsLoading(true);
      const storedUserId = localStorage.getItem('academic-connect-userId');
      // const storedUserRole = localStorage.getItem('academic-connect-role') as UserRole | null; // Role not strictly needed if fetching by ID

      if (storedUserId) {
        try {
          const sessionUser = await fetchUserForSessionAction(storedUserId);
          if (sessionUser) {
            setUser(sessionUser);
          } else {
            // Invalid session data, clear localStorage
            localStorage.removeItem('academic-connect-userId');
            localStorage.removeItem('academic-connect-role');
          }
        } catch (error) {
          console.error("Session restoration failed:", error);
          localStorage.removeItem('academic-connect-userId');
          localStorage.removeItem('academic-connect-role');
        }
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login' && !pathname.startsWith('/_next/')) {
       if (pathname !== '/') router.push('/login');
    }
    if (!isLoading && user && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router]);


  const handleLogin = async (email: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const loggedInUser = await loginUserAction(email, role);
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('academic-connect-userId', loggedInUser.id);
        localStorage.setItem('academic-connect-role', loggedInUser.role); // Still useful for quick role checks if needed
        router.push('/dashboard');
        setIsLoading(false);
        return true;
      } else {
        setUser(null); // Ensure user is null on failed login
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('academic-connect-userId');
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

