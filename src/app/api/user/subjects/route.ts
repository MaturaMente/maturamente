import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/utils/user-context";
import { getUserSubjects } from "@/utils/subjects-data";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const subjects = await getUserSubjects(userId);
    return NextResponse.json({ subjects });
  } catch (error: any) {
    console.error("Error in /api/user/subjects:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}


