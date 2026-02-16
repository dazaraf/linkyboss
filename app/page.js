'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { generateVoiceProfile } from "@/lib/voice-profile";

// ── New Interview Flow: 8 Questions, 3 Phases ────────────────────────────────
// Questions marked with `aiFollowUp: true` will trigger a call to /api/interview-followup
// after the user answers, before moving to the next question.

const INTERVIEW_FLOW = [
  // Phase 1: Identity
  { id: 'q1_intro', type: 'dynamic', template: (data) => `${(data.name || '').toUpperCase()}, WHAT IS YOUR PROFESSION?! AHOOO AHOOO AHOOO\n\n(Sorry, I really love Gerard Butler in 300.)\n\nBut seriously — what do you do, and what's the 30-second version of how you got here?` },
  { id: 'q1', type: 'question', field: 'identity', aiFollowUp: true, questionText: "What do you do, and what's the 30-second version of how you got here?" },

  { id: 'q2_intro', type: 'bot', message: "What's something you believe about your industry that would make most people in it uncomfortable?" },
  { id: 'q2', type: 'question', field: 'contrarian', aiFollowUp: true, questionText: "What's something you believe about your industry that would make most people in it uncomfortable?" },

  { id: 'q3_intro', type: 'bot', message: "What's something that cost you real time, money, or pain to learn — that you now give away for free?" },
  { id: 'q3', type: 'question', field: 'lesson', aiFollowUp: true, questionText: "What's something that cost you real time, money, or pain to learn — that you now give away for free?" },

  // Phase 2: Audience
  { id: 'phase2_transition', type: 'bot', message: "Good — I'm starting to hear your voice. Now let's talk about who you're trying to reach." },

  { id: 'q4_intro', type: 'bot', message: "Describe the exact person you want reading your posts. What's their job, what stage are they at, and what's the thing that's quietly killing them right now?" },
  { id: 'q4', type: 'question', field: 'audience', aiFollowUp: true, questionText: "Describe the exact person you want reading your posts. What's their job, what stage are they at, and what's the thing that's quietly killing them right now?" },

  { id: 'q5_intro', type: 'bot', message: "After someone binges your content for a month, what should change in how they think or act?" },
  { id: 'q5', type: 'question', field: 'desired_outcome' },

  // Phase 3: Voice & Arsenal
  { id: 'phase3_transition', type: 'bot', message: "Almost done. Last section — this is where we lock in how you actually sound." },

  { id: 'q6_intro', type: 'bot', message: "Give me 3 words for how you want to come across. And who online makes you think \"damn, I wish I wrote that\"?" },
  { id: 'q6', type: 'question', field: 'voice', aiFollowUp: true, questionText: 'Give me 3 words for how you want to come across. And who online makes you think "damn, I wish I wrote that"?' },

  { id: 'q7_intro', type: 'bot', message: "What 3-4 topics could you riff on forever? And anything you'd never touch?" },
  { id: 'q7', type: 'question', field: 'pillars', secondaryField: 'offlimits' },

  { id: 'q8_intro', type: 'bot', message: "Last one. Give me one of these — whichever one lights you up most:\n\n• A win you're proud of but haven't talked about publicly\n• A hot take you've been sitting on\n• A question people keep asking you in DMs or on calls" },
  { id: 'q8', type: 'question', field: 'content_bank', aiFollowUp: true, questionText: "Give me one: a win you're proud of, a hot take you've been sitting on, or a question people keep asking you." },

  { id: 'generating', type: 'bot', message: "That's everything. Give me a sec to put together your voice profile..." },
  { id: 'complete', type: 'complete' }
];

// Brand color constants
const colors = {
  bgMain: '#1C1C1C', // Obsidian Black
  bgCard: '#2A2A2A', // Slightly lighter black for cards
  bgInput: '#333333', // Input background
  border: '#404040', // Border color
  borderHover: '#555555', // Hover border
  textPrimary: '#FFFFFF', // White
  textSecondary: '#E8E8E8', // Fog Gray
  textMuted: '#A0A0A0', // Muted text
  accent: '#FF6B35', // Electric Orange
  accentHover: '#FF5722', // Darker orange on hover
  statusOnline: '#22c55e',
};

