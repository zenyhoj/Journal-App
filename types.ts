export interface User {
  id: string;
  email: string;
  name: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  aiSummary?: string;
  isFavorite?: boolean;
}

export type ViewState = 
  | 'LOGIN' 
  | 'SIGNUP' 
  | 'DASHBOARD' 
  | 'CREATE_ENTRY' 
  | 'EDIT_ENTRY' 
  | 'VIEW_ENTRY';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  summary: string;
}
