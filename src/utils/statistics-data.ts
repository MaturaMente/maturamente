import { db } from "@/db/drizzle";
import {
  completedSimulationsTable,
  simulationsTable,
  simulationsCardsTable,
  completedTopicsTable,
  completedSubtopicsTable,
  topicsTable,
  subtopicsTable,
  completedExercisesCardsTable,
  exercisesCardsTable,
  completedExercisesTable,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import {
  getAllTopics,
  getAllSubtopics,
  getTopicsBySubjectId,
} from "@/utils/topics-subtopics-data";
import type {
  StatisticsData,
  MonthlyActivity,
  RecentSimulation,
  RecentTheoryItem,
  RecentExerciseCard,
  RawCompletedTopic,
  RawCompletedSubtopic,
  RawCompletedSimulation,
  RawCompletedExerciseCard,
  MonthData,
  SimulationTypeBreakdown,
  RawCompletedExercise,
} from "@/types/statisticsTypes";

/**
 * Calculate simulation type breakdown based on simulation card names
 */
async function calculateSimulationTypeBreakdown(
  userCompletedSimulations: RawCompletedSimulation[],
  allSimulationsData?: any[]
): Promise<SimulationTypeBreakdown> {
  // Get completed simulation IDs
  const completedSimulationIds = userCompletedSimulations
    .map((sim) => sim.simulation_id)
    .filter((id): id is string => id !== null);

  if (completedSimulationIds.length === 0) {
    return { ordinarie: 0, suppletive: 0, straordinarie: 0 };
  }

  // Get simulation card titles for completed simulations
  const completedSimulationsWithCards = await db
    .select({
      simulation_id: simulationsTable.id,
      card_title: simulationsCardsTable.title,
      card_id: simulationsTable.card_id,
    })
    .from(simulationsTable)
    .innerJoin(
      simulationsCardsTable,
      eq(simulationsTable.card_id, simulationsCardsTable.id)
    )
    .where(eq(simulationsTable.id, completedSimulationIds[0]));

  // For multiple IDs, we need to use a different approach
  const allCompletedSimulationsWithCards = await db
    .select({
      simulation_id: simulationsTable.id,
      card_title: simulationsCardsTable.title,
      card_id: simulationsTable.card_id,
    })
    .from(simulationsTable)
    .innerJoin(
      simulationsCardsTable,
      eq(simulationsTable.card_id, simulationsCardsTable.id)
    );

  // Filter to only completed simulations
  const relevantSimulations = allCompletedSimulationsWithCards.filter((sim) =>
    completedSimulationIds.includes(sim.simulation_id)
  );

  // Get unique card IDs from completed simulations
  const completedCardIds = Array.from(
    new Set(relevantSimulations.map((sim) => sim.card_id))
  );

  // Get unique card titles for the completed cards
  const uniqueCompletedCards = await db
    .select({
      id: simulationsCardsTable.id,
      title: simulationsCardsTable.title,
    })
    .from(simulationsCardsTable);

  const completedCardTitles = uniqueCompletedCards
    .filter((card) => completedCardIds.includes(card.id))
    .map((card) => card.title);

  // Count by type based on card titles
  let ordinarie = 0;
  let suppletive = 0;
  let straordinarie = 0;

  completedCardTitles.forEach((title) => {
    if (title.toLowerCase().startsWith("ordinaria")) {
      ordinarie++;
    } else if (title.toLowerCase().startsWith("suppletiva")) {
      suppletive++;
    } else if (title.toLowerCase().startsWith("straordinaria")) {
      straordinarie++;
    }
  });

  return { ordinarie, suppletive, straordinarie };
}

/**
 * Get user's completed simulations data
 */
export function getUserCompletedSimulations(
  userId: string
): Promise<RawCompletedSimulation[]> {
  return unstable_cache(
    async () => {
      return (await db.query.completedSimulationsTable.findMany({
        where: eq(completedSimulationsTable.user_id, userId),
        orderBy: (simulations, { desc }) => [desc(simulations.created_at)],
      })) as RawCompletedSimulation[];
    },
    ["getUserCompletedSimulations", userId],
    { revalidate: 120, tags: ["simulations", "statistics", `user-${userId}`] }
  )();
}

/**
 * Get all available simulations
 */
export function getAllSimulations() {
  return unstable_cache(
    async () => {
      return await db.query.simulationsTable.findMany();
    },
    ["getAllSimulations"],
    { revalidate: 300, tags: ["simulations"] }
  )();
}

/**
 * Get simulations filtered by subject
 */
export function getSimulationsBySubject(subjectId: string) {
  return unstable_cache(
    async () => {
      return await db
        .select()
        .from(simulationsTable)
        .innerJoin(
          simulationsCardsTable,
          eq(simulationsTable.card_id, simulationsCardsTable.id)
        )
        .where(eq(simulationsCardsTable.subject_id, subjectId));
    },
    ["getSimulationsBySubject", subjectId],
    { revalidate: 300, tags: ["simulations", `subject-${subjectId}`] }
  )();
}

/**
 * Calculate simulation statistics
 */
export function getSimulationStatistics(userId: string) {
  return unstable_cache(
    async () => {
      const [userCompletedSimulations, allSimulations] = await Promise.all([
        getUserCompletedSimulations(userId),
        getAllSimulations(),
      ]);

      const completedSimulationIds = userCompletedSimulations.map(
        (sim) => sim.simulation_id
      );
      const uniqueCompletedSimulations = new Set(completedSimulationIds).size;
      const totalSimulations = allSimulations.length;
      const completionPercentage =
        totalSimulations > 0
          ? Math.round((uniqueCompletedSimulations / totalSimulations) * 100)
          : 0;

      const totalTimeSpent = userCompletedSimulations.reduce((total, sim) => {
        if (sim.completed_at && sim.started_at) {
          const start = new Date(sim.started_at);
          const end = new Date(sim.completed_at);
          const durationInMinutes = Math.round(
            (end.getTime() - start.getTime()) / (1000 * 60)
          );
          return total + durationInMinutes;
        }
        return total;
      }, 0);

      const simulationTypeBreakdown = await calculateSimulationTypeBreakdown(
        userCompletedSimulations
      );

      return {
        userCompletedSimulations,
        totalSimulations,
        completedSimulations: uniqueCompletedSimulations,
        completionPercentage,
        totalTimeSpent,
        simulationTypeBreakdown,
      };
    },
    ["getSimulationStatistics", userId],
    {
      revalidate: 120,
      tags: ["statistics", "simulations", `user-${userId}`],
    }
  )();
}

/**
 * Calculate simulation statistics filtered by subject
 */
export function getSimulationStatisticsBySubject(
  userId: string,
  subjectId: string
) {
  return unstable_cache(
    async () => {
      const [userCompletedSimulations, subjectSimulations] = await Promise.all([
        getUserCompletedSimulations(userId),
        getSimulationsBySubject(subjectId),
      ]);

      const subjectSimulationIds = subjectSimulations.map(
        (sim) => sim.simulations.id
      );

      const subjectUserCompletedSimulations = userCompletedSimulations.filter(
        (sim) =>
          sim.simulation_id && subjectSimulationIds.includes(sim.simulation_id)
      );

      const completedSimulationIds = subjectUserCompletedSimulations.map(
        (sim) => sim.simulation_id
      );
      const uniqueCompletedSimulations = new Set(completedSimulationIds).size;
      const totalSimulations = subjectSimulations.length;
      const completionPercentage =
        totalSimulations > 0
          ? Math.round((uniqueCompletedSimulations / totalSimulations) * 100)
          : 0;

      const totalTimeSpent = subjectUserCompletedSimulations.reduce(
        (total, sim) => {
          if (sim.completed_at && sim.started_at) {
            const start = new Date(sim.started_at);
            const end = new Date(sim.completed_at);
            const durationInMinutes = Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60)
            );
            return total + durationInMinutes;
          }
          return total;
        },
        0
      );

      const simulationTypeBreakdown = await calculateSimulationTypeBreakdown(
        subjectUserCompletedSimulations
      );

      return {
        userCompletedSimulations: subjectUserCompletedSimulations,
        totalSimulations,
        completedSimulations: uniqueCompletedSimulations,
        completionPercentage,
        totalTimeSpent,
        simulationTypeBreakdown,
      };
    },
    ["getSimulationStatisticsBySubject", userId, subjectId],
    {
      revalidate: 120,
      tags: [
        "statistics",
        "simulations",
        `user-${userId}`,
        `subject-${subjectId}`,
      ],
    }
  )();
}

