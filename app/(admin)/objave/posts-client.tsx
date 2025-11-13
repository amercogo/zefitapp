"use client";

import { useState } from "react";
import type { Post } from "./page";
import {
    createPostAction,
    updatePostAction,
    deletePostAction,
} from "./actions";


type Props = {
    posts: Post[];
};

type FormState = {
    id?: string;
    title: string;
    content: string;
    imageFile: File | null;
    imagePreview: string | null;
    existingImageUrl: string | null;
};

function formatDate(dateString: string) {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function PostsClient({ posts }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    const [form, setForm] = useState<FormState>({
        id: undefined,
        title: "",
        content: "",
        imageFile: null,
        imagePreview: null,
        existingImageUrl: null,
    });

    function openCreateModal() {
        setIsEditMode(false);
        setForm({
            id: undefined,
            title: "",
            content: "",
            imageFile: null,
            imagePreview: null,
            existingImageUrl: null,
        });
        setError(null);
        setMsg(null);

        // ⬇️ PRVO prikažemo modal u “zatvorenom” stanju
        setIsClosing(true);
        setIsModalOpen(true);

        // ⬇️ pa za par ms uključimo "open" animaciju
        setTimeout(() => {
            setIsClosing(false);
        }, 10);
    }

    function openEditModal(post: Post) {
        setIsEditMode(true);
        setForm({
            id: post.id,
            title: post.title,
            content: post.content,
            imageFile: null,
            imagePreview: post.image_url,
            existingImageUrl: post.image_url,
        });
        setError(null);
        setMsg(null);

        setIsClosing(true);
        setIsModalOpen(true);

        setTimeout(() => {
            setIsClosing(false);
        }, 10);
    }



    function closeModal() {
        setIsClosing(true);
        setTimeout(() => {
            setIsModalOpen(false);
            setIsClosing(false);
        }, 180);
    }


    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMsg(null);

        try {
            const fd = new FormData();
            fd.append("title", form.title);
            fd.append("content", form.content);

            if (form.imageFile) {
                fd.append("image", form.imageFile);
            }

            if (isEditMode && form.id) {
                fd.append("id", form.id);
                if (form.existingImageUrl) {
                    fd.append("existingImageUrl", form.existingImageUrl);
                }
                const res = await updatePostAction(fd);
                if (res?.success) setMsg("✅ Objava je ažurirana.");
            } else {
                const res = await createPostAction(fd);
                if (res?.success) setMsg("✅ Objava je sačuvana.");
            }

            // nakon uspjeha zatvori modal; revalidatePath odradi reload liste
            setTimeout(() => {
                closeModal();
            }, 400);
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Greška pri spremanju objave.";
            setError(message);
        } finally {

            setLoading(false);
        }
    }

    async function handleDelete(post: Post) {
        if (!confirm(`Da li sigurno želiš obrisati objavu "${post.title}"?`)) return;
        setLoading(true);
        setError(null);
        setMsg(null);

        try {
            const res = await deletePostAction(post.id);
            if (res?.success) setMsg("✅ Objava je obrisana.");
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Greška pri brisanju objave.";
            setError(message);
        } finally {

            setLoading(false);
        }
    }

    const hasPosts = posts.length > 0;

    return (
        <>
            {/* header dugme iz page.tsx ne radi ništa – ovdje pravimo svoje */}
            <div className="mb-6 flex justify-start">
                <button
                    type="button"
                    onClick={openCreateModal}
                    className="
                      inline-flex items-center justify-center
                      px-7 py-3
                      text-sm font-extrabold tracking-wide

                      rounded-xl
                      bg-[var(--color-yellow)] text-black
                      border border-black/40

                      shadow-[0_10px_25px_rgba(0,0,0,0.6)]
                      hover:shadow-[0_14px_32px_rgba(0,0,0,0.85)]
                      hover:-translate-y-[1px]
                      hover:brightness-95

                      active:translate-y-[1px]
                      active:shadow-[0_4px_14px_rgba(0,0,0,0.7)]

                      transition
                      duration-150
                      ease-out
                    "
                >
                    Dodaj objavu
                </button>
            </div>

            {error && (
                <p className="mb-3 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    ❌ Greška: {error}
                </p>
            )}
            {msg && (
                <p className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg">
                    {msg}
                </p>
            )}

            {!hasPosts ? (
                <p className="text-white/60">
                    Još nema objava. Klikni na <b>Dodaj objavu</b> da dodaš prvu.
                </p>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {posts.map((post) => {
                        const preview =
                            post.content.length > 140
                                ? post.content.slice(0, 140) + "…"
                                : post.content;

                        return (
                            <article
                                key={post.id}
                                className="
                                        rounded-2xl border border-[var(--color-yellow)]/25
                                        bg-black/40
                                        p-5 flex flex-col gap-4

                                        shadow-[0_18px_40px_rgba(30,30,30,0.8)]
                                        hover:shadow-[0_26px_60px_rgba(0,0,0,0.95)]
                                        hover:-translate-y-1
                                        hover:border-[var(--color-yellow)]

                                        transition
                                        duration-200
                                        ease-out
                                      "
                            >
                                <header className="flex items-start justify-between gap-3">
                                    <h2 className="text-lg font-extrabold text-[var(--color-yellow)]">
                                        {post.title}
                                    </h2>
                                    <span className="text-xs text-white/50 mt-1">
                    {formatDate(post.created_at)}
                  </span>
                                </header>

                                {post.image_url && (
                                    <div className="rounded-lg overflow-hidden border border-white/10">
                                        <img
                                            src={post.image_url}
                                            alt={post.title}
                                            className="w-full h-40 object-cover"
                                        />
                                    </div>
                                )}

                                <p className="text-white/80 text-sm">{preview}</p>

                                <div className="mt-auto flex gap-3">
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-full border border-white/25 text-xs font-semibold text-white/90 hover:bg-white/5 active:translate-y-[1px] transition"
                                        onClick={() => alert(post.content)} // jednostavni detalji za sada
                                    >
                                        Detalji
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-full border border-[var(--color-yellow)]/60 text-xs font-semibold text-[var(--color-yellow)] hover:bg-[var(--color-yellow)]/10 active:translate-y-[1px] transition"
                                        onClick={() => openEditModal(post)}
                                    >
                                        Uredi
                                    </button>
                                    <button
                                        type="button"
                                        className="ml-auto px-3 py-2 rounded-full border border-red-500/60 text-xs font-semibold text-red-300 hover:bg-red-500/10 active:translate-y-[1px] transition"
                                        onClick={() => handleDelete(post)}
                                    >
                                        Obriši
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <div
                    className={`fixed inset-0 z-40 flex items-center justify-center
                      bg-black/70
                      transition-opacity duration-200
                      ${isClosing ? "opacity-0" : "opacity-100"}
                    `}
                        >
                    <div
                        className={`
                        w-full max-w-3xl rounded-2xl border border-[var(--color-yellow)]/30
                        bg-[#101010] p-6 sm:p-8
                        shadow-[0_22px_60px_rgba(0,0,0,0.9)]
                        transform
                        transition-all duration-200
                            ${
                            isClosing
                                ? "opacity-0 scale-95 translate-y-3"
                                : "opacity-100 scale-100 translate-y-0"
                                }
                            `}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-extrabold text-[var(--color-yellow)]">
                                {isEditMode ? "Uredi objavu" : "Dodaj objavu"}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="
                                text-sm text-[var(--color-yellow)]
                                hover:underline
                                hover:brightness-110
                                transition
                              "
                            >
                                Zatvori
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/80 mb-1">
                                    Naslov
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, title: e.target.value }))
                                    }
                                    className="w-full h-11 rounded-md bg-black/40 border border-white/15 text-white px-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60"
                                    placeholder="Npr. Akcija na pakete"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-white/80 mb-1">
                                    Sadržaj
                                </label>
                                <textarea
                                    value={form.content}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, content: e.target.value }))
                                    }
                                    className="w-full min-h-[140px] rounded-md bg-black/40 border border-white/15 text-white px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-yellow)]/60 resize-vertical"
                                    placeholder="Kratak opis objave…"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-white/80 mb-1">
                                    Slika (opciono)
                                </label>
                                <div className="flex items-center gap-4">
                                    <label
                                        className="
                                        inline-flex items-center justify-center
                                        rounded-full bg-[var(--color-yellow)] text-black
                                        px-4 py-2 text-sm font-bold cursor-pointer
                                        shadow-[0_8px_18px_rgba(0,0,0,0.7)]
                                        hover:brightness-95 hover:-translate-y-[1px]
                                        hover:shadow-[0_12px_24px_rgba(0,0,0,0.85)]
                                        active:translate-y-[1px]
                                        active:shadow-[0_4px_12px_rgba(0,0,0,0.8)]
                                        transition
                                        duration-150
                                        ease-out
                                      "
                                    >
                                        Odaberi sliku
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setForm((s) => ({
                                                    ...s,
                                                    imageFile: file,
                                                    imagePreview: file
                                                        ? URL.createObjectURL(file)
                                                        : s.existingImageUrl,
                                                }));
                                            }}
                                        />
                                    </label>

                                    {form.imagePreview && (
                                        <div className="w-24 h-16 rounded-md overflow-hidden border border-white/15">
                                            <img
                                                src={form.imagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="
                                      h-11 px-5 rounded-full
                                      border border-white/20 text-white/90
                                      bg-transparent
                                      shadow-[0_6px_16px_rgba(0,0,0,0.6)]
                                      hover:bg-white/5 hover:shadow-[0_10px_22px_rgba(0,0,0,0.8)]
                                      active:translate-y-[1px]
                                      active:shadow-[0_3px_10px_rgba(0,0,0,0.7)]
                                      transition
                                      duration-150
                                      ease-out
                                    "
                                  >
                                    Odustani
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="
                                      h-11 px-6 rounded-full
                                      bg-[var(--color-yellow)] text-black font-extrabold
                                      shadow-[0_8px_20px_rgba(0,0,0,0.7)]
                                      hover:brightness-95 hover:-translate-y-[1px]
                                      hover:shadow-[0_12px_26px_rgba(0,0,0,0.9)]
                                      active:translate-y-[1px]
                                      active:shadow-[0_4px_12px_rgba(0,0,0,0.8)]
                                      disabled:opacity-60
                                      transition
                                      duration-150
                                      ease-out
                                    "
                                         >
                                    {loading
                                        ? isEditMode
                                            ? "Spremam..."
                                            : "Spremam..."
                                        : isEditMode
                                            ? "Spremi promjene"
                                            : "Spremi objavu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </>
    );
}
