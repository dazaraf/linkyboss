'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  statusOnline: '#22c55e',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function extractPillars(profileData) {
  if (!profileData || !profileData.pillars) return [];
  const raw = profileData.pillars;
  // Split by commas, "and", newlines, or semicolons
  return raw
    .split(/[,;\n]+/)
    .map((p) => p.replace(/^\s*(and|&)\s*/i, '').trim())
    .filter((p) => p.length > 0)
    .slice(0, 5);
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchProfiles = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/voice-profiles');
      if (!res.ok) {
        throw new Error('Failed to load profiles');
      }
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      setError('Failed to load voice profiles. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin?callbackUrl=/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfiles();
    }
  }, [status, fetchProfiles]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this voice profile?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/voice-profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Failed to delete profile. Please try again.');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const [viewingId, setViewingId] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const openProfile = async (id) => {
    try {
      setViewingId(id);
      setViewLoading(true);
      const res = await fetch(`/api/voice-profiles/${id}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setViewProfile(data.profile);
    } catch (err) {
      setError('Failed to load profile details.');
      console.error(err);
      setViewingId(null);
    } finally {
      setViewLoading(false);
    }
  };

  const closeProfile = () => {
    setViewingId(null);
    setViewProfile(null);
  };

  const handleCopyProfile = async () => {
    if (!viewProfile?.generatedProfile) return;
    try {
      await navigator.clipboard.writeText(viewProfile.generatedProfile);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <p style={{ color: colors.textSecondary, fontSize: '16px' }}>Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  // Viewing a single profile - loading state
  if (viewingId && viewLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <div className="blue-glow-bg" />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${colors.border}`,
            borderTop: `3px solid ${colors.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: colors.textSecondary, fontSize: '15px', margin: 0 }}>
            Loading profile...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Viewing a single profile detail modal
  if (viewingId && viewProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
      }}>
        <div className="blue-glow-bg" />

        {/* Header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: colors.bgCard, border: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: colors.accent, fontSize: '16px', fontWeight: 600,
              }}>in</div>
              <div style={{ color: colors.textPrimary, fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyProfile}
              aria-label="Copy voice profile to clipboard"
              style={{
                background: copySuccess ? `${colors.statusOnline}20` : colors.accent,
                border: copySuccess ? `1px solid ${colors.statusOnline}40` : 'none',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: copySuccess ? colors.statusOnline : colors.textPrimary,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copySuccess ? 'Copied!' : 'Copy Profile'}
            </button>
            <button
              onClick={closeProfile}
              aria-label="Back to dashboard"
              style={{
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Profile content */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px 32px',
          position: 'relative',
          zIndex: 1,
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: colors.textPrimary,
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
          }}>
            {viewProfile.name}
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px 0' }}>
            Created {formatDate(viewProfile.createdAt)}
          </p>

          <div style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
          }}>
            <pre style={{
              color: colors.textSecondary,
              fontSize: '13px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            }}>{viewProfile.generatedProfile}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgMain,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
    }}>
      <div className="blue-glow-bg" />

      {/* Header */}
      <div style={{
        padding: '20px 32px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: colors.bgCard, border: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.accent, fontSize: '16px', fontWeight: 600,
            }}>in</div>
            <div style={{ color: colors.textPrimary, fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
            <span style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: colors.textPrimary,
              background: colors.bgInput,
            }}>Dashboard</span>
            <Link href="/studio" style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: colors.textMuted,
              textDecoration: 'none',
            }}>Content Studio</Link>
            <Link href="/" style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: colors.textMuted,
              textDecoration: 'none',
            }}>Interview</Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {session?.user?.name || session?.user?.email || ''}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: colors.textSecondary,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = colors.borderHover;
              e.target.style.color = colors.textPrimary;
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.color = colors.textSecondary;
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '40px 32px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 4px 0',
              letterSpacing: '-0.5px',
            }}>
              Voice Profile Vault
            </h1>
            <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
              Your saved voice profiles from interviews
            </p>
          </div>
          <Link href="/" style={{
            background: colors.accent,
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: colors.textPrimary,
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'background 0.2s ease',
          }}>
            New Interview
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: colors.errorBg,
            border: `1px solid ${colors.error}30`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ color: colors.error, fontSize: '14px' }}>{error}</span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
              style={{
                background: 'none', border: 'none', color: colors.error,
                cursor: 'pointer', marginLeft: 'auto', fontSize: '16px',
              }}
            >
              x
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '16px' }}>Loading your profiles...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && profiles.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: `${colors.accent}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px auto',
              fontSize: '28px', color: colors.accent,
            }}>
              in
            </div>
            <h2 style={{
              fontSize: '22px', fontWeight: 600,
              color: colors.textPrimary, margin: '0 0 8px 0',
            }}>
              No voice profiles yet
            </h2>
            <p style={{
              color: colors.textSecondary, fontSize: '15px',
              margin: '0 0 28px 0', maxWidth: '400px',
              marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5,
            }}>
              Complete the Linkyboss interview to create your first voice profile. It takes about 4 minutes.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              background: colors.accent,
              padding: '14px 32px',
              fontSize: '15px',
              fontWeight: 500,
              color: colors.textPrimary,
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'background 0.2s ease',
            }}>
              Start Interview
            </Link>
          </div>
        )}

        {/* Profile grid */}
        {!loading && profiles.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: '20px',
          }}>
            {profiles.map((profile) => {
              const pillars = extractPillars(profile.profileData);
              return (
                <div
                  key={profile.id}
                  style={{
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '12px',
                    padding: '24px',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = colors.borderHover;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '17px', fontWeight: 600,
                        color: colors.textPrimary, margin: '0 0 4px 0',
                      }}>
                        {profile.name}
                      </h3>
                      <p style={{
                        color: colors.textMuted, fontSize: '13px', margin: 0,
                      }}>
                        {formatDate(profile.createdAt)}
                      </p>
                    </div>
                    {profile.isActive && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: colors.statusOnline,
                        background: `${colors.statusOnline}15`,
                        padding: '3px 10px',
                        borderRadius: '12px',
                      }}>
                        Active
                      </span>
                    )}
                  </div>

                  {/* Content pillars as pill badges */}
                  {pillars.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '16px',
                    }}>
                      {pillars.map((pillar, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: colors.accent,
                            background: `${colors.accent}15`,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {pillar}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    borderTop: `1px solid ${colors.border}`,
                    paddingTop: '16px',
                  }}>
                    <button
                      onClick={() => openProfile(profile.id)}
                      aria-label={`View profile: ${profile.name}`}
                      style={{
                        flex: 1,
                        background: colors.accent,
                        border: 'none',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.textPrimary,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseOver={(e) => { e.target.style.background = colors.accentHover; }}
                      onMouseOut={(e) => { e.target.style.background = colors.accent; }}
                    >
                      View
                    </button>
                    <Link
                      href={`/studio?profileId=${profile.id}`}
                      aria-label={`Open Studio with profile: ${profile.name}`}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: `1px solid ${colors.accent}`,
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.accent,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Open Studio
                    </Link>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      aria-label={`Delete profile: ${profile.name}`}
                      disabled={deletingId === profile.id}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: deletingId === profile.id ? colors.textMuted : colors.textSecondary,
                        borderRadius: '6px',
                        cursor: deletingId === profile.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        if (deletingId !== profile.id) {
                          e.target.style.borderColor = colors.error;
                          e.target.style.color = colors.error;
                        }
                      }}
                      onMouseOut={(e) => {
                        if (deletingId !== profile.id) {
                          e.target.style.borderColor = colors.border;
                          e.target.style.color = colors.textSecondary;
                        }
                      }}
                    >
                      {deletingId === profile.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
