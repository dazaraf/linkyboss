'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const WalletSection = dynamic(() => import("../signin/wallet-section"), { ssr: false });

const colors = {
  bgMain: '#1a1a2e',
  bgCard: '#16213e',
  bgInput: '#1f2b47',
  border: '#2d3a5c',
  borderHover: '#3d4f7c',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#0a66c2',
  accentHover: '#0077b5',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.1)',
  google: '#ffffff',
  googleText: '#1f2937',
  googleBorder: '#d1d5db',
  walletBg: '#1f2b47',
  walletBorder: '#2d3a5c',
};

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleGoogleSignUp = () => {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed, redirect to sign in
        router.push('/signin');
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgMain,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative'
    }}>
      {/* Blue gradient glow */}
      <div className="blue-glow-bg" />

      {/* Header */}
      <div style={{
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.accent,
            fontSize: '16px',
            fontWeight: 600
          }}>in</div>
          <div style={{ color: colors.textPrimary, fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
        </Link>
      </div>

      {/* Centered content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Card */}
        <div style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '440px',
          width: '100%'
        }}>
          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              fontSize: '36px',
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px'
            }}>
              L<span style={{ color: colors.textPrimary }}>inky</span><span style={{ color: colors.accent }}>b</span>oss
            </div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 500,
              color: colors.textSecondary,
              margin: 0,
              letterSpacing: '-0.2px'
            }}>
              Create your account
            </h1>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: colors.errorBg,
              border: `1px solid ${colors.error}30`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke={colors.error} strokeWidth="1.5" />
                <path d="M8 4.5v4" stroke={colors.error} strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill={colors.error} />
              </svg>
              <span style={{ color: colors.error, fontSize: '14px' }}>{error}</span>
            </div>
          )}

          {/* Registration form */}
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: '6px'
              }}>
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="John Doe"
                autoComplete="name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = colors.borderHover; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border; }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: '6px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@company.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = colors.borderHover; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: '6px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = colors.borderHover; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border; }}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: '6px'
              }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = colors.borderHover; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border; }}
              />
            </div>

            {/* Sign Up button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? colors.bgInput : colors.accent,
                border: 'none',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 500,
                color: isLoading ? colors.textMuted : colors.textPrimary,
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.target.style.background = colors.accentHover;
              }}
              onMouseOut={(e) => {
                if (!isLoading) e.target.style.background = colors.accent;
              }}
            >
              {isLoading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="30" strokeLinecap="round" />
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: colors.border }} />
            <span style={{ color: colors.textMuted, fontSize: '13px' }}>or sign up with</span>
            <div style={{ flex: 1, height: '1px', background: colors.border }} />
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Google */}
            <button onClick={handleGoogleSignUp} disabled={isGoogleLoading} style={{
              width: '100%', background: colors.google,
              border: `1px solid ${colors.googleBorder}`,
              padding: '12px 16px', fontSize: '15px', fontWeight: 500,
              color: colors.googleText, borderRadius: '8px',
              cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              opacity: isGoogleLoading ? 0.7 : 1
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {isGoogleLoading ? 'Connecting...' : 'Sign up with Google'}
            </button>

            {/* Wallet */}
            <WalletSection callbackUrl={callbackUrl} onError={setError} colors={colors} />
          </div>

          {/* Sign in link */}
          <div style={{
            textAlign: 'center',
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: `1px solid ${colors.border}`
          }}>
            <span style={{ color: colors.textMuted, fontSize: '14px' }}>
              Already have an account?{' '}
              <Link href={callbackUrl !== "/" ? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signin"} style={{
                color: colors.accent,
                textDecoration: 'none',
                fontWeight: 500
              }}>
                Sign in
              </Link>
            </span>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          color: colors.textMuted,
          fontSize: '12px',
          marginTop: '24px',
          textAlign: 'center'
        }}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Inline keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
