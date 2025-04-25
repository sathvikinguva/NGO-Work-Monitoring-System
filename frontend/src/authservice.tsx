import { 
    auth 
  } from './config';
  import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    applyActionCode,
    User as FirebaseUser
  } from 'firebase/auth';
  
  // Sign up a new user
  export const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
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
    await sendPasswordResetEmail(auth, email);
  };
  
  // Verify email with confirmation code
  export const verifyEmail = async (code: string): Promise<void> => {
    await applyActionCode(auth, code);
  };