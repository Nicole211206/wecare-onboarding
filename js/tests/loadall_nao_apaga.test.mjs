// Incidente 2026-10-08: o loadAll chamava saveAll() (migração das Anotações em post-its) no MEIO
// do carregamento, antes de ler modelos de negócio, proprietários, modalidades de enxoval e
// orçamentos. Eles ainda estavam vazios na memória e eram gravados de volta como [] no
// localStorage; o push seguinte apagava as quatro coleções no servidor.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carregarApp} from './harness.mjs';

const ls = () => ({
  wc_anotacoes_texto: JSON.stringify('<b>texto antigo</b>'),          // dispara a migração para post-its
  wc_modelos_negocio: [{id: 'm1', nome: 'Modelo X', etapas: []}],
  wc_proprietarios: [{id: 'p1', nome: 'Maria'}],
  wc_modalidades_enxoval: [{id: 'e1', nome: 'Fornecedor Y'}],
  wc_orcamentos: [{id: 'o1', nome: 'Orçamento Z'}],
  wc_def_operacionais: [{id: 'd1', nome: 'Fotos'}],     // dispara o seed de etapas
});

test('loadAll com migração de anotações não esvazia as outras coleções no localStorage', () => {
  const app = carregarApp({localStorage: ls()});
  app.run('loadAll()');
  const lido = k => JSON.parse(app.run(`localStorage.getItem('${k}')`));
  assert.equal(lido('wc_modelos_negocio').length, 1);
  assert.equal(lido('wc_proprietarios').length, 1);
  assert.equal(lido('wc_modalidades_enxoval').length, 1);
  assert.equal(lido('wc_orcamentos').length, 1);
});

test('a migração de anotações continua acontecendo e é gravada', () => {
  const app = carregarApp({localStorage: ls()});
  app.run('loadAll()');
  const notas = JSON.parse(app.run("localStorage.getItem('wc_anotacoes_notas')"));
  assert.equal(notas[0].id, 'nota_legado');
  assert.equal(JSON.parse(app.run("localStorage.getItem('wc_anotacoes_texto')")), '');
});
