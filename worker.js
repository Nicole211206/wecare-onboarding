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
//   GET  /vistoria-load?id=X&vid=V&t=T  → carrega uma vistoria específica (token escopado, sem auth mestre)
//   POST /vistoria-save?id=X&vid=V&t=T  → salva/envia uma vistoria específica
//   POST /vistoria-midia?id=X&vid=V&t=T → anexa frames (foto/vídeo) de um cômodo à vistoria
//   POST /extrair-formulario            → IA extrai dados de transcrição
//   GET  /imovel-dados?id=X&token=T     → leitura de imóvel para o Jarvis (metadados das fotos, sem base64)
//   GET  /foto?id=X&index=N&token=T     → serve foto como binário (image/jpeg) diretamente do KV
//   GET  /imovel-fotos?id=X&page=1&limit=5&token=T → índice paginado com URLs de /foto
//   POST /jarvis-notify?id=X&token=T    → webhook de notificação do Jarvis
//   GET  /jarvis-pending?token=T        → lista de imóveis com análise de fotos pendente

const KV_KEY   = 'wc_state';
const STATS_KEY = 'wc_stats';

// Aceita a lista nova como está (respeita exclusões de propósito) — só recupera itens do
// servidor quando a encolhida parece catastrófica (cliente desatualizado sobrescrevendo o
// imóvel inteiro), mesma regra de listKeys/listKeysEstritas abaixo. Antes recuperava QUALQUER
// item ausente incondicionalmente, o que impedia apagar itensExtras/eventosExtras/vistorias
// de vez — a exclusão sempre "voltava" na sincronização seguinte.
function mergeItemArraysById(oldArr, newArr) {
  const oldA = Array.isArray(oldArr) ? oldArr : [];
  const newA = Array.isArray(newArr) ? newArr : [];
  const catastrofica = (newA.length === 0 && oldA.length > 0) || (oldA.length >= 8 && newA.length <= 2);
  if (!catastrofica) return newA;
  const newIds = new Set(newA.filter(x => x && x.id).map(x => x.id));
  const recuperados = oldA.filter(x => x && x.id && !newIds.has(x.id));
  return [...newA, ...recuperados];
}

// compras/ops não são arrays (são objetos soltos por imóvel), então nunca passavam pela
// proteção de "encolhida catastrófica" acima — um dispositivo desatualizado sincronizando
// sobrescrevia esses campos inteiros sem chance de recuperação (incidente 2026-07-23, imóvel
// Ária Higienópolis: 35 itens marcados como comprado + datas de fotos/limpeza voltaram a
// zero/vazio). Mede quantos itens do catálogo de compras estão marcados como comprado — se
// isso despenca catastroficamente, o "novo" compras provavelmente é uma versão antiga.
function contarComprados(compras) {
  return Object.values(compras || {}).filter(c => c && c.comprado).length;
}
function mergeCompras(oldCompras, newCompras) {
  const oldCount = contarComprados(oldCompras);
  const newCount = contarComprados(newCompras);
  const catastrofica = (newCount === 0 && oldCount > 0) || (oldCount >= 8 && newCount <= 2);
  return catastrofica ? (oldCompras || {}) : (newCompras || {});
}
// Mesma lógica pro "ops" (fotos/limpeza/vistoria): se um campo de data que já estava
// preenchido some (vira ''), quase certo que é sobrescrita de cliente desatualizado — uma
// data marcada não costuma ser apagada de propósito, só substituída por outra data.
function mergeOps(oldOps, newOps) {
  const o = oldOps || {};
  const n = { ...(newOps || {}) };
  for (const k of ['fotos', 'limpeza', 'vistoria']) {
    if (!o[k]) continue;
    const nk = { ...(n[k] || {}) };
    if (o[k].data && !nk.data) nk.data = o[k].data;
    n[k] = nk;
  }
  return n;
}

