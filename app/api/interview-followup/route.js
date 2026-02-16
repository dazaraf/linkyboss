const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API;

const FOLLOW_UP_PROMPTS = {
  identity: {
    system: `You are a founder branding interviewer. The user just answered a question about who they are and how they got here. Your job is to extract specificity.

Rules:
- If their answer is generic (e.g. "I'm a CEO" with no origin story), ask about the turning point: what made them start this instead of staying on the safe path?
- If their answer already has a specific origin story with detail, affirm it and return null for followUp.
- Keep your follow-up to ONE question, max 2 sentences.
- Be conversational, not formal. Sound like a sharp interviewer, not a therapist.`,
  },
  contrarian: {
    system: `You are a founder branding interviewer. The user just shared a contrarian belief about their industry. Your job is to push for the spicier version.

Rules:
- If their take is mild or something most people would agree with, push: ask for the version that might actually get pushback.
- If their take is already bold and specific, affirm it and return null for followUp.
- Keep your follow-up to ONE question, max 2 sentences.
- Be direct and a little provocative yourself.`,
  },
  lesson: {
    system: `You are a founder branding interviewer. The user just shared a hard-won lesson. Your job is to extract the specific story behind it.

Rules:
- Ask for the specific moment — the call, the email, the number, the day — when they realized this lesson.
- If they already gave vivid specifics (names, numbers, dates, scenes), affirm and return null for followUp.
- Keep your follow-up to ONE question, max 2 sentences.
- You want the story, not the moral.`,
  },
  audience: {
    system: `You are a founder branding interviewer. The user just described their ideal audience. Your job is to make it concrete.

Rules:
- If their description is vague (e.g. "startup founders"), ask them to give a name (real or made up) and describe that person's Monday morning before they found the user.
- If they already gave specifics (job title, stage, specific pain), affirm and return null for followUp.
- Keep your follow-up to ONE question, max 2 sentences.`,
  },
  voice: {
    system: `You are a founder branding interviewer. The user just described their desired tone and content references. Your job is to push past generic tone words.

Rules:
- If their tone words are generic ("professional", "authentic", "engaging", "relatable"), challenge them: ask what personality their content would have if it were a person — sarcastic mentor? blunt older sibling? calm surgeon?
- If they gave vivid, specific tone words AND named real references, affirm and return null for followUp.
- Keep your follow-up to ONE question, max 2 sentences.`,
  },
  content_bank: {
    system: `You are a founder branding interviewer. The user just shared one content bank item (a win, hot take, or FAQ). Your job is to get a second one.

Rules:
- Based on what they shared, ask for one of the OTHER two types they didn't pick.
- If they shared a win, ask for a hot take or FAQ.
- If they shared a hot take, ask for a win or FAQ.
- If they shared an FAQ, ask for a win or hot take.
- Keep it to ONE quick request, max 2 sentences. Frame it as "just a sentence or two is fine."`,
  },
};

export async function POST(request) {
  try {
    const { question, answer, phase, field } = await request.json();

    if (!answer || !field) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const config = FOLLOW_UP_PROMPTS[field];
    if (!config) {
      return Response.json({ followUp: null, affirmation: "Got it." });
    }

    if (!DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API env var not set");
      return Response.json(
        { error: "AI service not configured. Please contact support." },
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.7,
          max_tokens: 200,
          messages: [
            { role: "system", content: config.system },
            {
              role: "user",
              content: `Question asked: "${question}"\n\nTheir answer: "${answer}"\n\nRespond with JSON only: { "followUp": "your follow-up question or null if answer was already specific enough", "affirmation": "a 1-sentence acknowledgment of their answer" }`,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("DeepSeek API error:", res.status, errorText);

        if (res.status === 429) {
          return Response.json(
            { error: "AI service is busy. Please try again in a moment." },
            { status: 429 }
          );
        }

        if (res.status >= 500) {
          return Response.json(
            { error: "AI service is temporarily unavailable." },
            { status: 503 }
          );
        }

        return Response.json({ followUp: null, affirmation: "Got it." });
      }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response — handle markdown code blocks
    let parsed;
    try {
      const jsonStr = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, treat the whole response as a follow-up
      return Response.json({
        followUp: content.length > 10 ? content : null,
        affirmation: "Got it.",
      });
    }

      return Response.json({
        followUp: parsed.followUp || null,
        affirmation: parsed.affirmation || "Got it.",
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error("DeepSeek API timeout");
        return Response.json(
          { error: "AI service took too long to respond. Please try again." },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Interview followup error:", error);

    if (error.name === 'SyntaxError') {
      return Response.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
