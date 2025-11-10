import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
    // ⬇️ OVO je ključno
    const supabase = await createClient();

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        redirect("/login");
    }

    redirect("/dashboard");
}
