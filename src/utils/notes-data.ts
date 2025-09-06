import { cache } from "react";
import { db } from "@/db/drizzle";
import {
  notesTable,
  flaggedNotesTable,
  subjectsTable,
  relationSubjectsUserTable,
  noteStudySessionsTable,
  subscriptions,
} from "@/db/schema";
import { eq, and, desc, countDistinct, sql } from "drizzle-orm";
import type { Note, SubjectNotesData } from "@/types/notesTypes";
import type { NotesStatisticsData, RecentNote } from "@/types/statisticsTypes";
import {
  getSubjectStudyStats,
  getMonthlyStudyActivityBySubject,
  getDailyStudyActivityBySubject,
} from "./study-sessions";

/**
 * Get all notes for a specific subject with favorite status
 * Cached to improve performance
 */
export const getSubjectNotes = cache(
  async (subjectSlug: string, userId: string): Promise<SubjectNotesData> => {
    try {
      // First get the subject by slug
      const subject = await db
        .select({
          id: subjectsTable.id,
          name: subjectsTable.name,
          color: subjectsTable.color,
          slug: subjectsTable.slug,
        })
        .from(subjectsTable)
        .where(eq(subjectsTable.slug, subjectSlug))
        .limit(1);

      if (!subject[0]) {
        throw new Error("Subject not found");
      }

      const subjectData = subject[0];

      // Check if user is on free trial
      const sub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.user_id, userId))
        .limit(1);
      const isFreeTrial =
        sub.length > 0 && sub[0].is_free_trial === true && sub[0].status === "active";

      // Always include all notes; for free trial users, order free ones first
      const notesWithFavorites = await db
        .select({
          id: notesTable.id,
          title: notesTable.title,
          description: notesTable.description,
          storage_path: notesTable.storage_path,
          subject_id: notesTable.subject_id,
          n_pages: notesTable.n_pages,
          slug: notesTable.slug,
          created_at: notesTable.created_at,
          free_trial: notesTable.free_trial,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .where(eq(notesTable.subject_id, subjectData.id))
        .orderBy(
          ...(isFreeTrial
            ? [desc(notesTable.free_trial), desc(notesTable.created_at)]
            : [desc(notesTable.created_at)])
        );

      // Transform to Note objects
      const allNotes: Note[] = notesWithFavorites.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        storage_path: row.storage_path,
        subject_id: row.subject_id || "",
        n_pages: row.n_pages || 1,
        slug: row.slug || "",
        created_at: row.created_at,
        is_favorite: !!row.is_favorite,
        free_trial: !!row.free_trial,
      }));

      // Filter favorite notes
      const favoriteNotes = allNotes.filter((note) => note.is_favorite);

      return {
        allNotes,
        favoriteNotes,
        subject: {
          id: subjectData.id,
          name: subjectData.name,
          color: subjectData.color,
          slug: subjectData.slug,
        },
      };
    } catch (error) {
      console.error("Error fetching subject notes:", error);
      throw new Error("Failed to fetch subject notes");
    }
  }
);

/**
 * Get a specific note by slug for a subject
 */
