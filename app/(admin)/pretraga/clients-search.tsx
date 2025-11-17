"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

type Status = "active" | "inactive";

type PaketInfo = {
    id: string;
    naziv: string;
    pocetak: string; // YYYY-MM-DD
    kraj: string | null;
    cijena: number;
    status: "active" | "expired" | "pending";
};

type UplataInfo = {
    id: string;
    datum: string; // YYYY-MM-DD
    iznos: number;
    nacin: "keš" | "kartica";
    paketNaziv: string;
};

type Client = {
    id: string;
    clanKod: string;
    imePrezime: string;
    telefon: string | null;
    email: string | null;
    status: Status;
    datumClanstva: string;
    napomena?: string;
    aktivanPaket?: string;
    isticeZaDana?: number; // <0 znači isteklo
    paketi: PaketInfo[];
    uplate: UplataInfo[];
};

type TipClanarine = {
    id: string;
    naziv: string;
    trajanje_dana: number;
    cijena_default: number;
};

type Tab = "info" | "finances";

function izracunajAktivanPaket(paketi: PaketInfo[]): {
    aktivanPaket?: string;
    isticeZaDana?: number;
} {
    const today = new Date();
    const activeRecord = paketi.find((p) => p.status === "active" && p.kraj);

    if (!activeRecord || !activeRecord.kraj) {
        return { aktivanPaket: undefined, isticeZaDana: undefined };
    }

    const endDate = new Date(activeRecord.kraj);
    const diffMs = endDate.getTime() - today.getTime();
    const isticeZaDana = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
        aktivanPaket: activeRecord.naziv,
        isticeZaDana,
    };
}

