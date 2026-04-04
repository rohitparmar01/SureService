import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { getApiUrl } from '../config/api';

const parseApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody || '{}');
    } catch {
      throw new Error('Invalid JSON response from server.');
    }
  }

  const looksLikeHtml = /^\s*<!doctype html|^\s*<html/i.test(rawBody);
  if (looksLikeHtml) {
    throw new Error('API endpoint returned HTML instead of JSON. Verify VITE_API_URL and backend API routing.');
  }

  return { message: rawBody || 'Unexpected server response.' };
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitted(false);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(getApiUrl('auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await parseApiResponse(response);

      if (response.ok && data.success) {
        setSubmitted(true);
        setMessage(data.message || 'If an account with that email exists, a reset link has been sent.');
      } else {
        setError(data.message || 'Unable to process forgot password request right now. Please try again.');
      }
    } catch (requestError) {
      console.error('Forgot password error:', requestError);
      setError(requestError.message || 'Unable to process forgot password request right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <Link
          to="/"
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-600">
              Enter your registered email address and we will email you a secure reset link.
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">Works for Users and Vendors</p>
                <p className="text-sm text-indigo-800">
                  Use the same email you use for login. For security, we always show a generic response.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                    setSubmitted(false);
                    setMessage('');
                  }}
                  disabled={submitting}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    error ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors`}
                  placeholder="your@email.com"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Reset Link...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {submitted && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-800">{message}</p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/" className="text-purple-600 hover:text-purple-700 font-medium">
                Back to Login
              </Link>
            </p>
          </div>

        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@sureservice.com" className="text-purple-600 hover:text-purple-700">
              support@sureservice.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
