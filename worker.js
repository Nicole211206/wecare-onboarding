// WeCare Onboarding — Cloudflare Worker
// KV binding: ONBOARDING_KV
// Variáveis de ambiente: AUTH_TOKEN
//
// Endpoints:
//   GET  /load                    → retorna {ok:true, data:{...}} — estado completo (wc_state)
//   POST /save                    → merge com estado atual e salva
//   POST /stats                   → salva key "wc_stats" (resumo para a Claire)
//   GET  /onboarding-stats        → retorna stats para a Claire (sem auth)
//   POST /zapsign-webhook         → webhook do ZapSign (sem auth principal)
//   GET  /form-load?id=X&t=TOKEN  → carrega formulário do imóvel (sem auth principal)
//   POST /form-save?id=X&t=TOKEN  → salva respostas do formulário

const KV_KEY   = 'wc_state';
const STATS_KEY = 'wc_stats';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function unauthorized() {
  return json({ ok: false, error: 'Unauthorized' }, 401);
}

function checkAuth(token, env) {
  if (!env.AUTH_TOKEN) return false;
  return token === env.AUTH_TOKEN;
}

async function getState(env) {
  const raw = await env.ONBOARDING_KV.get(KV_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function putState(env, state) {
  await env.ONBOARDING_KV.put(KV_KEY, JSON.stringify(state));
}

export default {
  async fetch(request, env) {
    const url   = new URL(request.url);
    const path  = url.pathname.replace(/\/+$/, '') || '/';
    const token = url.searchParams.get('token') || '';

    // Pre-flight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── GET /load ─────────────────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/load') {
      if (!checkAuth(token, env)) return unauthorized();
      const data = await getState(env);
      return json({ ok: true, data });
    }

    // ── POST /save ────────────────────────────────────────────────────────────
    if (request.method === 'POST' && path === '/save') {
      if (!checkAuth(token, env)) return unauthorized();
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      const current = await getState(env);
      const merged  = { ...current, ...body };
      await putState(env, merged);
      return json({ ok: true });
    }

    // ── POST /stats ───────────────────────────────────────────────────────────
    if (request.method === 'POST' && path === '/stats') {
      if (!checkAuth(token, env)) return unauthorized();
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      await env.ONBOARDING_KV.put(STATS_KEY, JSON.stringify(body.stats ?? []));
      return json({ ok: true });
    }

    // ── GET /onboarding-stats (sem auth — a Claire lê aqui) ───────────────────
    if (request.method === 'GET' && path === '/onboarding-stats') {
      const raw   = await env.ONBOARDING_KV.get(STATS_KEY);
      const stats = raw ? JSON.parse(raw) : [];
      return json({ ok: true, stats });
    }

    // ── POST /zapsign-webhook ─────────────────────────────────────────────────
    if (request.method === 'POST' && path === '/zapsign-webhook') {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

      // Aceita dois formatos do ZapSign:
      //   { token, document: { token, status } }
      //   { event, signer: {...}, document: { token } }
      const docToken  = body?.document?.token;
      const isSigned  =
        body?.document?.status === 'signed' ||
        (typeof body?.event === 'string' && body.event.toLowerCase().includes('sign'));

      if (docToken && isSigned) {
        const state = await getState(env);

        // imoveis pode estar em state.imoveis (array) ou distribuído como keys
        let changed = false;

        if (Array.isArray(state.imoveis)) {
          for (const im of state.imoveis) {
            if (im.zapsignUuid === docToken) {
              im.contratoAssinado     = true;
              im.dataContratoAssinado = new Date().toISOString();
              if (im.status === 'contrato') im.status = 'compras';
              changed = true;
            }
          }
        }

        if (changed) await putState(env, state);
      }

      return json({ ok: true });
    }

    // ── GET /form-load?id=IMOVEL_ID&t=FORM_TOKEN ─────────────────────────────
    if (request.method === 'GET' && path === '/form-load') {
      const imovelId  = url.searchParams.get('id')  || '';
      const formToken = url.searchParams.get('t')   || '';

      if (!imovelId || !formToken) return json({ ok: false, error: 'Missing id or t' }, 400);

      const state = await getState(env);
      const imoveis = Array.isArray(state.imoveis) ? state.imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);

      if (!im)                              return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      if (im.formToken !== formToken)       return json({ ok: false, error: 'Token inválido' },        403);

      return json({
        ok:         true,
        imovelNome: im.nome || im.name || imovelId,
        perguntas:  im.formPerguntas  ?? [],
        respostas:  im.formRespostas  ?? {},
      });
    }

    // ── POST /form-save?id=IMOVEL_ID&t=FORM_TOKEN ────────────────────────────
    if (request.method === 'POST' && path === '/form-save') {
      const imovelId  = url.searchParams.get('id')  || '';
      const formToken = url.searchParams.get('t')   || '';

      if (!imovelId || !formToken) return json({ ok: false, error: 'Missing id or t' }, 400);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

      const state = await getState(env);
      const imoveis = Array.isArray(state.imoveis) ? state.imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);

      if (!im)                              return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      if (im.formToken !== formToken)       return json({ ok: false, error: 'Token inválido' },        403);

      im.formRespostas     = body.respostas ?? {};
      im.formPreenchidoEm  = new Date().toISOString();

      await putState(env, state);
      return json({ ok: true });
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
