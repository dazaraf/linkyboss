'use client';

import React, { useState, useRef, useEffect } from 'react';

const INTERVIEW_FLOW = [
  { id: 'q1_response', type: 'dynamic', template: (data) => `${data.name.toUpperCase()}, WHAT IS YOUR PROFESSION?! AHOOO AHOOO AHOOO\n\n(Sorry, I really love Gerard Butler in 300.)\n\nBut seriously. What do you do? What's your role and company?` },
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

const generateVoiceProfile = (data) => {
  return `# Voice Profile: ${data.name}

## Identity
- **Name:** ${data.name}
- **Role:** ${data.role}
- **Origin Story:** ${data.origin}
- **Contrarian Belief:** ${data.contrarian}

## ICP (Ideal Customer Profile)
- **Target Audience:** ${data.icp}
- **Their Biggest Pain:** ${data.pain}
- **Their Misconception:** ${data.misconception}
- **Desired Outcome (for reader):** ${data.desired_outcome}

## Voice
- **Tone (3 words):** ${data.tone}
- **Voice References:** ${data.references}
- **Content Pillars:** ${data.pillars}
- **Off-Limits Topics:** ${data.offlimits || 'None'}

## Content Bank
- **Hard Lesson:** ${data.lesson}
- **Untold Win:** ${data.win}
- **Hot Take:** ${data.hottake}
- **Repeating Question:** ${data.repeating}

---

## How to Use This File

Paste this into Claude, ChatGPT, or any AI tool when generating content. Start your prompt with:

> "Here's my voice profile. Use this to write content in my voice:"

Then paste everything above.

For posts, add:
> "Write a LinkedIn post about [TOPIC]. Make it punchy, use short paragraphs, and start with a hook that stops the scroll."

For ideas, add:
> "Based on my content pillars and content bank, give me 10 post ideas I could write this week."

---

## The Last 20%

This voice profile gets you 80% of the way there. You can generate decent posts, stay on brand, and build momentum.

But the last 20% — the refinement, the strategy, knowing what to post when, the DMs, the engagement system, the full pipeline — that's what separates founders who post from founders who close deals.

If you want help with that, reach out to Dudu: [YOUR LINK HERE]
`;
};

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

export default function Linkyboss() {
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateTyping = (callback, delay = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const startInterview = () => {
    if (!name.trim()) return;
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
        setMessages(prev => [...prev, { type: 'bot', text: step.message }]);
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
        setMessages(prev => [...prev, { type: 'bot', text: step.template(dataToUse) }]);
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
      }, 1500);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput('');

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) return;

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
    URL.revokeObjectURL(url);
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
        </div>

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
              Answer 15 questions about your business, audience, and style.
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
                onKeyPress={(e) => e.key === 'Enter' && startInterview()}
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
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          maxWidth: '700px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
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
          padding: '20px 32px',
          borderTop: `1px solid ${colors.border}`
        }}>
          <div style={{
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer and press Enter"
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
              onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
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
              disabled={!email || !email.includes('@') || isSending}
              style={{
                width: '100%',
                background: email && email.includes('@') && !isSending ? colors.accent : colors.bgInput,
                border: 'none',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 500,
                color: email && email.includes('@') && !isSending ? colors.textPrimary : colors.textMuted,
                borderRadius: '8px',
                cursor: email && email.includes('@') && !isSending ? 'pointer' : 'not-allowed',
                marginBottom: '16px',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (email && email.includes('@') && !isSending) {
                  e.target.style.background = colors.accentHover;
                }
              }}
              onMouseOut={(e) => {
                if (email && email.includes('@') && !isSending) {
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
              }}>
                {voiceProfile}
              </pre>
            </div>
          </div>

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
}