export const getNoteBySlug = cache(
  async (
    subjectSlug: string,
    noteSlug: string,
    userId: string
  ): Promise<Note | null> => {
    try {
      // First get the subject by slug
      const subject = await db
        .select({
          id: subjectsTable.id,
        })
        .from(subjectsTable)
        .where(eq(subjectsTable.slug, subjectSlug))
        .limit(1);

      if (!subject[0]) {
        return null;
      }

      // Get the specific note by slug within the subject
      const noteResult = await db
        .select({
          id: notesTable.id,
          title: notesTable.title,
          description: notesTable.description,
          storage_path: notesTable.storage_path,
          subject_id: notesTable.subject_id,
          n_pages: notesTable.n_pages,
          slug: notesTable.slug,
          created_at: notesTable.created_at,
          free_trial: notesTable.free_trial,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .where(
          and(
            eq(notesTable.subject_id, subject[0].id),
            eq(notesTable.slug, noteSlug)
          )
        )
        .limit(1);

      if (!noteResult[0]) {
        return null;
      }

      const note = noteResult[0];
      return {
        id: note.id,
        title: note.title,
        description: note.description || "",
        storage_path: note.storage_path,
        subject_id: note.subject_id || "",
        n_pages: note.n_pages || 1,
        slug: note.slug || "",
        created_at: note.created_at,
        is_favorite: !!note.is_favorite,
        free_trial: !!note.free_trial,
      };
    } catch (error) {
      console.error("Error fetching note by slug:", error);
      return null;
    }
  }
);

/**
 * Get count of studied notes for a specific user and subject
 */
export const getStudiedNotesCount = cache(
  async (userId: string, subjectId: string): Promise<number> => {
    try {
      const studiedNotesResult = await db
        .select({ count: countDistinct(noteStudySessionsTable.note_id) })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .where(
          and(
            eq(noteStudySessionsTable.user_id, userId),
            eq(notesTable.subject_id, subjectId)
          )
        );

      return studiedNotesResult[0]?.count || 0;
    } catch (error) {
      console.error("Error fetching studied notes count:", error);
      return 0;
    }
  }
);

/**
 * Get recent studied notes for a specific user and subject
 * Returns unique notes with their most recent study session
 */
export const getRecentStudiedNotes = cache(
  async (userId: string, subjectId: string): Promise<RecentNote[]> => {
    try {
      // First, get the most recent study session for each note
      const latestSessionsSubquery = db
        .select({
          note_id: noteStudySessionsTable.note_id,
          latest_active_at:
            sql<Date>`MAX(${noteStudySessionsTable.last_active_at})`.as(
              "latest_active_at"
            ),
        })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .where(
          and(
            eq(noteStudySessionsTable.user_id, userId),
            eq(notesTable.subject_id, subjectId)
          )
        )
        .groupBy(noteStudySessionsTable.note_id)
        .as("latest_sessions");

      // Then join with the original tables to get the complete note information
      const recentStudiedNotesQuery = await db
        .select({
          note_id: notesTable.id,
          note_title: notesTable.title,
          note_slug: notesTable.slug,
          subject_name: subjectsTable.name,
          last_studied_at: latestSessionsSubquery.latest_active_at,
          session_started_at: noteStudySessionsTable.started_at,
        })
        .from(latestSessionsSubquery)
        .innerJoin(
          notesTable,
          eq(latestSessionsSubquery.note_id, notesTable.id)
        )
        .innerJoin(
          noteStudySessionsTable,
          and(
            eq(noteStudySessionsTable.note_id, latestSessionsSubquery.note_id),
            eq(
              noteStudySessionsTable.last_active_at,
              latestSessionsSubquery.latest_active_at
            )
          )
        )
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .orderBy(desc(latestSessionsSubquery.latest_active_at));

      // For each note, aggregate the total study time spent on the SAME DAY
      // as the latest session (sum of all overlapping sessions within that day)
      // Filter to last month and limit to 5 most recent
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const filteredRecent = recentStudiedNotesQuery
        .filter((row) => new Date(row.last_studied_at) >= oneMonthAgo)
        .slice(0, 5);

      const results: RecentNote[] = await Promise.all(
        filteredRecent.map(async (row) => {
          const latestSessionDate = new Date(row.last_studied_at);
          const dayStart = new Date(latestSessionDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(latestSessionDate);
          dayEnd.setHours(23, 59, 59, 999);

          // Fetch all sessions for this note and user that overlap the day
          const sessionsForDay = await db
            .select({
              started_at: noteStudySessionsTable.started_at,
              last_active_at: noteStudySessionsTable.last_active_at,
            })
            .from(noteStudySessionsTable)
            .where(
              and(
                eq(noteStudySessionsTable.user_id, userId),
                eq(noteStudySessionsTable.note_id, row.note_id),
                // Overlap condition: session intersects [dayStart, dayEnd]
                sql`${noteStudySessionsTable.started_at} <= ${dayEnd} AND ${noteStudySessionsTable.last_active_at} >= ${dayStart}`
              )
            );

          // Sum milliseconds across all overlapping sessions (clip to day bounds)
          let totalDurationMs = 0;
          for (const session of sessionsForDay) {
            const sessionStart = new Date(session.started_at);
            const sessionEnd = new Date(session.last_active_at);
            const effectiveStart =
              sessionStart < dayStart ? dayStart : sessionStart;
            const effectiveEnd = sessionEnd > dayEnd ? dayEnd : sessionEnd;
            const ms = Math.max(
              0,
              effectiveEnd.getTime() - effectiveStart.getTime()
            );
            totalDurationMs += ms;
          }

          const studyTimeMinutes = Math.max(
            1,
            Math.round(totalDurationMs / (1000 * 60))
          );

          return {
            id: row.note_id,
            title: row.note_title,
            date: new Date(row.last_studied_at).toLocaleDateString("it-IT"),
            subjectName: row.subject_name,
            slug: row.note_slug || "",
            type: "note" as const,
            studyTimeMinutes,
          };
        })
      );

      return results;
    } catch (error) {
      console.error("Error fetching recent studied notes:", error);
      return [];
    }
  }
);

/**
 * Get all notes for all user's subscribed subjects with favorite status
 * For dashboard chat functionality
 */
export const getAllUserNotes = cache(
  async (
    userId: string
  ): Promise<{
    allNotes: Note[];
    favoriteNotes: Note[];
    subjects: Array<{
      id: string;
      name: string;
      color: string;
      slug: string;
    }>;
  }> => {
    try {
      // Get all notes for all user's subscribed subjects with favorite information
      const notesWithFavorites = await db
        .select({
          id: notesTable.id,
          title: notesTable.title,
          description: notesTable.description,
          storage_path: notesTable.storage_path,
          subject_id: notesTable.subject_id,
          n_pages: notesTable.n_pages,
          slug: notesTable.slug,
          created_at: notesTable.created_at,
          free_trial: notesTable.free_trial,
          is_favorite: flaggedNotesTable.id,
          subject_name: subjectsTable.name,
          subject_color: subjectsTable.color,
          subject_slug: subjectsTable.slug,
        })
        .from(notesTable)
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .innerJoin(
          relationSubjectsUserTable,
          and(
            eq(relationSubjectsUserTable.subject_id, subjectsTable.id),
            eq(relationSubjectsUserTable.user_id, userId)
          )
        )
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .orderBy(desc(notesTable.created_at));

      // Get unique subjects
      const subjectsMap = new Map();
      notesWithFavorites.forEach((row) => {
        if (!subjectsMap.has(row.subject_id)) {
          subjectsMap.set(row.subject_id, {
            id: row.subject_id,
            name: row.subject_name,
            color: row.subject_color,
            slug: row.subject_slug,
          });
        }
      });
      const subjects = Array.from(subjectsMap.values());

      // Transform to Note objects
      const allNotes: Note[] = notesWithFavorites.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        storage_path: row.storage_path,
        subject_id: row.subject_id || "",
        n_pages: row.n_pages || 1,
        slug: row.slug || "",
        created_at: row.created_at,
        is_favorite: !!row.is_favorite,
        free_trial: !!row.free_trial,
      }));

      // Filter favorite notes
      const favoriteNotes = allNotes.filter((note) => note.is_favorite);

      return {
        allNotes,
        favoriteNotes,
        subjects,
      };
    } catch (error) {
      console.error("Error fetching all user notes:", error);
      throw new Error("Failed to fetch user notes");
    }
  }
);

