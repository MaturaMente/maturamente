// Enhanced utility functions to export chat history to beautiful PDFs
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

// Enhanced markdown parsing for better formatting
interface ParsedContent {
  type:
    | "text"
    | "heading"
    | "code"
    | "list"
    | "quote"
    | "bold"
    | "italic"
    | "math";
  content: string;
  level?: number; // for headings
  indent?: number; // for lists
  inline?: boolean; // for inline elements
}

function parseMarkdown(text: string): ParsedContent[] {
  const lines = text.split("\n");
  const parsed: ParsedContent[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let currentList: { content: string; indent: number }[] = [];

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      parsed.push({
        type: "code",
        content: codeBlockContent.join("\n"),
      });
      codeBlockContent = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      currentList.forEach((item) => {
        parsed.push({
          type: "list",
          content: item.content,
          indent: item.indent,
        });
      });
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      parsed.push({
        type: "heading",
        content: headingMatch[2],
        level: headingMatch[1].length,
      });
      continue;
    }

    // Handle lists
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2);
      currentList.push({
        content: listMatch[3],
        indent: indent,
      });
      continue;
    } else {
      flushList();
    }

    // Handle quotes
    if (line.trim().startsWith(">")) {
      parsed.push({
        type: "quote",
        content: line.replace(/^>\s*/, ""),
      });
      continue;
    }

    // Handle empty lines
    if (line.trim() === "") {
      parsed.push({
        type: "text",
        content: "",
      });
      continue;
    }

    // Regular text with inline formatting
    parsed.push({
      type: "text",
      content: line,
    });
  }

  flushCodeBlock();
  flushList();
  return parsed;
}

// Enhanced inline text processing for bold, italic, code, etc.
interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  math?: boolean;
}

function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let current = "";
  let i = 0;

  while (i < text.length) {
    // Handle bold (**text**)
    if (text.substring(i, i + 2) === "**") {
      if (current) {
        segments.push({ text: current });
        current = "";
      }
      i += 2;
      let boldText = "";
      while (i < text.length - 1 && text.substring(i, i + 2) !== "**") {
        boldText += text[i];
        i++;
      }
      if (i < text.length - 1) {
        segments.push({ text: boldText, bold: true });
        i += 2;
      } else {
        current += "**" + boldText;
      }
    }
    // Handle italic (*text*)
    else if (text[i] === "*" && text[i + 1] !== "*") {
      if (current) {
        segments.push({ text: current });
        current = "";
      }
      i++;
      let italicText = "";
      while (i < text.length && text[i] !== "*") {
        italicText += text[i];
        i++;
      }
      if (i < text.length) {
        segments.push({ text: italicText, italic: true });
        i++;
      } else {
        current += "*" + italicText;
      }
    }
    // Handle inline code (`code`)
    else if (text[i] === "`") {
      if (current) {
        segments.push({ text: current });
        current = "";
      }
      i++;
      let codeText = "";
      while (i < text.length && text[i] !== "`") {
        codeText += text[i];
        i++;
      }
      if (i < text.length) {
        segments.push({ text: codeText, code: true });
        i++;
      } else {
        current += "`" + codeText;
      }
    }
    // Handle math ($math$)
    else if (text[i] === "$") {
      if (current) {
        segments.push({ text: current });
        current = "";
      }
      i++;
      let mathText = "";
      while (i < text.length && text[i] !== "$") {
        mathText += text[i];
        i++;
      }
      if (i < text.length) {
        segments.push({ text: mathText, math: true });
        i++;
      } else {
        current += "$" + mathText;
      }
    } else {
      current += text[i];
      i++;
    }
  }

  if (current) {
    segments.push({ text: current });
  }

  return segments;
}

