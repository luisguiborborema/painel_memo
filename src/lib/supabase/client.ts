import { createBrowserClient } from "@supabase/ssr";

// Singleton: um único cliente do navegador por sessão. Evita recriar o cliente
// (e seus listeners de auth) a cada render/mount de componente, o que pesava na
// navegação entre telas.
function make() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let client: ReturnType<typeof make> | undefined;

export function createClient() {
  return (client ??= make());
}