/**
 * Get user's completed topics and subtopics
 */
export function getTheoryCompletionData(userId: string) {
  return unstable_cache(
    async () => {
      const [allTopics, allSubtopics] = await Promise.all([
        getAllTopics(),
        getAllSubtopics(),
      ]);

      const [completedTopics, completedSubtopics] = await Promise.all([
        db
          .select({
            topic_id: completedTopicsTable.topic_id,
            created_at: completedTopicsTable.created_at,
            name: topicsTable.name,
            slug: topicsTable.slug,
          })
          .from(completedTopicsTable)
          .innerJoin(
            topicsTable,
            eq(completedTopicsTable.topic_id, topicsTable.id)
          )
          .where(eq(completedTopicsTable.user_id, userId))
          .orderBy(desc(completedTopicsTable.created_at)) as Promise<
          RawCompletedTopic[]
        >,

        db
          .select({
            subtopic_id: completedSubtopicsTable.subtopic_id,
            created_at: completedSubtopicsTable.created_at,
            name: subtopicsTable.name,
            topic_id: subtopicsTable.topic_id,
            slug: subtopicsTable.slug,
            topic_slug: topicsTable.slug,
          })
          .from(completedSubtopicsTable)
          .innerJoin(
            subtopicsTable,
            eq(completedSubtopicsTable.subtopic_id, subtopicsTable.id)
          )
          .innerJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
          .where(eq(completedSubtopicsTable.user_id, userId))
          .orderBy(desc(completedSubtopicsTable.created_at)) as Promise<
          RawCompletedSubtopic[]
        >,
      ]);

      const totalTopics = allTopics.length;
      const totalSubtopics = allSubtopics.length;
      const completedTopicsCount = completedTopics.length;
      const completedSubtopicsCount = completedSubtopics.length;

      const topicsCompletionPercentage = Math.round(
        (completedTopicsCount / totalTopics) * 100
      );
      const subtopicsCompletionPercentage = Math.round(
        (completedSubtopicsCount / totalSubtopics) * 100
      );

      return {
        allTopics,
        allSubtopics,
        completedTopics,
        completedSubtopics,
        totalTopics,
        totalSubtopics,
        completedTopicsCount,
        completedSubtopicsCount,
        topicsCompletionPercentage,
        subtopicsCompletionPercentage,
      };
    },
    ["getTheoryCompletionData", userId],
    {
      revalidate: 120,
      tags: ["completion", "statistics", `user-${userId}`],
    }
  )();
}

