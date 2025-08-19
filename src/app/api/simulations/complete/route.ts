import { db } from "@/db/drizzle";
import { completedSimulationsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { simulationId, completedSimulationId, userId } = await req.json();

    console.log("Completing simulation with data:", {
      simulationId,
      userId,
      completedSimulationId,
      userIdType: typeof userId,
      userIdFromAuth: user.id,
      userIdFromAuthType: typeof user.id,
    });

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Current timestamp for completed_at
    const currentTime = new Date();

    // If a completedSimulationId is provided, update that record
    if (completedSimulationId) {
      console.log(
        "Updating existing simulation with ID:",
        completedSimulationId
      );
      await db
        .update(completedSimulationsTable)
        .set({ completed_at: currentTime })
        .where(eq(completedSimulationsTable.id, completedSimulationId));

      console.log(
        "Updated existing simulation with completion time:",
        currentTime
      );
    } else {
      // Otherwise find the most recent started simulation for this user and simulation
      console.log("Finding active simulation for user:", userId);
      const activeSimulations = await db
        .select()
        .from(completedSimulationsTable)
        .where(
          and(
            eq(completedSimulationsTable.user_id, userId),
            eq(completedSimulationsTable.simulation_id, simulationId),
            isNull(completedSimulationsTable.completed_at)
          )
        )
        .orderBy(desc(completedSimulationsTable.started_at));

      console.log("Found active simulations:", activeSimulations.length);

      if (activeSimulations.length > 0) {
        console.log(
          "Completing active simulation with ID:",
          activeSimulations[0].id
        );
        // For existing record, only update the completed_at time
        await db
          .update(completedSimulationsTable)
          .set({ completed_at: currentTime })
          .where(eq(completedSimulationsTable.id, activeSimulations[0].id));

        console.log("Updated completion time to:", currentTime);
      } else {
        // If no active simulation found, create a new completed simulation record
        console.log(
          "No active simulation found, creating new completed record"
        );
        const previousAttempts = await db
          .select()
          .from(completedSimulationsTable)
          .where(
            and(
              eq(completedSimulationsTable.user_id, userId),
              eq(completedSimulationsTable.simulation_id, simulationId)
            )
          );

        console.log("Found previous attempts:", previousAttempts.length);

        // Calculate new attempt number
        const attemptNumber = previousAttempts.length + 1;

        // Create record with different timestamps for start and completion
        const startTime = new Date(currentTime.getTime() - 60000); // 1 minute before completion (just for distinction)

        const insertValues = {
          user_id: userId,
          simulation_id: simulationId,
          attempt: attemptNumber,
          started_at: startTime,
          completed_at: currentTime,
        };

        console.log(
          "Creating new completed simulation with different timestamps:",
          {
            startTime,
            completionTime: currentTime,
          }
        );

        await db.insert(completedSimulationsTable).values(insertValues);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing simulation:", error);
    // Add more detailed error response
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({
          message: "Internal Server Error",
          error: error.message,
          stack: error.stack,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
