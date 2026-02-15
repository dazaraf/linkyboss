import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { voiceProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid profile ID." },
        { status: 400 }
      );
    }

    const [profile] = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, id),
          eq(voiceProfiles.userId, session.user.id)
        )
      )
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: "Voice profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching voice profile:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid profile ID." },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const [existing] = await db
      .select({ id: voiceProfiles.id })
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, id),
          eq(voiceProfiles.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Voice profile not found." },
        { status: 404 }
      );
    }

    await db
      .delete(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, id),
          eq(voiceProfiles.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting voice profile:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
