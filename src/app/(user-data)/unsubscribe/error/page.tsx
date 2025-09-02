import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Errore Disiscrizione",
  description:
    "Si è verificato un errore durante la disiscrizione dalla newsletter MaturaMente. Riprova o contatta il supporto per assistenza.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnsubscribeError() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-center px-6">
      <div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">Errore</h1>
        <p className="text-gray-700 text-lg">
          Il link per annullare l'iscrizione non è valido o è già stato usato.
        </p>
        <p className="text-gray-500 mt-2 text-sm">
          Se hai bisogno di aiuto, scrivici a support@MaturaMente.it
        </p>
      </div>
    </main>
  );
}
