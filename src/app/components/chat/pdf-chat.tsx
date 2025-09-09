"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import useAutoScroll from "@/utils/chat/useAutoScroll";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "../shared/renderer/markdown-renderer";
import PromptCard from "./components/PromptCard";
import DownloadMenuButton from "./components/download-menu-button";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Pencil,
  RefreshCw,
  Square,
  Sparkles,
  Wand2,
  ListChecks,
  MessageCircle,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

export default function PdfChat() {
  const params = useParams();
  const subject = (params?.["subject-slug"] as string) || undefined;
  const noteSlug = (params?.["note-slug"] as string) || undefined;

  const { messages, sendMessage, status, stop, setMessages, regenerate } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat/pdf",
        headers: {
          ...(subject ? { "x-subject": subject } : {}),
          ...(noteSlug ? { "x-note-slug": noteSlug } : {}),
        },
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
  const [isThinking, setIsThinking] = useState(false);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Replace legacy scroll state with useAutoScroll
  const [isMultiline, setIsMultiline] = useState(false);

  useEffect(() => {
    setIsStreaming(status === "streaming");
  }, [status, setIsStreaming]);

  useEffect(() => {
    onItemsChange();
  }, [messages, onItemsChange]);

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
    // Clear any pending states when cancelling edit
    setIsThinking(false);
    setPendingAssistantId(null);
  };

  const saveEdit = async () => {
    if (!editingMessageId) return;
    setMessages((prev) =>
      prev.map((m: any) =>
        m.id === editingMessageId
          ? {
              ...m,
              parts: [{ type: "text", text: editingValue }],
              metadata: { ...(m.metadata || {}), noteSlug },
            }
          : m
      )
    );

    const editedIndex = messages.findIndex((m) => m.id === editingMessageId);
    const assistantAfter = messages
      .slice(editedIndex + 1)
      .find((m) => m.role === "assistant");

    // Clear editing state first
    setEditingMessageId(null);
    setEditingValue("");

    if (assistantAfter) {
      setIsThinking(true);
      setPendingAssistantId(assistantAfter.id);
      // Add a small delay to allow loading text to show before regeneration starts
      setTimeout(() => {
        regenerate({ messageId: assistantAfter.id });
      }, 100);
    } else {
      // No assistant message to regenerate – send a fresh request with preserved metadata
      setIsThinking(true);
      setPendingAssistantId(null);

      // Remove the edited user message to avoid duplicates
      setMessages((prev: any[]) => {
        const idx = prev.findIndex((m) => m.id === editingMessageId);
        if (idx === -1) return prev;
        return prev.slice(0, idx);
      });

      // Send the edited text as a new message with original metadata
      setTimeout(() => {
        sendMessage({ text: editingValue, metadata: { noteSlug } });
      }, 50);
    }
  };

  const regenerateWithNote = (assistantId: string) => {
    setIsThinking(true);
    setPendingAssistantId(assistantId);
    setMessages((prev: any[]) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx <= 0) return prev;
      const before = [...prev];
      for (let i = idx - 1; i >= 0; i--) {
        if (before[i].role === "user") {
          const meta = { ...(before[i].metadata || {}), noteSlug };
          before[i] = { ...before[i], metadata: meta };
          break;
        }
      }
      return before;
    });
    // Add a small delay to allow loading text to show before regeneration starts
    setTimeout(() => {
      regenerate({ messageId: assistantId });
    }, 100);
  };

  const usePrompt = (text: string) => {
    setInput(text);
  };

  // Enhanced stop function that also clears loading states
  const enhancedStop = () => {
    stop();
    setIsThinking(false);
    setPendingAssistantId(null);
  };

  // Check if there are pending operations
  const hasPendingOperations = isThinking || pendingAssistantId !== null;

  useEffect(() => {
    if (isThinking && (status === "streaming" || status === "error")) {
      setIsThinking(false);
    }
    if (status === "streaming" || status === "ready" || status === "error") {
      setPendingAssistantId(null);
    }
  }, [status, isThinking]);

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

  // Ensure subject color CSS variable is present for consistent styling
  useEffect(() => {
    let cancelled = false;
    async function ensureSubjectColor() {
      if (!subject) return;
      try {
        const current = getComputedStyle(document.documentElement)
          .getPropertyValue("--subject-color")
          .trim();
        if (current) return;
        const res = await fetch(`/api/subjects/${subject}`);
        if (!res.ok) return;
        const data = await res.json();
        const color = (data?.color as string) || "";
        if (!cancelled && color) {
          document.documentElement.style.setProperty("--subject-color", color);
        }
      } catch {}
    }
    ensureSubjectColor();
    return () => {
      cancelled = true;
    };
  }, [subject]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-4 flex justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium text-foreground">Chat sul PDF</h2>
        </div>
      </div>

      {/* Chat Content Placeholder */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full flex-col bg-background relative">
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto p-6 md:p-8 space-y-2"
            aria-live="polite"
            aria-busy={status !== "ready"}
          >
            {messages.length === 0 ? (
              <div className="flex h-[98%] items-center justify-center">
                <div className="w-full">
                  <div className="flex flex-col gap-4 md:gap-8 ">
                    <PromptCard
                      title="Riassumi con citazioni"
                      description="Crea un riassunto citando i passaggi rilevanti."
                      Icon={Sparkles}
                      variant="subject"
                      onClick={() =>
                        usePrompt(
                          "Riassumi i concetti principali di questo PDF citando i passaggi rilevanti"
                        )
                      }
                    />
                    <PromptCard
                      title="Definizioni e pagine"
                      description="Trova definizioni e indica le pagine."
                      Icon={Wand2}
                      variant="subject"
                      onClick={() =>
                        usePrompt(
                          "Trova e spiega le definizioni presenti nel PDF indicando le pagine"
                        )
                      }
                    />
                    <PromptCard
                      title="Crea quiz dal PDF"
                      description="Genera 5 domande a risposta multipla."
                      Icon={ListChecks}
                      variant="subject"
                      onClick={() =>
                        usePrompt(
                          "Crea 5 domande a risposta multipla basate sul PDF e cita il testo di riferimento"
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, idx) => {
                const isUser = message.role === "user";
                const messageText = extractTextFromMessage(message);
                const isLastMessage = idx === messages.length - 1;
                return (
                  <div className="flex justify-end w-full">
                    <div
                      key={message.id}
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
                                onClick={() => regenerateWithNote(message.id)}
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
              })
            )}
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
            {/* bottom anchor optional */}
          </div>

          {/* New messages indicator */}
          {hasNewItems && (
            <div className="absolute bottom-20 right-8 z-10">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full shadow-lg bg-background border border-border hover:bg-accent"
                onClick={scrollToBottom}
                title="Nuovi messaggi"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Nuovi messaggi
              </Button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (status !== "ready" || hasPendingOperations) return;
              if (input.trim()) {
                setIsThinking(true);
                sendMessage({ text: input, metadata: { noteSlug } });
                setInput("");
              }
            }}
            className="sticky bottom-6 z-10 w-full bg-transparent px-4 md:px-6 pb-3"
          >
            <div className="w-full">
              <div className="flex flex-col items-center gap-2 rounded-2xl border bg-background/80 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-xl">
                <div
                  className={`flex-1 min-w-0 flex gap-2 w-full ${
                    isMultiline ? "flex-col" : "items-center"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (status === "ready" && input.trim()) {
                            setIsThinking(true);
                            sendMessage({
                              text: input,
                              metadata: { noteSlug },
                            });
                            setInput("");
                          }
                        }
                      }}
                      placeholder="Chiedi qualcosa sul PDF..."
                      rows={1}
                      className="outline-none w-full max-h-48 border-0 bg-transparent px-3 py-3 text-base leading-6 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-y-auto"
                      disabled={status !== "ready"}
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-between">
                    <DownloadMenuButton
                      messages={messages as any[]}
                      fileNameBase={`pdf-chat${subject ? `-${subject}` : ""}${
                        noteSlug ? `-${noteSlug}` : ""
                      }`}
                      className="flex border-none shadow-none rounded-2xl"
                      getMetadata={() => ({
                        title: "Chat sul PDF",
                        date: new Date(),
                      })}
                    />
                    {status === "ready" && !hasPendingOperations ? (
                      <Button
                        type="submit"
                        size="icon"
                        className={`h-10 w-10 rounded-full text-white ${
                          input.trim()
                            ? "bg-[var(--subject-color)]/95 hover:bg-[var(--subject-color)]"
                            : ""
                        }`}
                        variant={"secondary"}
                      >
                        <ArrowUp className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 rounded-full"
                        onClick={enhancedStop}
                      >
                        <Square className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
