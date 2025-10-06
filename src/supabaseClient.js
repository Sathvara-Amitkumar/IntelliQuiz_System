import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ublzlmubbovanvxvcbws.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibHpsbXViYm92YW52eHZjYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDE3MzYsImV4cCI6MjA3NTE3NzczNn0.qjvhh9QovyEIMNGLMSHWfTLhFEB138XoebFn8T8E6h0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
