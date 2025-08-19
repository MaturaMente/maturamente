import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { completedSimulationsTable } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { simulationId } = await request.json();

    if (!simulationId) {
      return NextResponse.json(
        { error: "Simulation ID is required" },
        { status: 400 }
      );
    }

    // Get the attempt number (how many times the user has attempted this simulation)
    const attemptCount = await db
      .select({ count: count() })
      .from(completedSimulationsTable)
      .where(
        and(
          eq(completedSimulationsTable.user_id, user.id),
          eq(completedSimulationsTable.simulation_id, simulationId)
        )
      );

    const attempt = (attemptCount[0]?.count || 0) + 1;

    // Create a new simulation attempt
    const result = await db.insert(completedSimulationsTable).values({
      user_id: user.id,
      simulation_id: simulationId,
      attempt: attempt,
      started_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Simulation started successfully",
      attempt,
    });
  } catch (error) {
    console.error("Error starting simulation:", error);
    return NextResponse.json(
      { error: "Failed to start simulation" },
      { status: 500 }
    );
  }
}

// Ensure route is properly detected during build
export const dynamic = "force-dynamic";
