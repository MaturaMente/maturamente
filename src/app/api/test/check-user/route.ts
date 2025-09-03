import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { subscriptions, aiBudgetBalanceTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        error: "userId is required"
      }, { status: 400 });
    }

    // Get subscription for this specific user
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .limit(1);

    // Get budget balance for this user
    const budgetBalance = await db
      .select()
      .from(aiBudgetBalanceTable)
      .where(eq(aiBudgetBalanceTable.user_id, userId))
      .orderBy(desc(aiBudgetBalanceTable.created_at))
      .limit(1);

    return NextResponse.json({
      subscription: userSubscription.length > 0 ? {
        user_id: userSubscription[0].user_id,
        subject_count: userSubscription[0].subject_count,
        custom_price: userSubscription[0].custom_price,
        monthly_ai_budget: userSubscription[0].monthly_ai_budget,
        status: userSubscription[0].status
      } : null,
      budgetBalance: budgetBalance.length > 0 ? {
        allocated_budget_eur: budgetBalance[0].allocated_budget_eur,
        used_budget_usd: budgetBalance[0].used_budget_usd,
        remaining_budget_eur: budgetBalance[0].remaining_budget_eur,
        period_start: budgetBalance[0].period_start,
        period_end: budgetBalance[0].period_end,
        created_at: budgetBalance[0].created_at,
        updated_at: budgetBalance[0].updated_at
      } : null,
    });

  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: "Failed to check user", details: error },
      { status: 500 }
    );
  }
}
