"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { SidebarTopicType } from "@/types/theoryTypes";

interface ExerciseContextProps {
  topics: SidebarTopicType[];
  completedTopicIds: string[];
  completedSubtopicIds: string[];
  exerciseProgress: Record<string, number>;
  activeTopicId?: string;
  activeSubtopicId?: string;
  viewedSubtopicId?: string;
  updateCompletedTopic: (topicId: string) => void;
  updateCompletedSubtopic: (subtopicId: string) => void;
  updateExerciseProgress: (subtopicId: string, progress: number) => void;
  updateViewedSubtopic: (subtopicId: string) => void;
}

const ExerciseContext = createContext<ExerciseContextProps | undefined>(
  undefined
);

export function useExerciseContext() {
  const context = useContext(ExerciseContext);
  if (!context) {
    throw new Error(
      "useExerciseContext must be used within an ExerciseProvider"
    );
  }
  return context;
}

interface ExerciseProviderProps {
  children: ReactNode;
  topics: SidebarTopicType[];
  initialCompletedTopics: string[];
  initialCompletedSubtopics: string[];
  activeTopicId?: string;
  activeSubtopicId?: string;
}

export function ExerciseProvider({
  children,
  topics,
  initialCompletedTopics,
  initialCompletedSubtopics,
  activeTopicId,
  activeSubtopicId,
}: ExerciseProviderProps) {
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(
    initialCompletedTopics
  );
  const [completedSubtopicIds, setCompletedSubtopicIds] = useState<string[]>(
    initialCompletedSubtopics
  );
  const [exerciseProgress, setExerciseProgress] = useState<
    Record<string, number>
  >({});
  const [viewedSubtopicId, setViewedSubtopicId] = useState<string | undefined>(
    activeSubtopicId
  );

  // Fetch completion status from API on mount - optimized version
  useEffect(() => {
    const fetchCompletionStatus = async () => {
      try {
        // Fetch all completion statuses in a single API call
        const resp = await fetch(`/api/user/completion-bulk`);

        if (resp.ok) {
          const data = await resp.json();

          if (data.completedTopics && Array.isArray(data.completedTopics)) {
            setCompletedTopicIds(data.completedTopics);
          }

          if (
            data.completedSubtopics &&
            Array.isArray(data.completedSubtopics)
          ) {
            setCompletedSubtopicIds(data.completedSubtopics);
          }
        }
      } catch (error) {
        console.error("Failed to fetch completion status:", error);
      }
    };

    fetchCompletionStatus();
  }, []);

  const updateCompletedTopic = (topicId: string) => {
    if (!completedTopicIds.includes(topicId)) {
      setCompletedTopicIds([...completedTopicIds, topicId]);
    }
  };

  const updateCompletedSubtopic = (subtopicId: string) => {
    if (!completedSubtopicIds.includes(subtopicId)) {
      setCompletedSubtopicIds([...completedSubtopicIds, subtopicId]);
    }
  };

  const updateExerciseProgress = (subtopicId: string, progress: number) => {
    setExerciseProgress((prev) => {
      if (progress > (prev[subtopicId] || 0)) {
        return { ...prev, [subtopicId]: progress };
      }
      return prev;
    });
  };

  const updateViewedSubtopic = (subtopicId: string) => {
    setViewedSubtopicId(subtopicId);
  };

  const value = {
    topics,
    completedTopicIds,
    completedSubtopicIds,
    exerciseProgress,
    activeTopicId,
    activeSubtopicId,
    viewedSubtopicId,
    updateCompletedTopic,
    updateCompletedSubtopic,
    updateExerciseProgress,
    updateViewedSubtopic,
  };

  return (
    <ExerciseContext.Provider value={value}>
      {children}
    </ExerciseContext.Provider>
  );
}
