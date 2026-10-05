import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rilrbfwqujsxpvtzdxik.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbHJiZndxdWpzeHB2dHpkeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjY2NjksImV4cCI6MjEwNTMwMjY2OX0.SizPEC37R2qCaVZjaBiO8wlEFiJxIKxAp0j8R-2Vozs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);