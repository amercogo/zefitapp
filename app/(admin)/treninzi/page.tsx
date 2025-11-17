"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// ------------ Tipovi ------------

type Clan = {
    id: string;
    ime_prezime: string;
    telefon: string | null;
    status: string;
};

type TrainerOption = {
    id: string; // treneri.id
    name: string; // ime_prezime iz clanovi
};

type Training = {
    id: string;
    naziv: string;
    opis: string | null;
    pocetak: string; // ISO
    kraj: string | null; // ISO
    trenerName: string;
    trenerId: string;
    durationMinutes: number;
};

type TreningRow = {
    id: string;
    naziv: string;
    opis: string | null;
    pocetak_treninga: string;
    kraj_treninga: string | null;
    treneri:
        | {
        id: string;
        clanovi:
            | { ime_prezime: string }
            | { ime_prezime: string }[]
            | null;
    }
        | {
        id: string;
        clanovi:
            | { ime_prezime: string }
            | { ime_prezime: string }[]
            | null;
    }[]
        | null;
};

type TrainerRow = {
    id: string;
    clanovi:
        | {
        id: string;
        ime_prezime: string;
    }
        | {
        id: string;
        ime_prezime: string;
    }[]
        | null;
};

type MemberRow = {
    id: string; // clanovi_treninga id
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

// ------------ Helperi ------------

function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay(); // 0 ned, 1 pon...
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatTime(dateIso: string): string {
    const d = new Date(dateIso);
    return d.toLocaleTimeString("bs-BA", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDate(dateIso: string): string {
    const d = new Date(dateIso);
    return d.toLocaleDateString("bs-BA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function diffMinutes(startIso: string, endIso: string | null): number {
    if (!endIso) return 60;
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const diff = Math.round((e - s) / 60000);
    return diff > 0 ? diff : 60;
}

// ------------ Komponenta ------------

export default function TreninziPage() {
    // kalendar – početak sedmice
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // modali
    const [addOpen, setAddOpen] = useState(false); // dodaj/uredi
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingTrainingId, setEditingTrainingId] = useState<string | null>(
        null
    );

    const [trainers, setTrainers] = useState<TrainerOption[]>([]);
    const [loadingTrainers, setLoadingTrainers] = useState(false);

    const [selectedTraining, setSelectedTraining] = useState<Training | null>(
        null
    );
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [members, setMembers] = useState<Clan[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [candidateMembers, setCandidateMembers] = useState<Clan[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");

    // forma za novi/uređivanje treninga
    const [formName, setFormName] = useState("");
    const [formDate, setFormDate] = useState("");
    const [formTime, setFormTime] = useState("");
    const [formDuration, setFormDuration] = useState("60");
    const [formTrainerId, setFormTrainerId] = useState("");
    const [formOpis, setFormOpis] = useState("");

    // ---------------- LOAD TRAININGS ZA SEDMICU ----------------

    const loadTrainings = async (start: Date) => {
        setLoading(true);
        setError(null);

        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        const fromIso = start.toISOString();
        const toIso = end.toISOString();

        const { data, error: trError } = await supabase
            .from("treninzi")
            .select(
                `
                id,
                naziv,
                opis,
                pocetak_treninga,
                kraj_treninga,
                treneri:trener_id (
                    id,
                    clanovi:clan_id (
                        ime_prezime
                    )
                )
            `
            )
            .gte("pocetak_treninga", fromIso)
            .lt("pocetak_treninga", toIso)
            .order("pocetak_treninga", { ascending: true });

        if (trError) {
            setError(trError.message);
            setLoading(false);
            return;
        }

        const mapped: Training[] =
            (data as TreningRow[])?.map((row) => {
                const trenerJoin = row.treneri;
                const trenerObj = Array.isArray(trenerJoin)
                    ? trenerJoin[0]
                    : trenerJoin;
                const clanJoin = trenerObj?.clanovi;
                const clanObj = Array.isArray(clanJoin)
                    ? clanJoin[0]
                    : clanJoin;

                const trenerName = clanObj?.ime_prezime ?? "Trener";

                return {
                    id: row.id,
                    naziv: row.naziv,
                    opis: row.opis,
                    pocetak: row.pocetak_treninga,
                    kraj: row.kraj_treninga,
                    trenerName,
                    trenerId: trenerObj?.id ?? "",
                    durationMinutes: diffMinutes(
                        row.pocetak_treninga,
                        row.kraj_treninga
                    ),
                };
            }) ?? [];

        setTrainings(mapped);
        setLoading(false);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    useEffect(() => {
        void loadTrainings(weekStart);
    }, [weekStart]);

    const daysOfWeek = useMemo(() => {
        const labels = ["pon", "uto", "sri", "čet", "pet", "sub", "ned"];
        const arr: {
            label: string;
            date: Date;
            iso: string;
            short: string;
        }[] = [];

        for (let i = 0; i < 7; i += 1) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const iso = d.toISOString().slice(0, 10);
            const short = d.toLocaleDateString("bs-BA", {
                day: "2-digit",
                month: "2-digit",
            });
            arr.push({
                label: labels[i],
                date: d,
                iso,
                short,
            });
        }

        return arr;
    }, [weekStart]);

    const trainingsByDay = useMemo(() => {
        const map = new Map<string, Training[]>();
        trainings.forEach((t) => {
            const key = t.pocetak.slice(0, 10);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        });
        return map;
    }, [trainings]);

    const upcomingTrainings = trainings;

    // ---------------- LOAD TRAINERS ZA SELECT ----------------

    const loadTrainers = async () => {
        setLoadingTrainers(true);
        const { data, error } = await supabase
            .from("treneri")
            .select(
                `
                id,
                clanovi:clan_id (
                    id,
                    ime_prezime
                )
            `
            );

        if (error) {
            setError(error.message);
            setLoadingTrainers(false);
            return;
        }

        const options: TrainerOption[] =
            (data as TrainerRow[])?.map((row) => {
                const clanJoin = row.clanovi;
                const clanObj = Array.isArray(clanJoin)
                    ? clanJoin[0]
                    : clanJoin;

                return {
                    id: row.id,
                    name: clanObj?.ime_prezime ?? "Trener",
                };
            }) ?? [];

        setTrainers(options);
        setLoadingTrainers(false);
    };

    // ---------------- DODAJ / UREDI TRENING ----------------

    const resetForm = () => {
        setFormName("");
        setFormDate("");
        setFormTime("");
        setFormDuration("60");
        setFormTrainerId("");
        setFormOpis("");
        setEditingTrainingId(null);
        setIsEditMode(false);
    };

    const openAddTrainingModal = async () => {
        resetForm();
        setIsEditMode(false);
        setAddOpen(true);
        await loadTrainers();

        const today = new Date();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const inThisWeek = today >= weekStart && today < weekEnd;
        const baseDate = inThisWeek ? today : weekStart;

        const iso = baseDate.toISOString().slice(0, 10);
        setFormDate(iso);
        setFormTime("09:00");
        setFormDuration("60");
        if (trainers.length > 0) setFormTrainerId(trainers[0].id);
    };

    const openEditTrainingModal = async (training: Training) => {
        setIsEditMode(true);
        setEditingTrainingId(training.id);
        setAddOpen(true);
        await loadTrainers();

        setFormName(training.naziv);
        setFormOpis(training.opis ?? "");
        setFormTrainerId(training.trenerId);

        const startDate = new Date(training.pocetak);
        const dateStr = startDate.toISOString().slice(0, 10);
        const timeStr = startDate
            .toTimeString()
            .slice(0, 5); // HH:MM

        setFormDate(dateStr);
        setFormTime(timeStr);
        setFormDuration(String(training.durationMinutes));
    };

    const closeAddModal = () => {
        setAddOpen(false);
        resetForm();
    };

    const submitTraining = async () => {
        if (!formName || !formDate || !formTime || !formTrainerId) {
            setError("Popuni naziv, datum, vrijeme i trenera.");
            return;
        }

        const startIso = new Date(
            `${formDate}T${formTime}:00`
        ).toISOString();

        const duration = Number(formDuration) || 60;
        const endDate = new Date(startIso);
        endDate.setMinutes(endDate.getMinutes() + duration);
        const endIso = endDate.toISOString();

        if (isEditMode && editingTrainingId) {
            // UPDATE
            const { error: updateError } = await supabase
                .from("treninzi")
                .update({
                    trener_id: formTrainerId,
                    naziv: formName,
                    opis: formOpis || null,
                    pocetak_treninga: startIso,
                    kraj_treninga: endIso,
                })
                .eq("id", editingTrainingId);

            if (updateError) {
                setError(updateError.message);
                return;
            }
        } else {
            // INSERT
            const { error } = await supabase.from("treninzi").insert({
                trener_id: formTrainerId,
                naziv: formName,
                opis: formOpis || null,
                pocetak_treninga: startIso,
                kraj_treninga: endIso,
            });

            if (error) {
                setError(error.message);
                return;
            }
        }

        closeAddModal();
        await loadTrainings(weekStart);
    };

    // ---------------- DETAILS & MEMBERS ----------------

    const openTrainingDetails = async (training: Training) => {
        setSelectedTraining(training);
        setDetailsOpen(true);
        setLoadingMembers(true);
        setError(null);

        const { data, error } = await supabase
            .from("clanovi_treninga")
            .select(
                `
                id,
                clanovi:clan_id (
                    id,
                    ime_prezime,
                    telefon,
                    status
                )
            `
            )
            .eq("trening_id", training.id);

        if (error) {
            setError(error.message);
            setLoadingMembers(false);
            return;
        }

        const list: Clan[] = [];

        (data as MemberRow[]).forEach((row) => {
            const cJoin = row.clanovi;
            const c = Array.isArray(cJoin) ? cJoin[0] : cJoin;
            if (!c) return;

            list.push({
                id: c.id,
                ime_prezime: c.ime_prezime,
                telefon: c.telefon,
                status: "aktivni",
            });
        });

        setMembers(list);
        setLoadingMembers(false);
    };

    const removeMemberFromTraining = async (member: Clan) => {
        if (!selectedTraining) return;

        const { error } = await supabase
            .from("clanovi_treninga")
            .delete()
            .eq("trening_id", selectedTraining.id)
            .eq("clan_id", member.id);

        if (error) {
            setError(error.message);
            return;
        }

        await openTrainingDetails(selectedTraining);
    };

    // ---------------- DELETE TRAINING ----------------

    const deleteTraining = async () => {
        if (!selectedTraining) return;

        // prvo obriši veze članova (za svaki slučaj ako nema CASCADE)
        const { error: delMembersErr } = await supabase
            .from("clanovi_treninga")
            .delete()
            .eq("trening_id", selectedTraining.id);

        if (delMembersErr) {
            setError(delMembersErr.message);
            return;
        }

        const { error: delTrainErr } = await supabase
            .from("treninzi")
            .delete()
            .eq("id", selectedTraining.id);

        if (delTrainErr) {
            setError(delTrainErr.message);
            return;
        }

        setDetailsOpen(false);
        setSelectedTraining(null);
        await loadTrainings(weekStart);
    };

    // ---------------- ADD MEMBER TO TRAINING ----------------

    const openAddMemberModal = async () => {
        if (!selectedTraining) return;
        setAddMemberOpen(true);
        setLoadingCandidates(true);
        setMemberSearch("");

        const { data, error } = await supabase
            .from("clanovi")
            .select("id, ime_prezime, telefon, status")
            .eq("status", "aktivni");

        if (error) {
            setError(error.message);
            setLoadingCandidates(false);
            return;
        }

        const currentIds = new Set(members.map((m) => m.id));
        const candidates: Clan[] = (data as Clan[]).filter(
            (c) => !currentIds.has(c.id)
        );

        setCandidateMembers(candidates);
        setLoadingCandidates(false);
    };

    const filteredCandidates = useMemo(
        () =>
            candidateMembers.filter((c) =>
                c.ime_prezime
                    .toLowerCase()
                    .includes(memberSearch.toLowerCase())
            ),
        [candidateMembers, memberSearch]
    );

    const addMemberToTraining = async (clan: Clan) => {
        if (!selectedTraining) return;

        const { error } = await supabase
            .from("clanovi_treninga")
            .insert({
                trening_id: selectedTraining.id,
                clan_id: clan.id,
                status: "Prijavljen",
            });

        if (error) {
            setError(error.message);
            return;
        }

        await openTrainingDetails(selectedTraining);
        setAddMemberOpen(false);
    };

    // ---------------- RECURRING – rezerviši naredne sedmice ----------------

    const createRecurringTrainings = async (weeks: number) => {
        if (!selectedTraining) return;

        const toInsert = [];
        const baseStart = new Date(selectedTraining.pocetak);
        const baseEnd = selectedTraining.kraj
            ? new Date(selectedTraining.kraj)
            : null;

        for (let i = 1; i <= weeks; i += 1) {
            const start = new Date(baseStart);
            start.setDate(start.getDate() + i * 7);

            let endIso: string | null = null;
            if (baseEnd) {
                const end = new Date(baseEnd);
                end.setDate(end.getDate() + i * 7);
                endIso = end.toISOString();
            }

            toInsert.push({
                trener_id: selectedTraining.trenerId,
                naziv: selectedTraining.naziv,
                opis: selectedTraining.opis,
                pocetak_treninga: start.toISOString(),
                kraj_treninga: endIso,
            });
        }

        const { error } = await supabase.from("treninzi").insert(toInsert);

        if (error) {
            setError(error.message);
            return;
        }

        await loadTrainings(weekStart);
    };

    // ---------------- UI ----------------

    return (
        <div className="px-8 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--color-yellow)]">
                        Treninzi
                    </h1>
                    <p className="text-sm text-yellow-200/70">
                        Dodavanje treninga, odabir trenera i pregled rasporeda
                        po sedmici.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAddTrainingModal}
                    className="px-6 py-2.5 rounded-full bg-[var(--color-yellow)] text-black font-semibold text-sm shadow-[0_12px_0_rgba(0,0,0,0.65)] hover:translate-y-[1px] active:translate-y-[2px] transition"
                >
                    Dodaj trening
                </button>
            </div>

            {error && (
                <div className="text-sm text-red-400 bg-red-900/30 border border-red-700/60 rounded-lg px-4 py-2 inline-block">
                    Greška: {error}
                </div>
            )}

            {/* KALENDAR SEDMICE */}
            <div className="rounded-3xl bg-[var(--color-card)] border border-yellow-400/40 shadow-[0_18px_0_rgba(0,0,0,0.6)] px-5 py-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-[var(--color-yellow)]">
                        Kalendar (sedmica)
                    </h2>
                    <div className="flex gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                const d = new Date(weekStart);
                                d.setDate(d.getDate() - 7);
                                setWeekStart(getMonday(d));
                            }}
                            className="px-3 py-1 rounded-full border border-yellow-400/60 text-yellow-100 hover:bg-yellow-400/10"
                        >
                            ◀ Prethodna
                        </button>
                        <button
                            type="button"
                            onClick={() => setWeekStart(getMonday(new Date()))}
                            className="px-3 py-1 rounded-full border border-yellow-400/60 text-yellow-100 hover:bg-yellow-400/10"
                        >
                            Danas
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const d = new Date(weekStart);
                                d.setDate(d.getDate() + 7);
                                setWeekStart(getMonday(d));
                            }}
                            className="px-3 py-1 rounded-full border border-yellow-400/60 text-yellow-100 hover:bg-yellow-400/10"
                        >
                            Sljedeća ▶
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {daysOfWeek.map((day) => {
                        const dayTrainings =
                            trainingsByDay.get(day.iso) ?? [];
                        return (
                            <div
                                key={day.iso}
                                className="min-h-[120px] rounded-2xl border border-yellow-400/35 px-3 py-2 flex flex-col gap-2"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="uppercase text-[11px] text-yellow-200/80">
                                        {day.label}
                                    </span>
                                    <span className="text-[11px] text-yellow-200/60">
                                        {day.short}
                                    </span>
                                </div>
                                <div className="flex-1 space-y-1">
                                    {dayTrainings.length === 0 ? (
                                        <span className="text-[11px] text-yellow-200/40">
                                            Nema treninga
                                        </span>
                                    ) : (
                                        dayTrainings.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() =>
                                                    void openTrainingDetails(t)
                                                }
                                                className="w-full text-left text-[11px] rounded-xl bg-yellow-400/10 border border-yellow-400/70 px-2 py-1 hover:bg-yellow-400/20"
                                            >
                                                <div className="font-semibold text-[var(--color-yellow)]">
                                                    {t.naziv}
                                                </div>
                                                <div className="text-[10px] text-yellow-200/80">
                                                    {formatTime(t.pocetak)} •{" "}
                                                    {t.durationMinutes} min
                                                </div>
                                                <div className="text-[10px] text-yellow-200/80">
                                                    {t.trenerName}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* NADOLAZEĆI TRENINGI */}
            <div className="rounded-3xl bg-[var(--color-card)] border border-yellow-400/40 shadow-[0_18px_0_rgba(0,0,0,0.6)] px-5 py-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-[var(--color-yellow)]">
                        Nadolazeći treninzi
                    </h2>
                    <span className="text-xs text-yellow-200/70">
                        {upcomingTrainings.length} ukupno
                    </span>
                </div>

                {loading ? (
                    <div className="text-yellow-200/70 text-sm">
                        Učitavanje…
                    </div>
                ) : upcomingTrainings.length === 0 ? (
                    <div className="text-yellow-200/70 text-sm">
                        Nema treninga u ovoj sedmici.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {upcomingTrainings.map((t, idx) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => void openTrainingDetails(t)}
                                className="w-full text-left rounded-2xl border border-yellow-400/40 px-4 py-3 hover:bg-yellow-400/5"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-base font-semibold text-[var(--color-yellow)]">
                                        {t.naziv}
                                    </span>
                                    <span className="text-[11px] text-yellow-200/60">
                                        #TR{idx + 1}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-yellow-200/80">
                                    {formatDate(t.pocetak)} •{" "}
                                    {formatTime(t.pocetak)} •{" "}
                                    {t.durationMinutes} min
                                </div>
                                <div className="mt-1 text-xs text-yellow-200/80">
                                    {t.trenerName}
                                </div>
                                {t.opis && (
                                    <div className="mt-1 text-xs text-yellow-200/70">
                                        {t.opis}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL: DODAJ / UREDI TRENING */}
            {addOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-xl rounded-2xl bg-[var(--color-card)] border border-yellow-400/60 shadow-[0_20px_0_rgba(0,0,0,0.75)] p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-[var(--color-yellow)]">
                                {isEditMode ? "Uredi trening" : "Dodaj trening"}
                            </h2>
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="text-yellow-200/70 text-sm hover:text-yellow-100"
                            >
                                Zatvori
                            </button>
                        </div>

                        {loadingTrainers ? (
                            <div className="text-sm text-yellow-200/70">
                                Učitavanje trenera…
                            </div>
                        ) : trainers.length === 0 ? (
                            <div className="text-sm text-yellow-200/70">
                                Nema trenera. Dodaj trenera prije kreiranja
                                treninga.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-1 text-sm">
                                    <label className="text-yellow-200/80">
                                        Naziv treninga
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                                        value={formName}
                                        onChange={(e) =>
                                            setFormName(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <label className="text-yellow-200/80">
                                            Datum
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                                            value={formDate}
                                            onChange={(e) =>
                                                setFormDate(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-yellow-200/80">
                                            Vrijeme
                                        </label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                                            value={formTime}
                                            onChange={(e) =>
                                                setFormTime(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <label className="text-yellow-200/80">
                                            Trajanje (min)
                                        </label>
                                        <input
                                            type="number"
                                            min={10}
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                                            value={formDuration}
                                            onChange={(e) =>
                                                setFormDuration(
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-yellow-200/80">
                                            Trener
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                                            value={formTrainerId}
                                            onChange={(e) =>
                                                setFormTrainerId(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Odaberi trenera
                                            </option>
                                            {trainers.map((t) => (
                                                <option
                                                    key={t.id}
                                                    value={t.id}
                                                >
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-yellow-200/80">
                                        Opis (opcionalno)
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                                        value={formOpis}
                                        onChange={(e) =>
                                            setFormOpis(e.target.value)
                                        }
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={submitTraining}
                                    className="w-full mt-2 px-4 py-2.5 rounded-full bg-[var(--color-yellow)] text-black font-semibold text-sm shadow-[0_10px_0_rgba(0,0,0,0.7)] hover:translate-y-[1px] active:translate-y-[2px] transition"
                                >
                                    {isEditMode
                                        ? "Spasi izmjene"
                                        : "Spasi trening"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: DETALJI TRENINGA */}
            {detailsOpen && selectedTraining && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-2xl rounded-2xl bg-[var(--color-card)] border border-yellow-400/60 shadow-[0_20px_0_rgba(0,0,0,0.75)] p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-[var(--color-yellow)]">
                                    {selectedTraining.naziv}
                                </h2>
                                <p className="text-xs text-yellow-200/70">
                                    {formatDate(selectedTraining.pocetak)} •{" "}
                                    {formatTime(selectedTraining.pocetak)} •{" "}
                                    {selectedTraining.durationMinutes} min
                                </p>
                                <p className="text-xs text-yellow-200/70 mt-1">
                                    Trener: {selectedTraining.trenerName}
                                </p>
                                {selectedTraining.opis && (
                                    <p className="mt-2 text-sm text-yellow-200/80 max-w-xl">
                                        {selectedTraining.opis}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        void openEditTrainingModal(
                                            selectedTraining
                                        )
                                    }
                                    className="text-[11px] px-3 py-1 rounded-full border border-yellow-400/80 text-yellow-100 hover:bg-yellow-400/10"
                                >
                                    Uredi trening
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void createRecurringTrainings(4) // 4 sedmice – promijeni po želji
                                    }
                                    className="text-[11px] px-3 py-1 rounded-full border border-yellow-400/80 text-yellow-100 hover:bg-yellow-400/10"
                                >
                                    Rezerviši isti termin 4 sedmice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void deleteTraining()}
                                    className="text-[11px] px-3 py-1 rounded-full border border-red-500/80 text-red-200 hover:bg-red-500/10"
                                >
                                    Obriši trening
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailsOpen(false)}
                                    className="text-yellow-200/70 text-sm hover:text-yellow-100"
                                >
                                    Zatvori
                                </button>
                            </div>
                        </div>

                        <div className="mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-semibold text-[var(--color-yellow)]">
                                    Članovi treninga
                                </h3>
                                <button
                                    type="button"
                                    onClick={openAddMemberModal}
                                    className="text-[11px] px-3 py-1 rounded-full border border-yellow-400/80 text-yellow-100 hover:bg-yellow-400/10"
                                >
                                    + Dodaj člana
                                </button>
                            </div>

                            {loadingMembers ? (
                                <div className="text-sm text-yellow-200/70">
                                    Učitavanje članova…
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-sm text-yellow-200/70">
                                    Nema članova na ovom treningu.
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {members.map((m) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between border border-yellow-400/30 rounded-xl px-3 py-2 text-sm text-yellow-100"
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
                                                    void removeMemberFromTraining(
                                                        m
                                                    )
                                                }
                                                className="text-[11px] px-3 py-1 rounded-full border border-red-400/80 text-red-200 hover:bg-red-500/10"
                                            >
                                                Ukloni
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: DODAJ ČLANA NA TRENING */}
            {addMemberOpen && selectedTraining && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="w-full max-w-xl rounded-2xl bg-[var(--color-card)] border border-yellow-400/60 shadow-[0_20px_0_rgba(0,0,0,0.75)] p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-[var(--color-yellow)]">
                                    Dodaj člana
                                </h2>
                                <p className="text-xs text-yellow-200/70">
                                    {selectedTraining.naziv}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAddMemberOpen(false)}
                                className="text-yellow-200/70 text-sm hover:text-yellow-100"
                            >
                                Zatvori
                            </button>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="text"
                                value={memberSearch}
                                onChange={(e) =>
                                    setMemberSearch(e.target.value)
                                }
                                placeholder="Pretraga članova (ime, prezime)…"
                                className="w-full px-3 py-2 rounded-full bg-black/60 border border-yellow-400/40 text-sm outline-none focus:ring-yellow-300"
                            />

                            {loadingCandidates ? (
                                <div className="text-sm text-yellow-200/70">
                                    Učitavanje članova…
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div className="text-sm text-yellow-200/70">
                                    Nema članova koji odgovaraju pretrazi ili
                                    su već dodani.
                                </div>
                            ) : (
                                <div className="max-h-72 overflow-y-auto space-y-2">
                                    {filteredCandidates.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex justify-between items-center border border-yellow-400/30 rounded-xl px-3 py-2 text-sm"
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
                                                    void addMemberToTraining(c)
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
                </div>
            )}
        </div>
    );
}
