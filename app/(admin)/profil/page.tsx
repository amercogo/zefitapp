import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfilForm from "./profil-form";

export default async function ProfilPage() {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) redirect("/login");

    // pokušaj dohvatiti profil
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // ako ne postoji, kreiraj minimalni red
    if (!profile) {
        await supabase.from("profiles").insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            phone: null,
            avatar_url: null,
        });
    }

    const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return <ProfilForm initialProfile={profileData} userEmail={user.email!} />;
}
