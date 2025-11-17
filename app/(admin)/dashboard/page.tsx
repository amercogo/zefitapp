import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { AttendanceChart, AttendancePoint, PaymentPoint } from "@/components/dashboard/attendance-chart";


export const dynamic = "force-dynamic";

type DashboardPageProps = {
    searchParams: Promise<{
        from?: string;
        to?: string;
        quickRange?: string;   // ⬅️ NOVO
    }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const params = await searchParams;

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) redirect("/login");

    // ---------- 1) Datum od / do (sa URL-a ili zadnjih 30 dana) ----------
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const toParam = params.to;
    const fromParam = params.from;
    const quickRange = params.quickRange; // "7", "30", "90", "365" ili undefined

    let defaultTo = toParam ?? todayStr;
    let defaultFrom =
        fromParam ??
        new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10); // zadnjih 30 dana

    // Ako je kliknut quick range – pregazi from/to i računaj svježe
    if (quickRange) {
        const days = parseInt(quickRange, 10);
        if (!Number.isNaN(days) && days > 0) {
            defaultTo = todayStr;
            const fromDate = new Date(
                today.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
            );
            defaultFrom = fromDate.toISOString().slice(0, 10);
        }
    }


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
        .select(`
    id,
    iznos,
    datum_uplate,
    clanovi:clan_id (
      ime_prezime
    ),
    clanarine_clanova:clanarina_clan_id (
      tipovi_clanarina:tip_clanarine_id (
        naziv
      )
    )
  `)
        .gte("datum_uplate", fromISO)
        .lte("datum_uplate", toISO);


    const ukupneUplate =
        payments?.reduce((sum, p) => sum + (p.iznos ?? 0), 0) ?? 0;

    type PaymentRow = {
        id: string;
        ime: string;
        paket: string;
        datum: string;
        iznos: number;
    };

    const paymentsTable: PaymentRow[] =
        payments?.map((p: any) => ({
            id: p.id,
            ime: p.clanovi?.ime_prezime ?? "Nepoznat",
            paket:
                p.clanarine_clanova?.tipovi_clanarina?.naziv ?? "Nepoznat paket",
            datum: p.datum_uplate?.slice(0, 10) ?? "",
            iznos: p.iznos ?? 0,
        })) ?? [];


    const uplateMap: Record<string, number> = {};
    for (const p of payments ?? []) {
        if (!p.datum_uplate) continue;
        const d = p.datum_uplate.slice(0, 10); // YYYY-MM-DD
        uplateMap[d] = (uplateMap[d] ?? 0) + (p.iznos ?? 0);
    }
    const grafikUplata = Object.entries(uplateMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([datum, iznos]) => ({ datum, iznos }));

    const paymentChartData: PaymentPoint[] = grafikUplata.map((g) => ({
        date: g.datum,
        amount: g.iznos,
    }));

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
    const attendanceChartData: AttendancePoint[] = grafikDolazaka.map((g) => ({
        date: g.datum,   // npr. "2025-11-10"
        count: g.broj,
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
                        <LogoutButton/>
                    </div>
                </div>

                {/* Filter perioda (GET forma) */}
                <section className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/30 p-5 sm:p-6 lg:p-7">
                    <h2 className="mb-4 text-sm font-semibold tracking-wide text-white/70">
                        Filtriraj po periodu
                    </h2>

                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">

                        {/* --- Lijeva strana: datumi i filtriranje --- */}
                        <form
                            method="get"
                            className="grid gap-4 sm:grid-cols-[repeat(3,minmax(0,200px))]"
                        >
                            {/* Datum od */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Datum od (MM/DD/GGGG)
                                </label>
                                <input
                                    type="date"
                                    name="from"
                                    className="h-11 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    defaultValue={defaultFrom}
                                    max={defaultTo}
                                />
                            </div>

                            {/* Datum do */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Datum do (MM/DD/GGGG)
                                </label>
                                <input
                                    type="date"
                                    name="to"
                                    className="h-11 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    defaultValue={defaultTo}
                                    min={defaultFrom}
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

                        {/* --- Desna strana: Quick Range dropdown --- */}
                        <div className="relative">
                            <details className="group">
                                <summary
                                    className="list-none cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/20 text-white/80 hover:bg-white/10 transition">
                                     Brzi period...
                                    <span className="text-[var(--color-yellow)] font-semibold">▼</span>
                                </summary>

                                <div
                                    className="absolute right-0 mt-2 w-48 rounded-xl bg-black/90 border border-white/15 shadow-xl z-20 p-2">
                                    {[
                                        {label: "7 dana", value: "7"},
                                        {label: "30 dana", value: "30"},
                                        {label: "90 dana", value: "90"},
                                        {label: "Godinu dana", value: "365"},
                                    ].map((opt) => (
                                        <form key={opt.value} method="get">
                                            <input type="hidden" name="quickRange" value={opt.value}/>
                                            <button
                                                type="submit"
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/10 transition"
                                            >
                                                {opt.label}
                                            </button>
                                        </form>
                                    ))}
                                </div>
                            </details>
                        </div>
                    </div>
                </section>

                {/* 4 info kartice */}
                <section className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            PROSJEČNA CIJENA ČLANARINE
                        </p>
                        <div className="mt-3 text-4xl font-extrabold text-[var(--color-yellow)]">
                            {prosjecnaCijena.toFixed(2)} KM
                        </div>
                        <p className="mt-1 text-xs text-white/50">KM</p>
                    </div>

                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            NAJPRODAVANIJA ČLANARINA
                        </p>
                        <div className="mt-3 text-3xl font-extrabold text-[var(--color-yellow)]">
                            {najprodavanijiPaket}
                        </div>
                        <p className="mt-1 text-xs text-white/50">Naziv članarine</p>
                    </div>

                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <p className="text-xs font-semibold tracking-wide text-white/60">
                            NOVI ČLANOVI
                        </p>
                        <div className="mt-3 text-4xl font-extrabold text-[var(--color-yellow)]">
                            {noviKlijenti}
                        </div>
                        <p className="mt-1 text-xs text-white/50">u periodu</p>
                    </div>

                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
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
                    <AttendanceChart
                        attendanceData={attendanceChartData}
                        paymentData={paymentChartData}
                    />

                    {/* desna kartica za tekstualni pregled uplata ostaje ista, ili je možeš skratiti */}
                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)] flex flex-col">
                        <header className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--color-yellow)] text-lg">💰</span>
                                <h2 className="text-sm sm:text-base font-extrabold text-[var(--color-yellow)]">
                                    Uplate
                                </h2>
                            </div>

                            <div
                                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-yellow)]/10 border border-[var(--color-yellow)]/60 px-3 py-1 text-xs font-semibold text-[var(--color-yellow)]">
                                <span>Suma:</span>
                                <span>{ukupneUplate.toFixed(2)} KM</span>
                            </div>
                        </header>

                        <div className="relative flex-1">
                            <div className="overflow-auto max-h-72 rounded-xl border border-white/10 bg-black/30">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-black/60 border-b border-white/10 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-white/60">
                                            Ime
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-white/60">
                                            Paket
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-white/60">
                                            Datum
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-white/60">
                                            Iznos
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paymentsTable.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-4 text-center text-xs text-white/50"
                                            >
                                                Nema uplata u odabranom periodu.
                                            </td>
                                        </tr>
                                    )}

                                    {paymentsTable.map((p, idx) => (
                                        <tr
                                            key={p.id}
                                            className={`
                border-b border-white/5
                ${idx % 2 === 0 ? "bg-black/20" : "bg-black/10"}
                hover:bg-[var(--color-yellow)]/5 transition
              `}
                                        >
                                            <td className="px-3 py-2 text-[13px] text-[var(--color-yellow)] underline-offset-2 hover:underline cursor-pointer">
                                                {p.ime}
                                            </td>
                                            <td className="px-3 py-2 text-[13px] text-white/85">
                                                {p.paket}
                                            </td>
                                            <td className="px-3 py-2 text-[13px] text-white/70">
                                                {p.datum}
                                            </td>
                                            <td className="px-3 py-2 text-[13px] text-right font-semibold text-[var(--color-yellow)]">
                                                {p.iznos.toFixed(2)} KM
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </section>


                {/* Donji red */}
                <section className="grid gap-4 lg:grid-cols-3">
                    {/* Najaktivniji */}
                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <h2 className="mb-3 text-sm font-semibold text-white/80">
                            Najaktivniji članovi
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
                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                        <h2 className="mb-3 text-sm font-semibold text-white/80">
                            Ističe u narednih 7 dana
                        </h2>
                        {isticeUskoro.length === 0 ? (
                            <div
                                className="rounded-lg border border-dashed border-white/15 px-3 py-3 text-sm text-white/60">
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
                    <div
                        className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/40 p-5 sm:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.7)] flex flex-col justify-between">
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
