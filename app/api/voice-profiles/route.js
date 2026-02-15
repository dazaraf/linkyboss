import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { voiceProfiles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateVoiceProfile } from "@/lib/voice-profile";

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const profileData = body.profileData;

    if (!name) {
      return NextResponse.json(
        { error: "Profile name is required." },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        { error: "Profile name must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    if (!profileData || typeof profileData !== "object" || Array.isArray(profileData)) {
      return NextResponse.json(
        { error: "Profile data is required." },
        { status: 400 }
      );
    }

    // Validate payload size: reject overly large profile data
    const profileDataStr = JSON.stringify(profileData);
    if (profileDataStr.length > 50000) {
      return NextResponse.json(
        { error: "Profile data is too large." },
        { status: 400 }
      );
    }

    // Generate the markdown voice profile from the raw interview data
    const generatedProfile = generateVoiceProfile(profileData);

    const [profile] = await db
      .insert(voiceProfiles)
      .values({
        userId: session.user.id,
        name,
        profileData,
        generatedProfile,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Error creating voice profile:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const profiles = await db
      .select({
        id: voiceProfiles.id,
        name: voiceProfiles.name,
        profileData: voiceProfiles.profileData,
        createdAt: voiceProfiles.createdAt,
        isActive: voiceProfiles.isActive,
      })
      .from(voiceProfiles)
      .where(eq(voiceProfiles.userId, session.user.id))
      .orderBy(desc(voiceProfiles.createdAt));

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error listing voice profiles:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
