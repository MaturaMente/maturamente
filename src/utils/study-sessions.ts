import { db } from "@/db/drizzle";
import { noteStudySessionsTable, notesTable, subjectsTable } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import {
  StudySessionStats,
  NoteStudyStats,
  MonthlyStudyActivity,
} from "@/types/studySessionsTypes";

/**
 * Get study time statistics for all notes for a user
 */
export function getUserStudyStats(userId: string): Promise<NoteStudyStats[]> {
  return unstable_cache(
    async (): Promise<NoteStudyStats[]> => {
      const sessions = await db
        .select({
          noteId: noteStudySessionsTable.note_id,
          noteTitle: notesTable.title,
          id: noteStudySessionsTable.id,
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .where(eq(noteStudySessionsTable.user_id, userId))
        .orderBy(desc(noteStudySessionsTable.started_at));

      const sessionsByNote = sessions.reduce((acc, session) => {
        const noteId = session.noteId;
        if (!acc[noteId]) {
          acc[noteId] = {
            noteId,
            noteTitle: session.noteTitle,
            sessions: [],
          };
        }
        acc[noteId].sessions.push(session);
        return acc;
      }, {} as Record<string, { noteId: string; noteTitle: string; sessions: any[] }>);

      return Object.values(sessionsByNote).map(
        ({ noteId, noteTitle, sessions }) => {
          const stats = calculateSessionStats(sessions);
          return {
            noteId,
            noteTitle,
            ...stats,
          };
        }
      );
    },
    ["getUserStudyStats", userId],
    {
      revalidate: 60,
      tags: ["study-sessions", `user-${userId}`],
    }
  )();
}

/**
 * Get overall study statistics for a user across all notes
 */
export function getOverallStudyStats(
  userId: string
): Promise<StudySessionStats> {
  return unstable_cache(
    async (): Promise<StudySessionStats> => {
      const sessions = await db
        .select({
          id: noteStudySessionsTable.id,
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .where(eq(noteStudySessionsTable.user_id, userId))
        .orderBy(desc(noteStudySessionsTable.started_at));

      return calculateSessionStats(sessions);
    },
    ["getOverallStudyStats", userId],
    {
      revalidate: 60,
      tags: ["study-sessions", `user-${userId}`],
    }
  )();
}

/**
 * Get recent study sessions for a user (last 10)
 */
export function getRecentStudySessions(userId: string, limit: number = 10) {
  return unstable_cache(
    async () => {
      return await db
        .select({
          id: noteStudySessionsTable.id,
          noteId: noteStudySessionsTable.note_id,
          noteTitle: notesTable.title,
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .where(eq(noteStudySessionsTable.user_id, userId))
        .orderBy(desc(noteStudySessionsTable.started_at))
        .limit(limit);
    },
    ["getRecentStudySessions", userId, String(limit)],
    {
      revalidate: 30,
      tags: ["study-sessions", `user-${userId}`],
    }
  )();
}

/**
 * Calculate session statistics from raw session data
 */
function calculateSessionStats(sessions: any[]): StudySessionStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalTimeMinutes: 0,
      averageTimeMinutes: 0,
      lastStudiedAt: null,
    };
  }

  let totalTimeMinutes = 0;
  let lastStudiedAt: Date | null = null;

  sessions.forEach((session) => {
    const startTime = new Date(session.started_at);
    const endTime = new Date(session.last_active_at);

    // Calculate duration in minutes (between started_at and last_active_at)
    const durationMs = endTime.getTime() - startTime.getTime();
    // Ensure minimum duration is 1 minute for any session
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    totalTimeMinutes += durationMinutes;

    // Track the most recent study time
    if (!lastStudiedAt || startTime > lastStudiedAt) {
      lastStudiedAt = startTime;
    }
  });

  const averageTimeMinutes =
    sessions.length > 0 ? Math.round(totalTimeMinutes / sessions.length) : 0;

  return {
    totalSessions: sessions.length,
    totalTimeMinutes,
    averageTimeMinutes,
    lastStudiedAt,
  };
}

/**
 * Get study time breakdown by day for the last 30 days
 */
export function getStudyTimeByDay(userId: string, days: number = 30) {
  return unstable_cache(
    async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

      const sessions = await db
        .select({
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .where(
          and(
            eq(noteStudySessionsTable.user_id, userId),
            sql`${noteStudySessionsTable.started_at} >= ${thirtyDaysAgo}`
          )
        )
        .orderBy(desc(noteStudySessionsTable.started_at));

      // Group sessions by date
      const sessionsByDate = sessions.reduce((acc, session) => {
        const date = new Date(session.started_at).toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(session);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate total time for each date
      return Object.entries(sessionsByDate)
        .map(([date, dateSessions]) => {
          const stats = calculateSessionStats(dateSessions);
          return {
            date: new Date(date),
            totalTimeMinutes: stats.totalTimeMinutes,
            sessionCount: stats.totalSessions,
          };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    ["getStudyTimeByDay", userId, String(days)],
    {
      revalidate: 60,
      tags: ["study-sessions", `user-${userId}`],
    }
  )();
}

/**
 * Get monthly study activity for a user across all notes
 */
export function getMonthlyStudyActivity(
  userId: string,
  months: number = 6
): Promise<MonthlyStudyActivity[]> {
  return unstable_cache(
    async (): Promise<MonthlyStudyActivity[]> => {
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - months);

      const sessions = await db
        .select({
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .where(
          and(
            eq(noteStudySessionsTable.user_id, userId),
            sql`${noteStudySessionsTable.started_at} >= ${monthsAgo}`
          )
        )
        .orderBy(desc(noteStudySessionsTable.started_at));

      // Group sessions by month
      const sessionsByMonth = sessions.reduce((acc, session) => {
        const date = new Date(session.started_at);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!acc[monthKey]) {
          acc[monthKey] = [];
        }
        acc[monthKey].push(session);
        return acc;
      }, {} as Record<string, any[]>);

      // Generate complete month range
      const result: MonthlyStudyActivity[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthKey = `${targetDate.getFullYear()}-${String(
          targetDate.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthSessions = sessionsByMonth[monthKey] || [];

        const stats = calculateSessionStats(monthSessions);
        const monthNames = [
          "Gen",
          "Feb",
          "Mar",
          "Apr",
          "Mag",
          "Giu",
          "Lug",
          "Ago",
          "Set",
          "Ott",
          "Nov",
          "Dic",
        ];

        result.push({
          month: monthNames[targetDate.getMonth()],
          studyTimeMinutes: stats.totalTimeMinutes,
          sessionCount: stats.totalSessions,
        });
      }

      return result;
    },
    ["getMonthlyStudyActivity", userId, String(months)],
    {
      revalidate: 60,
      tags: ["study-sessions", `user-${userId}`],
    }
  )();
}

/**
 * Get monthly study activity for a specific subject
 */
export function getMonthlyStudyActivityBySubject(
  userId: string,
  subjectSlug: string,
  months: number = 6
): Promise<MonthlyStudyActivity[]> {
  return unstable_cache(
    async (): Promise<MonthlyStudyActivity[]> => {
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - months);

      const sessions = await db
        .select({
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .where(
          and(
            eq(noteStudySessionsTable.user_id, userId),
            eq(subjectsTable.slug, subjectSlug),
            sql`${noteStudySessionsTable.started_at} >= ${monthsAgo}`
          )
        )
        .orderBy(desc(noteStudySessionsTable.started_at));

      // Group sessions by month
      const sessionsByMonth = sessions.reduce((acc, session) => {
        const date = new Date(session.started_at);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!acc[monthKey]) {
          acc[monthKey] = [];
        }
        acc[monthKey].push(session);
        return acc;
      }, {} as Record<string, any[]>);

      // Generate complete month range
      const result: MonthlyStudyActivity[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthKey = `${targetDate.getFullYear()}-${String(
          targetDate.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthSessions = sessionsByMonth[monthKey] || [];

        const stats = calculateSessionStats(monthSessions);
        const monthNames = [
          "Gen",
          "Feb",
          "Mar",
          "Apr",
          "Mag",
          "Giu",
          "Lug",
          "Ago",
          "Set",
          "Ott",
          "Nov",
          "Dic",
        ];

        result.push({
          month: monthNames[targetDate.getMonth()],
          studyTimeMinutes: stats.totalTimeMinutes,
          sessionCount: stats.totalSessions,
        });
      }

      return result;
    },
    ["getMonthlyStudyActivityBySubject", userId, subjectSlug, String(months)],
    {
      revalidate: 60,
      tags: ["study-sessions", `user-${userId}`, `subject-${subjectSlug}`],
    }
  )();
}

/**
 * Get study statistics for a specific subject
 */
export function getSubjectStudyStats(
  userId: string,
  subjectSlug: string
): Promise<StudySessionStats> {
  return unstable_cache(
    async (): Promise<StudySessionStats> => {
      const sessions = await db
        .select({
          id: noteStudySessionsTable.id,
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
        })
        .from(noteStudySessionsTable)
        .innerJoin(
          notesTable,
          eq(noteStudySessionsTable.note_id, notesTable.id)
        )
        .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
        .where(
          and(
            eq(noteStudySessionsTable.user_id, userId),
            eq(subjectsTable.slug, subjectSlug)
          )
        )
        .orderBy(desc(noteStudySessionsTable.started_at));

      return calculateSessionStats(sessions);
    },
    ["getSubjectStudyStats", userId, subjectSlug],
    {
      revalidate: 60,
      tags: ["study-sessions", `user-${userId}`, `subject-${subjectSlug}`],
    }
  )();
}
