"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import useAutoScroll from "@/utils/chat/useAutoScroll";
import { useSession } from "next-auth/react";
import PromptCard from "./components/PromptCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkdownRenderer from "./components/chat-markdown-renderer";
// import MarkdownRenderer from "../shared/renderer/markdown-renderer";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Square,
  FileText,
  X,
  Star,
  Search,
  Circle,
  CircleCheck,
  GraduationCap,
  Sparkles,
  Wand2,
  ListChecks,
  Bot,
  ArrowRight,
} from "lucide-react";
import DownloadMenuButton from "./components/download-menu-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MessageDocumentsDisplay from "./components/message-documents-display";

type UINote = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  n_pages?: number | null;
  is_favorite?: boolean;
};

export default function SubjectChat({ subject }: { subject?: string }) {
  const { messages, sendMessage, status, stop, setMessages, regenerate } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat/subject",
        // pass subject as a header so every request (including regenerate) carries it
        headers: subject ? { "x-subject": subject } : undefined,
      }),
    });
  const [input, setInput] = useState("");
  // Autoscroll management
  const {
    containerRef,
    onItemsChange,
    hasNewItems,
    scrollToBottom,
    setIsStreaming,
  } = useAutoScroll({ bottomThreshold: 50 });
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [showNotesOverlay, setShowNotesOverlay] = useState(false);
  const [notes, setNotes] = useState<UINote[]>([]);
  const [notesSearch, setNotesSearch] = useState("");
  const [selectedNoteSlugs, setSelectedNoteSlugs] = useState<string[]>([]);
  const [recentStudiedNotes, setRecentStudiedNotes] = useState<
    {
      id: string;
      title: string;
      slug: string;
      date?: string;
      studyTimeMinutes?: number;
    }[]
  >([]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(
    null
  );
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [chipsCanCollapse, setChipsCanCollapse] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Removed legacy scroll refs/state in favor of useAutoScroll
  const [isMultiline, setIsMultiline] = useState(false);
  const [subjectColor, setSubjectColor] = useState<string | null>(null);
  const [currentSubjectData, setCurrentSubjectData] = useState<any>(null);
  const { data: session } = useSession();
  const firstName = (session?.user?.name || "").split(" ")[0] || null;

  // Autoscroll: mark streaming state and notify on message updates
  useEffect(() => {
    setIsStreaming(status === "streaming");
  }, [status, setIsStreaming]);

  useEffect(() => {
    onItemsChange();
  }, [messages, onItemsChange]);

  // Ensure subject color CSS variable is set locally to avoid blank states
  useEffect(() => {
    let cancelled = false;
    async function ensureSubjectColor() {
      if (!subject) return;
      try {
        const current = getComputedStyle(document.documentElement)
          .getPropertyValue("--subject-color")
          .trim();
        if (current) {
          setSubjectColor(current);
          return;
        }
        const res = await fetch(`/api/subjects/${subject}`);
        if (!res.ok) return;
        const data = await res.json();
        const color = (data?.color as string) || "";
        if (!cancelled && color) {
          setSubjectColor(color);
          setCurrentSubjectData(data);
          document.documentElement.style.setProperty("--subject-color", color);
        }
      } catch {}
    }
    ensureSubjectColor();
    return () => {
      cancelled = true;
    };
  }, [subject]);

  // scrollToBottom provided by hook

  const extractTextFromMessage = (message: any) => {
    return message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Messaggio copiato negli appunti!");
    } catch {
      toast.error("Errore durante la copia del messaggio");
    }
  };

  const beginEdit = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;
    setEditingMessageId(messageId);
    setEditingValue(extractTextFromMessage(message));
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingValue("");
  };

  const saveEdit = async () => {
    if (!editingMessageId) return;
    // update the user message locally
    setMessages((prev) =>
      prev.map((m: any) =>
        m.id === editingMessageId
          ? {
              ...m,
              parts: [{ type: "text", text: editingValue }],
              metadata: { ...(m.metadata || {}), selectedNoteSlugs },
            }
          : m
      )
    );

    // find the next assistant message and regenerate it
    const editedIndex = messages.findIndex((m) => m.id === editingMessageId);
    const assistantAfter = messages
      .slice(editedIndex + 1)
      .find((m) => m.role === "assistant");
    if (assistantAfter) {
      regenerate({ messageId: assistantAfter.id });
    } else {
      // if no assistant answer yet, do nothing
    }

    cancelEdit();
  };

  const openNotesOverlay = async () => {
    // Show immediately to give instant feedback
    setShowNotesOverlay(true);
    if (!subject) return;
    try {
      if (notes.length === 0) {
        setIsLoadingNotes(true);
        const res = await fetch(`/api/notes/by-subject/${subject}`);
        if (res.ok) {
          const data = await res.json();
          // expect { notes: MinimalNote[] }
          setNotes(data?.notes || []);
          setRecentStudiedNotes(data?.recentNotes || []);
        }
      }
    } catch {
      // ignore fetching errors; overlay will still show
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const toggleNote = (slug: string) => {
    setSelectedNoteSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const getTitlesFromSlugs = (slugs: string[]): string[] => {
    return slugs
      .map((s) => notes.find((n) => n.slug === s)?.title?.trim())
      .filter(Boolean) as string[];
  };

  const clearAllSelectedNotes = () => {
    setSelectedNoteSlugs([]);
  };

  const regenerateWithCurrentSelection = (assistantId: string) => {
    if (selectedNoteSlugs.length > 0) {
      setIsRetrieving(true);
      setIsThinking(false);
    } else {
      setIsThinking(true);
      setIsRetrieving(false);
    }
    setPendingAssistantId(assistantId);
    // Ensure the closest previous user message carries current selection metadata
    setMessages((prev: any[]) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx <= 0) return prev;
      const before = [...prev];
      for (let i = idx - 1; i >= 0; i--) {
        if (before[i].role === "user") {
          const meta = { ...(before[i].metadata || {}), selectedNoteSlugs };
          before[i] = { ...before[i], metadata: meta };
          break;
        }
      }
      return before;
    });
    regenerate({ messageId: assistantId });
  };

  const usePrompt = (text: string) => {
    setInput(text);
  };

  useEffect(() => {
    const el = chipsRef.current;
    if (!el) {
      setChipsCanCollapse(false);
      return;
    }
    const SINGLE_ROW_MAX_PX = 100;
    const canCollapse = el.scrollHeight > SINGLE_ROW_MAX_PX + 1;
    setChipsCanCollapse(canCollapse);
    if (!canCollapse) setChipsExpanded(false);
  }, [selectedNoteSlugs, notes]);

  useEffect(() => {
    if (isRetrieving && (status === "streaming" || status === "error")) {
      setIsRetrieving(false);
    }
    if (isThinking && (status === "streaming" || status === "error")) {
      setIsThinking(false);
    }
    if (status === "streaming" || status === "ready" || status === "error") {
      setPendingAssistantId(null);
    }
  }, [status, isRetrieving]);

  // Auto-resize textarea height up to a max and detect multiline
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const newHeight = Math.min(el.scrollHeight, 192); // max-h-48
    el.style.height = newHeight + "px";
    const computed = getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight || "24");
    setIsMultiline(newHeight > lineHeight + 2);
  }, [input]);

  const cardStyle = {
    "--subject-color": subjectColor,
  } as React.CSSProperties;

  return (
    <div className="flex h-full md:h-[calc(100vh-60px)] flex-col relative">
      {/* Improved layered gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--subject-color)]/15 via-transparent to-transparent" />
        <div className="absolute -top-24 left-1/2 h-40 w-[90%] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/25 blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute -bottom-10 left-1/4 h-40 w-80 rounded-[40%] bg-muted/20 blur-[70px]" />
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        aria-live="polite"
        aria-busy={status !== "ready"}
        style={cardStyle}
      >
        <div className="mx-auto w-full px-6 h-full md:py-12 py-6 mb-32 md:mb-0 space-y-2">
          {/* Inline retrieval indicator will render next to the pending assistant message below */}
          {messages.length === 0 ? (
            <div className="flex h-[98%] items-center justify-center">
              <div className="text-center max-w-4xl">
                <div className="flex flex-col md:flex-wrap items-center justify-center md:gap-8 gap-4 md:pt-0 pt-12">
                  {/* Hero */}
                  <div className="flex flex-col items-center gap-3 mb-2">
                    <div className="relative">
                      <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-[var(--subject-color)]/30 blur-md" />
                      <div className="hidden dark:block absolute -top-px left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />
                      <div className="relative h-12 w-12 rounded-2xl text-background flex items-center justify-center shadow-sm bg-[var(--subject-color)]">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                        {`Bentornato${
                          firstName ? ` ${firstName}` : ""
                        }, cosa devi studiare oggi?`}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Pronto ad aiutarti con spiegazioni, riassunti e quiz dai
                        tuoi appunti di{" "}
                        <span className="font-semibold">
                          {currentSubjectData?.name}
                        </span>
                        .
                      </div>
                    </div>
                  </div>
                  {/* Prompt cards */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-3 md:gap-8 gap-4">
                    <PromptCard
                      title="Spiegami facilmente"
                      description="Ottieni una spiegazione semplice con esempi chiari."
                      Icon={Sparkles}
                      variant="subject"
                      onClick={() =>
                        usePrompt(
                          "Spiegami questi argomenti come se avessi 12 anni, con esempi concreti e analogie semplici."
                        )
                      }
                    />
                    <PromptCard
                      title="Riassumi e organizza"
                      description="Crea un riassunto con punti chiave ordinati."
                      Icon={Wand2}
                      variant="subject"
                      onClick={() =>
                        usePrompt(
                          "Riassumi i concetti chiave dagli appunti selezionati e crea una mini mappa mentale con bullet point."
                        )
                      }
                    />
                    <PromptCard
                      title="Crea quiz dai documenti"
                      description="Genera domande per metterti alla prova."
                      Icon={ListChecks}
                      variant="subject"
                      onClick={() =>
                        usePrompt(
                          "Crea 5 domande a risposta multipla sui contenuti selezionati, con spiegazione della soluzione."
                        )
                      }
                    />
                  </div>
                  <Button
                    className="bg-[var(--subject-color)]/95 text-white cursor-pointer hover:bg-[var(--subject-color)] hover:scale-102 hover:shadow-2xl hover:shadow-[var(--subject-color)] transition-all duration-300"
                    variant="secondary"
                    size="lg"
                    onClick={openNotesOverlay}
                    title="Seleziona gli appunti"
                  >
                    Scegli gli appunti
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "mx-auto w-full max-w-3xl h-full space-y-2",
                selectedNoteSlugs.length > 0 ? "pb-[160px]" : "pb-[60px]"
              )}
            >
              {messages.map((message, idx) => {
                const isUser = message.role === "user";
                const messageText = extractTextFromMessage(message);
                const isLastMessage = idx === messages.length - 1;
                return (
                  <div key={message.id} className="flex justify-end w-full">
                    <div
                      className={`flex ${
                        isUser
                          ? "justify-end md:max-w-2/3"
                          : "justify-start w-full"
                      }`}
                    >
                      <div
                        className={`flex items-start gap-3 w-full ${
                          isUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`group relative flex flex-col ${
                            isUser ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`${
                              isUser
                                ? "p-4 rounded-2xl bg-[var(--subject-color)]/95 dark:text-foreground text-primary-foreground"
                                : "px-4 bg-none text-foreground w-full"
                            }`}
                          >
                            {/* Display selected documents for user messages */}
                            {isUser &&
                              (message as any)?.metadata?.selectedNoteSlugs &&
                              (message as any).metadata.selectedNoteSlugs
                                .length > 0 && (
                                <MessageDocumentsDisplay
                                  message={message}
                                  notes={notes}
                                  subjects={
                                    currentSubjectData
                                      ? [currentSubjectData]
                                      : []
                                  }
                                  uploadedFiles={{}}
                                  maxInitialDisplay={1}
                                />
                              )}

                            {editingMessageId === message.id && isUser ? (
                              <div className="w-full">
                                <textarea
                                  autoFocus
                                  value={editingValue}
                                  onChange={(e) =>
                                    setEditingValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (
                                      (e.metaKey || e.ctrlKey) &&
                                      e.key === "Enter"
                                    ) {
                                      e.preventDefault();
                                      saveEdit();
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelEdit();
                                    }
                                  }}
                                  className="w-full min-h-24 bg-transparent outline-none resize-y text-base"
                                  placeholder="Modifica il messaggio"
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                  >
                                    Cancella
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={saveEdit}
                                    variant="secondary"
                                    disabled={status !== "ready"}
                                  >
                                    Invia
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {/* Assistant header with Pit */}
                                {!isUser && (
                                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <Bot className="h-4 w-4" /> Pit
                                  </div>
                                )}
                                {/* RAG disclaimer for assistant messages */}
                                {!isUser &&
                                  (() => {
                                    const idx = messages.findIndex(
                                      (m) => m.id === message.id
                                    );
                                    const prevUser = messages
                                      .slice(0, idx)
                                      .reverse()
                                      .find((m) => m.role === "user");
                                    const used = ((prevUser as any)?.metadata
                                      ?.selectedNoteSlugs || []) as string[];

                                    return null;
                                  })()}
                                {message.parts.map((part, index) =>
                                  part.type === "text" ? (
                                    <MarkdownRenderer
                                      content={part.text}
                                      key={index}
                                    />
                                  ) : null
                                )}
                                {!isUser &&
                                (status === "ready" || !isLastMessage) ? (
                                  <div className="mt-3 h-px w-full bg-border" />
                                ) : null}
                                {!isUser &&
                                isRetrieving &&
                                status !== "streaming" &&
                                pendingAssistantId === message.id ? (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                                    Sto recuperando i documenti selezionati...
                                  </div>
                                ) : null}
                                {!isUser &&
                                isThinking &&
                                status !== "streaming" &&
                                pendingAssistantId === message.id ? (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                                    Sto pensando...
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* hover actions below bubble, outside */}
                          <div
                            className={`pointer-events-auto mt-2 px-4 flex text-muted-foreground items-center gap-1 md:opacity-0 opacity-100 transition-opacity duration-150 group-hover:opacity-100 ${
                              isUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            {isUser ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handleCopy(messageText)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  disabled={status !== "ready"}
                                  onClick={() => beginEdit(message.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handleCopy(messageText)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  disabled={
                                    !(status === "ready" || status === "error")
                                  }
                                  onClick={() =>
                                    regenerateWithCurrentSelection(message.id)
                                  }
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>

                          {/* edit controls moved inside bubble */}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isRetrieving && status !== "streaming" && !pendingAssistantId ? (
                <div className="flex justify-start w-full">
                  <div className="px-4 text-foreground w-full">
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                      Sto recuperando i documenti selezionati...
                    </div>
                  </div>
                </div>
              ) : null}
              {isThinking && status !== "streaming" && !pendingAssistantId ? (
                <div className="flex justify-start w-full">
                  <div className="px-4 text-foreground w-full">
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                      Sto pensando...
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {messages.length === 0 &&
          isRetrieving &&
          status !== "streaming" &&
          !pendingAssistantId ? (
            <div className="flex justify-start w-full">
              <div className="px-4 text-foreground w-full">
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                  Sto recuperando i documenti selezionati...
                </div>
              </div>
            </div>
          ) : null}
          {messages.length === 0 &&
          isThinking &&
          status !== "streaming" &&
          !pendingAssistantId ? (
            <div className="flex justify-start w-full">
              <div className="px-4 text-foreground w-full">
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                  Sto pensando...
                </div>
              </div>
            </div>
          ) : null}
          {/* bottom anchor optional */}
        </div>
      </div>

      {/* New messages indicator */}
      {hasNewItems && (
        <div
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-10",
            selectedNoteSlugs.length > 0 ? "bottom-62" : "bottom-36"
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-10 w-10 p-0 m-0 rounded-full shadow-lg bg-background border border-border hover:bg-accent"
            onClick={scrollToBottom}
            title="Nuovi messaggi"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (status !== "ready") return;
          if (input.trim()) {
            if (selectedNoteSlugs.length > 0) {
              setIsRetrieving(true);
              setIsThinking(false);
            } else {
              setIsThinking(true);
              setIsRetrieving(false);
            }
            sendMessage({ text: input, metadata: { selectedNoteSlugs } });
            setInput("");
          }
        }}
        className="md:sticky fixed bottom-6 left-0 right-0 z-10 w-full bg-transparent px-6 pb-0 md:pb-3"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center rounded-2xl border bg-background/80 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-xl">
            {selectedNoteSlugs.length > 0 && (
              <div className="mb-2 w-full">
                <div
                  ref={chipsRef}
                  className={`flex flex-wrap px-2 md:px-0 py-2 gap-2 w-full overflow-hidden transition-[max-height] duration-200 ${
                    chipsExpanded ? "max-h-[999px]" : "max-h-[64px]"
                  }`}
                >
                  {selectedNoteSlugs.map((slug) => {
                    const note = notes.find((n) => n.slug === slug);

                    // Parse title to extract main title and subtitle
                    const parseTitle = (title: string) => {
                      const separatorIndex = title.indexOf(" - ");
                      if (separatorIndex !== -1) {
                        return {
                          mainTitle: title.substring(0, separatorIndex),
                          subtitle: title.substring(separatorIndex + 3),
                        };
                      }
                      return {
                        mainTitle: title,
                        subtitle: null,
                      };
                    };

                    const { mainTitle, subtitle } = parseTitle(
                      note?.title || ""
                    );

                    return (
                      <div
                        key={slug}
                        className="relative h-[54px] flex items-center gap-1 rounded-2xl border bg-background p-2"
                      >
                        <div className="flex p-1 items-center justify-center">
                          <FileText
                            className="h-4 w-4"
                            style={{ color: "var(--subject-color)" }}
                          />
                        </div>
                        <div className="leading-tight pr-2">
                          <div className="font-medium text-sm max-w-[220px] line-clamp-1">
                            {mainTitle}
                          </div>
                          {subtitle && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {subtitle}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`Rimuovi ${mainTitle}`}
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-background shadow"
                          onClick={() => toggleNote(slug)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {chipsCanCollapse && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline pl-2 pt-2"
                    onClick={() => setChipsExpanded((v) => !v)}
                  >
                    {chipsExpanded ? "Mostra meno" : "Mostra tutti"}
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 flex-col min-w-0 flex w-full">
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (status === "ready" && input.trim()) {
                        if (selectedNoteSlugs.length > 0) {
                          setIsRetrieving(true);
                          setIsThinking(false);
                        } else {
                          setIsThinking(true);
                          setIsRetrieving(false);
                        }
                        sendMessage({
                          text: input,
                          metadata: { selectedNoteSlugs },
                        });
                        setInput("");
                      }
                    }
                  }}
                  placeholder="Cosa vuoi chiedere?"
                  rows={1}
                  className="outline-none w-full max-h-48 border-0 bg-transparent px-3 py-3 text-base leading-6 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-y-auto"
                  disabled={false}
                />
              </div>
              <div
                className={`flex items-center gap-2 ${
                  isMultiline ? "justify-between" : ""
                } w-full`}
              >
                <div className="flex items-center gap-2">
                  {/* open notes overlay for RAG selection */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-2xl"
                    onClick={openNotesOverlay}
                    title="Seleziona appunti per il RAG"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  <DownloadMenuButton
                    messages={messages as any[]}
                    fileNameBase={`subject-chat${subject ? `-${subject}` : ""}`}
                    buttonVariant="ghost"
                    buttonSize="icon"
                    label="Scarica"
                    className="rounded-2xl"
                    getMetadata={() => ({
                      title: "Subject Chat",
                      userName: (session?.user?.name as string) || null,
                      subjectName: subject || null,
                      date: new Date(),
                      themeColor:
                        getComputedStyle(document.documentElement)
                          .getPropertyValue("--subject-color")
                          .trim() || undefined,
                    })}
                  />
                </div>
                {/* send / stop toggle */}
                {status === "ready" ? (
                  <Button
                    type="submit"
                    size="icon"
                    className={`h-10 w-10 rounded-full text-white ${
                      input.trim()
                        ? "bg-[var(--subject-color)]/95 hover:bg-[var(--subject-color)]"
                        : ""
                    }`}
                    variant={input.trim() ? "secondary" : "secondary"}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full"
                    onClick={() => stop()}
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
      {showNotesOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-xl border bg-background shadow-xl flex flex-col">
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              {/* Selected Notes Section - Always Visible */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {selectedNoteSlugs.length > 0
                      ? `Appunti selezionati - ${selectedNoteSlugs.length}`
                      : "Appunti selezionati"}
                  </span>
                  {selectedNoteSlugs.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllSelectedNotes}
                      className="text-xs h-7 px-2"
                    >
                      Rimuovi Tutti
                    </Button>
                  )}
                </div>
                {selectedNoteSlugs.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                    {selectedNoteSlugs.map((slug) => {
                      const note = notes.find((n) => n.slug === slug);
                      const parseTitle = (title: string) => {
                        const separatorIndex = title.indexOf(" - ");
                        if (separatorIndex !== -1) {
                          return {
                            mainTitle: title.substring(0, separatorIndex),
                            subtitle: title.substring(separatorIndex + 3),
                          };
                        }
                        return { mainTitle: title, subtitle: null };
                      };
                      const { mainTitle, subtitle } = parseTitle(
                        note?.title || ""
                      );

                      return (
                        <div
                          key={slug}
                          className="flex-shrink-0 relative flex items-center gap-2 rounded-lg border bg-[var(--subject-color)]/2 border-[var(--subject-color)]/10 hover:shadow-xs/2 hover:border-[var(--subject-color)]/30 transition-all duration-200 min-w-[200px] max-w-[250px] px-3 py-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0 text-[var(--subject-color)]" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm line-clamp-1">
                                {mainTitle}
                              </div>
                              {subtitle && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNote(slug)}
                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-background shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-20 border border-dashed border-border/60 rounded-lg bg-muted/20 p-3 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                      Nessun appunto selezionato
                    </div>
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={notesSearch}
                  onChange={(e) => setNotesSearch(e.target.value)}
                  placeholder="Cerca appunti..."
                  className="pl-9 py-6 rounded-xl"
                  disabled={isLoadingNotes}
                />
              </div>
              {isLoadingNotes ? (
                <div className="flex-1 overflow-auto space-y-2 pr-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg bg-muted/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                (() => {
                  const filtered = (
                    notesSearch
                      ? notes.filter((n) =>
                          n.title
                            .toLowerCase()
                            .includes(notesSearch.toLowerCase())
                        )
                      : notes
                  ).slice();

                  const recentSet = new Set(
                    (recentStudiedNotes || []).map((r) => r.slug)
                  );
                  // Sort recent notes by their order in recentStudiedNotes (most recent first)
                  const recentFiltered = (recentStudiedNotes || [])
                    .map((recentNote) =>
                      filtered.find((n) => n.slug === recentNote.slug)
                    )
                    .filter(Boolean); // Remove any notes that weren't found in filtered

                  const favoriteFiltered = filtered
                    .filter((n) => n.is_favorite && !recentSet.has(n.slug))
                    .sort(
                      (a: any, b: any) =>
                        a.title?.localeCompare(b.title || "") || 0
                    );

                  const remaining = filtered
                    .filter((n) => !recentSet.has(n.slug) && !n.is_favorite)
                    .sort(
                      (a: any, b: any) =>
                        a.title?.localeCompare(b.title || "") || 0
                    );
                  const renderRow = (n: any) => (
                    <div
                      key={n.id + "-row"}
                      role="checkbox"
                      aria-checked={selectedNoteSlugs.includes(n.slug)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleNote(n.slug);
                        }
                      }}
                      onClick={() => toggleNote(n.slug)}
                      className="relative flex items-start gap-3 p-3  bg-[var(--subject-color)]/2 border border-[var(--subject-color)]/10 rounded-lg hover:shadow-sm/5 hover:border-[var(--subject-color)]/30 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const title: string = n.title || "";
                          const sep = title.indexOf(" - ");
                          const mainTitle =
                            sep !== -1 ? title.slice(0, sep) : title;
                          const subTitle =
                            sep !== -1 ? title.slice(sep + 3) : "";
                          const isSelected = selectedNoteSlugs.includes(n.slug);
                          return (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-4">
                                  {isSelected ? (
                                    <CircleCheck className="h-6 w-6 flex-shrink-0 text-[var(--subject-color)]" />
                                  ) : (
                                    <Circle className="h-6 w-6 flex-shrink-0 text-[var(--subject-color)]/70" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-medium line-clamp-1">
                                      {mainTitle}
                                    </div>
                                    {subTitle && (
                                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                        {subTitle}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {n.is_favorite && (
                                  <Star className="h-4 w-4 flex-shrink-0 fill-yellow-400 text-yellow-400" />
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                  return (
                    <div className="flex-1 overflow-auto space-y-2 pr-1">
                      {recentFiltered.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            STUDIATI DI RECENTE
                          </div>
                          {recentFiltered.slice(0, 3).map((n) => renderRow(n))}
                          <div className="h-px w-full bg-border my-1" />
                        </div>
                      )}

                      {favoriteFiltered.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            APPUNTI PREFERITI
                          </div>
                          {favoriteFiltered.map((n) => renderRow(n))}
                          <div className="h-px w-full bg-border my-1" />
                        </div>
                      )}

                      {remaining.map((n) => renderRow(n))}
                      {filtered.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          Nessun appunto trovato.
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowNotesOverlay(false);
                }}
              >
                Chiudi
              </Button>
              <Button
                onClick={() => setShowNotesOverlay(false)}
                className="text-white cursor-pointer flex items-center gap-2 bg-[var(--subject-color)]/95 hover:bg-[var(--subject-color)]"
                variant="secondary"
              >
                Continua
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