// Casa imóveis por id entre o estado antigo e o novo e recupera itens de sublistas
// (itensExtras, eventosExtras, manutenções, compras em lote, gastos avulsos) que sumiram no
// imóvel novo mas existiam no antigo, além de compras/ops (ver mergeCompras/mergeOps acima).
function reconciliarSublistasImoveis(oldImoveis, newImoveis) {
  if (!Array.isArray(oldImoveis) || !Array.isArray(newImoveis)) return newImoveis;
  const oldById = new Map(oldImoveis.filter(i => i && i.id).map(i => [i.id, i]));
  return newImoveis.map(im => {
    if (!im || !im.id || !oldById.has(im.id)) return im;
    const old = oldById.get(im.id);
    return {
      ...im,
      itensExtras:   mergeItemArraysById(old.itensExtras,   im.itensExtras),
      eventosExtras: mergeItemArraysById(old.eventosExtras, im.eventosExtras),
      vistorias:     mergeItemArraysById(old.vistorias,     im.vistorias),
      manutencoes:   mergeItemArraysById(old.manutencoes,   im.manutencoes),
      comprasLotes:  mergeItemArraysById(old.comprasLotes,  im.comprasLotes),
      gastosAvulsos: mergeItemArraysById(old.gastosAvulsos, im.gastosAvulsos),
      compras: mergeCompras(old.compras, im.compras),
      ops:     mergeOps(old.ops, im.ops),
    };
  });
}

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

