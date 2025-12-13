
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/dataService';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  loginGoogle: () => Promise<void>;
  loginFacebook: () => Promise<void>;
  loginEmail: (email: string, password?: string) => Promise<void>;
  registerEmail: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserTier: (tier: UserProfile['tier']) => void;
  updateProfileImage: (file: Blob) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth changes from the service (Firebase/Mock)
  useEffect(() => {
    const unsubscribe = api.auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      await api.auth.loginWithGoogle();
    } catch (e) {
      console.error("Google login failed", e);
      throw e;
    }
  };

  const loginFacebook = async () => {
    try {
      await api.auth.loginWithFacebook();
    } catch (e) {
      console.error("Facebook login failed", e);
      throw e;
    }
  };

  const loginEmail = async (email: string, password?: string) => {
      await api.auth.loginWithEmail(email, password);
  };

  const registerEmail = async (email: string, password: string, name: string) => {
      await api.auth.registerWithEmail(email, password, name);
  };

  // Maps to Anonymous Auth in Firebase, or Mock Guest in Preview
  const loginAsGuest = async () => {
      await api.auth.loginAnonymously();
  };

  const logout = async () => {
    await api.auth.logout();
  };

  const updateUserTier = (tier: UserProfile['tier']) => {
      if (user) {
          setUser({ ...user, tier });
          // In a real app, you would sync this back to Firestore 'users' collection here
      }
  };

  const updateProfileImage = async (file: Blob) => {
      if (user) {
          const url = await api.auth.updateProfileImage(file);
          setUser({ ...user, photoURL: url });
      }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginGoogle, loginFacebook, loginEmail, registerEmail, loginAsGuest, logout, updateUserTier, updateProfileImage }}>
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
