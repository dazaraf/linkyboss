import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request) {
  try {
    const { address, message, signature } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: address, message, signature" },
        { status: 400 }
      );
    }

    // Verify the signature
    const valid = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const walletAddress = address.toLowerCase();

    // Look up or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          walletAddress,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
