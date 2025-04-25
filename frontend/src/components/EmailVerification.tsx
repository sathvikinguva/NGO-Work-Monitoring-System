import React from 'react';
import { useAuth } from '../authcontext';

interface EmailVerificationProps {
  switchToLogin: () => void;
}

export default function EmailVerification({ switchToLogin }: EmailVerificationProps) {
  const { checkEmailVerification, refreshingVerification } = useAuth();

  const handleManualVerificationCheck = () => {
    checkEmailVerification();
  };

  return (
    <div className="text-center">
      <div className="bg-yellow-100 text-yellow-700 p-4 rounded-lg mb-4">
        <p className="font-semibold mb-2">Email Verification Required</p>
        <p>Please check your email inbox and click the verification link we sent you.</p>
        <p className="mt-2 text-sm">After clicking the link, the app will automatically update when verification is complete.</p>
      </div>
      
      <div className="mt-4 space-y-3">
        <button
          onClick={handleManualVerificationCheck}
          disabled={refreshingVerification}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 flex justify-center items-center"
        >
          {refreshingVerification ? (
            <>
              <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
              Checking...
            </>
          ) : (
            "I've Verified My Email"
          )}
        </button>
        
        <button
          onClick={switchToLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}