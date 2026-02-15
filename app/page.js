'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { generateVoiceProfile } from "@/lib/voice-profile";

const INTERVIEW_FLOW = [
  { id: 'q1_response', type: 'dynamic', template: (data) => `${(data.name || '').toUpperCase()}, WHAT IS YOUR PROFESSION?! AHOOO AHOOO AHOOO\n\n(Sorry, I really love Gerard Butler in 300.)\n\nBut seriously. What do you do? What's your role and company?` },
  { id: 'q2', type: 'question', field: 'role', message: null },
  { id: 'q3_intro', type: 'bot', message: "How'd you end up doing this? Give me the origin story." },
  { id: 'q3', type: 'question', field: 'origin', message: null },
  { id: 'q4_intro', type: 'bot', message: "What's something you believe about your space that most people get wrong?" },
  { id: 'q4', type: 'question', field: 'contrarian', message: null },
  { id: 'section2', type: 'bot', message: "Now let's talk about the people you're trying to reach.\n\nWho's your ideal audience on LinkedIn? Be specific. Job title, stage, situation." },
  { id: 'q5', type: 'question', field: 'icp', message: null },
  { id: 'q6_intro', type: 'bot', message: "What's their biggest pain right now? The thing that keeps them up at night." },
  { id: 'q6', type: 'question', field: 'pain', message: null },
  { id: 'q7_intro', type: 'bot', message: "What do most of them get wrong or misunderstand?" },
  { id: 'q7', type: 'question', field: 'misconception', message: null },
  { id: 'q8_intro', type: 'bot', message: "After someone reads your content, what do you want them to do or feel?" },
  { id: 'q8', type: 'question', field: 'desired_outcome', message: null },
  { id: 'section3', type: 'bot', message: "Let's figure out how you want to sound.\n\nGive me 3 words that describe how you want to come across." },
  { id: 'q9', type: 'question', field: 'tone', message: null },
  { id: 'q10_intro', type: 'bot', message: "Who do you admire online? Whose content makes you think \"I wish I wrote that\"?" },
  { id: 'q10', type: 'question', field: 'references', message: null },
  { id: 'q11_intro', type: 'bot', message: "What topics could you talk about forever? These are your content pillars." },
  { id: 'q11', type: 'question', field: 'pillars', message: null },
  { id: 'q12_intro', type: 'bot', message: "Any topics you're not touching? Off-limits stuff." },
  { id: 'q12', type: 'question', field: 'offlimits', message: null },
  { id: 'section4', type: 'bot', message: "Last section. This is where the good stuff is.\n\nWhat's a lesson you learned the hard way? Something that cost you time, money, or pain." },
  { id: 'q13', type: 'question', field: 'lesson', message: null },
  { id: 'q14_intro', type: 'bot', message: "What's a win you're proud of but haven't really talked about publicly?" },
  { id: 'q14', type: 'question', field: 'win', message: null },
  { id: 'q15_intro', type: 'bot', message: "What's a hot take you've been sitting on? Something spicy you believe but haven't posted." },
  { id: 'q15', type: 'question', field: 'hottake', message: null },
  { id: 'q16_intro', type: 'bot', message: "Last one.\n\nWhat question do people keep asking you? In DMs, on calls, in real life." },
  { id: 'q16', type: 'question', field: 'repeating', message: null },
  { id: 'generating', type: 'bot', message: "That's everything. Give me a sec to put together your voice profile..." },
  { id: 'complete', type: 'complete' }
];

// Color constants for LinkedIn dark mode
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
};

