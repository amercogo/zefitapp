"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogout() {
        try {
            setLoading(true);
            await supabase.auth.signOut();
            router.push("/login");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
    onClick={handleLogout}
    disabled={loading}
    className={`
        px-5 py-2 rounded-full text-sm font-semibold
        bg-[var(--color-yellow)] text-black
        hover:brightness-95 active:translate-y-[1px] transition
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
>
    {loading ? "Odjavljivanje..." : "Odjavi se"}
    </button>
);
}
