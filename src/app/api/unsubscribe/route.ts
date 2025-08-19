import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { waitList } from "@/db/schema";
import { validateUnsubscribeToken } from "@/utils/mail/unsubscribe";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token || !validateUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { error: "Invalid or missing token" },
        { status: 400 }
      );
    }

    await db
      .update(waitList)
      .set({ unsubscribed: true })
      .where(eq(waitList.email, email));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error); // 🔥 important
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
