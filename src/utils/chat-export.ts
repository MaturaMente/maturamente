// Utility functions to export chat history to Markdown and PDF
// The functions are intentionally framework-agnostic so they can be reused across the app.

import { jsPDF } from "jspdf";

type ChatMessagePart = {
  type: string;
  text?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | string;
  parts: ChatMessagePart[];
};

function extractPlainTextFromMessage(message: ChatMessage): string {
  return (message.parts || [])
    .filter((p) => p && p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
}

function buildMarkdownFromMessages(messages: ChatMessage[]): string {
  const lines: string[] = [];
  for (const message of messages) {
    const roleLabel =
      message.role === "user"
        ? "User"
        : message.role === "assistant"
        ? "Assistant"
        : message.role;
    const text = extractPlainTextFromMessage(message).trim();
    if (text.length === 0) continue;
    lines.push(`${roleLabel}:`);
    lines.push(text);
    lines.push("");
  }
  // Ensure a trailing newline
  return lines.join("\n").trimEnd() + "\n";
}

function triggerDownload(data: BlobPart, mimeType: string, filename: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildDefaultFileName(base?: string, ext?: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const safeBase = (base || "chat").replace(/[^a-z0-9-_]+/gi, "-");
  return `${safeBase}-${yyyy}${mm}${dd}-${hh}${min}.${ext || "txt"}`;
}

export function exportChatAsMarkdown(options: {
  messages: ChatMessage[];
  fileNameBase?: string;
  fileNameOverride?: string;
}) {
  const { messages, fileNameBase, fileNameOverride } = options;
  const markdown = buildMarkdownFromMessages(messages || []);
  const filename =
    fileNameOverride || buildDefaultFileName(fileNameBase || "chat", "md");
  triggerDownload(markdown, "text/markdown;charset=utf-8", filename);
}

export function exportChatAsPdf(options: {
  messages: ChatMessage[];
  fileNameBase?: string;
  fileNameOverride?: string;
  meta?: {
    title?: string;
    userName?: string | null;
    subjectName?: string | null;
    date?: Date;
    themeColor?: string;
    extraMeta?: Record<string, string | number | boolean | null | undefined>;
  };
}) {
  const { messages, fileNameBase, fileNameOverride, meta } = options;

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Page layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 48;
  const marginRight = 48;
  const marginTop = 56;
  const marginBottom = 64;
  const maxWidth = pageWidth - marginLeft - marginRight;
  const lineHeight = 18;

  let cursorY = marginTop;

  const parseHex = (hex?: string): [number, number, number] => {
    if (!hex) return [59, 130, 246]; // default blue-500
    const clean = hex.replace(/^#/, "");
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      drawHeaderBar();
      cursorY = marginTop;
    }
  };

  const [r, g, b] = parseHex(meta?.themeColor);

  const drawHeaderBar = () => {
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const titleText = meta?.title || "Chat Export";
    doc.text(titleText, marginLeft, 24);
    const date = meta?.date || new Date();
    const dateText = `${date.toLocaleDateString()} ${date.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - marginRight - dateWidth, 24);
    doc.setTextColor(33, 37, 41);
  };

  drawHeaderBar();

  const drawMetaCard = () => {
    const infoLines: string[] = [];
    if (meta?.userName) infoLines.push(`Utente: ${meta.userName}`);
    if (meta?.subjectName) infoLines.push(`Materia: ${meta.subjectName}`);
    if (meta?.extraMeta) {
      for (const [k, v] of Object.entries(meta.extraMeta)) {
        if (v === undefined || v === null || v === "") continue;
        infoLines.push(`${k}: ${String(v)}`);
      }
    }
    if (infoLines.length === 0) return;

    const padding = 10;
    const boxHeight = 24 + infoLines.length * 16;
    ensureSpace(boxHeight + 10);
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(marginLeft, cursorY, maxWidth, boxHeight, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    let y = cursorY + padding + 12;
    for (const line of infoLines) {
      doc.text(line, marginLeft + padding, y);
      y += 16;
    }
    cursorY += boxHeight + 12;
  };

  drawMetaCard();

  const roleStyles: Record<
    string,
    { fill: [number, number, number]; text: [number, number, number] }
  > = {
    user: { fill: [245, 246, 248], text: [33, 37, 41] },
    assistant: { fill: [r, g, b], text: [255, 255, 255] },
  };

  const drawMessageBubble = (role: string, text: string) => {
    const style = role === "assistant" ? roleStyles.assistant : roleStyles.user;
    const paddingX = 12;
    const paddingY = 10;
    const label =
      role === "assistant" ? "Assistant" : role === "user" ? "User" : role;

    // Label above bubble
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    ensureSpace(16);
    doc.text(label, marginLeft, cursorY + 10);
    cursorY += 14;

    // Bubble content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const wrapped = doc.splitTextToSize(text, maxWidth - paddingX * 2);
    const contentHeight = wrapped.length * lineHeight;
    const bubbleHeight = paddingY * 2 + contentHeight;
    ensureSpace(bubbleHeight + 8);

    // Bubble background
    doc.setFillColor(...style.fill);
    doc.setDrawColor(235, 237, 240);
    doc.roundedRect(marginLeft, cursorY, maxWidth, bubbleHeight, 8, 8, "FD");

    // Bubble text
    doc.setTextColor(...style.text);
    let y = cursorY + paddingY + 12;
    for (const line of wrapped) {
      doc.text(line, marginLeft + paddingX, y);
      y += lineHeight;
      if (y > pageHeight - marginBottom) {
        doc.addPage();
        drawHeaderBar();
        cursorY = marginTop;
        // New page continuation bubble
        doc.setFillColor(...style.fill);
        doc.setDrawColor(235, 237, 240);
        const minHeight = paddingY * 2 + lineHeight * 2;
        doc.roundedRect(marginLeft, cursorY, maxWidth, minHeight, 8, 8, "FD");
        y = cursorY + paddingY + 12;
      }
    }
    cursorY = y + 6;
    doc.setTextColor(33, 37, 41);
  };

  for (const message of messages || []) {
    const text = extractPlainTextFromMessage(message).trim();
    if (!text) continue;
    drawMessageBubble(message.role, text);
  }

  const filename =
    fileNameOverride || buildDefaultFileName(fileNameBase || "chat", "pdf");
  doc.save(filename);
}

export function getPlainTextMessages(
  messages: ChatMessage[]
): { role: string; text: string }[] {
  return (messages || [])
    .map((m) => ({ role: m.role, text: extractPlainTextFromMessage(m) }))
    .filter((m) => m.text.trim().length > 0);
}
