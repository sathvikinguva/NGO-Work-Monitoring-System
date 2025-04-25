import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType, UserRole } from './types';
import { 
  signUp as firebaseSignUp, 
  signIn, 
  logOut, 
  resetPassword as resetFirebasePassword
} from './auth';
import { auth } from './config';
import { createUser, getUserByEmail } from './firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, loading, error] = useAuthState(auth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [refreshingVerification, setRefreshingVerification] = useState(false);

  // Function to check email verification status
  const checkEmailVerification = useCallback(async () => {
    if (firebaseUser) {
      console.log("Checking email verification status...");
      setRefreshingVerification(true);
      try {
        // Force refresh token to get latest emailVerified status
        await firebaseUser.reload();
        
        // Get updated user data
        const updatedUser = auth.currentUser;
        
        if (updatedUser && updatedUser.emailVerified) {
          console.log("Email has been verified!");
          // Update the current user to reflect verified status
          const userData = await getUserByEmail(updatedUser.email!);
          if (userData) {
            setCurrentUser({
              ...userData,
              isEmailVerified: true
            });
          }
        }
      } catch (err) {
        console.error("Error refreshing verification status:", err);
      } finally {
        setRefreshingVerification(false);
      }
    }
  }, [firebaseUser]);

  // Check verification status when component mounts
  useEffect(() => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      checkEmailVerification();
    }
  }, [checkEmailVerification, firebaseUser]);

  // Check verification status when app regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && firebaseUser && !firebaseUser.emailVerified) {
        checkEmailVerification();
      }
    };

    // Setup periodic check for verification status
    const verificationCheckInterval = setInterval(() => {
      if (firebaseUser && !firebaseUser.emailVerified && document.visibilityState === 'visible') {
        checkEmailVerification();
      }
    }, 5000); // Check more frequently (every 5 seconds)

    // Add event listener for when app regains focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Add event listener for when app returns from background on mobile
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('resume', handleVisibilityChange); // For mobile apps if using hybrid framework

    return () => {
      clearInterval(verificationCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('resume', handleVisibilityChange);
    };
  }, [firebaseUser, checkEmailVerification]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (firebaseUser) {
        try {
          const userData = await getUserByEmail(firebaseUser.email!);
          if (userData) {
            setCurrentUser({
              ...userData,
              isEmailVerified: firebaseUser.emailVerified
            });
            setAuthError(null);
          } else {
            console.error("User exists in Auth but not in Firestore");
            setAuthError("User profile is incomplete. Please contact support.");
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setAuthError("Failed to load user profile");
        }
      } else {
        setCurrentUser(null);
      }
    };
    
    if (!loading) {
      fetchUserData();
    }
  }, [firebaseUser, loading]);

  // Handle Firebase Auth error
  useEffect(() => {
    if (error) {
      console.error("Firebase auth error:", error);
      setAuthError(error.message);
    }
  }, [error]);

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      const firebaseUser = await firebaseSignUp(email, password);
      await createUser({
        name,
        email,
        role,
      });
      return firebaseUser;
    } catch (err: any) {
      console.error("Signup error:", err);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      return await signIn(email, password);
    } catch (err: any) {
      console.error("Login error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logOut();
      setCurrentUser(null);
    } catch (err: any) {
      console.error("Logout error:", err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await resetFirebasePassword(email);
    } catch (err: any) {
      console.error("Password reset error:", err);
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    error: authError,
    signUp,
    login,
    logout,
    resetPassword,
    refreshingVerification,
    checkEmailVerification
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};