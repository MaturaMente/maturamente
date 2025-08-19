"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Notebook, CheckCircle, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheoryContext } from "./theory-context";
import MarkdownRenderer from "@/app/components/shared/renderer/markdown-renderer";
import {
  TopicType,
  SubtopicWithTheoryType,
  TopicWithSubtopicsType,
  TheoryContentType,
} from "@/types/theoryTypes";
import TheoryExerciseCards from "./theory-exercise";

// Header Component
interface TheoryHeaderProps {
  topic: TopicType;
}

export function TheoryHeader({ topic }: TheoryHeaderProps) {
  const { completedTopicIds } = useTheoryContext();
  const isCompleted = completedTopicIds.includes(topic.id);

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-2 mb-6 pb-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <h1 className="lg:text-4xl text-2xl font-bold">
            {topic.name}
            {isCompleted && (
              <CheckCircle className="inline-block ml-2 h-6 w-6 text-green-500" />
            )}
          </h1>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/esercizi/${topic.id}`}
              className="hidden md:block"
            >
              <Button
                className="flex items-center gap-2 cursor-pointer"
                variant="outline"
              >
                <Notebook className="h-4 w-4" />
                Esercitati su questo argomento
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subtopic Component
interface TheorySubtopicProps {
  topic: TopicType;
  subtopic: SubtopicWithTheoryType;
  index: number;
  onRef: (id: string, element: HTMLDivElement | null) => void;
}

export function TheorySubtopic({
  topic,
  subtopic,
  index,
  onRef,
}: TheorySubtopicProps) {
  const { completedSubtopicIds, completeSubtopic, isLoading } =
    useTheoryContext();
  const [isCompletingSubtopic, setIsCompletingSubtopic] = useState(false);
  const isMountedRef = useRef(false);
  const isCompleted = completedSubtopicIds.includes(subtopic.id);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleMarkAsCompleted = async () => {
    if (isCompleted || !isMountedRef.current) return;

    setIsCompletingSubtopic(true);
    try {
      await completeSubtopic(subtopic.id);
      if (isMountedRef.current) {
        toast.success("Sottotopico completato con successo!");
      }
    } catch (error) {
      if (isMountedRef.current) {
        toast.error("Errore nel salvare il completamento del sottotopico");
      }
    } finally {
      if (isMountedRef.current) {
        setIsCompletingSubtopic(false);
      }
    }
  };

  const parseContent = (content: string | any): any => {
    if (typeof content === "string") {
      if (content.startsWith("[") && content.endsWith("]")) {
        try {
          return JSON.parse(content);
        } catch (e) {
          return content;
        }
      }
      return content;
    }
    return content;
  };

  return (
    <div
      ref={(el) => onRef(subtopic.id, el)}
      id={subtopic.id}
      data-slug={subtopic.slug}
      className="scroll-mt-16 w-full"
    >
      {index > 0 && (
        <div className="my-10 border-t border-gray-200 dark:border-gray-800 w-full" />
      )}

      <div className="w-full">
        <div className="flex items-center justify-between">
          <h2 className="md:text-3xl text-2xl font-semibold text-foreground/95">
            {subtopic.order_index !== null ? `${subtopic.order_index}. ` : ""}
            <span>{subtopic.name}</span>
            {isCompleted && (
              <CheckCircle className="inline-block ml-2 h-5 w-5 text-green-500" />
            )}
          </h2>
        </div>

        {subtopic.theory.length > 0 ? (
          <div className="mt-6 w-full">
            {subtopic.theory.map((theory: TheoryContentType) => (
              <div key={theory.id} className="space-y-4 w-full">
                <div className="prose max-w-full dark:prose-invert w-full">
                  <MarkdownRenderer
                    content={parseContent(theory.content)}
                    className="theory-content prose-headings:mt-6 prose-headings:mb-4 prose-p:my-4 prose-ul:my-4 prose-ol:my-4"
                  />
                </div>
              </div>
            ))}

            <div className="flex lg:justify-end my-8 justify-center">
              <Button
                variant={isCompleted ? "outline" : "default"}
                size="sm"
                onClick={handleMarkAsCompleted}
                disabled={isCompletingSubtopic || isCompleted || isLoading}
                className={isCompleted ? "text-green-500 border-green-500" : ""}
              >
                {isCompletingSubtopic ? (
                  <>Caricamento...</>
                ) : isCompleted ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Completato
                  </>
                ) : (
                  <div className="flex gap-1 items-center cursor-pointer text-white">
                    <Check className="h-4 w-4 mr-1" />
                    Segna come completato
                  </div>
                )}
              </Button>
            </div>

            <div className="w-full">
              <TheoryExerciseCards topic={topic} subtopic={subtopic} />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Non ci sono ancora contenuti teorici per questo argomento.
          </p>
        )}
      </div>
    </div>
  );
}

// Next Topic Component
interface TheoryNextTopicProps {
  currentTopic: TopicType;
  topicsWithSubtopics: TopicWithSubtopicsType[];
}

export function TheoryNextTopic({
  currentTopic,
  topicsWithSubtopics,
}: TheoryNextTopicProps) {
  const router = useRouter();
  const params = useParams();
  const subjectSlug = params["subject-slug"] as string;
  const { completeTopic, isLoading } = useTheoryContext();
  const [isCompletingTopic, setIsCompletingTopic] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const findNextTopic = () => {
    if (currentTopic.order_index === null) {
      return topicsWithSubtopics[0]?.slug;
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
      return sortedTopics[currentIndex + 1].slug;
    }

    return null;
  };

  const nextTopicSlug = findNextTopic();

  if (!nextTopicSlug) {
    return null;
  }

  const handleNextTopicClick = async () => {
    if (!isMountedRef.current) return;

    setIsCompletingTopic(true);
    try {
      await completeTopic(currentTopic.id);
      if (!isMountedRef.current) return;

      router.push(`/${subjectSlug}/teoria/${nextTopicSlug}`);
      toast.success("Argomento completato con successo!");
    } catch (error) {
      if (isMountedRef.current) {
        toast.error("Errore nel salvare il completamento dell'argomento");
      }
    } finally {
      if (isMountedRef.current) {
        setIsCompletingTopic(false);
      }
    }
  };

  return (
    <div className="flex justify-center pt-8 border-t border-muted mt-12">
      <Button
        className="group px-8 py-6 text-white cursor-pointer"
        variant="default"
        size="lg"
        onClick={handleNextTopicClick}
        disabled={isCompletingTopic || isLoading}
      >
        {isCompletingTopic ? (
          <span>Caricamento...</span>
        ) : (
          <>
            <span>Vai al prossimo argomento</span>
            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>
    </div>
  );
}
