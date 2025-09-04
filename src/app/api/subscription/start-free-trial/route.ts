import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscriptions, relationSubjectsUserTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { selectedSubjects } = await request.json();
    if (!Array.isArray(selectedSubjects) || selectedSubjects.length === 0) {
      return NextResponse.json({ error: "Nessuna materia selezionata" }, { status: 400 });
    }

    // Limit to 3 subjects
    const subjectIds: string[] = Array.from(new Set(selectedSubjects)).slice(0, 3);

    // If user already has an active subscription/trial, prevent creating another
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (existing.length && existing[0].status === "active") {
      return NextResponse.json({ error: "Hai già un piano attivo" }, { status: 400 });
    }

    // Create or update a free trial subscription (no Stripe)
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (existing.length) {
      // Update to free trial
      await db
        .update(subscriptions)
        .set({
          status: "active",
          is_free_trial: true,
          subject_count: subjectIds.length,
          custom_price: "0.00",
          monthly_ai_budget: "0.05", // €0.05 per user for trial
          current_period_start: now,
          current_period_end: trialEnd,
          cancel_at_period_end: true,
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, existing[0].id));
    } else {
      await db.insert(subscriptions).values({
        user_id: session.user.id,
        status: "active",
        is_free_trial: true,
        subject_count: subjectIds.length,
        custom_price: "0.00",
        monthly_ai_budget: "0.05",
        current_period_start: now,
        current_period_end: trialEnd,
        cancel_at_period_end: true,
      });
    }

    // Replace existing subject relations with the chosen ones
    await db
      .delete(relationSubjectsUserTable)
      .where(eq(relationSubjectsUserTable.user_id, session.user.id));
    for (const sId of subjectIds) {
      await db.insert(relationSubjectsUserTable).values({ user_id: session.user.id, subject_id: sId });
    }

    // Invalidate caches so dashboard updates immediately
    revalidateTag("subjects");
    revalidateTag("subscription");
    revalidateTag(`user-${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error starting free trial:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}


