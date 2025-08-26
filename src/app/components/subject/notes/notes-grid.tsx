"use client";

import {
  useState,
  useMemo,
  useDeferredValue,
  useCallback,
  useEffect,
} from "react";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { NoteRow } from "./note-row";
import { NoteCard } from "./note-card";
import type { Note, SubjectInfo } from "@/types/notesTypes";
import { generatePreviewUrls } from "@/utils/preview-urls";

interface NotesGridClientProps {
  allNotes: Note[];
  favoriteNotes: Note[];
  subject: SubjectInfo;
}

export function NotesGridClient({
  allNotes: initialAllNotes,
  favoriteNotes: initialFavoriteNotes,
  subject,
}: NotesGridClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allNotes, setAllNotes] = useState(initialAllNotes);
  const [favoriteNotes, setFavoriteNotes] = useState(initialFavoriteNotes);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Set CSS custom properties for dynamic theming
  useEffect(() => {
    if (subject?.color) {
      document.documentElement.style.setProperty(
        "--subject-color",
        subject.color
      );
    }
    return () => {
      document.documentElement.style.removeProperty("--subject-color");
    };
  }, [subject?.color]);

  // Generate preview URLs for notes
  useEffect(() => {
    const urls = generatePreviewUrls(allNotes);
    setPreviewUrls(urls);
  }, [allNotes]);

  const handleToggleFavorite = useCallback(
    async (noteId: string, isFavorite: boolean) => {
      setIsTogglingFavorite(true);

      // Optimistic update
      const updateNote = (note: Note) =>
        note.id === noteId ? { ...note, is_favorite: isFavorite } : note;

      setAllNotes((prev) => prev.map(updateNote));

      if (isFavorite) {
        // Add to favorites
        const noteToAdd = allNotes.find((note) => note.id === noteId);
        if (noteToAdd) {
          setFavoriteNotes((prev) => [
            ...prev,
            { ...noteToAdd, is_favorite: true },
          ]);
        }
      } else {
        // Remove from favorites
        setFavoriteNotes((prev) => prev.filter((note) => note.id !== noteId));
      }

      try {
        const response = await fetch("/api/notes/favorite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ noteId, isFavorite }),
        });

        if (!response.ok) {
          throw new Error("Failed to toggle favorite");
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);

        // Revert optimistic update on error
        setAllNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, is_favorite: !isFavorite } : note
          )
        );

        if (isFavorite) {
          setFavoriteNotes((prev) => prev.filter((note) => note.id !== noteId));
        } else {
          const noteToReAdd = initialAllNotes.find(
            (note) => note.id === noteId
          );
          if (noteToReAdd) {
            setFavoriteNotes((prev) => [
              ...prev,
              { ...noteToReAdd, is_favorite: true },
            ]);
          }
        }
      } finally {
        setIsTogglingFavorite(false);
      }
    },
    [allNotes, initialAllNotes]
  );

  // Filter notes based on search query
  const filteredAllNotes = useMemo(() => {
    if (!deferredSearchQuery.trim()) return allNotes;

    const query = deferredSearchQuery.toLowerCase();
    return allNotes.filter((note) => note.title.toLowerCase().includes(query));
  }, [allNotes, deferredSearchQuery]);

  const filteredFavoriteNotes = useMemo(() => {
    if (!deferredSearchQuery.trim()) return favoriteNotes;

    const query = deferredSearchQuery.toLowerCase();
    return favoriteNotes.filter((note) =>
      note.title.toLowerCase().includes(query)
    );
  }, [favoriteNotes, deferredSearchQuery]);

  const hasSearchResults = filteredAllNotes.length > 0;
  const hasFavoriteResults = filteredFavoriteNotes.length > 0;
  const isSearching = deferredSearchQuery.trim().length > 0;

  return (
    <div className="space-y-8 w-full">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-border pb-2">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-0">
          I miei appunti
        </h1>
        {/* Search input - full width on mobile, normal width on desktop */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca appunti..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Favorite Notes Section */}
      {!isSearching &&
        hasFavoriteResults &&
        filteredFavoriteNotes.length > 0 && (
          <section className="space-y-4 w-full">
            <div className="flex items-center gap-2 w-full border-b border-muted">
              <h2
                className="md:text-3xl text-2xl font-semibold pb-2"
                style={{ color: subject.color }}
              >
                Appunti Preferiti{" "}
                <span className="text-xl text-muted-foreground">
                  ({filteredFavoriteNotes.length})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFavoriteNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onToggleFavorite={handleToggleFavorite}
                  isLoading={isTogglingFavorite}
                  previewUrl={previewUrls[note.id]}
                />
              ))}
            </div>
          </section>
        )}

      {/* All Notes Section */}
      <section className="space-y-4 w-full">
        <div className="flex items-center gap-2 w-full border-b border-muted">
          <h2 className="md:text-3xl text-2xl font-semibold pb-2 text-foreground">
            Tutti gli appunti{" "}
            <span className="text-xl text-muted-foreground">
              ({filteredAllNotes.length})
            </span>
          </h2>
        </div>

        {hasSearchResults ? (
          <div className="flex flex-col gap-2">
            {filteredAllNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onToggleFavorite={handleToggleFavorite}
                isLoading={isTogglingFavorite}
                previewUrl={previewUrls[note.id]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium mb-1">
              {isSearching
                ? "Nessun appunto trovato"
                : "Nessun appunto disponibile"}
            </p>
            <p className="text-sm">
              {isSearching
                ? "Prova con termini di ricerca diversi"
                : "Gli appunti appariranno qui quando saranno disponibili"}
            </p>
          </div>
        )}
      </section>

      {/* Search state indicator */}
      {searchQuery !== deferredSearchQuery && (
        <div className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm text-muted-foreground">
          Ricerca in corso...
        </div>
      )}
    </div>
  );
}
