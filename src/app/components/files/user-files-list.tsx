"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, 
  FileText, 
  Calendar, 
  Hash, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  Circle,
  CircleCheck
} from "lucide-react";
import { UploadedFile, ProcessingStatus, FileType } from "@/types/uploadedFilesTypes";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserFilesListProps {
  files: UploadedFile[];
  selectedFiles: string[];
  onFileSelectionChange: (fileSources: string[]) => void;
  onFilesRefresh: () => void;
  onFileDeleted: (fileId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading?: boolean;
}

const getStatusIcon = (status: ProcessingStatus) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case "parsing":
    case "chunking":
    case "embedding":
    case "metadata":
      return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
    case "pending":
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Clock className="h-3 w-3 text-gray-500" />;
  }
};


const getFileTypeColor = (fileType: FileType) => {
  switch (fileType) {
    case "pdf":
      return "bg-red-100 text-red-800";
    case "docx":
      return "bg-blue-100 text-blue-800";
    case "txt":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function UserFilesList({
  files,
  selectedFiles,
  onFileSelectionChange,
  onFilesRefresh,
  onFileDeleted,
  searchTerm,
  onSearchChange,
  isLoading = false
}: UserFilesListProps) {
  const [filteredFiles, setFilteredFiles] = useState<UploadedFile[]>(files);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [showDeleteProgress, setShowDeleteProgress] = useState(false);
  const [deletingFileName, setDeletingFileName] = useState<string>("");

  // Filter files based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFiles(files);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = files.filter(file =>
        file.title.toLowerCase().includes(term) ||
        file.description.toLowerCase().includes(term) ||
        file.file_name.toLowerCase().includes(term)
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchTerm]);

  const handleFileToggle = useCallback((pineconeSource: string) => {
    const isSelected = selectedFiles.includes(pineconeSource);
    if (isSelected) {
      onFileSelectionChange(selectedFiles.filter(s => s !== pineconeSource));
    } else {
      onFileSelectionChange([...selectedFiles, pineconeSource]);
    }
  }, [selectedFiles, onFileSelectionChange]);

  const handleDeleteFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      setDeletingFile(fileId);
      setDeletingFileName(fileName);
      setShowDeleteProgress(true);
      
      // First perform the actual deletion on the server
      const response = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante la cancellazione");
      }

      // Only update UI after successful server deletion
      onFileDeleted(fileId);
      toast.success(`File "${fileName}" eliminato con successo`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Delete error:", error);
      toast.error(`Errore: ${errorMessage}`);
    } finally {
      setDeletingFile(null);
      setShowDeleteProgress(false);
      setDeletingFileName("");
    }
  }, [onFileDeleted]);

  const clearSelection = useCallback(() => {
    onFileSelectionChange([]);
  }, [onFileSelectionChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Caricamento file...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca nei tuoi documenti..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 py-6 rounded-xl"
        />
      </div>

      {/* Files list */}
      <ScrollArea className="h-[400px]">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? "Nessun risultato" : "Nessun documento caricato"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchTerm 
                ? "Prova con termini di ricerca diversi." 
                : "Carica il tuo primo documento per iniziare a usarlo nelle conversazioni."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const isSelected = selectedFiles.includes(file.pinecone_source);
              const isDeleting = deletingFile === file.id;
              
              // Parse title like notes do
              const title = file.title || file.file_name;
              const sep = title.indexOf(" - ");
              const mainTitle = sep !== -1 ? title.slice(0, sep) : title;
              const subTitle = sep !== -1 ? title.slice(sep + 3) : "";
              
              return (
                <div
                  key={file.id}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (file.processing_status === "completed") {
                        handleFileToggle(file.pinecone_source);
                      }
                    }
                  }}
                  onClick={() => {
                    if (file.processing_status === "completed") {
                      handleFileToggle(file.pinecone_source);
                    }
                  }}
                  className="group relative flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg hover:shadow-sm/5 hover:border-primary/30 transition-all duration-200 cursor-pointer"
                  style={
                    {
                      "--subject-color": "hsl(var(--primary))",
                    } as React.CSSProperties
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-4">
                        {isSelected ? (
                          <CircleCheck className="h-6 w-6 flex-shrink-0 text-primary" />
                        ) : (
                          <Circle 
                            className={`h-6 w-6 flex-shrink-0 ${
                              file.processing_status === "completed" 
                                ? "text-primary/70" 
                                : "text-muted-foreground/50"
                            }`} 
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium line-clamp-1">
                            {mainTitle}
                          </div>
                          {subTitle && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {subTitle}
                            </div>
                          )}
                          {!subTitle && file.description && file.description !== file.title && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {file.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(file.upload_timestamp), "dd MMM yyyy", { locale: it })}
                            <span className="text-muted-foreground/60">•</span>
                            <FileText className="h-3 w-3" />
                            {file.n_pages} pagin{file.n_pages !== 1 ? 'e' : 'a'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status indicator and delete button */}
                      <div className="flex items-center gap-2">
                        {file.processing_status !== "completed" && (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(file.processing_status)}
                          </div>
                        )}
                        
                        {/* Delete button */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row selection
                          }}
                        >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Elimina documento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler eliminare "{file.title}"? 
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                                  Annulla
                                </AlertDialogCancel>
                                <Button 
                                  variant="destructive" 
                                  className="text-white" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.id, file.file_name);
                                  }}
                                >
                                  Elimina
                                </Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Delete Progress Dialog */}
      <Dialog open={showDeleteProgress} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">x
              Eliminazione in corso...
            </DialogTitle>
            <DialogDescription>
              Sto eliminando il file "{deletingFileName}".
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Questa operazione potrebbe richiedere alcuni secondi...
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                {/* <Trash2 className="absolute inset-0 m-auto h-5 w-5 text-red-600" /> */}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
