import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) redirect("/login");

    return (
        <main className="p-6">
            <div className="max-w-7xl mx-auto">
                {/* Top bar s logoutom */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-[var(--color-yellow)]">
                        Dashboard
                    </h1>
                    <LogoutButton />
                </div>

                <div className="text-yellow-300 text-lg">
                    Dobrodošao, {user.email}
                </div>
            </div>
        </main>
    );
}
