import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/db/drizzle";
import { eq, inArray, and } from "drizzle-orm";
import {
  exercisesCardsTable,
  exercisesTable,
  completedExercisesTable,
  topicsTable,
  subtopicsTable,
  flaggedExercisesCardsTable,
  flaggedExercisesTable,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  ExerciseCardCompletionType,
  CompletedExerciseType,
  ContentType,
} from "@/types/exercisesTypes";

/**
 * Primary function to get the first topic ID for redirection
 * This is used in the main exercises page to redirect to the first topic
 */
export async function getExercisesData() {
  const session = await auth();

  // Check if user is authenticated and redirect if not
  if (!session?.user?.id) {
    return { firstTopic: null };
  }

  // Get all topics
  const topics = await getAllTopics();

  // If there are topics, return the slug of the first one
  if (topics.length > 0) {
    // Sort topics by order_index if available
    const sortedTopics = [...topics].sort((a, b) => {
      if (a.order_index !== null && b.order_index !== null) {
        return a.order_index - b.order_index;
      } else if (a.order_index !== null) {
        return -1;
      } else if (b.order_index !== null) {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return {
      firstTopic: sortedTopics[0].slug,
    };
  }

  // No topics available
  return { firstTopic: null };
}

/**
 * Get all topics from the database (cached)
 */
export const getAllTopics = cache(async () => {
  return db.select().from(topicsTable).orderBy(topicsTable.order_index);
});

/**
 * Get all exercise cards for a specific subtopic (cached)
 */
export const getExerciseCardsBySubtopic = cache(async (subtopicId: string) => {
  return db
    .select({
      id: exercisesCardsTable.id,
      subtopic_id: exercisesCardsTable.subtopic_id,
      description: exercisesCardsTable.description,
      difficulty: exercisesCardsTable.difficulty,
      slug: exercisesCardsTable.slug,
    })
    .from(exercisesCardsTable)
    .where(eq(exercisesCardsTable.subtopic_id, subtopicId));
});

/**
 * Get all exercise cards for multiple subtopics in a single optimized query
 * Uses a more efficient approach than multiple individual queries
 */
export const getExerciseCardsForSubtopics = cache(
  async (subtopicIds: string[]) => {
    if (subtopicIds.length === 0) return [];

    // Here we use a single query with the inArray operator for better performance
    return db
      .select({
        id: exercisesCardsTable.id,
        subtopic_id: exercisesCardsTable.subtopic_id,
        description: exercisesCardsTable.description,
        difficulty: exercisesCardsTable.difficulty,
        slug: exercisesCardsTable.slug,
      })
      .from(exercisesCardsTable)
      .where(inArray(exercisesCardsTable.subtopic_id, subtopicIds));
  }
);

/**
 * Get all exercises for a specific exercise card (cached)
 */
export const getExercisesByCard = cache(async (cardId: string) => {
  return db
    .select({
      id: exercisesTable.id,
      exercise_card_id: exercisesTable.exercise_card_id,
    })
    .from(exercisesTable)
    .where(eq(exercisesTable.exercise_card_id, cardId));
});

/**
 * Get all exercises for multiple cards in a single query
 */
export const getExercisesForCards = cache(async (cardIds: string[]) => {
  if (cardIds.length === 0) return [];

  // Using a single query with inArray for better performance
  return db
    .select({
      id: exercisesTable.id,
      exercise_card_id: exercisesTable.exercise_card_id,
    })
    .from(exercisesTable)
    .where(inArray(exercisesTable.exercise_card_id, cardIds));
});

/**
 * Get completed exercises for a specific user with caching
 */
export const getCompletedExercises = unstable_cache(
  async (userId: string): Promise<CompletedExerciseType[]> => {
    const results = await db
      .select({
        exercise_id: completedExercisesTable.exercise_id,
        is_correct: completedExercisesTable.is_correct,
      })
      .from(completedExercisesTable)
      .where(eq(completedExercisesTable.user_id, userId));

    // Transform to match our interface
    return results.map((result) => ({
      exercise_id: result.exercise_id,
      isCorrect: result.is_correct,
    }));
  },
  ["user-completed-exercises"],
  { revalidate: 60 }
);

/**
 * Helper function to group exercises by card ID
 */
export const groupExercisesByCard = (
  exercises: Array<{ id: string; exercise_card_id: string }>
) => {
  return exercises.reduce((acc, exercise) => {
    if (!exercise.exercise_card_id) return acc;

    if (!acc[exercise.exercise_card_id]) {
      acc[exercise.exercise_card_id] = [];
    }
    acc[exercise.exercise_card_id].push(exercise.id);
    return acc;
  }, {} as Record<string, string[]>);
};

/**
 * Calculate completion information for exercise cards
 */
export const calculateCardCompletionInfo = (
  exerciseCards: Array<{
    id: string;
    subtopic_id: string | null;
    description: string;
    difficulty: number;
  }>,
  exercisesByCard: Record<string, string[]>,
  correctExerciseIds: Set<string>
) => {
  return exerciseCards.reduce(
    (acc, card) => {
      const exercisesForCard = exercisesByCard[card.id] || [];
      const totalExercises = exercisesForCard.length;
      const completedCount = exercisesForCard.filter((id) =>
        correctExerciseIds.has(id)
      ).length;

      acc[card.id] = {
        total_exercises: totalExercises,
        completed_exercises: completedCount,
        is_completed: totalExercises > 0 && completedCount === totalExercises,
      };

      return acc;
    },
    {} as Record<
      string,
      {
        total_exercises: number;
        completed_exercises: number;
        is_completed: boolean;
      }
    >
  );
};

/**
 * Get exercise cards with all their exercises and completion information
 * Optimized function to fetch exercise data with completion information in a single call
 */
export function getExerciseCardsWithCompletion(
  subtopicIds: string[],
  userId: string
): Promise<ExerciseCardCompletionType[]> {
  return unstable_cache(
    async (): Promise<ExerciseCardCompletionType[]> => {
      // Exit early if no subtopics
      if (!subtopicIds.length) return [];

      // 1. Fetch exercise cards for all subtopics in a single query
      const exerciseCards = await getExerciseCardsForSubtopics(subtopicIds);
      if (!exerciseCards.length) return [];

      // 2. Get card IDs for fetching exercises
      const cardIds = exerciseCards.map((card) => card.id);

      // 3. Fetch all exercises for these cards in a single query
      const allExercises = await getExercisesForCards(cardIds);

      // 4. Group exercises by card ID for easier processing
      const exercisesByCard = groupExercisesByCard(allExercises);

      // 5. Get user's completed exercises
      const completedExercises = await getCompletedExercises(userId);

      // 6. Get flagged cards for the user
      const flaggedCards = await db
        .select({
          exercise_card_id: flaggedExercisesCardsTable.exercise_card_id,
        })
        .from(flaggedExercisesCardsTable)
        .where(eq(flaggedExercisesCardsTable.user_id, userId));

      // Create a Set of flagged card IDs for O(1) lookups
      const flaggedCardIds = new Set(flaggedCards.map((f) => f.exercise_card_id));

      // 7. Create a Set of correctly completed exercise IDs for O(1) lookups
      const correctExerciseIds = new Set(
        completedExercises
          .filter((ex) => ex.isCorrect && ex.exercise_id !== null)
          .map((ex) => ex.exercise_id as string)
      );

      // 8. Calculate completion info and merge with exercise cards
      return exerciseCards.map((card) => {
        const exercisesForCard = exercisesByCard[card.id] || [];
        const totalExercises = exercisesForCard.length;
        const completedCount = exercisesForCard.filter((id) =>
          correctExerciseIds.has(id)
        ).length;

        return {
          ...card,
          total_exercises: totalExercises,
          completed_exercises: completedCount,
          is_completed: totalExercises > 0 && completedCount === totalExercises,
          is_flagged: flaggedCardIds.has(card.id),
        };
      });
    },
    ["getExerciseCardsWithCompletion", userId, ...subtopicIds],
    { revalidate: 60, tags: ["exercises", "completion", `user-${userId}`] }
  )();
}

/**
 * Group exercise cards by subtopic for easy access
 */
export const groupExerciseCardsBySubtopic = (
  exerciseCardsWithCompletion: ExerciseCardCompletionType[]
): Record<string, ExerciseCardCompletionType[]> => {
  return exerciseCardsWithCompletion.reduce((acc, card) => {
    if (!card.subtopic_id) return acc;

    if (!acc[card.subtopic_id]) {
      acc[card.subtopic_id] = [];
    }
    acc[card.subtopic_id].push(card);
    return acc;
  }, {} as Record<string, ExerciseCardCompletionType[]>);
};

/**
 * Get detailed card data with topic and subtopic information
 */
export const getCardDetails = cache(async (cardId: string) => {
  const cardData = await db
    .select({
      id: exercisesCardsTable.id,
      description: exercisesCardsTable.description,
      difficulty: exercisesCardsTable.difficulty,
      subtopic_id: exercisesCardsTable.subtopic_id,
      subtopic_name: subtopicsTable.name,
      topic_id: subtopicsTable.topic_id,
      topic_name: topicsTable.name,
      topic_slug: topicsTable.slug,
      slug: exercisesCardsTable.slug,
    })
    .from(exercisesCardsTable)
    .leftJoin(
      subtopicsTable,
      eq(exercisesCardsTable.subtopic_id, subtopicsTable.id)
    )
    .leftJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
    .where(eq(exercisesCardsTable.id, cardId));

  if (!cardData || cardData.length === 0) {
    return null;
  }

  return cardData[0];
});

/**
 * Get detailed card data with topic and subtopic information by slug
 */
export const getCardDetailsBySlug = cache(async (cardSlug: string) => {
  const cardData = await db
    .select({
      id: exercisesCardsTable.id,
      description: exercisesCardsTable.description,
      difficulty: exercisesCardsTable.difficulty,
      subtopic_id: exercisesCardsTable.subtopic_id,
      subtopic_name: subtopicsTable.name,
      topic_id: subtopicsTable.topic_id,
      topic_name: topicsTable.name,
      topic_slug: topicsTable.slug,
      slug: exercisesCardsTable.slug,
    })
    .from(exercisesCardsTable)
    .leftJoin(
      subtopicsTable,
      eq(exercisesCardsTable.subtopic_id, subtopicsTable.id)
    )
    .leftJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
    .where(eq(exercisesCardsTable.slug, cardSlug));

  if (!cardData || cardData.length === 0) {
    return null;
  }

  return cardData[0];
});

/**
 * Get detailed exercises data for a specific card
 */
export const getDetailedExercisesByCard = cache(async (cardId: string) => {
  const exercisesData = await db
    .select({
      id: exercisesTable.id,
      question_data: exercisesTable.question_data,
      solution_data: exercisesTable.solution_data,
      order_index: exercisesTable.order_index,
    })
    .from(exercisesTable)
    .where(eq(exercisesTable.exercise_card_id, cardId))
    .orderBy(exercisesTable.order_index);

  // Format exercises to match expected type
  return exercisesData.map((exercise) => ({
    id: exercise.id,
    question_data: exercise.question_data as ContentType,
    solution_data: exercise.solution_data as ContentType,
    order_index: exercise.order_index,
    exercise_card_id: cardId,
  }));
});

/**
 * Get completion data for exercises in a card for a specific user
 */
export const getCompletedExercisesForCard = cache(
  async (userId: string, cardId: string) => {
    const completionsData = await db
      .select({
        exercise_id: completedExercisesTable.exercise_id,
        is_correct: completedExercisesTable.is_correct,
        attempt: completedExercisesTable.attempt,
      })
      .from(completedExercisesTable)
      .innerJoin(
        exercisesTable,
        eq(completedExercisesTable.exercise_id, exercisesTable.id)
      )
      .where(
        and(
          eq(completedExercisesTable.user_id, userId),
          eq(exercisesTable.exercise_card_id, cardId)
        )
      );

    // Format completion data to match expected type
    return completionsData.reduce((acc, completion) => {
      if (!completion.exercise_id) return acc;

      // Only keep the latest attempt for each exercise
      if (
        !acc[completion.exercise_id] ||
        acc[completion.exercise_id].attempt < completion.attempt
      ) {
        acc[completion.exercise_id] = {
          isCorrect: completion.is_correct,
          attempt: completion.attempt,
          exercise_id: completion.exercise_id,
        };
      }
      return acc;
    }, {} as Record<string, { isCorrect: boolean; attempt: number; exercise_id: string }>);
  }
);

/**
 * Get all data needed for an exercise card detail page
 */
export const getExerciseCardData = async (cardId: string, userId: string) => {
  // Get card details
  const card = await getCardDetails(cardId);

  if (!card) {
    return null;
  }

  // Get exercises
  const exercises = await getDetailedExercisesByCard(cardId);

  // Get completion data
  const completedExercises = await getCompletedExercisesForCard(userId, cardId);

  // Check if the card is flagged
  const flaggedCardData = await db
    .select({
      id: flaggedExercisesCardsTable.id,
    })
    .from(flaggedExercisesCardsTable)
    .where(
      and(
        eq(flaggedExercisesCardsTable.user_id, userId),
        eq(flaggedExercisesCardsTable.exercise_card_id, cardId)
      )
    );

  const isCardFlagged = flaggedCardData.length > 0;

  // Get flagged state for all exercises in this card
  const exerciseIds = exercises.map((ex) => ex.id);

  const flaggedExercises = await db
    .select({
      exercise_id: flaggedExercisesTable.exercise_id,
    })
    .from(flaggedExercisesTable)
    .where(
      and(
        eq(flaggedExercisesTable.user_id, userId),
        inArray(flaggedExercisesTable.exercise_id, exerciseIds)
      )
    );

  // Create a map of exercise id to flagged state
  const flaggedExercisesMap = new Set(
    flaggedExercises
      .map((item) => item.exercise_id)
      .filter((id): id is string => id !== null)
  );

  // Add flagged status to each exercise
  const exercisesWithFlagStatus = exercises.map((exercise) => ({
    ...exercise,
    is_flagged: flaggedExercisesMap.has(exercise.id),
  }));

  // Safely handle possible null values
  const topicId = card.topic_id || "";
  const topicName = card.topic_name || "";
  const subtopicId = card.subtopic_id || "";
  const subtopicName = card.subtopic_name || "";

  return {
    card: {
      id: card.id,
      description: card.description,
      difficulty: card.difficulty,
      topicId,
      topicName,
      subtopicId,
      subtopicName,
      is_flagged: isCardFlagged,
    },
    exercises: exercisesWithFlagStatus,
    completedExercises,
    flaggedExercises: flaggedExercisesMap,
  };
};

/**
 * Get all data needed for an exercise card detail page by slug
 */
export const getExerciseCardDataBySlug = async (
  cardSlug: string,
  userId: string
) => {
  // Get card details by slug
  const card = await getCardDetailsBySlug(cardSlug);

  if (!card) {
    return null;
  }

  // Get exercises using the card ID
  const exercises = await getDetailedExercisesByCard(card.id);

  // Get completion data
  const completedExercises = await getCompletedExercisesForCard(
    userId,
    card.id
  );

  // Check if the card is flagged
  const flaggedCardData = await db
    .select({
      id: flaggedExercisesCardsTable.id,
    })
    .from(flaggedExercisesCardsTable)
    .where(
      and(
        eq(flaggedExercisesCardsTable.user_id, userId),
        eq(flaggedExercisesCardsTable.exercise_card_id, card.id)
      )
    );

  const isCardFlagged = flaggedCardData.length > 0;

  // Get flagged state for all exercises in this card
  const exerciseIds = exercises.map((ex) => ex.id);

  const flaggedExercises = await db
    .select({
      exercise_id: flaggedExercisesTable.exercise_id,
    })
    .from(flaggedExercisesTable)
    .where(
      and(
        eq(flaggedExercisesTable.user_id, userId),
        inArray(flaggedExercisesTable.exercise_id, exerciseIds)
      )
    );

  // Create a map of exercise id to flagged state
  const flaggedExercisesMap = new Set(
    flaggedExercises
      .map((item) => item.exercise_id)
      .filter((id): id is string => id !== null)
  );

  // Add flagged status to each exercise
  const exercisesWithFlagStatus = exercises.map((exercise) => ({
    ...exercise,
    is_flagged: flaggedExercisesMap.has(exercise.id),
  }));

  // Safely handle possible null values
  const topicId = card.topic_id || "";
  const topicName = card.topic_name || "";
  const topicSlug = card.topic_slug || "";
  const subtopicId = card.subtopic_id || "";
  const subtopicName = card.subtopic_name || "";

  return {
    id: card.id,
    description: card.description,
    difficulty: card.difficulty,
    topicId,
    topicName,
    topicSlug,
    subtopicId,
    subtopicName,
    exercises: exercisesWithFlagStatus,
    completedExercises,
    flaggedExercises: flaggedExercisesMap,
    card: {
      id: card.id,
      description: card.description,
      difficulty: card.difficulty,
      topicId,
      topicName,
      topicSlug,
      subtopicId,
      subtopicName,
      is_flagged: isCardFlagged,
    },
  };
};

// Get exercise cards that contain at least one flagged exercise or are flagged themselves for a specific topic
export function getFavoriteExerciseCardsForTopic(
  userId: string,
  topicId: string
): Promise<ExerciseCardCompletionType[]> {
  return unstable_cache(
    async (): Promise<ExerciseCardCompletionType[]> => {
      if (!userId || !topicId) {
        return [];
      }

      // Get all subtopics for this topic
      const subtopics = await db
        .select({
          id: subtopicsTable.id,
        })
        .from(subtopicsTable)
        .where(eq(subtopicsTable.topic_id, topicId));

      if (subtopics.length === 0) {
        return [];
      }

      const subtopicIds = subtopics.map((s) => s.id);

      // Get all exercise cards for this topic
      const exerciseCards = await db
        .select({
          id: exercisesCardsTable.id,
          subtopic_id: exercisesCardsTable.subtopic_id,
          description: exercisesCardsTable.description,
          difficulty: exercisesCardsTable.difficulty,
          slug: exercisesCardsTable.slug,
          order_index: exercisesCardsTable.order_index,
        })
        .from(exercisesCardsTable)
        .where(inArray(exercisesCardsTable.subtopic_id, subtopicIds))
        .orderBy(exercisesCardsTable.order_index);

      if (exerciseCards.length === 0) {
        return [];
      }

      const cardIds = exerciseCards.map((card) => card.id);

      // Get flagged cards
      const flaggedCards = await db
        .select({
          exercise_card_id: flaggedExercisesCardsTable.exercise_card_id,
        })
        .from(flaggedExercisesCardsTable)
        .where(
          and(
            eq(flaggedExercisesCardsTable.user_id, userId),
            inArray(flaggedExercisesCardsTable.exercise_card_id, cardIds)
          )
        );

      const flaggedCardIds = new Set(
        flaggedCards
          .map((f) => f.exercise_card_id)
          .filter((id): id is string => id !== null)
      );

      // Get all exercises for these cards
      const allExercises = await db
        .select({
          id: exercisesTable.id,
          exercise_card_id: exercisesTable.exercise_card_id,
        })
        .from(exercisesTable)
        .where(inArray(exercisesTable.exercise_card_id, cardIds));

      const exerciseIds = allExercises.map((ex) => ex.id);

      // Get flagged exercises
      const flaggedExercises = await db
        .select({
          exercise_id: flaggedExercisesTable.exercise_id,
        })
        .from(flaggedExercisesTable)
        .where(
          and(
            eq(flaggedExercisesTable.user_id, userId),
            inArray(flaggedExercisesTable.exercise_id, exerciseIds)
          )
        );

      const flaggedExerciseIds = new Set(
        flaggedExercises
          .map((f) => f.exercise_id)
          .filter((id): id is string => id !== null)
      );

      // Group exercises by card
      const exercisesByCard = allExercises.reduce((acc, exercise) => {
        if (exercise.exercise_card_id) {
          if (!acc[exercise.exercise_card_id]) {
            acc[exercise.exercise_card_id] = [];
          }
          acc[exercise.exercise_card_id].push(exercise.id);
        }
        return acc;
      }, {} as Record<string, string[]>);

      // Filter cards that are either flagged themselves or contain flagged exercises
      const favoriteCardIds = new Set<string>();

      // Add flagged cards
      flaggedCardIds.forEach((cardId) => favoriteCardIds.add(cardId));

      // Add cards that contain flagged exercises
      Object.entries(exercisesByCard).forEach(([cardId, cardExercises]) => {
        const hasAnyFlaggedExercise = cardExercises.some((exerciseId) =>
          flaggedExerciseIds.has(exerciseId)
        );
        if (hasAnyFlaggedExercise) {
          favoriteCardIds.add(cardId);
        }
      });

      // Filter exercise cards to only include favorites
      const favoriteCards = exerciseCards.filter((card) =>
        favoriteCardIds.has(card.id)
      );

      if (favoriteCards.length === 0) {
        return [];
      }

      // Get completion information for favorite cards
      const favoriteCardIds_array = Array.from(favoriteCardIds);
      const completedExercises = await getCompletedExercises(userId);
      const correctExerciseIds = new Set(
        completedExercises
          .filter((ex) => ex.isCorrect && ex.exercise_id !== null)
          .map((ex) => ex.exercise_id as string)
      );

      // Calculate completion info and return with flagged status
      return favoriteCards.map((card) => {
        const exercisesForCard = exercisesByCard[card.id] || [];
        const totalExercises = exercisesForCard.length;
        const completedCount = exercisesForCard.filter((id) =>
          correctExerciseIds.has(id)
        ).length;

        return {
          ...card,
          total_exercises: totalExercises,
          completed_exercises: completedCount,
          is_completed: totalExercises > 0 && completedCount === totalExercises,
          is_flagged:
            flaggedCardIds.has(card.id) ||
            exercisesForCard.some((exerciseId) =>
              flaggedExerciseIds.has(exerciseId)
            ),
        };
      });
    },
    ["getFavoriteExerciseCardsForTopic", userId, topicId],
    { revalidate: 60, tags: ["exercises", "favorites", `user-${userId}`, `topic-${topicId}`] }
  )();
}
