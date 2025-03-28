'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Token } from '@/domain/models/auth/token';
import { AuthService } from '@/application/auth/auth-service';

interface AuthContextType {
  token: Token | null;
  isAuthenticated: boolean;
  login: (token: Token) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<Token | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const authService = new AuthService();

  // Initialize auth state from storage on component mount
  useEffect(() => {
    const storedToken = authService.getToken();
    
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    } else {
      // Redirect to login if not authenticated
      router.push('/');
    }
  }, [router]);

  // Login function
  const login = (newToken: Token) => {
    authService.storeToken(newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    router.push('/dashboard');
  };

  // Logout function
  const logout = () => {
    authService.clearToken();
    setToken(null);
    setIsAuthenticated(false);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
