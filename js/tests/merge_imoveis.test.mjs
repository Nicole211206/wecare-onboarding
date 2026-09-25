// Bug 1 (2026-09-25): merge por campo de wc_imoveis no cliente — espelho de
// backend/app/merge_campos.py. _imDiff calcula o patch; _imRebase junta edição local pendente
// com a versão nova do servidor.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carregarApp} from './harness.mjs';

const app = carregarApp();
const run = (fn, ...args) => JSON.parse(app.run(`JSON.stringify(${fn}(...${JSON.stringify(args)}))`));
const IM = {id: 'im1', nome: 'Apto', endereco: 'Rua A', status: 'setup', compras: {itA: {comprado: false}},
  manutencoes: [{id: 'm1', titulo: 'Pia'}], camas: [{tipo: 'Casal', qtd: 1}]};

test('diff: só as unidades alteradas', () => {
  const local = {...IM, nome: 'Novo', compras: {itA: {comprado: true}}, manutencoes: [{id: 'm1', titulo: 'Pia'}, {id: 'm2', titulo: 'Luz'}]};
  const ops = run('_imDiff', [IM], [local]);
  assert.deepEqual(ops.map(o => o.caminho).sort(), [['compras', 'itA'], ['manutencoes', 'm2'], ['nome']].sort());
});

test('diff: status/statusAnterior/dataAtivacao vão juntos, camas vai inteira', () => {
  const ops = run('_imDiff', [IM], [{...IM, dataAtivacao: '2026-09-01', camas: [{tipo: 'King', qtd: 1}]}]);
  assert.deepEqual(ops.map(o => o.caminho).sort(), [['_status'], ['camas']]);
});

test('rebase: campos diferentes, os dois ficam', () => {
  const local = {...IM, nome: 'Nome local'};
  const servidor = {...IM, endereco: 'Rua do servidor'};
  const {lista, conflitos} = run('_imRebase', [IM], [local], [servidor]);
  assert.equal(conflitos.length, 0);
  assert.equal(lista[0].nome, 'Nome local');
  assert.equal(lista[0].endereco, 'Rua do servidor');
});

test('rebase: mesmo campo com valores diferentes = conflito, vale o servidor', () => {
  const {lista, conflitos} = run('_imRebase', [IM], [{...IM, nome: 'Local'}], [{...IM, nome: 'Servidor'}]);
  assert.equal(conflitos.length, 1);
  assert.equal(lista[0].nome, 'Servidor');
});

test('rebase: item de lista novo dos dois lados, os dois ficam', () => {
  const local = {...IM, manutencoes: [...IM.manutencoes, {id: 'mL', titulo: 'Local'}]};
  const servidor = {...IM, manutencoes: [...IM.manutencoes, {id: 'mS', titulo: 'Servidor'}]};
  const {lista} = run('_imRebase', [IM], [local], [servidor]);
  assert.deepEqual(lista[0].manutencoes.map(m => m.id), ['m1', 'mS', 'mL']);
});

test('rebase: editar imóvel que outra pessoa apagou = conflito', () => {
  const {lista, conflitos} = run('_imRebase', [IM], [{...IM, nome: 'Local'}], []);
  assert.equal(conflitos.length, 1);
  assert.equal(lista.length, 0);
});
