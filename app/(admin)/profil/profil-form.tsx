"use client";

import { useState } from "react";
import { updateProfileAction } from "./actions";

type FormState = {
    fullName: string;
    email: string;
    phone: string;
    newPassword: string;
    avatarFile?: File | null;
};

export default function ProfilForm({
                                       initialProfile,
                                       userEmail,
                                   }: {
    initialProfile: { full_name?: string | null; phone?: string | null; avatar_url?: string | null } | null;
    userEmail: string;
}) {
    const [form, setForm] = useState<FormState>({
        fullName: initialProfile?.full_name || "Ime Prezime",
        email: userEmail || "korisnik@example.com",
        phone: initialProfile?.phone || "+3876xxxxxxx",
        newPassword: "",
        avatarFile: null,
    });

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string>("");

    const initial = form.fullName?.trim()?.[0]?.toUpperCase() || "I";

    function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((s) => ({ ...s, [key]: value }));
    }
/*
    function handleReset() {
        setForm({
            fullName: initialProfile?.full_name || "Ime Prezime",
            email: userEmail || "korisnik@example.com",
            phone: initialProfile?.phone || "+3876xxxxxxx",
            newPassword: "",
            avatarFile: null,
        });
        const el = document.getElementById("avatar-input") as HTMLInputElement | null;
        if (el) el.value = "";
    }

 */

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setMsg("");

        const fd = new FormData(e.currentTarget);
        // osiguraj da kontrolisane vrijednosti odu u FormData
        fd.set("fullName", form.fullName);
        fd.set("phone", form.phone);
        fd.set("newPassword", form.newPassword);
        if (form.avatarFile) fd.set("avatar", form.avatarFile);

        try {
            const res = await updateProfileAction(fd);
            if (res?.success) {
                setMsg("✅ Promjene uspješno sačuvane!");
                if (res.avatarUrl) setAvatarUrl(res.avatarUrl);
            }
        } catch (err: any) {
            setMsg("❌ Greška: " + (err?.message ?? "Nepoznata greška"));
        } finally {
            setLoading(false);
        }
    }
    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        initialProfile?.avatar_url ?? null
    );

    return (
        <section className="p-6 lg:p-10">
            <header className="mb-6">
                <h1 className="text-3xl font-extrabold text-[var(--color-yellow)]">Moj profil</h1>
                <p className="text-white/60 mt-1">Osnovne informacije o nalogu.</p>
            </header>

            {/* KARTICA: Osnovni podaci */}
            <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-[var(--color-yellow)]/25 bg-black/30 p-5 sm:p-6 lg:p-8"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Avatar + upload (repositioned) */}
                    <div className="relative lg:min-h-[260px]">
                        <div
                            className="
                flex flex-col items-start gap-3
                lg:absolute lg:top-[55%] lg:left-[40%] lg:-translate-x-1/2 lg:-translate-y-1/2
              "
                        >
                            <div
                                className="size-24 rounded-full overflow-hidden bg-[var(--color-yellow)] flex items-center justify-center"
                                aria-label="Avatar"
                                title={form.fullName}
                                  >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover"/>
                                     ) : (
                                    <span className="font-extrabold text-3xl text-black select-none">
                                     {initial}
                                 </span>
                                )}
                            </div>


                            <label htmlFor="avatar-input" className="text-sm font-semibold text-white/85">
                                Promijeni sliku <span className="text-white/50">(opciono)</span>
                            </label>

                            <div className="flex items-center gap-3">
                                <label
                                    className="
                    inline-flex items-center justify-center rounded-full
                    bg-[var(--color-yellow)] text-black px-4 py-2 text-sm font-bold
                    cursor-pointer hover:brightness-95 active:translate-y-[1px] transition
                  "
                                >
                                    Choose file
                                    <input
                                        id="avatar-input"
                                        name="avatar"              // <-- bitno za FormData
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            onChange("avatarFile", file);
                                            if (file) setAvatarUrl(URL.createObjectURL(file)); // lokalni preview prije uploada
                                        }}
                                    />
                                </label>
                                <span className="text-white/70 text-sm">
                  {form.avatarFile?.name ?? "No file chosen"}
                </span>
                            </div>
                        </div>
                    </div>

                    {/* Desna strana: polja */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ime i prezime */}
                        <div className="md:col-span-2">
                            <label className="block text-sm text-white/70 mb-2">Ime i prezime</label>
                            <input
                                name="fullName"                 // <-- BITNO
                                type="text"
                                value={form.fullName}
                                onChange={(e) => onChange("fullName", e.target.value)}
                                className="w-full h-12 rounded-md bg-black/40 border border-white/15 text-white px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                placeholder="Ime Prezime"
                            />
                        </div>

                        {/* Email (ne mijenja se kroz formu) */}
                        <div>
                            <label className="block text-sm text-white/70 mb-2">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                disabled
                                className="w-full h-12 rounded-md bg-black/40 border border-white/15 text-white px-4 opacity-70"
                                placeholder="korisnik@example.com"
                                autoComplete="email"
                            />
                        </div>

                        {/* Telefon */}
                        <div>
                            <label className="block text-sm text-white/70 mb-2">Telefon</label>
                            <input
                                name="phone"                     // <-- BITNO
                                type="tel"
                                value={form.phone}
                                onChange={(e) => onChange("phone", e.target.value)}
                                className="w-full h-12 rounded-md bg-black/40 border border-white/15 text-white px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                placeholder="+3876xxxxxxx"
                                autoComplete="tel"
                            />
                        </div>

                        {/* Nova lozinka */}
                        <div className="md:col-span-2">
                            <label className="block text-sm text-white/70 mb-2">Nova lozinka (opciono)</label>
                            <input
                                name="newPassword"               // <-- BITNO
                                type="password"
                                value={form.newPassword}
                                onChange={(e) => onChange("newPassword", e.target.value)}
                                className="w-full h-12 rounded-md bg-black/40 border border-white/15 text-white px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <p className="text-xs text-white/50 mt-2">Ostavi prazno ako ne mijenjaš lozinku.</p>
                        </div>
                    </div>
                </div>

                {/* Dugmad */}
                <div className="mt-6 flex gap-3 justify-end">

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-6 rounded-full bg-[var(--color-yellow)] text-black font-extrabold hover:brightness-95 active:translate-y-[1px] transition disabled:opacity-50"
                    >
                        {loading ? "Spremam..." : "Spremi promjene"}
                    </button>
                </div>

                {msg && <p className="mt-4 text-center text-white/80">{msg}</p>}
            </form>

            {/* KARTICA: Osnovne postavke (ostaje demo) */}
            <div className="mt-8 rounded-xl border border-[var(--color-yellow)]/25 bg-black/30 p-5 sm:p-6 lg:p-8">
                <h2 className="text-lg font-extrabold text-[var(--color-yellow)] mb-4">Osnovne postavke</h2>

                <div className="space-y-3">
                    <details className="rounded-lg border border-white/10">
                        <summary className="h-14 flex items-center justify-between px-4 cursor-pointer select-none">
                            <span className="font-semibold text-white/90">Obavijesti e-mailom</span>
                            <span className="text-white/40">—</span>
                        </summary>
                        <div className="px-4 pb-4 text-white/70">
                            (Uskoro: toggle za dnevne / sedmične obavijesti)
                        </div>
                    </details>

                    <div className="rounded-lg border border-white/10 flex items-center justify-between h-14 px-4">
                        <span className="font-semibold text-white/90">Jezik sučelja</span>
                        <span className="text-white/70">Bosanski</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
