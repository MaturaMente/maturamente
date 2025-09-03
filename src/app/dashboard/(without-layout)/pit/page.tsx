import type { Metadata } from "next";
import DashboardChat from "@/app/components/chat/dashboard-chat";

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

export default function AiTutorPage() {
  return <DashboardChat />;
}