/**
 * Get user's completed exercise cards data
 */
export function getExerciseCompletionData(userId: string) {
  return unstable_cache(
    async () => {
      // Get all exercise cards and exercises
      const [allExerciseCards, allExercises] = await Promise.all([
        db.query.exercisesCardsTable.findMany(),
        db.query.exercisesTable.findMany(),
      ]);

      // Get user's completed exercise cards
      const completedExerciseCards = (await db
        .select({
          exercise_card_id: completedExercisesCardsTable.exercise_card_id,
          created_at: completedExercisesCardsTable.created_at,
          description: exercisesCardsTable.description,
          slug: exercisesCardsTable.slug,
          difficulty: exercisesCardsTable.difficulty,
          subtopic_name: subtopicsTable.name,
          topic_name: topicsTable.name,
        })
        .from(completedExercisesCardsTable)
        .innerJoin(
          exercisesCardsTable,
          eq(
            completedExercisesCardsTable.exercise_card_id,
            exercisesCardsTable.id
          )
        )
        .leftJoin(
          subtopicsTable,
          eq(exercisesCardsTable.subtopic_id, subtopicsTable.id)
        )
        .leftJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
        .where(eq(completedExercisesCardsTable.user_id, userId))
        .orderBy(
          desc(completedExercisesCardsTable.created_at)
        )) as RawCompletedExerciseCard[];

      // Get user's completed exercises (individual exercises, not cards)
      const completedExercises =
        await db.query.completedExercisesTable.findMany({
          where: eq(completedExercisesTable.user_id, userId),
        });

      // Calculate exercise statistics
      const totalExerciseCards = allExerciseCards.length;
      const totalExercises = allExercises.length;
      const completedExerciseCardsCount = completedExerciseCards.length;
      const completedExercisesCount = new Set(
        completedExercises.map((ex) => ex.exercise_id)
      ).size;

      const exerciseCardsCompletionPercentage =
        totalExerciseCards > 0
          ? Math.round((completedExerciseCardsCount / totalExerciseCards) * 100)
          : 0;

      const exercisesCompletionPercentage =
        totalExercises > 0
          ? Math.round((completedExercisesCount / totalExercises) * 100)
          : 0;

      return {
        allExerciseCards,
        allExercises,
        completedExerciseCards,
        completedExercises,
        totalExerciseCards,
        totalExercises,
        completedExerciseCardsCount,
        completedExercisesCount,
        exerciseCardsCompletionPercentage,
        exercisesCompletionPercentage,
      };
    },
    ["getExerciseCompletionData", userId],
    {
      revalidate: 120,
      tags: ["exercises", "statistics", `user-${userId}`],
    }
  )();
}

