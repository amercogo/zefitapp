import { createBrowserClient } from "@supabase/ssr";

/** Supabase client za klijentsku (React) stranu */
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
