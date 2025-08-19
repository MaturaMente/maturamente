"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExerciseCard from "@/app/components/subject/esercizi/cards/exercise-card";
import MobileExerciseItem from "@/app/components/subject/esercizi/cards/exercise-card-mobile";
import TopicsSidebar from "@/app/components/shared/navigation/topics-sidebar";
import ExerciseHeader from "@/app/components/subject/esercizi/exercises-header";
import { ExerciseProvider, useExerciseContext } from "./exercise-context";
import {
  ExerciseFilter,
  useExerciseFilters,
  useIsMobile,
} from "./exercise-utils";
import { ExerciseTopicClientProps } from "@/types/exercisesTypes";
import { SidebarTopicType } from "@/types/theoryTypes";
import { TopicWithSubtopicsType } from "@/types/topicsTypes";
import { SubtopicGroup, TopicGroup } from "@/types/exercisesTypes";
import { cn } from "@/lib/utils";

// Main Exercises Page for all exercises (general view)
interface GeneralExercisesPageProps {
  topicsWithSubtopics: TopicWithSubtopicsType[];
  exerciseCardsByTopic: Record<string, TopicGroup>;
  subjectSlug: string;
}

export function GeneralExercisesPage({
  topicsWithSubtopics,
  exerciseCardsByTopic,
  subjectSlug,
}: GeneralExercisesPageProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const activeSubtopicId = searchParams.get("subtopic") || undefined;
  const activeTopicId = searchParams.get("topic") || undefined;

  const { isMobile, mounted } = useIsMobile();
  const { filterState, handleFilterChange, clearFilters, filterCard } =
    useExerciseFilters();

  // Filter exercise cards based on current filters
  const filteredExerciseCardsByTopic = Object.entries(
    exerciseCardsByTopic
  ).reduce((acc, [topicId, topic]) => {
    const filteredSubtopics = Object.entries(topic.subtopics).reduce(
      (subAcc, [subtopicId, subtopic]: [string, SubtopicGroup]) => {
        const filteredCards = subtopic.exercise_cards.filter(filterCard);

        if (filteredCards.length > 0) {
          subAcc[subtopicId] = {
            ...subtopic,
            exercise_cards: filteredCards,
          };
        }

        return subAcc;
      },
      {} as Record<string, SubtopicGroup>
    );

    if (Object.keys(filteredSubtopics).length > 0) {
      acc[topicId] = {
        ...topic,
        subtopics: filteredSubtopics,
      };
    }

    return acc;
  }, {} as Record<string, TopicGroup>);

  const scrollToTopic = (topicId: string, skipUrlUpdate = false) => {
    const element = document.getElementById(`topic-${topicId}`);
    if (element) {
      const headerOffset = isMobile ? 80 : 120; // Responsive offset
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition), // Ensure we don't scroll to negative position
        behavior: "smooth",
      });
    }

    if (!skipUrlUpdate) {
      updateTopicParam(topicId);
    }
  };

  const updateSubtopicParam = (subtopicId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("subtopic", subtopicId);
    params.delete("topic");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updateTopicParam = (topicId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("topic", topicId);
    params.delete("subtopic");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!mounted) {
    return null;
  }

  return (
    <div>
      {/* Mobile Topic Menu */}
      <div className="block md:hidden mb-4">
        <TopicsSidebar
          topics={topicsWithSubtopics}
          activeTopicSlug={activeTopicId}
          activeSubtopicSlug={activeSubtopicId}
          onTopicClick={scrollToTopic}
          onSubtopicClick={updateSubtopicParam}
        />
      </div>

      <div className="flex justify-between items-center mb-8 border-b pb-4 border-border">
        <h1 className="text-4xl font-bold text-primary">Esercizi</h1>
        <ExerciseFilter
          filters={filterState}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-8">
        {/* Main content */}
        <div className="w-full md:w-3/4 lg:border-r lg:border-muted lg:pr-8">
          {Object.entries(filteredExerciseCardsByTopic).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nessun esercizio trovato con i filtri selezionati.
            </div>
          ) : (
            Object.entries(filteredExerciseCardsByTopic).map(
              ([topicId, topic]) => (
                <div
                  key={topicId}
                  id={`topic-${topicId}`}
                  className="mb-10 scroll-mt-24"
                >
                  <h2 className="text-3xl text-foreground/95 font-semibold mb-4 border-b border-muted pb-2">
                    {topic.topic_order !== null
                      ? `${topic.topic_order}. ${topic.topic_name}`
                      : topic.topic_name}
                  </h2>

                  {Object.entries(topic.subtopics).map(
                    ([subtopicId, subtopic], subtopicIndex) => (
                      <div
                        key={subtopicId}
                        id={`subtopic-${subtopicId}`}
                        className="mb-8 scroll-mt-24"
                      >
                        <div
                          className={`text-2xl text-foreground/80 lg:rounded-sm font-medium mb-2 lg:mb-5 flex flex-row gap-2 ${
                            subtopicId === activeSubtopicId
                              ? "lg:border-l-4 lg:border-primary"
                              : "lg:border-l-4 lg:border-border"
                          } lg:pl-2`}
                        >
                          <h3
                            className={`${
                              subtopicId === activeSubtopicId
                                ? "text-primary"
                                : "text-foreground/80"
                            }`}
                          >
                            {topic.topic_order !== null &&
                            subtopic.subtopic_order !== null
                              ? `${topic.topic_order}.${subtopic.subtopic_order} `
                              : ""}
                          </h3>
                          <h3>{subtopic.subtopic_name}</h3>
                        </div>

                        <div
                          className={
                            isMobile
                              ? "space-y-0 rounded-md overflow-hidden"
                              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                          }
                        >
                          {subtopic.exercise_cards.map((card, index) =>
                            isMobile ? (
                              <div
                                key={card.id}
                                className={cn(
                                  "",
                                  index === 0
                                    ? "border-b border-foreground/10"
                                    : "border-b border-foreground/10",
                                  index === subtopic.exercise_cards.length - 1
                                    ? ""
                                    : ""
                                )}
                              >
                                <MobileExerciseItem
                                  key={card.id}
                                  id={card.id}
                                  topicName={card.topic_name || ""}
                                  topicOrder={card.topic_order ?? null}
                                  subtopicName={card.subtopic_name || ""}
                                  subtopicOrder={card.subtopic_order ?? null}
                                  description={card.description}
                                  difficulty={card.difficulty}
                                  isCompleted={card.is_completed}
                                  totalExercises={card.total_exercises}
                                  completedExercises={card.score ?? undefined}
                                />
                              </div>
                            ) : (
                              <ExerciseCard
                                key={card.id}
                                id={card.id}
                                topicName={card.topic_name || ""}
                                topicOrder={card.topic_order ?? null}
                                subtopicName={card.subtopic_name || ""}
                                subtopicOrder={card.subtopic_order ?? null}
                                description={card.description}
                                difficulty={card.difficulty}
                                isCompleted={card.is_completed}
                                totalExercises={card.total_exercises}
                                completedExercises={card.score ?? undefined}
                                disableHeader={true}
                              />
                            )
                          )}
                        </div>

                        {/* Add divider between subtopics except for the last one */}
                        {subtopicIndex <
                          Object.entries(topic.subtopics).length - 1 && (
                          <div className="lg:my-8 lg:border-b lg:border-muted"></div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )
            )
          )}
        </div>

        {/* Sidebar (only shown on desktop) */}
        <div className="hidden md:block md:w-1/4 relative">
          <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto lg:pb-10 pb-0">
            <TopicsSidebar
              topics={topicsWithSubtopics}
              activeTopicSlug={activeTopicId}
              activeSubtopicSlug={activeSubtopicId}
              onTopicClick={scrollToTopic}
              onSubtopicClick={updateSubtopicParam}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Topic-specific Exercises Page (for individual topic view)
export function TopicExercisesPage({
  currentTopic,
  topicsWithSubtopics,
  subtopicsWithExercises,
  favoriteExerciseCards,
  subjectColor,
  activeSubtopicId: initialActiveSubtopicId,
  userId,
  subjectSlug,
}: ExerciseTopicClientProps) {
  const router = useRouter();
  const subtopicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { isMobile, mounted } = useIsMobile();
  const { filterState, handleFilterChange, clearFilters, filterCard } =
    useExerciseFilters();

  // Convert topicsWithSubtopics to the format expected by the ExerciseProvider
  const formattedTopics: SidebarTopicType[] = topicsWithSubtopics.map(
    (topic) => ({
      id: topic.id,
      name: topic.name,
      description: topic.description || null,
      order_index: topic.order_index,
      slug: topic.slug,
      subtopics: topic.subtopics.map((subtopic) => ({
        id: subtopic.id,
        name: subtopic.name,
        order_index: subtopic.order_index,
        topic_id: subtopic.topic_id,
        slug: subtopic.slug,
      })),
    })
  );

  // Get info about completed topics and subtopics
  const completedTopicIds = topicsWithSubtopics
    .filter((topic) => {
      const subtopicsForTopic = subtopicsWithExercises.filter(
        (s) => s.topic_id === topic.id
      );
      const allSubtopicsCompleted = subtopicsForTopic.every((subtopic) => {
        return subtopic.exercise_cards.every((card) => card.is_completed);
      });
      return allSubtopicsCompleted && subtopicsForTopic.length > 0;
    })
    .map((topic) => topic.id);

  const completedSubtopicIds = subtopicsWithExercises
    .filter((subtopic) => {
      return subtopic.exercise_cards.every((card) => card.is_completed);
    })
    .map((subtopic) => subtopic.id);

  return (
    <ExerciseProvider
      topics={formattedTopics}
      initialCompletedTopics={completedTopicIds}
      initialCompletedSubtopics={completedSubtopicIds}
      activeTopicId={currentTopic.id}
      activeSubtopicId={initialActiveSubtopicId}
    >
      <TopicExercisesContent
        currentTopic={currentTopic}
        topicsWithSubtopics={topicsWithSubtopics}
        subtopicsWithExercises={subtopicsWithExercises}
        favoriteExerciseCards={favoriteExerciseCards}
        subjectColor={subjectColor}
        initialActiveSubtopicId={initialActiveSubtopicId}
        subjectSlug={subjectSlug}
        filterState={filterState}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        filterCard={filterCard}
        isMobile={isMobile}
        mounted={mounted}
        subtopicRefs={subtopicRefs}
        observerRef={observerRef}
      />
    </ExerciseProvider>
  );
}

// Separated content component for cleaner structure
function TopicExercisesContent({
  currentTopic,
  topicsWithSubtopics,
  subtopicsWithExercises,
  favoriteExerciseCards,
  subjectColor,
  initialActiveSubtopicId,
  subjectSlug,
  filterState,
  handleFilterChange,
  clearFilters,
  filterCard,
  isMobile,
  mounted,
  subtopicRefs,
  observerRef,
}: Omit<ExerciseTopicClientProps, "userId"> & {
  initialActiveSubtopicId?: string;
  filterState: any;
  handleFilterChange: any;
  clearFilters: any;
  filterCard: any;
  isMobile: boolean;
  mounted: boolean;
  subtopicRefs: any;
  observerRef: any;
}) {
  const router = useRouter();
  const { updateViewedSubtopic } = useExerciseContext();

  // State for favorite exercise cards
  const [localFavoriteCards, setLocalFavoriteCards] = useState(
    favoriteExerciseCards
  );

  // Handle flag changes to update favorites
  const handleCardFlagChange = (cardId: string, isFlagged: boolean) => {
    if (isFlagged) {
      // If card was flagged and it's not already in favorites, we would need to fetch it
      // For now, we'll just update the existing cards in favorites
      setLocalFavoriteCards((prev) =>
        prev.map((card) =>
          card.id === cardId ? { ...card, is_flagged: true } : card
        )
      );
    } else {
      // If card was unflagged, check if it should still be in favorites
      // (it could still have flagged exercises)
      setLocalFavoriteCards((prev) =>
        prev
          .map((card) =>
            card.id === cardId ? { ...card, is_flagged: false } : card
          )
          .filter((card) => {
            // Keep in favorites if either the card is flagged OR it might have flagged exercises
            // For simplicity, we'll just update the flag status but keep the card
            return card.id !== cardId || card.is_flagged;
          })
      );
    }
  };

  // Function to find next topic
  const findNextTopic = () => {
    if (currentTopic.order_index === null) {
      return topicsWithSubtopics[0]?.id;
    }

    const sortedTopics = [...topicsWithSubtopics].sort((a, b) => {
      if (a.order_index === null) return 1;
      if (b.order_index === null) return -1;
      return a.order_index - b.order_index;
    });

    const currentIndex = sortedTopics.findIndex(
      (t) => t.id === currentTopic.id
    );

    if (currentIndex < sortedTopics.length - 1) {
      return sortedTopics[currentIndex + 1].id;
    }

    return null;
  };

  const nextTopicId = findNextTopic();

  // Sidebar navigation functions
  const getTopicSlugFromId = (topicId: string): string | undefined => {
    return topicsWithSubtopics.find((topic) => topic.id === topicId)?.slug;
  };

  const getSubtopicSlugFromId = (subtopicId: string): string | undefined => {
    for (const topic of topicsWithSubtopics) {
      const subtopic = topic.subtopics.find((sub) => sub.id === subtopicId);
      if (subtopic) return subtopic.slug;
    }
    return undefined;
  };

  const getSubtopicIdFromSlug = (subtopicSlug: string): string | undefined => {
    for (const topic of topicsWithSubtopics) {
      const subtopic = topic.subtopics.find((sub) => sub.slug === subtopicSlug);
      if (subtopic) return subtopic.id;
    }
    return undefined;
  };

  const handleTopicClick = (topicSlug: string) => {
    router.push(`/${subjectSlug}/esercizi/${topicSlug}`);
  };

  const handleSubtopicClick = (subtopicSlug: string) => {
    const topic = topicsWithSubtopics.find((t) =>
      t.subtopics.some((s) => s.slug === subtopicSlug)
    );

    if (topic) {
      sessionStorage.setItem("sidebar_navigation", "true");

      router.push(
        `/${subjectSlug}/esercizi/${topic.slug}?subtopic=${subtopicSlug}`,
        {
          scroll: false,
        }
      );

      const subtopicId = getSubtopicIdFromSlug(subtopicSlug);
      if (subtopicId) {
        setTimeout(() => {
          const element = document.getElementById(subtopicId);
          if (element) {
            // Use consistent scroll calculation for better control
            const headerOffset = isMobile ? 80 : 120;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition =
              elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: "smooth",
            });
          }
        }, 150); // Slightly longer delay for navigation
      }
    }
  };

  // Set up Intersection Observer to track which subtopic is currently in view
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "-100px 0px -65% 0px",
      threshold: [0, 0.1, 0.2, 0.3],
    };

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          if (Math.abs(a.intersectionRatio - b.intersectionRatio) > 0.1) {
            return b.intersectionRatio - a.intersectionRatio;
          }
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });

      const topEntry = visibleEntries[0];

      if (topEntry) {
        const subtopicId = topEntry.target.id;
        if (subtopicId) {
          updateViewedSubtopic(subtopicId);
        }
      }
    }, options);

    Object.values(subtopicRefs.current).forEach((element) => {
      if (element) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [subtopicsWithExercises, updateViewedSubtopic]);

  // When the active subtopic changes, scroll to that element
  useEffect(() => {
    if (
      initialActiveSubtopicId &&
      subtopicRefs.current[initialActiveSubtopicId] &&
      !sessionStorage.getItem("sidebar_navigation")
    ) {
      requestAnimationFrame(() => {
        const targetElement = subtopicRefs.current[initialActiveSubtopicId];
        if (!targetElement) return;

        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    return () => {
      sessionStorage.removeItem("sidebar_navigation");
    };
  }, [initialActiveSubtopicId]);

  if (!mounted) {
    return null;
  }

  return (
    <div>
      {/* Mobile Topic Menu */}
      <div className="block md:hidden mb-4">
        <ExerciseSidebar
          topicsWithSubtopics={topicsWithSubtopics}
          subjectSlug={subjectSlug}
          handleTopicClick={handleTopicClick}
          handleSubtopicClick={handleSubtopicClick}
          isMobile={true}
        />
      </div>

      <ExerciseHeader
        title={currentTopic.name}
        showTheoryButton
        theoryHref={`/${subjectSlug}/teoria/${currentTopic.id}`}
      >
        <ExerciseFilter
          filters={filterState}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
      </ExerciseHeader>

      <div className="flex flex-col-reverse md:flex-row gap-8">
        {/* Main content */}
        <div className="w-full md:w-3/4 space-y-12 md:border-r md:border-muted md:pr-8">
          {/* Favorites section - only shown when user has favorites */}
          {localFavoriteCards.length > 0 && (
            <div className="mb-8">
              <h2
                className="md:text-3xl text-2xl font-semibold mb-6 border-b border-muted pb-2"
                style={{ color: subjectColor }}
              >
                Esercizi Preferiti
              </h2>

              {/* Desktop Cards View */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localFavoriteCards.filter(filterCard).map((card) => (
                  <ExerciseCard
                    key={card.id}
                    id={card.id}
                    topicName={currentTopic.name}
                    topicOrder={currentTopic.order_index}
                    subtopicName=""
                    subtopicOrder={null}
                    description={card.description}
                    difficulty={card.difficulty}
                    isCompleted={card.is_completed}
                    totalExercises={card.total_exercises}
                    completedExercises={card.completed_exercises}
                    isFlagged={card.is_flagged}
                    customLinkHref={`/${subjectSlug}/esercizi/card/${card.slug}`}
                    onFlagChange={handleCardFlagChange}
                  />
                ))}
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden">
                {localFavoriteCards.filter(filterCard).map((card) => (
                  <div key={card.id} className="border-b border-foreground/10">
                    <MobileExerciseItem
                      id={card.id}
                      topicName={currentTopic.name}
                      topicOrder={currentTopic.order_index}
                      subtopicName=""
                      subtopicOrder={null}
                      description={card.description}
                      difficulty={card.difficulty}
                      isCompleted={card.is_completed}
                      totalExercises={card.total_exercises}
                      completedExercises={card.completed_exercises}
                      isFlagged={card.is_flagged}
                      customLinkHref={`/${subjectSlug}/esercizi/card/${card.slug}`}
                      onFlagChange={handleCardFlagChange}
                    />
                  </div>
                ))}
              </div>

              {/* No results message for favorites */}
              {localFavoriteCards.filter(filterCard).length === 0 && (
                <div className="text-center p-8 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">
                    Nessun esercizio preferito corrisponde ai filtri
                    selezionati.
                  </p>
                </div>
              )}
            </div>
          )}
          {subtopicsWithExercises.length > 0 ? (
            subtopicsWithExercises.map((subtopic, index) => (
              <div
                key={subtopic.id}
                ref={(el) => {
                  if (el) subtopicRefs.current[subtopic.id] = el;
                }}
                id={subtopic.id}
                className="scroll-mt-16"
              >
                <div className="mb-6">
                  <h2 className="md:text-3xl text-2xl font-semibold mb-6 text-foreground/95 border-b border-muted pb-2">
                    {subtopic.order_index !== null
                      ? `${subtopic.order_index}. `
                      : ""}
                    {subtopic.name}
                  </h2>

                  {/* Exercise Cards Section */}
                  {subtopic.exercise_cards.length > 0 ? (
                    <>
                      {/* Desktop Cards View */}
                      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subtopic.exercise_cards
                          .filter(filterCard)
                          .map((card) => (
                            <ExerciseCard
                              key={card.id}
                              id={card.id}
                              topicName={currentTopic.name}
                              topicOrder={currentTopic.order_index}
                              subtopicName={subtopic.name}
                              subtopicOrder={subtopic.order_index}
                              description={card.description}
                              difficulty={card.difficulty}
                              isCompleted={card.is_completed}
                              totalExercises={card.total_exercises}
                              completedExercises={card.completed_exercises}
                              isFlagged={card.is_flagged}
                              customLinkHref={`/${subjectSlug}/esercizi/card/${card.slug}`}
                            />
                          ))}
                      </div>

                      {/* Mobile Cards View */}
                      <div className="md:hidden">
                        {subtopic.exercise_cards
                          .filter(filterCard)
                          .map((card) => (
                            <div
                              key={card.id}
                              className="border-b border-foreground/10"
                            >
                              <MobileExerciseItem
                                id={card.id}
                                topicName={currentTopic.name}
                                topicOrder={currentTopic.order_index}
                                subtopicName={subtopic.name}
                                subtopicOrder={subtopic.order_index}
                                description={card.description}
                                difficulty={card.difficulty}
                                isCompleted={card.is_completed}
                                totalExercises={card.total_exercises}
                                completedExercises={card.completed_exercises}
                                isFlagged={card.is_flagged}
                                customLinkHref={`/${subjectSlug}/esercizi/card/${card.slug}`}
                              />
                            </div>
                          ))}
                      </div>

                      {/* No results message */}
                      {subtopic.exercise_cards.filter(filterCard).length ===
                        0 && (
                        <div className="text-center p-8 bg-muted/30 rounded-lg">
                          <p className="text-muted-foreground">
                            Nessun esercizio corrisponde ai filtri selezionati.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-8 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">
                        Non ci sono esercizi disponibili per questo argomento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-lg">
                Non ci sono ancora esercizi disponibili per questo tema.
              </p>
            </div>
          )}

          {/* Next Topic Button */}
          {nextTopicId && (
            <div className="flex justify-center pt-8 border-t border-muted">
              <Link href={`/${subjectSlug}/esercizi/${nextTopicId}`}>
                <Button
                  className="group px-8 py-6 text-white cursor-pointer"
                  variant="default"
                  size="lg"
                >
                  <span>Vai al prossimo argomento</span>
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar - Hidden on mobile, shown on desktop */}
        <div className="w-full md:w-1/4 hidden md:block">
          <div className="sticky top-8 pt-4">
            <ExerciseSidebar
              topicsWithSubtopics={topicsWithSubtopics}
              subjectSlug={subjectSlug}
              handleTopicClick={handleTopicClick}
              handleSubtopicClick={handleSubtopicClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified Exercise Sidebar Component
function ExerciseSidebar({
  topicsWithSubtopics,
  subjectSlug,
  handleTopicClick,
  handleSubtopicClick,
  isMobile = false,
}: {
  topicsWithSubtopics: any[];
  subjectSlug: string;
  handleTopicClick: (topicSlug: string) => void;
  handleSubtopicClick: (subtopicSlug: string) => void;
  isMobile?: boolean;
}) {
  const {
    topics,
    completedTopicIds,
    completedSubtopicIds,
    exerciseProgress,
    activeTopicId,
    activeSubtopicId,
    viewedSubtopicId,
  } = useExerciseContext();

  // Helper functions
  const getTopicSlugFromId = (topicId: string): string | undefined => {
    return topics.find((topic) => topic.id === topicId)?.slug;
  };

  const getSubtopicSlugFromId = (subtopicId: string): string | undefined => {
    for (const topic of topics) {
      const subtopic = topic.subtopics.find((sub) => sub.id === subtopicId);
      if (subtopic) return subtopic.slug;
    }
    return undefined;
  };

  const activeTopicSlug = activeTopicId
    ? getTopicSlugFromId(activeTopicId)
    : undefined;
  const activeSubtopicSlug =
    viewedSubtopicId || activeSubtopicId
      ? getSubtopicSlugFromId(viewedSubtopicId || activeSubtopicId!)
      : undefined;

  return (
    <div
      className={
        isMobile
          ? "mb-4"
          : "sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto lg:pb-10 pb-0 pt-4"
      }
    >
      <TopicsSidebar
        topics={topics}
        activeTopicSlug={activeTopicSlug}
        activeSubtopicSlug={activeSubtopicSlug}
        onTopicClick={handleTopicClick}
        onSubtopicClick={handleSubtopicClick}
        completedTopicIds={completedTopicIds}
        completedSubtopicIds={completedSubtopicIds}
        readingProgress={exerciseProgress}
        basePath={`/${subjectSlug}/esercizi`}
      />
    </div>
  );
}
