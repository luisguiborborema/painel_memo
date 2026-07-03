export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-3 flex w-40 items-center justify-center rounded-xl bg-neutral-900 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="MEMO" className="h-6 w-auto" />
        </div>
        <h1 className="mb-4 text-lg font-semibold">Configuração pendente</h1>
        <p className="mb-4 text-sm text-neutral-600">
          Falta conectar o Supabase. Siga os passos:
        </p>
        <ol className="mb-4 flex list-decimal flex-col gap-2 pl-5 text-sm text-neutral-600">
          <li>Crie um projeto em <span className="font-medium">supabase.com</span>.</li>
          <li>
            Rode o SQL de <code className="rounded bg-neutral-100 px-1">supabase/migrations/0001_init.sql</code> no SQL Editor.
          </li>
          <li>
            Em <span className="font-medium">Project Settings → API</span>, copie a URL e a anon key.
          </li>
          <li>
            Cole no arquivo <code className="rounded bg-neutral-100 px-1">.env.local</code>:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
            </pre>
          </li>
          <li>Reinicie o servidor (<code className="rounded bg-neutral-100 px-1">npm run dev</code>).</li>
          <li>
            Crie os usuários da equipe em <span className="font-medium">Authentication → Users</span> (e-mail + senha).
          </li>
        </ol>
        <p className="text-xs text-neutral-400">
          Depois disso, esta tela some e o login aparece.
        </p>
      </div>
    </div>
  );
}
