'use client';

import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const colors = {
  bgMain: '#FFFFFF',
  bgCard: '#F9F9F9',
  bgInput: '#FFFFFF',
  border: '#E8E8E8',
  borderHover: '#E8E8E8',
  textPrimary: '#1C1C1C',
  textSecondary: '#555555',
  textMuted: '#888888',
  accent: '#FF6B35',
  accentHover: '#E8571F',
  accentLight: '#FFF3EE',
  statusOnline: '#22c55e',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  yellow: '#eab308',
  yellowBg: 'rgba(234, 179, 8, 0.1)',
  greenBg: 'rgba(34, 197, 94, 0.1)',
  redBg: 'rgba(239, 68, 68, 0.1)',
};

const POST_TYPES = [
  { id: 'story', label: 'Story', desc: 'Personal narrative' },
  { id: 'insight', label: 'Insight', desc: 'Sharp observation' },
  { id: 'contrarian', label: 'Contrarian', desc: 'Challenge norms' },
  { id: 'listicle', label: 'Listicle', desc: 'Numbered list' },
  { id: 'question', label: 'Question', desc: 'Spark discussion' },
  { id: 'case_study', label: 'Case Study', desc: 'Before/after' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getScoreColor(score) {
  if (score >= 90) return colors.statusOnline;
  if (score >= 70) return colors.yellow;
  return colors.error;
}

function getScoreLabel(score) {
  if (score >= 90) return 'Sounds Like You';
  if (score >= 70) return 'Needs tweaks';
  return 'Too AI-ish';
}

function getScoreBg(score) {
  if (score >= 90) return colors.greenBg;
  if (score >= 70) return colors.yellowBg;
  return colors.redBg;
}

export default function StudioPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <p style={{ color: '#555555', fontSize: '16px' }}>Loading...</p>
      </div>
    }>
      <StudioPage />
    </Suspense>
  );
}

function StudioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Left panel state
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedPostType, setSelectedPostType] = useState('');
  const [topic, setTopic] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Right panel state
  const [generatedContent, setGeneratedContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [authenticityScore, setAuthenticityScore] = useState(null);
  const [authenticityFlags, setAuthenticityFlags] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const contentRef = useRef(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin?callbackUrl=/studio');
    }
  }, [status, router]);

  // Fetch voice profiles
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchProfiles = async () => {
      try {
        setLoadingProfiles(true);
        const res = await fetch('/api/voice-profiles');
        if (!res.ok) throw new Error('Failed to load profiles');
        const data = await res.json();
        setProfiles(data.profiles || []);

        // Auto-select from URL param
        const profileIdParam = searchParams.get('profileId');
        if (profileIdParam && data.profiles?.find(p => p.id === profileIdParam)) {
          setSelectedProfileId(profileIdParam);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [status, searchParams]);

  // Update selectedProfile when ID changes
  useEffect(() => {
    if (selectedProfileId) {
      const found = profiles.find(p => p.id === selectedProfileId);
      setSelectedProfile(found || null);
    } else {
      setSelectedProfile(null);
    }
  }, [selectedProfileId, profiles]);

  const canGenerate = selectedProfileId && selectedPostType && topic.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return;

    setIsGenerating(true);
    setGeneratedContent('');
    setEditableContent('');
    setHasGenerated(false);
    setHasEdited(false);
    setAuthenticityScore(null);
    setAuthenticityFlags([]);
    setDraftId(null);
    setStreamError('');
    setCopySuccess(false);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceProfileId: selectedProfileId,
          postType: selectedPostType,
          topic: topic.trim(),
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStreamError(err.error || 'Generation failed. Please try again.');
        setIsGenerating(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'delta') {
              accumulated += event.text;
              setGeneratedContent(accumulated);
              setEditableContent(accumulated);
            } else if (event.type === 'score') {
              setAuthenticityScore(event.score);
              setAuthenticityFlags(event.flags || []);
              setDraftId(event.draftId);
            } else if (event.type === 'error') {
              setStreamError(event.message || 'Generation failed.');
            } else if (event.type === 'done') {
              // Generation complete
            }
          } catch (parseErr) {
            // Skip malformed events
          }
        }
      }

      setHasGenerated(true);
    } catch (err) {
      console.error('Generate error:', err);
      setStreamError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, isGenerating, selectedProfileId, selectedPostType, topic, additionalContext]);

  const handleContentEdit = (e) => {
    const newContent = e.target.value;
    setEditableContent(newContent);
    if (newContent !== generatedContent) {
      setHasEdited(true);
    } else {
      setHasEdited(false);
    }
  };

  const handleCopy = async () => {
    if (!hasEdited || !editableContent) return;
    try {
      await navigator.clipboard.writeText(editableContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftId) return;
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedContent: hasEdited ? editableContent : undefined,
          status: hasEdited ? 'edited' : 'draft',
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Save failed:', err);
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

  if (status === 'unauthenticated') return null;

  const profileName = selectedProfile?.profileData?.name || selectedProfile?.name || '';
  const profileRole = selectedProfile?.profileData?.role || '';
  const charCount = editableContent.length;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgMain,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: '#FFFFFF',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#1C1C1C', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>
              linkyboss
            </span>
            <span style={{ color: colors.accent, fontSize: '10px', lineHeight: 1 }}>&#9679;</span>
          </Link>

          <nav style={{ display: 'flex', gap: '6px' }}>
            <Link href="/dashboard" style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '14px',
              fontWeight: 500, color: colors.textMuted, textDecoration: 'none',
            }}>Dashboard</Link>
            <span style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '14px',
              fontWeight: 500, color: colors.textPrimary, background: colors.bgCard,
              border: `1px solid ${colors.border}`,
            }}>Content Studio</span>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {session?.user?.name || session?.user?.email || ''}
          </span>
        </div>
      </div>

      {/* Page heading */}
      <div style={{
        padding: '28px 32px 0 32px',
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: '0 0 4px 0',
          fontSize: '22px',
          fontWeight: 700,
          color: colors.textPrimary,
          letterSpacing: '-0.3px',
        }}>
          Content Studio
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: colors.textSecondary,
        }}>
          Generate posts that sound like you.
        </p>
      </div>

      {/* Main content: two-panel layout */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        marginTop: '20px',
      }}>
        {/* LEFT PANEL - Controls */}
        <div style={{
          width: '380px',
          flexShrink: 0,
          borderRight: `1px solid ${colors.border}`,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: '#FFFFFF',
        }}>
          {/* Voice Profile Selector */}
          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: colors.textSecondary, marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Voice Profile
            </label>
            {loadingProfiles ? (
              <div style={{
                padding: '12px 16px', background: colors.bgCard,
                borderRadius: '8px', border: `1px solid ${colors.border}`,
                color: colors.textMuted, fontSize: '14px',
              }}>Loading profiles...</div>
            ) : profiles.length === 0 ? (
              <div style={{
                padding: '16px', background: colors.bgCard,
                borderRadius: '8px', border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 8px 0' }}>
                  No voice profiles yet
                </p>
                <Link href="/" style={{
                  color: colors.accent, fontSize: '13px', fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  Create one first
                </Link>
              </div>
            ) : (
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: '14px',
                  background: colors.bgInput, border: `1px solid ${colors.border}`,
                  borderRadius: '8px', color: colors.textPrimary,
                  outline: 'none', cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="" style={{ background: '#FFFFFF' }}>Select a profile...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#FFFFFF' }}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Post Type Pills */}
          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: colors.textSecondary, marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Post Type
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {POST_TYPES.map(pt => {
                const isSelected = selectedPostType === pt.id;
                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedPostType(pt.id)}
                    style={{
                      padding: '8px 16px',
                      background: isSelected ? colors.accent : '#FFFFFF',
                      border: isSelected ? 'none' : `1px solid ${colors.border}`,
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      transition: 'all 0.15s ease',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    }}
                  >
                    {pt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: colors.textSecondary, marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Topic *
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setFocusedField('topic')}
              onBlur={() => setFocusedField(null)}
              placeholder="What do you want to post about?"
              rows={3}
              style={{
                width: '100%', padding: '12px 16px', fontSize: '14px',
                background: colors.bgInput,
                border: `1px solid ${focusedField === 'topic' ? colors.accent : colors.border}`,
                borderRadius: '8px', color: colors.textPrimary,
                outline: 'none', resize: 'vertical', lineHeight: 1.5,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          {/* Additional Context */}
          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: colors.textSecondary, marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Additional Context
              <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '6px', color: colors.textMuted }}>optional</span>
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              onFocus={() => setFocusedField('context')}
              onBlur={() => setFocusedField(null)}
              placeholder="Specific angle, audience, or details..."
              rows={2}
              style={{
                width: '100%', padding: '12px 16px', fontSize: '14px',
                background: colors.bgInput,
                border: `1px solid ${focusedField === 'context' ? colors.accent : colors.border}`,
                borderRadius: '8px', color: colors.textPrimary,
                outline: 'none', resize: 'vertical', lineHeight: 1.5,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          {/* Write It / Regenerate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: canGenerate && !isGenerating ? 'pointer' : 'not-allowed',
              background: canGenerate && !isGenerating ? colors.accent : colors.bgCard,
              color: canGenerate && !isGenerating ? '#FFFFFF' : colors.textMuted,
              transition: 'all 0.2s ease',
              animation: isGenerating ? 'pulse 2s ease-in-out infinite' : 'none',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            {isGenerating ? 'Generating...' : hasGenerated ? 'Regenerate' : 'Write It'}
          </button>

          {streamError && (
            <div style={{
              padding: '12px', background: colors.errorBg,
              border: `1px solid ${colors.error}30`,
              borderRadius: '8px', fontSize: '13px', color: colors.error,
            }}>
              {streamError}
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Preview & Actions */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Empty state */}
          {!hasGenerated && !isGenerating && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                border: `2px dashed ${colors.border}`,
                borderRadius: '16px',
                padding: '60px 40px',
                textAlign: 'center',
                maxWidth: '480px',
                width: '100%',
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: colors.accentLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  color: colors.accent, fontSize: '24px', fontWeight: 700,
                }}>&#9998;</div>
                <h3 style={{
                  fontSize: '18px', fontWeight: 600,
                  color: colors.textPrimary, margin: '0 0 8px 0',
                }}>
                  Content Studio
                </h3>
                <p style={{
                  color: colors.textMuted, fontSize: '14px',
                  margin: 0, lineHeight: 1.5,
                }}>
                  Select a voice profile and post type, write your topic, then hit Write It.
                </p>
              </div>
            </div>
          )}

          {/* Output Card */}
          {(isGenerating || hasGenerated) && (
            <>
              <div style={{
                background: '#FFFFFF',
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                {/* Post header - avatar, name, role */}
                <div style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: `1px solid ${colors.border}`,
                  background: colors.bgCard,
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: colors.accentLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: colors.accent, fontSize: '16px', fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {getInitials(profileName)}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px', fontWeight: 600, color: colors.textPrimary,
                    }}>
                      {profileName || 'Your Name'}
                    </div>
                    <div style={{
                      fontSize: '12px', color: colors.textMuted,
                    }}>
                      {profileRole || 'Your Role'}
                    </div>
                  </div>
                </div>

                {/* Post body - editable textarea */}
                <div style={{ padding: '16px 20px' }}>
                  <textarea
                    ref={contentRef}
                    value={editableContent}
                    onChange={handleContentEdit}
                    placeholder={isGenerating ? '' : 'Your post will appear here...'}
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '0',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      background: 'transparent',
                      border: 'none',
                      color: colors.textPrimary,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Fake LinkedIn engagement bar */}
                <div style={{
                  padding: '12px 20px',
                  borderTop: `1px solid ${colors.border}`,
                  background: colors.bgCard,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {['Like', 'Comment', 'Repost', 'Send'].map(action => (
                      <span key={action} style={{
                        fontSize: '12px', color: colors.textMuted, fontWeight: 500,
                        cursor: 'default',
                      }}>
                        {action}
                      </span>
                    ))}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: charCount > 3000 ? colors.error : colors.textMuted,
                    fontWeight: 500,
                  }}>
                    {charCount} / 3000
                  </span>
                </div>
              </div>

              {/* Authenticity Score */}
              {authenticityScore !== null && (
                <div style={{
                  background: '#FFFFFF',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '20px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                  }}>
                    {/* Circular gauge */}
                    <div style={{
                      width: '72px', height: '72px',
                      borderRadius: '50%',
                      background: colors.accentLight,
                      border: `3px solid ${colors.accent}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: '22px', fontWeight: 700,
                        color: colors.accent,
                        lineHeight: 1,
                      }}>
                        {authenticityScore}
                      </span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px', fontWeight: 600,
                        color: colors.accent,
                        marginBottom: '4px',
                      }}>
                        {getScoreLabel(authenticityScore)}
                      </div>
                      <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '8px' }}>
                        Sounds Like You
                      </div>

                      {/* Flag chips */}
                      {authenticityFlags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {authenticityFlags.map((flag, i) => (
                            <span key={i} style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '3px 10px',
                              borderRadius: '12px',
                              background: flag.includes('founder') || flag.includes('Tone')
                                ? colors.greenBg
                                : colors.yellowBg,
                              color: flag.includes('founder') || flag.includes('Tone')
                                ? colors.statusOnline
                                : colors.yellow,
                            }}>
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {hasGenerated && (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                }}>
                  <button
                    onClick={handleCopy}
                    disabled={!hasEdited}
                    title={!hasEdited ? 'Edit the post first before copying' : 'Copy to clipboard'}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      cursor: hasEdited ? 'pointer' : 'not-allowed',
                      background: copySuccess
                        ? colors.greenBg
                        : '#F9F9F9',
                      color: copySuccess
                        ? colors.statusOnline
                        : colors.textPrimary,
                      transition: 'all 0.2s ease',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    }}
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>

                  <button
                    onClick={handleSaveDraft}
                    disabled={!draftId}
                    style={{
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      cursor: draftId ? 'pointer' : 'not-allowed',
                      background: saveSuccess ? colors.greenBg : '#F9F9F9',
                      color: saveSuccess ? colors.statusOnline : colors.textPrimary,
                      transition: 'all 0.2s ease',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    }}
                  >
                    {saveSuccess ? 'Saved!' : 'Save Draft'}
                  </button>

                  {!hasEdited && (
                    <span style={{
                      fontSize: '12px',
                      color: colors.textMuted,
                      fontStyle: 'italic',
                      marginLeft: '4px',
                    }}>
                      Edit the post above to unlock Copy
                    </span>
                  )}
                </div>
              )}

              {/* Anti-autopilot note */}
              {hasGenerated && (
                <div style={{
                  padding: '14px 18px',
                  background: colors.accentLight,
                  border: `1px solid ${colors.accent}25`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: colors.textSecondary,
                  lineHeight: 1.5,
                }}>
                  Paste into LinkedIn manually. The last 20% is yours.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
