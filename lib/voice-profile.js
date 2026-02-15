/**
 * Generates a markdown voice profile from interview answers.
 * Shared between client (app/page.js) and server (API routes).
 *
 * @param {Object} data - The interview answers
 * @returns {string} Rendered markdown voice profile
 */
export function generateVoiceProfile(data) {
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
}
