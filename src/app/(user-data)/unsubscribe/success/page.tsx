import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disiscrizione Completata",
  description:
    "Disiscrizione dalla newsletter completata con successo. La tua email è stata rimossa dalla lista di distribuzione delle comunicazioni MaturaMate.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnsubscribeSuccess() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-center px-6">
      <div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Iscrizione annullata
        </h1>
        <p className="text-gray-700 text-lg">
          Hai annullato con successo l'iscrizione dalla lista d'attesa. Ci
          dispiace vederti andare via!
        </p>
      </div>
    </main>
  );
}
