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

    // ── POST /extrair-formulario (IA lê transcrição e preenche o formulário) ──
    if (request.method === 'POST' && path === '/extrair-formulario') {
      if (!checkAuth(token, env)) return unauthorized();
      if (!env.AI) return json({ ok: false, error: 'Workers AI não configurado' }, 500);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

      const transcript = String(body.transcript || '').slice(0, 45000);
      const perguntas  = Array.isArray(body.perguntas) ? body.perguntas : [];
      if (!transcript)        return json({ ok: false, error: 'Transcrição vazia' }, 400);
      if (!perguntas.length)  return json({ ok: false, error: 'Sem perguntas' }, 400);

      const listaPerguntas = perguntas
        .map(p => `- ${p.id}: ${p.label}`)
        .join('\n');

      const sys = `Você é um assistente da WeCare Hosting que extrai informações de transcrições de reuniões com proprietários de imóveis para aluguel por temporada.
Sua tarefa: ler a transcrição e preencher um formulário sobre o imóvel.
Regras:
- Responda APENAS com um objeto JSON válido, sem texto antes ou depois.
- As chaves do JSON são EXATAMENTE os ids das perguntas fornecidas (ex: "q1", "q25").
- O valor é a resposta extraída da transcrição, em português, de forma objetiva.
- Se a informação NÃO foi mencionada na reunião, use string vazia "".
- NÃO invente informações que não estão na transcrição.
- Para perguntas numéricas, retorne só o número como texto.`;

      const usr = `PERGUNTAS DO FORMULÁRIO (id: pergunta):\n${listaPerguntas}\n\n=== TRANSCRIÇÃO DA REUNIÃO ===\n${transcript}\n\n=== FIM DA TRANSCRIÇÃO ===\n\nRetorne o JSON com as respostas extraídas.`;

      try {
        const out = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [
            { role: 'system', content: sys },
            { role: 'user',   content: usr },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        });
        const texto = (out && (out.response || out.result || '')) + '';
        // Extrai o primeiro bloco {...}
        let answers = {};
        const ini = texto.indexOf('{');
        const fim = texto.lastIndexOf('}');
        if (ini >= 0 && fim > ini) {
          try { answers = JSON.parse(texto.slice(ini, fim + 1)); } catch { answers = {}; }
        }
        // Mantém só ids válidos e valores não vazios
        const validIds = new Set(perguntas.map(p => p.id));
        const limpo = {};
        for (const k in answers) {
          if (validIds.has(k) && answers[k] != null && String(answers[k]).trim()) {
            limpo[k] = String(answers[k]).trim();
          }
        }
        return json({ ok: true, answers: limpo, encontrados: Object.keys(limpo).length });
      } catch (e) {
        return json({ ok: false, error: 'Falha na IA: ' + (e && e.message ? e.message : 'desconhecido') }, 500);
      }
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

        // O app salva os imóveis na chave "wc_imoveis"
        let changed = false;

        if (Array.isArray(state.wc_imoveis)) {
          for (const im of state.wc_imoveis) {
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
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);

      if (!im)                              return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      if (im.formToken !== formToken)       return json({ ok: false, error: 'Token inválido' },        403);

      return json({
        ok:          true,
        imovelNome:  im.nome || im.name || imovelId,
        rascunho:    im.formRascunho    ?? {},
        respostas:   im.formRespostas   ?? {},
        confirmados: im.formConfirmados ?? {},
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
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);

      if (!im)                              return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      if (im.formToken !== formToken)       return json({ ok: false, error: 'Token inválido' },        403);

      im.formRespostas     = body.respostas   ?? {};
      im.formConfirmados   = body.confirmados ?? {};
      im.formPreenchidoEm  = new Date().toISOString();

      await putState(env, state);
      return json({ ok: true });
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
