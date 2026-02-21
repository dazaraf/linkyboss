/**
 * AI Content Studio - Prompt Engineering & Authenticity Scoring
 *
 * Anti-AI-slop philosophy: content must feel organic, human, and grounded
 * in the founder's actual interview data. No generic filler. No corporate speak.
 *
 * Integrates the LinkedIn Banger Playbook for hook formulas, writing style,
 * STIL narrative framework, and post-type strategic intent.
 */

import playbook from './playbook.json';

// ── Playbook-Driven Prompt Helpers (private) ────────────────────────────────

function getHookGuidance() {
  const formulas = playbook.hookFormulas
    .map((f, i) => `${i + 1}. ${f.name} — ${f.description} E.g. "${f.examples[0]}"`)
    .join("\n");

  const rules = playbook.hookRules.map((r) => `- ${r}`).join("\n");

  return `## HOOK FORMULAS

Your first line decides everything. Use one of these proven patterns:

${formulas}

Hook rules:
${rules}`;
}

function getMissAvoidance() {
  const misses = playbook.postTypeGuidance.misses
    .map((m) => `- ${m.type}: ${m.whyItFails}`)
    .join("\n");

  return `## POST TYPES TO AVOID

Never produce content that falls into these patterns:
${misses}`;
}

function getSTILGuidance() {
  const phases = playbook.stilFramework.phases
    .map((p) => `- ${p.name}: ${p.description.split(".")[0]}.`)
    .join("\n");

  return `Narrative structure (STIL):
Follow this structure without labeling the sections:
${phases}`;
}

function getStrategicIntent(postType) {
  const intents = {
    story: "Deliver a hard-won lesson from personal experience — specific, costly, and real.",
    insight: "Share a sharp observation that reframes how the reader thinks about a topic.",
    contrarian: "Challenge conventional wisdom with a clear opposing view backed by experience or data.",
    listicle: "Make a complex topic simple and actionable. Earn authority by explaining without jargon.",
    question: "Surface a genuine tension in the industry that sparks debate.",
    case_study: "Show a before/after transformation with real specifics.",
  };
  return intents[postType] || "";
}

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
    temperature: 0.85,
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
    temperature: 0.70,
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
    temperature: 0.80,
  },
  listicle: {
    label: "Listicle",
    description: "Numbered list with substance",
    formatRules: [
      "Start with a hook that frames why this list matters",
      "Each item must be specific and actionable, not generic advice",
      "Use odd numbers (5, 7, 9) - they perform better",
      "Each point gets 1-2 sentences max",
      "If the topic directly relates to your personal experience or your business, you may add brief personal context to 1-2 items. If the topic is external (market analysis, price movements, industry trends, technical how-to), keep all items factual. Do NOT inject personal anecdotes into external-topic listicles.",
      "End with a single sentence that ties it together",
    ],
    maxLength: 2500,
    temperature: 0.60,
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
    temperature: 0.75,
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
    temperature: 0.60,
  },
};

// ── Topic Classification ────────────────────────────────────────────────────
export function classifyTopicType(topic, postType) {
  if (postType === "story" || postType === "case_study") return "personal";
  const lowerTopic = topic.toLowerCase();
  const externalSignals = [
    /\bprice\b/, /\bmarket\b/, /\bbtc\b/, /\beth\b/, /\bcrypto\b/, /\bbitcoin\b/,
    /\btrading\b/, /\banalysis\b/, /\btrend\b/, /\bindustry\b/, /\beconomy\b/,
    /\bregulat/, /\bsec\b/, /\bfed\b/, /\binterest rate\b/, /\binflation\b/,
    /\bdefi\b/, /\bnft\b/, /\btoken\b/, /\bblockchain tech/, /\bhow to\b/,
    /\b\d+ (tips|mistakes|lessons|ways|steps)\b/,
  ];
  return externalSignals.some((p) => p.test(lowerTopic)) ? "external" : "personal";
}

