import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { ClientsSearch } from "./clients-search";

export const dynamic = "force-dynamic";

export default async function PretragaKlijenataPage() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) redirect("/login");

    return (
        <main className="p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[var(--color-yellow)]">
                            Pretraga klijenata
                        </h1>
                        <p className="mt-1 text-sm text-white/70">
                            Filteri i skeniranje barkoda. (Za sada mock podaci, kasnije Supabase.)
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">
              Prijavljen:{" "}
                <span className="font-semibold text-[var(--color-yellow)]">
                {user.email}
              </span>
            </span>
                        <LogoutButton />
                    </div>
                </div>

                {/* Glavna client komponenta */}
                <ClientsSearch />
            </div>
        </main>
    );
}
