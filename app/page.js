'use client';

import React, { useState, useRef, useEffect } from 'react';

const INTERVIEW_FLOW = [
  { id: 'q1_intro', type: 'bot', message: "Let's go.\n\nWhat's your name?" },
  { id: 'q1', type: 'question', field: 'name', message: null },
  { 
    id: 'q1_response', 
    type: 'dynamic',
    template: (data) => `${data.name.toUpperCase()}, WHAT IS YOUR PROFESSION?! AHOOO AHOOO AHOOO\n\n(Sorry, I really love Gerard Butler in 300.)\n\nBut seriously. What do you do? What's your role and company?`
  },
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

export default function Linkyboss() {
  const [stage, setStage] = useState('landing');
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState('');
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
    if (!email || !email.includes('@')) return;
    setStage('chat');
    setTimeout(() => {
      processStep(0);
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
        setStage('complete');
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

  const downloadProfile = () => {
    const blob = new Blob([voiceProfile], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-profile-${userData.name?.toLowerCase().replace(/\s+/g, '-') || 'founder'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Landing Page - Centered Style
  if (stage === 'landing') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative'
      }}>
        {/* Amber gradient glow */}
        <div className="amber-glow" />

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
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600
            }}>✦</div>
            <div style={{ color: '#fff', fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
          </div>

          <button style={{
            background: 'transparent',
            border: '1px solid #333',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#a0a0a0',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            Open Control Center
          </button>
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
          <div style={{ fontSize: '32px', marginBottom: '24px' }}>✦</div>

          <h1 style={{
            fontSize: '48px',
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 16px 0',
            letterSpacing: '-1px'
          }}>
            Linkyboss
          </h1>

          <p style={{
            fontSize: '20px',
            color: '#a0a0a0',
            margin: '0 0 32px 0',
            maxWidth: '500px',
            lineHeight: 1.5
          }}>
            Find your founder voice.<br />
            Create content that sounds like you.
          </p>

          <button
            onClick={() => setStage('email')}
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              padding: '16px 32px',
              fontSize: '15px',
              fontWeight: 500,
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#4a4a4a';
              e.target.style.background = '#222';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#333';
              e.target.style.background = '#1a1a1a';
            }}
          >
            Start Interview
          </button>

          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: '0'
          }}>
            Takes 7 minutes. Worth every second.
          </p>
        </div>
      </div>
    );
  }

  // Email Capture
  if (stage === 'email') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Amber gradient glow */}
        <div className="amber-glow" />

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
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600
            }}>✦</div>
            <div style={{ color: '#fff', fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button style={{
              background: 'transparent',
              border: '1px solid #333',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#a0a0a0',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Open Control Center
            </button>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0a0a0',
              fontSize: '14px',
              fontWeight: 500
            }}>U</div>
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
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#fff',
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px'
            }}>
              Before we start
            </h2>

            <p style={{
              fontSize: '15px',
              color: '#a0a0a0',
              margin: '0 0 32px 0',
              lineHeight: 1.5
            }}>
              Enter your email to receive your voice profile and weekly insights.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startInterview()}
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                background: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
            />

            <button
              onClick={startInterview}
              disabled={!email || !email.includes('@')}
              style={{
                width: '100%',
                background: email && email.includes('@') ? '#1a1a1a' : '#1a1a1a',
                border: email && email.includes('@') ? '1px solid #333' : '1px solid #2a2a2a',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 500,
                color: email && email.includes('@') ? '#fff' : '#666',
                borderRadius: '8px',
                cursor: email && email.includes('@') ? 'pointer' : 'not-allowed',
                marginBottom: '16px'
              }}
              onMouseOver={(e) => {
                if (email && email.includes('@')) {
                  e.target.style.borderColor = '#4a4a4a';
                }
              }}
              onMouseOut={(e) => {
                if (email && email.includes('@')) {
                  e.target.style.borderColor = '#333';
                }
              }}
            >
              Continue
            </button>

            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: '0',
              textAlign: 'center'
            }}>
              No spam. Just value.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Chat Interface
  if (stage === 'chat') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600
            }}>✦</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 500, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Linkyboss
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block'
                }} />
                <span style={{ color: '#a0a0a0', fontSize: '13px', fontWeight: 400 }}>
                  {isTyping ? 'typing...' : 'online'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button style={{
              background: 'transparent',
              border: '1px solid #333',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#a0a0a0',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Open Control Center ▼
            </button>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0a0a0',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}>▼</div>
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
                background: msg.type === 'user' ? '#2a2a2a' : '#1a1a1a',
                color: '#fff',
                fontSize: '15px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                border: '1px solid #333'
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
                background: '#1a1a1a',
                border: '1px solid #333',
                color: '#666',
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
          borderTop: '1px solid #1a1a1a'
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
                background: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
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
        background: '#0a0a0a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative'
      }}>
        {/* Amber gradient glow */}
        <div className="amber-glow" />

        {/* Header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px solid #1a1a1a',
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
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600
            }}>✦</div>
            <div style={{ color: '#fff', fontWeight: 500, fontSize: '15px' }}>Linkyboss</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button style={{
              background: 'transparent',
              border: '1px solid #333',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#a0a0a0',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Open Control Center
            </button>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#1a1a1a',
              border: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0a0a0',
              fontSize: '14px',
              fontWeight: 500
            }}>U</div>
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
          <h1 style={{
            fontSize: '32px',
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            Your voice profile is ready
          </h1>

          <p style={{
            fontSize: '15px',
            color: '#a0a0a0',
            margin: '0 0 32px 0'
          }}>
            Use this with any AI tool to create content that sounds like you.
          </p>

          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <pre style={{
              color: '#a0a0a0',
              fontSize: '13px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace"
            }}>
              {voiceProfile}
            </pre>
          </div>

          <button
            onClick={downloadProfile}
            style={{
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: 500,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#4a4a4a';
              e.target.style.background = '#222';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#333';
              e.target.style.background = '#1a1a1a';
            }}
          >
            Download profile
          </button>

          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '40px'
          }}>
            <p style={{
              color: '#fff',
              fontSize: '15px',
              margin: '0 0 12px 0',
              fontWeight: 500
            }}>
              This gets you 80% there.
            </p>
            <p style={{
              color: '#a0a0a0',
              fontSize: '14px',
              margin: '0 0 16px 0',
              lineHeight: 1.6
            }}>
              The last 20% is the refinement, the strategy, knowing what to post when, the DMs, the engagement system. That's what separates founders who post from founders who close deals.
            </p>
            <a
              href="#"
              style={{
                color: '#0077B5',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            >
              Want help with that? Let's talk →
            </a>
          </div>
        </div>
      </div>
    );
  }
}
