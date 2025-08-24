"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Download, FileDown, FileText } from "lucide-react";
import {
  exportChatAsMarkdown,
  exportChatAsPdf,
  ChatMessage as ExportChatMessage,
} from "@/utils/chat/chat-export";

type Props = {
  messages: any[];
  fileNameBase?: string;
  getMetadata?: () => {
    title?: string;
    userName?: string | null;
    subjectName?: string | null;
    date?: Date;
    themeColor?: string;
    extraMeta?: Record<string, string | number | boolean | null | undefined>;
  };
  className?: string;
  buttonVariant?: "ghost" | "outline" | "secondary" | "default";
  buttonSize?: "sm" | "default" | "icon";
  label?: string;
};

function toExportMessages(messages: any[]): ExportChatMessage[] {
  return (messages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    parts: Array.isArray(m.parts) ? m.parts : [],
  }));
}

export default function DownloadMenuButton({
  messages,
  fileNameBase,
  getMetadata,
  className,
  buttonVariant = "outline",
  buttonSize = "sm",
  label,
}: Props) {
  const md = React.useCallback(() => {
    exportChatAsMarkdown({
      messages: toExportMessages(messages),
      fileNameBase,
    });
  }, [messages, fileNameBase]);

  const pdf = React.useCallback(() => {
    const meta = getMetadata ? getMetadata() : undefined;
    exportChatAsPdf({
      messages: toExportMessages(messages),
      fileNameBase,
      ...(meta ? ({ meta } as any) : {}),
    });
  }, [messages, fileNameBase, getMetadata]);

  const disabled = !messages || messages.length === 0;

  return (
    <Button
      className={className}
      size={buttonSize}
      variant={buttonVariant}
      disabled={disabled}
      onClick={md}
      title="Scarica conversazione"
    >
      <Download className="h-5 w-5" />
    </Button>
    // <DropdownMenu>
    //   <DropdownMenuTrigger asChild>
    //   </DropdownMenuTrigger>
    //   <DropdownMenuContent align="end" className="w-44">
    //     <DropdownMenuItem onClick={md}>
    //       <FileText className="h-4 w-4 mr-2" />
    //       Esporta Markdown
    //     </DropdownMenuItem>
    //     <DropdownMenuItem onClick={pdf}>
    //       <FileDown className="h-4 w-4 mr-2" />
    //       Esporta PDF
    //     </DropdownMenuItem>
    //   </DropdownMenuContent>
    // </DropdownMenu>
  );
}
