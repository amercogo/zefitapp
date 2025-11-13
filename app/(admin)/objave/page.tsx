import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import PostsClient from "./posts-client";

export type Post = {
    id: string;
    title: string;
    content: string;
    image_url: string | null;
    created_at: string;
};

export default async function ObjavePage() {
    const supabase = await createClient();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) redirect("/login");

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Greška pri čitanju objava:", error.message);
    }

    const posts: Post[] = (data ?? []).map((p) => ({
        id: p.id as string,
        title: p.title as string,
        content: p.content as string,
        image_url: p.image_url as string | null,
        created_at: p.created_at as string,
    }));


    return (
        <section className="p-6 lg:p-10">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--color-yellow)]">
                        Objave
                    </h1>
                    <p className="text-white/60 mt-1">
                        Lista objava i dodavanje nove objave.
                    </p>
                </div>
            </header>

            <PostsClient posts={posts} />
        </section>
    );
}
