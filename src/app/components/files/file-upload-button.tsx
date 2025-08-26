"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { FileUploadProgress, FileProcessingResult, UploadedFile } from "@/types/uploadedFilesTypes";
import { toast } from "sonner";

interface FileUploadButtonProps {
  onUploadStart?: (file: UploadedFile) => void;
  onUploadSuccess?: (file: any) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

const SUPPORTED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/markdown": ".md"
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileUploadButton({
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  disabled = false,
  className = ""
}: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(null);
    setError(null);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return "Tipo di file non supportato. Sono supportati: PDF, DOCX, TXT, MD";
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return "Il file è troppo grande. Dimensione massima: 50MB";
    }

    return null;
  }, []);

  const pollFileProgress = useCallback(async (fileId: string): Promise<void> => {
    console.log(`🔄 Starting to poll file progress for ID: ${fileId}`);
    
    const statusToProgress: Record<string, number> = {
      "pending": 15,
      "parsing": 25,
      "chunking": 40,
      "embedding": 70,
      "metadata": 90,
      "completed": 100,
      "failed": 0
    };

    const statusToStage: Record<string, FileUploadProgress["stage"]> = {
      "pending": "uploading",
      "parsing": "parsing",
      "chunking": "chunking", 
      "embedding": "embedding",
      "metadata": "metadata",
      "completed": "completed",
      "failed": "failed"
    };

    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 1000ms = 60 seconds max
    
    while (attempts < maxAttempts) {
      try {
        console.log(`📡 Polling attempt ${attempts + 1}: /api/files/status?id=${fileId}`);
        
        const response = await fetch(`/api/files/status?id=${fileId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch file status: ${response.status}`);
        }

        const statusData = await response.json();
        console.log(`📊 Status response:`, statusData);
        
        if (!statusData.success || !statusData.file) {
          throw new Error("Invalid status response");
        }

        const { processing_status } = statusData.file;
        const progress = statusToProgress[processing_status] || 0;
        const stage = statusToStage[processing_status] || "uploading";

        console.log(`📈 Status: ${processing_status} → Progress: ${progress}% → Stage: ${stage}`);

        setUploadProgress({
          stage,
          message: getStageMessage(stage),
          progress
        });

        // If completed or failed, stop polling
        if (processing_status === "completed") {
          console.log(`✅ File processing completed after ${attempts + 1} attempts`);
          break;
        }
        if (processing_status === "failed") {
          console.log(`❌ File processing failed after ${attempts + 1} attempts`);
          throw new Error("File processing failed");
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

      } catch (error) {
        console.error(`❌ Error polling file status (attempt ${attempts + 1}):`, error);
        // If polling fails, throw error to be handled by uploadFile
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      console.log(`⏰ File processing timed out after ${maxAttempts} attempts`);
      throw new Error("File processing timed out");
    }
  }, []);

  const getStageMessage = (stage: FileUploadProgress["stage"]): string => {
    switch (stage) {
      case "uploading":
        return "Caricamento file in corso...";
      case "parsing":
        return "Analisi del documento...";
      case "chunking":
        return "Segmentazione del testo...";
      case "embedding":
        return "Creazione degli embeddings...";
      case "metadata":
        return "Generazione metadati con IA...";
      case "completed":
        return "Caricamento completato!";
      case "failed":
        return "Errore durante il caricamento";
      default:
        return "In elaborazione...";
    }
  };

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    try {
      setIsUploading(true);
      setError(null);

      // Stage 1: Upload
      setUploadProgress({
        stage: "uploading",
        message: getStageMessage("uploading"),
        progress: 0
      });

      const formData = new FormData();
      formData.append("file", file);

      // Start the actual upload request
      const uploadPromise = fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const response = await uploadPromise;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante il caricamento");
      }

      const result: FileProcessingResult = await response.json();
      console.log(`📦 Upload API response:`, result);

      if (!result.success) {
        throw new Error(result.error || "Errore durante il caricamento");
      }

      if (!result.fileId) {
        console.error(`❌ No fileId in response:`, result);
        throw new Error("No file ID returned from server");
      }

      // Call onUploadStart with the initial file so it appears in the list immediately
      if (result.file && onUploadStart) {
        console.log(`📝 Calling onUploadStart with initial file:`, result.file);
        onUploadStart(result.file);
      }

      console.log(`🎯 Starting polling for fileId: ${result.fileId}`);
      
      // Start polling for real progress updates
      await pollFileProgress(result.fileId);

      // Fetch the final completed file with updated metadata
      console.log(`🔄 Fetching final file state for ID: ${result.fileId}`);
      const finalResponse = await fetch(`/api/files/status?id=${result.fileId}`);
      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        if (finalData.success && finalData.file) {
          const completedFile = {
            ...finalData.file,
            upload_timestamp: new Date(finalData.file.upload_timestamp)
          };
          
          console.log(`✅ Final file metadata:`, {
            title: completedFile.title,
            description: completedFile.description,
            status: completedFile.processing_status
          });

          setUploadProgress({
            stage: "completed",
            message: getStageMessage("completed"),
            progress: 100
          });

          toast.success(`File "${file.name}" caricato con successo!`);
          onUploadSuccess?.(completedFile);

          // Reset after a short delay
          setTimeout(resetState, 2000);
        } else {
          throw new Error("Could not fetch final file state");
        }
      } else {
        throw new Error("Could not fetch final file state");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Upload error:", error);
      
      setUploadProgress({
        stage: "failed",
        message: errorMessage,
        progress: 0
      });
      
      setError(errorMessage);
      onUploadError?.(errorMessage);
      toast.error(`Errore: ${errorMessage}`);

      // Reset error after delay
      setTimeout(resetState, 5000);
    }
  }, [onUploadStart, onUploadSuccess, onUploadError, resetState, pollFileProgress]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    await uploadFile(file);
  }, [validateFile, uploadFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const renderProgressContent = () => {
    if (!uploadProgress) return null;

    const isCompleted = uploadProgress.stage === "completed";
    const isFailed = uploadProgress.stage === "failed";

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : isFailed ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          <span className="text-sm font-medium">{uploadProgress.message}</span>
        </div>
        
        {uploadProgress.progress !== undefined && !isFailed && (
          <Progress value={uploadProgress.progress} className="h-2" />
        )}
      </div>
    );
  };

  if (isUploading || uploadProgress) {
    return (
      <div className="w-full p-4 rounded-lg">
        {renderProgressContent()}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Input
        ref={fileInputRef}
        type="file"
        accept={Object.values(SUPPORTED_TYPES).join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      <Button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="w-full"
        variant="outline"
      >
        <Upload className="h-4 w-4 mr-2" />
        Carica Documento
      </Button>
      
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <div>Formati supportati: PDF, DOCX, TXT, MD</div>
        <div>Dimensione massima: 50MB</div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
