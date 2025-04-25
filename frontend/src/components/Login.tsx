import React, { useState } from 'react';
import { useAuth } from '../authcontext';

interface LoginProps {
  switchToSignUp: () => void;
}

export default function Login({ switchToSignUp }: LoginProps) {
  const { login, resetPassword } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-not-verified') {
        setError('Please verify your email before logging in. Check your inbox for a verification link.');
      } else {
        setError(err.message || 'Failed to log in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(formData.email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    if (resetSent) {
      return (
        <div className="text-center">
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
            <p className="font-semibold mb-2">Password Reset Email Sent!</p>
            <p>Please check your email inbox and follow the instructions to reset your password.</p>
          </div>
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setResetSent(false);
            }}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div>
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            required
            className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <button
          type="button"
          onClick={() => setShowForgotPassword(false)}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 mt-2"
        >
          Back to Login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div>
        <label className="block text-gray-700 mb-2">Email</label>
        <input
          type="email"
          required
          className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-gray-700 mb-2">Password</label>
        <input
          type="password"
          required
          className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>
      <button
        type="button"
        onClick={() => setShowForgotPassword(true)}
        className="text-blue-600 hover:underline text-sm"
      >
        Forgot Password?
      </button>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}