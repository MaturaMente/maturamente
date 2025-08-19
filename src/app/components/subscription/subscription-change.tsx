import { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Calculator,
  AlertTriangle,
  Loader2,
  Info,
  CreditCard,
  Calendar,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { SubjectCard } from "./subject-card";
import type { SubjectUI } from "@/types/subjectsTypes";
import { LoadingOverlay } from "./loading-overlay";

// moved to components/loading-overlay

type Subject = SubjectUI;

interface PlanChangePreview {
  currentPrice: number;
  newPrice: number;
  prorationAmount: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  changeType: "upgrade" | "downgrade" | "no_change";
  effectiveDate: string;
}

interface SubscriptionChangeProps {
  currentSubjects: string[];
  allSubjects: Subject[];
  onChangeComplete: () => void;
  pendingRemovals?: string[]; // Subjects that are pending removal
}

export default function SubscriptionChange({
  currentSubjects,
  allSubjects,
  onChangeComplete,
  pendingRemovals = [],
}: SubscriptionChangeProps) {
  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>(currentSubjects);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [loadingOverlayMessage, setLoadingOverlayMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [nextPeriodStart, setNextPeriodStart] = useState<string | null>(null);

  // Keep local selection in sync with server-provided current subjects.
  // This prevents the auto-preview from treating pending removals as if user re-added them
  // when the props update after async loads.
  useEffect(() => {
    setSelectedSubjects(currentSubjects);
    setPreview(null);
  }, [JSON.stringify(currentSubjects), JSON.stringify(pendingRemovals)]);

  useEffect(() => {
    // Update preview when selection changes
    if (
      selectedSubjects.length !== currentSubjects.length ||
      !selectedSubjects.every((id) => currentSubjects.includes(id))
    ) {
      fetchPreview();
    }
  }, [selectedSubjects, currentSubjects]);

  useEffect(() => {
    // Fetch subscription status to compute next period start date for downgrades
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/user/subscription-status");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.currentPeriodEnd) {
          const dateObj = new Date(data.currentPeriodEnd);
          if (!isNaN(dateObj.getTime())) {
            setNextPeriodStart(
              new Intl.DateTimeFormat("it-IT", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(dateObj)
            );
          }
        }
      } catch (e) {
        // ignore silently
      }
    };
    fetchStatus();
  }, []);

  const fetchPreview = async () => {
    if (
      selectedSubjects.length === currentSubjects.length &&
      selectedSubjects.every((id) => currentSubjects.includes(id))
    ) {
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch("/api/stripe/plan-change-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newSubjectIds: selectedSubjects,
        }),
      });

      if (response.ok) {
        const previewData = await response.json();
        setPreview(previewData);
      } else {
        const error = await response.json();
        toast.error(error.error || "Impossibile recuperare anteprima");
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      toast.error("Impossibile recuperare anteprima modifiche");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    const isCurrentlySubscribed = currentSubjects.includes(subjectId);

    if (checked) {
      // User is trying to add a subject
      if (!isCurrentlySubscribed) {
        // This is a new subject, so this would be an upgrade (adding it)
        // Check if there are any currently subscribed subjects being removed
        const removedCurrentSubjects = currentSubjects.filter(
          (id) => !selectedSubjects.includes(id)
        );

        if (removedCurrentSubjects.length > 0) {
          toast.error(
            "Non puoi aggiungere nuove materie e rimuovere materie già sottoscritte contemporaneamente. Completa prima la rimozione delle materie attuali selezionate."
          );
          return;
        }
      }
      setSelectedSubjects((prev) => [...prev, subjectId]);
    } else {
      // User is trying to remove a subject
      if (isCurrentlySubscribed) {
        // Prevent removing the last remaining currently subscribed subject
        const currentlySelectedCount = selectedSubjects.filter(
          (id) => currentSubjects.includes(id) && id !== subjectId
        ).length;

        if (currentlySelectedCount === 0) {
          toast.error(
            "Non puoi rimuovere l'ultima materia sottoscritta. Devi mantenere almeno una materia nel tuo piano."
          );
          return;
        }

        // This is a currently subscribed subject being removed (downgrade)
        // Check if there are any new subjects being added
        const addedNewSubjects = selectedSubjects.filter(
          (id) => !currentSubjects.includes(id) && id !== subjectId
        );

        if (addedNewSubjects.length > 0) {
          toast.error(
            "Non puoi rimuovere materie già sottoscritte e aggiungere nuove materie contemporaneamente. Completa prima l'aggiunta delle nuove materie selezionate."
          );
          return;
        }
      } else {
        // This is a new subject being removed (not currently subscribed)
        // This should always be allowed
      }
      setSelectedSubjects((prev) => prev.filter((id) => id !== subjectId));
    }
  };

  const handleUndoPendingRemoval = async (subjectId: string) => {
    try {
      setActionLoading(true);
      setLoadingOverlayMessage("Annullamento rimozione in corso...");

      const res = await fetch("/api/stripe/modify-pending-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita");

      toast.success(data.message || "Rimozione annullata");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      console.error(e);
      toast.error("Impossibile annullare la rimozione");
      setActionLoading(false);
      setLoadingOverlayMessage("");
    }
  };

  const handlePlanChange = async () => {
    if (!preview) return;

    setLoading(true);
    setLoadingOverlayMessage(
      preview.isUpgrade
        ? "Aggiornamento piano in corso..."
        : "Modifica piano in corso..."
    );

    try {
      const response = await fetch("/api/stripe/plan-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newSubjectIds: selectedSubjects,
          timing: "immediate", // Always immediate for best UX
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Change applied successfully
        toast.success(result.message || "Abbonamento aggiornato con successo");

        // Show additional info for immediate charges
        if (result.chargedImmediately && result.immediateChargeAmount > 0) {
          setTimeout(() => {
            toast.info(
              `💳 Addebito immediato: €${result.immediateChargeAmount.toFixed(
                2
              )} è stato elaborato`,
              { duration: 5000 }
            );
          }, 1000);
        }

        setConfirmDialogOpen(false);
        onChangeComplete();
      } else {
        toast.error(result.error || "Impossibile aggiornare abbonamento");
        setLoading(false);
        setLoadingOverlayMessage("");
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Impossibile aggiornare abbonamento");
      setLoading(false);
      setLoadingOverlayMessage("");
    }
  };

  const getChangeDescription = () => {
    if (!preview) return null;

    const addedSubjects = selectedSubjects.filter(
      (id) => !currentSubjects.includes(id)
    );
    const removedSubjects = currentSubjects.filter(
      (id) => !selectedSubjects.includes(id)
    );

    if (addedSubjects.length > 0) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Plus className="w-4 h-4" />
          <span className="text-sm">
            Aggiunta {addedSubjects.length} materi
            {addedSubjects.length > 1 ? "e" : "a"}
          </span>
        </div>
      );
    } else if (removedSubjects.length > 0) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <Minus className="w-4 h-4" />
          <span className="text-sm">
            Rimozione {removedSubjects.length} materi
            {removedSubjects.length > 1 ? "e" : "a"}
          </span>
        </div>
      );
    }

    return null;
  };

  const hasChanges =
    selectedSubjects.length !== currentSubjects.length ||
    !selectedSubjects.every((id) => currentSubjects.includes(id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Modifica il Tuo Piano
        </CardTitle>
        <CardDescription>
          Aggiungi o rimuovi materie dal tuo abbonamento. Le modifiche hanno
          effetto immediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning for pending removals */}
        {pendingRemovals.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="font-medium text-red-800 dark:text-red-600">
                    Modifiche in Sospeso
                  </p>
                </div>
                <div className="text-sm text-red-700">
                  Hai modifiche al tuo abbonamento che saranno applicate alla
                  prossima fatturazione. Le materie in sospeso non possono
                  essere modificate fino a quando le modifiche non saranno
                  completate.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subject Selection */}
        <div className="flex flex-col gap-8">
          {/* Current Subjects Section */}
          {(() => {
            const currentUserSubjects = allSubjects
              .filter(
                (subject) =>
                  currentSubjects.includes(subject.id) &&
                  !pendingRemovals.includes(subject.id)
              )
              .sort((a, b) => a.order_index - b.order_index);

            if (currentUserSubjects.length === 0) return null;

            return (
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-primary uppercase tracking-wide">
                  Le Tue Materie
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentUserSubjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      isSelected={selectedSubjects.includes(subject.id)}
                      state="current"
                      onToggle={handleSubjectToggle}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Pending Changes Section */}
          {(() => {
            const pendingSubjects = allSubjects
              .filter((subject) => pendingRemovals.includes(subject.id))
              .sort((a, b) => a.order_index - b.order_index);

            if (pendingSubjects.length === 0) return null;

            return (
              <div className="space-y-3">
                <div className="flex md:flex-row flex-col md:items-center md:justify-between justify-start gap-2">
                  <h5 className="text-xs font-medium text-red-600 uppercase tracking-wide">
                    Modifiche in Sospeso
                  </h5>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Annulla tutte le rimozioni
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Ripristina tutte le materie
                        </AlertDialogTitle>
                      </AlertDialogHeader>
                      <div className="text-sm text-muted-foreground">
                        Questa azione annullerà tutte le rimozioni programmate.
                        L’abbonamento verrà aggiornato ora e potrebbero esserci
                        addebiti proporzionali.
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                          className="text-white"
                          onClick={async () => {
                            try {
                              setActionLoading(true);
                              setLoadingOverlayMessage(
                                "Ripristino materie in corso..."
                              );
                              const restoreSubjectIds = pendingSubjects.map(
                                (s) => s.id
                              );
                              const res = await fetch(
                                "/api/stripe/modify-pending-change",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ restoreSubjectIds }),
                                }
                              );
                              const data = await res.json();
                              if (!res.ok)
                                throw new Error(
                                  data.error || "Operazione non riuscita"
                                );
                              toast.success(
                                "Tutte le rimozioni sono state annullate"
                              );
                              setTimeout(() => {
                                window.location.reload();
                              }, 1200);
                            } catch (err) {
                              console.error(err);
                              toast.error(
                                "Impossibile annullare tutte le rimozioni"
                              );
                              setActionLoading(false);
                              setLoadingOverlayMessage("");
                            }
                          }}
                        >
                          Continua
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingSubjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      isSelected
                      state="pending-removal"
                      disabled
                      onUndoPendingRemoval={handleUndoPendingRemoval}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Available Subjects Section */}
          {(() => {
            const availableSubjects = allSubjects
              .filter(
                (subject) =>
                  !currentSubjects.includes(subject.id) &&
                  !pendingRemovals.includes(subject.id)
              )
              .sort((a, b) => a.order_index - b.order_index);

            if (availableSubjects.length === 0) return null;

            return (
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Altre Materie Disponibili
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSubjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      isSelected={selectedSubjects.includes(subject.id)}
                      state="available"
                      onToggle={handleSubjectToggle}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Change Preview */}
        {hasChanges && (
          <Card className="border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5" />
                Anteprima Modifiche
                {previewLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              {getChangeDescription()}
            </CardHeader>

            {preview && !previewLoading && (
              <CardContent className="space-y-6">
                {/* Price Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="text-sm text-muted-foreground mb-1">
                      Piano Attuale
                    </div>
                    <div className="text-2xl font-bold">
                      €{preview.currentPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">/mese</div>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">
                      Nuovo Piano
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      €{preview.newPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">/mese</div>
                  </div>
                </div>

                {/* Proration Amount */}
                {preview.prorationAmount !== 0 && (
                  <div className="rounded-lg p-4 border-2 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <div className="flex md:items-center items-start justify-between md:flex-row flex-col gap-2 md:gap-0">
                      <div>
                        <div className="font-medium text-green-800 dark:text-green-500">
                          {preview.isUpgrade
                            ? "Addebito Immediato"
                            : "Credito Applicato"}
                        </div>
                        <div className="text-sm text-green-600">
                          {preview.isUpgrade
                            ? "Per il periodo rimanente di questo mese"
                            : "Applicato alla prossima fattura"}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {preview.isUpgrade ? "+" : "-"} €
                        {Math.abs(preview.prorationAmount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Materie selezionate:
                    </span>
                    <span className="font-medium">
                      {selectedSubjects.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Effettivo da:
                    </span>
                    <span className="font-medium">
                      {preview.isUpgrade
                        ? "Immediatamente"
                        : nextPeriodStart || "Prossimo mese"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-500/5 p-3 rounded-lg border border-blue-500/20 text-blue-500">
                  <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  <span className="text-blue-500">
                    {preview.isUpgrade
                      ? "Le modifiche saranno applicate immediatamente e verrai addebitato per il periodo rimanente."
                      : "Le modifiche saranno applicate il prossimo mese e avrai accesso alla materia fino alla fine del periodo attuale."}
                  </span>
                </div>
              </CardContent>
            )}

            {hasChanges && selectedSubjects.length === 0 && (
              <CardContent>
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Devi selezionare almeno una materia.</span>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        {hasChanges && selectedSubjects.length > 0 && (
          <div className="flex gap-3">
            <Button
              onClick={() => setSelectedSubjects(currentSubjects)}
              variant="outline"
              className="flex-1"
            >
              Ripristina
            </Button>

            <AlertDialog
              open={confirmDialogOpen}
              onOpenChange={setConfirmDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  className="flex-1 text-white"
                  disabled={!preview || previewLoading}
                >
                  {preview?.isUpgrade
                    ? "Aggiorna e Addebita Ora"
                    : "Passa a un piano inferiore"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {preview?.isUpgrade ? (
                      <>
                        <CreditCard className="w-5 h-5 text-green-600" />
                        Conferma Aggiornamento
                      </>
                    ) : (
                      <>
                        <Minus className="w-5 h-5 text-orange-600" />
                        Conferma Modifica
                      </>
                    )}
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="space-y-4">
                  {/* Change Summary */}
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      {preview?.isUpgrade ? (
                        <Plus className="w-4 h-4 text-green-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-orange-600" />
                      )}
                      <span className="font-medium">
                        {preview?.isUpgrade
                          ? "Passa a un piano superiore"
                          : "Passa a un piano inferiore"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Prezzo attuale:</span>
                        <span>€{preview?.currentPrice.toFixed(2)}/mese</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nuovo prezzo:</span>
                        <span className="font-medium">
                          €{preview?.newPrice.toFixed(2)}/mese
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Materie selezionate:</span>
                        <span className="font-medium">
                          {selectedSubjects.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Action Info */}
                  {preview?.isUpgrade ? (
                    <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-medium text-green-800 dark:text-green-500">
                            Addebito Immediato
                          </div>
                          <div className="text-sm text-green-600">
                            Verrai addebitato di €
                            {Math.abs(preview?.prorationAmount || 0).toFixed(2)}{" "}
                            per il periodo di fatturazione rimanente.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                      <div className="flex flex-col items-start gap-2">
                        <div className="space-y-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <div className="font-medium text-blue-400">
                            Acesso alla materia
                          </div>
                        </div>
                        <div className="text-sm text-blue-500">
                          Avrai comunque accesso alla materia fino alla fine del
                          periodo attuale per nessun costo aggiuntivo.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePlanChange}
                    disabled={loading}
                    className="cursor-pointer text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Elaborazione...
                      </>
                    ) : preview?.isUpgrade ? (
                      "Conferma e Addebita Ora"
                    ) : (
                      "Conferma Modifica"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={!!loadingOverlayMessage}
        message={loadingOverlayMessage}
      />
    </Card>
  );
}
