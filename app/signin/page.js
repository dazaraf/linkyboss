'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically load the wallet button (needs wagmi/RainbowKit which can't SSR)
const WalletSection = dynamic(() => import("./wallet-section"), { ssr: false });

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
  google: '#ffffff',
  googleText: '#1f2937',
  googleBorder: '#d1d5db',
  walletBg: '#1f2b47',
  walletBorder: '#2d3a5c',
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState(() => {
    const urlError = searchParams.get("error");
    if (!urlError) return '';
    const errorMessages = {
      OAuthAccountNotLinked: 'This email is already associated with a different sign-in method.',
      CredentialsSignin: 'Invalid email or password. Please try again.',
      Default: 'An unexpected error occurred. Please try again.',
    };
    return errorMessages[urlError] || errorMessages.Default;
  });

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    signIn("google", { callbackUrl });
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
      <div className="blue-glow-bg" />

      {/* Header */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: colors.bgCard, border: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.accent, fontSize: '16px', fontWeight: 600
          }}>in</div>
          <div style={{ color: colors.textPrimary, fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
        </Link>
      </div>

      {/* Centered card */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', zIndex: 1
      }}>
        <div style={{
          background: colors.bgCard, border: `1px solid ${colors.border}`,
          borderRadius: '16px', padding: '40px', maxWidth: '440px', width: '100%'
        }}>
          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '36px', fontWeight: 600, color: colors.textPrimary, marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Linky<span style={{ color: colors.accent }}>b</span>oss
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: colors.textSecondary, margin: 0 }}>
              Sign in to your account
            </h1>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: colors.errorBg, border: `1px solid ${colors.error}30`,
              borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke={colors.error} strokeWidth="1.5" />
                <path d="M8 4.5v4" stroke={colors.error} strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill={colors.error} />
              </svg>
              <span style={{ color: colors.error, fontSize: '14px' }}>{error}</span>
            </div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.textSecondary, marginBottom: '6px' }}>Email</label>
              <input
                type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@company.com" autoComplete="email"
                style={{
                  width: '100%', padding: '12px 16px', fontSize: '15px',
                  background: colors.bgInput, border: `1px solid ${colors.border}`,
                  borderRadius: '8px', color: colors.textPrimary, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.textSecondary, marginBottom: '6px' }}>Password</label>
              <input
                type="password" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password" autoComplete="current-password"
                style={{
                  width: '100%', padding: '12px 16px', fontSize: '15px',
                  background: colors.bgInput, border: `1px solid ${colors.border}`,
                  borderRadius: '8px', color: colors.textPrimary, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <Link href="#" style={{ color: colors.textMuted, fontSize: '13px', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <button type="submit" disabled={isLoading} style={{
              width: '100%', background: isLoading ? colors.bgInput : colors.accent,
              border: 'none', padding: '14px', fontSize: '15px', fontWeight: 500,
              color: isLoading ? colors.textMuted : colors.textPrimary,
              borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease'
            }}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: colors.border }} />
            <span style={{ color: colors.textMuted, fontSize: '13px' }}>or continue with</span>
            <div style={{ flex: 1, height: '1px', background: colors.border }} />
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Google */}
            <button onClick={handleGoogleSignIn} disabled={isGoogleLoading} style={{
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
              {isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}
            </button>

            {/* Wallet - dynamically loaded, no SSR */}
            <WalletSection callbackUrl={callbackUrl} onError={setError} colors={colors} />
          </div>

          {/* Sign up link */}
          <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` }}>
            <span style={{ color: colors.textMuted, fontSize: '14px' }}>
              Don&apos;t have an account?{' '}
              <Link href={callbackUrl !== "/" ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"} style={{ color: colors.accent, textDecoration: 'none', fontWeight: 500 }}>
                Sign up
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
