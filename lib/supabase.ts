import { createClient } from '@supabase/supabase-js';

// On utilise des valeurs par défaut factices uniquement pour éviter l'erreur
// lors du "prerendering" de Next.js pendant la phase de build sur Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
