import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client koji radi na server strani (SSR, middleware, server actions) */
export async function createClient() {
    // ⬇️ moraš čekati cookies()
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
}
