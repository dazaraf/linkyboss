/**
 * Generates a markdown voice profile from interview answers.
 * Shared between client (app/page.js) and server (API routes).
 *
 * Supports both new field names (identity, audience, voice, content_bank)
 * and legacy field names (role, origin, icp, pain, etc.) for backward compatibility.
 *
 * @param {Object} data - The interview answers
 * @returns {string} Rendered markdown voice profile
 */
export function generateVoiceProfile(data) {
  // Map new fields to old fields for backward compatibility
  const identity = data.identity || [data.role, data.origin].filter(Boolean).join(' | ') || '';
  const contrarian = data.contrarian || '';
  const lesson = data.lesson || '';
  const audience = data.audience || [data.icp, data.pain, data.misconception].filter(Boolean).join(' | ') || '';
  const desired_outcome = data.desired_outcome || '';
  const voice = data.voice || [data.tone, data.references].filter(Boolean).join(' | ') || '';
  const pillars = data.pillars || '';
  const offlimits = data.offlimits || 'None';
  const content_bank = data.content_bank || [data.win, data.hottake, data.repeating].filter(Boolean).join(' | ') || '';

  return `# Voice Profile: ${data.name}

## Identity
- **Who they are & how they got here:** ${identity}
- **Contrarian Belief:** ${contrarian}
- **Hard-Won Lesson:** ${lesson}

## Audience
- **Who they're writing for:** ${audience}
- **Desired Outcome (for reader):** ${desired_outcome}

## Voice & Style
- **Voice & References:** ${voice}
- **Content Pillars:** ${pillars}
- **Off-Limits Topics:** ${offlimits}

## Content Bank
${content_bank}

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
}
