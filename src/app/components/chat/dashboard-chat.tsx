"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import useAutoScroll from "@/utils/chat/useAutoScroll";
import { useSession } from "next-auth/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// import MarkdownRenderer from "@/app/components/shared/renderer/markdown-renderer";
import MarkdownRenderer from "./components/chat-markdown-renderer";
import PromptCard from "./components/PromptCard";
import MessageDocumentsDisplay from "./components/message-documents-display";
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
  FileUser,
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
  Lock,
} from "lucide-react";
import { getSubjectIcon } from "@/utils/subject-icons";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilesManagement from "@/app/components/files/files-management";
import { toast } from "sonner";
import { SubscriptionPopup, useSubscriptionPopup } from "@/app/components/subscription/subscription-popup";

type UINote = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  n_pages?: number | null;
  is_favorite?: boolean;
  subject_id?: string;
  free_trial?: boolean;
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
  const [subjects, setSubjects] = useState<UISubject[]>([]);
  const [notesSearch, setNotesSearch] = useState("");
  const [selectedNoteSlugs, setSelectedNoteSlugs] = useState<string[]>([]);
  const [selectedFileSources, setSelectedFileSources] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: { title: string; description: string };
  }>({}); // Cache for file info
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  // Fetch file info when files are selected
  const fetchFileInfo = useCallback(
    async (sources: string[]) => {
      try {
        const response = await fetch("/api/files/list");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.files) {
            const fileMap: {
              [key: string]: { title: string; description: string };
            } = {};
            const availableSources = new Set<string>();

            data.files.forEach((file: any) => {
              fileMap[file.pinecone_source] = {
                title: file.title,
                description: file.description,
              };
              availableSources.add(file.pinecone_source);
            });

            setUploadedFiles(fileMap);

            // Remove any selected file sources that are no longer available (deleted files)
            const currentlySelected = selectedFileSources.filter((source) =>
              availableSources.has(source)
            );
            if (currentlySelected.length !== selectedFileSources.length) {
              console.log(
                `🧹 Cleaning up ${
                  selectedFileSources.length - currentlySelected.length
                } deleted files from selection`
              );
              setSelectedFileSources(currentlySelected);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching file info:", error);
      }
    },
    [selectedFileSources]
  );

  // Fetch file info when selected files change
  useEffect(() => {
    if (selectedFileSources.length > 0) {
      fetchFileInfo(selectedFileSources);
    }
  }, [selectedFileSources, fetchFileInfo]);
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
  // Legacy manual scroll state removed in favor of useAutoScroll
  const [isMultiline, setIsMultiline] = useState(false);
  const { data: session } = useSession();
  const firstName = (session?.user?.name || "").split(" ")[0] || null;
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const { isSubscriptionPopupOpen, showSubscriptionPopup, hideSubscriptionPopup } = useSubscriptionPopup();

  useEffect(() => {
    setIsStreaming(status === "streaming");
  }, [status, setIsStreaming]);

  useEffect(() => {
    onItemsChange();
  }, [messages, onItemsChange]);

  // Determine if user is on an active free trial
  useEffect(() => {
    let cancelled = false;
    async function fetchSubscription() {
      try {
        setCheckingSubscription(true);
        const res = await fetch("/api/user/subscription-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setIsFreeTrial(!!(data?.isFreeTrial && data?.isActive));
      } catch {}
      finally {
        if (!cancelled) setCheckingSubscription(false);
      }
    }
    fetchSubscription();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // scrollToBottom provided by useAutoScroll

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
              metadata: {
                ...(m.metadata || {}),
                selectedNoteSlugs,
                selectedFileSources,
              },
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

  const handlePineconeCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const response = await fetch("/api/files/cleanup", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(
          "Tutti i documenti sono stati eliminati da Pinecone con successo!"
        );
      } else {
        alert(`Errore durante la pulizia: ${result.error}`);
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("Errore durante la pulizia dell'indice");
    } finally {
      setIsCleaningUp(false);
      setShowCleanupConfirm(false);
    }
  };

  const regenerateWithCurrentSelection = (assistantId: string) => {
    if (selectedNoteSlugs.length > 0 || selectedFileSources.length > 0) {
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
          const meta = {
            ...(before[i].metadata || {}),
            selectedNoteSlugs,
            selectedFileSources,
          };
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
  }, [selectedNoteSlugs, selectedFileSources, notes, uploadedFiles]);

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
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        aria-live="polite"
        aria-busy={status !== "ready"}
      >
        {messages.length === 0 ? (
          <div className="mx-auto w-full px-6 h-full md:py-48 py-24 mb-24 md:mb-0 space-y-2">
            <div className="flex h-[98%] items-center justify-center">
              <div className="text-center max-w-4xl">
                <div className="flex flex-col md:flex-wrap items-center justify-center md:gap-8 gap-4 md:pt-0 pt-12">
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
                  <div className="w-full grid grid-cols-1 lg:grid-cols-3 lg:gap-8 gap-4">
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
                      title="Crea quiz"
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
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto w-full max-w-3xl px-6 h-full pt-24 pb-[260px] space-y-2",
              selectedNoteSlugs.length > 0 || selectedFileSources.length > 0
                ? "pb-[260px]"
                : "pb-[160px]"
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
                      className={`group relative flex flex-col ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Display selected documents for user messages */}
                      {isUser &&
                        (((message as any)?.metadata?.selectedNoteSlugs &&
                          (message as any).metadata.selectedNoteSlugs.length >
                            0) ||
                          ((message as any)?.metadata?.selectedFileSources &&
                            (message as any).metadata.selectedFileSources
                              .length > 0)) && (
                          <MessageDocumentsDisplay
                            message={message}
                            notes={notes}
                            subjects={subjects}
                            uploadedFiles={uploadedFiles}
                            maxInitialDisplay={1}
                          />
                        )}
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
                            {!isUser &&
                              (() => {
                                const idx = messages.findIndex(
                                  (m) => m.id === message.id
                                );
                                const prevUser = messages
                                  .slice(0, idx)
                                  .reverse()
                                  .find((m) => m.role === "user");
                                const usedSlugs = ((prevUser as any)?.metadata
                                  ?.selectedNoteSlugs || []) as string[];
                                const usedFiles = ((prevUser as any)?.metadata
                                  ?.selectedFileSources || []) as string[];

                                const noteTitles =
                                  getTitlesFromSlugs(usedSlugs);
                                const fileTitles = usedFiles.map((source) => {
                                  const fileInfo = uploadedFiles[source];
                                  const title =
                                    fileInfo?.title ||
                                    source.replace(/\.[^/.]+$/, "");
                                  const sep = title.indexOf(" - ");
                                  return sep !== -1
                                    ? title.slice(0, sep)
                                    : title;
                                });

                                const allTitles = [
                                  ...noteTitles,
                                  ...fileTitles,
                                ];

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

      {/* New messages indicator */}
      {hasNewItems && (
        <div
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-10",
            selectedNoteSlugs.length > 0 || selectedFileSources.length > 0
              ? "bottom-62"
              : "bottom-36"
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
            if (
              selectedNoteSlugs.length > 0 ||
              selectedFileSources.length > 0
            ) {
              setIsRetrieving(true);
              setIsThinking(false);
            } else {
              setIsThinking(true);
              setIsRetrieving(false);
            }
            sendMessage({
              text: input,
              metadata: { selectedNoteSlugs, selectedFileSources },
            });
            setInput("");
          }
        }}
        className="md:sticky fixed bottom-6 left-0 right-0 z-10 w-full bg-transparent px-6 pb-0 md:pb-3"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center rounded-2xl border bg-background/80 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-xl">
            {(selectedNoteSlugs.length > 0 ||
              selectedFileSources.length > 0) && (
              <div className="mb-2 w-full">
                <div
                  ref={chipsRef}
                  className={`flex flex-wrap px-2 md:px-0 py-2 gap-2 w-full overflow-hidden transition-[max-height] duration-200 ${
                    chipsExpanded ? "max-h-[999px]" : "max-h-[64px]"
                  }`}
                >
                  {/* Note chips */}
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
                        className="relative h-[54px] flex items-center gap-1 rounded-2xl border bg-background p-2"
                      >
                        <div className="flex p-1 items-center justify-center">
                          <FileText
                            className="h-4 w-4"
                            style={{
                              color: subject?.color || "var(--subject-color)",
                            }}
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

                  {/* File chips */}
                  {selectedFileSources.map((source) => {
                    // Get file info from cached data
                    const fileInfo = uploadedFiles[source];
                    const title =
                      fileInfo?.title || source.replace(/\.[^/.]+$/, "");
                    const sep = title.indexOf(" - ");
                    const mainTitle = sep !== -1 ? title.slice(0, sep) : title;
                    const subtitle =
                      sep !== -1
                        ? title.slice(sep + 3)
                        : fileInfo?.description &&
                          fileInfo.description !== title
                        ? fileInfo.description
                        : null;

                    return (
                      <div
                        key={`file-${source}`}
                        className="relative h-[54px] flex items-center gap-1 rounded-2xl border bg-background p-2"
                      >
                        <div className="flex p-1 items-center justify-center">
                          <FileUser className="h-4 w-4 text-primary" />
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
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-primary-foreground shadow"
                          onClick={() =>
                            setSelectedFileSources((prev) =>
                              prev.filter((s) => s !== source)
                            )
                          }
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
              {/* Textarea on top when multiline */}
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (status === "ready" && input.trim()) {
                        if (
                          selectedNoteSlugs.length > 0 ||
                          selectedFileSources.length > 0
                        ) {
                          setIsRetrieving(true);
                          setIsThinking(false);
                        } else {
                          setIsThinking(true);
                          setIsRetrieving(false);
                        }
                        sendMessage({
                          text: input,
                          metadata: { selectedNoteSlugs, selectedFileSources },
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
              {/* Controls row */}
              <div
                className={`flex items-center gap-2 ${
                  isMultiline ? "justify-between" : ""
                } w-full`}
              >
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-xl"
                    onClick={openNotesOverlay}
                    title="Seleziona appunti per il RAG"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  <DownloadMenuButton
                    messages={messages as any[]}
                    className="rounded-xl"
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
        </div>
      </form>
      {/* Premium gating popup */}
      <SubscriptionPopup
        isOpen={isSubscriptionPopupOpen}
        onClose={hideSubscriptionPopup}
        title="Appunto Premium"
        description="Questo contenuto è disponibile con il piano Premium."
        features={[
          "Chat con tutti gli appunti",
          "Quiz e riassunti illimitati",
          "Accesso completo a MaturaMente",
        ]}
      />

      {showNotesOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-xl border bg-background shadow-xl flex flex-col">
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              {/* Selected Items Section - Always Visible */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {selectedNoteSlugs.length + selectedFileSources.length > 0
                      ? `Documenti selezionati - ${
                          selectedNoteSlugs.length + selectedFileSources.length
                        }`
                      : "Documenti selezionati"}
                  </span>
                  <div className="flex gap-2">
                    {selectedNoteSlugs.length + selectedFileSources.length >
                      0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedNoteSlugs([]);
                          setSelectedFileSources([]);
                        }}
                        className="text-xs h-7 px-2"
                      >
                        Rimuovi Tutti
                      </Button>
                    )}
                    {/* <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowCleanupConfirm(true)}
                      disabled={isCleaningUp}
                      className="text-xs h-7 px-2"
                    >
                      {isCleaningUp ? "Pulizia..." : "Pulisci Pinecone"}
                    </Button> */}
                  </div>
                </div>
                {selectedNoteSlugs.length + selectedFileSources.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                    {/* Selected Files */}
                    {selectedFileSources.map((source) => {
                      // Get file info from cached data
                      const fileInfo = uploadedFiles[source];
                      const title =
                        fileInfo?.title || source.replace(/\.[^/.]+$/, "");
                      const sep = title.indexOf(" - ");
                      const mainTitle =
                        sep !== -1 ? title.slice(0, sep) : title;
                      const subtitle =
                        sep !== -1
                          ? title.slice(sep + 3)
                          : fileInfo?.description &&
                            fileInfo.description !== title
                          ? fileInfo.description
                          : null;

                      return (
                        <div
                          key={`file-${source}`}
                          className="flex-shrink-0 relative flex items-center gap-2 rounded-lg border bg-primary/5 border-primary/20 hover:shadow-xs/2 hover:border-primary/40 transition-all duration-200 min-w-[200px] max-w-[250px] px-3 py-2"
                          style={
                            {
                              "--subject-color": "hsl(var(--primary))",
                            } as React.CSSProperties
                          }
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileUser className="h-4 w-4 flex-shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm line-clamp-1">
                                {mainTitle}
                              </div>
                              {subtitle && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {subtitle}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                File caricato
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFileSources((prev) =>
                                prev.filter((s) => s !== source)
                              )
                            }
                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300 text-background shadow"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {/* Selected Notes */}
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
                          key={`note-${slug}`}
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
                              <div className="text-xs text-muted-foreground">
                                Appunto
                              </div>
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
                  <div className="h-[70px] border border-dashed border-border/60 rounded-lg bg-muted/20 p-2 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                      Nessun documento selezionato
                    </div>
                  </div>
                )}
              </div>

              {/* Tabbed Interface */}
              <Tabs
                defaultValue="appunti"
                className="w-full flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="appunti">Appunti</TabsTrigger>
                  <TabsTrigger value="documenti">I tuoi documenti</TabsTrigger>
                </TabsList>

                <TabsContent
                  value="appunti"
                  className="space-y-4 flex-1 overflow-hidden flex flex-col"
                >
                  {/* Enhanced Search Bar */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1 hidden md:block">
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
                      <div className="relative flex-1 block md:hidden">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={notesSearch}
                          onChange={(e) => setNotesSearch(e.target.value)}
                          placeholder="Cerca appunti..."
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
                      const { subjectName, noteTitle } =
                        parseSearchQuery(notesSearch);

                      let filtered = notes;

                      // Filter by subject if specified in search query
                      if (subjectName) {
                        const subject = subjects.find((s) =>
                          s.name
                            .toLowerCase()
                            .includes(subjectName.toLowerCase())
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
                          n.title
                            .toLowerCase()
                            .includes(noteTitle.toLowerCase())
                        );
                      }

                      // Remove the favorites first sorting to fix recent notes logic
                      filtered = filtered.slice();

                      const subjectFiltered =
                        selectedSubjectIds.length > 0
                          ? filtered.filter((n) =>
                              selectedSubjectIds.includes(n.subject_id || "")
                            )
                          : filtered;

                      const recentSet = new Set(
                        (recentStudiedNotes || []).map((r) => r.slug)
                      );
                      // Sort recent notes by their order in recentStudiedNotes (most recent first)
                      const recentFiltered = (recentStudiedNotes || [])
                        .map((recentNote) =>
                          filtered.find((n) => n.slug === recentNote.slug)
                        )
                        .filter(Boolean); // Remove any notes that weren't found in filtered

                      const favoriteFiltered = subjectFiltered
                        .filter((n) => n.is_favorite && !recentSet.has(n.slug))
                        .sort(
                          (a: any, b: any) =>
                            a.title?.localeCompare(b.title || "") || 0
                        );

                      const remaining = subjectFiltered
                        .filter((n) => !recentSet.has(n.slug) && !n.is_favorite)
                        .sort(
                          (a: any, b: any) =>
                            a.title?.localeCompare(b.title || "") || 0
                        );

                      // Group remaining notes by subject
                      const groupedBySubject = remaining.reduce(
                        (acc: any, note: any) => {
                          const subjectId = note.subject_id || "unknown";
                          if (!acc[subjectId]) {
                            acc[subjectId] = [];
                          }
                          acc[subjectId].push(note);
                          return acc;
                        },
                        {}
                      );
                      const renderRow = (n: any) => {
                        const subject = subjects.find(
                          (s) => s.id === n.subject_id
                        );
                        return (
                          <div
                            key={n.id + "-row"}
                            role="checkbox"
                            aria-checked={selectedNoteSlugs.includes(n.slug)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (isFreeTrial && !n.free_trial) {
                                  showSubscriptionPopup();
                                  return;
                                }
                                toggleNote(n.slug);
                              }
                            }}
                            onClick={() => {
                              if (isFreeTrial && !n.free_trial) {
                                showSubscriptionPopup();
                                return;
                              }
                              toggleNote(n.slug);
                            }}
                            className={`relative flex items-start gap-3 p-3 bg-[var(--subject-color)]/2 border border-[var(--subject-color)]/10 rounded-lg hover:shadow-sm/5 hover:border-[var(--subject-color)]/30 transition-all duration-200 cursor-pointer ${isFreeTrial && !n.free_trial ? "opacity-50" : ""}`}
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
                                      {isFreeTrial && !n.free_trial && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                                          <Lock className="h-3 w-3" /> Premium
                                        </div>
                                      )}
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
                      // Separate sections for free-trial users when not searching
                      const isSearching = notesSearch.trim().length > 0 || !!noteTitle;
                      if (isFreeTrial && !isSearching) {
                        const freeTrialList = subjectFiltered.filter((n) => n.free_trial);
                        const premiumList = subjectFiltered.filter((n) => !n.free_trial);
                        return (
                          <div className="flex-1 overflow-auto space-y-4 pr-1">
                            <div className="flex flex-col gap-2">
                              <div className="text-sm font-medium text-muted-foreground">APPUNTI DISPONIBILI</div>
                              {freeTrialList.map((n) => renderRow(n))}
                              {freeTrialList.length === 0 && (
                                <div className="text-sm text-muted-foreground">Nessun appunto disponibile</div>
                              )}
                            </div>
                            {premiumList.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <div className="text-sm font-medium text-muted-foreground">APPUNTI PREMIUM</div>
                                <div className="opacity-50 flex flex-col gap-2">
                                  {premiumList.map((n) => renderRow(n))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="flex-1 overflow-auto space-y-2 pr-1">
                          {recentFiltered.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <div className="text-sm font-medium text-muted-foreground">
                                STUDIATI DI RECENTE
                              </div>
                              {recentFiltered
                                .slice(0, 3)
                                .map((n) => renderRow(n))}
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

                          {Object.entries(groupedBySubject).map(
                            ([subjectId, subjectNotes]: [string, any]) => {
                              const subject = subjects.find(
                                (s) => s.id === subjectId
                              );
                              const subjectName =
                                subject?.name || "Unknown Subject";

                              return (
                                <div
                                  key={subjectId}
                                  className="flex flex-col gap-2"
                                >
                                  <div className="text-sm font-medium text-muted-foreground uppercase">
                                    {subjectName}
                                  </div>
                                  {subjectNotes.map((n: any) => renderRow(n))}
                                  <div className="h-px w-full bg-border my-1" />
                                </div>
                              );
                            }
                          )}

                          {subjectFiltered.length === 0 && (
                            <div className="text-sm text-muted-foreground">
                              Nessun appunto trovato.
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </TabsContent>

                <TabsContent
                  value="documenti"
                  className="space-y-4 flex-1 overflow-hidden flex flex-col"
                >
                  <FilesManagement
                    selectedFileSources={selectedFileSources}
                    onFileSelectionChange={setSelectedFileSources}
                  />
                </TabsContent>
              </Tabs>
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

      {/* Confirmation Dialog for Pinecone Cleanup */}
      <AlertDialog
        open={showCleanupConfirm}
        onOpenChange={setShowCleanupConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma pulizia Pinecone</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare tutti i documenti dal database
              Pinecone? Questa azione eliminerà definitivamente tutti i tuoi
              dati vettoriali e non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCleaningUp}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePineconeCleanup}
              disabled={isCleaningUp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCleaningUp ? "Pulizia in corso..." : "Conferma pulizia"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
