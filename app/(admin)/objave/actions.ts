// app/(admin)/objave/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPostAction(formData: FormData) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Nema korisnika");

    const title = (formData.get("title") as string)?.trim() ?? "";
    const content = (formData.get("content") as string)?.trim() ?? "";
    const imageFile = formData.get("image") as File | null;

    if (!title || !content) {
        throw new Error("Naslov i sadržaj su obavezni.");
    }

    let imageUrl: string | null = null;

    if (imageFile && imageFile.size > 0) {
        const safeName = imageFile.name.replace(/\s+/g, "_");
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = `${fileName}`; // nema potrebe za folderima

        const { error: uploadError } = await supabase.storage
            .from("posts")
            .upload(filePath, imageFile, {
                upsert: true,
                contentType: imageFile.type || "application/octet-stream",
            });

        if (uploadError) {
            throw new Error(`Upload slike nije uspio: ${uploadError.message}`);
        }

        const { data: publicUrl } = supabase.storage.from("posts").getPublicUrl(filePath);
        imageUrl = publicUrl.publicUrl;
    }

    const { error } = await supabase.from("posts").insert({
        title,
        content,
        image_url: imageUrl,
    });

    if (error) {
        throw new Error(`Spremanje objave nije uspjelo: ${error.message}`);
    }

    revalidatePath("/objave");
    return { success: true };
}

export async function updatePostAction(formData: FormData) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Nema korisnika");

    const id = formData.get("id") as string;
    const title = (formData.get("title") as string)?.trim() ?? "";
    const content = (formData.get("content") as string)?.trim() ?? "";
    const imageFile = formData.get("image") as File | null;
    const existingImageUrl = (formData.get("existingImageUrl") as string) || null;

    if (!id) throw new Error("Nedostaje ID objave.");
    if (!title || !content) {
        throw new Error("Naslov i sadržaj su obavezni.");
    }

    let imageUrl: string | null = existingImageUrl;

    if (imageFile && imageFile.size > 0) {
        const safeName = imageFile.name.replace(/\s+/g, "_");
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("posts")
            .upload(filePath, imageFile, {
                upsert: true,
                contentType: imageFile.type || "application/octet-stream",
            });

        if (uploadError) {
            throw new Error(`Upload slike nije uspio: ${uploadError.message}`);
        }

        const { data: publicUrl } = supabase.storage.from("posts").getPublicUrl(filePath);
        imageUrl = publicUrl.publicUrl;
    }

    const { error } = await supabase
        .from("posts")
        .update({
            title,
            content,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
        throw new Error(`Ažuriranje objave nije uspjelo: ${error.message}`);
    }

    revalidatePath("/objave");
    return { success: true };
}

export async function deletePostAction(id: string) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Nema korisnika");

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
        throw new Error(`Brisanje objave nije uspjelo: ${error.message}`);
    }

    revalidatePath("/objave");
    return { success: true };
}
