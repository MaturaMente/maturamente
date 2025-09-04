export interface Note {
  id: string;
  title: string;
  description: string;
  storage_path: string; // Storage path in Supabase for signed URL generation
  subject_id: string;
  n_pages: number; // Number of pages in the PDF
  created_at: Date;
  slug: string;
  is_favorite?: boolean;
  free_trial?: boolean; // Whether the note is available in free trial
}

export interface FavoriteNote {
  id: string;
  user_id: string;
  note_id: string;
  created_at: Date;
  note: Note;
}

export interface SubjectInfo {
  id: string;
  name: string;
  color: string;
  slug: string;
}

export interface SubjectNotesData {
  allNotes: Note[];
  favoriteNotes: Note[];
  subject: SubjectInfo;
}
