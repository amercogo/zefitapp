import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");

    return (
        <div className="min-h-screen flex">
            <AdminSidebar />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
