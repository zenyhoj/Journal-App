import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xdzcpqvyxdbtwmufjltq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkemNwcXZ5eGRidHdtdWZqbHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDI0MTEsImV4cCI6MjA4MDE3ODQxMX0.eKCaKbYkJe9EvU4nbgOYYBPdhT2-vpwOGPRljDk00EU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * DATABASE SCHEMA REQUIREMENTS
 * 
 * You must run the following SQL in your Supabase Dashboard SQL Editor for this app to work:
 * 
 * create table entries (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users not null,
 *   title text,
 *   content text,
 *   created_at bigint,
 *   updated_at bigint,
 *   tags text[],
 *   sentiment text,
 *   ai_summary text,
 *   is_favorite boolean default false
 * );
 * 
 * alter table entries enable row level security;
 * 
 * create policy "Users can see own entries" on entries for select to authenticated using (auth.uid() = user_id);
 * create policy "Users can insert own entries" on entries for insert to authenticated with check (auth.uid() = user_id);
 * create policy "Users can update own entries" on entries for update to authenticated using (auth.uid() = user_id);
 * create policy "Users can delete own entries" on entries for delete to authenticated using (auth.uid() = user_id);
 * 
 * --- IMPORTANT: EMAIL VERIFICATION ---
 * If you are not receiving signup emails, go to:
 * Supabase Dashboard -> Authentication -> Providers -> Email
 * And DISABLE "Confirm email". 
 * This allows users to login immediately after signup without clicking a link.
 */