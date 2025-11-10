"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import LogoutButton from "@/components/logout-button";

type Item = { href: string; label: string };

const ITEMS: Item[] = [
    { href: "/dashboard",  label: "PREGLED" },
    { href: "/objave",     label: "OBJAVE" },
    { href: "/pretraga",   label: "PRETRAGA KLIJENATA" },
    { href: "/treneri",    label: "TRENERI" },
    { href: "/treninzi",   label: "TRENINGI" },
    { href: "/profil",     label: "MOJ PROFIL" },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside
            className="
        w-[260px] shrink-0
        bg-[#1a1a1a]/95 border-r border-white/10
        min-h-screen sticky top-0
        px-5 py-7
        flex flex-col
      "
        >
            {/* Logo + naziv */}
            <div className="flex items-center gap-3 mb-10 justify-center">
                <Image src="/zefit-logo.png" alt="ZeFit" width={36} height={36} />
                <span className="text-[var(--color-yellow)] font-extrabold text-2xl">
          ZeFIT
        </span>
            </div>

            {/* Stavke menija */}
            <nav className="flex flex-col gap-3">
                {ITEMS.map((it) => {
                    const active = pathname === it.href;

                    // zajednički stil (jedna linija, centrirano, veći padding)
                    const base =
                        "relative inline-flex w-full h-14 items-center justify-center " + // 1 horizontalna linija
                        "rounded-xl px-6 text-center font-extrabold tracking-wide " +
                        "transition-[color,transform] duration-250 ease-out select-none";

                    if (active) {
                        // aktivna: puna žuta (bez hover trake), s blagim ‘press’ klik efektom
                        return (
                            <Link
                                key={it.href}
                                href={it.href}
                                className={`${base} bg-[var(--color-yellow)] text-black active:scale-[0.98]`}
                            >
                                {it.label}
                            </Link>
                        );
                    }

                    // neaktivna: žuti tekst + ANIMACIJA — žuta traka klizi ispod teksta na hover
                    return (
                        <div key={it.href} className="group relative">
                            {/* klizajuća pozadina (hover) */}
                            <span
                                aria-hidden="true"
                                className="
                  pointer-events-none absolute inset-0 rounded-xl overflow-hidden
                "
                            >
                <span
                    className="
                    absolute left-0 top-0 h-full w-0
                    bg-[var(--color-yellow)]
                    rounded-xl
                    transition-[width] duration-300 ease-out
                    group-hover:w-full
                  "
                />
              </span>

                            <Link
                                href={it.href}
                                className={
                                    base +
                                    " text-[var(--color-yellow)] group-hover:text-black " +
                                    "active:scale-[0.98] focus-visible:outline-none " +
                                    "focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/70"
                                }
                            >
                                <span className="relative z-10">{it.label}</span>
                            </Link>
                        </div>
                    );
                })}
            </nav>

            {/* Logout na dnu */}
            <div className="mt-auto pt-8">
                <LogoutButton className="w-full justify-center h-12 rounded-xl" />
            </div>
        </aside>
    );
}
