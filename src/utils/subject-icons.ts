import type { LucideIcon } from "lucide-react";
import {
  Brush,
  DraftingCompass,
  Brain,
  Orbit,
  Earth,
  Languages,
  BookMarked,
  BookCopy,
  Radical,
  Dumbbell,
  Atom,
  Landmark,
} from "lucide-react";

export const subjectIconMap: Record<string, LucideIcon> = {
  "Storia dell'Arte": Brush,
  "Educazione Civica": DraftingCompass,
  Filosofia: Brain,
  Fisica: Orbit,
  Geografia: Earth,
  Inglese: Languages,
  Latino: BookMarked,
  Italiano: BookCopy,
  Matematica: Radical,
  "Scienze Motorie": Dumbbell,
  Scienze: Atom,
  Storia: Landmark,
};

export function getSubjectIcon(subjectName: string): LucideIcon | null {
  return subjectIconMap[subjectName] || null;
}
