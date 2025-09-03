import { db } from "@/db/drizzle";
import { flaggedSimulationsTable, simulationsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { simulationId } = await req.json();

    // Check if simulationId is a UUID (ID) or a slug
    let dbSimulationId: string;
    
    // Simple UUID validation (36 characters with dashes at specific positions)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(simulationId);
    
    if (isUUID) {
      // It's already a simulation ID, use it directly
      dbSimulationId = simulationId;
      
      // Verify the simulation exists
      const simulation = await db
        .select()
        .from(simulationsTable)
        .where(eq(simulationsTable.id, simulationId));

      if (simulation.length === 0) {
        return new NextResponse("Simulation not found", { status: 404 });
      }
    } else {
      // It's a slug, look it up
      const simulation = await db
        .select()
        .from(simulationsTable)
        .where(eq(simulationsTable.slug, simulationId));

      if (simulation.length === 0) {
        return new NextResponse("Simulation not found", { status: 404 });
      }

      dbSimulationId = simulation[0].id;
    }

    // Check if the simulation is already flagged
    const existingFlag = await db
      .select()
      .from(flaggedSimulationsTable)
      .where(
        and(
          eq(flaggedSimulationsTable.user_id, user.id),
          eq(flaggedSimulationsTable.simulation_id, dbSimulationId)
        )
      );

    if (existingFlag.length > 0) {
      // If the simulation is already flagged, remove it
      await db
        .delete(flaggedSimulationsTable)
        .where(
          and(
            eq(flaggedSimulationsTable.user_id, user.id),
            eq(flaggedSimulationsTable.simulation_id, dbSimulationId)
          )
        );
      // Invalidate cache to ensure immediate consistency
      revalidateTag(`user-${user.id}`);
      revalidateTag("simulations");
      revalidateTag("favorites");
      return NextResponse.json({ flagged: false });
    } else {
      // If the simulation is not flagged, add it
      await db.insert(flaggedSimulationsTable).values({
        user_id: user.id,
        simulation_id: dbSimulationId,
      });
      // Invalidate cache to ensure immediate consistency
      revalidateTag(`user-${user.id}`);
      revalidateTag("simulations");
      revalidateTag("favorites");
      return NextResponse.json({ flagged: true });
    }
  } catch (error) {
    console.error("Error toggling simulation flag:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
