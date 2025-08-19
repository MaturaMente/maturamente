/**
 * Core type definitions for the MaturaMate topics and subtopics system
 */

/**
 * Base Types
 */

export interface TopicType {
  id: string;
  name: string;
  description: string | null;
  order_index: number | null;
  slug: string;
}

export interface SubtopicType {
  id: string;
  topic_id: string;
  name: string;
  order_index: number | null;
  slug: string;
}

/**
 * Composite Types
 */

export interface TopicWithSubtopicsType extends TopicType {
  subtopics: SubtopicType[];
}

/**
 * Sidebar Types
 */

export interface SidebarTopicType extends TopicType {
  subtopics: SidebarSubtopicType[];
}

export interface SidebarSubtopicType extends SubtopicType {
  topic_id: string;
}
