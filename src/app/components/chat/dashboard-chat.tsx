"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkdownRenderer from "../shared/renderer/markdown-renderer";
import PromptCard from "./components/PromptCard";
import DownloadMenuButton from "./components/download-menu-button";
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
  Filter,
  ChevronDown,
  Sparkles,
  Wand2,
  ListChecks,
  Bot,
} from "lucide-react";
import { getSubjectIcon } from "@/utils/subject-icons";

type UINote = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  n_pages?: number | null;
  is_favorite?: boolean;
  subject_id?: string;
};

type UISubject = {
  id: string;
  name: string;
  color: string;
  slug: string;
};

export default function DashboardChat() {
  const { messages, sendMessage, status, stop, setMessages, regenerate } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat/dashboard",
      }),
    });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [showNotesOverlay, setShowNotesOverlay] = useState(false);
  const [notes, setNotes] = useState<UINote[]>([]);
  const [subjects, setSubjects] = useState<UISubject[]>([]);
  const [notesSearch, setNotesSearch] = useState("");
  const [selectedNoteSlugs, setSelectedNoteSlugs] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [selectedSubjectForSearch, setSelectedSubjectForSearch] = useState<
    string | null
  >(null);
  const [recentStudiedNotes, setRecentStudiedNotes] = useState<
    {
      id: string;
      title: string;
      slug: string;
      date?: string;
      studyTimeMinutes?: number;
      subjectName?: string;
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const { data: session } = useSession();
  const firstName = (session?.user?.name || "").split(" ")[0] || null;

  // Smart auto-scroll: only scroll to bottom if user is already at the bottom
  useEffect(() => {
    if (!scrollContainerRef.current || isUserScrolledUp) return;

    const container = scrollContainerRef.current;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollToBottom(true);
    }
  }, [messages, isUserScrolledUp]);

  // Track user scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      setIsUserScrolledUp(!isAtBottom);
      if (isAtBottom) {
        setShowScrollToBottom(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollToBottom(false);
    setIsUserScrolledUp(false);
  };

  const extractTextFromMessage = (message: any) => {
    return message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
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
    try {
      if (notes.length === 0) {
        setIsLoadingNotes(true);
        const res = await fetch("/api/notes/dashboard");
        if (res.ok) {
          const data = await res.json();
          setNotes(data?.notes || []);
          setSubjects(data?.subjects || []);
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

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((s) => s !== subjectId)
        : [...prev, subjectId]
    );
  };

  const getTitlesFromSlugs = (slugs: string[]): string[] => {
    return slugs
      .map((s) => notes.find((n) => n.slug === s)?.title?.trim())
      .filter(Boolean) as string[];
  };

  const parseSearchQuery = (query: string) => {
    // Check for both " > " (with spaces) and ">" (without spaces)
    let separatorIndex = query.indexOf(" > ");
    let hasSpaces = true;

    if (separatorIndex === -1) {
      separatorIndex = query.indexOf(">");
      hasSpaces = false;
    }

    if (separatorIndex !== -1) {
      const subjectName = query.substring(0, separatorIndex).trim();
      const noteTitle = hasSpaces
        ? query.substring(separatorIndex + 3).trim()
        : query.substring(separatorIndex + 1).trim();
      return { subjectName, noteTitle };
    }

    // Check if the query matches a subject name exactly (case insensitive)
    const trimmedQuery = query.trim();
    const matchingSubject = subjects.find(
      (s) => s.name.toLowerCase() === trimmedQuery.toLowerCase()
    );

    if (matchingSubject) {
      return { subjectName: matchingSubject.name, noteTitle: "" };
    }

    return { subjectName: null, noteTitle: query.trim() };
  };

  const selectSubjectForSearch = (subject: UISubject) => {
    setSelectedSubjectForSearch(subject.id);
    setNotesSearch(`${subject.name} > `);
    setShowSubjectDropdown(false);
  };

  const clearSubjectFilter = () => {
    setSelectedSubjectForSearch(null);
    setNotesSearch("");
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

  // Auto-resize textarea height up to a max
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const newHeight = Math.min(el.scrollHeight, 192); // max-h-48
    el.style.height = newHeight + "px";
  }, [input]);

  // Close subject dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        showSubjectDropdown &&
        !target.closest(".subject-dropdown-container")
      ) {
        setShowSubjectDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSubjectDropdown]);

  return (
    <div className="flex h-full flex-col relative">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-8 pt-24 md:pt-28 pb-40 space-y-2 md:px-[12%]"
        aria-live="polite"
        aria-busy={status !== "ready"}
      >
        {messages.length === 0 ? (
          <div className="flex h-[98%] items-center justify-center">
            <div className="text-center max-w-4xl">
              <div className="flex flex-col md:flex-wrap items-center justify-center md:gap-8 gap-4">
                {/* Hero */}
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div className="relative">
                    <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-blue-500/30 blur-md" />
                    <div className="hidden dark:block absolute -top-px left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />
                    <div className="relative h-12 w-12 rounded-2xl bg-blue-500 text-background flex items-center justify-center shadow-sm">
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
                      Chiedi spiegazioni, riassunti o crea quiz partendo dai
                      tuoi appunti.
                    </div>
                  </div>
                </div>
                {/* Prompt cards */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 md:gap-8 gap-4">
                  <PromptCard
                    title="Spiegami facilmente"
                    description="Ottieni una spiegazione semplice con esempi chiari."
                    Icon={Sparkles}
                    variant="dashboard"
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
                    variant="dashboard"
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
                    variant="dashboard"
                    onClick={() =>
                      usePrompt(
                        "Crea 5 domande a risposta multipla sui contenuti selezionati, con spiegazione della soluzione."
                      )
                    }
                  />
                </div>
                <Button
                  className="text-white"
                  variant="default"
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
          messages.map((message, idx) => {
            const isUser = message.role === "user";
            const messageText = extractTextFromMessage(message);
            const isLastMessage = idx === messages.length - 1;
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 ${
                      isUser
                        ? "px-4 py-2 rounded-2xl bg-primary dark:text-foreground text-primary-foreground"
                        : "bg-none text-foreground w-full"
                    }`}
                  >
                    {editingMessageId === message.id && isUser ? (
                      <div className="w-full">
                        <textarea
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
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
                        {/* Assistant header with PIT */}
                        {!isUser && (
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Bot className="h-4 w-4" /> PIT
                          </div>
                        )}
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
                            if (Array.isArray(used) && used.length > 0) {
                              const titles = getTitlesFromSlugs(used);
                              if (titles.length > 0) {
                                return (
                                  <div className="mb-2 text-xs text-muted-foreground italic">
                                    {`Risposta generata partendo da: ${titles.join(
                                      ", "
                                    )}`}
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                        {message.parts.map((part, index) =>
                          part.type === "text" ? (
                            <MarkdownRenderer content={part.text} key={index} />
                          ) : null
                        )}
                        {!isUser && (status === "ready" || !isLastMessage) ? (
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
                  <div
                    className={`pointer-events-auto mt-2 px-4 flex text-muted-foreground items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
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
                          disabled={!(status === "ready" || status === "error")}
                          onClick={() =>
                            regenerateWithCurrentSelection(message.id)
                          }
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isRetrieving && status !== "streaming" && !pendingAssistantId ? (
          <div className="flex justify-start">
            <div className="px-4 text-foreground w-full">
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                Sto recuperando i documenti selezionati...
              </div>
            </div>
          </div>
        ) : null}
        {isThinking && status !== "streaming" && !pendingAssistantId ? (
          <div className="flex justify-start">
            <div className="px-4 text-foreground w-full">
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                Sto pensando...
              </div>
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-20 right-8 z-10">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg bg-background border border-border hover:bg-accent"
            onClick={scrollToBottom}
            title="Scorri verso il basso"
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
        className="fixed bottom-6 left-0 right-0 z-20 w-full bg-transparent px-6 pb-0"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-background/80 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-xl">
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
                    const subject = subjects.find(
                      (s) => s.id === note?.subject_id
                    );

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
                        className="relative flex items-center gap-3 rounded-2xl border bg-background px-3 py-2"
                      >
                        <div className="flex p-1 items-center justify-center rounded-xl">
                          <FileText
                            className="h-5 w-5"
                            style={{
                              color: subject?.color || "var(--subject-color)",
                            }}
                          />
                        </div>
                        <div className="leading-tight pr-2">
                          <div className="font-medium max-w-[220px] line-clamp-1">
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
            <div className="flex-1 min-w-0 flex items-center gap-2 w-full">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full"
                onClick={openNotesOverlay}
                title="Seleziona appunti per il RAG"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <DownloadMenuButton
                messages={messages as any[]}
                fileNameBase={`dashboard-chat`}
                buttonVariant="ghost"
                buttonSize="icon"
                label="Scarica"
                getMetadata={() => ({
                  title: "Dashboard Chat",
                  userName: (session?.user?.name as string) || null,
                  subjectName: null,
                  date: new Date(),
                })}
              />
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

              {status === "ready" ? (
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 rounded-full text-white"
                  variant={input.trim() ? "default" : "secondary"}
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
      </form>
      {showNotesOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
            <div className="p-5">
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
                      const subject = subjects.find(
                        (s) => s.id === note?.subject_id
                      );
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
                          style={
                            {
                              "--subject-color": subject?.color || "#000000",
                            } as React.CSSProperties
                          }
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
                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--subject-color)]/90 text-background shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[70px] border border-dashed border-border/60 rounded-lg bg-muted/20 p-2 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                      Nessun appunto selezionato
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Search Bar */}
              <div className="relative mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={notesSearch}
                      onChange={(e) => setNotesSearch(e.target.value)}
                      placeholder={
                        selectedSubjectForSearch
                          ? "Scrivi il titolo dell'appunto..."
                          : "Cerca appunti o seleziona una materia..."
                      }
                      className="pl-9 py-6 rounded-xl"
                      disabled={isLoadingNotes}
                    />
                    {selectedSubjectForSearch && (
                      <button
                        type="button"
                        onClick={clearSubjectFilter}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="relative subject-dropdown-container">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setShowSubjectDropdown(!showSubjectDropdown)
                      }
                      className="h-12 px-4 rounded-xl"
                    >
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      Materia
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                    {showSubjectDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-64 rounded-lg border bg-background shadow-lg z-10">
                        <div className="p-2 max-h-64 overflow-y-auto">
                          <div className="space-y-1">
                            {subjects.map((subject) => {
                              const Icon = getSubjectIcon(subject.name);
                              return (
                                <button
                                  key={subject.id}
                                  onClick={() =>
                                    selectSubjectForSearch(subject)
                                  }
                                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-3"
                                  style={
                                    {
                                      "--subject-color": subject.color,
                                    } as React.CSSProperties
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    {Icon && (
                                      <Icon className="h-4 w-4 text-[var(--subject-color)]" />
                                    )}
                                  </div>
                                  <span className="font-medium text-[var(--subject-color)]">
                                    {subject.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isLoadingNotes ? (
                <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg bg-muted/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                (() => {
                  const { subjectName, noteTitle } =
                    parseSearchQuery(notesSearch);

                  let filtered = notes;

                  // Filter by subject if specified in search query
                  if (subjectName) {
                    const subject = subjects.find((s) =>
                      s.name.toLowerCase().includes(subjectName.toLowerCase())
                    );
                    if (subject) {
                      filtered = filtered.filter(
                        (n) => n.subject_id === subject.id
                      );
                    }
                  }

                  // Filter by note title
                  if (noteTitle) {
                    filtered = filtered.filter((n) =>
                      n.title.toLowerCase().includes(noteTitle.toLowerCase())
                    );
                  }

                  // Sort with favorites first
                  filtered = filtered
                    .slice()
                    .sort(
                      (a: any, b: any) =>
                        (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)
                    );

                  const subjectFiltered =
                    selectedSubjectIds.length > 0
                      ? filtered.filter((n) =>
                          selectedSubjectIds.includes(n.subject_id || "")
                        )
                      : filtered;

                  const recentSet = new Set(
                    (recentStudiedNotes || []).map((r) => r.slug)
                  );
                  const recentFiltered = subjectFiltered.filter((n) =>
                    recentSet.has(n.slug)
                  );
                  const remaining = subjectFiltered.filter(
                    (n) => !recentSet.has(n.slug)
                  );
                  const renderRow = (n: any) => {
                    const subject = subjects.find((s) => s.id === n.subject_id);
                    return (
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
                        className="relative flex items-start gap-3 p-3 bg-[var(--subject-color)]/2 border border-[var(--subject-color)]/10 rounded-lg hover:shadow-sm/5 hover:border-[var(--subject-color)]/30 transition-all duration-200 cursor-pointer"
                        style={
                          {
                            "--subject-color": subject?.color || "#000000",
                          } as React.CSSProperties
                        }
                      >
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const title: string = n.title || "";
                            const sep = title.indexOf(" - ");
                            const mainTitle =
                              sep !== -1 ? title.slice(0, sep) : title;
                            const subTitle =
                              sep !== -1 ? title.slice(sep + 3) : "";
                            const isSelected = selectedNoteSlugs.includes(
                              n.slug
                            );
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
                                      {subject && (
                                        <div className="text-xs text-muted-foreground">
                                          {subject.name}
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
                  };
                  return (
                    <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
                      {recentFiltered.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            Studiati di recente
                          </div>
                          {recentFiltered.slice(0, 3).map((n) => renderRow(n))}
                          <div className="h-px w-full bg-border my-1" />
                        </div>
                      )}
                      {remaining.map((n) => renderRow(n))}
                      {subjectFiltered.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          Nessun appunto trovato.
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedNoteSlugs([]);
                  setSelectedSubjectIds([]);
                  setShowNotesOverlay(false);
                }}
              >
                Cancella
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowNotesOverlay(false)}
                  className="text-white"
                >
                  Continua
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
