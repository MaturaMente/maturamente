import { auth } from "@/lib/auth";
import { getSubjectNotes } from "@/utils/notes-data";
import { NotesGridClient } from "./notes-grid";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { connection } from "next/server";

interface NotesDataServerProps {
  subjectSlug: string;
}

export async function NotesDataServer({ subjectSlug }: NotesDataServerProps) {
  try {
    await connection();
    const session = await auth();

    if (!session?.user?.id) {
      return (
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Devi essere autenticato per visualizzare gli appunti
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const notesData = await getSubjectNotes(subjectSlug, session.user.id);

    return (
      <NotesGridClient
        allNotes={notesData.allNotes}
        favoriteNotes={notesData.favoriteNotes}
        subject={notesData.subject}
      />
    );
  } catch (error) {
    console.error("Error in NotesDataServer:", error);

    return (
      <Card className="border-destructive/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
            <p className="text-sm font-medium mb-1">
              Errore nel caricamento degli appunti
            </p>
            <p className="text-xs text-muted-foreground">
              Si è verificato un problema nel recupero dei dati. Riprova più
              tardi.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
}
