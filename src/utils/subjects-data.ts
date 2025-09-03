import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/db/drizzle";
import {
  subjectsTable,
  relationSubjectsUserTable,
  notesTable,
} from "@/db/schema";
import { eq, count, and } from "drizzle-orm";
import type { UserSubject } from "@/types/subjectsTypes";

/**
 * Get all subjects for a specific user with note counts
 * Cached to improve performance
 */
export function getUserSubjects(userId: string): Promise<UserSubject[]> {
  return unstable_cache(
    async (): Promise<UserSubject[]> => {
      try {
        const userSubjects = await db
          .select({
            id: subjectsTable.id,
            name: subjectsTable.name,
            description: subjectsTable.description,
            order_index: subjectsTable.order_index,
            color: subjectsTable.color,
            maturita: subjectsTable.maturita,
            slug: subjectsTable.slug,
            created_at: subjectsTable.created_at,
            user_relation_created_at: relationSubjectsUserTable.created_at,
            notes_count: count(notesTable.id),
          })
          .from(relationSubjectsUserTable)
          .innerJoin(
            subjectsTable,
            eq(relationSubjectsUserTable.subject_id, subjectsTable.id)
          )
          .leftJoin(notesTable, eq(subjectsTable.id, notesTable.subject_id))
          .where(eq(relationSubjectsUserTable.user_id, userId))
          .groupBy(
            subjectsTable.id,
            subjectsTable.name,
            subjectsTable.description,
            subjectsTable.order_index,
            subjectsTable.color,
            subjectsTable.maturita,
            subjectsTable.slug,
            subjectsTable.created_at,
            relationSubjectsUserTable.created_at
          )
          .orderBy(subjectsTable.order_index);

        return userSubjects as UserSubject[];
      } catch (error) {
        console.error("Error fetching user subjects:", error);
        throw new Error("Failed to fetch user subjects");
      }
    },
    ["getUserSubjects", userId],
    { revalidate: 300, tags: ["subjects", `user-${userId}`] }
  )();
}

/**
 * Get a specific subject by slug for a user
 * Used to get current subject data for dynamic theming
 */
export function getUserSubjectBySlug(
  userId: string,
  slug: string
): Promise<UserSubject | null> {
  return unstable_cache(
    async (): Promise<UserSubject | null> => {
      try {
        const userSubject = await db
          .select({
            id: subjectsTable.id,
            name: subjectsTable.name,
            description: subjectsTable.description,
            order_index: subjectsTable.order_index,
            color: subjectsTable.color,
            maturita: subjectsTable.maturita,
            slug: subjectsTable.slug,
            created_at: subjectsTable.created_at,
            user_relation_created_at: relationSubjectsUserTable.created_at,
            notes_count: count(notesTable.id),
          })
          .from(relationSubjectsUserTable)
          .innerJoin(
            subjectsTable,
            eq(relationSubjectsUserTable.subject_id, subjectsTable.id)
          )
          .leftJoin(notesTable, eq(subjectsTable.id, notesTable.subject_id))
          .where(
            and(
              eq(relationSubjectsUserTable.user_id, userId),
              eq(subjectsTable.slug, slug)
            )
          )
          .groupBy(
            subjectsTable.id,
            subjectsTable.name,
            subjectsTable.description,
            subjectsTable.order_index,
            subjectsTable.color,
            subjectsTable.maturita,
            subjectsTable.slug,
            subjectsTable.created_at,
            relationSubjectsUserTable.created_at
          )
          .limit(1);

        return userSubject.length > 0 ? (userSubject[0] as UserSubject) : null;
      } catch (error) {
        console.error("Error fetching user subject by slug:", error);
        return null;
      }
    },
    ["getUserSubjectBySlug", userId, slug],
    { revalidate: 300, tags: ["subjects", `user-${userId}`, `subject-${slug}`] }
  )();
}
