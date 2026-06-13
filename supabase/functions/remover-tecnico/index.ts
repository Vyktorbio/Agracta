// ============================================================================
//  Edge Function: remover-tecnico
//  Controla o ACESSO de um técnico (só ADMIN pode chamar). Todo o estado de
//  acesso vive no próprio Supabase Auth (ban) — sem coluna/migração nova.
//   - action="disable": bane o login (não entra mais) MAS mantém a conta e todo
//     o histórico (recomendado p/ BPL — rastreabilidade preservada).
//   - action="enable":  reativa (remove o ban).
//   - action="delete":  apaga a conta de vez (uso pontual, ex.: conta de teste).
//   - action="status":  lista os e-mails atualmente desativados (banidos).
//  O segredo (service_role) fica SÓ aqui no servidor, nunca no app.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const BAN_FOREVER = "876000h"; // ~100 anos
function isBanned(u: { banned_until?: string | null }) {
  if (!u || !u.banned_until) return false;
  const t = Date.parse(u.banned_until);
  return !isNaN(t) && t > Date.now();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "use POST" });

  try {
    const URL = Deno.env.get("SUPABASE_URL");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!URL || !ANON || !SERVICE) return json(500, { error: "função sem variáveis de ambiente" });

    // 1) Quem chama precisa ser ADMIN ---------------------------------------
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json(401, { error: "não autenticado" });
    const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: ures, error: uerr } = await asCaller.auth.getUser();
    if (uerr || !ures?.user) return json(401, { error: "sessão inválida — entre de novo" });
    const callerId = ures.user.id;
    const { data: callerPerfil } = await asCaller.from("perfis").select("papel").eq("user_id", callerId).single();
    if (callerPerfil?.papel !== "admin") return json(403, { error: "só o administrador pode mudar o acesso de técnicos" });

    const admin = createClient(URL, SERVICE);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action || "").trim();

    // status: lista quem está desativado (banido) --------------------------
    if (action === "status") {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const disabled = (list?.users || []).filter(isBanned).map((u: { email?: string }) => (u.email || "").toLowerCase());
      return json(200, { ok: true, disabled });
    }

    if (!["disable", "enable", "delete"].includes(action)) return json(400, { error: "ação inválida" });
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return json(400, { error: "e-mail obrigatório" });

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = list?.users?.find((u: { email?: string }) => (u.email || "").toLowerCase() === email) as
      | { id: string } | undefined;
    if (!target) return json(404, { error: "conta não encontrada" });

    // proteção: não age sobre o próprio admin nem sobre outro admin
    if (target.id === callerId) return json(400, { error: "você não pode mudar o próprio acesso aqui" });
    const { data: tgtPerfil } = await admin.from("perfis").select("papel").eq("user_id", target.id).single();
    if (tgtPerfil?.papel === "admin") return json(403, { error: "não é permitido desativar/remover um administrador" });

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(target.id);
      if (error) return json(400, { error: "falha ao apagar: " + error.message });
      return json(200, { ok: true, action, email }); // perfis cai em cascata (FK on delete cascade)
    }

    const ban = action === "disable" ? BAN_FOREVER : "none";
    const { error } = await admin.auth.admin.updateUserById(target.id, { ban_duration: ban });
    if (error) return json(400, { error: "falha ao atualizar acesso: " + error.message });
    return json(200, { ok: true, action, email, ativo: action === "enable" });
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});