const STORAGE_KEY = 'linkyboss_interview_progress';
const TOTAL_QUESTIONS = 16;
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function Linkyboss() {
  const { data: session, status } = useSession();
  const [stage, setStage] = useState('landing');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const messagesEndRef = useRef(null);
  const savedProgressRef = useRef(null);
  const textareaRef = useRef(null);
  const msgIdCounter = useRef(0);
  const nextMsgId = () => `msg-${++msgIdCounter.current}-${Date.now()}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-save voice profile to vault when generated and user is authenticated
  useEffect(() => {
    if (voiceProfile && status === 'authenticated' && session?.user && !savedToVault) {
      const saveProfile = async () => {
        try {
          const res = await fetch('/api/voice-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Voice Profile - ${userData.name || 'Unnamed'}`,
              profileData: userData,
            }),
          });
          if (res.ok) {
            setSavedToVault(true);
          }
        } catch (err) {
          console.error('Failed to auto-save voice profile:', err);
        }
      };
      saveProfile();
    }
  }, [voiceProfile, status, session, savedToVault, userData]);

  // Auto-save to localStorage when in chat stage (debounced)
  useEffect(() => {
    if (stage === 'chat') {
      const timer = setTimeout(() => {
        try {
          const progress = JSON.stringify({ userData, currentStep, messages, name, stage });
          localStorage.setItem(STORAGE_KEY, progress);
        } catch (e) {
          // localStorage may be unavailable
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userData, currentStep, messages, name, stage]);

  // On mount, check localStorage for saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate structure and types to prevent XSS / injection from tampered localStorage
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.stage === 'chat' &&
          Array.isArray(parsed.messages) &&
          parsed.messages.length > 0 &&
          typeof parsed.currentStep === 'number' &&
          parsed.currentStep >= 0 &&
          parsed.currentStep < INTERVIEW_FLOW.length &&
          (typeof parsed.name === 'string' || parsed.name === undefined) &&
          (typeof parsed.userData === 'object' && parsed.userData !== null) &&
          // Validate each message has expected shape with string values
          parsed.messages.every(m =>
            m && typeof m === 'object' &&
            (m.type === 'user' || m.type === 'bot') &&
            typeof m.text === 'string'
          )
        ) {
          // Sanitize: ensure userData values are all strings
          const sanitizedUserData = {};
          for (const [key, value] of Object.entries(parsed.userData)) {
            if (typeof key === 'string' && typeof value === 'string') {
              sanitizedUserData[key] = value;
            }
          }
          parsed.userData = sanitizedUserData;
          parsed.name = typeof parsed.name === 'string' ? parsed.name : '';
          savedProgressRef.current = parsed;
          setShowResumeBanner(true);
        } else {
          // Invalid data, remove it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      // localStorage may be unavailable or data is corrupt
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
    }
  }, []);

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const getQuestionNumber = () => {
    let count = 0;
    for (let i = 0; i < currentStep && i < INTERVIEW_FLOW.length; i++) {
      if (INTERVIEW_FLOW[i].type === 'question') {
        count++;
      }
    }
    // If the current step is a question (user is answering it), count it as in-progress
    if (currentStep < INTERVIEW_FLOW.length && INTERVIEW_FLOW[currentStep].type === 'question') {
      count++;
    }
    return Math.min(count, TOTAL_QUESTIONS);
  };

  const resumeInterview = () => {
    const saved = savedProgressRef.current;
    if (saved) {
      setUserData(saved.userData || {});
      setCurrentStep(saved.currentStep || 0);
      // Ensure restored messages have unique IDs
      const restoredMessages = (saved.messages || []).map(m => ({
        ...m,
        id: m.id || nextMsgId()
      }));
      setMessages(restoredMessages);
      setName(saved.name || '');
      setStage('chat');
      setShowResumeBanner(false);
      savedProgressRef.current = null;
    }
  };

  const dismissResumeBanner = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    setShowResumeBanner(false);
    savedProgressRef.current = null;
  };

  // Helper: find the intro step (bot/dynamic message) that precedes a question step
  const findIntroStep = (questionStepIdx) => {
    let introStep = questionStepIdx;
    for (let i = questionStepIdx - 1; i >= 0; i--) {
      if (INTERVIEW_FLOW[i].type === 'bot' || INTERVIEW_FLOW[i].type === 'dynamic') {
        introStep = i;
        break;
      }
      if (INTERVIEW_FLOW[i].type === 'question') {
        introStep = i + 1;
        break;
      }
    }
    return introStep;
  };

  const handleBack = () => {
    // Don't allow back while bot is typing to prevent state inconsistency
    if (isTyping) return;

    // Find the last user message index
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;

    // Find the previous user message index (to know where to truncate)
    let prevUserIdx = -1;
    for (let i = lastUserIdx - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        prevUserIdx = i;
        break;
      }
    }

    // Remove the last user message and all bot messages after the previous user message
    const newMessages = messages.slice(0, prevUserIdx + 1);

    // Find the step that corresponds to the question the user just answered
    // The last answered question corresponds to the most recent question-type step before currentStep
    let targetStep = 0;
    let lastQuestionStep = -1;
    for (let i = currentStep - 1; i >= 0; i--) {
      if (INTERVIEW_FLOW[i].type === 'question') {
        lastQuestionStep = i;
        break;
      }
    }

    let updatedUserData = userData;
    if (lastQuestionStep >= 0) {
      // Remove the field from userData
      const field = INTERVIEW_FLOW[lastQuestionStep].field;
      if (field) {
        updatedUserData = { ...userData };
        delete updatedUserData[field];
        setUserData(updatedUserData);
      }

      // Set currentStep to the question step so it waits for user input again
      targetStep = lastQuestionStep;
    }

    setMessages(newMessages);
    setCurrentStep(targetStep);

    // Re-process from the intro step to show the bot message again
    if (lastQuestionStep >= 0) {
      const introStep = findIntroStep(lastQuestionStep);
      // Only re-process the intro bot message if it's not already in newMessages
      if (introStep < lastQuestionStep) {
        setTimeout(() => processStep(introStep, updatedUserData), 300);
      }
    }
  };

  const simulateTyping = (callback, delay = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const interviewStartedRef = useRef(false);
  const startInterview = () => {
    if (!name.trim() || interviewStartedRef.current) return;
    interviewStartedRef.current = true;
    const initialUserData = { name: name.trim() };
    setUserData(initialUserData);
    setStage('chat');
    setTimeout(() => {
      processStep(0, initialUserData);
    }, 500);
  };

  const processStep = (stepIndex, updatedUserData = null) => {
    if (stepIndex >= INTERVIEW_FLOW.length) return;

    const step = INTERVIEW_FLOW[stepIndex];
    const dataToUse = updatedUserData || userData;

    if (step.type === 'bot') {
      simulateTyping(() => {
        setMessages(prev => [...prev, { id: nextMsgId(), type: 'bot', text: step.message }]);
        setCurrentStep(stepIndex + 1);

        const nextStep = INTERVIEW_FLOW[stepIndex + 1];
        if (nextStep && nextStep.type === 'question' && nextStep.message === null) {
          // Wait for user input
        } else if (nextStep && nextStep.type !== 'question') {
          setTimeout(() => processStep(stepIndex + 1, dataToUse), 500);
        }
      }, 600 + Math.random() * 300);
    } else if (step.type === 'dynamic') {
      simulateTyping(() => {
        setMessages(prev => [...prev, { id: nextMsgId(), type: 'bot', text: step.template(dataToUse) }]);
        setCurrentStep(stepIndex + 1);

        const nextStep = INTERVIEW_FLOW[stepIndex + 1];
        if (nextStep && nextStep.type === 'question' && nextStep.message === null) {
          // Wait for user input
        } else if (nextStep && nextStep.type !== 'question') {
          setTimeout(() => processStep(stepIndex + 1, dataToUse), 500);
        }
      }, 600 + Math.random() * 300);
    } else if (step.type === 'complete') {
      setTimeout(() => {
        const profile = generateVoiceProfile(dataToUse);
        setVoiceProfile(profile);
        setStage('email-capture');
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      }, 1500);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { id: nextMsgId(), type: 'user', text: userMessage }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const currentQuestion = INTERVIEW_FLOW[currentStep];
    if (currentQuestion && currentQuestion.type === 'question' && currentQuestion.field) {
      const newUserData = { ...userData, [currentQuestion.field]: userMessage };
      setUserData(newUserData);

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setTimeout(() => processStep(nextStep, newUserData), 300);
    } else {
      setTimeout(() => processStep(currentStep), 300);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !isValidEmail(email) || isSending) return;

    setIsSending(true);

    // Simulate sending email (replace with actual API call)
    // In production, you'd call: await fetch('/api/send-email', { ... })
    setTimeout(() => {
      setIsSending(false);
      setStage('complete');
    }, 1500);
  };

  const downloadProfile = () => {
    const blob = new Blob([voiceProfile], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-profile-${userData.name?.toLowerCase().replace(/\s+/g, '-') || 'founder'}.md`;
    a.click();
    // Defer revocation so the browser has time to initiate the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Landing Page with Name Input
  if (stage === 'landing') {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {status === 'authenticated' && session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  style={{
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Dashboard
                </Link>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
              </>
            ) : status === 'unauthenticated' ? (
              <Link
                href="/signin"
                style={{
                  background: colors.accent,
                  border: 'none',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease'
                }}
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>

        {/* Resume banner */}
        {showResumeBanner && (
          <div style={{
            maxWidth: '480px',
            width: '100%',
            margin: '0 auto',
            padding: '0 24px',
            position: 'relative',
            zIndex: 1,
            marginTop: '16px'
          }}>
            <div style={{
              background: colors.bgCard,
              border: `1px solid ${colors.accent}`,
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{
                  color: colors.textPrimary,
                  fontSize: '15px',
                  fontWeight: 500,
                  marginBottom: '4px'
                }}>
                  You have an interview in progress
                </div>
                <div style={{
                  color: colors.textMuted,
                  fontSize: '13px'
                }}>
                  Pick up where you left off
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={resumeInterview}
                  style={{
                    background: colors.accent,
                    border: 'none',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textPrimary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = colors.accentHover}
                  onMouseOut={(e) => e.target.style.background = colors.accent}
                >
                  Resume
                </button>
                <button
                  onClick={dismissResumeBanner}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Centered content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '24px',
            color: colors.accent
          }}>in</div>

          <h1 style={{
            fontSize: '48px',
            fontWeight: 600,
            color: colors.textPrimary,
            margin: '0 0 16px 0',
            letterSpacing: '-1px'
          }}>
            Linkyboss
          </h1>

          <p style={{
            fontSize: '20px',
            color: colors.textSecondary,
            margin: '0 0 40px 0',
            maxWidth: '500px',
            lineHeight: 1.5
          }}>
            Find your founder voice.<br />
            Create content that sounds like you.
          </p>

          {/* Interview intro */}
          <div style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '100%',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 12px 0'
            }}>
              Let's build your voice profile
            </h2>
            <p style={{
              fontSize: '15px',
              color: colors.textSecondary,
              margin: '0 0 24px 0',
              lineHeight: 1.6
            }}>
              Answer 16 questions about your business, audience, and style.
              At the end, you'll get a voice profile you can use with any AI tool to create content that sounds like you.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: '8px',
                textAlign: 'left'
              }}>
                What's your name?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startInterview()}
                placeholder="Your name"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={startInterview}
              disabled={!name.trim()}
              style={{
                width: '100%',
                background: name.trim() ? colors.accent : colors.bgInput,
                border: 'none',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 500,
                color: name.trim() ? colors.textPrimary : colors.textMuted,
                borderRadius: '8px',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (name.trim()) {
                  e.target.style.background = colors.accentHover;
                }
              }}
              onMouseOut={(e) => {
                if (name.trim()) {
                  e.target.style.background = colors.accent;
                }
              }}
            >
              Start Interview
            </button>
          </div>

          <p style={{
            fontSize: '13px',
            color: colors.textMuted,
            margin: '0'
          }}>
            Takes 7 minutes. Worth every second.
          </p>
        </div>
      </div>
    );
  }

  // Chat Interface
  if (stage === 'chat') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div>
              <div style={{ color: colors.textPrimary, fontWeight: 500, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Linkyboss
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: colors.statusOnline,
                  display: 'inline-block'
                }} />
                <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>
                  {isTyping ? 'typing...' : 'online'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {status === 'authenticated' && session?.user ? (
              <>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
              </>
            ) : status === 'unauthenticated' ? (
              <Link
                href="/signin"
                style={{
                  background: colors.accent,
                  border: 'none',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease'
                }}
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={getQuestionNumber()}
          aria-valuemin={0}
          aria-valuemax={TOTAL_QUESTIONS}
          aria-label={`Interview progress: question ${getQuestionNumber()} of ${TOTAL_QUESTIONS}`}
          style={{
            height: '3px',
            background: colors.bgInput,
            width: '100%'
          }}
        >
          <div style={{
            height: '100%',
            background: colors.accent,
            width: `${(getQuestionNumber() / TOTAL_QUESTIONS) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        {/* Question counter */}
        <div style={{
          textAlign: 'center',
          padding: '6px 32px',
          fontSize: '12px',
          color: colors.textMuted
        }}>
          Question {getQuestionNumber()} of {TOTAL_QUESTIONS}
        </div>

        {/* Chat area */}
        <div
          aria-live="polite"
          aria-relevant="additions"
          style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          maxWidth: '700px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '12px'
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.type === 'user' ? colors.accent : colors.bgCard,
                color: colors.textPrimary,
                fontSize: '15px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                border: msg.type === 'user' ? 'none' : `1px solid ${colors.border}`
              }}>
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                color: colors.textMuted,
                fontSize: '14px'
              }}>
                ...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '12px 32px 20px',
          borderTop: `1px solid ${colors.border}`
        }}>
          <div style={{
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            {/* Back button */}
            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={handleBack}
                disabled={!messages.some(m => m.type === 'user') || isTyping}
                aria-label="Go back to previous question"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 0',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: (messages.some(m => m.type === 'user') && !isTyping) ? colors.textSecondary : colors.textMuted,
                  cursor: (messages.some(m => m.type === 'user') && !isTyping) ? 'pointer' : 'not-allowed',
                  opacity: (messages.some(m => m.type === 'user') && !isTyping) ? 1 : 0.5,
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (messages.some(m => m.type === 'user') && !isTyping) {
                    e.target.style.color = colors.textPrimary;
                  }
                }}
                onMouseOut={(e) => {
                  if (messages.some(m => m.type === 'user') && !isTyping) {
                    e.target.style.color = colors.textSecondary;
                  }
                }}
              >
                &larr; Back
              </button>
            </div>
            {/* Textarea with send button */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px'
            }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer and press Enter"
                aria-label="Your answer"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  fontSize: '15px',
                  background: colors.bgInput,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                  maxHeight: '120px',
                  overflow: 'auto',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  lineHeight: 1.5
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="Send answer"
                style={{
                  width: '44px',
                  height: '44px',
                  flexShrink: 0,
                  background: (input.trim() && !isTyping) ? colors.accent : colors.bgInput,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (input.trim() && !isTyping) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (input.trim() && !isTyping) {
                    e.currentTarget.style.background = colors.accentHover;
                  }
                }}
                onMouseOut={(e) => {
                  if (input.trim() && !isTyping) {
                    e.currentTarget.style.background = colors.accent;
                  }
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill={(input.trim() && !isTyping) ? colors.textPrimary : colors.textMuted} />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email Capture (after interview, before complete)
  if (stage === 'email-capture') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {status === 'authenticated' && session?.user ? (
              <>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
              </>
            ) : status === 'unauthenticated' ? (
              <Link
                href="/signin"
                style={{
                  background: colors.accent,
                  border: 'none',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease'
                }}
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>

        {/* Card */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '40px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `${colors.accent}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '24px' }}>✓</span>
            </div>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px'
            }}>
              Your voice profile is ready, {userData.name}!
            </h2>

            <p style={{
              fontSize: '15px',
              color: colors.textSecondary,
              margin: '0 0 32px 0',
              lineHeight: 1.5
            }}>
              Enter your email and we'll send you your voice profile along with a guide on how to use it.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: colors.bgInput,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
            />

            <button
              onClick={handleEmailSubmit}
              disabled={!email || !isValidEmail(email) || isSending}
              style={{
                width: '100%',
                background: email && isValidEmail(email) && !isSending ? colors.accent : colors.bgInput,
                border: 'none',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 500,
                color: email && isValidEmail(email) && !isSending ? colors.textPrimary : colors.textMuted,
                borderRadius: '8px',
                cursor: email && isValidEmail(email) && !isSending ? 'pointer' : 'not-allowed',
                marginBottom: '16px',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (email && isValidEmail(email) && !isSending) {
                  e.target.style.background = colors.accentHover;
                }
              }}
              onMouseOut={(e) => {
                if (email && isValidEmail(email) && !isSending) {
                  e.target.style.background = colors.accent;
                }
              }}
            >
              {isSending ? 'Sending...' : 'Send My Voice Profile'}
            </button>

            <p style={{
              fontSize: '13px',
              color: colors.textMuted,
              margin: '0',
              textAlign: 'center'
            }}>
              We'll also send you tips on getting the most out of your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Complete
  if (stage === 'complete') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative'
      }}>
        {/* Blue gradient glow */}
        <div className="blue-glow-bg" />

        {/* Header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {status === 'authenticated' && session?.user ? (
              <>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.textSecondary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
              </>
            ) : status === 'unauthenticated' ? (
              <Link
                href="/signin"
                style={{
                  background: colors.accent,
                  border: 'none',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease'
                }}
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '60px 32px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: `${colors.statusOnline}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: '32px' }}>✓</span>
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: 600,
            color: colors.textPrimary,
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            Check your inbox!
          </h1>

          <p style={{
            fontSize: '15px',
            color: colors.textSecondary,
            margin: '0 0 32px 0'
          }}>
            We've sent your voice profile and usage guide to <strong style={{ color: colors.textPrimary }}>{email}</strong>
          </p>

          <div style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 12px 0'
            }}>
              Preview your voice profile
            </h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <pre style={{
                color: colors.textSecondary,
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace"
              }}>{voiceProfile}</pre>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={downloadProfile}
              style={{
                background: colors.bgCard,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 500,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = colors.borderHover;
                e.target.style.background = colors.bgInput;
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.background = colors.bgCard;
              }}
            >
              Download profile
            </button>

            {status === 'authenticated' && (
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: colors.accent,
                  color: colors.textPrimary,
                  border: 'none',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease',
                }}
              >
                Go to Dashboard
              </Link>
            )}
          </div>

          {savedToVault && (
            <p style={{
              color: colors.statusOnline,
              fontSize: '13px',
              marginTop: '12px',
            }}>
              Profile saved to your Voice Profile Vault!
            </p>
          )}

          <div style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
            marginTop: '40px'
          }}>
            <p style={{
              color: colors.textPrimary,
              fontSize: '15px',
              margin: '0 0 12px 0',
              fontWeight: 500
            }}>
              This gets you 80% there.
            </p>
            <p style={{
              color: colors.textSecondary,
              fontSize: '14px',
              margin: '0 0 16px 0',
              lineHeight: 1.6
            }}>
              The last 20% is the refinement, the strategy, knowing what to post when, the DMs, the engagement system. That's what separates founders who post from founders who close deals.
            </p>
            <a
              href="#"
              style={{
                color: colors.accent,
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            >
              Want help with that? Let's talk
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: should never reach here, but return null instead of undefined
  return null;
}
