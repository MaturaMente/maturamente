"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkdownRenderer from "../shared/renderer/markdown-renderer";
import {
  ArrowUp,
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
} from "lucide-react";

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
        api: "/api/chat",
        // pass subject as a header so every request (including regenerate) carries it
        headers: subject ? { "x-subject": subject } : undefined,
      }),
    });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
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
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [chipsCanCollapse, setChipsCanCollapse] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (!subject) return setShowNotesOverlay(true);
    try {
      if (notes.length === 0) {
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
      setShowNotesOverlay(true);
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

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col bg-background">
      <div
        className="flex-1 overflow-y-auto p-8 space-y-2 md:px-[12%]"
        aria-live="polite"
        aria-busy={status !== "ready"}
      >
        {/* Inline retrieval indicator will render next to the pending assistant message below */}
        {messages.length === 0 ? (
          <div className="flex h-[98%] items-center justify-center">
            <div className="text-center max-w-2xl">
              <div className="flex flex-col md:flex-wrap items-center justify-center gap-4">
                <div className="w-full flex flex-col md:flex-row gap-2 justify-center">
                  <Button
                    className="rounded-full"
                    variant="outline"
                    onClick={() =>
                      usePrompt(
                        "Spiegami questi argomenti come se avessi 12 anni, usando esempi semplici"
                      )
                    }
                  >
                    Spiegami in modo semplice
                  </Button>
                  <Button
                    className="rounded-full"
                    variant="outline"
                    onClick={() =>
                      usePrompt(
                        "Riassumi i concetti principali dagli appunti selezionati"
                      )
                    }
                  >
                    Riassumi gli appunti selezionati
                  </Button>

                  <Button
                    className="rounded-full"
                    variant="outline"
                    onClick={() =>
                      usePrompt(
                        "Crea 5 domande a risposta multipla basate sugli appunti selezionati, con soluzioni"
                      )
                    }
                  >
                    Crea quiz dai documenti
                  </Button>
                </div>
                <Button
                  className="rounded-full text-white"
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
                        {/* Show retrieval indicator inline for regenerate on this assistant message */}
                        {!isUser &&
                        isRetrieving &&
                        status !== "streaming" &&
                        pendingAssistantId === message.id ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                            Sto recuperando i documenti selezionati...
                          </div>
                        ) : null}
                        {/* Show thinking indicator inline for regenerate when no documents are selected */}
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

                  {/* edit controls moved inside bubble */}
                </div>
              </div>
            );
          })
        )}
        {/* Inline retrieval indicator for new assistant replies after the last user message */}
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
        className="sticky bottom-0 z-10 w-full bg-transparent px-6 pb-3"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
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
                        className="relative flex items-center gap-3 rounded-2xl border bg-background px-3 py-2"
                      >
                        <div className="flex p-1 items-center justify-center rounded-xl">
                          <FileText
                            className="h-5 w-5"
                            style={{ color: "var(--subject-color)" }}
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
              {/* open notes overlay for RAG selection */}
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
                  disabled={status !== "ready"}
                />
              </div>

              {/* send / stop toggle */}
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
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <span className="font-medium">Scegli gli appunti da usare</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedNoteSlugs.length} selezionati
              </div>
            </div>
            <div className="p-5">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={notesSearch}
                  onChange={(e) => setNotesSearch(e.target.value)}
                  placeholder="Cerca appunti..."
                  className="pl-9 py-6 rounded-full "
                />
              </div>
              {(() => {
                const filtered = (
                  notesSearch
                    ? notes.filter((n) =>
                        n.title
                          .toLowerCase()
                          .includes(notesSearch.toLowerCase())
                      )
                    : notes
                )
                  .slice()
                  .sort(
                    (a: any, b: any) =>
                      (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)
                  );
                const recentSet = new Set(
                  (recentStudiedNotes || []).map((r) => r.slug)
                );
                const recentFiltered = filtered.filter((n) =>
                  recentSet.has(n.slug)
                );
                const remaining = filtered.filter(
                  (n) => !recentSet.has(n.slug)
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
                        const subTitle = sep !== -1 ? title.slice(sep + 3) : "";
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
                  <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
                    {recentFiltered.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Studiati di recente
                        </div>
                        {recentFiltered.map((n) => renderRow(n))}
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
              })()}
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedNoteSlugs([]);
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
