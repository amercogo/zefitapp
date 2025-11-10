"use client";

import Image from "next/image";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage()
{
    // odmah ispod export default function LoginPage() { ... }
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    async function handleLogin() {
        setError("");
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError("Pogrešan email ili lozinka");
            return;
        }

        router.push("/dashboard");
    }

    return (
        <main className="min-h-screen flex flex-col">
            {/* Glavni red (bez headera) */}
            <section className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center gap-8 px-6 lg:px-16">
                {/* LEFT: veliki logo */}
                <div className="hidden lg:flex items-center justify-center">
                    <Image
                        src="/zefit-logo.png"
                        alt="ZeFit logo"
                        width={480}
                        height={480}
                        className="object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.6)]"
                        priority
                    />
                </div>

                {/* RIGHT: login kartica (odignuta, svjetlija, ring) */}
                <div className="flex items-center justify-center">
                    <div
                        className="
    w-full max-w-xl rounded-2xl
    bg-[var(--color-card)]
    border-[0.1] border-yellow-400

    /* siva, mekana i široka sjena */
    shadow-[0_22px_60px_-12px_rgba(30,30,30,0.8),0_3px_0_rgba(0,0,0,0.8)]

    -translate-y-[2px]
    transition duration-200 ease-out
    hover:-translate-y-[4px]
    hover:shadow-[0_26px_64px_-12px_rgba(0,0,0,0.5),0_3px_0_rgba(0,0,0,0.25)]
  "
                    >
                        <div className="p-6 sm:p-10">
                            <h1
                                className="
                                text-center tracking-[0.6em] text-3xl font-extrabold mb-8
                                text-[var(--color-yellow)]
                                [text-shadow:_0_0_14px_rgba(255,240,45,0.45)]

                              "
                            >
                                Z E F I T
                            </h1>

                            <label className="sr-only" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="sef@zefit.ba"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="
                  w-full px-6 py-4 mb-6
                  bg-black/10 text-yellow-200 placeholder-yellow-100
                  rounded-full outline-yellow-300 border-1  "
                            />

                            <label className="sr-only" htmlFor="password">Lozinka</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="
                  w-full px-6 py-4 mb-8
                   bg-black/10 text-yellow-200 placeholder-yellow-100
                  rounded-full outline-yellow-300 border-1
                "
                            />

                            <button
                                type="button"
                                onClick={handleLogin}
                                className="
                        w-[220px] py-4 text-lg font-extrabold
                        rounded-full bg-[var(--color-yellow)] text-black
                        shadow-lg shadow-black/10 ring-1 ring-black/10
                        transition duration-200 ease-out
                        hover:shadow-2xl hover:ring-2 hover:-translate-y-0.5 hover:saturate-150
                        active:translate-y-0 active:scale-[0.98] active:shadow-sm active:ring-0
                        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-yellow)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/5
                        block mx-auto
                      "
                            >
                                Prijavi se
                            </button>
                            {error && <p className="text-red-400 text-center mt-3">{error}</p>}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer (viši) */}
            <footer className="w-full border-t-2 border-white/10 bg-[#101010]">
                <div className="max-w-7xl mx-auto px-6 lg:px-16 py-6 flex items-center justify-between text-base">
                    <p className="text-[var(--color-yellow)] font-extrabold tracking-wide">
                        BORI SE KAO BORAC!
                    </p>
                    <p className="text-[--color-yellow]">
                        <a href="mailto:zefit@email.com" className="underline-offset-4 hover:underline">
                            zefit@email.com
                        </a>{" "}
                        • 060/000-000
                    </p>
                </div>
            </footer>
        </main>
    );
}
