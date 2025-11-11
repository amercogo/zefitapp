// proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
    const res = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => req.cookies.get(name)?.value,
                set: (name, value, options) => {
                    res.cookies.set({ name, value, ...options });
                },
                remove: (name, options) => {
                    res.cookies.delete({ name, ...options });
                },
            },
        }
    );

    // Uzimamo user-a (bez pucanja na error)
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    } catch {
        // ignoriraj; tretiraj kao neregistrovanog
    }

    const pathname = req.nextUrl.pathname;

    if (!user && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (user && pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return res;
}

// Ostaje isto kao i ranije
export const config = {
    matcher: [
        "/",
        "/login",
        "/dashboard/:path*",
        "/objave/:path*",
        "/pretraga/:path*",
        "/treneri/:path*",
        "/treninzi/:path*",
        "/profil/:path*",
    ],
};
