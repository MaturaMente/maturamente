"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "../shared/renderer/markdown-renderer";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Pencil,
  RefreshCw,
  Square,
} from "lucide-react";

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

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
    } catch {}
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
    if (assistantAfter) {
      setIsThinking(true);
      setPendingAssistantId(assistantAfter.id);
      regenerate({ messageId: assistantAfter.id });
    }

    cancelEdit();
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
    regenerate({ messageId: assistantId });
  };

  const usePrompt = (text: string) => {
    setInput(text);
  };

  useEffect(() => {
    if (isThinking && (status === "streaming" || status === "error")) {
      setIsThinking(false);
    }
    if (status === "streaming" || status === "ready" || status === "error") {
      setPendingAssistantId(null);
    }
  }, [status, isThinking]);

  // Auto-resize textarea height up to a max
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const newHeight = Math.min(el.scrollHeight, 192); // max-h-48
    el.style.height = newHeight + "px";
  }, [input]);

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col bg-background relative">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-8 space-y-2"
        aria-live="polite"
        aria-busy={status !== "ready"}
      >
        {messages.length === 0 ? (
          <div className="flex h-[98%] items-center justify-center">
            <div className="text-center max-w-2xl">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-full flex flex-col gap-2 justify-center">
                  <Button
                    className="rounded-full"
                    variant="outline"
                    onClick={() =>
                      usePrompt(
                        "Riassumi i concetti principali di questo PDF citando i passaggi rilevanti"
                      )
                    }
                  >
                    Riassumi con citazioni
                  </Button>
                  <Button
                    className="rounded-full"
                    variant="outline"
                    onClick={() =>
                      usePrompt(
                        "Trova e spiega le definizioni presenti nel PDF indicando le pagine"
                      )
                    }
                  >
                    Definizioni e pagine
                  </Button>
                  <Button
                    className="rounded-full"
                    variant="outline"
                    onClick={() =>
                      usePrompt(
                        "Crea 5 domande a risposta multipla basate sul PDF e cita il testo di riferimento"
                      )
                    }
                  >
                    Crea quiz dal PDF
                  </Button>
                </div>
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
                        {!isUser && (
                          <div className="mb-2 text-xs text-muted-foreground italic">
                            Risposta basata sul PDF corrente.
                          </div>
                        )}
                        {message.parts.map((part, index) =>
                          part.type === "text" ? (
                            <MarkdownRenderer content={part.text} key={index} />
                          ) : null
                        )}
                        {!isUser && (status === "ready" || !isLastMessage) ? (
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
                          onClick={() => regenerateWithNote(message.id)}
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
            setIsThinking(true);
            sendMessage({ text: input, metadata: { noteSlug } });
            setInput("");
          }
        }}
        className="sticky bottom-0 z-10 w-full bg-transparent pb-8 md:pb-4 px-8"
      >
        <div className="w-full">
          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/10 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/10">
            <div className="flex-1 min-w-0 flex items-end gap-2 w-full">
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
                        sendMessage({ text: input, metadata: { noteSlug } });
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
    </div>
  );
}
