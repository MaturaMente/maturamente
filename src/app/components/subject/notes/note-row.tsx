"use client";

import { Star, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ImagePreview } from "./image-preview";
import type { Note } from "@/types/notesTypes";

interface NoteRowProps {
  note: Note;
  onToggleFavorite?: (noteId: string, isFavorite: boolean) => void;
  isLoading?: boolean;
  previewUrl?: string;
}

export function NoteRow({
  note,
  onToggleFavorite,
  isLoading,
  previewUrl,
}: NoteRowProps) {
  const params = useParams();
  const subjectSlug = (params?.["subject-slug"] as string) || "";

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite && !isLoading) {
      onToggleFavorite(note.id, !note.is_favorite);
    }
  };

  return (
    <Link href={`/${subjectSlug}/${note.slug}`}>
      <div className="group relative flex items-center gap-4 p-4 bg-[var(--subject-color)]/2 border border-[var(--subject-color)]/10 rounded-lg hover:shadow-sm/5 hover:border-[var(--subject-color)]/30 transition-all duration-200 cursor-pointer">
        {/* Image Preview */}
        <div className="flex-shrink-0 overflow-hidden">
          {previewUrl ? (
            <ImagePreview
              previewUrl={previewUrl}
              width={80}
              height={100}
              className="shadow-sm overflow-hidden rounded-md"
              alt={`Preview of ${note.title}`}
            />
          ) : (
            <div className="w-20 h-[100px] bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1 group-hover:text-[var(--subject-color)] transition-colors">
                {note.title}
              </h3>
              {note.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {note.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {note.n_pages} {note.n_pages === 1 ? "pagina" : "pagine"}
                </span>
              </div>
            </div>

            {/* Favorite Star */}
            <button
              onClick={handleToggleFavorite}
              disabled={isLoading}
              className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={
                note.is_favorite
                  ? "Rimuovi dai preferiti"
                  : "Aggiungi ai preferiti"
              }
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-all",
                  note.is_favorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-400 hover:text-yellow-400 hover:scale-110"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
