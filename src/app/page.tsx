import type { Metadata } from "next";
import Landing from "./components/landing/index";
import { 
  WebsiteStructuredData, 
  OrganizationStructuredData,
  EducationalOrganizationStructuredData 
} from "./components/shared/seo/structured-data";

export const metadata: Metadata = {
  title: "MaturaMente",
  description:
    "Benvenuto su MaturaMente, la piattaforma educativa completa per studenti di scuole superiori. Accedi a teoria, esercizi interattivi, simulazioni e AI tutor per tutte le materie scolastiche, dalla prima alla quinta superiore.",
  openGraph: {
    title: "MaturaMente - Preparazione Maturità Matematica Online",
    description:
      "Benvenuto su MaturaMente, la piattaforma educativa completa per studenti di scuole superiori. Teoria, esercizi, simulazioni e AI tutor per tutte le materie.",
    url: "/",
  },
  twitter: {
    title: "MaturaMente - Preparazione Maturità Matematica Online",
    description:
      "Benvenuto su MaturaMente, la piattaforma educativa per studenti di scuole superiori.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
      {/* Structured Data for SEO */}
      <WebsiteStructuredData
        name="MaturaMente"
        url="https://maturamente.it"
        description="La piattaforma educativa completa per studenti di scuole superiori. Teoria, esercizi interattivi, simulazioni e AI tutor per tutte le materie scolastiche, dalla prima alla quinta superiore."
        logo="/opengraph-image.png"
        sameAs={[]}
      />
      <OrganizationStructuredData
        name="MaturaMente"
        url="https://maturamente.it"
        description="Piattaforma educativa completa per studenti di scuole superiori con contenuti per tutte le materie scolastiche."
        logo="/opengraph-image.png"
        contactPoint={{
          email: "maturamente.help@gmail.com",
          contactType: "Customer Service"
        }}
        address={{
          addressCountry: "IT"
        }}
        sameAs={[]}
      />
      <EducationalOrganizationStructuredData
        name="MaturaMente"
        url="https://maturamente.it"
        description="Piattaforma educativa specializzata nel supporto scolastico per studenti di scuole superiori italiane con contenuti per tutte le materie."
        logo="/opengraph-image.png"
        educationalCredentialAwarded="Supporto Scolastico Completo"
        hasCredential={["Matematica", "Fisica", "Scienze", "Italiano", "Storia", "Filosofia", "Inglese", "Chimica", "Biologia"]}
        sameAs={[]}
      />
      <Landing />
    </>
  );
}
