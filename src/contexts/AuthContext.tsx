
'use client';

import type { User, UserRole } from '@/types';
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { loginUserAction, fetchUserForSessionAction } from '@/actions/auth-actions'; 

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, passwordPlainText: string, role: UserRole) => Promise<boolean | { error: string }>; // Updated signature
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
      
      if (storedUserId) {
        try {
          const sessionUser = await fetchUserForSessionAction(storedUserId);
          if (sessionUser) {
            setUser(sessionUser);
          } else {
            localStorage.removeItem('academic-connect-userId');
            localStorage.removeItem('academic-connect-role'); // Role also cleared
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
    if (!isLoading && !user && pathname !== '/login' && pathname !== '/register' && pathname !== '/forgot-password' && !pathname.startsWith('/_next/')) {
       if (pathname !== '/') router.push('/login');
    }
    if (!isLoading && user && (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router]);


  const handleLogin = async (email: string, passwordPlainText: string, role: UserRole): Promise<boolean | { error: string }> => {
    setIsLoading(true);
    try {
      const loginResult = await loginUserAction(email, passwordPlainText, role);
      
      if (loginResult && 'id' in loginResult) { // Successful login, user object returned
        const loggedInUser = loginResult as User;
        setUser(loggedInUser);
        localStorage.setItem('academic-connect-userId', loggedInUser.id);
        localStorage.setItem('academic-connect-role', loggedInUser.role); 
        router.push('/dashboard');
        setIsLoading(false);
        return true;
      } else if (loginResult && 'error' in loginResult) { // Error object returned
        setUser(null); 
        setIsLoading(false);
        return { error: loginResult.error };
      } else { // Null returned (user not found, or other silent failure)
         setUser(null); 
        setIsLoading(false);
        return false; // Generic failure
      }
    } catch (error) { // Catch unexpected errors during the action call itself
      console.error("Login error in AuthContext:", error);
      setUser(null);
      setIsLoading(false);
      return { error: 'An unexpected server error occurred during login.' };
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
