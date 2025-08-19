"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SidebarTopicType } from "@/types/theoryTypes";
import { AuthPopup, useAuthPopup } from "@/app/components/auth/auth-popup";

// Types
interface TheoryState {
  completedTopicIds: string[];
  completedSubtopicIds: string[];
  readingProgress: Record<string, number>;
  viewedSubtopicId?: string;
  isLoading: boolean;
}

type TheoryAction =
  | {
      type: "SET_COMPLETION_DATA";
      payload: { completedTopics: string[]; completedSubtopics: string[] };
    }
  | { type: "COMPLETE_TOPIC"; payload: string }
  | { type: "COMPLETE_SUBTOPIC"; payload: string }
  | {
      type: "UPDATE_PROGRESS";
      payload: { subtopicId: string; progress: number };
    }
  | { type: "VIEW_SUBTOPIC"; payload: string }
  | { type: "SET_LOADING"; payload: boolean };

interface TheoryContextProps extends TheoryState {
  topics: SidebarTopicType[];
  activeTopicId?: string;
  activeSubtopicId?: string;
  isAuthenticated: boolean;
  showAuthPopup: () => void;
  completeSubtopic: (subtopicId: string) => Promise<void>;
  completeTopic: (topicId: string) => Promise<void>;
  updateReadingProgress: (subtopicId: string, progress: number) => void;
  updateViewedSubtopic: (subtopicId: string) => void;
}

// Reducer
function theoryReducer(state: TheoryState, action: TheoryAction): TheoryState {
  switch (action.type) {
    case "SET_COMPLETION_DATA":
      return {
        ...state,
        completedTopicIds: action.payload.completedTopics,
        completedSubtopicIds: action.payload.completedSubtopics,
      };
    case "COMPLETE_TOPIC":
      return {
        ...state,
        completedTopicIds: [
          ...new Set([...state.completedTopicIds, action.payload]),
        ],
      };
    case "COMPLETE_SUBTOPIC":
      return {
        ...state,
        completedSubtopicIds: [
          ...new Set([...state.completedSubtopicIds, action.payload]),
        ],
      };
    case "UPDATE_PROGRESS":
      return {
        ...state,
        readingProgress: {
          ...state.readingProgress,
          [action.payload.subtopicId]: Math.max(
            state.readingProgress[action.payload.subtopicId] || 0,
            action.payload.progress
          ),
        },
      };
    case "VIEW_SUBTOPIC":
      return { ...state, viewedSubtopicId: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Context
const TheoryContext = createContext<TheoryContextProps | undefined>(undefined);

export function useTheoryContext() {
  const context = useContext(TheoryContext);
  if (!context) {
    throw new Error("useTheoryContext must be used within a TheoryProvider");
  }
  return context;
}

// Provider component
interface TheoryProviderProps {
  children: ReactNode;
  topics: SidebarTopicType[];
  initialCompletedTopics: string[];
  initialCompletedSubtopics: string[];
  isAuthenticated?: boolean;
}

export function TheoryProvider({
  children,
  topics,
  initialCompletedTopics,
  initialCompletedSubtopics,
  isAuthenticated = false,
}: TheoryProviderProps) {
  const isMountedRef = useRef(false);
  const [state, dispatch] = useReducer(theoryReducer, {
    completedTopicIds: initialCompletedTopics,
    completedSubtopicIds: initialCompletedSubtopics,
    readingProgress: {},
    isLoading: false,
  });

  // URL parsing for active topic/subtopic
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Guard against race conditions during navigation
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const pathSegments = pathname.split("/");
  const activeTopicSlug = pathSegments[pathSegments.length - 1];
  const activeTopic = topics.find((t) => t.slug === activeTopicSlug);
  const activeTopicId = activeTopic?.id;
  const activeSubtopicSlug = searchParams.get("subtopic");
  const activeSubtopicId = activeSubtopicSlug
    ? topics
        .flatMap((t) => t.subtopics)
        .find((s) => s.slug === activeSubtopicSlug)?.id
    : undefined;

  // Auth popup
  const { isAuthPopupOpen, showAuthPopup, hideAuthPopup } = useAuthPopup();

  // Fetch completion data on mount
  useEffect(() => {
    if (!isMountedRef.current) return;

    const fetchCompletionStatus = async () => {
      if (!isAuthenticated || !isMountedRef.current) return;

      try {
        const resp = await fetch(`/api/user/completion-bulk`);
        if (resp.ok && isMountedRef.current) {
          const data = await resp.json();
          dispatch({
            type: "SET_COMPLETION_DATA",
            payload: {
              completedTopics: data.completedTopics || [],
              completedSubtopics: data.completedSubtopics || [],
            },
          });
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Failed to fetch completion status:", error);
        }
      }
    };

    fetchCompletionStatus();
  }, [isAuthenticated]);

  // Completion functions
  const completeSubtopic = async (subtopicId: string) => {
    if (!isMountedRef.current) return;

    if (!isAuthenticated) {
      showAuthPopup();
      return;
    }

    if (state.completedSubtopicIds.includes(subtopicId)) return;

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await fetch("/api/subtopics/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtopic_id: subtopicId }),
      });

      if (response.ok && isMountedRef.current) {
        dispatch({ type: "COMPLETE_SUBTOPIC", payload: subtopicId });
      } else if (!isMountedRef.current) {
        return; // Component unmounted, don't throw error
      } else {
        throw new Error("Failed to complete subtopic");
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error completing subtopic:", error);
        throw error;
      }
    } finally {
      if (isMountedRef.current) {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
  };

  const completeTopic = async (topicId: string) => {
    if (!isMountedRef.current) return;

    if (!isAuthenticated) {
      showAuthPopup();
      return;
    }

    if (state.completedTopicIds.includes(topicId)) return;

    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await fetch("/api/topics/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_id: topicId }),
      });

      if (response.ok && isMountedRef.current) {
        dispatch({ type: "COMPLETE_TOPIC", payload: topicId });
      } else if (!isMountedRef.current) {
        return; // Component unmounted, don't throw error
      } else {
        throw new Error("Failed to complete topic");
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error completing topic:", error);
        throw error;
      }
    } finally {
      if (isMountedRef.current) {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
  };

  const updateReadingProgress = (subtopicId: string, progress: number) => {
    if (!isMountedRef.current) return;
    dispatch({ type: "UPDATE_PROGRESS", payload: { subtopicId, progress } });
  };

  const updateViewedSubtopic = (subtopicId: string) => {
    if (!isMountedRef.current) return;
    dispatch({ type: "VIEW_SUBTOPIC", payload: subtopicId });
  };

  const value: TheoryContextProps = {
    ...state,
    topics,
    activeTopicId,
    activeSubtopicId,
    isAuthenticated,
    showAuthPopup,
    completeSubtopic,
    completeTopic,
    updateReadingProgress,
    updateViewedSubtopic,
  };

  return (
    <TheoryContext.Provider value={value}>
      {children}
      <AuthPopup isOpen={isAuthPopupOpen} onClose={hideAuthPopup} />
    </TheoryContext.Provider>
  );
}
