import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { postDrafts } from "@/lib/db/schema";
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
        { error: "Invalid draft ID." },
        { status: 400 }
      );
    }

    const [draft] = await db
      .select()
      .from(postDrafts)
      .where(
        and(
          eq(postDrafts.id, id),
          eq(postDrafts.userId, session.user.id)
        )
      )
      .limit(1);

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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
        { error: "Invalid draft ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { editedContent, status } = body;

    // Verify ownership
    const [existing] = await db
      .select({ id: postDrafts.id })
      .from(postDrafts)
      .where(
        and(
          eq(postDrafts.id, id),
          eq(postDrafts.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Draft not found." },
        { status: 404 }
      );
    }

    const updateFields = { updatedAt: new Date() };
    if (editedContent !== undefined) {
      updateFields.editedContent = editedContent;
    }
    if (status !== undefined) {
      const validStatuses = ["draft", "edited", "published", "archived"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateFields.status = status;
    }

    const [updated] = await db
      .update(postDrafts)
      .set(updateFields)
      .where(
        and(
          eq(postDrafts.id, id),
          eq(postDrafts.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json({ draft: updated });
  } catch (error) {
    console.error("Error updating draft:", error);
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
        { error: "Invalid draft ID." },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select({ id: postDrafts.id })
      .from(postDrafts)
      .where(
        and(
          eq(postDrafts.id, id),
          eq(postDrafts.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Draft not found." },
        { status: 404 }
      );
    }

    await db
      .delete(postDrafts)
      .where(
        and(
          eq(postDrafts.id, id),
          eq(postDrafts.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
