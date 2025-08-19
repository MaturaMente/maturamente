/**
 * Core type definitions for the MaturaMate favorites/preferiti system
 */

/**
 * Content Types
 */
export type ContentType = string | string[] | object;

/**
 * Flagged Simulation Types
 */
export interface FlaggedSimulation {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  time_in_min: number;
  is_complete: boolean;
  card_id: string;
  card_title: string;
  year: number;
  subject_id: string | null;
  subject_name: string | null;
  created_at: string | Date;
  is_completed: boolean;
  is_started: boolean;
  is_flagged: boolean;
  slug: string;
}

/**
 * Flagged Exercise Card Types
 */
export interface FlaggedCard {
  id: string;
  description: string;
  difficulty: number;
  subtopic_id: string | null;
  subtopic_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  created_at: Date;
  is_completed: boolean;
  total_exercises: number;
  completed_exercises: number;
}

/**
 * Flagged Individual Exercise Types
 */
export interface FlaggedExercise {
  id: string;
  question_data: ContentType;
  solution_data: ContentType;
  exercise_card_id: string;
  created_at: string | Date;
  card_description: string;
  difficulty: number;
  subtopic_id: string | null;
  subtopic_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  isCompleted: boolean;
  wasCorrect: boolean;
}

/**
 * Component Props Types
 */
export interface FavoritesClientProps {
  flaggedSimulations: FlaggedSimulation[];
}

/**
 * Database Raw Result Types (before processing)
 */
export interface RawFlaggedSimulation {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  time_in_min: number;
  is_complete: boolean;
  card_id: string;
  card_title: string;
  year: number;
  subject_id: string | null;
  subject_name: string | null;
  created_at: string | Date;
  slug: string;
}

export interface RawFlaggedCard {
  id: string;
  description: string;
  difficulty: number;
  subtopic_id: string | null;
  subtopic_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  created_at: Date;
}