export function ClientsSearch() {
    // filteri
    const [ime, setIme] = useState("");
    const [prezime, setPrezime] = useState("");
    const [telefon, setTelefon] = useState("");
    const [status, setStatus] = useState<"all" | Status>("all");
    const [barcode, setBarcode] = useState("");

    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("info");
    const [loadingDetails, setLoadingDetails] = useState(false);

    // tipovi članarina (za Dodaj paket)
    const [tipovi, setTipovi] = useState<TipClanarine[]>([]);
    const [loadingTipovi, setLoadingTipovi] = useState(false);

    // edit ličnih info
    const [editImePrezime, setEditImePrezime] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editTelefon, setEditTelefon] = useState("");
    const [editNapomena, setEditNapomena] = useState("");
    const [savingInfo, setSavingInfo] = useState(false);

    // dodavanje paketa
    const [showAddPaket, setShowAddPaket] = useState(false);
    const [newPaketTipId, setNewPaketTipId] = useState("");
    const [newPaketPocetak, setNewPaketPocetak] = useState("");
    const [newPaketKraj, setNewPaketKraj] = useState("");
    const [newPaketCijena, setNewPaketCijena] = useState("");
    const [savingPaket, setSavingPaket] = useState(false);

    // dodavanje uplate
    const [showAddUplata, setShowAddUplata] = useState(false);
    const [newUplataPaketId, setNewUplataPaketId] = useState("");
    const [newUplataDatum, setNewUplataDatum] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [newUplataIznos, setNewUplataIznos] = useState("");
    const [savingUplata, setSavingUplata] = useState(false);

    const [deletingClient, setDeletingClient] = useState(false);

    // -------------------- 1) Učitaj listu clanova --------------------
    useEffect(() => {
        async function loadClients() {
            try {
                setLoadingClients(true);

                const { data, error } = await supabase
                    .from("clanovi")
                    .select(
                        "id, clan_kod, ime_prezime, telefon, email, status, napravljeno, napomena",
                    )
                    .order("napravljeno", { ascending: false });

                if (error) {
                    console.error(
                        "Greška pri učitavanju clanovi:",
                        JSON.stringify(error, null, 2),
                    );
                    return;
                }

                const mapped: Client[] = (data ?? []).map((row: any) => {
                    let mappedStatus: Status = "inactive";
                    if (row.status === "aktivni" || row.status === "active") {
                        mappedStatus = "active";
                    } else if (
                        row.status === "neaktivni" ||
                        row.status === "inactive"
                    ) {
                        mappedStatus = "inactive";
                    }

                    return {
                        id: row.id,
                        clanKod: row.clan_kod,
                        imePrezime: row.ime_prezime,
                        telefon: row.telefon ?? null,
                        email: row.email ?? null,
                        status: mappedStatus,
                        datumClanstva: row.napravljeno
                            ? row.napravljeno.slice(0, 10)
                            : "",
                        napomena: row.napomena ?? undefined,
                        aktivanPaket: undefined,
                        isticeZaDana: undefined,
                        paketi: [],
                        uplate: [],
                    };
                });

                setClients(mapped);

                if (!selectedClientId && mapped.length > 0) {
                    setSelectedClientId(mapped[0].id);
                }
            } catch (e) {
                console.error("Neočekivana greška pri učitavanju clanovi:", e);
            } finally {
                setLoadingClients(false);
            }
        }

        loadClients();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -------------------- 2) Učitaj tipove članarina --------------------
    useEffect(() => {
        async function loadTipovi() {
            try {
                setLoadingTipovi(true);
                const { data, error } = await supabase
                    .from("tipovi_clanarina")
                    .select("id, naziv, trajanje_dana, cijena_default")
                    .order("naziv", { ascending: true });

                if (error) {
                    console.error(
                        "Greška pri učitavanju tipovi_clanarina:",
                        JSON.stringify(error, null, 2),
                    );
                    return;
                }

                setTipovi(data ?? []);
            } catch (e) {
                console.error("Neočekivana greška pri učitavanju tipova:", e);
            } finally {
                setLoadingTipovi(false);
            }
        }

        loadTipovi();
    }, []);

    // trenutno selektovan klijent (iz filtrirane liste)
    const filteredClients = useMemo(() => {
        const list = clients;

        return list.filter((c) => {
            if (
                ime &&
                !c.imePrezime.toLowerCase().includes(ime.toLowerCase())
            )
                return false;

            if (
                prezime &&
                !c.imePrezime.toLowerCase().includes(prezime.toLowerCase())
            )
                return false;

            if (
                telefon &&
                !(c.telefon ?? "")
                    .toLowerCase()
                    .includes(telefon.toLowerCase())
            )
                return false;

            if (status !== "all" && c.status !== status) return false;

            if (
                barcode &&
                !c.clanKod.toLowerCase().includes(barcode.toLowerCase())
            )
                return false;

            return true;
        });
    }, [clients, ime, prezime, telefon, status, barcode]);

    const selectedClient = useMemo(
        () =>
            filteredClients.find((c) => c.id === selectedClientId) ??
            filteredClients[0] ??
            null,
        [filteredClients, selectedClientId],
    );

    // kad se otvori profil ili promijeni selectedClient, populiraj edit polja
    useEffect(() => {
        if (selectedClient && profileOpen) {
            setEditImePrezime(selectedClient.imePrezime);
            setEditEmail(selectedClient.email ?? "");
            setEditTelefon(selectedClient.telefon ?? "");
            setEditNapomena(selectedClient.napomena ?? "");
        }
    }, [selectedClient, profileOpen]);

    // -------------------- 3) Barkod pretraga --------------------
    function handleBarcodeSearch() {
        if (!barcode.trim()) return;
        const match = clients.find((c) =>
            c.clanKod.toLowerCase().includes(barcode.toLowerCase()),
        );
        if (match) {
            setSelectedClientId(match.id);
        }
    }

    // -------------------- 4) Učitaj detalje za selektovanog klijenta --------------------
    useEffect(() => {
        async function loadDetails(clientId: string) {
            try {
                setLoadingDetails(true);

                // 4.1 Paketi (clanarine_clanova + tipovi_clanarina)
                const { data: rawPaketi, error: errPaketi } = await supabase
                    .from("clanarine_clanova")
                    .select(
                        "id, cijena, pocetak, zavrsetak, status, tipovi_clanarina(naziv)",
                    )
                    .eq("clan_id", clientId)
                    .order("pocetak", { ascending: false });

                if (errPaketi) {
                    console.error(
                        "Greška pri učitavanju clanarine_clanova:",
                        JSON.stringify(errPaketi, null, 2),
                    );
                }

                const paketById = new Map<string, { naziv: string }>();

                const mappedPaketi: PaketInfo[] = (rawPaketi ?? []).map(
                    (row: any) => {
                        let mappedStatus: "active" | "expired" | "pending" =
                            "pending";
                        if (
                            row.status === "active" ||
                            row.status === "aktivna"
                        ) {
                            mappedStatus = "active";
                        } else if (
                            row.status === "expired" ||
                            row.status === "istekla"
                        ) {
                            mappedStatus = "expired";
                        } else {
                            mappedStatus = "pending";
                        }

                        const naziv = row.tipovi_clanarina?.naziv ?? "Paket";

                        paketById.set(row.id, { naziv });

                        return {
                            id: row.id,
                            naziv,
                            pocetak: row.pocetak ?? "",
                            kraj: row.zavrsetak ?? null,
                            cijena: Number(row.cijena ?? 0),
                            status: mappedStatus,
                        };
                    },
                );

                const { aktivanPaket, isticeZaDana } =
                    izracunajAktivanPaket(mappedPaketi);

                // 4.2 Uplate (placanja)
                const { data: rawUplate, error: errUplate } = await supabase
                    .from("placanja")
                    .select("id, iznos, datum_uplate, clanarina_clan_id")
                    .eq("clan_id", clientId)
                    .order("datum_uplate", { ascending: false });

                if (errUplate) {
                    console.error(
                        "Greška pri učitavanju placanja:",
                        JSON.stringify(errUplate, null, 2),
                    );
                }

                const mappedUplate: UplataInfo[] = (rawUplate ?? []).map(
                    (row: any) => {
                        const paketMeta =
                            row.clanarina_clan_id &&
                            paketById.get(row.clanarina_clan_id);
                        return {
                            id: row.id,
                            datum: row.datum_uplate
                                ? row.datum_uplate.slice(0, 10)
                                : "",
                            iznos: Number(row.iznos ?? 0),
                            nacin: "keš", // zasad samo keš (nema kolone u bazi)
                            paketNaziv: paketMeta?.naziv ?? "Paket",
                        };
                    },
                );

                // 4.3 Updejtaj tog klijenta u state
                setClients((prev) =>
                    prev.map((c) =>
                        c.id === clientId
                            ? {
                                ...c,
                                paketi: mappedPaketi,
                                uplate: mappedUplate,
                                aktivanPaket,
                                isticeZaDana,
                            }
                            : c,
                    ),
                );
            } catch (e) {
                console.error("Neočekivana greška pri učitavanju detalja:", e);
            } finally {
                setLoadingDetails(false);
            }
        }

        if (selectedClientId) {
            loadDetails(selectedClientId);
        }
    }, [selectedClientId]);

    // ukupno uplaćeno (trenutno suma svih uplata)
    const totalLastYear = useMemo(() => {
        if (!selectedClient) return 0;
        return selectedClient.uplate.reduce((s, u) => s + u.iznos, 0);
    }, [selectedClient]);

    // -------------------- 5) Spremi izmjene ličnih podataka --------------------
    async function handleSaveInfo() {
        if (!selectedClient) return;
        try {
            setSavingInfo(true);

            const { error } = await supabase
                .from("clanovi")
                .update({
                    ime_prezime: editImePrezime.trim(),
                    email: editEmail.trim() || null,
                    telefon: editTelefon.trim() || null,
                    napomena: editNapomena.trim() || null,
                })
                .eq("id", selectedClient.id);

            if (error) {
                console.error(
                    "Greška pri ažuriranju clanovi:",
                    JSON.stringify(error, null, 2),
                );
                alert("Greška pri čuvanju podataka klijenta.");
                return;
            }

            // update lokalno
            setClients((prev) =>
                prev.map((c) =>
                    c.id === selectedClient.id
                        ? {
                            ...c,
                            imePrezime: editImePrezime.trim(),
                            email: editEmail.trim() || null,
                            telefon: editTelefon.trim() || null,
                            napomena: editNapomena.trim() || undefined,
                        }
                        : c,
                ),
            );

            alert("Podaci su uspješno sačuvani.");
        } finally {
            setSavingInfo(false);
        }
    }

    // -------------------- 6) Dodaj paket --------------------
    async function handleAddPaket() {
        if (!selectedClient) return;
        if (!newPaketTipId || !newPaketPocetak || !newPaketKraj) {
            alert("Odaberi tip paketa i period (od-do).");
            return;
        }

        const tip = tipovi.find((t) => t.id === newPaketTipId);
        const cijenaNumber =
            newPaketCijena.trim() !== ""
                ? Number(newPaketCijena)
                : tip
                    ? Number(tip.cijena_default)
                    : 0;

        if (!cijenaNumber || isNaN(cijenaNumber)) {
            alert("Unesi ispravnu cijenu.");
            return;
        }

        try {
            setSavingPaket(true);

            const { data, error } = await supabase
                .from("clanarine_clanova")
                .insert({
                    clan_id: selectedClient.id,
                    tip_clanarine_id: newPaketTipId,
                    cijena: cijenaNumber,
                    pocetak: newPaketPocetak,
                    zavrsetak: newPaketKraj,
                    status: "active", // za sada aktivan – možeš kasnije dodati opciju
                })
                .select(
                    "id, cijena, pocetak, zavrsetak, status, tipovi_clanarina(naziv)",
                )
                .single();

            if (error) {
                console.error(
                    "Greška pri dodavanju paketa:",
                    JSON.stringify(error, null, 2),
                );
                alert("Greška pri dodavanju paketa.");
                return;
            }

            const inserted: PaketInfo = {
                id: data.id,
                naziv: (data.tipovi_clanarina as { naziv: string }[] | null)?.[0]?.naziv ?? "Paket",
                pocetak: data.pocetak ?? "",
                kraj: data.zavrsetak ?? null,
                cijena: Number(data.cijena ?? 0),
                status:
                    data.status === "active" || data.status === "aktivna"
                        ? "active"
                        : data.status === "expired" || data.status === "istekla"
                            ? "expired"
                            : "pending",
            };

            setClients((prev) =>
                prev.map((c) => {
                    if (c.id !== selectedClient.id) return c;
                    const newPaketi = [inserted, ...c.paketi];
                    const akt = izracunajAktivanPaket(newPaketi);
                    return {
                        ...c,
                        paketi: newPaketi,
                        ...akt,
                    };
                }),
            );

            // reset form
            setShowAddPaket(false);
            setNewPaketTipId("");
            setNewPaketPocetak("");
            setNewPaketKraj("");
            setNewPaketCijena("");

            alert("Paket je dodan.");
        } finally {
            setSavingPaket(false);
        }
    }

    // kad odaberemo tip paketa, popuni default cijenu
    function handleChangePaketTip(id: string) {
        setNewPaketTipId(id);
        const tip = tipovi.find((t) => t.id === id);
        if (tip) {
            setNewPaketCijena(String(tip.cijena_default));
        }
    }

    // -------------------- 7) Dodaj uplatu --------------------
    async function handleAddUplata() {
        if (!selectedClient) return;
        if (!newUplataPaketId) {
            alert("Odaberi paket za uplatu.");
            return;
        }
        if (!newUplataIznos.trim() || isNaN(Number(newUplataIznos))) {
            alert("Unesi iznos uplate.");
            return;
        }

        const iznosNumber = Number(newUplataIznos);
        const paket = selectedClient.paketi.find(
            (p) => p.id === newUplataPaketId,
        );

        try {
            setSavingUplata(true);

            const { data, error } = await supabase
                .from("placanja")
                .insert({
                    clan_id: selectedClient.id,
                    clanarina_clan_id: newUplataPaketId,
                    iznos: iznosNumber,
                    // ako želiš tačan datum iz inputa:
                    datum_uplate: new Date(
                        newUplataDatum + "T12:00:00",
                    ).toISOString(),
                })
                .select("id, iznos, datum_uplate, clanarina_clan_id")
                .single();

            if (error) {
                console.error(
                    "Greška pri dodavanju uplate:",
                    JSON.stringify(error, null, 2),
                );
                alert("Greška pri dodavanju uplate.");
                return;
            }

            const uplata: UplataInfo = {
                id: data.id,
                datum: data.datum_uplate
                    ? data.datum_uplate.slice(0, 10)
                    : newUplataDatum,
                iznos: Number(data.iznos ?? 0),
                nacin: "keš", // zasad fix
                paketNaziv: paket?.naziv ?? "Paket",
            };

            setClients((prev) =>
                prev.map((c) =>
                    c.id === selectedClient.id
                        ? { ...c, uplate: [uplata, ...c.uplate] }
                        : c,
                ),
            );

            setShowAddUplata(false);
            setNewUplataPaketId("");
            setNewUplataIznos("");
            setNewUplataDatum(new Date().toISOString().slice(0, 10));

            alert("Uplata je dodana.");
        } finally {
            setSavingUplata(false);
        }
    }

    // kada odabere paket u "Dodaj uplatu", popuni default iznos
    function handleChangeUplataPaket(id: string) {
        setNewUplataPaketId(id);
        const p = selectedClient?.paketi.find((pk) => pk.id === id);
        if (p) {
            setNewUplataIznos(String(p.cijena));
        }
    }

    // -------------------- 8) Brisanje klijenta --------------------
    async function handleDeleteClient() {
        if (!selectedClient) return;
        const confirmDelete = window.confirm(
            `Stvarno želiš obrisati klijenta "${selectedClient.imePrezime}" i sve povezane podatke?`,
        );
        if (!confirmDelete) return;

        try {
            setDeletingClient(true);

            const clientId = selectedClient.id;

            // 1) treneri za ovog clana
            const { data: treneriRows, error: errTreneri } = await supabase
                .from("treneri")
                .select("id")
                .eq("clan_id", clientId);

            if (errTreneri) {
                console.error(
                    "Greška pri čitanju treneri:",
                    JSON.stringify(errTreneri, null, 2),
                );
            }

            const trenerIds = (treneriRows ?? []).map((t: any) => t.id);

            // 2) obriši treninzi koji referenciraju te trenere
            if (trenerIds.length > 0) {
                const { error: errTreninzi } = await supabase
                    .from("treninzi")
                    .delete()
                    .in("trener_id", trenerIds);

                if (errTreninzi) {
                    console.error(
                        "Greška pri brisanju treninzi:",
                        JSON.stringify(errTreninzi, null, 2),
                    );
                }
            }

            // 3) obriši clanovi_treninga
            await supabase
                .from("clanovi_treninga")
                .delete()
                .eq("clan_id", clientId);

            // 4) obriši placanja
            await supabase.from("placanja").delete().eq("clan_id", clientId);

            // 5) obriši clanarine_clanova
            await supabase
                .from("clanarine_clanova")
                .delete()
                .eq("clan_id", clientId);

            // 6) obriši dolasci
            await supabase.from("dolasci").delete().eq("clan_id", clientId);

            // 7) obriši treneri
            await supabase.from("treneri").delete().eq("clan_id", clientId);

            // 8) na kraju obriši clanovi
            const { error: errClan } = await supabase
                .from("clanovi")
                .delete()
                .eq("id", clientId);

            if (errClan) {
                console.error(
                    "Greška pri brisanju clan:",
                    JSON.stringify(errClan, null, 2),
                );
                alert(
                    "Greška pri brisanju klijenta. Provjeri da li postoje dodatne ovisnosti u bazi.",
                );
                return;
            }

            // skini ga iz lokalnog state-a
            setClients((prev) => prev.filter((c) => c.id !== clientId));
            setProfileOpen(false);

            // reset selekcije
            const remaining = clients.filter((c) => c.id !== clientId);
            setSelectedClientId(remaining[0]?.id ?? null);

            alert("Klijent je uspješno obrisan.");
        } finally {
            setDeletingClient(false);
        }
    }

    // -------------------- RENDER --------------------
    return (
        <>
            {/* Glavna mreža: lijevo filter + rezultati, desno mini profil */}
            <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
                {/* L I J E V A  STRANA  – filteri + rezultati */}
                <div className="space-y-4">
                    {/* Gornji filteri + barkod search */}
                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/30 p-5 sm:p-6">
                        <div className="grid gap-4 lg:grid-cols-[2fr,2fr,2fr,1.5fr]">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Ime
                                </label>
                                <input
                                    value={ime}
                                    onChange={(e) => setIme(e.target.value)}
                                    className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    placeholder="Ime"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Prezime
                                </label>
                                <input
                                    value={prezime}
                                    onChange={(e) => setPrezime(e.target.value)}
                                    className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    placeholder="Prezime"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Broj telefona
                                </label>
                                <input
                                    value={telefon}
                                    onChange={(e) => setTelefon(e.target.value)}
                                    className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    placeholder="Broj telefona"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(e.target.value as "all" | Status)
                                    }
                                    className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                >
                                    <option value="all">Svi</option>
                                    <option value="active">Aktivni</option>
                                    <option value="inactive">Neaktivni</option>
                                </select>
                            </div>
                        </div>

                        {/* Barkod search */}
                        <div className="mt-5 grid gap-3 sm:grid-cols-[2fr,auto] sm:items-end">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-white/70">
                                    Barkod / broj kartice
                                </label>
                                <input
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleBarcodeSearch();
                                        }
                                    }}
                                    className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    placeholder="Skeniraj ili upiši pa Enter"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleBarcodeSearch}
                                className="h-10 rounded-xl bg-[var(--color-yellow)] px-6 text-sm font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)] transition hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px]"
                            >
                                Traži
                            </button>
                        </div>
                    </div>

                    {/* Rezultati pretrage */}
                    <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/30 p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between text-xs text-white/60">
                            <span>Rezultati pretrage</span>
                            <span>
                                {loadingClients
                                    ? "Učitavanje..."
                                    : `${filteredClients.length} rezultata`}
                            </span>
                        </div>

                        <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/40">
                            {filteredClients.map((c) => {
                                const isSelected = selectedClient?.id === c.id;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedClientId(c.id)}
                                        className={`w-full px-4 py-3 text-left transition ${
                                            isSelected
                                                ? "bg-[var(--color-yellow)]/10 border-l-2 border-l-[var(--color-yellow)]"
                                                : "hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">
                                                    {c.imePrezime}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    {c.telefon ?? "—"}
                                                </p>
                                            </div>
                                            <div className="text-right text-xs">
                                                <p className="font-mono text-[var(--color-yellow)]">
                                                    {c.clanKod}
                                                </p>
                                                <p
                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 ${
                                                        c.status === "active"
                                                            ? "bg-emerald-500/15 text-emerald-300"
                                                            : "bg-red-500/15 text-red-300"
                                                    }`}
                                                >
                                                    {c.status === "active"
                                                        ? "Aktivan"
                                                        : "Neaktivan"}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {!loadingClients && filteredClients.length === 0 && (
                                <div className="px-4 py-6 text-sm text-white/60">
                                    Nema rezultata za zadane filtere.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* D E S N A  STRANA – mini profil */}
                <div className="rounded-2xl border border-[var(--color-yellow)]/25 bg-black/30 p-5 sm:p-6 flex flex-col">
                    {selectedClient ? (
                        <>
                            {/* Gornji dio – avatar + osnovne info, centrirano */}
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-yellow)] text-2xl font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)]">
                                    {selectedClient.imePrezime.charAt(0).toUpperCase()}
                                </div>

                                <div className="space-y-1">
                                    <h2 className="text-xl font-extrabold text-[var(--color-yellow)]">
                                        {selectedClient.imePrezime}
                                    </h2>
                                    <p className="text-xs font-mono text-white/60">
                                        {selectedClient.clanKod}
                                    </p>
                                </div>

                                <div className="mt-2 space-y-1 text-sm text-white/80">
                                    <p>
                                        Telefon:{" "}
                                        <span className="font-semibold">
                                            {selectedClient.telefon ?? "—"}
                                        </span>
                                    </p>
                                    <p>
                                        Član od:{" "}
                                        <span className="font-semibold">
                                            {selectedClient.datumClanstva}
                                        </span>
                                    </p>
                                    {selectedClient.aktivanPaket && (
                                        <p>
                                            Aktivan paket:{" "}
                                            <span className="font-semibold text-[var(--color-yellow)]">
                                                {selectedClient.aktivanPaket}
                                            </span>
                                        </p>
                                    )}
                                    {selectedClient.napomena && (
                                        <p className="pt-1 text-xs text-white/60">
                                            Napomena: {selectedClient.napomena}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Badge za isticanje članarine */}
                            {typeof selectedClient.isticeZaDana === "number" && (
                                <div className="mt-4 flex justify-center">
                                    {selectedClient.isticeZaDana > 0 ? (
                                        <div className="inline-flex items-center rounded-full border border-[var(--color-yellow)]/50 bg-black/60 px-3 py-1 text-xs text-[var(--color-yellow)]">
                                            Članarina ističe za{" "}
                                            <span className="ml-1 font-bold">
                                                {selectedClient.isticeZaDana} dana
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs text-red-300">
                                            Članarina je istekla
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dugme na dnu kartice */}
                            <div className="mt-auto pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("info");
                                        setProfileOpen(true);
                                    }}
                                    className="w-full rounded-full bg-[var(--color-yellow)] px-5 py-2.5 text-sm font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)] transition hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px]"
                                >
                                    {loadingDetails ? "Učitavanje..." : "Otvori profil"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/60">
                            Odaberi klijenta iz liste lijevo.
                        </div>
                    )}
                </div>
            </section>

            {/* FULL PROFIL MODAL */}
            <AnimatePresence>
                {profileOpen && selectedClient && (
                    <motion.div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-full max-w-5xl rounded-2xl border border-[var(--color-yellow)]/40 bg-[#101010] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
                        >
                            {/* Header modala */}
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-[var(--color-yellow)]">
                                        {selectedClient.imePrezime}
                                    </h2>
                                    <p className="text-xs text-white/60">
                                        Kartica:{" "}
                                        <span className="font-mono">
                                            {selectedClient.clanKod}
                                        </span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {typeof selectedClient.isticeZaDana === "number" && (
                                        <>
                                            {selectedClient.isticeZaDana > 0 ? (
                                                <span className="rounded-full border border-[var(--color-yellow)]/50 bg-black/60 px-3 py-1 text-xs text-[var(--color-yellow)]">
                                                    Ističe za {selectedClient.isticeZaDana} dana
                                                </span>
                                            ) : (
                                                <span className="rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs text-red-300">
                                                    Članarina istekla
                                                </span>
                                            )}
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setProfileOpen(false)}
                                        className="text-sm text-[var(--color-yellow)] hover:underline"
                                    >
                                        Zatvori
                                    </button>
                                </div>
                            </div>

                            {/* Tabovi */}
                            <div className="mb-5 flex border-b border-white/10 text-sm">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("info")}
                                    className={`px-4 pb-2 ${
                                        activeTab === "info"
                                            ? "border-b-2 border-[var(--color-yellow)] font-semibold text-[var(--color-yellow)]"
                                            : "text-white/60 hover:text-white"
                                    }`}
                                >
                                    Lične informacije
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("finances")}
                                    className={`px-4 pb-2 ${
                                        activeTab === "finances"
                                            ? "border-b-2 border-[var(--color-yellow)] font-semibold text-[var(--color-yellow)]"
                                            : "text-white/60 hover:text-white"
                                    }`}
                                >
                                    Paketi i finansije
                                </button>
                            </div>

                            {/* Sadržaj tabova */}
                            {activeTab === "info" ? (
                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-white/60">
                                                Ime i prezime
                                            </label>
                                            <input
                                                className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white"
                                                value={editImePrezime}
                                                onChange={(e) =>
                                                    setEditImePrezime(e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-white/60">
                                                Email
                                            </label>
                                            <input
                                                className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white"
                                                value={editEmail}
                                                onChange={(e) =>
                                                    setEditEmail(e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-white/60">
                                                Mobilni
                                            </label>
                                            <input
                                                className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white"
                                                value={editTelefon}
                                                onChange={(e) =>
                                                    setEditTelefon(e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-white/60">
                                                Broj kartice
                                            </label>
                                            <input
                                                className="h-10 rounded-md bg-black/40 border border-white/15 px-3 text-sm text-white font-mono"
                                                value={selectedClient.clanKod}
                                                readOnly
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-white/60">
                                            Napomena
                                        </label>
                                        <textarea
                                            className="min-h-[80px] rounded-md bg-black/40 border border-white/15 px-3 py-2 text-sm text-white"
                                            value={editNapomena}
                                            onChange={(e) =>
                                                setEditNapomena(e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={handleDeleteClient}
                                            disabled={deletingClient}
                                            className="rounded-full border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                                        >
                                            {deletingClient
                                                ? "Brisanje..."
                                                : "Obriši klijenta"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleSaveInfo}
                                            disabled={savingInfo}
                                            className="rounded-full bg-[var(--color-yellow)] px-5 py-2 text-xs font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)] hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-60"
                                        >
                                            {savingInfo
                                                ? "Spremanje..."
                                                : "Sačuvaj izmjene"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Ukupno uplaćeno + Dodaj paket */}
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-white/60">
                                                Ukupno uplaćeno (trenutno suma svih uplata)
                                            </p>
                                            <div className="mt-1 text-2xl font-extrabold text-[var(--color-yellow)]">
                                                {totalLastYear.toFixed(2)} KM
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddPaket((v) => !v)}
                                            className="rounded-full bg-[var(--color-yellow)] px-5 py-2.5 text-xs font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)] hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px]"
                                        >
                                            {showAddPaket ? "Otkaži" : "Dodaj paket"}
                                        </button>
                                    </div>

                                    {/* Forma za novi paket */}
                                    {showAddPaket && (
                                        <div className="rounded-xl border border-[var(--color-yellow)]/30 bg-black/40 p-4 space-y-3 text-sm">
                                            <div className="grid gap-3 md:grid-cols-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-white/60">
                                                        Tip paketa
                                                    </label>
                                                    <select
                                                        value={newPaketTipId}
                                                        onChange={(e) =>
                                                            handleChangePaketTip(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                    >
                                                        <option value="">
                                                            Odaberi tip...
                                                        </option>
                                                        {tipovi.map((t) => (
                                                            <option
                                                                key={t.id}
                                                                value={t.id}
                                                            >
                                                                {t.naziv} (
                                                                {t.cijena_default} KM)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-white/60">
                                                        Početak
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={newPaketPocetak}
                                                        onChange={(e) =>
                                                            setNewPaketPocetak(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-white/60">
                                                        Zavrzetak
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={newPaketKraj}
                                                        onChange={(e) =>
                                                            setNewPaketKraj(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-white/60">
                                                        Cijena (KM)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={newPaketCijena}
                                                        onChange={(e) =>
                                                            setNewPaketCijena(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                        placeholder="npr. 40"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddPaket(false);
                                                        setNewPaketTipId("");
                                                        setNewPaketPocetak("");
                                                        setNewPaketKraj("");
                                                        setNewPaketCijena("");
                                                    }}
                                                    className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70 hover:bg-white/5"
                                                >
                                                    Odustani
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAddPaket}
                                                    disabled={savingPaket}
                                                    className="rounded-full bg-[var(--color-yellow)] px-4 py-1.5 text-xs font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)] hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-60"
                                                >
                                                    {savingPaket
                                                        ? "Spremanje..."
                                                        : "Spasi paket"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Paketi */}
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold text-white/80">
                                            Paketi
                                        </h3>
                                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-white/5 text-xs text-white/60">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Naziv
                                                    </th>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Period
                                                    </th>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Cijena
                                                    </th>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Status
                                                    </th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {selectedClient.paketi.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={4}
                                                            className="px-3 py-3 text-xs text-white/60"
                                                        >
                                                            Nema kreiranih paketa.
                                                        </td>
                                                    </tr>
                                                )}
                                                {selectedClient.paketi.map((p) => (
                                                    <tr
                                                        key={p.id}
                                                        className="border-t border-white/5 text-xs"
                                                    >
                                                        <td className="px-3 py-2 text-white/85">
                                                            {p.naziv}
                                                        </td>
                                                        <td className="px-3 py-2 text-white/70">
                                                            {p.pocetak} –{" "}
                                                            {p.kraj ?? "—"}
                                                        </td>
                                                        <td className="px-3 py-2 text-[var(--color-yellow)]">
                                                            {p.cijena.toFixed(2)}{" "}
                                                            KM
                                                        </td>
                                                        <td className="px-3 py-2">
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                                                        p.status === "active"
                                                                            ? "bg-emerald-500/15 text-emerald-300"
                                                                            : p.status ===
                                                                            "expired"
                                                                                ? "bg-red-500/15 text-red-300"
                                                                                : "bg-yellow-500/15 text-yellow-300"
                                                                    }`}
                                                                >
                                                                    {p.status}
                                                                </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Uplate */}
                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold text-white/80">
                                                Uplate
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                                                    Suma:{" "}
                                                    {totalLastYear.toFixed(2)}{" "}
                                                    KM
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowAddUplata((v) => !v)
                                                    }
                                                    className="rounded-full border border-[var(--color-yellow)]/60 px-3 py-1 text-xs font-semibold text-[var(--color-yellow)] hover:bg-[var(--color-yellow)]/10"
                                                >
                                                    {showAddUplata
                                                        ? "Otkaži"
                                                        : "Dodaj uplatu"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Forma za novu uplatu */}
                                        {showAddUplata && (
                                            <div className="mb-3 rounded-xl border border-[var(--color-yellow)]/30 bg-black/40 p-4 text-xs space-y-3">
                                                <div className="grid gap-3 md:grid-cols-4">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-white/60">
                                                            Paket
                                                        </label>
                                                        <select
                                                            value={newUplataPaketId}
                                                            onChange={(e) =>
                                                                handleChangeUplataPaket(
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                        >
                                                            <option value="">
                                                                Odaberi paket...
                                                            </option>
                                                            {selectedClient.paketi.map(
                                                                (p) => (
                                                                    <option
                                                                        key={p.id}
                                                                        value={p.id}
                                                                    >
                                                                        {
                                                                            p.naziv
                                                                        }{" "}
                                                                        (
                                                                        {p.cijena.toFixed(
                                                                            2,
                                                                        )}{" "}
                                                                        KM)
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-white/60">
                                                            Datum uplate
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={newUplataDatum}
                                                            onChange={(e) =>
                                                                setNewUplataDatum(
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-white/60">
                                                            Iznos (KM)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={newUplataIznos}
                                                            onChange={(e) =>
                                                                setNewUplataIznos(
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] text-white/60">
                                                            Način plaćanja
                                                        </label>
                                                        <input
                                                            disabled
                                                            value="keš"
                                                            className="h-9 rounded-md bg-black/40 border border-white/15 px-2 text-xs text-white/70 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAddUplata(
                                                                false,
                                                            );
                                                            setNewUplataPaketId(
                                                                "",
                                                            );
                                                            setNewUplataIznos("");
                                                            setNewUplataDatum(
                                                                new Date()
                                                                    .toISOString()
                                                                    .slice(0, 10),
                                                            );
                                                        }}
                                                        className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70 hover:bg-white/5"
                                                    >
                                                        Odustani
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddUplata}
                                                        disabled={savingUplata}
                                                        className="rounded-full bg-[var(--color-yellow)] px-4 py-1.5 text-xs font-extrabold text-black shadow-[0_10px_25px_rgba(0,0,0,0.7)] hover:brightness-95 hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-60"
                                                    >
                                                        {savingUplata
                                                            ? "Spremanje..."
                                                            : "Spasi uplatu"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-white/5 text-xs text-white/60">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Datum
                                                    </th>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Paket
                                                    </th>
                                                    <th className="px-3 py-2 text-left font-semibold">
                                                        Način plaćanja
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-semibold">
                                                        Iznos
                                                    </th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {selectedClient.uplate.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={4}
                                                            className="px-3 py-3 text-xs text-white/60"
                                                        >
                                                            Nema zabilježenih
                                                            uplata.
                                                        </td>
                                                    </tr>
                                                )}
                                                {selectedClient.uplate.map((u) => (
                                                    <tr
                                                        key={u.id}
                                                        className="border-t border-white/5 text-xs"
                                                    >
                                                        <td className="px-3 py-2 text-white/80">
                                                            {u.datum}
                                                        </td>
                                                        <td className="px-3 py-2 text-white/80">
                                                            {u.paketNaziv}
                                                        </td>
                                                        <td className="px-3 py-2 text-white/70">
                                                            {u.nacin}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-[var(--color-yellow)]">
                                                            {u.iznos.toFixed(2)}{" "}
                                                            KM
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default ClientsSearch;
