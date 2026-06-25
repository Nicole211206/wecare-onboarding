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

// ── Google Drive + Claude Haiku helpers ──────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function getGoogleAccessToken(saJson) {
  const sa = typeof saJson === 'string' ? JSON.parse(saJson) : saJson;
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const signingInput = `${header}.${payload}`;
  // Import the private key
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sig = arrayBufferToBase64(sigBuf)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signingInput}.${sig}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error('Google token error: ' + JSON.stringify(tokenJson));
  return tokenJson.access_token;
}

function extractFolderId(driveUrl) {
  const m = String(driveUrl || '').match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function listDriveFolder(folderId, accessToken) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=100&orderBy=modifiedTime%20desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  const files = Array.isArray(data.files) ? data.files : [];

  // Recursão um nível: entra em sub-pastas
  const subfolders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const subFiles = [];
  for (const sf of subfolders.slice(0, 10)) {
    try {
      const q2 = encodeURIComponent(`'${sf.id}' in parents and trashed=false`);
      const r2 = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q2}&fields=files(id,name,mimeType,size)&pageSize=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const d2 = await r2.json();
      if (Array.isArray(d2.files)) subFiles.push(...d2.files);
    } catch {}
  }
  return [...files, ...subFiles];
}

async function exportGoogleDoc(fileId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return '';
  return await res.text();
}

async function downloadFileBase64(fileId, mimeType, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return { base64: arrayBufferToBase64(buf), mimeType };
}

