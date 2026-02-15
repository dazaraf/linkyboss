/**
 * AI Content Studio - Prompt Engineering & Authenticity Scoring
 *
 * Anti-AI-slop philosophy: content must feel organic, human, and grounded
 * in the founder's actual interview data. No generic filler. No corporate speak.
 */

// ── Banned Phrases ──────────────────────────────────────────────────────────
// 50+ phrases that instantly signal AI-generated content
export const BANNED_PHRASES = [
  "in today's fast-paced",
  "in today's rapidly evolving",
  "let's dive in",
  "let's dive deep",
  "without further ado",
  "game-changer",
  "game changer",
  "it's not just about",
  "at the end of the day",
  "here's the thing",
  "the truth is",
  "I'll be honest",
  "hot take:",
  "unpopular opinion:",
  "buckle up",
  "mind-blowing",
  "mind blowing",
  "groundbreaking",
  "revolutionary",
  "paradigm shift",
  "synergy",
  "leverage",
  "circle back",
  "move the needle",
  "low-hanging fruit",
  "think outside the box",
  "raise the bar",
  "deep dive",
  "unpack this",
  "let me unpack",
  "this is huge",
  "I'm thrilled to announce",
  "thrilled to share",
  "excited to announce",
  "humbled and honored",
  "incredibly grateful",
  "couldn't be more proud",
  "it goes without saying",
  "needless to say",
  "in a nutshell",
  "the bottom line is",
  "food for thought",
  "stay tuned",
  "agree?",
  "thoughts?",
  "am I wrong?",
  "let that sink in",
  "read that again",
  "I said what I said",
  "full stop",
  "period.",
  "iykyk",
  "just saying",
  "not gonna lie",
  "here's why this matters",
  "and here's the kicker",
  "plot twist",
  "spoiler alert",
  "pro tip",
  "hack:",
  "cheat code",
  "secret sauce",
  "the real mvp",
  "unlock your potential",
  "level up",
  "crush it",
  "killing it",
  "smash that",
  "drop a comment",
  "share if you agree",
  "repost if this resonates",
  "tag someone who needs this",
  "follow me for more",
  "if you found this helpful",
  "save this for later",
  "bookmark this",
];

// ── Post Type Configuration ─────────────────────────────────────────────────
export const POST_TYPE_CONFIG = {
  story: {
    label: "Story",
    description: "Personal narrative with a lesson",
    formatRules: [
      "Start with a specific moment in time (date, place, or situation)",
      "Use first person throughout",
      "Include dialogue or inner thoughts where natural",
      "End with a concrete takeaway, not a platitude",
      "Keep paragraphs to 1-2 lines max for LinkedIn readability",
      "The hook (first line) must create tension or curiosity",
    ],
    maxLength: 2800,
  },
  insight: {
    label: "Insight",
    description: "Sharp observation from experience",
    formatRules: [
      "Lead with the insight, not the backstory",
      "Support with one specific example from your experience",
      "Use short, declarative sentences",
      "Avoid hedging language (maybe, perhaps, I think)",
      "End with an actionable point or a reframe",
      "Keep under 1500 characters for punchiness",
    ],
    maxLength: 1500,
  },
  contrarian: {
    label: "Contrarian Take",
    description: "Challenge conventional wisdom",
    formatRules: [
      "Open with the conventional belief you are challenging",
      "State your opposing view clearly in the second paragraph",
      "Back it up with evidence from your own work, not theory",
      "Acknowledge the nuance - do not strawman the other side",
      "Close with what you do instead",
      "Tone: confident but not arrogant, direct but not dismissive",
    ],
    maxLength: 2200,
  },
  listicle: {
    label: "Listicle",
    description: "Numbered list with substance",
    formatRules: [
      "Start with a hook that frames why this list matters",
      "Each item must be specific and actionable, not generic advice",
      "Use odd numbers (5, 7, 9) - they perform better",
      "Each point gets 1-2 sentences max",
      "Add a brief personal context to at least 2 items",
      "End with a single sentence that ties it together",
    ],
    maxLength: 2500,
  },
  question: {
    label: "Question",
    description: "Provocative question that sparks discussion",
    formatRules: [
      "Open with 2-3 sentences of context that frame the tension",
      "Ask the question clearly in its own paragraph",
      "Share your own answer or lean briefly",
      "Keep the whole post under 800 characters",
      "The question should be genuinely debatable, not leading",
      "Do not answer your own question fully - leave room for engagement",
    ],
    maxLength: 800,
  },
  case_study: {
    label: "Case Study",
    description: "Before/after transformation with specifics",
    formatRules: [
      "Start with the problem state - be specific about numbers or pain",
      "Describe what changed (the action taken)",
      "Show the result with specifics",
      "Structure: Situation > Action > Result > Lesson",
      "Include at least one real metric or timeframe",
      "End with the principle, not a pitch",
    ],
    maxLength: 2800,
  },
};

