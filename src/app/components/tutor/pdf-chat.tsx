"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkdownRenderer from "../shared/renderer/markdown-renderer";
import { ArrowUp, Copy, Pencil, Plus, RefreshCw, Square } from "lucide-react";

export default function Page({ subject }: { subject?: string }) {
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
          ? { ...m, parts: [{ type: "text", text: editingValue }] }
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

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col bg-background">
      <div
        className="flex-1 overflow-y-auto p-8 space-y-2"
        aria-live="polite"
        aria-busy={status !== "ready"}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Start the conversation by typing a message below.
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            const messageText = extractTextFromMessage(message);
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div className="group relative max-w-[80%]">
                  <div
                    className={`inline-block px-4 ${
                      isUser
                        ? "px-4 py-2 rounded-2xl bg-primary dark:text-foreground text-primary-foreground"
                        : "bg-none text-foreground w-full"
                    }`}
                  >
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <MarkdownRenderer content={part.text} key={index} />
                      ) : null
                    )}
                  </div>

                  {/* hover actions below bubble, outside */}
                  <div
                    className={`pointer-events-auto mt-2 px-4 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
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
                          <Copy className="mr-1 h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          disabled={status !== "ready"}
                          onClick={() => beginEdit(message.id)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
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
                          <Copy className="mr-1 h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          disabled={!(status === "ready" || status === "error")}
                          onClick={() => regenerate({ messageId: message.id })}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {editingMessageId === message.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={status !== "ready"}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (status !== "ready") return;
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
        className="sticky bottom-0 z-10 w-full bg-gradient-to-t from-background via-background/80 to-transparent px-6 py-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
            {/* left mock notes button */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full"
            >
              <Plus className="h-5 w-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything"
              className="h-10 flex-1 border-0 bg-transparent px-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={status !== "ready"}
            />

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
      </form>
    </div>
  );
}
