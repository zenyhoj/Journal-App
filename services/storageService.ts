import { JournalEntry, User } from '../types';
import { supabase } from './supabaseClient';

export const StorageService = {
  // --- Auth & User Management ---
  
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      return {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || 'User'
      };
    } catch (e) {
      console.error("Error getting user session:", e);
      return null;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  // --- Journal Entries ---

  getEntries: async (): Promise<JournalEntry[]> => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
      return [];
    }

    // Transform snake_case from DB to camelCase for App
    return data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      content: item.content,
      // Default to Date.now() if DB returns null, though schema should prevent this
      createdAt: item.created_at ? Number(item.created_at) : Date.now(), 
      updatedAt: item.updated_at ? Number(item.updated_at) : Date.now(),
      tags: item.tags || [],
      sentiment: item.sentiment,
      aiSummary: item.ai_summary,
      isFavorite: item.is_favorite
    }));
  },

  saveEntry: async (entry: JournalEntry): Promise<JournalEntry> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const dbPayload = {
      user_id: user.id,
      title: entry.title,
      content: entry.content,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      tags: entry.tags,
      sentiment: entry.sentiment,
      ai_summary: entry.aiSummary,
      is_favorite: entry.isFavorite
    };

    const { data, error } = await supabase
      .from('entries')
      .upsert({
        id: entry.id, 
        ...dbPayload
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving entry:", error);
      throw error;
    }

    return {
      ...entry,
      id: data.id,
    };
  },

  deleteEntry: async (entryId: string): Promise<void> => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId);
      
    if (error) {
      console.error("Error deleting entry:", error);
      throw error;
    }
  },

  getEntryById: async (entryId: string): Promise<JournalEntry | undefined> => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      content: data.content,
      createdAt: Number(data.created_at),
      updatedAt: Number(data.updated_at),
      tags: data.tags || [],
      sentiment: data.sentiment,
      aiSummary: data.ai_summary,
      isFavorite: data.is_favorite
    };
  }
};