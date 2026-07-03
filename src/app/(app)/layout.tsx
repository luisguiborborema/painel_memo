import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { Sidebar } from "@/components/Sidebar";
import { SetupNotice } from "@/components/SetupNotice";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user?.email} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
