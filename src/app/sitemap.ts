import { MetadataRoute } from "next";
import { db } from "@/db/drizzle";
import {
  subjectsTable,
  notesTable,
  simulationsCardsTable,
  simulationsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

const baseUrl = "https://maturamente.it";

interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Static routes
    const staticRoutes: SitemapEntry[] = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${baseUrl}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.3,
      },
      {
        url: `${baseUrl}/terms-and-conditions`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.3,
      },
      {
        url: `${baseUrl}/dashboard`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.7,
      },
      {
        url: `${baseUrl}/dashboard/le-mie-materie`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      },
      {
        url: `${baseUrl}/dashboard/settings`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.4,
      },
    ];

    // Fetch dynamic content in parallel
    const [subjects, notes, simulationCards, simulations] = await Promise.all([
      fetchSubjects(),
      fetchNotes(),
      fetchSimulationCards(),
      fetchSimulations(),
    ]);

    // Generate dynamic routes
    const dynamicRoutes: SitemapEntry[] = [
      ...generateSubjectRoutes(subjects),
      ...generateNoteRoutes(notes),
      ...generateSimulationRoutes(simulationCards, simulations),
    ];

    return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return basic static routes if there's an error
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
    ];
  }
}

async function fetchSubjects() {
  try {
    return await db
      .select({
        slug: subjectsTable.slug,
        created_at: subjectsTable.created_at,
        maturita: subjectsTable.maturita,
      })
      .from(subjectsTable)
      .orderBy(subjectsTable.order_index);
  } catch (error) {
    console.error("Error fetching subjects for sitemap:", error);
    return [];
  }
}

async function fetchNotes() {
  try {
    return await db
      .select({
        note_slug: notesTable.slug,
        note_created_at: notesTable.created_at,
        subject_slug: subjectsTable.slug,
      })
      .from(notesTable)
      .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
      .orderBy(notesTable.created_at);
  } catch (error) {
    console.error("Error fetching notes for sitemap:", error);
    return [];
  }
}

async function fetchSimulationCards() {
  try {
    return await db
      .select({
        card_slug: simulationsCardsTable.slug,
        card_created_at: simulationsCardsTable.created_at,
        subject_slug: subjectsTable.slug,
      })
      .from(simulationsCardsTable)
      .innerJoin(subjectsTable, eq(simulationsCardsTable.subject_id, subjectsTable.id))
      .orderBy(simulationsCardsTable.created_at);
  } catch (error) {
    console.error("Error fetching simulation cards for sitemap:", error);
    return [];
  }
}

async function fetchSimulations() {
  try {
    return await db
      .select({
        simulation_slug: simulationsTable.slug,
        simulation_created_at: simulationsTable.created_at,
        card_slug: simulationsCardsTable.slug,
        subject_slug: subjectsTable.slug,
      })
      .from(simulationsTable)
      .innerJoin(simulationsCardsTable, eq(simulationsTable.card_id, simulationsCardsTable.id))
      .innerJoin(subjectsTable, eq(simulationsCardsTable.subject_id, subjectsTable.id))
      .orderBy(simulationsTable.created_at);
  } catch (error) {
    console.error("Error fetching simulations for sitemap:", error);
    return [];
  }
}

function generateSubjectRoutes(subjects: any[]): SitemapEntry[] {
  const routes: SitemapEntry[] = [];

  subjects.forEach((subject) => {
    // Main subject page (notes)
    routes.push({
      url: `${baseUrl}/${subject.slug}`,
      lastModified: subject.created_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    // Subject statistics page
    routes.push({
      url: `${baseUrl}/${subject.slug}/statistiche`,
      lastModified: subject.created_at,
      changeFrequency: "daily",
      priority: 0.6,
    });

    // If subject supports maturità content
    if (subject.maturita) {
      // Subject teoria pages
      routes.push({
        url: `${baseUrl}/${subject.slug}/teoria`,
        lastModified: subject.created_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });

      // Subject esercizi pages
      routes.push({
        url: `${baseUrl}/${subject.slug}/esercizi`,
        lastModified: subject.created_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });

      // Subject simulazioni pages
      routes.push({
        url: `${baseUrl}/${subject.slug}/simulazioni`,
        lastModified: subject.created_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    // Subject Pit page
    routes.push({
      url: `${baseUrl}/${subject.slug}/pit`,
      lastModified: subject.created_at,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  });

  return routes;
}

function generateNoteRoutes(notes: any[]): SitemapEntry[] {
  return notes.map((note) => ({
    url: `${baseUrl}/${note.subject_slug}/${note.note_slug}`,
    lastModified: note.note_created_at,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
}

function generateSimulationRoutes(
  simulationCards: any[],
  simulations: any[]
): SitemapEntry[] {
  const routes: SitemapEntry[] = [];

  // Add simulation card routes
  simulationCards.forEach((card) => {
    routes.push({
      url: `${baseUrl}/${card.subject_slug}/simulazioni/${card.card_slug}`,
      lastModified: card.card_created_at,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  // Add individual simulation routes
  simulations.forEach((simulation) => {
    routes.push({
      url: `${baseUrl}/${simulation.subject_slug}/simulazioni/${simulation.card_slug}/${simulation.simulation_slug}`,
      lastModified: simulation.simulation_created_at,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  });

  return routes;
}
