import type { Metadata } from "next";
import Landing from "./components/landing/index";
import {
  WebsiteStructuredData,
  OrganizationStructuredData,
  EducationalOrganizationStructuredData,
} from "./components/shared/seo/structured-data";

export const metadata: Metadata = {
  title:
    "MaturaMente - Lo strumento più avanzato per la tua preparazione liceale",
  description:
    "MaturaMente è lo strumento più avanzato per accompagnarti durante tutto il liceo. Con AI tutor personalizzato, teoria strutturata, esercizi interattivi e simulazioni per tutte le materie, trasformiamo il tuo modo di studiare rendendolo più efficace e coinvolgente.",
  openGraph: {
    title:
      "MaturaMente - Lo strumento più avanzato per la tua preparazione liceale",
    description:
      "Lo strumento più avanzato per la tua preparazione liceale. Con AI tutor personalizzato, teoria, esercizi e simulazioni per tutte le materie, trasformiamo il tuo modo di studiare.",
    url: "/",
  },
  twitter: {
    title:
      "MaturaMente - Lo strumento più avanzato per la tua preparazione liceale",
    description:
      "Lo strumento più avanzato per la tua preparazione liceale con AI tutor personalizzato. Studio intelligente e risultati eccellenti.",
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
        description="Lo strumento più avanzato per la preparazione liceale con AI che accompagna gli studenti italiani durante tutto il percorso scolastico. Offre apprendimento personalizzato, teoria strutturata, esercizi interattivi e simulazioni per tutte le materie."
        logo="/opengraph-image.png"
        sameAs={[]}
      />
      <OrganizationStructuredData
        name="MaturaMente"
        url="https://maturamente.it"
        description="Lo strumento educativo più avanzato che utilizza l'intelligenza artificiale per supportare gli studenti del liceo durante tutto il loro percorso scolastico con apprendimento personalizzato e intelligente."
        logo="/opengraph-image.png"
        contactPoint={{
          email: "maturamente.help@gmail.com",
          contactType: "Customer Service",
        }}
        address={{
          addressCountry: "IT",
        }}
        sameAs={[]}
      />
      <EducationalOrganizationStructuredData
        name="MaturaMente"
        url="https://maturamente.it"
        description="Lo strumento educativo più innovativo con AI tutor che offre un'esperienza di apprendimento personalizzata per studenti del liceo, coprendo l'intero percorso scolastico e la preparazione alla Maturità."
        logo="/opengraph-image.png"
        educationalCredentialAwarded="Supporto Scolastico Personalizzato con AI"
        hasCredential={[
          "Matematica",
          "Fisica",
          "Scienze",
          "Italiano",
          "Storia",
          "Filosofia",
          "Inglese",
          "Chimica",
          "Biologia",
        ]}
        sameAs={[]}
      />
      <Landing />
    </>
  );
}
