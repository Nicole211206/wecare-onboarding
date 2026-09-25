// Bug 3 (2026-09-25): "Vassoura de Pelos volta sozinha se alguém apagar". Causa: migrações
// antigas no loadAll (_migrarCatalogoItens, 2026-07-17) rodavam a cada carregamento, em todo
// navegador, e reaplicavam o catálogo de julho por cima das escolhas da usuária. O seed de
// Modelos de Negócio / Modalidades de Enxoval tinha o mesmo defeito ao esvaziar a lista.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carregarApp} from './harness.mjs';

const item = (nome, extra = {}) => ({cat: 'Limpeza', nome, tipoPreco: 'fixo', preco: 10, enxovalDep: false, qtdRule: '1-unidade', ...extra});

function carregarCom(ls) {
  const app = carregarApp({localStorage: ls});
  app.run('loadAll()');
  return app;
}
const itens = app => JSON.parse(app.run('JSON.stringify(ITENS_COMPRAS)'));

test('item apagado do catálogo não volta no próximo carregamento', () => {
  const app = carregarCom({wc_itens: [item('Rodo'), item('Balde')]});  // sem "Vassoura de Pelos"
  assert.deepEqual(itens(app).map(i => i.nome), ['Rodo', 'Balde']);
});

test('restrição de modalidade removida pela usuária continua removida', () => {
  const app = carregarCom({wc_itens: [item('Jogo de Cama Basic Percalle', {cat: 'Cama', modalidades: null}), item('Vassoura de Pelos')]});
  assert.equal(itens(app)[0].modalidades, null);
});

test('restrição de modalidade colocada num item de Cozinha é mantida', () => {
  const app = carregarCom({wc_itens: [item('Air Fryer', {cat: 'Cozinha', modalidades: ['flashee']}), item('Vassoura de Pelos')]});
  assert.deepEqual(itens(app)[0].modalidades, ['flashee']);
});

test('estoque de enxoval e sem sofá-cama desmarcados continuam desmarcados', () => {
  const app = carregarCom({wc_itens: [
    item('Toalha de Banho Lory Hotel', {estoqueEnxoval: false}),
    item('Protetor de Colchão', {semSofaCama: false}),
    item('Vassoura de Pelos'),
  ]});
  const [toalha, protetor] = itens(app);
  assert.equal(toalha.estoqueEnxoval, false);
  assert.equal(protetor.semSofaCama, false);
});

test('item renomeado pela usuária não é renomeado de volta', () => {
  const app = carregarCom({wc_itens: [item('Detector de Fumaça'), item('Vassoura de Pelos')]});
  assert.equal(itens(app)[0].nome, 'Detector de Fumaça');
});

test('modelos de negócio e modalidades de enxoval esvaziados não são semeados de novo', () => {
  const app = carregarCom({wc_itens: [item('Rodo')], wc_modelos_negocio: [], wc_modalidades_enxoval: []});
  assert.equal(app.run('MODELOS_NEGOCIO.length'), 0);
  assert.equal(app.run('MODALIDADES_ENXOVAL.length'), 0);
});

test('navegador sem nenhum dado salvo ainda recebe os modelos/modalidades padrão', () => {
  const app = carregarCom({});
  assert.ok(app.run('MODELOS_NEGOCIO.length') > 0);
  assert.ok(app.run('MODALIDADES_ENXOVAL.length') > 0);
});
