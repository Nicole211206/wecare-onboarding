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
//   GET  /imovel-dados?id=X&token=T     → leitura de imóvel para o Jarvis (metadados das fotos, sem base64)
//   GET  /foto?id=X&index=N&token=T     → serve foto como binário (image/jpeg) diretamente do KV
//   GET  /imovel-fotos?id=X&page=1&limit=5&token=T → índice paginado com URLs de /foto
//   POST /jarvis-notify?id=X&token=T    → webhook de notificação do Jarvis
//   GET  /jarvis-pending?token=T        → lista de imóveis com análise de fotos pendente

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
      const fotosArr = Array.isArray(im.fotos) ? im.fotos : [];
      return json({ ok: true, imovel: {
        id: im.id, nome: im.nome, endereco: im.endereco,
        proprietarioNome: im.proprietarioNome, proprietarioTel: im.proprietarioTel,
        quartos: im.quartos, banheiros: im.banheiros, status: im.status,
        captacaoLink: im.captacaoLink, dataCriacao: im.dataCriacao, dataAtivacao: im.dataAtivacao,
        observacoes: im.observacoes, formRespostas: im.formRespostas ?? {},
        jarvisPreenchidoEm: im.jarvisPreenchidoEm,
        fotosTotal: fotosArr.length,
        fotosMeta: fotosArr.map((f, i) => ({ index: i, nome: f.nome || `foto_${i}`, tipo: f.tipo || 'image/jpeg', fonte: f.fonte || 'upload' })),
      }});
    }

    // ── GET /foto?id=X&index=N&token=T (serve foto como binário — sem base64) ──
    if (request.method === 'GET' && path === '/foto') {
      if (!checkAuth(token, env)) return unauthorized();
      const imovelId = url.searchParams.get('id') || '';
      const idx      = parseInt(url.searchParams.get('index') || '0', 10);
      if (!imovelId) return json({ ok: false, error: 'id obrigatório' }, 400);
      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im      = imoveis.find(i => String(i.id) === imovelId);
      if (!im) return new Response('Imóvel não encontrado', { status: 404, headers: CORS });
      const fotosArr = Array.isArray(im.fotos) ? im.fotos : [];
      const foto = fotosArr[idx];
      if (!foto) return new Response('Foto não encontrada', { status: 404, headers: CORS });
      const dataUrl = foto.data || '';
      const match   = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return new Response('Foto sem dados', { status: 422, headers: CORS });
      const ct  = match[1] || 'image/jpeg';
      const bin = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      return new Response(bin, { headers: { ...CORS, 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600' } });
    }

    // ── GET /imovel-fotos?id=X&page=1&limit=5&token=T (índice paginado de fotos) ─
    if (request.method === 'GET' && path === '/imovel-fotos') {
      if (!checkAuth(token, env)) return unauthorized();
      const imovelId = url.searchParams.get('id') || '';
      if (!imovelId) return json({ ok: false, error: 'id obrigatório' }, 400);
      const page  = Math.max(1, parseInt(url.searchParams.get('page')  || '1', 10));
      const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get('limit') || '5', 10)));
      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im      = imoveis.find(i => String(i.id) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);
      const fotosArr = Array.isArray(im.fotos) ? im.fotos : [];
      const total = fotosArr.length;
      const start = (page - 1) * limit;
      const base  = new URL(request.url).origin;
      const fotos = fotosArr.slice(start, start + limit).map((f, i) => ({
        index: start + i, nome: f.nome || `foto_${start + i}`, tipo: f.tipo || 'image/jpeg',
        fonte: f.fonte || 'upload',
        url: `${base}/foto?id=${encodeURIComponent(imovelId)}&index=${start + i}&token=${encodeURIComponent(token)}`,
      }));
      return json({ ok: true, total, page, limit, pages: Math.ceil(total / limit), fotos });
    }

    // ── GET /jarvis-pending (fila de análises pendentes) ─────────────────────
    if (request.method === 'GET' && path === '/jarvis-pending') {
      if (!checkAuth(token, env)) return unauthorized();
      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const pending = imoveis
        .filter(im => im.fotosIaSolicitadoEm)
        .map(im => ({ id: im.id, nome: im.nome, solicitadoEm: im.fotosIaSolicitadoEm, fotosCount: Array.isArray(im.fotos) ? im.fotos.length : 0 }));
      return json({ ok: true, pending });
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
      // Pré-preenche campos diretos do imóvel sem sobrescrever existentes
      if (dados.captacaoLink)    im.captacaoLink    = dados.captacaoLink;
      if (dados.proprietarioNome && !im.proprietarioNome) im.proprietarioNome = dados.proprietarioNome;
      if (dados.proprietarioTel  && !im.proprietarioTel)  im.proprietarioTel  = dados.proprietarioTel;
      if (dados.endereco         && !im.endereco)          im.endereco         = dados.endereco;
      if (dados.quartos)         im.quartos          = +dados.quartos;
      if (dados.banheiros)       im.banheiros        = +dados.banheiros;
      if (dados.observacoes      && !im.observacoes)       im.observacoes      = dados.observacoes;
      // Campos nomeados de acesso (formato amigável para o Jarvis)
      if (dados.wifi_rede || dados.wifi_senha) {
        if (!im.wifi) im.wifi = {};
        if (dados.wifi_rede)  im.wifi.rede  = dados.wifi_rede;
        if (dados.wifi_senha) im.wifi.senha = dados.wifi_senha;
      }
      if (dados.acesso)        im.acesso       = dados.acesso;
      if (dados.senha_porta)   im.senhaPorta   = dados.senha_porta;
      if (dados.vaga)          im.vaga         = dados.vaga;
      if (dados.zelador_nome)  im.zeladorNome  = dados.zelador_nome;
      if (dados.zelador_tel)   im.zeladorTel   = dados.zelador_tel;
      if (Array.isArray(dados.camas) && dados.camas.length) im.camas = dados.camas;
      // Mapeia campos nomeados → formRascunho automaticamente
      if (!im.formRascunho) im.formRascunho = {};
      const conf = im.formConfirmados || {};
      const _set = (qid, val) => { if (!conf[qid] && val) im.formRascunho[qid] = String(val); };
      const wifiRede  = dados.wifi_rede  || im.wifi?.rede  || '';
      const wifiSenha = dados.wifi_senha || im.wifi?.senha || '';
      const acesso    = dados.acesso     || im.acesso      || '';
      const senhaPorta= dados.senha_porta|| im.senhaPorta  || '';
      const vaga      = dados.vaga       || im.vaga        || '';
      const zelNome   = dados.zelador_nome || im.zeladorNome || '';
      const zelTel    = dados.zelador_tel  || im.zeladorTel  || '';
      const acessoParts = [acesso, senhaPorta ? `Senha da porta: ${senhaPorta}` : '', vaga ? `Vaga: ${vaga}` : ''].filter(Boolean);
      if (acessoParts.length) _set('q81', acessoParts.join('\n'));
      if (zelNome || zelTel) _set('q83', [zelNome, zelTel].filter(Boolean).join(' — '));
      if (wifiRede || wifiSenha) _set('q86', [wifiRede ? `Rede: ${wifiRede}` : '', wifiSenha ? `Senha: ${wifiSenha}` : ''].filter(Boolean).join('\n'));
      if (dados.endereco || im.endereco) _set('q9', dados.endereco || im.endereco);
      // Aceita formRascunho direto (q-ids) se vier junto
      if (dados.formRascunho && typeof dados.formRascunho === 'object') {
        for (const k in dados.formRascunho) {
          if (!conf[k]) im.formRascunho[k] = dados.formRascunho[k];
        }
      }
      im.jarvisPreenchidoEm = new Date().toISOString();
      await putState(env, state);
      return json({ ok: true, imovel: { id: im.id, nome: im.nome, status: im.status } });
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

    // ── GET /gemini-config — retorna chave para upload direto no browser ────
    if (request.method === 'GET' && path === '/gemini-config') {
      if (!checkAuth(token, env)) return unauthorized();
      return json({ ok: true, apiKey: env.GEMINI_API_KEY });
    }

    // ── POST /analisar-midia — analisa imagens/frames com Gemini ─────────────
    if (request.method === 'POST' && path === '/analisar-midia') {
      if (!checkAuth(token, env)) return unauthorized();
      if (!env.GEMINI_API_KEY) return json({ ok: false, error: 'GEMINI_API_KEY não configurada' }, 500);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

      const frames = Array.isArray(body.frames) ? body.frames.slice(0, 12) : [];
      if (!frames.length) return json({ ok: false, error: 'Nenhum frame enviado' }, 400);

      const prompt = `Você é um assistente que extrai dados de imóveis para short stay a partir de imagens ou frames de vídeo.
Analise cuidadosamente todas as imagens enviadas e extraia SOMENTE o que for claramente visível.
Retorne um JSON válido com esta estrutura (use null para campos não encontrados):
{
  "wifi_rede": "nome da rede wifi",
  "wifi_senha": "senha do wifi",
  "acesso": "como hóspedes entram no imóvel (portaria, fechadura, chave, etc.)",
  "senha_porta": "código/senha da fechadura eletrônica",
  "vaga": "informação sobre vaga de garagem",
  "zelador_nome": "nome do zelador ou porteiro",
  "zelador_tel": "telefone do zelador ou portaria",
  "quartos": 0,
  "banheiros": 0,
  "camas": [{"tipo": "Queen", "qtd": 1}],
  "observacoes": "outras informações úteis para hospedagem"
}
Tipos de cama aceitos: Solteiro, Casal, Queen, King, Beliche, Sofá-cama Solteiro, Sofá-cama Casal.
Retorne APENAS o JSON, sem markdown, sem texto extra.`;

      const parts = [{ text: prompt }];
      for (const frame of frames) {
        const mimeType = frame.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
        parts.push({ inline_data: { mime_type: mimeType, data: frame } });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } })
        }
      );

      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        return json({ ok: false, error: 'Erro Gemini: ' + err }, 502);
      }

      const geminiJson = await geminiRes.json();
      const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let dados;
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        dados = JSON.parse(clean);
      } catch {
        return json({ ok: false, error: 'Gemini não retornou JSON válido', raw: text }, 502);
      }

      return json({ ok: true, dados });
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
