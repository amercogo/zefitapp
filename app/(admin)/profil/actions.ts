"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Nema korisnika");

    const fullName = (formData.get("fullName") as string) ?? "";
    const phone = (formData.get("phone") as string) ?? "";
    const newPassword = (formData.get("newPassword") as string) ?? "";
    const avatarFile = formData.get("avatar") as File | null;

    let avatarUrl: string | null = null;

    // 1) Upload avatara (ako je izabran)
    if (avatarFile && avatarFile.size > 0) {
        const safeName = avatarFile.name.replace(/\s+/g, "_");
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile, {
                upsert: true,
                contentType: avatarFile.type || "application/octet-stream",
            });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: publicUrl } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        avatarUrl = publicUrl.publicUrl;
    }

    // 2) Update profila
    const updateData: Record<string, any> = { full_name: fullName, phone };
    if (avatarUrl) updateData.avatar_url = avatarUrl;

    const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

    if (updateError) throw updateError;

    // 3) Promjena lozinke (opciono)
    if (newPassword && newPassword.trim().length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (passError) throw passError;
    }

    // osvježi stranicu profila
    revalidatePath("/profil");
    return { success: true, avatarUrl };
}