/**
 * Get recent studied notes for a user across all subjects
 * Returns unique notes with their most recent study session
 */
export const getAllRecentStudiedNotes = cache(
  async (userId: string): Promise<RecentNote[]> => {
    try {
      // First, get the most recent study session for each note across all subjects
      const latestSessionsSubquery = db
        .select({
          note_id: noteStudySessionsTable.note_id,
          latest_active_at:
            sql<Date>`MAX(${noteStudySessionsTable.last_active_at})`.as(
              "latest_active_at"
            ),
        })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .innerJoin(
          relationSubjectsUserTable,
          and(
            eq(relationSubjectsUserTable.subject_id, subjectsTable.id),
            eq(relationSubjectsUserTable.user_id, userId)
          )
        )
        .where(eq(noteStudySessionsTable.user_id, userId))
        .groupBy(noteStudySessionsTable.note_id)
        .as("latest_sessions");

      // Then join with the original tables to get the complete note information
      const recentStudiedNotesQuery = await db
        .select({
          note_id: notesTable.id,
          note_title: notesTable.title,
          note_slug: notesTable.slug,
          subject_name: subjectsTable.name,
          subject_slug: subjectsTable.slug,
          last_studied_at: latestSessionsSubquery.latest_active_at,
          session_started_at: noteStudySessionsTable.started_at,
        })
        .from(latestSessionsSubquery)
        .innerJoin(
          notesTable,
          eq(latestSessionsSubquery.note_id, notesTable.id)
        )
        .innerJoin(
          noteStudySessionsTable,
          and(
            eq(noteStudySessionsTable.note_id, latestSessionsSubquery.note_id),
            eq(
              noteStudySessionsTable.last_active_at,
              latestSessionsSubquery.latest_active_at
            )
          )
        )
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .orderBy(desc(latestSessionsSubquery.latest_active_at))
        .limit(10); // Limit to 10 most recent

      // For each note, aggregate the total study time spent on the SAME DAY
      // as the latest session (sum of all overlapping sessions within that day)
      const results: RecentNote[] = await Promise.all(
        recentStudiedNotesQuery.map(async (row) => {
          const latestSessionDate = new Date(row.last_studied_at);
          const dayStart = new Date(latestSessionDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(latestSessionDate);
          dayEnd.setHours(23, 59, 59, 999);

          // Fetch all sessions for this note and user that overlap the day
          const sessionsForDay = await db
            .select({
              started_at: noteStudySessionsTable.started_at,
              last_active_at: noteStudySessionsTable.last_active_at,
            })
            .from(noteStudySessionsTable)
            .where(
              and(
                eq(noteStudySessionsTable.user_id, userId),
                eq(noteStudySessionsTable.note_id, row.note_id),
                // Overlap condition: session intersects [dayStart, dayEnd]
                sql`${noteStudySessionsTable.started_at} <= ${dayEnd} AND ${noteStudySessionsTable.last_active_at} >= ${dayStart}`
              )
            );

          // Sum milliseconds across all overlapping sessions (clip to day bounds)
          let totalDurationMs = 0;
          for (const session of sessionsForDay) {
            const sessionStart = new Date(session.started_at);
            const sessionEnd = new Date(session.last_active_at);
            const effectiveStart =
              sessionStart < dayStart ? dayStart : sessionStart;
            const effectiveEnd = sessionEnd > dayEnd ? dayEnd : sessionEnd;
            const ms = Math.max(
              0,
              effectiveEnd.getTime() - effectiveStart.getTime()
            );
            totalDurationMs += ms;
          }

          const studyTimeMinutes = Math.max(
            1,
            Math.round(totalDurationMs / (1000 * 60))
          );

          return {
            id: row.note_id,
            title: row.note_title,
            date: new Date(row.last_studied_at).toLocaleDateString("it-IT"),
            subjectName: row.subject_name,
            slug: row.note_slug || "",
            type: "note" as const,
            studyTimeMinutes,
          };
        })
      );

      return results;
    } catch (error) {
      console.error(
        "Error fetching recent studied notes across subjects:",
        error
      );
      return [];
    }
  }
);

/**
 * Get notes statistics for a specific user and subject
 */
export const getNotesStatistics = cache(
  async (userId: string, subjectId: string): Promise<NotesStatisticsData> => {
    try {
      // Get all notes for the user from the specific subject only
      const allUserNotesQuery = await db
        .select({
          note_id: notesTable.id,
          note_title: notesTable.title,
          note_created_at: notesTable.created_at,
          note_slug: notesTable.slug,
          subject_name: subjectsTable.name,
          subject_slug: subjectsTable.slug,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .innerJoin(
          relationSubjectsUserTable,
          and(
            eq(relationSubjectsUserTable.subject_id, subjectsTable.id),
            eq(relationSubjectsUserTable.user_id, userId)
          )
        )
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .where(eq(subjectsTable.id, subjectId))
        .orderBy(desc(notesTable.created_at));

      // Calculate statistics
      const totalNotes = allUserNotesQuery.length;
      const favoriteNotes = allUserNotesQuery.filter(
        (note) => note.is_favorite
      ).length;

      // Get studied notes count
      const studiedNotes = await getStudiedNotesCount(userId, subjectId);
      const studiedPercentage =
        totalNotes > 0 ? Math.round((studiedNotes / totalNotes) * 100) : 0;

      const notesWithFavorites = favoriteNotes;
      const favoritePercentage =
        totalNotes > 0 ? Math.round((favoriteNotes / totalNotes) * 100) : 0;

      // Since we're filtering by one subject, totalSubjects is always 1 if notes exist
      const totalSubjects = allUserNotesQuery.length > 0 ? 1 : 0;

      // Get recent studied notes (last 5 actually studied notes)
      const recentNotes = await getRecentStudiedNotes(userId, subjectId);

      // Get study session statistics for this subject
      const subjectSlug = allUserNotesQuery[0]?.subject_slug || "";
      const studyStats = await getSubjectStudyStats(userId, subjectSlug);
      const monthlyStudyActivity = await getMonthlyStudyActivityBySubject(
        userId,
        subjectSlug,
        6
      );
      const dailyStudyActivity = await getDailyStudyActivityBySubject(
        userId,
        subjectSlug,
        60
      );

      return {
        totalNotes,
        favoriteNotes,
        studiedNotes,
        studiedPercentage,
        totalSubjects,
        notesWithFavorites,
        favoritePercentage,
        recentNotes,
        // Study session data
        totalStudyTimeMinutes: studyStats.totalTimeMinutes,
        totalStudySessions: studyStats.totalSessions,
        averageSessionTimeMinutes: studyStats.averageTimeMinutes,
        monthlyStudyActivity,
        dailyStudyActivity,
      };
    } catch (error) {
      console.error("Error fetching notes statistics:", error);
      throw new Error("Failed to fetch notes statistics");
    }
  }
);
