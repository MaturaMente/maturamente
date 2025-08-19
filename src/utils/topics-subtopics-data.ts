import { cache } from "react";
import { db } from "@/db/drizzle";
import {
  topicsTable,
  subtopicsTable,
  completedTopicsTable,
  completedSubtopicsTable,
  subjectsTable,
} from "@/db/schema";
import { eq, lte, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// Number of topics to display on the website
export const DISPLAYED_TOPICS = 8;

// Cache topics with improved tagging and longer duration
export const getAllTopics = cache(async () => {
  return db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
      description: topicsTable.description,
      order_index: topicsTable.order_index,
      slug: topicsTable.slug,
    })
    .from(topicsTable)
    .where(lte(topicsTable.order_index, DISPLAYED_TOPICS))
    .orderBy(topicsTable.order_index);
});

// Get topics filtered by subject_id
export const getTopicsBySubjectId = cache(async (subjectId: string) => {
  return db
    .select({
      id: topicsTable.id,
      name: topicsTable.name,
      description: topicsTable.description,
      order_index: topicsTable.order_index,
      slug: topicsTable.slug,
      subject_id: topicsTable.subject_id,
    })
    .from(topicsTable)
    .where(eq(topicsTable.subject_id, subjectId))
    .orderBy(topicsTable.order_index);
});

// Get subject by slug (for unauthenticated users)
export const getSubjectBySlug = cache(async (slug: string) => {
  const result = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      description: subjectsTable.description,
      order_index: subjectsTable.order_index,
      color: subjectsTable.color,
      maturita: subjectsTable.maturita,
      slug: subjectsTable.slug,
      created_at: subjectsTable.created_at,
    })
    .from(subjectsTable)
    .where(eq(subjectsTable.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
});

// Cache all subtopics (useful for navigation)
export const getAllSubtopics = cache(async () => {
  return db
    .select({
      id: subtopicsTable.id,
      topic_id: subtopicsTable.topic_id,
      name: subtopicsTable.name,
      description: subtopicsTable.description,
      order_index: subtopicsTable.order_index,
      slug: subtopicsTable.slug,
    })
    .from(subtopicsTable)
    .orderBy(subtopicsTable.order_index);
});

// Improved subtopics caching with proper tags
export const getSubtopicsByTopic = cache(async (topicId: string) => {
  return db
    .select({
      id: subtopicsTable.id,
      topic_id: subtopicsTable.topic_id,
      name: subtopicsTable.name,
      description: subtopicsTable.description,
      order_index: subtopicsTable.order_index,
      slug: subtopicsTable.slug,
    })
    .from(subtopicsTable)
    .where(eq(subtopicsTable.topic_id, topicId))
    .orderBy(subtopicsTable.order_index);
});

// Cache topics with subtopics - for navigation structure
export const getTopicsWithSubtopics = cache(async () => {
  const topics = await getAllTopics();
  const subtopics = await getAllSubtopics();

  return topics.map((topic) => ({
    ...topic,
    subtopics: subtopics.filter((s) => s.topic_id === topic.id),
  }));
});

// Cache topics with subtopics filtered by subject
export const getTopicsWithSubtopicsBySubjectId = cache(
  async (subjectId: string) => {
    const topics = await getTopicsBySubjectId(subjectId);
    const allSubtopics = await getAllSubtopics();

    return topics.map((topic) => ({
      ...topic,
      subtopics: allSubtopics.filter((s) => s.topic_id === topic.id),
    }));
  }
);

// Get completed topics for the currently authenticated user
export const getCompletedTopics = unstable_cache(
  async (userId: string) => {
    const completedTopics = await db
      .select({
        topic_id: completedTopicsTable.topic_id,
        created_at: completedTopicsTable.created_at,
        name: topicsTable.name,
        slug: topicsTable.slug,
      })
      .from(completedTopicsTable)
      .innerJoin(topicsTable, eq(completedTopicsTable.topic_id, topicsTable.id))
      .where(eq(completedTopicsTable.user_id, userId as string))
      .orderBy(desc(completedTopicsTable.created_at));

    return completedTopics;
  },
  ["user-completed-subtopics"],
  { revalidate: 60 }
);

// Get completed subtopics for the currently authenticated user
export const getCompletedSubtopics = unstable_cache(
  async (userId: string) => {
    const completedSubtopics = await db
      .select({
        subtopic_id: completedSubtopicsTable.subtopic_id,
        created_at: completedSubtopicsTable.created_at,
        name: subtopicsTable.name,
        topic_id: subtopicsTable.topic_id,
        slug: subtopicsTable.slug,
      })
      .from(completedSubtopicsTable)
      .innerJoin(
        subtopicsTable,
        eq(completedSubtopicsTable.subtopic_id, subtopicsTable.id)
      )
      .where(eq(completedSubtopicsTable.user_id, userId as string))
      .orderBy(desc(completedSubtopicsTable.created_at));

    return completedSubtopics;
  },
  ["user-completed-subtopics"],
  { revalidate: 60 }
);
