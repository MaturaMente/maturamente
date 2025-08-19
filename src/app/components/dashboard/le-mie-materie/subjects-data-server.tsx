import { getCurrentUserId } from "@/utils/user-context";
import { getUserSubjects } from "@/utils/subjects-data";

/**
 * Server component that fetches subjects data for the current user
 */
export async function SubjectsDataServer() {
  try {
    const userId = await getCurrentUserId();
    const subjects = await getUserSubjects(userId);

    return {
      subjects,
      error: null,
    };
  } catch (error) {
    console.error("Error in SubjectsDataServer:", error);
    return {
      subjects: [],
      error: "Failed to load subjects data",
    };
  }
}
