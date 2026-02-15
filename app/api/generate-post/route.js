import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { voiceProfiles, postDrafts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSystemPrompt,
  buildUserPrompt,
  scoreAuthenticity,
  POST_TYPE_CONFIG,
} from "@/lib/ai-prompts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { voiceProfileId, postType, topic, additionalContext } = body;

    // Validate required fields
    if (!voiceProfileId || !UUID_REGEX.test(voiceProfileId)) {
      return new Response(
        JSON.stringify({ error: "Valid voice profile ID is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!postType || !POST_TYPE_CONFIG[postType]) {
      return new Response(
        JSON.stringify({
          error: `Invalid post type. Must be one of: ${Object.keys(POST_TYPE_CONFIG).join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Topic is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (topic.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Topic must be under 1000 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (additionalContext !== undefined && additionalContext !== null) {
      if (typeof additionalContext !== "string") {
        return new Response(
          JSON.stringify({ error: "Additional context must be a string." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (additionalContext.length > 2000) {
        return new Response(
          JSON.stringify({ error: "Additional context must be under 2000 characters." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch voice profile and verify ownership
    const [profile] = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, voiceProfileId),
          eq(voiceProfiles.userId, session.user.id)
        )
      )
      .limit(1);

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Voice profile not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const profileData = profile.profileData || {};

    // Build prompts
    const systemPrompt = buildSystemPrompt(profileData);
    const userPrompt = buildUserPrompt(
      postType,
      topic.trim(),
      additionalContext || ""
    );

    // Initialize Anthropic client
    const anthropic = new Anthropic();

    // Create SSE stream
    const encoder = new TextEncoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream from Claude
          const messageStream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            temperature: 0.8,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          });

          messageStream.on("text", (text) => {
            fullContent += text;
            const data = JSON.stringify({ type: "delta", text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          });

          messageStream.on("end", async () => {
            try {
              // Run authenticity scoring
              const { score, flags } = scoreAuthenticity(
                fullContent,
                profileData
              );

              // Save draft to DB
              const [draft] = await db
                .insert(postDrafts)
                .values({
                  userId: session.user.id,
                  voiceProfileId: voiceProfileId,
                  postType,
                  topic: topic.trim(),
                  additionalContext: additionalContext || null,
                  generatedContent: fullContent,
                  authenticityScore: score,
                  authenticityFlags: flags,
                  status: "draft",
                })
                .returning();

              // Send score event
              const scoreData = JSON.stringify({
                type: "score",
                score,
                flags,
                draftId: draft.id,
              });
              controller.enqueue(encoder.encode(`data: ${scoreData}\n\n`));

              // Send done event
              const doneData = JSON.stringify({ type: "done" });
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));

              controller.close();
            } catch (dbErr) {
              console.error("Error saving draft:", dbErr);
              // Still send what we have
              const errorData = JSON.stringify({
                type: "score",
                score: 0,
                flags: ["Failed to save draft"],
                draftId: null,
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              const doneData = JSON.stringify({ type: "done" });
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
              controller.close();
            }
          });

          messageStream.on("error", (err) => {
            console.error("Stream error:", err);
            const errorData = JSON.stringify({
              type: "error",
              message: "Generation failed. Please try again.",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          });
        } catch (err) {
          console.error("Stream setup error:", err);
          const errorData = JSON.stringify({
            type: "error",
            message: "Failed to start generation.",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in generate-post:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
