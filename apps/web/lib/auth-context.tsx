'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  email: string;
  storeName?: string;
  loggedIn: boolean;
  id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Leer cookie de usuario
    const cookieStr = document.cookie
      .split(';')
      .find((cookie) => cookie.trim().startsWith('user='));

    if (cookieStr) {
      try {
        const userStr = cookieStr.split('=')[1];
        const userData = JSON.parse(decodeURIComponent(userStr));
        setUser(userData);
      } catch (err) {
        console.error('Error parsing user cookie:', err);
      }
    }

    setLoading(false);
  }, []);

  const logout = () => {
    document.cookie = 'user=; path=/; max-age=0';
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
