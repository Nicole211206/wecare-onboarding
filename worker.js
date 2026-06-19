// WeCare Onboarding — Cloudflare Worker
// KV binding: ONBOARDING_KV
// Variáveis de ambiente: AUTH_TOKEN
//
// Endpoints:
//   GET  /load                          → estado completo (wc_state)
//   POST /save                          → merge seguro + backup/hora + salva
//   POST /stats                         → salva stats para a Claire
//   GET  /onboarding-stats              → retorna stats + prestadores (sem auth)
//   GET  /form-load?id=X&t=TOKEN        → carrega formulário do imóvel
//   POST /form-save?id=X&t=TOKEN        → salva respostas do formulário
//   POST /extrair-formulario            → IA extrai dados de transcrição
//   GET  /imovel-dados?id=X&token=T     → leitura de imóvel para o Jarvis
//   POST /jarvis-notify?id=X&token=T    → webhook de notificação do Jarvis
//   POST /analisar-fotos                → IA analisa fotos e preenche campos

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

      // Backup horário (7 dias de expiração)
      try {
        const hourKey = 'wc_backup_' + Math.floor(Date.now() / 3600000);
        const hasBackup = await env.ONBOARDING_KV.get(hourKey);
        if (!hasBackup) {
          await env.ONBOARDING_KV.put(hourKey, JSON.stringify(current), { expirationTtl: 604800 });
        }
      } catch {}

      // Merge: incoming sobrescreve current, exceto listas que encolheriam catastroficamente
      const merged = { ...current, ...body };
      const listKeys = ['wc_imoveis','wc_prestadores','wc_users','wc_membros','wc_itens'];
      for (const k of listKeys) {
        const sv = Array.isArray(current[k]) ? current[k] : [];
        const iv = Array.isArray(body[k])    ? body[k]    : [];
        // Cair para 0, ou de ≥8 para ≤2: mantém servidor
        if ((iv.length === 0 && sv.length > 0) || (sv.length >= 8 && iv.length <= 2)) {
          merged[k] = sv;
        }
      }

      // lastSaved: aceita o do cliente se for mais novo
      if (body.lastSaved && +body.lastSaved > +(current.lastSaved || 0)) {
        merged.lastSaved = body.lastSaved;
      }

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
      const payload = { stats: body.stats ?? [], prestadores: body.prestadores ?? [], atualizadoEm: new Date().toISOString() };
      await env.ONBOARDING_KV.put(STATS_KEY, JSON.stringify(payload));
      return json({ ok: true });
    }

    // ── GET /onboarding-stats (sem auth — a Claire lê aqui) ───────────────────
    if (request.method === 'GET' && path === '/onboarding-stats') {
      const raw  = await env.ONBOARDING_KV.get(STATS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      // Suporta formato antigo (array) e novo (objeto)
      const stats      = Array.isArray(data) ? data : (data.stats ?? []);
      const prestadores = Array.isArray(data) ? [] : (data.prestadores ?? []);
      const atualizadoEm = data.atualizadoEm ?? null;
      // KPIs calculados
      const ativos    = stats.filter(s => s.status === 'ativo' && s.diasOnboarding != null);
      const mediaOnboarding = ativos.length
        ? Math.round(ativos.reduce((s,x) => s + x.diasOnboarding, 0) / ativos.length)
        : null;
      const emOnboarding = stats.filter(s => s.status && s.status !== 'ativo' && s.status !== 'perdido').length;
      return json({ ok: true, stats, prestadores, kpi: { mediaOnboardingDias: mediaOnboarding, totalAtivos: ativos.length, emOnboarding }, atualizadoEm });
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

    // ── GET /imovel-dados (leitura para o Jarvis) ─────────────────────────────
    if (request.method === 'GET' && path === '/imovel-dados') {
      if (!checkAuth(token, env)) return unauthorized();
      const imovelId = url.searchParams.get('id') || '';
      if (!imovelId) return json({ ok: false, error: 'id obrigatório' }, 400);
      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im      = imoveis.find(i => String(i.id) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      return json({ ok: true, imovel: {
        id: im.id, nome: im.nome, endereco: im.endereco,
        proprietarioNome: im.proprietarioNome, proprietarioTel: im.proprietarioTel,
        quartos: im.quartos, banheiros: im.banheiros, status: im.status,
        captacaoLink: im.captacaoLink, dataCriacao: im.dataCriacao, dataAtivacao: im.dataAtivacao,
        observacoes: im.observacoes, formRespostas: im.formRespostas ?? {},
        jarvisPreenchidoEm: im.jarvisPreenchidoEm,
      }});
    }

    // ── POST /jarvis-notify (webhook do Jarvis) ────────────────────────────────
    if (request.method === 'POST' && path === '/jarvis-notify') {
      if (!checkAuth(token, env)) return unauthorized();
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      const imovelId = body.id || url.searchParams.get('id') || '';
      if (!imovelId) return json({ ok: false, error: 'id obrigatório' }, 400);
      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im      = imoveis.find(i => String(i.id) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      const dados = body.dados || {};
      // Pré-preenche sem sobrescrever dados já existentes
      if (dados.captacaoLink)    im.captacaoLink    = dados.captacaoLink;
      if (dados.proprietarioNome && !im.proprietarioNome) im.proprietarioNome = dados.proprietarioNome;
      if (dados.proprietarioTel  && !im.proprietarioTel)  im.proprietarioTel  = dados.proprietarioTel;
      if (dados.endereco         && !im.endereco)          im.endereco         = dados.endereco;
      if (dados.quartos          && !im.quartos)           im.quartos          = +dados.quartos;
      if (dados.banheiros        && !im.banheiros)         im.banheiros        = +dados.banheiros;
      if (dados.observacoes      && !im.observacoes)       im.observacoes      = dados.observacoes;
      // Preenche rascunho do formulário sem sobrescrever confirmados
      if (dados.formRascunho && typeof dados.formRascunho === 'object') {
        if (!im.formRascunho) im.formRascunho = {};
        const conf = im.formConfirmados || {};
        for (const k in dados.formRascunho) {
          if (!conf[k]) im.formRascunho[k] = dados.formRascunho[k];
        }
      }
      im.jarvisPreenchidoEm = new Date().toISOString();
      await putState(env, state);
      return json({ ok: true, imovel: { id: im.id, nome: im.nome, status: im.status } });
    }

    // ── POST /analisar-fotos (IA analisa fotos e preenche campos) ─────────────
    if (request.method === 'POST' && path === '/analisar-fotos') {
      if (!checkAuth(token, env)) return unauthorized();
      if (!env.AI) return json({ ok: false, error: 'Workers AI não configurado' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      const fotos = Array.isArray(body.fotos) ? body.fotos.slice(0, 3) : [];
      if (!fotos.length) return json({ ok: false, error: 'Nenhuma foto enviada' }, 400);

      const base64 = fotos[0].replace(/^data:image\/\w+;base64,/, '');
      const imageArr = [...atob(base64)].map(c => c.charCodeAt(0));
      const prompt = `Você é especialista em análise de imóveis para aluguel por temporada.
Analise esta foto e extraia APENAS o que for claramente visível.
Retorne SOMENTE um JSON válido, sem texto adicional:
{"quartos":"numero ou vazio","banheiros":"numero ou vazio","tipo_cama":"Solteiro/Casal/Queen/King ou vazio","descricao":"descricao objetiva do ambiente","condicao":"excelente/boa/regular","observacoes":"outros detalhes relevantes"}`;
      try {
        const out = await env.AI.run('@cf/llava-1.5-7b-hf-gguf', { image: imageArr, prompt, max_tokens: 400 });
        const texto = (out?.response || out?.result || '') + '';
        let dados = {};
        const ini = texto.indexOf('{'); const fim = texto.lastIndexOf('}');
        if (ini >= 0 && fim > ini) { try { dados = JSON.parse(texto.slice(ini, fim + 1)); } catch {} }
        return json({ ok: true, dados });
      } catch (e) {
        return json({ ok: false, error: 'Falha na IA: ' + (e?.message || 'desconhecido') }, 500);
      }
    }

    // ── POST /imovel-fotos (Jarvis envia URLs externas de fotos) ─────────────
    if (request.method === 'POST' && path === '/imovel-fotos') {
      if (!checkAuth(token, env)) return unauthorized();
      const imovelId = url.searchParams.get('id') || '';
      if (!imovelId) return json({ ok: false, error: 'id obrigatório' }, 400);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

      const urls = Array.isArray(body.urls) ? body.urls.filter(u => typeof u === 'string') : [];
      if (!urls.length) return json({ ok: false, error: 'urls vazio' }, 400);

      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im      = imoveis.find(i => String(i.id) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);

      if (!Array.isArray(im.fotos)) im.fotos = [];

      let total = 0;
      for (const fotoUrl of urls.slice(0, 20)) {
        try {
          const res = await fetch(fotoUrl, { cf: { cacheEverything: true } });
          if (!res.ok) continue;
          const ct   = res.headers.get('content-type') || 'image/jpeg';
          const buf  = await res.arrayBuffer();
          // Converte para base64 data URL (mesmo formato da aba Fotos do front)
          const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const data = `data:${ct};base64,${b64}`;
          const nome = fotoUrl.split('/').pop().split('?')[0] || `foto_${Date.now()}.jpg`;
          im.fotos.push({ nome, data, tipo: ct, fonte: body.fonte || 'externo' });
          total++;
        } catch {}
      }

      if (total > 0) await putState(env, state);
      return json({ ok: true, total });
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
