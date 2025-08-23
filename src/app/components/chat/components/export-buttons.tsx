"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, FileDown } from "lucide-react";
import {
  exportChatAsMarkdown,
  exportChatAsPdf,
  ChatMessage as ExportChatMessage,
} from "@/utils/chat-export";

type Props = {
  messages: any[];
  fileNameBase?: string;
  className?: string;
};

function toExportMessages(messages: any[]): ExportChatMessage[] {
  return (messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    parts: Array.isArray(m.parts) ? m.parts : [],
  }));
}

export default function ExportButtons({
  messages,
  fileNameBase,
  className,
}: Props) {
  const exportMd = React.useCallback(() => {
    exportChatAsMarkdown({
      messages: toExportMessages(messages),
      fileNameBase,
    });
  }, [messages, fileNameBase]);

  const exportPdf = React.useCallback(() => {
    exportChatAsPdf({ messages: toExportMessages(messages), fileNameBase });
  }, [messages, fileNameBase]);

  const disabled = !messages || messages.length === 0;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={exportMd}
          disabled={disabled}
          title="Esporta chat in Markdown"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={exportPdf}
          disabled={disabled}
          title="Esporta chat in PDF"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}
