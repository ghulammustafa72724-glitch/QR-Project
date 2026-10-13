import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Restaurant } from '../types';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  restaurantName: string;
}

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateRestaurant: (data: Partial<Restaurant>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'qr_restaurant_auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify session on load / token change
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setUser(null);
        setRestaurant(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setRestaurant(data.restaurant || null);
          setToken(storedToken);
        } else {
          // Token is expired or invalid
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setRestaurant(null);
        }
      } catch (err) {
        console.error('Session verification error:', err);
        // Do not immediately wipe on network hiccup, but mark not logged in
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed. Please check your credentials.' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setRestaurant(data.restaurant || null);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const register = async (formData: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setRestaurant(data.restaurant || null);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setRestaurant(null);
  };

  const updateRestaurant = async (updatedFields: Partial<Restaurant>) => {
    if (!token) return { success: false, error: 'Authentication required' };

    try {
      const res = await fetch('/api/restaurant', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update restaurant profile.' };
      }

      setRestaurant(data.restaurant);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Connection error while saving profile.' };
    }
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRestaurant(data.restaurant || null);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateRestaurant,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