// ── System Prompt Builder ───────────────────────────────────────────────────
export function buildSystemPrompt(profileData) {
  const p = profileData || {};
  const bannedList = BANNED_PHRASES.slice(0, 30).join('", "');

  return `You are a ghostwriter for a specific person. Your job is to write LinkedIn posts that sound exactly like them - not like an AI, not like a copywriter, not like a LinkedIn influencer. Like THEM.

## WHO YOU ARE WRITING FOR

Name: ${p.name || "Unknown"}
Role: ${p.role || "Not specified"}

### Their Origin Story
${p.origin || "Not provided"}

### Their Contrarian Belief
${p.contrarian || "Not provided"}

### Their Target Audience (ICP)
${p.icp || "Not provided"}

### The Pain Their Audience Feels
${p.pain || "Not provided"}

### What Their Audience Gets Wrong
${p.misconception || "Not provided"}

### Desired Outcome For Readers
${p.desired_outcome || "Not provided"}

### Their Tone (in their own words)
${p.tone || "Not provided"}

### People They Admire Online
${p.references || "Not provided"}

### Their Content Pillars
${p.pillars || "Not provided"}

### Off-Limits Topics
${p.offlimits || "None"}

### Hard Lesson They Learned
${p.lesson || "Not provided"}

### Win They Haven't Talked About
${p.win || "Not provided"}

### Hot Take They're Sitting On
${p.hottake || "Not provided"}

### Question People Keep Asking Them
${p.repeating || "Not provided"}

## VOICE RULES

1. Write in THEIR voice, not yours. Match the tone they described: ${p.tone || "direct and real"}.
2. Use their actual stories, beliefs, and experiences as raw material. Reference specifics from their interview data above.
3. Short paragraphs. 1-2 lines each. LinkedIn is a mobile-first platform.
4. First line is everything. It must stop the scroll. No warm-up sentences.
5. Write like a human text message to a smart friend, not like a press release.
6. Be specific. Replace every generic claim with a specific example, number, or moment.
7. No hashtags unless the user explicitly asks.
8. No emojis unless the user explicitly asks.
9. No "follow me" or engagement-bait CTAs at the end.
10. Active voice only. Kill passive constructions.
11. Vary sentence length. Mix punchy 3-word fragments with longer explanatory sentences.
12. End with substance, not fluff. The last line should land like a punchline or a truth bomb.

## ABSOLUTE BANS

Never use any of these phrases or close variations: "${bannedList}"

These phrases are the hallmark of AI-generated content. If you catch yourself writing one, delete it and write something specific to this person instead.

## FORMAT

- LinkedIn text only. No markdown formatting, no headers, no bold, no bullet points with dashes.
- Line breaks between paragraphs (double newline).
- Keep posts within the character limit specified in the user prompt.
- Do not include a post title or label.
- Output ONLY the post text. Nothing else. No preamble, no "here's your post", no sign-off.`;
}

