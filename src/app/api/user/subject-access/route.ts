import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserSubjectAccess } from "@/utils/subscription-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjectAccess = await getUserSubjectAccess(session.user.id);

    return NextResponse.json(subjectAccess);
  } catch (error) {
    console.error("Error fetching subject access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
