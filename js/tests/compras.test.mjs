// Bug 2 (2026-09-25): im.compras era chaveado pela POSIÇÃO do item no catálogo ("7",
// "0_Casal"...). Apagar um item do meio deslocava todas as marcações dos itens seguintes, em
// todos os imóveis (ex.: o "comprado" do Protetor de Travesseiro passava a mostrar o que era
// do Travesseiro Toque de Pluma). Agora a chave é o id estável do item.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carregarApp} from './harness.mjs';

const CATALOGO = [
  {id: 'itA', cat: 'Limpeza', nome: 'Rodo', tipoPreco: 'fixo', preco: 10, enxovalDep: false, qtdRule: '1-unidade'},
  {id: 'itB', cat: 'Limpeza', nome: 'Balde', tipoPreco: 'fixo', preco: 20, enxovalDep: false, qtdRule: '1-unidade'},
  {id: 'itC', cat: 'Limpeza', nome: 'Pá', tipoPreco: 'fixo', preco: 30, enxovalDep: false, qtdRule: '1-unidade'},
  {id: 'itD', cat: 'Cama', nome: 'Edredom', tipoPreco: 'enxoval', enxovalDep: true, qtdRule: '1-colchao'},
];
const IMOVEL = {id: 'im1', nome: 'Apto', camas: [{tipo: 'Casal', qtd: 1}], quartos: 1, banheiros: 1, compras: {}};

function app() {
  const a = carregarApp({localStorage: {wc_itens: CATALOGO, wc_imoveis: [IMOVEL]}});
  a.run('loadAll()');
  return a;
}
// Marca como comprado a linha do item pelo nome, do jeito que a aba Compras faz (subKey da linha)
function marcarComprado(a, nomeLabel) {
  a.run(`(()=>{const im=getImovel('im1');const r=_rowsComprasTodos(im).find(r=>r.label===${JSON.stringify(nomeLabel)});
    im.compras[r.subKey]={comprado:true};})()`);
}
const comprados = a => JSON.parse(a.run(`JSON.stringify(_rowsComprasTodos(getImovel('im1')).filter(r=>r.comprado).map(r=>r.label))`));

test('apagar um item do meio do catálogo não desloca o "comprado" dos outros', () => {
  const a = app();
  marcarComprado(a, 'Pá');
  marcarComprado(a, 'Edredom (Casal)');
  assert.deepEqual(comprados(a).sort(), ['Edredom (Casal)', 'Pá']);
  a.run(`apagarItemConfig(ITENS_COMPRAS.findIndex(i=>i.nome==='Balde'))`);
  assert.deepEqual(comprados(a).sort(), ['Edredom (Casal)', 'Pá']);
});

test('compras são gravadas pela chave do id do item, não pela posição', () => {
  const a = app();
  marcarComprado(a, 'Pá');
  marcarComprado(a, 'Edredom (Casal)');
  const chaves = Object.keys(JSON.parse(a.run(`JSON.stringify(getImovel('im1').compras)`))).sort();
  assert.deepEqual(chaves, ['itC', 'itD_Casal']);
});

test('item novo criado em Configurações ganha id estável', () => {
  const a = app();
  a.run(`ITENS_COMPRAS.push(_novoItemCatalogo({cat:'Limpeza',nome:'Vassoura',tipoPreco:'fixo',preco:5,enxovalDep:false,qtdRule:'1-unidade'}))`);
  const novo = JSON.parse(a.run('JSON.stringify(ITENS_COMPRAS.at(-1))'));
  assert.match(novo.id, /^it[a-z0-9]+$/);
  assert.ok(!CATALOGO.some(i => i.id === novo.id));
});

test('catálogo sem ids (navegador sem dado do servidor) recebe ids no loadAll', () => {
  const a = carregarApp({localStorage: {wc_itens: CATALOGO.map(({id, ...resto}) => resto)}});
  a.run('loadAll()');
  const ids = JSON.parse(a.run('JSON.stringify(ITENS_COMPRAS.map(i=>i.id))'));
  assert.ok(ids.every(id => /^it[a-z0-9]+$/.test(id)));
  assert.equal(new Set(ids).size, ids.length);
});
