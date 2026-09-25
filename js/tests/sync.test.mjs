// Protocolo do /save (ver PROTOCOLO_MINIMO em backend/app/merge.py): o servidor recusa gravação
// de cliente sem `_proto` >= 2 (aba com app.js antigo em cache, que chavearia compras por posição).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carregarApp} from './harness.mjs';

test('o corpo do /save leva _proto 2 e só as coleções alteradas', () => {
  const a = carregarApp({localStorage: {wc_itens: [{id: 'itA', nome: 'Rodo', qtdRule: '1-unidade'}]}});
  a.run('loadAll()');
  a.run(`_sync.revs={wc_itens:3,wc_templates_msg:1};_sync.hashes={wc_itens:_syncHashLocal('wc_itens'),wc_templates_msg:'x'};`);
  a.run(`localStorage.setItem('wc_templates_msg', JSON.stringify([{nome:'oi',texto:'x'}]))`);
  const {blob} = JSON.parse(a.run('JSON.stringify(_syncMontarBlob())'));
  assert.equal(blob._proto, 2);
  assert.deepEqual(Object.keys(blob).filter(k => k.startsWith('wc_')), ['wc_templates_msg']);
  assert.deepEqual(blob._baseRevs, {wc_templates_msg: 1});
});