// ── User Prompt Builder ─────────────────────────────────────────────────────
export function buildUserPrompt(postType, topic, additionalContext) {
  const config = POST_TYPE_CONFIG[postType];
  if (!config) {
    throw new Error(`Unknown post type: ${postType}`);
  }

  const formatInstructions = config.formatRules.map((r, i) => `${i + 1}. ${r}`).join("\n");

  let prompt = `Write a LinkedIn post.

Post type: ${config.label} - ${config.description}
Topic: ${topic}
Max length: ${config.maxLength} characters

Format rules for this post type:
${formatInstructions}`;

  if (additionalContext && additionalContext.trim()) {
    prompt += `\n\nAdditional context from the user:\n${additionalContext.trim()}`;
  }

  prompt += `\n\nRemember: output ONLY the post text. No labels, no commentary, no quotation marks around it.`;

  return prompt;
}

// ── Authenticity Scoring ────────────────────────────────────────────────────
export function scoreAuthenticity(content, profileData) {
  if (!content || typeof content !== "string") {
    return { score: 0, flags: ["No content to score"] };
  }

  let score = 100;
  const flags = [];
  const lowerContent = content.toLowerCase();

  // Check for banned phrases (-3 each)
  let bannedCount = 0;
  for (const phrase of BANNED_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      bannedCount++;
      score -= 3;
    }
  }
  if (bannedCount > 0) {
    flags.push(`${bannedCount} AI-slop phrase${bannedCount > 1 ? "s" : ""} detected`);
  }

  // Check passive voice ratio (>30% = -5)
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const passivePattern = /\b(is|are|was|were|be|been|being)\s+(being\s+)?\w+ed\b/i;
  let passiveCount = 0;
  for (const sentence of sentences) {
    if (passivePattern.test(sentence)) {
      passiveCount++;
    }
  }
  const passiveRatio = sentences.length > 0 ? passiveCount / sentences.length : 0;
  if (passiveRatio > 0.3) {
    score -= 5;
    flags.push("Too much passive voice");
  }

  // Check average sentence length (>20 words = -5)
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  if (avgSentenceLength > 20) {
    score -= 5;
    flags.push("Sentences too long on average");
  }

  // Check for generic openers (-10)
  const genericOpeners = [
    "in today's",
    "in the world of",
    "as a society",
    "when it comes to",
    "there's no denying",
    "we all know that",
    "it's no secret that",
    "in an era of",
    "in this day and age",
    "as we navigate",
  ];
  const firstLine = content.split("\n")[0].toLowerCase();
  for (const opener of genericOpeners) {
    if (firstLine.startsWith(opener)) {
      score -= 10;
      flags.push("Generic opener detected");
      break;
    }
  }

  // Check hashtag/emoji overload (-5)
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (content.match(emojiPattern) || []).length;
  if (hashtagCount > 3 || emojiCount > 5) {
    score -= 5;
    flags.push(hashtagCount > 3 ? "Too many hashtags" : "Too many emojis");
  }

  // Bonus: references founder's actual content (+5)
  if (profileData) {
    const founderSignals = [
      profileData.origin,
      profileData.lesson,
      profileData.win,
      profileData.hottake,
      profileData.contrarian,
      profileData.repeating,
    ].filter(Boolean);

    let usedFounderContent = false;
    for (const signal of founderSignals) {
      // Check if any meaningful chunk of their interview data appears in the content
      const signalWords = signal.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      let matchCount = 0;
      for (const word of signalWords) {
        if (lowerContent.includes(word)) {
          matchCount++;
        }
      }
      // If at least 30% of significant words match, count it
      if (signalWords.length > 0 && matchCount / signalWords.length > 0.3) {
        usedFounderContent = true;
        break;
      }
    }

    if (usedFounderContent) {
      score += 5;
      flags.push("Uses founder's real experience");
    }

    // Bonus: tone matching (+3)
    if (profileData.tone) {
      const toneWords = profileData.tone
        .toLowerCase()
        .split(/[,;\s]+/)
        .filter((w) => w.length > 3);
      // Check if the writing style loosely matches described tone
      // Simple heuristic: if tone says "direct" check for short sentences, etc.
      const hasShortParagraphs = content.split("\n\n").length >= 3;
      const hasVariedLength = sentences.length > 2;
      if (hasShortParagraphs && hasVariedLength && toneWords.length > 0) {
        score += 3;
        flags.push("Tone alignment detected");
      }
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return { score, flags };
}
