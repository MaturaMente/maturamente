"use client";

import { Star, FileText, Lock } from "lucide-react";
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
  isPremium?: boolean;
  isFreeTrial?: boolean;
}

export function NoteRow({
  note,
  onToggleFavorite,
  isLoading,
  previewUrl,
  isPremium = false,
  isFreeTrial = false,
}: NoteRowProps) {
  const params = useParams();
  const subjectSlug = (params?.["subject-slug"] as string) || "";

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't allow favoriting premium notes for free trial users
    if (isFreeTrial && isPremium) {
      return;
    }

    if (onToggleFavorite && !isLoading) {
      onToggleFavorite(note.id, !note.is_favorite);
    }
  };

  // Determine if the favorite button should be disabled
  const isFavoriteDisabled = isFreeTrial && isPremium;

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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1 group-hover:text-[var(--subject-color)] transition-colors">
                  {note.title}
                </h3>
                {isPremium && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                    <Lock className="h-3 w-3" />
                    Premium
                  </div>
                )}
              </div>
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
              disabled={isLoading || isFavoriteDisabled}
              className={cn(
                "flex-shrink-0 p-1 rounded-full transition-colors",
                isFavoriteDisabled
                  ? "cursor-not-allowed opacity-30"
                  : "dark:hover:bg-gray-800"
              )}
              aria-label={
                isFavoriteDisabled
                  ? "Non disponibile per gli appunti Premium"
                  : note.is_favorite
                  ? "Rimuovi dai preferiti"
                  : "Aggiungi ai preferiti"
              }
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-all",
                  isFavoriteDisabled
                    ? "text-gray-300 dark:text-gray-600"
                    : note.is_favorite
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
