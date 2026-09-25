// Bug 1 (2026-09-25), de ponta a ponta: backend real (uvicorn, banco temporário) + duas "abas"
// rodando o js/app.js real. Reproduz o incidente: duas pessoas abrem o mesmo imóvel e editam
// campos diferentes — antes o save da segunda desfazia o da primeira.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {carregarApp} from './harness.mjs';

const BACKEND = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend');
const PORTA = 18900 + Math.floor(Math.random() * 90);
const URL = `http://127.0.0.1:${PORTA}`;
let servidor, tmp;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-e2e-'));
  servidor = spawn('uv', ['run', '--no-sync', 'uvicorn', 'app.main:app', '--port', String(PORTA)], {
    cwd: BACKEND, stdio: 'ignore',
    env: {...process.env, AUTH_TOKEN: 't', DATABASE_URL: `sqlite:///${tmp}/e2e.db`, MEDIA_DIR: `${tmp}/media`},
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(URL + '/')).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('backend não subiu');
});
after(() => { servidor?.kill(); fs.rmSync(tmp, {recursive: true, force: true}); });

async function aba() {
  const a = carregarApp({fetch});
  a.run(`window.WC_SYNC={url:${JSON.stringify(URL)},token:'t'};loadAll();`);
  await a.run('kvPull(false)');
  return a;
}
const salvar = async a => { a.run('saveAll()'); await a.run('_kvSendNow()'); };
const imovel = (a, id) => JSON.parse(a.run(`JSON.stringify(getImovel(${JSON.stringify(id)}))`));

test('duas abas editam campos diferentes do mesmo imóvel: as duas edições ficam', async () => {
  const A = await aba();
  A.run(`imoveis.push({id:'im_e2e',nome:'Apto',endereco:'Rua A',compras:{}})`);
  await salvar(A);
  const B = await aba();
  assert.equal(imovel(B, 'im_e2e').nome, 'Apto');

  A.run(`getImovel('im_e2e').nome='Nome da A'`);
  B.run(`getImovel('im_e2e').endereco='Rua da B'`);
  await salvar(A);
  await salvar(B);  // B não puxou a edição da A antes de salvar
  await A.run('kvPull(false)');
  await B.run('kvPull(false)');

  for (const t of [A, B]) {
    assert.equal(imovel(t, 'im_e2e').nome, 'Nome da A');
    assert.equal(imovel(t, 'im_e2e').endereco, 'Rua da B');
  }
  const doServidor = (await (await fetch(URL + '/load?token=t')).json()).data.wc_imoveis.find(i => i.id === 'im_e2e');
  assert.equal(doServidor.nome, 'Nome da A');
  assert.equal(doServidor.endereco, 'Rua da B');
});

test('duas abas editam o MESMO campo: fica o de quem salvou primeiro e a segunda é avisada', async () => {
  const A = await aba(), B = await aba();
  A.run(`getImovel('im_e2e').nome='Primeiro'`);
  B.run(`getImovel('im_e2e').nome='Segundo'`);
  await salvar(A);
  await salvar(B);
  assert.equal(imovel(B, 'im_e2e').nome, 'Primeiro');
  assert.ok(B.toasts.some(t => /mesmos campos/.test(t)), B.toasts.join(' | '));
});

test('edição local pendente não se perde quando chega edição de outra pessoa no pull', async () => {
  const A = await aba(), B = await aba();
  A.run(`getImovel('im_e2e').captacaoLink='https://drive.google.com/drive/folders/X'`);
  await salvar(A);
  B.run(`getImovel('im_e2e').nome='Nome pendente da B';saveAll()`);  // ainda não enviado
  await B.run('kvPull(false)');
  assert.equal(imovel(B, 'im_e2e').nome, 'Nome pendente da B');
  assert.equal(imovel(B, 'im_e2e').captacaoLink, 'https://drive.google.com/drive/folders/X');
  await B.run('_kvSendNow()');
  await A.run('kvPull(false)');
  assert.equal(imovel(A, 'im_e2e').nome, 'Nome pendente da B');
  assert.equal(imovel(A, 'im_e2e').captacaoLink, 'https://drive.google.com/drive/folders/X');
});