// ─────────────────────────────────────────────────────────────────────────────

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
      state.lastSaved      = Date.now(); // garante que o pull no app detecte mudança

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
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
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

    // ── POST /analisar-drive — Google Drive + Claude Haiku ───────────────────
    if (request.method === 'POST' && path === '/analisar-drive') {
      if (!checkAuth(token, env)) return unauthorized();
      if (!env.ANTHROPIC_KEY)        return json({ ok: false, error: 'ANTHROPIC_KEY não configurada' }, 500);
      if (!env.GOOGLE_SERVICE_ACCOUNT) return json({ ok: false, error: 'GOOGLE_SERVICE_ACCOUNT não configurada' }, 500);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      const imovelId = body.id || '';
      if (!imovelId) return json({ ok: false, error: 'id obrigatório' }, 400);

      // Carregar estado do KV (sempre necessário para salvar de volta)
      const state   = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      let im        = imoveis.find(i => String(i.id) === imovelId);
      if (!im) {
        // imóvel não está no KV ainda — cria um stub para ser populado
        im = { id: imovelId };
        imoveis.push(im);
        state.wc_imoveis = imoveis;
      }

      // captacaoLink pode vir direto no body (frontend envia) ou do KV
      const captacaoLink = body.captacaoLink || im.captacaoLink || '';
      if (captacaoLink) im.captacaoLink = captacaoLink; // persiste se veio no body

      const folderId = extractFolderId(captacaoLink);
      if (!folderId) return json({ ok: false, error: 'Link da pasta Drive inválido ou não configurado' }, 400);

      // Obter token Google
      const accessToken = await getGoogleAccessToken(env.GOOGLE_SERVICE_ACCOUNT);

      // Listar arquivos da pasta
      const files = await listDriveFolder(folderId, accessToken);

      // Baixar conteúdo relevante
      const IMAGE_TYPES = ['image/jpeg','image/png','image/webp'];
      const textParts  = [];
      const imageParts = [];
      const filesSeen  = files.map(f => `${f.name} (${f.mimeType})`);
      let imagesCount  = 0;

      for (const file of files) {
        if (!file.mimeType) continue;
        // Vídeos — apenas nota
        if (file.mimeType.startsWith('video/')) {
          textParts.push(`[Vídeo disponível: ${file.name}]`);
          continue;
        }
        // Google Docs → exporta como texto
        if (file.mimeType === 'application/vnd.google-apps.document') {
          try {
            const text = await exportGoogleDoc(file.id, accessToken);
            if (text) textParts.push(`=== ${file.name} ===\n${text.slice(0, 8000)}`);
          } catch {}
          continue;
        }
        // Google Sheets → exporta como CSV
        if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
          try {
            const r2 = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (r2.ok) { const txt = await r2.text(); textParts.push(`=== ${file.name} ===\n${txt.slice(0,3000)}`); }
          } catch {}
          continue;
        }
        // PDFs → envia como documento base64 para Claude
        if (file.mimeType === 'application/pdf') {
          try {
            const img = await downloadFileBase64(file.id, 'application/pdf', accessToken);
            if (img) {
              imageParts.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: img.base64 } });
            }
          } catch {}
          continue;
        }
        // Texto puro / DOCX → tenta baixar como texto
        if (file.mimeType === 'text/plain') {
          try {
            const r2 = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (r2.ok) { const txt = await r2.text(); textParts.push(`=== ${file.name} ===\n${txt.slice(0,4000)}`); }
          } catch {}
          continue;
        }
        // Imagens
        if (IMAGE_TYPES.includes(file.mimeType) && imagesCount < 10) {
          try {
            const img = await downloadFileBase64(file.id, file.mimeType, accessToken);
            if (img) {
              imageParts.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } });
              imagesCount++;
            }
          } catch {}
        }
      }

      // Contexto de vistoria
      const vistoria = body.vistoriaRecente;
      let vistoriaCtx = '';
      if (vistoria) {
        vistoriaCtx = '\n\n=== DADOS DA VISTORIA RECENTE ===\n';
        if (vistoria.pendencias)  vistoriaCtx += `Pendências: ${vistoria.pendencias}\n`;
        if (vistoria.comodos)     vistoriaCtx += `Cômodos: ${JSON.stringify(vistoria.comodos)}\n`;
        if (vistoria.aptoPara)    vistoriaCtx += `Apto para: ${vistoria.aptoPara}\n`;
      }

      const textoContexto = textParts.join('\n\n') + vistoriaCtx;

      // Montar mensagem para Claude
      const systemPrompt = `Você é um assistente especializado em imóveis para aluguel por temporada da WeCare Hosting.
Analise os documentos e imagens fornecidos (pasta do Google Drive do imóvel) e extraia as informações do imóvel.
Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois.
Estrutura esperada:
{"quartos":0,"salas":0,"banheirosCompletos":0,"banheirosLavabo":0,"cozinha":0,"lavanderia":0,"areaExterna":0,"varanda":0,"camas":[{"tipo":"Queen","qtd":1}],"proprietarioNome":"","proprietarioTel":"","endereco":"","wifi_rede":"","wifi_senha":"","acesso":"","senha_porta":"","vaga":"","zelador_nome":"","zelador_tel":"","observacoes":"","formRascunho":{"q9":"","q81":"","q83":"","q86":""}}
Regras:
- Use 0 ou "" para campos não encontrados. NÃO invente informações.
- Tipos de cama aceitos: Solteiro, Casal, Queen, King, Beliche, Sofá-cama Solteiro, Sofá-cama Casal.
- q9: endereço completo do imóvel
- q81: como hóspedes acessam (portaria, fechadura, etc.) + senha da porta + vaga
- q83: nome e telefone do zelador/portaria
- q86: rede e senha do Wi-Fi`;

      const userContent = [];
      if (textoContexto.trim()) {
        userContent.push({ type: 'text', text: 'Contexto extraído dos documentos:\n' + textoContexto.slice(0, 20000) });
      }
      for (const img of imageParts) {
        userContent.push(img);
      }
      if (!userContent.length) {
        return json({ ok: false, error: 'Nenhum conteúdo analisável encontrado na pasta', filesFound: filesSeen }, 400);
      }
      userContent.push({ type: 'text', text: 'Extraia os dados do imóvel e retorne o JSON.' });

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        }),
      });

      if (!claudeRes.ok) {
        const err = await claudeRes.text();
        return json({ ok: false, error: 'Erro Claude: ' + err }, 502);
      }

      const claudeJson = await claudeRes.json();
      const rawText = claudeJson?.content?.[0]?.text || '';
      let resultado = {};
      const ini = rawText.indexOf('{');
      const fim = rawText.lastIndexOf('}');
      if (ini >= 0 && fim > ini) {
        try { resultado = JSON.parse(rawText.slice(ini, fim + 1)); } catch { resultado = {}; }
      }

      // Aplicar resultado ao imóvel (só preenche campos vazios)
      const campos = ['proprietarioNome','proprietarioTel','endereco','observacoes','acesso','senhaPorta','vaga','zeladorNome','zeladorTel'];
      const mapaDir = { proprietarioNome:'proprietarioNome', proprietarioTel:'proprietarioTel', endereco:'endereco', observacoes:'observacoes', acesso:'acesso', senha_porta:'senhaPorta', vaga:'vaga', zelador_nome:'zeladorNome', zelador_tel:'zeladorTel' };
      for (const [rk, ik] of Object.entries(mapaDir)) {
        if (resultado[rk] && !im[ik]) im[ik] = resultado[rk];
      }
      const numCampos = ['quartos','salas','banheirosCompletos','banheirosLavabo','cozinha','lavanderia','areaExterna','varanda'];
      for (const k of numCampos) {
        if (resultado[k] && !im[k]) im[k] = +resultado[k];
      }
      if (Array.isArray(resultado.camas) && resultado.camas.length && (!Array.isArray(im.camas) || !im.camas.length)) {
        im.camas = resultado.camas;
      }
      if (resultado.wifi_rede || resultado.wifi_senha) {
        if (!im.wifi) im.wifi = {};
        if (resultado.wifi_rede  && !im.wifi.rede)  im.wifi.rede  = resultado.wifi_rede;
        if (resultado.wifi_senha && !im.wifi.senha) im.wifi.senha = resultado.wifi_senha;
      }
      // formRascunho
      if (!im.formRascunho) im.formRascunho = {};
      const conf = im.formConfirmados || {};
      const fr = resultado.formRascunho || {};
      for (const [qid, val] of Object.entries(fr)) {
        if (!conf[qid] && val) im.formRascunho[qid] = String(val);
      }

      im.claudeAnalisadoEm  = new Date().toISOString();
      im.arquivosAnalisados = files.length;

      await putState(env, state);
      return json({ ok: true, arquivos: files.length, resultado });
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
