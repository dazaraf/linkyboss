import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { voiceProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const DRAFT_NAME = "__INTERVIEW_DRAFT__";

// GET — load saved interview progress for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const [draft] = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.userId, session.user.id),
          eq(voiceProfiles.name, DRAFT_NAME),
          eq(voiceProfiles.isActive, false)
        )
      )
      .limit(1);

    if (!draft || !draft.profileData) {
      return NextResponse.json({ progress: null });
    }

    return NextResponse.json({ progress: draft.profileData });
  } catch (error) {
    console.error("Error loading interview progress:", error);

    // Check for database connection errors
    if (error.message?.includes('connection') || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: "Database connection error. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to load progress. Please refresh the page." },
      { status: 500 }
    );
  }
}

// POST — save interview progress for the current user (upsert)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const { userData, currentStep, messages, name, awaitingFollowUp } = body;

    if (!userData || typeof userData !== "object") {
      return NextResponse.json({ error: "Invalid progress data." }, { status: 400 });
    }

    if (typeof currentStep !== 'number' || currentStep < 0) {
      return NextResponse.json({ error: "Invalid step number." }, { status: 400 });
    }

    const progressData = { userData, currentStep, messages, name, awaitingFollowUp };

    // Check if a draft already exists
    const [existing] = await db
      .select({ id: voiceProfiles.id })
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.userId, session.user.id),
          eq(voiceProfiles.name, DRAFT_NAME),
          eq(voiceProfiles.isActive, false)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing draft
      await db
        .update(voiceProfiles)
        .set({ profileData: progressData, updatedAt: new Date() })
        .where(eq(voiceProfiles.id, existing.id));
    } else {
      // Create new draft
      await db.insert(voiceProfiles).values({
        userId: session.user.id,
        name: DRAFT_NAME,
        profileData: progressData,
        isActive: false,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving interview progress:", error);

    // Check for database connection errors
    if (error.message?.includes('connection') || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: "Database connection error. Progress saved locally only." },
        { status: 503 }
      );
    }

    // Check for database constraint errors
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: "Progress already exists. Please refresh the page." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save progress. Progress saved locally only." },
      { status: 500 }
    );
  }
}

// DELETE — clear saved interview progress
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await db
      .delete(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.userId, session.user.id),
          eq(voiceProfiles.name, DRAFT_NAME),
          eq(voiceProfiles.isActive, false)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error clearing interview progress:", error);

    // Check for database connection errors
    if (error.message?.includes('connection') || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: "Database connection error. Could not clear progress." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to clear progress. Please try again." },
      { status: 500 }
    );
  }
}