/**
 * Get user's completed exercise cards data filtered by subject
 */
export function getExerciseCompletionDataBySubject(
  userId: string,
  subjectId: string
) {
  return unstable_cache(
    async () => {
      // Get topics for this subject
      const subjectTopics = await getTopicsBySubjectId(subjectId);
      const subjectTopicIds = subjectTopics.map((topic) => topic.id);

      // Get all subtopics for this subject
      const allSubtopics = await db.query.subtopicsTable.findMany();
      const subjectSubtopics = allSubtopics.filter((subtopic) =>
        subjectTopicIds.includes(subtopic.topic_id)
      );
      const subjectSubtopicIds = subjectSubtopics.map(
        (subtopic) => subtopic.id
      );

      // Get all exercise cards for this subject
      const allExerciseCards = await db.query.exercisesCardsTable.findMany();
      const subjectExerciseCards = allExerciseCards.filter(
        (card) =>
          card.subtopic_id && subjectSubtopicIds.includes(card.subtopic_id)
      );
      const subjectExerciseCardIds = subjectExerciseCards.map(
        (card) => card.id
      );

      // Get all exercises for this subject
      const allExercises = await db.query.exercisesTable.findMany();
      const subjectExercises = allExercises.filter((exercise) =>
        subjectExerciseCardIds.includes(exercise.exercise_card_id)
      );

      // Get user's completed exercise cards for this subject
      const completedExerciseCards = (await db
        .select({
          exercise_card_id: completedExercisesCardsTable.exercise_card_id,
          created_at: completedExercisesCardsTable.created_at,
          description: exercisesCardsTable.description,
          slug: exercisesCardsTable.slug,
          difficulty: exercisesCardsTable.difficulty,
          subtopic_name: subtopicsTable.name,
          topic_name: topicsTable.name,
        })
        .from(completedExercisesCardsTable)
        .innerJoin(
          exercisesCardsTable,
          eq(
            completedExercisesCardsTable.exercise_card_id,
            exercisesCardsTable.id
          )
        )
        .leftJoin(
          subtopicsTable,
          eq(exercisesCardsTable.subtopic_id, subtopicsTable.id)
        )
        .leftJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
        .where(
          and(
            eq(completedExercisesCardsTable.user_id, userId),
            eq(topicsTable.subject_id, subjectId)
          )
        )
        .orderBy(
          desc(completedExercisesCardsTable.created_at)
        )) as RawCompletedExerciseCard[];

      // Get user's completed exercises for this subject
      const completedExercises =
        await db.query.completedExercisesTable.findMany({
          where: eq(completedExercisesTable.user_id, userId),
        });

      // Filter completed exercises to only those belonging to subject exercise cards
      const subjectExerciseIds = subjectExercises.map(
        (exercise) => exercise.id
      );
      const subjectCompletedExercises = completedExercises.filter(
        (completedEx) =>
          completedEx.exercise_id &&
          subjectExerciseIds.includes(completedEx.exercise_id)
      );

      // Calculate exercise statistics for this subject
      const totalExerciseCards = subjectExerciseCards.length;
      const totalExercises = subjectExercises.length;
      const completedExerciseCardsCount = completedExerciseCards.length;
      const completedExercisesCount = new Set(
        subjectCompletedExercises.map((ex) => ex.exercise_id)
      ).size;

      const exerciseCardsCompletionPercentage =
        totalExerciseCards > 0
          ? Math.round((completedExerciseCardsCount / totalExerciseCards) * 100)
          : 0;

      const exercisesCompletionPercentage =
        totalExercises > 0
          ? Math.round((completedExercisesCount / totalExercises) * 100)
          : 0;

      return {
        allExerciseCards: subjectExerciseCards,
        allExercises: subjectExercises,
        completedExerciseCards,
        completedExercises: subjectCompletedExercises,
        totalExerciseCards,
        totalExercises,
        completedExerciseCardsCount,
        completedExercisesCount,
        exerciseCardsCompletionPercentage,
        exercisesCompletionPercentage,
      };
    },
    ["getExerciseCompletionDataBySubject", userId, subjectId],
    {
      revalidate: 120,
      tags: [
        "exercises",
        "statistics",
        `user-${userId}`,
        `subject-${subjectId}`,
      ],
    }
  )();
}

