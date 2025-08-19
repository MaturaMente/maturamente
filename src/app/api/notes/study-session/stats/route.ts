import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserStudyStats,
  getOverallStudyStats,
  getRecentStudySessions,
  getStudyTimeByDay,
} from "@/utils/study-sessions";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overall";
    const noteId = searchParams.get("noteId");

    switch (type) {
      case "overall":
        const overallStats = await getOverallStudyStats(session.user.id);
        return NextResponse.json(overallStats);

      case "by-note":
        const noteStats = await getUserStudyStats(session.user.id);
        return NextResponse.json(noteStats);

      case "recent":
        const limit = parseInt(searchParams.get("limit") || "10");
        const recentSessions = await getRecentStudySessions(
          session.user.id,
          limit
        );
        return NextResponse.json(recentSessions);

      case "daily":
        const days = parseInt(searchParams.get("days") || "30");
        const dailyStats = await getStudyTimeByDay(session.user.id, days);
        return NextResponse.json(dailyStats);

      default:
        return NextResponse.json(
          { error: "Invalid stats type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching study session stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
