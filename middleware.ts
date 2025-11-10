import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
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

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const pathname = req.nextUrl.pathname;

    if (!user && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (user && pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return res;
}

export const config = {
    matcher: ["/", "/login", "/dashboard/:path*", "/objave/:path*", "/pretraga/:path*", "/treneri/:path*", "/treninzi/:path*", "/profil/:path*"],
};