/**
 * Get user's completed topics and subtopics filtered by subject
 */
export function getTheoryCompletionDataBySubject(
  userId: string,
  subjectId: string
) {
  return unstable_cache(
    async () => {
      const [subjectTopics, allSubtopics] = await Promise.all([
        getTopicsBySubjectId(subjectId),
        getAllSubtopics(),
      ]);

      // Filter subtopics to only those belonging to subject topics
      const subjectTopicIds = subjectTopics.map((topic) => topic.id);
      const subjectSubtopics = allSubtopics.filter((subtopic) =>
        subjectTopicIds.includes(subtopic.topic_id)
      );

      const [completedTopics, completedSubtopics] = await Promise.all([
        db
          .select({
            topic_id: completedTopicsTable.topic_id,
            created_at: completedTopicsTable.created_at,
            name: topicsTable.name,
            slug: topicsTable.slug,
          })
          .from(completedTopicsTable)
          .innerJoin(
            topicsTable,
            eq(completedTopicsTable.topic_id, topicsTable.id)
          )
          .where(
            and(
              eq(completedTopicsTable.user_id, userId),
              eq(topicsTable.subject_id, subjectId)
            )
          )
          .orderBy(desc(completedTopicsTable.created_at)) as Promise<
          RawCompletedTopic[]
        >,

        db
          .select({
            subtopic_id: completedSubtopicsTable.subtopic_id,
            created_at: completedSubtopicsTable.created_at,
            name: subtopicsTable.name,
            topic_id: subtopicsTable.topic_id,
            slug: subtopicsTable.slug,
            topic_slug: topicsTable.slug,
          })
          .from(completedSubtopicsTable)
          .innerJoin(
            subtopicsTable,
            eq(completedSubtopicsTable.subtopic_id, subtopicsTable.id)
          )
          .innerJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
          .where(
            and(
              eq(completedSubtopicsTable.user_id, userId),
              eq(topicsTable.subject_id, subjectId)
            )
          )
          .orderBy(desc(completedSubtopicsTable.created_at)) as Promise<
          RawCompletedSubtopic[]
        >,
      ]);

      // Calculate theory completion percentages for this subject
      const totalTopics = subjectTopics.length;
      const totalSubtopics = subjectSubtopics.length;
      const completedTopicsCount = completedTopics.length;
      const completedSubtopicsCount = completedSubtopics.length;

      const topicsCompletionPercentage =
        totalTopics > 0
          ? Math.round((completedTopicsCount / totalTopics) * 100)
          : 0;
      const subtopicsCompletionPercentage =
        totalSubtopics > 0
          ? Math.round((completedSubtopicsCount / totalSubtopics) * 100)
          : 0;

      return {
        allTopics: subjectTopics,
        allSubtopics: subjectSubtopics,
        completedTopics,
        completedSubtopics,
        totalTopics,
        totalSubtopics,
        completedTopicsCount,
        completedSubtopicsCount,
        topicsCompletionPercentage,
        subtopicsCompletionPercentage,
      };
    },
    ["getTheoryCompletionDataBySubject", userId, subjectId],
    {
      revalidate: 120,
      tags: [
        "completion",
        "statistics",
        `user-${userId}`,
        `subject-${subjectId}`,
      ],
    }
  )();
}

