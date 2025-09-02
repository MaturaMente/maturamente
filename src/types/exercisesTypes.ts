/**
 * Core type definitions for the MaturaMente exercises system
 */

import { TopicType, SubtopicType, TopicWithSubtopicsType } from "./topicsTypes";

/**
 * Exercise Card Types
 */

export interface ExerciseCardBaseType {
  id: string;
  subtopic_id: string | null;
  description: string;
  difficulty: number;
  slug: string;
  order_index?: number | null;
}

export interface ExerciseCardCompletionType extends ExerciseCardBaseType {
  total_exercises: number;
  completed_exercises: number;
  is_completed: boolean;
  is_flagged?: boolean;
}

export interface ExerciseCardDetailedType extends ExerciseCardBaseType {
  subtopic_name?: string | null;
  topic_name?: string | null;
  topic_id?: string | null;
  created_at?: Date;
  topic_order?: number | null;
  subtopic_order?: number | null;
  is_completed: boolean;
  total_exercises: number;
  completed_exercises?: number;
  score?: number | null; // Optional score property
}

/**
 * Exercise Content Types
 */

export interface ContentData {
  text?: string;
  html?: string;
  [key: string]: unknown; // Allow for other properties
}

// Type for content that can be either a string, an array of strings, or an object with specific properties
export type ContentType = string | string[] | ContentData;

export interface ExerciseType {
  id: string;
  exercise_card_id?: string;
  question_data: ContentType;
  solution_data: ContentType;
  order_index: number | null;
}

/**
 * Completion Types
 */

export interface CompletedExerciseType {
  exercise_id: string | null;
  isCorrect: boolean;
  attempts?: number;
}

/**
 * Composite Types
 */

export interface SubtopicWithExercisesType extends SubtopicType {
  exercise_cards: ExerciseCardCompletionType[];
}

export interface SubtopicGroup {
  subtopic_name: string;
  subtopic_order: number | null;
  exercise_cards: ExerciseCardDetailedType[];
}

export interface TopicGroup {
  topic_name: string;
  topic_order: number | null;
  subtopics: Record<string, SubtopicGroup>;
}

/**
 * Component Props Types
 */

export interface ExerciseTopicClientProps {
  currentTopic: TopicType;
  topicsWithSubtopics: TopicWithSubtopicsType[];
  subtopicsWithExercises: SubtopicWithExercisesType[];
  favoriteExerciseCards: ExerciseCardCompletionType[];
  subjectColor: string;
  activeSubtopicId?: string;
  userId: string;
  subjectSlug: string;
}

export interface ClientExercisesPageProps {
  topicsWithSubtopics: TopicWithSubtopicsType[];
  exerciseCardsByTopic: Record<string, TopicGroup>;
}

export interface ExerciseCardClientProps {
  id: string;
  description: string;
  difficulty: number;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  exercises: (ExerciseType & { is_flagged?: boolean })[];
  completedExercises: Record<string, CompletedExerciseType>;
  flaggedExercises?: Set<string>;
  card?: {
    id: string;
    description: string;
    difficulty: number;
    topicId: string;
    topicName: string;
    subtopicId: string;
    subtopicName: string;
    is_flagged: boolean;
  };
}

export interface MobileExerciseViewProps {
  id: string;
  number: number;
  question: string;
  solution: string;
  onMarkCorrect: (
    exerciseId: string,
    isCorrect: boolean,
    attempt: number
  ) => Promise<void>;
  isCompleted: boolean;
  wasCorrect: boolean;
  tutorState: "none" | "showOptions" | "showTutor";
  autoExpand: boolean;
  onExerciseComplete: (exerciseId: string, isCorrect: boolean) => void;
  inFavouritesPage?: boolean;
  isFlagged?: boolean;
}

// Local component filter state type for exercise UI
export type FilterState = {
  difficultyFilter: number | null;
  completionFilter: string | null;
};
