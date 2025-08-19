export interface StudySessionStats {
  totalSessions: number;
  totalTimeMinutes: number;
  averageTimeMinutes: number;
  lastStudiedAt: Date | null;
}

export interface NoteStudyStats extends StudySessionStats {
  noteId: string;
  noteTitle: string;
}

export interface MonthlyStudyActivity {
  month: string;
  studyTimeMinutes: number;
  sessionCount: number;
}

export interface DailyStudyActivity {
  date: string;
  studyTimeMinutes: number;
  sessionCount: number;
}
