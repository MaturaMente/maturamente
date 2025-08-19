"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Notebook } from "lucide-react";
import { TheoryProvider, useTheoryContext } from "./theory-context";
import {
  TheoryHeader,
  TheorySubtopic,
  TheoryNextTopic,
} from "./theory-content";
import TopicsSidebar from "@/app/components/shared/navigation/topics-sidebar";
import {
  TopicType,
  SubtopicWithTheoryType,
  TopicWithSubtopicsType,
  SidebarTopicType,
} from "@/types/theoryTypes";

// Main Theory Page Component
interface TheoryPageProps {
  currentTopic: TopicType;
  subtopicsWithTheory: SubtopicWithTheoryType[];
  topicsWithSubtopics: TopicWithSubtopicsType[];
  topics: SidebarTopicType[];
  initialCompletedTopics: string[];
  initialCompletedSubtopics: string[];
  userId: string | null;
  isAuthenticated?: boolean;
}

export default function TheoryPage({
  currentTopic,
  subtopicsWithTheory,
  topicsWithSubtopics,
  topics,
  initialCompletedTopics,
  initialCompletedSubtopics,
  userId,
  isAuthenticated = false,
}: TheoryPageProps) {
  return (
    <TheoryProvider
      topics={topics}
      initialCompletedTopics={initialCompletedTopics}
      initialCompletedSubtopics={initialCompletedSubtopics}
      isAuthenticated={isAuthenticated}
    >
      <TheoryContent
        currentTopic={currentTopic}
        subtopicsWithTheory={subtopicsWithTheory}
        topicsWithSubtopics={topicsWithSubtopics}
      />
    </TheoryProvider>
  );
}

// Main Content Component
interface TheoryContentProps {
  currentTopic: TopicType;
  subtopicsWithTheory: SubtopicWithTheoryType[];
  topicsWithSubtopics: TopicWithSubtopicsType[];
}

function TheoryContent({
  currentTopic,
  subtopicsWithTheory,
  topicsWithSubtopics,
}: TheoryContentProps) {
  const router = useRouter();
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;
  const isMountedRef = useRef(false);
  const {
    topics,
    completedTopicIds,
    completedSubtopicIds,
    readingProgress,
    activeTopicId,
    activeSubtopicId,
    viewedSubtopicId,
    updateViewedSubtopic,
  } = useTheoryContext();

  // Intersection observer for tracking viewed subtopics
  const subtopicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Guard against updates during unmount
        if (!isMountedRef.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id && isMountedRef.current) {
            const subtopicId = entry.target.id.replace("subtopic-", "");
            updateViewedSubtopic(subtopicId);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: "-20% 0px -20% 0px",
      }
    );

    Object.values(subtopicRefs.current).forEach((element) => {
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      isMountedRef.current = false;
      observerRef.current?.disconnect();
    };
  }, [subtopicsWithTheory, updateViewedSubtopic]);

  const handleSubtopicRef = (id: string, element: HTMLDivElement | null) => {
    if (!isMountedRef.current) return;

    subtopicRefs.current[id] = element;
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  // Sidebar navigation handlers
  const handleTopicClick = (topicSlug: string) => {
    if (!isMountedRef.current) return;
    router.push(`/${subjectSlug}/teoria/${topicSlug}`);
  };

  const handleSubtopicClick = (subtopicSlug: string) => {
    if (!isMountedRef.current) return;

    const topic = topics.find((t) =>
      t.subtopics.some((s) => s.slug === subtopicSlug)
    );

    if (topic) {
      sessionStorage.setItem("sidebar_navigation", "true");
      router.push(
        `/${subjectSlug}/teoria/${topic.slug}?subtopic=${subtopicSlug}`,
        { scroll: false }
      );

      setTimeout(() => {
        if (!isMountedRef.current) return;

        const subtopic = topic.subtopics.find((s) => s.slug === subtopicSlug);
        if (subtopic) {
          const element = document.getElementById(subtopic.id);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 100);
    }
  };

  const activeTopicSlug = topics.find((t) => t.id === activeTopicId)?.slug;
  const activeSubtopicSlug = activeSubtopicId
    ? topics
        .flatMap((t) => t.subtopics)
        .find((s) => s.id === (viewedSubtopicId || activeSubtopicId))?.slug
    : undefined;

  return (
    <div>
      {/* Mobile Topic Menu */}
      <div className="block lg:hidden mb-4">
        <div className="mb-4">
          <TopicsSidebar
            topics={topics}
            activeTopicSlug={activeTopicSlug}
            activeSubtopicSlug={activeSubtopicSlug}
            onTopicClick={handleTopicClick}
            onSubtopicClick={handleSubtopicClick}
            completedTopicIds={completedTopicIds}
            completedSubtopicIds={completedSubtopicIds}
            readingProgress={readingProgress}
            basePath={`/${subjectSlug}/teoria`}
          />
        </div>
      </div>

      {/* Header */}
      <TheoryHeader topic={currentTopic} />

      <div className="flex flex-col md:flex-row gap-4 lg:gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-12">
          {subtopicsWithTheory.length > 0 ? (
            subtopicsWithTheory.map((subtopic, index) => (
              <TheorySubtopic
                key={subtopic.id}
                topic={currentTopic}
                subtopic={subtopic}
                index={index}
                onRef={handleSubtopicRef}
              />
            ))
          ) : (
            <div className="py-8 text-center bg-muted/20 rounded-lg p-6">
              <Notebook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Non ci sono ancora contenuti teorici per questo argomento.
              </p>
            </div>
          )}

          <TheoryNextTopic
            currentTopic={currentTopic}
            topicsWithSubtopics={topicsWithSubtopics}
          />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-1/3 xl:w-1/4 flex-shrink-0 pl-4 border-l border-muted">
          <div className="sticky top-8 pt-4">
            <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto lg:pb-10 pb-0 pt-4">
              <TopicsSidebar
                topics={topics}
                activeTopicSlug={activeTopicSlug}
                activeSubtopicSlug={activeSubtopicSlug}
                onTopicClick={handleTopicClick}
                onSubtopicClick={handleSubtopicClick}
                completedTopicIds={completedTopicIds}
                completedSubtopicIds={completedSubtopicIds}
                readingProgress={readingProgress}
                basePath={`/${subjectSlug}/teoria`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
