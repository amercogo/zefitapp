import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import {AttendanceChart} from "@/components/dashboard/attendance-chart";


export const dynamic = "force-dynamic";

type DashboardPageProps = {
    searchParams: Promise<{
        from?: string;
        to?: string;
    }>;
};



export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const params = await searchParams; // ⬅️ OVO je bitno

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) redirect("/login");


    // ---------- 1) Datum od / do (sa URL-a ili zadnjih 30 dana) ----------
    const today = new Date();

    const toParam = params.to;
    const fromParam = params.from;

    const defaultTo = toParam ?? today.toISOString().slice(0, 10); // YYYY-MM-DD
    const defaultFrom =
        fromParam ??
        new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10); // zadnjih 30 dana

    // ISO za timestamp kolone (00:00:00 i 23:59:59)
    const fromISO = new Date(defaultFrom + "T00:00:00").toISOString();
    const toISO = new Date(defaultTo + "T23:59:59").toISOString();

    // ---------- 2) Novi klijenti ----------
    const { data: newMembers } = await supabase
        .from("clanovi")
        .select("id, napravljeno")
        .gte("napravljeno", fromISO)
        .lte("napravljeno", toISO);

    const noviKlijenti = newMembers?.length ?? 0;

    // ---------- 3) Članarine (za prosječnu cijenu + najprodavaniji paket) ----------
    const { data: memberships } = await supabase
        .from("clanarine_clanova")
        .select("id, tip_clanarine_id, cijena, pocetak, status")
        .gte("pocetak", defaultFrom)
        .lte("pocetak", defaultTo);

    let prosjecnaCijena = 0;
    let najprodavanijiPaket = "Nema podataka";

    if (memberships && memberships.length > 0) {
        let totalPrice = 0;
        let countPrice = 0;
        const countByType: Record<string, number> = {};

        for (const m of memberships) {
            if (typeof m.cijena === "number") {
                totalPrice += m.cijena;
                countPrice++;
            }
            if (m.tip_clanarine_id) {
                countByType[m.tip_clanarine_id] =
                    (countByType[m.tip_clanarine_id] ?? 0) + 1;
            }
        }

        if (countPrice > 0) {
            prosjecnaCijena = totalPrice / countPrice;
        }

        // nađi tip_clanarine_id koji ima najviše članarina
        const entries = Object.entries(countByType);
        if (entries.length > 0) {
            const [topTypeId] = entries.sort((a, b) => b[1] - a[1])[0];

            const { data: topType } = await supabase
                .from("tipovi_clanarina")
                .select("naziv")
                .eq("id", topTypeId)
                .maybeSingle();

            najprodavanijiPaket = topType?.naziv ?? "Nepoznato";
        }
    }

    // ---------- 4) Plaćanja (ukupno + graf uplata) ----------
    const { data: payments } = await supabase
        .from("placanja")
        .select("iznos, datum_uplate")
        .gte("datum_uplate", fromISO)
        .lte("datum_uplate", toISO);

    const ukupneUplate =
        payments?.reduce((sum, p) => sum + (p.iznos ?? 0), 0) ?? 0;

    const uplateMap: Record<string, number> = {};
    for (const p of payments ?? []) {
        if (!p.datum_uplate) continue;
        const d = p.datum_uplate.slice(0, 10); // YYYY-MM-DD
        uplateMap[d] = (uplateMap[d] ?? 0) + (p.iznos ?? 0);
    }
    const grafikUplata = Object.entries(uplateMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([datum, iznos]) => ({ datum, iznos }));

    // ---------- 5) Dolasci (graf + najaktivniji) ----------
    const { data: visits } = await supabase
        .from("dolasci")
        .select("id, clan_id, stigao_u_gym, izasao_iz_gyma")
        .gte("stigao_u_gym", fromISO)
        .lte("stigao_u_gym", toISO);

    const dolasciMap: Record<string, number> = {};
    const dolasciByClan: Record<string, number> = {};

    for (const v of visits ?? []) {
        if (!v.stigao_u_gym) continue;
        const d = v.stigao_u_gym.slice(0, 10);
        dolasciMap[d] = (dolasciMap[d] ?? 0) + 1;

        if (v.clan_id) {
            dolasciByClan[v.clan_id] = (dolasciByClan[v.clan_id] ?? 0) + 1;
        }
    }

    const grafikDolazaka = Object.entries(dolasciMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([datum, broj]) => ({ datum, broj }));

    // 🔹 OVDJE pravimo podatke za graf iz baze
    const attendanceData = grafikDolazaka.map((g) => ({
        date: g.datum,   // x-os
        count: g.broj,   // y-os
    }));


    // Najaktivniji članovi (top 5)
    let najaktivniji: { ime: string; dolasci: number }[] = [];
    const topClanIds = Object.entries(dolasciByClan)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

    if (topClanIds.length > 0) {
        const { data: topMembers } = await supabase
            .from("clanovi")
            .select("id, ime_prezime")
            .in("id", topClanIds);

        najaktivniji = topClanIds.map((id) => {
            const clan = topMembers?.find((c) => c.id === id);
            return {
                ime: clan?.ime_prezime ?? "Nepoznat",
                dolasci: dolasciByClan[id],
            };
        });
    }

    // ---------- 6) Ističe u narednih 7 dana ----------
    const toDateObj = new Date(defaultTo + "T00:00:00");
    const next7 = new Date(
        toDateObj.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString().slice(0, 10);

    const { data: expiring } = await supabase
        .from("clanarine_clanova")
        .select("id, clan_id, zavrsetak, status")
        .eq("status", "active")
        .gte("zavrsetak", defaultTo)
        .lte("zavrsetak", next7);

    let isticeUskoro: { ime: string; datum: string }[] = [];

    if (expiring && expiring.length > 0) {
        const ids = expiring
            .map((m) => m.clan_id)
            .filter((x): x is string => !!x);

        const { data: expMembers } = await supabase
            .from("clanovi")
            .select("id, ime_prezime")
            .in("id", ids);

        isticeUskoro = expiring.map((m) => {
            const clan = expMembers?.find((c) => c.id === m.clan_id);
            return {
                ime: clan?.ime_prezime ?? "Nepoznat",
                datum: m.zavrsetak ?? "",
            };
        });
    }

    // ---------- 7) Trenutno u teretani (zadnjih 90 min, bez vremena izlaska) ----------
    const now = new Date();
    const cutoff = new Date(
        now.getTime() - 90 * 60 * 1000,
    ).toISOString();

    const { data: recentVisits } = await supabase
        .from("dolasci")
        .select("id, stigao_u_gym, izasao_iz_gyma")
        .gte("stigao_u_gym", cutoff);

    const trenutnoUTeretani =
        recentVisits?.filter((v) => !v.izasao_iz_gyma).length ?? 0;

    // ---------- 8) UI (skoro isti kao prije, samo brojke izračunate) ----------
    return (
        <main className="p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Top bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[var(--color-yellow)]">
                            Pregled
                        </h1>
                        <p className="mt-1 text-sm text-white/70">
                            Podaci za period {defaultFrom} – {defaultTo}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-white/70">
                            Prijavljen:{" "}
                            <span className="font-semibold text-[var(--color-yellow)]">
                                {user.email}
                            </span>
                        </span>
                        <LogoutButton />
                    </div>
                </div>

                {/* Filter perioda (GET forma) */}
                <section className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/30 p-5 sm:p-6 lg:p-7">
                    <h2 className="mb-4 text-sm font-semibold tracking-wide text-white/70">
                        Filtriraj po periodu
                    </h2>

                    <form
                        method="get"
                        className="grid gap-4 sm:grid-cols-[repeat(3,minmax(0,220px))]"
                    >
                        {/* Datum od */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-white/70">
                                Datum od
                            </label>
                            <input
                                type="date"
                                name="from"
                                className="h-11 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                defaultValue={defaultFrom}
                                max={defaultTo}     // ne možeš izabrati OD poslije DO
                            />
                        </div>

                        {/* Datum do */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-white/70">
                                Datum do
                            </label>
                            <input
                                type="date"
                                name="to"
                                className="h-11 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                defaultValue={defaultTo}
                                min={defaultFrom}   // ne možeš izabrati DO prije OD
                            />
                        </div>

                        {/* Dugme Filtriraj */}
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center h-11 w-full sm:w-auto rounded-xl bg-[var(--color-yellow)] text-black px-6 text-sm font-extrabold shadow-[0_12px_30px_rgba(0,0,0,0.65)] transition hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_4px_12px_rgba(0,0,0,0.75)]"
                            >
                                Filtriraj
                            </button>
                        </div>
                    </form>
                </section>

                {/* 4 info kartice */}
                <section className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            PROSJEČNA CIJENA PAKETA
                        </p>
                        <div className="mt-3 text-4xl font-extrabold text-[var(--color-yellow)]">
                            {prosjecnaCijena.toFixed(2)} KM
                        </div>
                        <p className="mt-1 text-xs text-white/50">KM</p>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            NAJPRODAVANIJI PAKET
                        </p>
                        <div className="mt-3 text-3xl font-extrabold text-[var(--color-yellow)]">
                            {najprodavanijiPaket}
                        </div>
                        <p className="mt-1 text-xs text-white/50">Naziv paketa</p>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            NOVI KLIJENTI
                        </p>
                        <div className="mt-3 text-4xl font-extrabold text-[var(--color-yellow)]">
                            {noviKlijenti}
                        </div>
                        <p className="mt-1 text-xs text-white/50">u periodu</p>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            UPLATE
                        </p>
                        <div className="mt-3 text-4xl font-extrabold text-[var(--color-yellow)]">
                            {ukupneUplate.toFixed(2)} KM
                        </div>
                        <p className="mt-1 text-xs text-white/50">ukupno u periodu</p>
                    </div>
                </section>

                {/* Grafik dolazaka + grafik uplata */}
                <section className="grid gap-4 lg:grid-cols-2">
                    <AttendanceChart data={attendanceData} />

                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <h2 className="mb-3 text-sm font-semibold text-white/80">
                            Grafik uplata
                        </h2>
                        <div className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-white/75 space-y-1">
                            {grafikUplata.map((g) => (
                                <p key={g.datum}>
                                    {g.datum}:{" "}
                                    <span className="font-semibold text-[var(--color-yellow)]">
                                        {g.iznos.toFixed(2)} KM
                                    </span>
                                </p>
                            ))}
                            {grafikUplata.length === 0 && (
                                <p className="text-white/50 text-sm">
                                    Nema uplata u odabranom periodu.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Donji red */}
                <section className="grid gap-4 lg:grid-cols-3">
                    {/* Najaktivniji */}
                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <h2 className="mb-3 text-sm font-semibold text-white/80">
                            Najaktivniji klijenti
                        </h2>
                        <div className="space-y-2 text-sm">
                            {najaktivniji.length === 0 && (
                                <p className="text-white/50 text-sm">
                                    Nema dolazaka u odabranom periodu.
                                </p>
                            )}
                            {najaktivniji.map((k) => (
                                <div
                                    key={k.ime}
                                    className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-black/30"
                                >
                                    <span className="font-semibold text-white/85">
                                        {k.ime}
                                    </span>
                                    <span className="text-xs text-[var(--color-yellow)]">
                                        {k.dolasci} dolazaka
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ističe u narednih 7 dana */}
                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <h2 className="mb-3 text-sm font-semibold text-white/80">
                            Ističe u narednih 7 dana
                        </h2>
                        {isticeUskoro.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-white/15 px-3 py-3 text-sm text-white/60">
                                — Nema članarina koje ističu
                            </div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                {isticeUskoro.map((c) => (
                                    <div
                                        key={c.ime + c.datum}
                                        className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-black/30"
                                    >
                                        <span className="font-semibold text-white/85">
                                            {c.ime}
                                        </span>
                                        <span className="text-xs text-[var(--color-yellow)]">
                                            {c.datum}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Trenutno u teretani */}
                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)] flex flex-col justify-between">
                        <div>
                            <h2 className="mb-3 text-sm font-semibold text-white/80">
                                Trenutno u teretani
                            </h2>
                            <div className="text-5xl font-extrabold text-[var(--color-yellow)]">
                                {trenutnoUTeretani}
                            </div>
                            <p className="mt-2 text-xs text-white/60">
                                broj prisutnih (zadnjih 90 min)
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
