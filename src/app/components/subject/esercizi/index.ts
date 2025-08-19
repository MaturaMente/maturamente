// Exercise components index file for cleaner imports
export { ExerciseProvider, useExerciseContext } from "./exercise-context";
export { default as ExerciseHeader } from "./exercises-header";
export { default as ExerciseCardDetail } from "./exercise-card-detail";
export { GeneralExercisesPage, TopicExercisesPage } from "./exercises-page";
export {
  ExerciseProgress,
  ExerciseFilter,
  useExerciseFilters,
  useIsMobile,
} from "./exercise-utils";
export type { FilterState } from "@/types/exercisesTypes";
