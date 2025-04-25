import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    User as FirebaseUser,
    ActionCodeSettings
  } from 'firebase/auth';
  import { auth } from './config';
  
  // Configure action code settings for verification emails
  const actionCodeSettings: ActionCodeSettings = {
    // URL you want to redirect back to after verification
    url: window.location.origin,
    handleCodeInApp: true,
    // These options are for iOS and Android only
    android: {
      packageName: 'com.ngoworkmonitor.app',
      installApp: true,
      minimumVersion: '12'
    },
    iOS: {
      bundleId: 'com.ngoworkmonitor.app'
    }
  };
  
  // Sign up a new user
  export const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Send a verification link to email with redirect URL
    await sendEmailVerification(userCredential.user, actionCodeSettings);
    return userCredential.user;
  };
  
  // Sign in an existing user
  export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };
  
  // Sign out the current user
  export const logOut = async (): Promise<void> => {
    await signOut(auth);
  };
  
  // Send a password reset email
  export const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  };