import { db } from "@/db/drizzle";
import {
  noteStudySessionsTable,
  notesTable,
  subjectsTable,
  relationSubjectsUserTable,
  flaggedNotesTable,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSubscriptionStatus } from "./subscription-utils";
import { unstable_cache } from "next/cache";
import {
  DashboardSubscriptionData,
  DashboardRecentStudyData,
} from "@/types/dashboardTypes";

/**
 * Get subscription data for dashboard display
 */
export async function getDashboardSubscriptionData(
  userId: string
): Promise<DashboardSubscriptionData> {
  const subscriptionStatus = await getSubscriptionStatus(userId);

  if (!subscriptionStatus || !subscriptionStatus.isActive) {
    return {
      hasActiveSubscription: false,
      planName: "Nessun piano attivo",
      daysUntilRenewal: null,
      renewalDate: null,
      price: null,
    };
  }

  const currentDate = new Date();
  const renewalDate = subscriptionStatus.currentPeriodEnd;

  let daysUntilRenewal: number | null = null;
  let renewalDateString: string | null = null;

  if (renewalDate) {
    const renewalDateObj =
      typeof renewalDate === "string" ? new Date(renewalDate) : renewalDate;
    daysUntilRenewal = Math.ceil(
      (renewalDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    renewalDateString = renewalDateObj.toLocaleDateString("it-IT");
  }

  return {
    hasActiveSubscription: true,
    planName: `Piano ${subscriptionStatus.subjectCount} Materie`,
    daysUntilRenewal,
    renewalDate: renewalDateString,
    price: subscriptionStatus.price,
  };
}

/**
 * Get recent study sessions for dashboard display
 */
export function getDashboardRecentStudyData(
  userId: string,
  limit: number = 6
): Promise<DashboardRecentStudyData[]> {
  return unstable_cache(
    async (): Promise<DashboardRecentStudyData[]> => {
      const recentSessions = await db
        .select({
          sessionId: noteStudySessionsTable.id,
          noteId: noteStudySessionsTable.note_id,
          noteTitle: notesTable.title,
          noteSlug: notesTable.slug,
          subjectName: subjectsTable.name,
          subjectSlug: subjectsTable.slug,
          subjectColor: subjectsTable.color,
          started_at: noteStudySessionsTable.started_at,
          last_active_at: noteStudySessionsTable.last_active_at,
          is_favorite: flaggedNotesTable.id,
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
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .where(eq(noteStudySessionsTable.user_id, userId))
        .orderBy(desc(noteStudySessionsTable.last_active_at))
        .limit(limit);

      // Group by note to get the most recent session for each note
      const notesMap = new Map<string, any>();

      recentSessions.forEach((session) => {
        const noteId = session.noteId;
        if (
          !notesMap.has(noteId) ||
          new Date(session.last_active_at) >
            new Date(notesMap.get(noteId).last_active_at)
        ) {
          notesMap.set(noteId, session);
        }
      });

      // Convert to array and calculate study time aggregated for the SAME DAY as the latest session
      const latestPerNote = Array.from(notesMap.values());
      const results: DashboardRecentStudyData[] = await Promise.all(
        latestPerNote.map(async (session) => {
          const latestDate = new Date(session.last_active_at);
          const dayStart = new Date(latestDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(latestDate);
          dayEnd.setHours(23, 59, 59, 999);

          // Fetch all sessions for this note on the same day (overlap) to aggregate time
          const sessionsForDay = await db
            .select({
              started_at: noteStudySessionsTable.started_at,
              last_active_at: noteStudySessionsTable.last_active_at,
            })
            .from(noteStudySessionsTable)
            .where(
              and(
                eq(noteStudySessionsTable.user_id, userId),
                eq(noteStudySessionsTable.note_id, session.noteId),
                sql`${noteStudySessionsTable.started_at} <= ${dayEnd} AND ${noteStudySessionsTable.last_active_at} >= ${dayStart}`
              )
            );

          let totalDurationMs = 0;
          for (const s of sessionsForDay) {
            const sStart = new Date(s.started_at);
            const sEnd = new Date(s.last_active_at);
            const effectiveStart = sStart < dayStart ? dayStart : sStart;
            const effectiveEnd = sEnd > dayEnd ? dayEnd : sEnd;
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
            id: session.noteId,
            title: session.noteTitle,
            subjectName: session.subjectName,
            subjectSlug: session.subjectSlug,
            subjectColor: session.subjectColor,
            slug: session.noteSlug || "",
            lastStudiedAt: new Date(session.last_active_at),
            studyTimeMinutes,
            is_favorite: !!session.is_favorite,
          };
        })
      );

      return results;
    },
    ["getDashboardRecentStudyData", userId, String(limit)],
    {
      revalidate: 30,
      tags: ["study-sessions", "dashboard", `user-${userId}`],
    }
  )();
}