const STORAGE_KEY = 'linkyboss_interview_progress';
const PENDING_NAME_KEY = 'linkyboss_pending_name';
const TOTAL_QUESTIONS = 8;
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function Linkyboss() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stage, setStage] = useState('landing'); // 'landing', 'emailGate', 'chat', 'email-capture', 'complete'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hookAnswer, setHookAnswer] = useState(''); // Store the hook question answer
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmittingHook, setIsSubmittingHook] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [hookError, setHookError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [voiceProfile, setVoiceProfile] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [awaitingFollowUp, setAwaitingFollowUp] = useState(null); // { field, stepIndex } when waiting for follow-up answer
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // 'saving', 'saved', ''
  const [profileGenerationStatus, setProfileGenerationStatus] = useState(''); // 'generating', ''
  const [vaultSaveStatus, setVaultSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [followUpError, setFollowUpError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const messagesEndRef = useRef(null);
  const savedProgressRef = useRef(null);
  const textareaRef = useRef(null);
  const msgIdCounter = useRef(0);

  // Responsive design hook
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsSmallMobile(width < 375);
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width <= 1024);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const nextMsgId = () => `msg-${++msgIdCounter.current}-${Date.now()}`;

  // Check for session expiration
  const checkSession = () => {
    if (status === 'unauthenticated' && stage === 'chat' && messages.length > 0) {
      setSessionExpired(true);
    }
  };

  useEffect(() => {
    checkSession();
  }, [status, stage, messages.length]);

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
        setVaultSaveStatus('saving');
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
            setVaultSaveStatus('saved');
            setTimeout(() => setVaultSaveStatus(''), 3000);
          } else {
            setVaultSaveStatus('error');
            setTimeout(() => setVaultSaveStatus(''), 5000);
          }
        } catch (err) {
          console.error('Failed to auto-save voice profile:', err);
          setVaultSaveStatus('error');
          setTimeout(() => setVaultSaveStatus(''), 5000);
        }
      };
      saveProfile();
    }
  }, [voiceProfile, status, session, savedToVault, userData]);

  // Auto-save to localStorage + API (for authenticated users) when in chat stage (debounced)
  useEffect(() => {
    if (stage === 'chat') {
      const timer = setTimeout(() => {
        const progressObj = { userData, currentStep, messages, name, stage, awaitingFollowUp };
        setAutoSaveStatus('saving');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(progressObj));
        } catch (e) {
          // localStorage may be unavailable
        }
        // Also save to DB for authenticated users
        if (status === 'authenticated') {
          fetch('/api/interview-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressObj),
          })
            .then(res => {
              if (res.ok) {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus(''), 2000);
              } else {
                setAutoSaveStatus('');
              }
            })
            .catch(() => {
              setAutoSaveStatus('');
            });
        } else {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus(''), 2000);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [userData, currentStep, messages, name, stage, awaitingFollowUp, status]);

  // Validate saved progress structure
  const validateProgress = (parsed) => {
    return (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.messages) &&
      parsed.messages.length > 0 &&
      typeof parsed.currentStep === 'number' &&
      parsed.currentStep >= 0 &&
      parsed.currentStep < INTERVIEW_FLOW.length &&
      (typeof parsed.name === 'string' || parsed.name === undefined) &&
      (typeof parsed.userData === 'object' && parsed.userData !== null) &&
      parsed.messages.every(m =>
        m && typeof m === 'object' &&
        (m.type === 'user' || m.type === 'bot') &&
        typeof m.text === 'string'
      )
    );
  };

  const sanitizeProgress = (parsed) => {
    const sanitizedUserData = {};
    for (const [key, value] of Object.entries(parsed.userData)) {
      if (typeof key === 'string' && typeof value === 'string') {
        sanitizedUserData[key] = value;
      }
    }
    parsed.userData = sanitizedUserData;
    parsed.name = typeof parsed.name === 'string' ? parsed.name : '';
    return parsed;
  };

  // On mount, check localStorage and DB for saved progress
  const progressChecked = useRef(false);
  useEffect(() => {
    if (progressChecked.current) return;
    if (status === 'loading') return;
    progressChecked.current = true;

    const loadProgress = async () => {
      // First check localStorage
      let localProgress = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.stage === 'chat' && validateProgress(parsed)) {
            localProgress = sanitizeProgress(parsed);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
      }

      // For authenticated users, also check DB
      let dbProgress = null;
      if (status === 'authenticated') {
        try {
          const res = await fetch('/api/interview-progress');
          if (res.ok) {
            const data = await res.json();
            if (data.progress && validateProgress(data.progress)) {
              dbProgress = sanitizeProgress(data.progress);
            }
          }
        } catch (e) { /* ignore */ }
      }

      // Use whichever has more progress (higher currentStep), preferring DB
      const best = (dbProgress && localProgress)
        ? (dbProgress.currentStep >= localProgress.currentStep ? dbProgress : localProgress)
        : (dbProgress || localProgress);

      if (best) {
        savedProgressRef.current = best;
        setShowResumeBanner(true);
      }
    };

    loadProgress();
  }, [status]);

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
      const restoredMessages = (saved.messages || []).map(m => ({
        ...m,
        id: m.id || nextMsgId()
      }));
      setMessages(restoredMessages);
      setName(saved.name || '');
      setAwaitingFollowUp(saved.awaitingFollowUp || null);
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
    if (isTyping) return;

    // If we're in a follow-up state, cancel it and go back to the main question
    if (awaitingFollowUp) {
      // Remove the follow-up bot message and the user's answer to the original question
      // Actually just remove the last bot message (the follow-up) and let user re-answer
      const newMessages = [...messages];
      // Remove trailing bot messages (the follow-up question)
      while (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'bot') {
        newMessages.pop();
      }
      // Also remove the user's last answer
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'user') {
        newMessages.pop();
      }

      const field = awaitingFollowUp.field;
      const updatedUserData = { ...userData };
      delete updatedUserData[field];
      setUserData(updatedUserData);
      setMessages(newMessages);
      setAwaitingFollowUp(null);
      // currentStep should still be at the question step
      return;
    }

    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;

    let prevUserIdx = -1;
    for (let i = lastUserIdx - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        prevUserIdx = i;
        break;
      }
    }

    const newMessages = messages.slice(0, prevUserIdx + 1);

    let lastQuestionStep = -1;
    for (let i = currentStep - 1; i >= 0; i--) {
      if (INTERVIEW_FLOW[i].type === 'question') {
        lastQuestionStep = i;
        break;
      }
    }

    let updatedUserData = userData;
    if (lastQuestionStep >= 0) {
      const field = INTERVIEW_FLOW[lastQuestionStep].field;
      if (field) {
        updatedUserData = { ...userData };
        delete updatedUserData[field];
        setUserData(updatedUserData);
      }

      const introStep = findIntroStep(lastQuestionStep);
      setMessages(newMessages);
      setCurrentStep(lastQuestionStep);

      if (introStep < lastQuestionStep) {
        setTimeout(() => processStep(introStep, updatedUserData), 300);
      }
    } else {
      setMessages(newMessages);
    }
  };

  const simulateTyping = (callback, delay = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  // Handle hook question submission
  const handleHookSubmit = async () => {
    if (!hookAnswer.trim() || isSubmittingHook) return;

    setHookError('');
    setIsSubmittingHook(true);
    setApiError(null);

    try {
      // Check if online
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }

      // Simulate processing (could add API call here if needed)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Store the hook answer in userData
      setUserData({ contrarian: hookAnswer.trim() });

      // Move to email gate
      setStage('emailGate');
      setIsSubmittingHook(false);
    } catch (error) {
      setHookError(error.message || 'Something went wrong. Please try again.');
      setIsSubmittingHook(false);
    }
  };

  // Handle email gate submission
  const handleEmailGateSubmit = async () => {
    if (!email.trim() || !isValidEmail(email) || isSubmittingEmail) return;

    setEmailError('');
    setIsSubmittingEmail(true);

    try {
      // Check if online
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }

      // Validate email format again
      if (!isValidEmail(email.trim())) {
        throw new Error('Please enter a valid email address.');
      }

      // Simulate processing (could add API call here if needed)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Start the full interview from q1
      const initialUserData = {
        name: name.trim(),
        email: email.trim(),
        contrarian: userData.contrarian
      };
      setUserData(initialUserData);
      setStage('chat');
      setIsSubmittingEmail(false);

      // Start from the first question (identity)
      setTimeout(() => {
        processStep(0, initialUserData);
      }, 500);
    } catch (error) {
      setEmailError(error.message || 'Something went wrong. Please try again.');
      setIsSubmittingEmail(false);
    }
  };

  const interviewStartedRef = useRef(false);
  const startInterview = (overrideName) => {
    const nameToUse = (overrideName || name || '').trim();
    if (!nameToUse || interviewStartedRef.current) return;

    // If not authenticated, save name and redirect to signup
    if (status === 'unauthenticated') {
      try { localStorage.setItem(PENDING_NAME_KEY, nameToUse); } catch (e) { /* ignore */ }
      router.push('/signup?callbackUrl=' + encodeURIComponent('/?autoStart=1'));
      return;
    }

    interviewStartedRef.current = true;
    const initialUserData = { name: nameToUse };
    setUserData(initialUserData);
    setStage('chat');
    setTimeout(() => {
      processStep(0, initialUserData);
    }, 500);
  };

  // Auto-start interview when returning from auth with pending name
  const autoStartChecked = useRef(false);
  useEffect(() => {
    if (autoStartChecked.current) return;
    if (status === 'loading') return; // wait for session to resolve
    autoStartChecked.current = true;

    const autoStart = searchParams.get('autoStart');
    if (autoStart === '1' && status === 'authenticated') {
      try {
        const pendingName = localStorage.getItem(PENDING_NAME_KEY);
        if (pendingName) {
          localStorage.removeItem(PENDING_NAME_KEY);
          setName(pendingName);
          // Use setTimeout to allow state to settle before starting
          setTimeout(() => startInterview(pendingName), 100);
        }
      } catch (e) { /* ignore */ }
      // Clean up URL
      router.replace('/', { scroll: false });
    }
  }, [status, searchParams, router]);

  // Fetch AI follow-up for a question
  const fetchFollowUp = async (question, answer, field, retryCount = 0) => {
    try {
      setFollowUpError(null);
      const res = await fetch('/api/interview-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, field }),
      });
      if (!res.ok) {
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchFollowUp(question, answer, field, retryCount + 1);
        }
        throw new Error(`API returned ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Follow-up fetch error:', error);
      setFollowUpError(error.message || 'Network error');
      return { followUp: null, affirmation: 'Got it.' };
    }
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
        if (nextStep && nextStep.type === 'question') {
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
        if (nextStep && nextStep.type === 'question') {
          // Wait for user input
        } else if (nextStep && nextStep.type !== 'question') {
          setTimeout(() => processStep(stepIndex + 1, dataToUse), 500);
        }
      }, 600 + Math.random() * 300);
    } else if (step.type === 'complete') {
      setProfileGenerationStatus('generating');
      setTimeout(() => {
        const profile = generateVoiceProfile(dataToUse);
        setVoiceProfile(profile);
        setProfileGenerationStatus('');
        setStage('email-capture');
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        // Clear DB draft for authenticated users
        if (status === 'authenticated') {
          fetch('/api/interview-progress', { method: 'DELETE' }).catch(() => {});
        }
      }, 1500);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { id: nextMsgId(), type: 'user', text: userMessage }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Check if online
    if (!navigator.onLine) {
      setApiError('You appear to be offline. Please check your internet connection.');
      return;
    }

    setApiError(null);

    // If we're awaiting a follow-up answer, append it to the field and move on
    if (awaitingFollowUp) {
      const { field, stepIndex } = awaitingFollowUp;
      const existingValue = userData[field] || '';
      const newUserData = {
        ...userData,
        [field]: existingValue + '\n\n[Follow-up] ' + userMessage,
      };
      setUserData(newUserData);
      setAwaitingFollowUp(null);

      // Move to next step after the question
      const nextStep = stepIndex + 1;
      setCurrentStep(nextStep);
      setTimeout(() => processStep(nextStep, newUserData), 300);
      return;
    }

    const currentQuestion = INTERVIEW_FLOW[currentStep];
    if (currentQuestion && currentQuestion.type === 'question' && currentQuestion.field) {
      const newUserData = { ...userData, [currentQuestion.field]: userMessage };
      setUserData(newUserData);

      // Check if this question has AI follow-up
      if (currentQuestion.aiFollowUp) {
        setIsTyping(true);
        const { followUp, affirmation } = await fetchFollowUp(
          currentQuestion.questionText || '',
          userMessage,
          currentQuestion.field
        );
        setIsTyping(false);

        if (followUp) {
          // Show affirmation + follow-up as a bot message
          const botText = affirmation ? `${affirmation}\n\n${followUp}` : followUp;
          setMessages(prev => [...prev, { id: nextMsgId(), type: 'bot', text: botText }]);
          setAwaitingFollowUp({ field: currentQuestion.field, stepIndex: currentStep });
          return;
        } else {
          // No follow-up needed — show affirmation and move on
          if (affirmation && affirmation !== 'Got it.') {
            setMessages(prev => [...prev, { id: nextMsgId(), type: 'bot', text: affirmation }]);
          }
        }
      }

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
    setApiError(null);

    try {
      // Check if online
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }

      // Validate email format
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address.');
      }

      // Simulate email sending (in real app, this would be an API call)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsSending(false);
      setStage('complete');
    } catch (error) {
      setApiError(error.message || 'Failed to send email. Please try again.');
      setIsSending(false);
    }
  };

  const downloadProfile = () => {
    const blob = new Blob([voiceProfile], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-profile-${userData.name?.toLowerCase().replace(/\s+/g, '-') || 'founder'}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // CSS Animations
  const globalStyles = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 0.4;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1.2);
      }
    }
  `;

  // Landing Page with Hero + Hook Question
  if (stage === 'landing') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        opacity: 1,
        animation: 'fadeIn 0.3s ease-in'
      }}>
        {/* Orange gradient glow */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '400px',
          background: 'radial-gradient(ellipse at top, rgba(255, 107, 53, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Header */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
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
              background: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.bgMain,
              fontSize: '16px',
              fontWeight: 700
            }}>L</div>
            <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px' }}>Linkyboss</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {status === 'authenticated' && session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  style={{
                    background: 'transparent',
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
                  fontWeight: 600,
                  color: colors.bgMain,
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
            maxWidth: '600px',
            width: '100%',
            margin: '0 auto',
            padding: '0 24px',
            position: 'relative',
            zIndex: 1,
            marginTop: '16px',
            opacity: 1,
            animation: 'slideDown 0.3s ease-out'
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
                  fontWeight: 600,
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
                    fontWeight: 600,
                    color: colors.bgMain,
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
          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 64px)',
            fontWeight: 700,
            color: colors.textPrimary,
            margin: '0 0 16px 0',
            letterSpacing: '-1.5px',
            lineHeight: 1.1
          }}>
            Stop sounding like<br />
            <span style={{ color: colors.accent }}>everyone else</span>
          </h1>

          <p style={{
            fontSize: 'clamp(18px, 3vw, 22px)',
            color: colors.textSecondary,
            margin: '0 0 48px 0',
            maxWidth: '600px',
            lineHeight: 1.6
          }}>
            8 questions. 4 minutes. A voice profile that captures how you actually think—so every AI tool you use sounds like you, not a robot.
          </p>

          {/* Hook Question Card */}
          <div style={{
            background: colors.bgCard,
            border: `2px solid ${colors.border}`,
            borderRadius: '16px',
            padding: isSmallMobile ? '20px' : isMobile ? '24px' : '40px',
            maxWidth: '600px',
            width: '100%',
            marginBottom: '24px',
            transition: 'border-color 0.3s ease'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 24px 0',
              textAlign: 'left'
            }}>
              What's something you believe about your industry that would make most people in it uncomfortable?
            </h2>

            <textarea
              value={hookAnswer}
              onChange={(e) => {
                setHookAnswer(e.target.value);
                setHookError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleHookSubmit();
                }
              }}
              placeholder="Be honest. This is where it gets interesting..."
              disabled={isSubmittingHook}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '16px',
                fontSize: '15px',
                background: colors.bgInput,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                lineHeight: 1.6,
                marginBottom: '16px',
                transition: 'border-color 0.2s ease'
              }}
            />

            {hookError && (
              <div style={{
                color: colors.accentHover,
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {hookError}
              </div>
            )}

            <button
              onClick={handleHookSubmit}
              disabled={!hookAnswer.trim() || isSubmittingHook}
              style={{
                width: '100%',
                background: hookAnswer.trim() && !isSubmittingHook ? colors.accent : colors.bgInput,
                border: 'none',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 600,
                color: hookAnswer.trim() && !isSubmittingHook ? colors.bgMain : colors.textMuted,
                borderRadius: '8px',
                cursor: hookAnswer.trim() && !isSubmittingHook ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (hookAnswer.trim() && !isSubmittingHook) {
                  e.target.style.background = colors.accentHover;
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (hookAnswer.trim() && !isSubmittingHook) {
                  e.target.style.background = colors.accent;
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {isSubmittingHook ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${colors.bgMain}`,
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                  Processing...
                </>
              ) : 'Continue'}
            </button>

            <p style={{
              fontSize: '13px',
              color: colors.textMuted,
              margin: '12px 0 0 0',
              textAlign: 'center'
            }}>
              Press Enter to submit
            </p>
          </div>

          <p style={{
            fontSize: '13px',
            color: colors.textMuted,
            margin: '0'
          }}>
            No fluff. No templates. Just you.
          </p>
        </div>
      </div>
      </>
    );
  }

  // Email Gate Modal (after hook answer)
  if (stage === 'emailGate') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
        minHeight: '100vh',
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.3s ease-in'
      }}>
        <div style={{
          background: colors.bgCard,
          border: `2px solid ${colors.accent}`,
          borderRadius: '16px',
          padding: isSmallMobile ? '20px' : isMobile ? '24px' : '48px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: `0 20px 60px rgba(255, 107, 53, 0.2)`,
          animation: 'slideUp 0.4s ease-out',
          position: 'relative'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: `${colors.accent}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: isMobile ? '24px' : '28px', color: colors.accent }}>✓</span>
          </div>

          <h2 style={{
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: 700,
            color: colors.textPrimary,
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px'
          }}>
            Save Your Progress
          </h2>

          <p style={{
            fontSize: '16px',
            color: colors.textSecondary,
            margin: '0 0 32px 0',
            lineHeight: 1.6
          }}>
            Great answer. Let's capture your info so we can save your voice profile and send it to you when you're done.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: colors.textSecondary,
              marginBottom: '8px',
              textAlign: 'left'
            }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isSubmittingEmail}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: colors.bgInput,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: colors.textSecondary,
              marginBottom: '8px',
              textAlign: 'left'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEmailGateSubmit();
                }
              }}
              placeholder="you@company.com"
              disabled={isSubmittingEmail}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: colors.bgInput,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>

          {emailError && (
            <div style={{
              color: colors.accentHover,
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              {emailError}
            </div>
          )}

          <button
            onClick={handleEmailGateSubmit}
            disabled={!name.trim() || !email.trim() || !isValidEmail(email) || isSubmittingEmail}
            style={{
              width: '100%',
              background: name.trim() && email.trim() && isValidEmail(email) && !isSubmittingEmail ? colors.accent : colors.bgInput,
              border: 'none',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 600,
              color: name.trim() && email.trim() && isValidEmail(email) && !isSubmittingEmail ? colors.bgMain : colors.textMuted,
              borderRadius: '8px',
              cursor: name.trim() && email.trim() && isValidEmail(email) && !isSubmittingEmail ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (name.trim() && email.trim() && isValidEmail(email) && !isSubmittingEmail) {
                e.target.style.background = colors.accentHover;
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (name.trim() && email.trim() && isValidEmail(email) && !isSubmittingEmail) {
                e.target.style.background = colors.accent;
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {isSubmittingEmail ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${colors.bgMain}`,
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                Saving...
              </>
            ) : 'Continue to Interview'}
          </button>

          <p style={{
            fontSize: '12px',
            color: colors.textMuted,
            margin: '16px 0 0 0',
            textAlign: 'center',
            lineHeight: 1.5
          }}>
            We'll email you your completed voice profile. No spam, ever.
          </p>
        </div>
      </div>
      </>
    );
  }

  // Chat Interface
  if (stage === 'chat') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        animation: 'fadeIn 0.3s ease-in'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
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
              background: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.bgMain,
              fontSize: '16px',
              fontWeight: 700
            }}>L</div>
            <div>
              <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Linkyboss
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: colors.statusOnline,
                  display: 'inline-block'
                }} />
                <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 500 }}>
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
                  fontWeight: 600,
                  color: colors.bgMain,
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
        {/* Question counter with auto-save indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '6px 32px',
          fontSize: '12px',
          color: colors.textMuted
        }}>
          <span>Question {getQuestionNumber()} of {TOTAL_QUESTIONS}</span>
          {autoSaveStatus === 'saving' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textMuted }}>
              <div style={{
                width: '10px',
                height: '10px',
                border: `2px solid ${colors.textMuted}`,
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              Saving...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.statusOnline }}>
              ✓ Saved
            </span>
          )}
        </div>

        {/* Session expired banner */}
        {sessionExpired && (
          <div style={{
            background: '#FEF2F2',
            borderBottom: `1px solid #FCA5A5`,
            padding: isMobile ? '12px 20px' : '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#991B1B', fontSize: '14px', fontWeight: 500 }}>
                Your session has expired. Please sign in to continue.
              </span>
            </div>
            <Link
              href={`/signin?callbackUrl=${encodeURIComponent('/')}`}
              style={{
                background: '#DC2626',
                border: 'none',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'background 0.2s ease'
              }}
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Follow-up error banner */}
        {followUpError && (
          <div style={{
            background: '#FEF2F2',
            borderBottom: `1px solid #FCA5A5`,
            padding: isMobile ? '12px 20px' : '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#991B1B', fontSize: '14px', fontWeight: 500 }}>
                Failed to generate AI follow-up: {followUpError}
              </span>
            </div>
            <button
              onClick={() => setFollowUpError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                fontSize: '18px',
                color: '#991B1B',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* General API error banner */}
        {apiError && (
          <div style={{
            background: '#FEF2F2',
            borderBottom: `1px solid #FCA5A5`,
            padding: isMobile ? '12px 20px' : '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#991B1B', fontSize: '14px', fontWeight: 500 }}>
                {apiError}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#DC2626',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#B91C1C'}
                onMouseOut={(e) => e.target.style.background = '#DC2626'}
              >
                Retry
              </button>
              <button
                onClick={() => setApiError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  fontSize: '18px',
                  color: '#991B1B',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div
          aria-live="polite"
          aria-relevant="additions"
          style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          maxWidth: '900px',
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
                maxWidth: isMobile ? '85%' : '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.type === 'user' ? colors.accent : colors.bgCard,
                color: colors.textPrimary,
                fontSize: '15px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
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
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: colors.textMuted,
                  animation: 'pulse 1.4s ease-in-out infinite'
                }} />
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: colors.textMuted,
                  animation: 'pulse 1.4s ease-in-out 0.2s infinite'
                }} />
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: colors.textMuted,
                  animation: 'pulse 1.4s ease-in-out 0.4s infinite'
                }} />
                {awaitingFollowUp && <span style={{ marginLeft: '4px' }}>Generating AI follow-up...</span>}
              </div>
            </div>
          )}

          {profileGenerationStatus === 'generating' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{
                padding: '16px 24px',
                borderRadius: '12px',
                background: colors.bgCard,
                border: `1px solid ${colors.accent}`,
                color: colors.textPrimary,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${colors.accent}`,
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                Generating your voice profile...
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
            maxWidth: '900px',
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
      </>
    );
  }

  // Email Capture (after interview, before complete)
  if (stage === 'email-capture') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-in'
      }}>
        {/* Orange gradient glow */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '400px',
          background: 'radial-gradient(ellipse at top, rgba(255, 107, 53, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Header */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
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
              background: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.bgMain,
              fontSize: '16px',
              fontWeight: 700
            }}>L</div>
            <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px' }}>Linkyboss</div>
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
                  fontWeight: 600,
                  color: colors.bgMain,
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
            padding: isSmallMobile ? '20px' : isMobile ? '24px' : '40px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: `${colors.accent}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: isMobile ? '24px' : '28px', color: colors.accent }}>✓</span>
            </div>

            <h2 style={{
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 700,
              color: colors.textPrimary,
              margin: '0 0 12px 0',
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
              onChange={(e) => {
                setEmail(e.target.value);
                setApiError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: colors.bgInput,
                border: `1px solid ${apiError ? colors.accentHover : colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                marginBottom: apiError ? '8px' : '16px',
                boxSizing: 'border-box'
              }}
            />

            {apiError && (
              <div style={{
                color: colors.accentHover,
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚠</span> {apiError}
              </div>
            )}

            <button
              onClick={handleEmailSubmit}
              disabled={!email || !isValidEmail(email) || isSending}
              style={{
                width: '100%',
                background: email && isValidEmail(email) && !isSending ? colors.accent : colors.bgInput,
                border: 'none',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 600,
                color: email && isValidEmail(email) && !isSending ? colors.bgMain : colors.textMuted,
                borderRadius: '8px',
                cursor: email && isValidEmail(email) && !isSending ? 'pointer' : 'not-allowed',
                marginBottom: '16px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (email && isValidEmail(email) && !isSending) {
                  e.target.style.background = colors.accentHover;
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (email && isValidEmail(email) && !isSending) {
                  e.target.style.background = colors.accent;
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {isSending ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: `2px solid ${colors.bgMain}`,
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                  Sending...
                </>
              ) : 'Send My Voice Profile'}
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
      </>
    );
  }

  // Complete
  if (stage === 'complete') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
        minHeight: '100vh',
        background: colors.bgMain,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        animation: 'fadeIn 0.3s ease-in'
      }}>
        {/* Orange gradient glow */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '400px',
          background: 'radial-gradient(ellipse at top, rgba(255, 107, 53, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Header */}
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
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
              background: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.bgMain,
              fontSize: '16px',
              fontWeight: 700
            }}>L</div>
            <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '15px' }}>Linkyboss</div>
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
                  fontWeight: 600,
                  color: colors.bgMain,
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
          padding: isSmallMobile ? '32px 16px' : isMobile ? '40px 24px' : '60px 32px',
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
            <span style={{ fontSize: isMobile ? '28px' : '32px' }}>✓</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '28px' : '32px',
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
                  color: colors.bgMain,
                  border: 'none',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease',
                }}
              >
                Go to Dashboard
              </Link>
            )}
          </div>

          {vaultSaveStatus === 'saving' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              color: colors.textMuted,
              fontSize: '13px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: `2px solid ${colors.textMuted}`,
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              Saving to vault...
            </div>
          )}
          {vaultSaveStatus === 'saved' && (
            <p style={{
              color: colors.statusOnline,
              fontSize: '13px',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>✓</span> Profile saved to your Voice Profile Vault!
            </p>
          )}
          {vaultSaveStatus === 'error' && (
            <p style={{
              color: colors.accentHover,
              fontSize: '13px',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠</span> Failed to save to vault. Please try again from Dashboard.
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
      </>
    );
  }

  // Fallback
  return null;
}
