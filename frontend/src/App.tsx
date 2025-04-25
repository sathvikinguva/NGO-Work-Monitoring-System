import React, { useState, useEffect } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import SignUp from './components/SignUp';
import Login from './components/Login';
import NGODashboard from './components/NGODashboard';
import DonorDashboard from './components/DonorDashboard';
import GovtDashboard from './components/GovtDashboard';
import { useAuth } from './authcontext';
import { auth } from './config';
import { applyActionCode, isSignInWithEmailLink } from 'firebase/auth';

function App() {
  const { currentUser, loading, error, logout, refreshingVerification, checkEmailVerification } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Handle email verification link
  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Check if the URL contains email verification info
        const url = window.location.href;
        
        // Handle email verification links
        if (url.includes('mode=verifyEmail') && url.includes('oobCode=')) {
          setVerifyingEmail(true);
          
          // Extract the action code from the URL
          const actionCode = new URL(url).searchParams.get('oobCode');
          
          if (actionCode) {
            // Apply the verification code
            await applyActionCode(auth, actionCode);
            
            // Force verification check immediately
            await checkEmailVerification();
            
            // Show success message
            setVerificationResult({
              success: true,
              message: 'Email verified successfully! Redirecting to your dashboard...'
            });
            
            // Clean up the URL by removing the verification parameters
            window.history.replaceState(null, '', window.location.origin);
            
            // Set a short delay to allow UI to update before redirecting
            setTimeout(() => {
              setVerifyingEmail(false);
              setVerificationResult(null);
            }, 2000);
          }
        }
      } catch (error: any) {
        console.error('Error during email verification:', error);
        setVerificationResult({
          success: false,
          message: error.message || 'Failed to verify email. Please try again.'
        });
        
        // Clean URL
        window.history.replaceState(null, '', window.location.origin);
        
        // Show error for a moment then return to login
        setTimeout(() => {
          setVerifyingEmail(false);
          setAuthView('login');
          setVerificationResult(null);
        }, 3000);
      }
    };

    handleEmailVerification();
  }, [checkEmailVerification]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    
    switch (currentUser.role) {
      case 'NGO':
        return <NGODashboard userEmail={currentUser.email} />;
      case 'Donor':
        return <DonorDashboard />;
      case 'Government Authorizer':
        return <GovtDashboard />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-red-600">Invalid user role</p>
          </div>
        );
    }
  };

  // Show verification status screen
  if (verifyingEmail) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            {verificationResult
              ? verificationResult.success
                ? "Email Verified!"
                : "Verification Failed"
              : "Verifying Email..."}
          </h1>
          {verificationResult ? (
            <div className={`p-4 rounded-lg mb-4 ${
              verificationResult.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              <p>{verificationResult.message}</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show refreshing verification indicator as an overlay when actively refreshing
  const RefreshingOverlay = () => (
    refreshingVerification ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-800">Checking verification status...</p>
        </div>
      </div>
    ) : null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-red-600">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleLogout}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (currentUser && !currentUser.isEmailVerified) {
    return (
      <>
        <RefreshingOverlay />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h1 className="text-2xl font-bold text-center mb-6">Email Not Verified</h1>
            <p className="text-gray-600 mb-4">
              Please verify your email before continuing. Check your inbox for a verification link.
            </p>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => checkEmailVerification()}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                I've Verified My Email
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (currentUser && currentUser.isEmailVerified) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">NGO Work Monitoring System</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {currentUser.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-6">{renderDashboard()}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {authView === 'login' && (
          <>
            <div className="flex items-center gap-2 justify-center mb-6">
              <LogIn className="text-blue-600" size={24} />
              <h1 className="text-2xl font-bold text-center">Login</h1>
            </div>
            <Login switchToSignUp={() => setAuthView('signup')} />
            <p className="mt-4 text-center text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => setAuthView('signup')}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          </>
        )}
        {authView === 'signup' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
            <SignUp switchToLogin={() => setAuthView('login')} />
            <p className="mt-4 text-center text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => setAuthView('login')}
                className="text-blue-600 hover:underline"
              >
                Login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;