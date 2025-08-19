import {
  TopicType,
  SubtopicType,
  TopicWithSubtopicsType,
  SidebarTopicType,
  SidebarSubtopicType,
} from "@/types/topicsTypes";

// Theory content types
export interface TheoryContentType {
  id: string;
  subtopic_id: string;
  title: string;
  content: string;
  created_at?: Date;
}

export interface ExerciseCardType {
  id: string;
  subtopic_id: string | null;
  description: string;
  difficulty: number;
  total_exercises: number;
  completed_exercises: number;
  is_completed: boolean;
  is_flagged?: boolean;
}

export interface SubtopicWithTheoryType extends SubtopicType {
  theory: TheoryContentType[];
  exercise_cards: ExerciseCardType[];
}

// Re-export for convenience
export type {
  TopicType,
  SubtopicType,
  TopicWithSubtopicsType,
  SidebarTopicType,
  SidebarSubtopicType,
};

// Component props interfaces
export interface TopicClientProps {
  currentTopic: TopicType;
  topicsWithSubtopics: TopicWithSubtopicsType[];
  subtopicsWithTheory: SubtopicWithTheoryType[];
  activeSubtopicId?: string;
  userId: string;
}

export interface TopicsSidebarProps {
  topics: SidebarTopicType[];
  activeTopicId?: string;
  activeSubtopicId?: string;
  onTopicClick?: (topicId: string) => void;
  onSubtopicClick?: (subtopicId: string) => void;
  basePath?: string;
  completedTopicIds?: string[];
  completedSubtopicIds?: string[];
  readingProgress?: Record<string, number>;
}

// Completion status tracking
export interface CompletionStatus {
  completedTopicIds: string[];
  completedSubtopicIds: string[];
}

// Layout component props
export interface TheoryLayoutProps {
  children: React.ReactNode;
  topics: SidebarTopicType[];
  completedTopics: string[];
  completedSubtopics: string[];
}