function extractPlainTextFromMessage(message: ChatMessage): string {
  return (message.parts || [])
    .filter((p) => p && p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
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

  // Enhanced page layout
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  const bubbleMaxWidth = maxWidth * 0.75;

  let currentY = margin;

  // Color scheme
  type Color = [number, number, number];
  const colors: Record<string, Color> = {
    background: [250, 251, 252], // slate-50
    userBubble: [59, 130, 246], // blue-500
    assistantBubble: [255, 255, 255], // white
    userText: [255, 255, 255], // white
    assistantText: [31, 41, 55], // gray-800
    border: [229, 231, 235], // gray-200
    accent: [99, 102, 241], // indigo-500
    code: [248, 250, 252], // slate-50
    codeText: [51, 65, 85], // slate-600
    heading: [15, 23, 42], // slate-900
    quote: [107, 114, 128], // gray-500
    quoteBorder: [209, 213, 219], // gray-300
  };

  // Parse theme color
  const parseHex = (hex?: string): [number, number, number] => {
    if (!hex) return colors.userBubble;
    const clean = hex.replace(/^#/, "");
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    const bigint = parseInt(full, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  const themeColor: Color = parseHex(meta?.themeColor);

  // Background
  const setFill = (c: Color) => {
    const [r, g, b] = c;
    doc.setFillColor(r, g, b);
  };
  const setDraw = (c: Color) => {
    const [r, g, b] = c;
    doc.setDrawColor(r, g, b);
  };
  const setText = (c: Color) => {
    const [r, g, b] = c;
    doc.setTextColor(r, g, b);
  };

  const addPageBackground = () => {
    setFill(colors.background);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };

  // Header with metadata
  const addHeader = () => {
    if (meta?.title || meta?.userName || meta?.subjectName) {
      setFill([255, 255, 255]);
      setDraw(colors.border);
      doc.roundedRect(margin, currentY, maxWidth, 80, 8, 8, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      setText(colors.heading);

      let headerY = currentY + 25;

      if (meta.title) {
        doc.text(meta.title, margin + 20, headerY);
        headerY += 20;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      setText(colors.assistantText);

      if (meta.userName) {
        doc.text(`User: ${meta.userName}`, margin + 20, headerY);
      }

      if (meta.subjectName) {
        const subjectX = meta.userName ? margin + 200 : margin + 20;
        doc.text(`Subject: ${meta.subjectName}`, subjectX, headerY);
      }

      if (meta.date) {
        const dateStr = meta.date.toLocaleDateString();
        const dateWidth = doc.getTextWidth(dateStr);
        doc.text(dateStr, pageWidth - margin - 20 - dateWidth, headerY);
      }

      currentY += 100;
    }
  };

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      addPageBackground();
      currentY = margin;
    }
  };

  const renderTextSegments = (
    segments: TextSegment[],
    x: number,
    y: number,
    maxWidth: number,
    color: [number, number, number]
  ) => {
    let currentX = x;
    let currentLineY = y;
    const lineHeight = 16;

    for (const segment of segments) {
      // Set font style
      if (segment.bold && segment.italic) {
        doc.setFont("helvetica", "bolditalic");
      } else if (segment.bold) {
        doc.setFont("helvetica", "bold");
      } else if (segment.italic) {
        doc.setFont("helvetica", "italic");
      } else {
        doc.setFont("helvetica", "normal");
      }

      if (segment.code) {
        // Inline code styling
        setFill(colors.code);
        setText(colors.codeText);
        doc.setFont("courier", "normal");
        doc.setFontSize(10);

        const textWidth = doc.getTextWidth(segment.text);
        doc.roundedRect(
          currentX - 2,
          currentLineY - 12,
          textWidth + 4,
          16,
          2,
          2,
          "F"
        );
        doc.text(segment.text, currentX, currentLineY);
        currentX += textWidth + 4;
      } else if (segment.math) {
        // Math styling (simplified - would need math renderer for full support)
        setText(colors.accent);
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.text(segment.text, currentX, currentLineY);
        currentX += doc.getTextWidth(segment.text);
      } else {
        // Regular text
        setText(color);
        doc.setFontSize(12);

        const words = segment.text.split(" ");
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? " " : "");
          const wordWidth = doc.getTextWidth(word);

          if (currentX + wordWidth > x + maxWidth) {
            currentLineY += lineHeight;
            currentX = x;
          }

          doc.text(word, currentX, currentLineY);
          currentX += wordWidth;
        }
      }
    }

    return currentLineY - y + lineHeight;
  };

  const renderParsedContent = (
    content: ParsedContent[],
    x: number,
    startY: number,
    maxWidth: number,
    textColor: [number, number, number]
  ) => {
    let y = startY;
    const baseLineHeight = 16;

    for (const item of content) {
      switch (item.type) {
        case "heading":
          const headingSizes = [20, 18, 16, 14, 13, 12];
          const size = headingSizes[Math.min((item.level || 1) - 1, 5)];

          doc.setFont("helvetica", "bold");
          doc.setFontSize(size);
          setText(colors.heading);

          const headingLines = doc.splitTextToSize(item.content, maxWidth);
          for (const line of headingLines) {
            doc.text(line, x, y + size * 0.8);
            y += size + 8;
          }
          y += 8;
          break;

        case "code":
          // Code block
          const codeLines = item.content.split("\n");
          const codeHeight = codeLines.length * 14 + 16;

          setFill(colors.code);
          setDraw(colors.border);
          doc.roundedRect(x, y - 8, maxWidth, codeHeight, 4, 4, "FD");

          doc.setFont("courier", "normal");
          doc.setFontSize(10);
          setText(colors.codeText);

          for (let i = 0; i < codeLines.length; i++) {
            doc.text(codeLines[i], x + 10, y + i * 14 + 8);
          }
          y += codeHeight + 12;
          break;

        case "list":
          const bullet = "• ";
          const indent = (item.indent || 0) * 20;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          setText(textColor);

          const listText = bullet + item.content;
          const listLines = doc.splitTextToSize(listText, maxWidth - indent);

          for (let i = 0; i < listLines.length; i++) {
            doc.text(listLines[i], x + indent, y + baseLineHeight);
            y += baseLineHeight;
          }
          y += 4;
          break;

        case "quote":
          // Quote block
          setDraw(colors.quoteBorder);
          doc.setLineWidth(3);
          doc.line(x, y - 4, x, y + 16);

          doc.setFont("helvetica", "italic");
          doc.setFontSize(12);
          setText(colors.quote);

          const quoteLines = doc.splitTextToSize(item.content, maxWidth - 20);
          for (const line of quoteLines) {
            doc.text(line, x + 15, y + baseLineHeight);
            y += baseLineHeight;
          }
          y += 8;
          break;

        case "text":
          if (item.content.trim() === "") {
            y += baseLineHeight;
          } else {
            const segments = parseInlineFormatting(item.content);
            const textHeight = renderTextSegments(
              segments,
              x,
              y + baseLineHeight,
              maxWidth,
              textColor
            );
            y += Math.max(textHeight, baseLineHeight) + 4;
          }
          break;
      }
    }

    return y - startY;
  };

  const measureParsedContentHeight = (
    content: ParsedContent[],
    maxWidth: number
  ): number => {
    let height = 0;
    const baseLine = 16;
    for (const item of content) {
      if (item.type === "heading") {
        const headingSizes = [20, 18, 16, 14, 13, 12];
        const sz = headingSizes[Math.min((item.level || 1) - 1, 5)];
        const lines = doc.splitTextToSize(item.content, maxWidth);
        height += lines.length * (sz + 8) + 8;
      } else if (item.type === "code") {
        const lines = item.content.split("\n").length;
        height += lines * 14 + 28;
      } else if (item.type === "list") {
        const indent = (item.indent || 0) * 20;
        const text = "• " + item.content;
        const lines = doc.splitTextToSize(text, maxWidth - indent).length;
        height += lines * baseLine + 4;
      } else if (item.type === "quote") {
        const lines = doc.splitTextToSize(item.content, maxWidth - 20).length;
        height += lines * baseLine + 8;
      } else {
        const lines = doc.splitTextToSize(item.content || " ", maxWidth).length;
        height += lines * baseLine + 4;
      }
    }
    return Math.max(height, baseLine);
  };

  const renderMessage = (message: ChatMessage) => {
    const text = extractPlainTextFromMessage(message).trim();
    if (!text) return;

    const isUser = message.role === "user";
    const bubbleColor = isUser ? themeColor : colors.assistantBubble;
    const textColor = isUser ? colors.userText : colors.assistantText;
    const borderColor = isUser ? themeColor : colors.border;

    const padding = 16;
    const parsedContent = parseMarkdown(text);

    // Measure height without drawing off-page
    const contentHeight = measureParsedContentHeight(
      parsedContent,
      bubbleMaxWidth - padding * 2
    );
    const bubbleHeight = contentHeight + padding * 2;

    ensureSpace(bubbleHeight + 20);

    const bubbleX = isUser ? pageWidth - margin - bubbleMaxWidth : margin;

    // Draw bubble
    setFill(bubbleColor as Color);
    setDraw(borderColor as Color);
    doc.setLineWidth(1);
    doc.roundedRect(
      bubbleX,
      currentY,
      bubbleMaxWidth,
      bubbleHeight,
      12,
      12,
      "FD"
    );

    // Render content
    renderParsedContent(
      parsedContent,
      bubbleX + padding,
      currentY,
      bubbleMaxWidth - padding * 2,
      textColor as Color
    );

    currentY += bubbleHeight + 16;
  };

  // Initialize first page
  addPageBackground();
  addHeader();

  // Render messages
  for (const message of messages || []) {
    renderMessage(message);
  }

  // Save PDF
  const filename =
    fileNameOverride || buildDefaultFileName(fileNameBase || "chat", "pdf");
  doc.save(filename);
}

// Export other utility functions
export function exportChatAsMarkdown(options: {
  messages: ChatMessage[];
  fileNameBase?: string;
  fileNameOverride?: string;
}) {
  const { messages, fileNameBase, fileNameOverride } = options;

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

    lines.push(`## ${roleLabel}`);
    lines.push(text);
    lines.push("");
  }

  const markdown = lines.join("\n").trimEnd() + "\n";
  const filename =
    fileNameOverride || buildDefaultFileName(fileNameBase || "chat", "md");
  triggerDownload(markdown, "text/markdown;charset=utf-8", filename);
}

export function getPlainTextMessages(
  messages: ChatMessage[]
): { role: string; text: string }[] {
  return (messages || [])
    .map((m) => ({ role: m.role, text: extractPlainTextFromMessage(m) }))
    .filter((m) => m.text.trim().length > 0);
}
