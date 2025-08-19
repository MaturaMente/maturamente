"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
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
import { toast } from "sonner";
import SubscriptionChange from "@/app/components/subscription/subscription-change";

// Loading Overlay Component
const LoadingOverlay = ({
  isVisible,
  message,
}: {
  isVisible: boolean;
  message: string;
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Elaborazione in corso</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SubscriptionData {
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  willCancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string | null;
  subjectCount: number; // Updated field name
  price: number; // Direct price instead of plan object
}

interface PendingSubscriptionChange {
  id: string;
  change_type: string;
  timing: string;
  new_subject_ids: string[];
  new_subject_count: number;
  new_price: string;
  scheduled_date: string | null;
  created_at: string;
}

interface UserSubjectAccess {
  hasAccess: boolean;
  subjectsCount: number;
  maxSubjects: number;
  availableSlots: number;
  selectedSubjects: string[];
}

interface Subject {
  id: string;
  name: string;
  description: string;
  order_index: number;
  color: string;
  maturita?: boolean;
  slug: string;
}

interface SubscriptionManagementProps {
  userId: string;
}

export default function SubscriptionManagement({
  userId,
}: SubscriptionManagementProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userAccess, setUserAccess] = useState<UserSubjectAccess | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    PendingSubscriptionChange[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingOverlayMessage, setLoadingOverlayMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchSubscriptionData();
    fetchSubjects();
    fetchUserAccess();
    fetchPendingChanges();
  }, [userId]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch("/api/user/subscription-status");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchUserAccess = async () => {
    try {
      const response = await fetch("/api/user/subject-access");
      if (response.ok) {
        const data = await response.json();
        setUserAccess(data);
      }
    } catch (error) {
      console.error("Error fetching user access:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingChanges = async () => {
    try {
      const response = await fetch("/api/user/pending-subscription-changes");
      if (response.ok) {
        const data = await response.json();
        setPendingChanges(data.pendingChanges || []);
      }
    } catch (error) {
      console.error("Error fetching pending changes:", error);
    }
  };

  const openBillingPortal = async () => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Impossibile creare sessione portale fatturazione");
      }

      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast.error("Impossibile aprire il portale fatturazione");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "N/A";
    }

    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (subscription.isActive && !subscription.willCancelAtPeriodEnd) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="text-sm text-white">Attivo</span>
        </Badge>
      );
    }
    if (subscription.isActive && subscription.willCancelAtPeriodEnd) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          <Clock className="w-3 h-3 mr-1" />
          In Cancellazione
        </Badge>
      );
    }
    if (subscription.isPastDue) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Scaduto
        </Badge>
      );
    }
    if (subscription.isCanceled) {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Cancellato
        </Badge>
      );
    }
    return <Badge variant="outline">Sconosciuto</Badge>;
  };

  // Get subjects that will be removed in pending changes
  const getSubjectsToBeRemoved = () => {
    if (!userAccess || !pendingChanges.length) return [];

    const subjectsToRemove: string[] = [];

    pendingChanges.forEach((change) => {
      if (change.change_type === "downgrade") {
        // Find subjects that are currently selected but not in the new plan
        const removedSubjects = userAccess.selectedSubjects.filter(
          (subjectId) => !change.new_subject_ids.includes(subjectId)
        );
        subjectsToRemove.push(...removedSubjects);
      }
    });

    return subjectsToRemove;
  };

  const getActiveSubjects = () => {
    if (!userAccess) return [];
    const subjectsToRemove = getSubjectsToBeRemoved();
    return userAccess.selectedSubjects.filter(
      (subjectId) => !subjectsToRemove.includes(subjectId)
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Gestione Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Gestione Abbonamento
          </CardTitle>
          <CardDescription>
            Non hai un abbonamento attivo. Abbonati per accedere alle
            funzionalità premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => router.push("/pricing")}
            className="text-white"
          >
            Iscriviti subito
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Stato Abbonamento
            </span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Il tuo piano di abbonamento e gestione fatturazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Prezzo</p>
              <p className="font-medium text-lg">
                €{subscription.price.toFixed(2)}/mese
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Materie</p>
              <p className="font-medium text-lg">
                {subscription.subjectCount} materie
                {getSubjectsToBeRemoved().length > 0 && (
                  <span className="text-red-500">
                    {" - "}({getSubjectsToBeRemoved().length} in rimozione)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {subscription.willCancelAtPeriodEnd
                  ? "Cancellazione il"
                  : "Prossima fatturazione"}
              </p>
              <p className="font-medium text-lg">
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <Button
              onClick={openBillingPortal}
              disabled={actionLoading}
              className="w-full gap-2 cursor-pointer"
              variant="outline"
            >
              <ExternalLink className="w-4 h-4" />
              {actionLoading ? "Apertura..." : "Apri Portale Fatturazione"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Gestisci metodi di pagamento, fatture e cronologia
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes Section */}
      {/* Pending changes are now managed inline within subject cards (Annulla Rimozione) */}

      {/* Subscription Change Section */}
      {subscription.isActive &&
        !subscription.willCancelAtPeriodEnd &&
        userAccess &&
        subjects.length > 0 && (
          <SubscriptionChange
            currentSubjects={getActiveSubjects()}
            allSubjects={subjects}
            pendingRemovals={getSubjectsToBeRemoved()}
            onChangeComplete={() => {
              // Show success message and auto-refresh
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }}
          />
        )}

      {/* Subscription Actions moved to Danger Zone in settings-layout */}

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={!!loadingOverlayMessage}
        message={loadingOverlayMessage}
      />
    </div>
  );
}