// ── System Prompt Builder ───────────────────────────────────────────────────
export function buildSystemPrompt(profileData) {
  const p = profileData || {};
  const bannedList = BANNED_PHRASES.slice(0, 30).join('", "');

  // Support both new and legacy field names
  const identity = p.identity || [p.role, p.origin].filter(Boolean).join(' — ') || "Not provided";
  const contrarian = p.contrarian || "Not provided";
  const lesson = p.lesson || "Not provided";
  const audience = p.audience || [p.icp, p.pain, p.misconception].filter(Boolean).join(' — ') || "Not provided";
  const desired_outcome = p.desired_outcome || "Not provided";
  const voice = p.voice || [p.tone, p.references].filter(Boolean).join(' — ') || "Not provided";
  const pillars = p.pillars || "Not provided";
  const offlimits = p.offlimits || "None";
  const content_bank = p.content_bank || [p.win, p.hottake, p.repeating].filter(Boolean).join(' — ') || "Not provided";

  return `You are a ghostwriter for a specific person. Your job is to write LinkedIn posts that sound exactly like them - not like an AI, not like a copywriter, not like a LinkedIn influencer. Like THEM.

## WHO YOU ARE WRITING FOR

Name: ${p.name || "Unknown"}

### Identity — Who They Are & How They Got Here
${identity}

### Their Contrarian Belief
${contrarian}

### Hard-Won Lesson (Costs Them Real Time/Money/Pain)
${lesson}

### Their Target Audience — Who, What Stage, What's Killing Them
${audience}

### Desired Outcome For Readers
${desired_outcome}

### Voice — How They Sound & Who They Admire
${voice}

### Their Content Pillars
${pillars}

### Off-Limits Topics
${offlimits}

### Content Bank — Wins, Hot Takes, FAQs
${content_bank}

## WRITING STYLE

${playbook.writingStyleRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}
${playbook.writingStyleRules.length + 1}. Use their actual stories, beliefs, and experiences as raw material. Reference specifics from their interview data above.
${playbook.writingStyleRules.length + 2}. Write in THEIR voice, not yours. Match the tone described in their voice profile: ${voice}.

${getHookGuidance()}

## ABSOLUTE BANS

Never use any of these phrases or close variations: "${bannedList}"

These phrases are the hallmark of AI-generated content. If you catch yourself writing one, delete it and write something specific to this person instead.

${getMissAvoidance()}

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
  const topicCategory = classifyTopicType(topic, postType);

  const strategicIntent = getStrategicIntent(postType);

  let prompt = `Write a LinkedIn post.

Post type: ${config.label} - ${config.description}
Strategic intent: ${strategicIntent}
Topic: ${topic}
Topic category: ${topicCategory === "external" ? "EXTERNAL (market/industry/technical — do not inject personal anecdotes)" : "PERSONAL (your own experience — use profile data freely)"}
Max length: ${config.maxLength} characters

Format rules for this post type:
${formatInstructions}${postType === 'story' || postType === 'case_study' ? '\n\n' + getSTILGuidance() : ''}`;

  if (additionalContext && additionalContext.trim()) {
    prompt += `\n\nAdditional context from the user:\n${additionalContext.trim()}`;
  }

  prompt += `\n\nRemember: output ONLY the post text. No labels, no commentary, no quotation marks around it.`;

  return prompt;
}

// ── Authenticity Scoring ────────────────────────────────────────────────────
export function scoreAuthenticity(content, profileData, postType = null, topic = null) {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
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
  const firstLineNormalized = firstLine.replace(/[\u2019']/g, "");
  for (const opener of genericOpeners) {
    const openerNormalized = opener.replace(/[\u2019']/g, "");
    if (firstLine.startsWith(opener) || firstLineNormalized.startsWith(openerNormalized)) {
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
      profileData.identity,
      profileData.origin,
      profileData.lesson,
      profileData.content_bank,
      profileData.win,
      profileData.hottake,
      profileData.contrarian,
      profileData.repeating,
      profileData.audience,
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

    const topicCategory = postType && topic ? classifyTopicType(topic, postType) : "personal";

    if (usedFounderContent && topicCategory === "personal") {
      score += 5;
      flags.push("Uses founder's real experience");
    } else if (usedFounderContent && topicCategory === "external") {
      score -= 5;
      flags.push("Personal anecdotes injected into external-topic post");
    }

    // Bonus: tone matching (+3)
    const toneSource = profileData.voice || profileData.tone;
    if (toneSource) {
      const toneWords = toneSource
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

  // ── LinkedIn Banger Playbook Checks ─────────────────────────────────────

  // 1. Hook length check - first line should be punchy, not a paragraph
  const hookLine = content.split("\n")[0] || "";
  if (hookLine.length > 160) {
    score -= 5;
    flags.push("Hook too long");
  }

  // 2. Question hook penalty - questions are weak openers on LinkedIn
  if (hookLine.trimEnd().endsWith("?")) {
    score -= 5;
    flags.push("Question hook (weak open)");
  }

  // 3. Engagement bait CTA detection - check tail of post
  const tail = lowerContent.slice(-200);
  const engagementBaitPhrases = [
    "comment below",
    "share this",
    "repost if you agree",
    "tag someone",
    "like if you",
    "follow me for",
    "drop a comment",
    "drop a like",
    "drop a follow",
    "let me know in the comments",
  ];
  for (const bait of engagementBaitPhrases) {
    if (tail.includes(bait)) {
      score -= 5;
      flags.push("Engagement bait CTA");
      break;
    }
  }

  // 4. Specificity signal check - numbers, percentages, dollar amounts, years
  const specificityPatterns = [/\d+%/, /\$[\d,]+/, /\b\d{4}\b/, /\b\d+\s*(x|k|m|million|billion)\b/i, /\b\d+\s*(hours?|days?|weeks?|months?|years?|people|employees|customers|users|clients)\b/i];
  let specificityHits = 0;
  for (const pat of specificityPatterns) {
    const matches = content.match(new RegExp(pat.source, pat.flags + "g"));
    if (matches) {
      specificityHits += matches.length;
    }
  }
  if (specificityHits === 0) {
    score -= 5;
    flags.push("Lacks specificity");
  } else if (specificityHits >= 3) {
    score += 3;
    flags.push("Strong specificity");
  }

  // 5. Announcement pattern detection - low engagement format
  const first100 = lowerContent.slice(0, 100);
  const announcementPhrases = [
    "excited to announce",
    "thrilled to share",
    "proud to",
    "happy to announce",
    "big news",
    "i'm pleased to",
    "im pleased to",
  ];
  // Use regex word boundaries to prevent substring false positives
  // e.g. "proud to" should not match "proud together"
  const announcementRegexes = announcementPhrases.map(
    (ann) => new RegExp(`\\b${ann.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  );
  for (let idx = 0; idx < announcementPhrases.length; idx++) {
    const ann = announcementPhrases[idx];
    if (announcementRegexes[idx].test(first100)) {
      // Skip if already penalized via BANNED_PHRASES to avoid double penalty
      const alreadyBanned = BANNED_PHRASES.some(
        (bp) => bp.toLowerCase() === ann || ann.includes(bp.toLowerCase())
      );
      if (alreadyBanned && bannedCount > 0) {
        score -= 7;
      } else {
        score -= 10;
      }
      flags.push("Announcement pattern (low engagement)");
      break;
    }
  }

  // 6. First-person voice check - corporate "we" vs personal "I"
  const weCount = (lowerContent.match(/\bwe\b/g) || []).length;
  const iCount = (lowerContent.match(/\bi\b/g) || []).length;
  if (weCount > iCount) {
    score -= 5;
    flags.push("Corporate 'we' voice");
  }

  // 7. Ending question quality - strong contextual vs weak generic
  const allSentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (allSentences.length > 0) {
    const lastSentence = allSentences[allSentences.length - 1].trim();
    if (lastSentence.endsWith("?")) {
      const lastWords = lastSentence.split(/\s+/);
      const lowerLast = lastSentence.toLowerCase();
      const isGeneric =
        lastWords.length < 5 ||
        lowerLast.includes("what do you think") ||
        lowerLast.includes("agree?") ||
        lowerLast === "thoughts?";
      if (isGeneric) {
        score -= 3;
        flags.push("Weak generic closing question");
      } else {
        score += 3;
        flags.push("Strong closing question");
      }
    }
  }

  // 8. Paragraph structure check - wall of text detection
  const paragraphBreaks = (content.match(/\n\n/g) || []).length;
  if (content.length > 500 && paragraphBreaks < 3) {
    score -= 5;
    flags.push("Wall of text - needs more breaks");
  }

  // 9. Post length floor - too short to deliver value
  if (content.length < 150) {
    score -= 5;
    flags.push("Post too short");
  }

  // 10. Hook formula pattern detection - check for proven hook structures
  const lowerHook = hookLine.toLowerCase();
  const hedgingWords = /\b(i think|maybe|perhaps|might|could be|possibly)\b/i;
  const hasNumber = /\d+/.test(hookLine);
  const hasContrarianWord = /\b(stop|don't|dont|wrong|myth|nobody|unpopular)\b/i.test(hookLine);
  const hasBoldStatement = !hedgingWords.test(hookLine) && hookLine.length > 10 && /[.!]$/.test(hookLine.trim());
  const hasStrongVerb = /\b(built|lost|quit|fired|sold|learned|failed|shipped|launched|earned|spent|wasted|doubled|tripled)\b/i.test(hookLine);

  if (hasNumber || hasContrarianWord || hasBoldStatement) {
    score += 5;
    flags.push("Strong hook formula");
  } else if (!hasStrongVerb && !hasNumber) {
    // Skip weak hook penalty if question hook was already penalized
    if (!flags.includes("Question hook (weak open)")) {
      score -= 5;
      flags.push("Weak hook - no formula detected");
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return { score, flags };
}