/**
 * Generate monthly activity data for the last 6 months
 */
export function generateMonthlyActivity(
  userCompletedSimulations: RawCompletedSimulation[],
  completedTopics: RawCompletedTopic[],
  completedSubtopics: RawCompletedSubtopic[],
  completedExercises: RawCompletedExercise[]
): MonthlyActivity[] {
  // Get the monthly activity data (last 6 months)
  const last6Months: MonthData[] = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: date.toLocaleString("it-IT", { month: "short" }),
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`,
    };
  }).reverse();

  // Calculate monthly activity for both simulations and theory
  return last6Months.map((monthData) => {
    // Count simulations in this month
    const simulationsInMonth = userCompletedSimulations.filter((sim) => {
      const simDate = new Date(sim.completed_at || sim.created_at);
      return (
        simDate.getMonth() === monthData.monthIndex &&
        simDate.getFullYear() === monthData.year
      );
    });

    // Count topics and subtopics completed in this month
    const topicsInMonth = completedTopics.filter((topic) => {
      const topicDate = new Date(topic.created_at);
      return (
        topicDate.getMonth() === monthData.monthIndex &&
        topicDate.getFullYear() === monthData.year
      );
    });

    const subtopicsInMonth = completedSubtopics.filter((subtopic) => {
      const subtopicDate = new Date(subtopic.created_at);
      return (
        subtopicDate.getMonth() === monthData.monthIndex &&
        subtopicDate.getFullYear() === monthData.year
      );
    });

    // Count completed exercises (individual exercises, not cards) in this month
    const exercisesInMonth = completedExercises.filter((exercise) => {
      if (!exercise.exercise_id) return false; // Skip exercises without valid exercise_id
      const exerciseDate = new Date(exercise.created_at);
      return (
        exerciseDate.getMonth() === monthData.monthIndex &&
        exerciseDate.getFullYear() === monthData.year
      );
    });

    return {
      month: monthData.month,
      year: monthData.year,
      simulations: simulationsInMonth.length,
      topics: topicsInMonth.length,
      subtopics: subtopicsInMonth.length,
      exercises: exercisesInMonth.length,
      yearMonth: monthData.yearMonth,
    };
  });
}

/**
 * Generate recent activity data (last 5 activities)
 */
export async function getRecentActivity(
  userCompletedSimulations: RawCompletedSimulation[],
  completedTopics: RawCompletedTopic[],
  completedSubtopics: RawCompletedSubtopic[],
  completedExerciseCards: RawCompletedExerciseCard[]
): Promise<{
  recentSimulations: RecentSimulation[];
  recentTheory: RecentTheoryItem[];
  recentExerciseCards: RecentExerciseCard[];
}> {
  // Get recent activities (combine simulations and theory before limiting)
  const recentSimulations = await Promise.all(
    userCompletedSimulations.map(async (sim) => {
      const simulation = await db.query.simulationsTable.findFirst({
        where: sim.simulation_id
          ? eq(simulationsTable.id, sim.simulation_id)
          : undefined,
      });

      return {
        id: sim.id,
        title: simulation?.title || "Simulazione",
        date: sim.completed_at || sim.created_at, // Keep as Date for sorting
        attempt: sim.attempt,
        simulationId: sim.simulation_id,
        slug: simulation?.slug || null,
        type: "simulation" as const,
      };
    })
  );

  // Prepare theory completions without limiting
  const recentTheory = [
    ...completedTopics
      .filter((topic) => topic.topic_id)
      .map((topic) => ({
        id: topic.topic_id!,
        title: topic.name,
        date: topic.created_at,
        type: "topic" as const,
        slug: topic.slug,
      })),
    ...completedSubtopics
      .filter((subtopic) => subtopic.subtopic_id)
      .map((subtopic) => ({
        id: subtopic.subtopic_id!,
        title: subtopic.name,
        date: subtopic.created_at,
        type: "subtopic" as const,
        topicId: subtopic.topic_id,
        slug: subtopic.slug,
        topicSlug: subtopic.topic_slug,
      })),
  ];

  // Prepare exercise card completions
  const recentExerciseCards = completedExerciseCards
    .filter((exerciseCard) => exerciseCard.exercise_card_id)
    .map((exerciseCard) => ({
      id: exerciseCard.exercise_card_id!,
      title: exerciseCard.description,
      date: exerciseCard.created_at,
      type: "exercise_card" as const,
      exerciseCardId: exerciseCard.exercise_card_id!,
      slug: exerciseCard.slug,
      difficulty: exerciseCard.difficulty,
      subtopicName: exerciseCard.subtopic_name,
      topicName: exerciseCard.topic_name,
    }));

  // Combine all activities, sort globally, then take top 5
  const allActivities = [
    ...recentSimulations,
    ...recentTheory,
    ...recentExerciseCards,
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((activity) => ({
      ...activity,
      date: new Date(activity.date).toLocaleDateString("it-IT"), // Format date after sorting
    }));

  // Split back into separate arrays for the client component
  const finalRecentSimulations = allActivities.filter(
    (activity) => activity.type === "simulation"
  ) as RecentSimulation[];

  const finalRecentTheory = allActivities.filter(
    (activity) => activity.type === "topic" || activity.type === "subtopic"
  ) as RecentTheoryItem[];

  const finalRecentExerciseCards = allActivities.filter(
    (activity) => activity.type === "exercise_card"
  ) as RecentExerciseCard[];

  return {
    recentSimulations: finalRecentSimulations,
    recentTheory: finalRecentTheory,
    recentExerciseCards: finalRecentExerciseCards,
  };
}

/**
 * Get all statistics data for a user filtered by subject
 */
export function getAllStatisticsDataBySubject(
  userId: string,
  subjectId: string
): Promise<StatisticsData> {
  return unstable_cache(
    async (): Promise<StatisticsData> => {
      const simulationStats = await getSimulationStatisticsBySubject(
        userId,
        subjectId
      );

      const theoryData = await getTheoryCompletionDataBySubject(
        userId,
        subjectId
      );

      const exerciseData = await getExerciseCompletionDataBySubject(
        userId,
        subjectId
      );

      const monthlyActivity = generateMonthlyActivity(
        simulationStats.userCompletedSimulations,
        theoryData.completedTopics,
        theoryData.completedSubtopics,
        exerciseData.completedExercises
      );

      const { recentSimulations, recentTheory, recentExerciseCards } =
        await getRecentActivity(
          simulationStats.userCompletedSimulations,
          theoryData.completedTopics,
          theoryData.completedSubtopics,
          exerciseData.completedExerciseCards
        );

      return {
        totalSimulations: simulationStats.totalSimulations,
        completedSimulations: simulationStats.completedSimulations,
        completionPercentage: simulationStats.completionPercentage,
        totalTimeSpent: simulationStats.totalTimeSpent,
        simulationTypeBreakdown: simulationStats.simulationTypeBreakdown,
        totalTopics: theoryData.totalTopics,
        completedTopicsCount: theoryData.completedTopicsCount,
        topicsCompletionPercentage: theoryData.topicsCompletionPercentage,
        totalSubtopics: theoryData.totalSubtopics,
        completedSubtopicsCount: theoryData.completedSubtopicsCount,
        subtopicsCompletionPercentage: theoryData.subtopicsCompletionPercentage,
        totalExerciseCards: exerciseData.totalExerciseCards,
        completedExerciseCards: exerciseData.completedExerciseCardsCount,
        exerciseCardsCompletionPercentage:
          exerciseData.exerciseCardsCompletionPercentage,
        totalExercises: exerciseData.totalExercises,
        completedExercises: exerciseData.completedExercisesCount,
        exercisesCompletionPercentage:
          exerciseData.exercisesCompletionPercentage,
        monthlyActivity,
        recentSimulations,
        recentTheory,
        recentExerciseCards,
      };
    },
    ["getAllStatisticsDataBySubject", userId, subjectId],
    {
      revalidate: 120,
      tags: ["statistics", `user-${userId}`, `subject-${subjectId}`],
    }
  )();
}
