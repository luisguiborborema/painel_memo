import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem credenciais configuradas: deixa passar (o app mostra a tela de setup)
  if (!supabaseConfigured) return response;

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() lê/valida o cookie localmente (sem ida à rede a cada request;
  // só faz refresh quando o token está perto de expirar). Os dados seguem
  // protegidos por RLS no banco. Isso acelera a navegação entre telas.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login");

  // Sem sessão e rota protegida -> login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Já logado tentando acessar login -> home
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/comercial";
    return NextResponse.redirect(url);
  }

  return response;
}
