import type { Metadata } from "next";
import { PricingPage } from "../../components/pricing/pricing-page";
import { db } from "@/db/drizzle";
import { subjectsTable, notesTable } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import DashboardFooter from "../../components/shared/navigation/footer";

export const metadata: Metadata = {
  title: "Prezzi e Piani",
  description:
    "Scopri i piani di abbonamento di MaturaMente per il supporto scolastico completo. Scegli tra diverse opzioni e accedi a teoria, esercizi, simulazioni e AI tutor per tutte le materie di scuole superiori.",
  keywords: [
    "prezzi MaturaMente",
    "abbonamento scuole superiori",
    "piano di studio",
    "supporto scolastico",
    "abbonamento studenti",
    "prezzi piattaforma educativa",
    "piano premium",
    "accesso completo materie",
    "aiuto compiti",
    "tutor AI",
  ],
  openGraph: {
    title: "Prezzi e Piani | MaturaMente",
    description:
      "Scegli il piano di abbonamento più adatto per il tuo percorso di studi. Accesso completo a teoria, esercizi, simulazioni e AI tutor per tutte le materie di scuole superiori.",
    url: "/pricing",
    type: "website",
  },
  twitter: {
    title: "Prezzi e Piani | MaturaMente",
    description:
      "Scopri i piani di abbonamento per il supporto completo in tutte le materie di scuole superiori.",
  },
  alternates: {
    canonical: "/pricing",
  },
};

export default async function PricingPageRoute() {
  // Fetch available subjects
  const subjects = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      description: subjectsTable.description,
      slug: subjectsTable.slug,
      color: subjectsTable.color,
      maturita: subjectsTable.maturita,
      notes_count: count(notesTable.id),
    })
    .from(subjectsTable)
    .leftJoin(notesTable, eq(subjectsTable.id, notesTable.subject_id))
    .groupBy(
      subjectsTable.id,
      subjectsTable.name,
      subjectsTable.description,
      subjectsTable.slug,
      subjectsTable.color,
      subjectsTable.maturita
    )
    .orderBy(subjectsTable.order_index);

  return (
    <>
      <PricingPage subjects={subjects} />
      <DashboardFooter />
    </>
  );
}
