import type { Metadata } from "next";
import DashboardChat from "@/app/components/chat/dashboard-chat";
import { isAuthenticated } from "@/utils/user-context";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";

export const metadata: Metadata = {
  title: "Pit - Tutor AI",
  description:
    "Chatta con Pit, il tutor AI di MaturaMente. Ricevi aiuto personalizzato per tutte le materie scolastiche, dai compiti quotidiani alla preparazione per verifiche e interrogazioni.",
  keywords: [
    "tutor AI",
    "chat AI educativo",
    "aiuto compiti",
    "supporto scolastico",
    "intelligenza artificiale",
    "spiegazioni personalizzate",
    "studio assistito",
    "MaturaMente",
  ],
  openGraph: {
    title: "Pit - Tutor AI | MaturaMente",
    description:
      "Chatta con Pit, il tutor AI di MaturaMente per ricevere aiuto personalizzato in tutte le materie scolastiche.",
    url: "/dashboard/pit",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Pit - Tutor AI | MaturaMente",
      },
    ],
  },
  twitter: {
    title: "Pit - Tutor AI | MaturaMente",
    description:
      "Chatta con Pit, il tutor AI per ricevere aiuto personalizzato in tutte le materie scolastiche.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/dashboard/pit",
  },
  other: {
    "ai:type": "universal_educational_tutor",
    "ai:scope": "all_subjects",
  },
};

export default async function AiTutorPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return (
      <div className="relative h-full">
        <UnauthenticatedOverlay
          title="Chatta con Pit - Tutor AI"
          description="Accedi per utilizzare Pit, il tutor AI che ti aiuta con tutte le materie scolastiche"
          features={[
            "Spiegazioni personalizzate",
            "Aiuto con i compiti",
            "Supporto per tutte le materie",
            "Disponibile 24/7",
          ]}
        >
          <DashboardChat />
        </UnauthenticatedOverlay>
      </div>
    );
  }

  return <DashboardChat />;
}
