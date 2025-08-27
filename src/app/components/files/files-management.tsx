"use client";

import { useState, useCallback, useEffect } from "react";
import { UploadedFile } from "@/types/uploadedFilesTypes";
import FileUploadButton from "./file-upload-button";
import UserFilesList from "./user-files-list";
import { toast } from "sonner";

interface FilesManagementProps {
  selectedFileSources: string[];
  onFileSelectionChange: (fileSources: string[]) => void;
  className?: string;
}

export default function FilesManagement({
  selectedFileSources,
  onFileSelectionChange,
  className = ""
}: FilesManagementProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const url = searchTerm.trim() 
        ? `/api/files/list?search=${encodeURIComponent(searchTerm)}`
        : "/api/files/list";
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Errore durante il caricamento dei file");
      }
      
      const data = await response.json();
      
      if (data.success && data.files) {
        setFiles(data.files);
      } else {
        throw new Error(data.error || "Errore sconosciuto");
      }
      
    } catch (error) {
      console.error("Error fetching files:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(errorMessage);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  // Initial load
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadSuccess = useCallback((uploadedFile: UploadedFile) => {
    console.log(`📁 Upload success - File:`, {
      id: uploadedFile.id,
      title: uploadedFile.title,
      status: uploadedFile.processing_status
    });

    setFiles(prev => {
      // Check if this file already exists (from initial creation)
      const existingIndex = prev.findIndex(f => f.id === uploadedFile.id);
      
      if (existingIndex >= 0) {
        // Update the existing file with the completed metadata
        console.log(`🔄 Updating existing file at index ${existingIndex}`);
        const updated = [...prev];
        updated[existingIndex] = uploadedFile;
        return updated;
      } else {
        // Add as new file (shouldn't happen with our current flow, but keeping as fallback)
        console.log(`➕ Adding new file to list`);
        return [uploadedFile, ...prev];
      }
    });
    
    // Auto-select the file if it's completed
    if (uploadedFile.processing_status === "completed") {
      console.log(`✅ Auto-selecting completed file: ${uploadedFile.pinecone_source}`);
      onFileSelectionChange([...selectedFileSources, uploadedFile.pinecone_source]);
    }
  }, [selectedFileSources, onFileSelectionChange]);

  const handleUploadStart = useCallback((initialFile: UploadedFile) => {
    // Add the initial file to the list immediately so user sees it
    console.log(`🚀 Upload started - Adding initial file:`, {
      id: initialFile.id,
      title: initialFile.title,
      status: initialFile.processing_status
    });
    
    setFiles(prev => [initialFile, ...prev]);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    // Error is already handled by the upload component
    console.error("Upload error:", error);
  }, []);

  const handleFileDeleted = useCallback((fileId: string) => {
    // Immediately remove the file from local state for instant UI update
    setFiles(prev => prev.filter(file => file.id !== fileId));
    
    // Also remove from selections if it was selected
    const deletedFile = files.find(f => f.id === fileId);
    if (deletedFile && selectedFileSources.includes(deletedFile.pinecone_source)) {
      onFileSelectionChange(selectedFileSources.filter(s => s !== deletedFile.pinecone_source));
    }
  }, [files, selectedFileSources, onFileSelectionChange]);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleCleanup = useCallback(async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch("/api/files/cleanup", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante la pulizia");
      }

      toast.success("Tutti i documenti sono stati eliminati dall'indice Pinecone");
      
      // Clear selections since everything was deleted
      onFileSelectionChange([]);
      
      // Optionally refresh the files list
      await fetchFiles();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Cleanup error:", error);
      toast.error(`Errore durante la pulizia: ${errorMessage}`);
    } finally {
      setIsCleaningUp(false);
    }
  }, [onFileSelectionChange, fetchFiles]);

  return (
    <div className={`space-y-4 flex-1 flex flex-col overflow-hidden ${className}`}>
      {/* Files list */}
      <UserFilesList
        files={files}
        selectedFiles={selectedFileSources}
        onFileSelectionChange={onFileSelectionChange}
        onFilesRefresh={fetchFiles}
        onFileDeleted={handleFileDeleted}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        isLoading={isLoading}
      />

      {/* Upload section */}
      <div className="p-4 border border-dashed border-muted-foreground/50 rounded-lg bg-muted-foreground/10">
        <FileUploadButton
          onUploadStart={handleUploadStart}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      </div>
    </div>
  );
}
