import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Define the shape of the Auth Context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Start loading as true so we don't flash unauthenticated content
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial session explicitly
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching session:', error.message);
        }
        
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Unexpected auth error during initialization:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // 2. Set up listener for auth state changes (e.g., login, auto-refresh, logout across tabs)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth event intercepted:', event, currentSession?.user?.email);

        if (isMounted) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setSession(currentSession);
            setUser(currentSession?.user || null);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
          }
        }
      }
    );

    // 3. Cleanup listener on unmount
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign Out Error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily consume the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
