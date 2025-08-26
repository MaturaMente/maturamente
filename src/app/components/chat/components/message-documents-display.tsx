"use client";

import React, { useState } from "react";
import { FileUser, X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageDocumentsDisplayProps {
  selectedNoteSlugs: string[];
  selectedFileSources: string[];
  notes: any[];
  subjects: any[];
  uploadedFiles: { [key: string]: { title: string; description: string } };
  maxInitialDisplay?: number;
}

export default function MessageDocumentsDisplay({
  selectedNoteSlugs,
  selectedFileSources,
  notes,
  subjects,
  uploadedFiles,
  maxInitialDisplay = 1,
}: MessageDocumentsDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  
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

  const documentsToShow = showAll ? allDocuments : allDocuments.slice(0, maxInitialDisplay);
  const hasMore = allDocuments.length > maxInitialDisplay;

  const renderFileDocument = (source: string) => {
    const fileInfo = uploadedFiles[source];
    const title = fileInfo?.title || source.replace(/\.[^/.]+$/, "");
    const sep = title.indexOf(" - ");
    const mainTitle = sep !== -1 ? title.slice(0, sep) : title;
    const subtitle = sep !== -1 ? title.slice(sep + 3) : (fileInfo?.description && fileInfo.description !== title ? fileInfo.description : null);

    return (
      <div
        className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 min-w-[180px] max-w-[250px]"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileUser className="h-5 w-5 flex-shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm line-clamp-1 text-black">
              {mainTitle}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-black line-clamp-1">
                {subtitle}
              </div>
            )}
            <div className="text-xs text-muted-black">
              File caricato
            </div>
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
        className="relative flex items-center gap-1 rounded-xl border bg-white p-2"
        style={{ ["--subject-color" as any]: subject?.color }}
      >
        <div className="flex p-1 items-center justify-center">
            <FileText className="h-4 w-4 flex-shrink-0 text-[var(--subject-color)]"/>
        </div>
        <div className="leading-tight pr-2">
            <div className="font-medium text-sm max-w-[220px] line-clamp-1 text-black">
                {mainTitle}
            </div>
            {subtitle && (
                <div className="text-xs text-gray-600 line-clamp-1">
                {subtitle}
                </div>
            )}
            <div className="text-xs" style={{ color: subject?.color }}>
                {subject?.name || ""}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 w-full overflow-hidden transition-[max-height] duration-200 max-h-[999px]">
        {documentsToShow.map((doc) => (
          <div key={doc.id}>
            {doc.type === 'file' 
              ? renderFileDocument(doc.source)
              : renderNoteDocument(doc.slug)
            }
          </div>
        ))}
      </div>
      
      {hasMore && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-white px-0"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Mostra meno
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Mostra più ({totalDocuments - maxInitialDisplay})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
