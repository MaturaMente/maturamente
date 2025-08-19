import { db } from "@/db/drizzle";
import { waitList } from "@/db/schema";
import { send100thEmail } from "@/utils/mail/100-email";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { email, name } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // First check if the user exists and is unsubscribed
    const existingUser = await db
      .select()
      .from(waitList)
      .where(eq(waitList.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // If user exists and is unsubscribed, reactivate them
      if (existingUser[0].unsubscribed) {
        await db
          .update(waitList)
          .set({ unsubscribed: false })
          .where(eq(waitList.email, email));
        await send100thEmail(email, name);
        return NextResponse.json({ success: true });
      }
      // If user exists and is already subscribed, return 409
      return NextResponse.json(
        { error: "Already on the list" },
        { status: 409 }
      );
    }

    // If user doesn't exist, create new entry
    await db.insert(waitList).values({ email });
    await send100thEmail(email, name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in waiting list subscription:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
