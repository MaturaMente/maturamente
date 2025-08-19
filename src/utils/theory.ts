import { cache } from "react";
import { db } from "@/db/drizzle";
import { theoryTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import {
  getCompletedTopics,
  getCompletedSubtopics,
} from "@/utils/topics-subtopics-data";

// Cache theory content for a subtopic
export const getTheoryContent = cache(async (subtopicId: string) => {
  return db
    .select()
    .from(theoryTable)
    .where(eq(theoryTable.subtopic_id, subtopicId));
});

// Client-side completion state cache
export const getCachedCompletionData = unstable_cache(
  async (userId: string) => {
    const [completedTopics, completedSubtopics] = await Promise.all([
      getCompletedTopics(userId),
      getCompletedSubtopics(userId),
    ]);

    return {
      completedTopicIds: completedTopics.map((t) => t.topic_id),
      completedSubtopicIds: completedSubtopics.map((s) => s.subtopic_id),
      completedTopics,
      completedSubtopics,
    };
  },
  ["user-completion-data"],
  {
    revalidate: 300, // 5 minutes for user-specific data
    tags: ["completion"],
  }
);

// Function to get user-specific cached completion data
export const getUserCompletionData = (userId: string) => {
  return unstable_cache(
    () => getCachedCompletionData(userId),
    [`completion-${userId}`],
    {
      revalidate: 300, // 5 minutes
      tags: [`user-${userId}`, "completion"],
    }
  )();
};
