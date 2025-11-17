"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// -----------------------------------------
// TIPOVI — ručno napravljeni
// -----------------------------------------

export type Clan = {
    id: string;
    ime_prezime: string;
    telefon: string | null;
    status: string;
};

export type TrainerCard = {
    id: string; // treneri.id
    clanId: string; // clanovi.id koji je trener
    name: string;
    phone: string | null;
    note: string | null;
    membersCount: number;
};

export type TrenerRow = {
    id: string;
    clan_id: string;
    note: string | null;
    clanovi:
        | {
        id: string;
        ime_prezime: string;
        telefon: string | null;
    }
        | {
        id: string;
        ime_prezime: string;
        telefon: string | null;
    }[]
        | null;
};

type CountRow = {
    clan_id: string;
    treninzi:
        | {
        trener_id: string;
    }
        | {
        trener_id: string;
    }[]
        | null;
};

type ManageRow = {
    clanovi:
        | {
        id: string;
        ime_prezime: string;
        telefon: string | null;
    }
        | {
        id: string;
        ime_prezime: string;
        telefon: string | null;
    }[]
        | null;
};

type TreningIdRow = {
    id: string;
};

// -----------------------------------------
// PAGE KOMPONENTA
// -----------------------------------------

export default function TreneriPage() {
    const [trainers, setTrainers] = useState<TrainerCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");

    // Modali
    const [addOpen, setAddOpen] = useState(false); // promoviši člana u trenera
    const [manageOpen, setManageOpen] = useState(false); // članovi trenera

    const [availableMembers, setAvailableMembers] = useState<Clan[]>([]);
    const [loadingAddList, setLoadingAddList] = useState(false);

    const [selectedTrainer, setSelectedTrainer] = useState<TrainerCard | null>(
        null
    );
    const [managedMembers, setManagedMembers] = useState<Clan[]>([]);
    const [loadingManaged, setLoadingManaged] = useState(false);

    // modal za dodavanje člana treneru
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [candidateMembers, setCandidateMembers] = useState<Clan[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // -----------------------------------------
    // HELPER: učitaj trenere + broj članova
    // -----------------------------------------

    const loadTrainers = async () => {
        setLoading(true);
        setError(null);

        const { data: treneriData, error: treneriError } = await supabase
            .from("treneri")
            .select(
                `
                id,
                clan_id,
                note,
                clanovi:clan_id (
                    id,
                    ime_prezime,
                    telefon
                )
            `
            );

        if (treneriError) {
            setError(treneriError.message);
            setLoading(false);
            return;
        }

        const baseTrainers: TrainerCard[] =
            (treneriData as TrenerRow[])?.map((row) => {
                const clan = Array.isArray(row.clanovi)
                    ? row.clanovi[0]
                    : row.clanovi;

                return {
                    id: row.id,
                    clanId: row.clan_id,
                    note: row.note ?? null,
                    name: clan?.ime_prezime ?? "Nepoznat",
                    phone: clan?.telefon ?? null,
                    membersCount: 0,
                };
            }) ?? [];

        // Prebroji članove po treneru
        const { data: ctData, error: ctError } = await supabase
            .from("clanovi_treninga")
            .select(
                `
                id,
                clan_id,
                treninzi:trening_id (trener_id)
            `
            );

        if (ctError) {
            setError(ctError.message);
            setTrainers(baseTrainers);
            setLoading(false);
            return;
        }

        const countMap = new Map<string, Set<string>>();

        (ctData ?? []).forEach((rowRaw) => {
            const row = rowRaw as CountRow;
            const treninzi = Array.isArray(row.treninzi)
                ? row.treninzi[0]
                : row.treninzi;

            const trenerId = treninzi?.trener_id;
            if (!trenerId) return;

            if (!countMap.has(trenerId)) {
                countMap.set(trenerId, new Set());
            }

            countMap.get(trenerId)!.add(row.clan_id);
        });

        const withCounts = baseTrainers.map((t) => ({
            ...t,
            membersCount: countMap.get(t.id)?.size ?? 0,
        }));

        setTrainers(withCounts);
        setLoading(false);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    useEffect(() => {
        void loadTrainers();
    }, []);

    const filtered = useMemo(
        () =>
            trainers.filter((t) =>
                t.name.toLowerCase().includes(search.toLowerCase())
            ),
        [trainers, search]
    );

    // -----------------------------------------
    // PROMOTE MEMBER -> TRAINER
    // -----------------------------------------

    const openAddModal = async () => {
        setAddOpen(true);
        setLoadingAddList(true);

        const trainerClanIds = trainers.map((t) => t.clanId);

        const { data, error } = await supabase
            .from("clanovi")
            .select("id, ime_prezime, telefon, status")
            .eq("status", "aktivni");

        if (error) {
            setError(error.message);
            setLoadingAddList(false);
            return;
        }

        const filteredMembers: Clan[] = (data as Clan[]).filter(
            (c) => !trainerClanIds.includes(c.id)
        );

        setAvailableMembers(filteredMembers);
        setLoadingAddList(false);
    };

    const promoteToTrainer = async (clan: Clan) => {
        const { error } = await supabase.from("treneri").insert({
            clan_id: clan.id,
            note: null,
        });

        if (error) {
            setError(error.message);
            return;
        }

        await loadTrainers();
        setAddOpen(false);
    };

    // -----------------------------------------
    // HELPER: osiguraj da trener ima bar jedan trening
    // -----------------------------------------

    const ensureTrainerTraining = async (
        trainerId: string
    ): Promise<string | null> => {
        // pokušaj naći postojeći trening za tog trenera
        const { data: existing, error: existingError } = await supabase
            .from("treninzi")
            .select("id")
            .eq("trener_id", trainerId)
            .limit(1);

        if (existingError) {
            setError(existingError.message);
            return null;
        }

        const existingRows = (existing as TreningIdRow[]) ?? [];
        if (existingRows.length > 0) {
            return existingRows[0].id;
        }

        // ako nema nijedan, napravi "Individualni plan"
        const nowIso = new Date().toISOString();

        const insertResult = await supabase
            .from("treninzi")
            .insert({
                trener_id: trainerId,
                naziv: "Individualni plan",
                opis: null,
                pocetak_treninga: nowIso,
                kraj_treninga: null,
            })
            .select("id")
            .single();

        if (insertResult.error) {
            setError(insertResult.error.message);
            return null;
        }

        const inserted = insertResult.data as TreningIdRow | null;
        if (!inserted) return null;

        return inserted.id;
    };

    // -----------------------------------------
    // MANAGE MEMBERS (LISTA)
    // -----------------------------------------

    const openManageModal = async (trainer: TrainerCard) => {
        setSelectedTrainer(trainer);
        setManageOpen(true);
        setLoadingManaged(true);

        const { data, error } = await supabase
            .from("clanovi_treninga")
            .select(
                `
                id,
                clanovi:clan_id (id, ime_prezime, telefon),
                treninzi:trening_id (trener_id)
            `
            )
            .eq("treninzi.trener_id", trainer.id);

        if (error) {
            setError(error.message);
            setLoadingManaged(false);
            return;
        }

        const unique = new Map<string, Clan>();

        (data ?? []).forEach((rowRaw) => {
            const row = rowRaw as ManageRow;

            const c = Array.isArray(row.clanovi)
                ? row.clanovi[0]
                : row.clanovi;
            if (!c) return;

            if (!unique.has(c.id)) {
                unique.set(c.id, {
                    id: c.id,
                    ime_prezime: c.ime_prezime,
                    telefon: c.telefon,
                    status: "aktivni",
                });
            }
        });

        setManagedMembers(Array.from(unique.values()));
        setLoadingManaged(false);
    };

    // -----------------------------------------
    // ADD MEMBER TO TRAINER
    // -----------------------------------------

    const openAddMemberModal = async () => {
        if (!selectedTrainer) return;

        setAddMemberOpen(true);
        setLoadingCandidates(true);

        const { data, error } = await supabase
            .from("clanovi")
            .select("id, ime_prezime, telefon, status")
            .eq("status", "aktivni");

        if (error) {
            setError(error.message);
            setLoadingCandidates(false);
            return;
        }

        const currentIds = new Set(managedMembers.map((m) => m.id));
        const candidates: Clan[] = (data as Clan[]).filter(
            (c) => !currentIds.has(c.id)
        );

        setCandidateMembers(candidates);
        setLoadingCandidates(false);
    };

    const addMemberToTrainer = async (clan: Clan) => {
        if (!selectedTrainer) return;

        const treningId = await ensureTrainerTraining(selectedTrainer.id);
        if (!treningId) return;

        const { error } = await supabase.from("clanovi_treninga").insert({
            trening_id: treningId,
            clan_id: clan.id,
            status: "Prijavljen",
        });

        if (error) {
            setError(error.message);
            return;
        }

        // osvježi listu članova
        await openManageModal(selectedTrainer);
        setAddMemberOpen(false);
    };

    // -----------------------------------------
    // REMOVE MEMBER FROM TRAINER
    // -----------------------------------------

    const removeMemberFromTrainer = async (member: Clan) => {
        if (!selectedTrainer) return;

        // nađi sve treninge tog trenera
        const { data: treningData, error: treningError } = await supabase
            .from("treninzi")
            .select("id")
            .eq("trener_id", selectedTrainer.id);

        if (treningError) {
            setError(treningError.message);
            return;
        }

        const treningIds = ((treningData as TreningIdRow[]) ?? []).map(
            (t) => t.id
        );

        if (treningIds.length === 0) {
            return;
        }

        const { error: deleteError } = await supabase
            .from("clanovi_treninga")
            .delete()
            .eq("clan_id", member.id)
            .in("trening_id", treningIds);

        if (deleteError) {
            setError(deleteError.message);
            return;
        }

        // osvježi manage listu
        await openManageModal(selectedTrainer);
    };

    // -----------------------------------------
    // UI
    // -----------------------------------------

    return (
        <div className="px-8 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--color-yellow)]">
                        Treneri
                    </h1>
                    <p className="text-sm text-yellow-200/70">
                        Upravljanje trenerima i članovima koje treniraju.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Pretraga trenera..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-4 py-2 rounded-full bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300 min-w-[260px]"
                    />

                    <button
                        onClick={openAddModal}
                        className="px-5 py-2.5 rounded-full bg-[var(--color-yellow)] text-black font-semibold text-sm shadow-[0_12px_0_rgba(0,0,0,0.65)] hover:translate-y-[1px] active:translate-y-[2px] transition"
                    >
                        Dodaj trenera
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-400 bg-red-900/30 border border-red-700/60 rounded-lg px-4 py-2 inline-block">
                    Greška: {error}
                </div>
            )}

            {loading ? (
                <div className="text-yellow-300">Učitavanje…</div>
            ) : filtered.length === 0 ? (
                <div className="text-yellow-300/70">Nema trenera.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((t, i) => (
                        <div
                            key={t.id}
                            className="rounded-3xl bg-[var(--color-card)] border border-yellow-400/40 shadow-[0_18px_0_rgba(0,0,0,0.6)] px-6 py-5"
                        >
                            <div className="flex justify-between">
                                <div>
                                    <div className="text-lg font-semibold text-[var(--color-yellow)]">
                                        {t.name}
                                    </div>
                                    {t.phone && (
                                        <div className="text-sm text-yellow-200/70">
                                            {t.phone}
                                        </div>
                                    )}
                                    {t.note && (
                                        <div className="mt-2 text-xs text-yellow-200/70 max-w-xs">
                                            {t.note}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-yellow-300/60">
                                    #{i + 1}
                                </div>
                            </div>

                            <div className="mt-5 flex justify-between items-center">
                                <div className="text-sm text-yellow-200">
                                    Članova:{" "}
                                    <span className="font-semibold">
                                        {t.membersCount}
                                    </span>
                                </div>

                                <button
                                    onClick={() => openManageModal(t)}
                                    className="px-4 py-1.5 rounded-full border border-yellow-400 text-[13px] text-yellow-100 hover:bg-yellow-400/10 transition"
                                >
                                    Upravljaj članovima
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ----------------- ADD TRAINER MODAL ----------------- */}

            {addOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-full max-w-lg bg-[var(--color-card)] border border-yellow-400/60 rounded-2xl shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-yellow-300">
                                Dodaj trenera
                            </h2>
                            <button
                                onClick={() => setAddOpen(false)}
                                className="text-yellow-200/70"
                            >
                                Zatvori
                            </button>
                        </div>

                        {loadingAddList ? (
                            <div className="text-yellow-200/70">
                                Učitavanje…
                            </div>
                        ) : availableMembers.length === 0 ? (
                            <div className="text-yellow-200/70">
                                Nema dostupnih članova.
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {availableMembers.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex justify-between items-center border border-yellow-400/30 rounded-xl px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-yellow-100 font-medium">
                                                {c.ime_prezime}
                                            </div>
                                            {c.telefon && (
                                                <div className="text-xs text-yellow-200/70">
                                                    {c.telefon}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() =>
                                                promoteToTrainer(c)
                                            }
                                            className="px-3 py-1 bg-yellow-300 text-black rounded-full text-xs font-semibold"
                                        >
                                            Promoviši
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ---------------- MANAGE MEMBERS MODAL ---------------- */}

            {manageOpen && selectedTrainer && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-full max-w-lg bg-[var(--color-card)] border border-yellow-400/60 rounded-2xl shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-yellow-300">
                                    {selectedTrainer.name}
                                </h2>
                                <p className="text-xs text-yellow-200/70">
                                    Članovi koje trenira
                                </p>
                            </div>
                            <button
                                onClick={() => setManageOpen(false)}
                                className="text-yellow-200/70"
                            >
                                Zatvori
                            </button>
                        </div>

                        {loadingManaged ? (
                            <div className="text-yellow-200/70">
                                Učitavanje…
                            </div>
                        ) : managedMembers.length === 0 ? (
                            <div className="text-yellow-200/70">
                                Ovaj trener nema članova.
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {managedMembers.map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-center justify-between border border-yellow-400/30 rounded-xl px-3 py-2 text-yellow-100"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {m.ime_prezime}
                                            </div>
                                            {m.telefon && (
                                                <div className="text-xs text-yellow-200/70">
                                                    {m.telefon}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeMemberFromTrainer(m)
                                            }
                                            className="text-[11px] px-3 py-1 rounded-full border border-red-400/80 text-red-200 hover:bg-red-500/10"
                                        >
                                            Ukloni
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={openAddMemberModal}
                            className="w-full border border-yellow-400/50 rounded-full py-2 text-yellow-200/80 text-sm mt-1 hover:bg-yellow-400/5"
                        >
                            + Dodaj člana
                        </button>
                    </div>
                </div>
            )}

            {/* ---------- ADD MEMBER TO TRAINER MODAL ---------- */}

            {addMemberOpen && selectedTrainer && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="w-full max-w-lg bg-[var(--color-card)] border border-yellow-400/60 rounded-2xl shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-yellow-300">
                                    Dodaj člana treneru
                                </h2>
                                <p className="text-xs text-yellow-200/70">
                                    {selectedTrainer.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setAddMemberOpen(false)}
                                className="text-yellow-200/70"
                            >
                                Zatvori
                            </button>
                        </div>

                        {loadingCandidates ? (
                            <div className="text-yellow-200/70">
                                Učitavanje…
                            </div>
                        ) : candidateMembers.length === 0 ? (
                            <div className="text-yellow-200/70">
                                Nema članova koji nisu već kod ovog trenera.
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {candidateMembers.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex justify-between items-center border border-yellow-400/30 rounded-xl px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-yellow-100 font-medium">
                                                {c.ime_prezime}
                                            </div>
                                            {c.telefon && (
                                                <div className="text-xs text-yellow-200/70">
                                                    {c.telefon}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                addMemberToTrainer(c)
                                            }
                                            className="px-3 py-1 bg-yellow-300 text-black rounded-full text-xs font-semibold"
                                        >
                                            Dodaj
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
