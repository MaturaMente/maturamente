"use client";

import React, { useState } from "react";
import { FileUser, X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageDocumentsDisplayProps {
  message: any; // The message object containing metadata
  notes: any[];
  subjects: any[];
  uploadedFiles: { [key: string]: { title: string; description: string } };
  maxInitialDisplay?: number;
}

export default function MessageDocumentsDisplay({
  message,
  notes,
  subjects,
  uploadedFiles,
  maxInitialDisplay = 1,
}: MessageDocumentsDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Extract documents from message metadata
  const selectedNoteSlugs: string[] = message?.metadata?.selectedNoteSlugs || [];
  const selectedFileSources: string[] = message?.metadata?.selectedFileSources || [];
  
  const totalDocuments = selectedNoteSlugs.length + selectedFileSources.length;
  
  if (totalDocuments === 0) return null;

  const allDocuments = [
    ...selectedFileSources.map((source, index) => ({
      id: `file-${source}`,
      type: 'file' as const,
      source,
      index,
    })),
    ...selectedNoteSlugs.map((slug, index) => ({
      id: `note-${slug}`,
      type: 'note' as const,
      slug,
      index: index + selectedFileSources.length,
    })),
  ];

  // Simple heuristic: if 3 or more documents, use collapse functionality
  // For 1-2 documents, always show all (they usually fit in one line)
  const needsCollapse = totalDocuments > 2;
  const documentsToShow = (needsCollapse && !showAll) ? allDocuments.slice(0, maxInitialDisplay) : allDocuments;

  const renderFileDocument = (source: string) => {
    const fileInfo = uploadedFiles[source];
    const title = fileInfo?.title || source.replace(/\.[^/.]+$/, "");
    const sep = title.indexOf(" - ");
    const mainTitle = sep !== -1 ? title.slice(0, sep) : title;
    const subtitle = sep !== -1 ? title.slice(sep + 3) : (fileInfo?.description && fileInfo.description !== title ? fileInfo.description : null);

    return (
      <div
        className="flex-shrink-0 h-[54px] flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 min-w-[180px] max-w-[250px]"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileUser className="h-5 w-5 flex-shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm line-clamp-1 text-foreground">
              {mainTitle}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground line-clamp-1">
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNoteDocument = (slug: string) => {
    const note = notes.find((n) => n.slug === slug);
    const subject = subjects.find((s) => s.id === note?.subject_id);
    
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
    
    const { mainTitle, subtitle } = parseTitle(note?.title || "");

    return (
      <div
        className="relative h-[54px] flex items-center gap-1 rounded-2xl border bg-background p-2"
        style={{ ["--subject-color" as any]: subject?.color }}
      >
        <div className="flex p-1 items-center justify-center">
            <FileText className="h-4 w-4 flex-shrink-0 text-[var(--subject-color)]"/>
        </div>
        <div className="leading-tight pr-2">
            <div className="font-medium text-sm max-w-[220px] line-clamp-1 text-foreground">
                {mainTitle}
            </div>
            {subtitle && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                {subtitle}
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full py-2">
      <div className="flex flex-wrap gap-2 w-full overflow-hidden transition-[max-height] duration-200">
        {documentsToShow.map((doc) => (
          <div key={doc.id}>
            {doc.type === 'file' 
              ? renderFileDocument(doc.source)
              : renderNoteDocument(doc.slug)
            }
          </div>
        ))}
      </div>
      
      {needsCollapse && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-muted-foreground px-0"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Mostra meno
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Mostra tutti ({totalDocuments - maxInitialDisplay})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
