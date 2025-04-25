import React, { useState } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../authcontext';

interface SignUpProps {
  switchToLogin: () => void;
}

export default function SignUp({ switchToLogin }: SignUpProps) {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Donor' as UserRole,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );
      setSignupSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="text-center">
        <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
          <p className="font-semibold mb-2">Verification Email Sent!</p>
          <p>Please check your email inbox and click the verification link before logging in.</p>
          <p className="mt-2 text-sm">On mobile: The verification link will automatically redirect you back to this app and verify your account.</p>
        </div>
        <button
          onClick={switchToLogin}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Back to Login
        </button>
      </div>
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
        <label className="block text-gray-700 mb-2">Name</label>
        <input
          type="text"
          required
          className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
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
      <div>
        <label className="block text-gray-700 mb-2">Confirm Password</label>
        <input
          type="password"
          required
          className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
        />
      </div>
      <div>
        <label className="block text-gray-700 mb-2">Role</label>
        <select
          className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as UserRole })
          }
        >
          <option value="Donor">Donor</option>
          <option value="NGO">NGO</option>
          <option value="Government Authorizer">Government Authorizer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Signing Up...' : 'Sign Up'}
      </button>
    </form>
  );
}