// diferente de `if(val)`: aceita 0 como valor válido (ex: "0 lavabos", "andar 0")
function hasVal(v) {
  return v !== undefined && v !== null && v !== '';
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

async function getGoogleAccessToken(env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google OAuth error: ' + JSON.stringify(data));
  return data.access_token;
}

function extractFolderId(driveUrl) {
  const m = String(driveUrl || '').match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function listDriveFolder(folderId, accessToken) {
  // Detecta se é pasta normal, pasta dentro de Shared Drive, ou raiz de Shared Drive
  async function findSharedDriveId() {
    // Tenta como arquivo/pasta
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,driveId&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (!data.error) return data.driveId || null; // pasta normal ou dentro de shared drive

    // Se 404, pode ser a raiz de um Shared Drive (drive ID = folder ID)
    if (data.error && data.error.code === 404) {
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/drives/${folderId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const driveData = await driveRes.json();
      if (!driveData.error) return folderId; // é um Shared Drive root
    }
    return null;
  }

  const sharedDriveId = await findSharedDriveId();
  const extraParams = sharedDriveId
    ? `&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=drive&driveId=${sharedDriveId}`
    : `&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  async function listLevel(id) {
    const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=100${extraParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (data.error) throw new Error('Drive API: ' + JSON.stringify(data.error));
    return Array.isArray(data.files) ? data.files : [];
  }

  const level1 = await listLevel(folderId);
  const allFiles = [...level1];

  const folders1 = level1.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  for (const f1 of folders1.slice(0, 10)) {
    try {
      const level2 = await listLevel(f1.id);
      allFiles.push(...level2);
      const folders2 = level2.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      for (const f2 of folders2.slice(0, 10)) {
        try { allFiles.push(...await listLevel(f2.id)); } catch {}
      }
    } catch {}
  }

  return allFiles;
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
      // Listas curtas e curadas manualmente (config) — só rejeita encolhida catastrófica
      // (dispositivo desatualizado zerando a lista), mesma regra do listKeys acima. Antes
      // qualquer encolhida era rejeitada, o que impedia até um apagar de 1 item só de
      // colar (ex: remover 1 campo de vistoria nunca "pegava" de verdade na sincronização).
      const listKeysEstritas = ['wc_def_operacionais', 'wc_limpeza_checkout', 'wc_vistoria_campos', 'wc_templates_msg', 'wc_orcamentos'];
      for (const k of listKeysEstritas) {
        const sv = Array.isArray(current[k]) ? current[k] : [];
        const iv = Array.isArray(body[k])    ? body[k]    : [];
        if ((iv.length === 0 && sv.length > 0) || (sv.length >= 8 && iv.length <= 2)) {
          merged[k] = sv;
        }
      }

      // Recupera itensExtras/eventosExtras apagados por um save com wc_imoveis desatualizado
      // (mesmo imóvel, mas o array veio sem itens que já existiam no servidor)
      merged.wc_imoveis = reconciliarSublistasImoveis(current.wc_imoveis, merged.wc_imoveis);

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
      // Lê imóveis diretamente do estado para KPI de onboarding na Claire
      const stateRaw = await env.ONBOARDING_KV.get(KV_KEY);
      const state2 = stateRaw ? JSON.parse(stateRaw) : {};
      // Só inclui imóveis com contrato assinado (contratoAssinado=true ou passaram da fase 'contrato')
      const todosImoveis = Array.isArray(state2.wc_imoveis) ? state2.wc_imoveis : [];
      const imoveis = todosImoveis
        .filter(im => im.status !== 'perdido' && (im.contratoAssinado === true || im.status !== 'contrato'))
        .map(im => ({ nome: im.nome, status: im.status, dataCriacao: im.dataCriacao, dataContratoAssinado: im.dataContratoAssinado || null, dataAtivacao: im.dataAtivacao, incluirKpiClaire: !!im.incluirKpiClaire, mesReferenciaKpi: im.mesReferenciaKpi || null }));
      // KPIs calculados
      const ativos    = stats.filter(s => s.status === 'ativo' && s.diasOnboarding != null);
      const mediaOnboarding = ativos.length
        ? Math.round(ativos.reduce((s,x) => s + x.diasOnboarding, 0) / ativos.length)
        : null;
      const emOnboarding = stats.filter(s => s.status && s.status !== 'ativo' && s.status !== 'perdido').length;
      // Média de "tempo de onboarding" por mês de referência, só para imóveis marcados "colocar na Claire"
      // Mede Contrato → Ativo (dataContratoAssinado), não a criação do card no kanban (dataCriacao) —
      // o card pode ser criado antes ou depois da assinatura de fato, o que distorcia a métrica.
      const kpiPorMes = {};
      todosImoveis
        .filter(im => im.incluirKpiClaire === true && im.mesReferenciaKpi && im.dataContratoAssinado && im.dataAtivacao)
        .forEach(im => {
          const mes = im.mesReferenciaKpi;
          const dias = (new Date(im.dataAtivacao) - new Date(im.dataContratoAssinado)) / 86400000;
          if (!kpiPorMes[mes]) kpiPorMes[mes] = { somaDias: 0, count: 0 };
          kpiPorMes[mes].somaDias += dias;
          kpiPorMes[mes].count += 1;
        });
      for (const mes in kpiPorMes) {
        kpiPorMes[mes].mediaOnboardingDias = +(kpiPorMes[mes].somaDias / kpiPorMes[mes].count).toFixed(1);
        delete kpiPorMes[mes].somaDias;
      }
      // Soma de "valor de setup cobrado" (previsto) vs "fotos+limpeza+vistoria+extras marcados como setup" (gasto) por mês, só para imóveis marcados "colocar o Setup na Claire"
      const setupPorMes = {};
      todosImoveis
        .filter(im => im.incluirSetupClaire === true && im.mesReferenciaKpi)
        .forEach(im => {
          const mes = im.mesReferenciaKpi;
          const previsto = +im.valorSetupCobrado || 0;
          const gastosExtras = Array.isArray(im.eventosExtras) ? im.eventosExtras.filter(e => e.gastoSetup).reduce((s, e) => s + (+e.custo || 0), 0) : 0;
          const gasto = (+im.ops?.fotos?.custo || 0) + (+im.ops?.limpeza?.custo || 0) + (+im.ops?.vistoria?.custo || 0) + gastosExtras;
          if (!setupPorMes[mes]) setupPorMes[mes] = { previsto: 0, gasto: 0, count: 0 };
          setupPorMes[mes].previsto += previsto;
          setupPorMes[mes].gasto += gasto;
          setupPorMes[mes].count += 1;
        });
      return json({ ok: true, stats, imoveis, prestadores, kpi: { mediaOnboardingDias: mediaOnboarding, totalAtivos: ativos.length, emOnboarding }, kpiPorMes, setupPorMes, atualizadoEm });
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
      if (body.enviado === true) im.formEnviadoEm = new Date().toISOString();
      state.lastSaved      = Date.now(); // garante que o pull no app detecte mudança

      await putState(env, state);
      return json({ ok: true });
    }

    // ── GET /vistoria-load?id=IMOVEL_ID&vid=VISTORIA_ID&t=VISTORIA_TOKEN ─────
    // Mesmo padrão do /form-load: token escopado a UMA vistoria de UM imóvel,
    // nunca o token mestre — seguro pra mandar pra um vistoriador externo.
    if (request.method === 'GET' && path === '/vistoria-load') {
      const imovelId   = url.searchParams.get('id')  || '';
      const vistoriaId = url.searchParams.get('vid') || '';
      const vt         = url.searchParams.get('t')   || '';

      if (!imovelId || !vistoriaId || !vt) return json({ ok: false, error: 'Link incompleto' }, 400);

      const state = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);

      const vistorias = Array.isArray(im.vistorias) ? im.vistorias : [];
      const v = vistorias.find(x => x.id === vistoriaId);
      if (!v)              return json({ ok: false, error: 'Vistoria não encontrada' }, 404);
      if (v.token !== vt)  return json({ ok: false, error: 'Token inválido' },          403);

      return json({
        ok:            true,
        imovelNome:    im.nome || im.id,
        comodos:       Array.isArray(v.comodosSnapshot) ? v.comodosSnapshot : [],
        camposVistoria: Array.isArray(state.wc_vistoria_campos) ? state.wc_vistoria_campos : [],
        dados:         v.dados ?? {},
        status:        v.status || 'rascunho',
      });
    }

    // ── POST /vistoria-save?id=IMOVEL_ID&vid=VISTORIA_ID&t=VISTORIA_TOKEN ────
    if (request.method === 'POST' && path === '/vistoria-save') {
      const imovelId   = url.searchParams.get('id')  || '';
      const vistoriaId = url.searchParams.get('vid') || '';
      const vt         = url.searchParams.get('t')   || '';

      if (!imovelId || !vistoriaId || !vt) return json({ ok: false, error: 'Link incompleto' }, 400);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

      const state = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);

      const vistorias = Array.isArray(im.vistorias) ? im.vistorias : [];
      const v = vistorias.find(x => x.id === vistoriaId);
      if (!v)              return json({ ok: false, error: 'Vistoria não encontrada' }, 404);
      if (v.token !== vt)  return json({ ok: false, error: 'Token inválido' },          403);

      // Preserva midiaFrames por cômodo — são enviados à parte via /vistoria-midia (upload
      // imediato ao adicionar um vídeo/foto), não pelo autosave. Sem isso, o próximo
      // autosave (a cada 30s) sobrescreveria v.dados inteiro e apagaria a mídia já salva,
      // já que o cliente nunca inclui midiaFrames no payload do autosave de propósito
      // (evita re-transmitir os frames inteiros a cada 30s).
      const dadosAntigos = v.dados || {};
      const dadosNovos   = body.dados ?? {};
      if (Array.isArray(dadosAntigos.comodos) && Array.isArray(dadosNovos.comodos)) {
        dadosNovos.comodos.forEach((c, idx) => {
          const antigo = dadosAntigos.comodos[idx];
          if (antigo && Array.isArray(antigo.midiaFrames) && !(c && Array.isArray(c.midiaFrames))) {
            c.midiaFrames = antigo.midiaFrames;
          }
        });
      }
      v.dados        = dadosNovos;
      v.atualizadoEm = new Date().toISOString();

      // Cria as manutenções pendentes só na primeira vez que a vistoria é marcada como enviada
      // (evita duplicar se o cliente reenviar por retry de rede)
      if (body.enviado === true && v.status !== 'enviado') {
        v.status    = 'enviado';
        v.enviadoEm = v.atualizadoEm;
        const pendencias = Array.isArray(v.dados.pendencias) ? v.dados.pendencias : [];
        if (pendencias.length) {
          if (!im.manutencoes) im.manutencoes = [];
          pendencias.forEach(p => {
            im.manutencoes.push({
              id: 'man_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              comodo: p.comodo, descricao: p.descricao, status: 'pendente', custo: 0,
              criadoEm: v.enviadoEm, origem: 'vistoria', vistoriaId: v.id,
            });
          });
        }
      }

      state.lastSaved = Date.now();
      await putState(env, state);
      return json({ ok: true });
    }

    // ── POST /vistoria-midia?id=X&vid=V&t=T ──────────────────────────────────
    // Recebe frames (JPEG base64, já extraídos do vídeo/foto no navegador — ver
    // vistoria.html _extrairFramesVideo) e anexa ao cômodo, fora do ciclo de autosave
    // do /vistoria-save. Guarda no mesmo formato base64 cru (sem prefixo data:) já
    // usado pelos blocos de imagem da Anthropic em /analisar-drive, pra poder alimentar
    // uma análise por IA depois sem reformatar nada.
    if (request.method === 'POST' && path === '/vistoria-midia') {
      const imovelId   = url.searchParams.get('id')  || '';
      const vistoriaId = url.searchParams.get('vid') || '';
      const vt         = url.searchParams.get('t')   || '';
      if (!imovelId || !vistoriaId || !vt) return json({ ok: false, error: 'Link incompleto' }, 400);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
      const comodoIdx = Number(body.comodoIdx);
      const frames = Array.isArray(body.frames) ? body.frames.filter(f => typeof f === 'string').slice(0, 4) : [];
      if (!Number.isInteger(comodoIdx) || comodoIdx < 0 || !frames.length) {
        return json({ ok: false, error: 'Dados inválidos' }, 400);
      }

      const state = await getState(env);
      const imoveis = Array.isArray(state.wc_imoveis) ? state.wc_imoveis : [];
      const im = imoveis.find(i => String(i.id) === imovelId || String(i.uuid) === imovelId);
      if (!im) return json({ ok: false, error: 'Imóvel não encontrado' }, 404);

      const v = (Array.isArray(im.vistorias) ? im.vistorias : []).find(x => x.id === vistoriaId);
      if (!v)              return json({ ok: false, error: 'Vistoria não encontrada' }, 404);
      if (v.token !== vt)  return json({ ok: false, error: 'Token inválido' },          403);
      if (v.status === 'enviado') return json({ ok: false, error: 'Vistoria já enviada' }, 409);

      if (!v.dados) v.dados = {};
      if (!Array.isArray(v.dados.comodos)) v.dados.comodos = [];
      if (!v.dados.comodos[comodoIdx]) v.dados.comodos[comodoIdx] = {};
      if (!Array.isArray(v.dados.comodos[comodoIdx].midiaFrames)) v.dados.comodos[comodoIdx].midiaFrames = [];

      // Trava de segurança: wc_state inteiro (todos os imóveis) mora numa única chave KV
      // com teto de 25MB — sem limite por vistoria, um único vistoriador poderia estourar
      // o sistema inteiro. 60 frames ~ poucos MB, dá folga confortável por vistoria.
      const totalAtual = v.dados.comodos.reduce((s, c) => s + ((c && Array.isArray(c.midiaFrames)) ? c.midiaFrames.length : 0), 0);
      const espaco = Math.max(0, 60 - totalAtual);
      const aAdicionar = frames.slice(0, espaco);
      v.dados.comodos[comodoIdx].midiaFrames.push(...aAdicionar);

      state.lastSaved = Date.now();
      await putState(env, state);
      return json({ ok: true, adicionados: aAdicionar.length, total: v.dados.comodos[comodoIdx].midiaFrames.length, limiteAtingido: aAdicionar.length < frames.length });
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
      const _set = (qid, val) => { if (!conf[qid] && hasVal(val)) im.formRascunho[qid] = String(val); };
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

// ── GET /drive-debug — diagnóstico temporário ────────────────────────────
    if (request.method === 'GET' && path === '/drive-debug') {
      if (!checkAuth(token, env)) return unauthorized();
      try {
        const at = await getGoogleAccessToken(env);
        const about = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', { headers: { Authorization: `Bearer ${at}` } });
        const aboutData = await about.json();
        // Listar Shared Drives
        // Testar listar WC-00667 com driveId do Shared Drive
        const sharedDriveId = '0ALYveJNZWSbmUk9PVA';
        const folderId = url.searchParams.get('folderId') || '1Z5Vh_u3ssklp1Aq3KX9bVuMag7G08EVz';
        const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=drive&driveId=${sharedDriveId}`,
          { headers: { Authorization: `Bearer ${at}` } }
        );
        const listData = await listRes.json();
        return json({ ok: true, user: aboutData.user, listData });
      } catch(e) { return json({ ok: false, error: e.message }); }
    }

    // ── POST /analisar-drive — Google Drive + Claude Haiku ───────────────────
    if (request.method === 'POST' && path === '/analisar-drive') {
      if (!checkAuth(token, env)) return unauthorized();
      if (!env.ANTHROPIC_KEY)       return json({ ok: false, error: 'ANTHROPIC_KEY não configurada' }, 500);
      if (!env.GOOGLE_CLIENT_ID)    return json({ ok: false, error: 'GOOGLE_CLIENT_ID não configurada' }, 500);
      if (!env.GOOGLE_REFRESH_TOKEN) return json({ ok: false, error: 'GOOGLE_REFRESH_TOKEN não configurada' }, 500);

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
      let accessToken;
      try { accessToken = await getGoogleAccessToken(env); }
      catch(e) { return json({ ok: false, error: 'Erro Google Auth: ' + e.message }, 500); }

      // Debug: verificar qual conta está autenticada e metadata da pasta
      const aboutMe = await fetch(
        `https://www.googleapis.com/drive/v3/about?fields=user`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).then(r => r.json());
      const folderMeta = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,driveId,parents,mimeType&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).then(r => r.json());

      // Listar arquivos da pasta
      let files;
      try { files = await listDriveFolder(folderId, accessToken); }
      catch(e) { return json({ ok: false, error: 'Erro Drive API: ' + e.message, folderId, folderMeta }, 500); }

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
        // Texto puro / Markdown → tenta baixar como texto
        if (file.mimeType === 'text/plain' || file.mimeType === 'text/markdown') {
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
{"quartos":0,"salas":0,"banheirosCompletos":0,"banheirosLavabo":0,"cozinha":0,"lavanderia":0,"areaExterna":0,"varanda":0,"camas":[{"tipo":"Queen","qtd":1}],"proprietarioNome":"","proprietarioTel":"","proprietarioEmail":"","endereco":"","wifi_rede":"","wifi_senha":"","acesso":"","senha_porta":"","vaga":"","zelador_nome":"","zelador_tel":"","observacoes":"","short_stay_permitido":"","restricoes":"","comissao_pct":0,"comissao_base":"","valor_setup_cobrado":0,"fonte_valor_setup_cobrado":"","definicoes":{"seguroEasyCover":false,"kitAmenities":false,"internetClaro":false,"ecohost":false,"fechaduraEletronica":false},"formRascunho":{"q9":"","q81":"","q82":"","q83":"","q86":""}}
Regras:
- Use 0, "" ou false para campos não encontrados. NÃO invente informações.
- PRIORIDADE DE FONTE para qualquer dado comercial/financeiro (comissão, taxa de setup, seguro, taxas, pagadoria): o CONTRATO ASSINADO é a ÚNICA fonte válida. Documentos do tipo proposta, minuta, orçamento, e-mail de negociação ou apresentação comercial são preliminares e podem estar desatualizados — NUNCA use um valor desses documentos se houver um contrato assinado na pasta, mesmo que o contrato seja mais difícil de ler. Se houver contrato assinado mas você não encontrar o valor dentro dele, deixe o campo em branco (0/"") em vez de usar o valor de uma proposta.
- Tipos de cama aceitos: Solteiro, Casal, Queen, King, Beliche, Sofá-cama Solteiro, Sofá-cama Casal.
- endereco / q9: monte o endereço MAIS COMPLETO possível (rua, número, complemento/apto, bairro, cidade, estado, CEP) do imóvel indicado pelo nome informado no contexto. Se a pasta contiver documentos de um portfólio com VÁRIOS imóveis do mesmo proprietário, use APENAS o endereço que corresponda claramente a este imóvel específico — se não for possível identificar com segurança qual endereço é deste imóvel, deixe em branco em vez de arriscar um endereço de outra unidade.
- proprietarioEmail: e-mail do proprietário ou de quem assinou o contrato em nome dele (procure em contratos, assinaturas, cabeçalhos de e-mail, cartão de visita).
- q81: como hóspedes acessam (portaria, fechadura, etc.) + senha da porta + vaga
- q82: em qual andar ficam as áreas de lazer do condomínio (piscina, academia, salão de festas, espaço gourmet, etc.), se mencionado nos documentos
- q83: nome e telefone do zelador/portaria
- q86: rede e senha do Wi-Fi
- short_stay_permitido: "sim" se a convenção do condomínio permite aluguel por temporada/short stay, "nao" se proibido, "" se não mencionado
- comissao_pct / comissao_base: percentual de comissão da WeCare e sua base de cálculo, EXATAMENTE como estiver no contrato. comissao_base = "bruta" se o contrato disser "receita bruta" ou "faturamento bruto"; "liquida" se disser "receita líquida" (após taxas de plataforma/impostos). Leia com atenção — não assuma, use a palavra literal do contrato.
- valor_setup_cobrado: valor em reais da taxa de setup/start-up cobrada do proprietário (é um valor único de implantação, não a comissão recorrente mensal). Confira o número com atenção antes de responder — não arredonde nem aproxime.
- fonte_valor_setup_cobrado: copie e cole a frase EXATA (verbatim) do documento onde você leu o valor de valor_setup_cobrado, incluindo o nome do arquivo se identificável.
- definicoes: são serviços/produtos contratados da WeCare mencionados nos documentos (ex: "seguro EasyCover obrigatório" → seguroEasyCover:true; fechadura eletrônica instalada → fechaduraEletronica:true). NÃO são restrições.
- restricoes: SOMENTE limitações de uso do imóvel que não têm campo próprio no onboarding — proibição de animais, de festas, número máximo de hóspedes, cláusulas restritivas do condomínio/contrato. NUNCA inclua aqui seguro, kit amenities, internet, fechadura eletrônica, comissão, taxa de setup ou pagadoria — isso são produtos/condições comerciais, não restrições, e já têm campo próprio.`;

      const userContent = [];
      if (textoContexto.trim()) {
        userContent.push({ type: 'text', text: 'Contexto extraído dos documentos:\n' + textoContexto.slice(0, 20000) });
      }
      for (const img of imageParts) {
        userContent.push(img);
      }
      if (!userContent.length) {
        return json({ ok: false, error: 'Nenhum conteúdo analisável. Arquivos: ' + (filesSeen.length ? filesSeen.join(', ') : 'nenhum') + ' | Conta: ' + (aboutMe.user?.emailAddress||'?') + ' | Pasta: ' + JSON.stringify(folderMeta), filesFound: filesSeen }, 400);
      }
      userContent.push({ type: 'text', text: `Nome deste imóvel no sistema: "${im.nome || ''}". Extraia os dados deste imóvel específico e retorne o JSON.` });

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
      // Exceção: quartos/salas/banheirosCompletos nascem com valor padrão 1 (não vazio),
      // então na primeira análise (antes de qualquer confirmação manual) eles também são sobrescritos.
      const primeiraAnalise = !im.claudeAnalisadoEm;
      const mapaDir = { proprietarioNome:'proprietarioNome', proprietarioTel:'proprietarioTel', proprietarioEmail:'proprietarioEmail', endereco:'endereco', observacoes:'observacoes', acesso:'acesso', senha_porta:'senhaPorta', vaga:'vaga', zelador_nome:'zeladorNome', zelador_tel:'zeladorTel' };
      for (const [rk, ik] of Object.entries(mapaDir)) {
        if (resultado[rk] && !im[ik]) im[ik] = resultado[rk];
      }
      const numCampos = ['quartos','salas','banheirosCompletos','banheirosLavabo','cozinha','lavanderia','areaExterna','varanda'];
      const numCamposComDefault = ['quartos','salas','banheirosCompletos'];
      for (const k of numCampos) {
        if (!hasVal(resultado[k])) continue;
        const comDefault = numCamposComDefault.includes(k);
        // Campos com default 1: só sobrescreve na 1ª análise e se a IA de fato encontrou um valor (>0).
        const podeSobrescrever = comDefault ? (primeiraAnalise && +resultado[k] > 0) : !im[k];
        if (podeSobrescrever) im[k] = +resultado[k];
      }
      if (Array.isArray(resultado.camas) && resultado.camas.length && (!Array.isArray(im.camas) || !im.camas.length)) {
        im.camas = resultado.camas;
      }
      if (resultado.wifi_rede || resultado.wifi_senha) {
        if (!im.wifi) im.wifi = {};
        if (resultado.wifi_rede  && !im.wifi.rede)  im.wifi.rede  = resultado.wifi_rede;
        if (resultado.wifi_senha && !im.wifi.senha) im.wifi.senha = resultado.wifi_senha;
      }
      if (resultado.short_stay_permitido && !im.shortStayPermitido) im.shortStayPermitido = resultado.short_stay_permitido;
      if (resultado.restricoes && !im.restricoes) im.restricoes = resultado.restricoes;
      // comissão: comissaoWecare (default 20) e comissaoBase (default 'liquida') também nascem com
      // valor não-vazio — mesma exceção da 1ª análise usada pra quartos/salas/banheiros.
      if (resultado.comissao_base === 'bruta' || resultado.comissao_base === 'liquida') {
        if (primeiraAnalise) im.comissaoBase = resultado.comissao_base;
      }
      if (hasVal(resultado.comissao_pct) && +resultado.comissao_pct > 0) {
        if (primeiraAnalise) im.comissaoWecare = +resultado.comissao_pct;
      }
      if (hasVal(resultado.valor_setup_cobrado) && +resultado.valor_setup_cobrado > 0 && !im.valorSetupCobrado) {
        im.valorSetupCobrado = +resultado.valor_setup_cobrado;
      }
      // definições/extras (Seguro EasyCover, Kit Amenities, Internet Claro, EcoHost, Fechadura Eletrônica)
      const defs = resultado.definicoes || {};
      const defCampos = ['seguroEasyCover','kitAmenities','internetClaro','ecohost','fechaduraEletronica'];
      if (!im.defOperacionais) im.defOperacionais = {};
      for (const dk of defCampos) {
        if (defs[dk] === true && !im[dk]) {
          im[dk] = true;
          im.defOperacionais[dk] = true;
        }
      }
      // formRascunho
      if (!im.formRascunho) im.formRascunho = {};
      const conf = im.formConfirmados || {};
      const fr = resultado.formRascunho || {};
      for (const [qid, val] of Object.entries(fr)) {
        if (!conf[qid] && hasVal(val)) im.formRascunho[qid] = String(val);
      }

      im.claudeAnalisadoEm  = new Date().toISOString();
      im.arquivosAnalisados = files.length;
      state.lastSaved       = Date.now(); // garante que o pull no app detecte mudança

      await putState(env, state);
      return json({ ok: true, arquivos: files.length, resultado });
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
