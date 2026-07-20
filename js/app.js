// ═══════════════════ ESTADO ═══════════════════
let imoveis=[], membros=[], usuarios=[], prestadores=[];
let _imovelAtivoId=null, _abaAtiva='dados';
let _editMembroIdx=null, _editUsuarioEmail=null, _editPrestadorIdx=null;
let templatesMsg=[], processoTexto='', anotacoesTexto='', manualFornecedores='';
let _infoTabAtiva='mensagens', _editTemplateMsgIdx=null;

// ═══════════════════ FASES ═══════════════════
const FASES=['contrato','setup','vistoria_compras','formulario','preparacao','anuncio'];
const FASE_LABEL={
  contrato:'Contrato', setup:'Setup e Definições', vistoria_compras:'Vistoria e Compras',
  formulario:'Formulário', preparacao:'Preparação do Imóvel', anuncio:'Criação do Anúncio'
};
const FASE_COLOR={
  contrato:'sky', setup:'gold', vistoria_compras:'peach',
  formulario:'lav', preparacao:'rose', anuncio:'lavender'
};
// Migração: imóveis com status das fases antigas (antes do reagrupamento de 2026-07) caem na fase nova equivalente
const FASES_LEGADO_MAP={compras:'vistoria_compras', producao:'preparacao', compilamento:'anuncio', auditoria:'anuncio'};
function _migrarFasesAntigas(){
  let mudou=false;
  imoveis.forEach(im=>{
    if(FASES_LEGADO_MAP[im.status]){im.status=FASES_LEGADO_MAP[im.status];mudou=true;}
    if(FASES_LEGADO_MAP[im.statusAnterior]){im.statusAnterior=FASES_LEGADO_MAP[im.statusAnterior];}
  });
  if(mudou)saveAll();
}
// Migração: gastosSetup (aba Contrato) unificado em eventosExtras (aba Produção), marcados com gastoSetup:true
function _migrarGastosSetup(){
  let mudou=false;
  imoveis.forEach(im=>{
    if(im.gastosSetup&&im.gastosSetup.length){
      if(!im.eventosExtras)im.eventosExtras=[];
      im.gastosSetup.forEach(g=>{
        im.eventosExtras.push({id:uid(),titulo:g.nome,data:'',hora:'',responsavel:'',custo:+g.valor||0,gastoSetup:true});
      });
      im.gastosSetup=[];
      mudou=true;
    }
  });
  if(mudou)saveAll();
}
// Migração: ITENS_COMPRAS é dado persistido (localStorage/KV) — uma vez salvo, o array do código
// nunca mais é usado numa conta existente (loadAll sempre sobrescreve com o que já está salvo).
// Por isso mudanças no catálogo (novos campos, itens novos, renomeações) precisam ser aplicadas aqui
// em cima do array já carregado, SEM mexer na posição dos itens existentes — im.compras é indexado
// pelo índice do array, então reordenar/remover um item no meio confundiria os dados já salvos.
function _migrarCatalogoItens(){
  let mudou=false;
  const detector=ITENS_COMPRAS.find(i=>i.nome==='Detector de Fumaça');
  if(detector){
    detector.nome='Detector de Fumaça e Monóxido de Carbono';
    detector.qtdRule='1-andar';
    mudou=true;
  }
  const MODALIDADES_POR_ITEM={
    'Jogo de Cama Basic Percalle':['comprado'],
    'Cobertor Aspen II':['comprado'],
    'Edredom Premier Hotel':['comprado','flashee'],
    'Capa p/ Edredom Hotel 180 fios':['comprado','flashee'],
    'Fronha Basic Percalle c/ Abas':['comprado'],
    'Toalha de Banho Lory Hotel':['comprado'],
    'Toalha de Rosto Lory Hotel':['comprado'],
  };
  ITENS_COMPRAS.forEach(item=>{
    if(MODALIDADES_POR_ITEM[item.nome]&&!item.modalidades){
      item.modalidades=MODALIDADES_POR_ITEM[item.nome];
      mudou=true;
    }
  });
  if(!ITENS_COMPRAS.some(i=>i.nome==='Vassoura de Pelos')){
    ITENS_COMPRAS.push({cat:'Limpeza',nome:'Vassoura de Pelos',tipoPreco:'fixo',preco:50,enxovalDep:false,qtdRule:'1-unidade',modalidades:['flashee']});
    mudou=true;
  }
  const protetorColchao=ITENS_COMPRAS.find(i=>i.nome==='Protetor de Colchão');
  if(protetorColchao&&!protetorColchao.semSofaCama){
    protetorColchao.semSofaCama=true;
    mudou=true;
  }
  if(mudou)saveAll();
}

// ═══════════════════ ITENS DE COMPRAS ═══════════════════
let ITENS_COMPRAS=[
  // CAMA enxoval Buddemeyer
  {cat:'Cama',nome:'Jogo de Cama Basic Percalle',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'3-colchao',link:'https://wa.me/5511995563388',modalidades:['comprado']},
  {cat:'Cama',nome:'Cobertor Aspen II',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'2-colchao',link:'https://wa.me/5511995563388',modalidades:['comprado']},
  {cat:'Cama',nome:'Edredom Premier Hotel',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'1-colchao',link:'https://wa.me/5511995563388',modalidades:['comprado','flashee']},
  {cat:'Cama',nome:'Capa p/ Edredom Hotel 180 fios',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'2-colchao',link:'https://wa.me/5511995563388',modalidades:['comprado','flashee']},
  {cat:'Cama',nome:'Protetor de Colchão',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'1-colchao',link:'https://wa.me/5511995563388',semSofaCama:true},
  // CAMA fixos
  {cat:'Cama',nome:'Fronha Basic Percalle c/ Abas',tipoPreco:'fixo',preco:43,enxovalDep:true,qtdRule:'2-leito',link:'https://wa.me/5511995563388',modalidades:['comprado']},
  {cat:'Cama',nome:'Travesseiro Sanomed',tipoPreco:'fixo',preco:285,enxovalDep:true,qtdRule:'1-leito',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Travesseiro Toque de Pluma',tipoPreco:'fixo',preco:99,enxovalDep:true,qtdRule:'1-leito',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Protetor de Travesseiro',tipoPreco:'fixo',preco:52,enxovalDep:true,qtdRule:'2-leito',link:'https://wa.me/5511995563388'},
  // BANHEIRO
  {cat:'Banheiro',nome:'Toalha de Banho Lory Hotel',tipoPreco:'fixo',preco:64,enxovalDep:true,qtdRule:'3-leito',link:'https://wa.me/5511995563388',modalidades:['comprado']},
  {cat:'Banheiro',nome:'Toalha de Rosto Lory Hotel',tipoPreco:'fixo',preco:30,enxovalDep:true,qtdRule:'3-leito',link:'https://wa.me/5511995563388',modalidades:['comprado']},
  {cat:'Banheiro',nome:'Tapete Piso Luxor Hotel',tipoPreco:'fixo',preco:42,enxovalDep:false,qtdRule:'3-banheiro',link:'https://wa.me/5511995563388'},
  {cat:'Banheiro',nome:'Lixeira Inox com Pedal 3L',tipoPreco:'fixo',preco:38.99,enxovalDep:false,qtdRule:'1-banheiro',link:'https://www.mercadolivre.com.br/p/MLB25959263'},
  {cat:'Banheiro',nome:'Dispenser de Sabonete',tipoPreco:'fixo',preco:23.90,enxovalDep:false,qtdRule:'1-banheiro',link:'https://www.mercadolivre.com.br/p/MLB22437413'},
  {cat:'Banheiro',nome:'Secador de Cabelo',tipoPreco:'fixo',preco:102,enxovalDep:false,qtdRule:'1-banheiro-completo',link:'https://www.mercadolivre.com.br/secador-de-cabelos-mondial/p/MLB22448898'},
  // LAVANDERIA
  {cat:'Lavanderia',nome:'Passadeira a Vapor',tipoPreco:'fixo',preco:151,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/vaporizador-de-roupas-portatil/p/MLB17993699'},
  // COZINHA
  {cat:'Cozinha',nome:'Xícaras (kit 6)',tipoPreco:'fixo',preco:62.40,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/kit-6-xicaras-cha-hotel/p/MLB21990834'},
  {cat:'Cozinha',nome:'Copos (kit 6)',tipoPreco:'fixo',preco:27.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/conjunto-6-copos-lights/p/MLB20015019'},
  {cat:'Cozinha',nome:'Pratos Rasos (kit 6)',tipoPreco:'fixo',preco:54.89,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/jogo-de-pratos-rasos-duralex/p/MLB18988527'},
  {cat:'Cozinha',nome:'Pratos de Sobremesa (kit 6)',tipoPreco:'fixo',preco:44.07,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/kit-6-pratos-de-sobremesa-duralex/p/MLB21003440'},
  {cat:'Cozinha',nome:'Taças (kit 6)',tipoPreco:'fixo',preco:64.89,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/jogo-6-tacas-vinho-tinto/p/MLB16892462'},
  {cat:'Cozinha',nome:'Talheres (24 peças)',tipoPreco:'fixo',preco:72.99,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/faqueiro-tramontina-buzios/p/MLB16590009'},
  {cat:'Cozinha',nome:'Abridor Vinho e Cerveja',tipoPreco:'fixo',preco:34.76,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/sacarolhas-abridor-de-vinho/p/MLB21384891'},
  {cat:'Cozinha',nome:'Balde para Gelo',tipoPreco:'fixo',preco:47.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/balde-de-gelo-acrilico/p/MLB18710432'},
  {cat:'Cozinha',nome:'Jogo de Panelas (10 peças)',tipoPreco:'fixo',preco:425.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/jogo-de-panelas-paris-10-pecas/p/MLB17006965'},
  {cat:'Cozinha',nome:'Colheres para Cozinhar (kit)',tipoPreco:'fixo',preco:37.54,enxovalDep:false,qtdRule:'1-unidade',link:'https://produto.mercadolivre.com.br/MLB-3274998198'},
  {cat:'Cozinha',nome:'Escorredor de Pratos',tipoPreco:'fixo',preco:67.18,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/notuz-escorredor-de-louca/p/MLB21303819'},
  {cat:'Cozinha',nome:'Baixelas Inox (kit 4)',tipoPreco:'fixo',preco:130,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/jogo-baixela-4-pcs-aco-inox/p/MLB16773684'},
  {cat:'Cozinha',nome:'Potes Herméticos (10 un)',tipoPreco:'fixo',preco:78.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/potes-hermeticos-electrolux/p/MLB21004563'},
  {cat:'Cozinha',nome:'Facas para Cozinha (kit)',tipoPreco:'fixo',preco:89.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/tramontina-jogo-de-facas-plenus/p/MLB16684720'},
  {cat:'Cozinha',nome:'Liquidificador Mondial',tipoPreco:'fixo',preco:96.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/liquidificador-turbo-power-mondial/p/MLB17455892'},
  {cat:'Cozinha',nome:'Sanduicheira Mondial Inox',tipoPreco:'fixo',preco:109.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/sanduicheira-s07-inox-premium/p/MLB23278416'},
  {cat:'Cozinha',nome:'Cafeteira Nespresso Essenza Mini',tipoPreco:'fixo',preco:539,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/cafeteira-nespresso-essenza-mini/p/MLB13528484'},
  {cat:'Cozinha',nome:'Microondas Electrolux 20L',tipoPreco:'fixo',preco:509.55,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/micro-ondas-electrolux-20l/p/MLB18978989'},
  {cat:'Cozinha',nome:'Purificador de Água',tipoPreco:'fixo',preco:132.05,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/filtro-purificador-vitale/p/MLB19432745'},
  {cat:'Cozinha',nome:'Chaleira Elétrica',tipoPreco:'fixo',preco:122,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/chaleira-eletrica-bch02pi/p/MLB22765280'},
  {cat:'Cozinha',nome:'Air Fryer',tipoPreco:'fixo',preco:537.52,enxovalDep:false,qtdRule:'1-unidade',link:'https://produto.mercadolivre.com.br/MLB-3618072677'},
  {cat:'Cozinha',nome:'Panos de Prato (kit 10)',tipoPreco:'fixo',preco:30.89,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/kit-10-panos-de-prato-cozinha/p/MLB21478989'},
  {cat:'Cozinha',nome:'Lixeira de Pia',tipoPreco:'fixo',preco:23.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/lixeira-basculante-plastico/p/MLB16800901'},
  // QUARTO
  {cat:'Quarto',nome:'Berço Portátil',tipoPreco:'fixo',preco:398.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/berco-portatil-infantil-cercado/p/MLB17888765'},
  {cat:'Quarto',nome:'Banheira Portátil',tipoPreco:'fixo',preco:182.92,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/banheira-de-bebe-dobravel/p/MLB18788901'},
  {cat:'Quarto',nome:'Persiana Blackout',tipoPreco:'fixo',preco:0,enxovalDep:false,qtdRule:'1-quarto',link:'https://www.mercadolivre.com.br/cortina-rolo-blackout/p/MLB22987654'},
  // LIMPEZA
  {cat:'Limpeza',nome:'Pano de Chão (kit 10)',tipoPreco:'fixo',preco:35.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/pano-de-cho-grande-xadrez/p/MLB16800321'},
  {cat:'Limpeza',nome:'Escada de Alumínio',tipoPreco:'fixo',preco:119.65,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/escada-de-aluminio-dobravel/p/MLB21003440'},
  {cat:'Limpeza',nome:'Balde (kit 2)',tipoPreco:'fixo',preco:37.29,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/2-balde-plastico-extra-forte/p/MLB18765432'},
  {cat:'Limpeza',nome:'Vassoura + Pá',tipoPreco:'fixo',preco:78.89,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/kit-vassoura-pa-com-cabo/p/MLB21332109'},
  {cat:'Limpeza',nome:'Panos de Microfibra (kit 10)',tipoPreco:'fixo',preco:59,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/mfl-kit-10-panos-de-microfibra/p/MLB20987654'},
  {cat:'Limpeza',nome:'Vassoura de Pelos',tipoPreco:'fixo',preco:50,enxovalDep:false,qtdRule:'1-unidade',modalidades:['flashee']},
  // OUTROS
  {cat:'Outros',nome:'Detector de Fumaça e Monóxido de Carbono',tipoPreco:'fixo',preco:59.90,enxovalDep:false,qtdRule:'1-andar',link:'https://www.mercadolivre.com.br/detector-optico-de-fumaca/p/MLB22334567'},
];

let PRECOS_ENXOVAL={
  'Jogo de Cama Basic Percalle':    {Solteiro:259,Casal:309,Queen:319,King:379},
  'Cobertor Aspen II':              {Solteiro:98, Casal:144,Queen:158,King:192},
  'Edredom Premier Hotel':          {Solteiro:429,Casal:499,Queen:799,King:899},
  'Capa p/ Edredom Hotel 180 fios': {Solteiro:259,Casal:305,Queen:345,King:409},
  'Protetor de Colchão':            {Solteiro:188,Casal:238,Queen:147,King:178},
};

const CAMA_TIPO_ENXOVAL={
  'Solteiro':'Solteiro','Sofá-cama Solteiro':'Solteiro','Viúva':'Solteiro',
  'Beliche':'Solteiro','Bicama':'Solteiro',
  'Casal':'Casal','Sofá-cama Casal':'Casal',
  'Queen':'Queen','King':'King'
};
const CAMA_LEITOS={'Solteiro':1,'Casal':1,'Queen':1,'King':1,'Sofá-cama Solteiro':1,'Sofá-cama Casal':1,'Beliche':2,'Bicama':2,'Viúva':1};

// Lista livre (empresa, custo, cobrado por qtd. de quartos) — array com `id`, igual PRECOS_LIMPEZA_CHECKOUT,
// pra permitir mais de uma faixa de preço pra mesma qtd. de quartos sem sobrescrever a anterior.
let PRECOS_PRIMEIRA_LIMPEZA=[
  {id:'pl1',quartos:1,empresa:'dinairan',custo:360,cobrado:396},
  {id:'pl2',quartos:1,empresa:'flashee',custo:350,cobrado:385},
  {id:'pl3',quartos:1,empresa:'Intense Clean',custo:250,cobrado:275},
  {id:'pl4',quartos:2,empresa:'dinairan',custo:430,cobrado:473},
  {id:'pl5',quartos:2,empresa:'Intense Clean',custo:250,cobrado:275},
  {id:'pl6',quartos:3,empresa:'dinairan',custo:500,cobrado:550},
  {id:'pl7',quartos:3,empresa:'Intense Clean',custo:250,cobrado:275},
  {id:'pl8',quartos:4,empresa:'dinairan',custo:580,cobrado:638},
  {id:'pl9',quartos:4,empresa:'Intense Clean',custo:250,cobrado:275},
];
// Migração one-time do formato antigo {quartos:{empresa:{custo,cobrado}}} pro array acima.
function _migrarPrecosPrimeiraLimpeza(v){
  if(Array.isArray(v))return v;
  if(v&&typeof v==='object'){
    const out=[];
    Object.entries(v).forEach(([q,servs])=>{
      Object.entries(servs||{}).forEach(([empresa,val])=>{
        out.push({id:uid(),quartos:+q,empresa,custo:+val.custo||0,cobrado:+val.cobrado||0});
      });
    });
    return out;
  }
  return null;
}
// Limpeza de check-out (entre hóspedes) — diferente da primeira limpeza/implementação.
// Lista livre (empresa, especificação por hóspedes/metragem, custo, cobrado, região), não presa a "quartos".
let PRECOS_LIMPEZA_CHECKOUT=[
  {id:'co1',empresa:'Intense Clean',especificacao:'25-40m² · até 2 hóspedes',custo:180,cobrado:198,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co2',empresa:'Intense Clean',especificacao:'25-40m² · até 3 hóspedes',custo:195,cobrado:214.5,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co3',empresa:'Intense Clean',especificacao:'25-40m² · até 4 hóspedes',custo:210,cobrado:231,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co4',empresa:'Intense Clean',especificacao:'41-50m² · até 2 hóspedes',custo:195,cobrado:214.5,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co5',empresa:'Intense Clean',especificacao:'41-50m² · até 3 hóspedes',custo:210,cobrado:231,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co6',empresa:'Intense Clean',especificacao:'41-50m² · até 4 hóspedes',custo:225,cobrado:247.5,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co7',empresa:'Intense Clean',especificacao:'51-65m² · até 2 hóspedes',custo:210,cobrado:231,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co8',empresa:'Intense Clean',especificacao:'51-65m² · até 3 hóspedes',custo:225,cobrado:247.5,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
  {id:'co9',empresa:'Intense Clean',especificacao:'51-65m² · até 4 hóspedes',custo:240,cobrado:264,regiao:'Paulista, Vila Mariana, Centro, Saúde, Indianópolis, Ibirapuera, Brooklin, Vila Olímpia, Itaim, Campo Belo, Pinheiros, Butantã, Sumaré, Vila Madalena, Perdizes'},
];
const PRECOS_FOTOS={
  1:{min:250,max:300,resp:'Flavia Mansur'},
  2:{min:300,max:380,resp:'Flavia Mansur'},
  3:{min:350,max:420,resp:'Flavia Mansur'},
  4:{min:350,max:420,resp:'Flavia Mansur'},
};
let DEF_OPERACIONAIS=[{id:'seguroEasyCover',nome:'Seguro EasyCover'},{id:'kitAmenities',nome:'Kit Amenities WeCare'},{id:'internetClaro',nome:'Internet Claro'},{id:'ecohost',nome:'Sistema EcoHost'},{id:'fechaduraEletronica',nome:'Fechadura Eletrônica'}];
// Campos extras configuráveis da vistoria (vistoria.html lê essa mesma lista via sync)
// {id, label, tipo:'texto'|'numero'|'checkbox'|'select', opcoes?:string[], escopo:'geral'|'comodo', comodosTipos?:'todos'|string[]}
let VISTORIA_CAMPOS=[];
const VISTORIA_COMODO_TIPOS=['Quarto','Sala','Cozinha','Banheiro Completo','Lavabo','Lavanderia','Área Externa','Varanda/Pátio'];

const SERVICOS_OPCIONAIS_COMPRAS=[
  {id:'servicoCompras',nome:'Serviço de compras',valor:300},
  {id:'recebimentoOrganizacao',nome:'Recebimento e organização dos itens',valor:300},
];
function _totalServicosOpcionaisCompras(im){
  const sel=im.servicosOpcionaisCompras||{};
  return SERVICOS_OPCIONAIS_COMPRAS.reduce((s,so)=>s+(sel[so.id]?so.valor:0),0);
}
function _onServicoOpcionalCompra(cb,id){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.servicosOpcionaisCompras)im.servicosOpcionaisCompras={};
  im.servicosOpcionaisCompras[id]=cb.checked;
  saveAll();renderAba('compras');
}
const FLASHEE_PACKAGES=[
  {id:'queen-2g',      label:'1 Queen (2 hóspedes)',           custo:119.90,cobrado:160,setup:290},
  {id:'queen-sofa',    label:'Queen + Sofá-cama Casal (4)',    custo:219.90,cobrado:260,setup:290},
  {id:'queen-sol',     label:'Queen + 1 Solteiro (3)',         custo:199.90,cobrado:240,setup:290},
  {id:'queen-2sol',    label:'Queen + 2 Solteiros (4)',        custo:279.90,cobrado:320,setup:290},
];

const MODULOS_ONBOARDING=[
  {id:'kanban',label:'Kanban'},{id:'dashboard',label:'Dashboard'},{id:'intel',label:'Intel de Mercado'}
];

// ═══════════════════ UTILITÁRIOS ═══════════════════
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function fmtDate(iso){if(!iso)return'–';return new Date(iso+'T12:00:00').toLocaleDateString('pt-BR');}
function fmtMoeda(v){return'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function diasEntre(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/86400000);}
function hoje(){return new Date().toISOString().split('T')[0];}
function showToast(msg,tipo=''){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');t.className='toast '+(tipo||'');t.textContent=msg;
  c.appendChild(t);setTimeout(()=>t.remove(),3200);
}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}
function showPanel(id,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-'+id)?.classList.add('active');
  if(btn)btn.classList.add('active');
  const titles={kanban:'Kanban',dashboard:'Dashboard',intel:'Inteligência de Mercado',fornecedores:'Fornecedores',vistoria:'Vistoria',calendario:'Calendário',config:'Configurações',usuarios:'Usuários',informacoes:'Informações'};
  document.getElementById('panel-title').textContent=titles[id]||id;
  if(id==='kanban'){kvPull(false).then(()=>renderKanban()).catch(()=>renderKanban());}
  if(id==='dashboard')renderDashboard();
  if(id==='intel')renderIntel();
  if(id==='fornecedores')renderFornecedores();
  if(id==='vistoria')renderVistoria();
  if(id==='calendario')renderCalendario();
  if(id==='config')renderConfig();
  if(id==='usuarios')renderUsuarios();
  if(id==='informacoes')renderInformacoes();
}

// ─── Componente numérico com +/- ───
function numInput({id,value=0,min=0,max='',step=1,style='',oninput='',onchange=''}={}){
  const minAttr=min!==''?`min="${min}"`:'';
  const maxAttr=max!==''?`max="${max}"`:'';
  const evts=(oninput?`oninput="${oninput}"`:'')+' '+(onchange?`onchange="${onchange}"`:'');
  return`<div class="num-input-wrap" style="display:inline-flex;align-items:center;gap:0;${style}">
    <button type="button" class="num-btn" onclick="(function(b){var i=b.parentElement.querySelector('input');var v=parseFloat(i.value)||0;var mn=parseFloat(i.min);if(!isNaN(mn)&&v-${step}<mn)return;i.value=+(v-${step}).toFixed(4);i.dispatchEvent(new Event('input'));i.dispatchEvent(new Event('change'));})(this)" style="width:32px;height:36px;border:1px solid var(--border);border-right:none;border-radius:8px 0 0 8px;background:var(--surface-2);color:var(--text);font-size:18px;cursor:pointer;line-height:1;">−</button>
    <input id="${id}" type="number" class="input" value="${value}" ${minAttr} ${maxAttr} step="${step}" ${evts} style="width:72px;border-radius:0;text-align:center;-moz-appearance:textfield;" oninput="this.style.width=Math.max(72,this.value.length*12+24)+'px';${oninput?oninput.replace(/"/g,"'"):''}">
    <button type="button" class="num-btn" onclick="(function(b){var i=b.parentElement.querySelector('input');var v=parseFloat(i.value)||0;var mx=parseFloat(i.max);if(!isNaN(mx)&&v+${step}>mx)return;i.value=+(v+${step}).toFixed(4);i.dispatchEvent(new Event('input'));i.dispatchEvent(new Event('change'));})(this)" style="width:32px;height:36px;border:1px solid var(--border);border-left:none;border-radius:0 8px 8px 0;background:var(--surface-2);color:var(--text);font-size:18px;cursor:pointer;line-height:1;">+</button>
  </div>`;
}

// Converte campo cozinha/lavanderia/areaExterna que pode ser boolean (legado) ou number
function _qtdComodo(v){if(v===true)return 1;if(!v)return 0;const n=parseInt(v);return isNaN(n)?0:n;}

// Snapshot da lista de cômodos de um imóvel — mesma lógica de vistoria.html (getComodos),
// duplicada aqui porque as duas telas não compartilham módulo JS. Usado ao criar uma
// vistoria nova, pra travar os cômodos daquele momento (se o imóvel mudar depois, a
// vistoria em andamento não se mexe).
function _getComodosImovel(im){
  const list=[];
  const nq=parseInt(im.quartos)||0;
  for(let i=1;i<=nq;i++)list.push(nq>1?'Quarto '+i:'Quarto');
  const ns=parseInt(im.salas!=null?im.salas:1)||0;
  for(let i=1;i<=ns;i++)list.push(ns>1?'Sala '+i:'Sala');
  const nc=_qtdComodo(im.cozinha!==undefined?im.cozinha:1);
  for(let i=1;i<=nc;i++)list.push(nc>1?'Cozinha '+i:'Cozinha');
  const nbc=parseInt(im.banheirosCompletos)||parseInt(im.banheiros)||0;
  for(let i=1;i<=nbc;i++)list.push(nbc>1?'Banheiro Completo '+i:'Banheiro Completo');
  const nbv=parseInt(im.banheirosLavabo)||0;
  for(let i=1;i<=nbv;i++)list.push(nbv>1?'Lavabo '+i:'Lavabo');
  const nl=_qtdComodo(im.lavanderia);
  for(let i=1;i<=nl;i++)list.push(nl>1?'Lavanderia '+i:'Lavanderia');
  const na=_qtdComodo(im.areaExterna);
  for(let i=1;i<=na;i++)list.push(na>1?'Área Externa '+i:'Área Externa');
  const nv=_qtdComodo(im.varanda);
  for(let i=1;i<=nv;i++)list.push(nv>1?'Varanda/Pátio '+i:'Varanda/Pátio');
  return list;
}

// Cálculo de quantidades
function totalColchoes(camas){return(camas||[]).reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);}
function totalLeitos(camas){return(camas||[]).reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);}
function calcNecessario(item,camas,banheiros,quartos,banheirosCompletos,hospedes,lavabos,andares){
  const rule=item.qtdRule||'1-unidade';const dashIdx=rule.indexOf('-');const n=rule.slice(0,dashIdx);const base=rule.slice(dashIdx+1);
  const q=parseInt(n)||1;
  if(base==='colchao')return q*totalColchoes(camas);
  if(base==='leito')return q*totalLeitos(camas);
  if(base==='banheiro-completo')return q*(+banheirosCompletos||1);
  if(base==='banheiro')return q*(+banheiros||1);
  if(base==='quarto')return q*(+quartos||1);
  if(base==='andar')return q*(+andares||1);
  if(base==='hospede')return q*(+hospedes||1);
  if(base==='lavabo')return q*(+lavabos||0);
  if(base==='cada2hospede')return q*Math.ceil((+hospedes||1)/2);
  return q;
}
// 'comprado' | 'flashee' | 'intense' — deriva a modalidade ativa de enxoval do imóvel
function modalidadeEnxovalAtual(im){
  const def=im.defEnxoval||{};
  if((def.tipo||'comprado')!=='aluguel')return'comprado';
  return(def.fornecedor||'').toLowerCase().includes('intense')?'intense':'flashee';
}
// item.modalidades ausente = obrigatório, sempre aparece. Presente = só aparece nas modalidades listadas.
function itemValidoParaModalidade(item,modalidade){
  return!item.modalidades||item.modalidades.includes(modalidade);
}
function getPrecoEnxovalUn(nomeItem,camas){
  const tabela=PRECOS_ENXOVAL[nomeItem]; if(!tabela)return 0;
  const ordem=['King','Queen','Casal','Solteiro'];
  const tipos=(camas||[]).map(c=>CAMA_TIPO_ENXOVAL[c.tipo]||'Solteiro');
  const melhor=ordem.find(t=>tipos.includes(t))||'Solteiro';
  return tabela[melhor]||0;
}

// ═══════════════════ LOGIN ═══════════════════
function getCurrentUser(){try{return JSON.parse(sessionStorage.getItem('wc_user')||'null');}catch{return null;}}
function isAdmin(){const u=getCurrentUser();return u&&u.perfil==='admin';}
function logout(){sessionStorage.removeItem('wc_user');location.reload();}
function doLogin(){
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const senha=document.getElementById('login-senha').value;
  carregarUsuarios();
  const u=usuarios.find(x=>x.email===email&&x.senha===senha);
  if(!u){document.getElementById('login-err').textContent='E-mail ou senha incorretos.';return;}
  sessionStorage.setItem('wc_user',JSON.stringify(u));
  document.getElementById('login-overlay').classList.add('hidden');
  iniciarApp();
}
function carregarUsuarios(){try{usuarios=JSON.parse(localStorage.getItem('wc_users')||'[]');}catch{usuarios=[];}}
function salvarUsuarios(){
  localStorage.setItem('wc_users',JSON.stringify(usuarios));
  // push imediato para KV (sem aguardar __servidorLido — usuários precisam sincronizar sempre)
  const s=window.WC_SYNC||{};
  if(s.url){
    const blob={};
    SYNC_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)try{blob[k]=JSON.parse(v);}catch{}});
    blob.lastSaved=Date.now();
    localStorage.setItem('lastSaved',String(blob.lastSaved));
    fetch(s.url.replace(/\/$/,'')+'/save?token='+encodeURIComponent(s.token||''),
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(blob)}).catch(()=>{});
  }
}
function garantirAdminPadrao(){
  carregarUsuarios();
  if(!usuarios.length){
    usuarios=[{email:'admin@wecare.com',senha:'wecare2025',perfil:'admin',nome:'Nicole',modulos:[]}];
    localStorage.setItem('wc_users',JSON.stringify(usuarios)); // local apenas, sem empurrar
  }
}
// Puxa usuários da nuvem ANTES do login (para qualquer máquina enxergar todos os logins)
async function sincronizarUsuariosNuvem(){
  const s=window.WC_SYNC||{};
  if(!s.url)return;
  try{
    const r=await fetch(s.url.replace(/\/$/,'')+'/load?token='+encodeURIComponent(s.token||''));
    const j=await r.json();
    if(j&&j.data&&Array.isArray(j.data.wc_users)&&j.data.wc_users.length){
      localStorage.setItem('wc_users',JSON.stringify(j.data.wc_users));
      carregarUsuarios();
    }
  }catch{}
  // marca que já comunicou com o servidor — libera o push de dados
  window.__servidorLido=true;
}

// ═══════════════════ PERSISTÊNCIA / KV ═══════════════════
const SYNC_KEYS=['wc_imoveis','wc_membros','wc_itens','wc_enxoval','wc_limpeza','wc_limpeza_checkout','wc_fotos','wc_prestadores','wc_users','wc_def_operacionais','wc_vistoria_campos','wc_templates_msg','wc_processo_texto','wc_anotacoes_texto','wc_manual_fornecedores'];
let _lastSentStr=null;

function saveAll(){
  localStorage.setItem('wc_imoveis',JSON.stringify(imoveis));
  localStorage.setItem('wc_membros',JSON.stringify(membros));
  localStorage.setItem('wc_itens',JSON.stringify(ITENS_COMPRAS));
  localStorage.setItem('wc_enxoval',JSON.stringify(PRECOS_ENXOVAL));
  localStorage.setItem('wc_limpeza',JSON.stringify(PRECOS_PRIMEIRA_LIMPEZA));
  localStorage.setItem('wc_limpeza_checkout',JSON.stringify(PRECOS_LIMPEZA_CHECKOUT));
  localStorage.setItem('wc_fotos',JSON.stringify(PRECOS_FOTOS));
  localStorage.setItem('wc_prestadores',JSON.stringify(prestadores));
  localStorage.setItem('wc_def_operacionais',JSON.stringify(DEF_OPERACIONAIS));
  localStorage.setItem('wc_vistoria_campos',JSON.stringify(VISTORIA_CAMPOS));
  localStorage.setItem('wc_templates_msg',JSON.stringify(templatesMsg));
  localStorage.setItem('wc_processo_texto',JSON.stringify(processoTexto));
  localStorage.setItem('wc_anotacoes_texto',JSON.stringify(anotacoesTexto));
  localStorage.setItem('wc_manual_fornecedores',JSON.stringify(manualFornecedores));
  // atualiza lastSaved imediatamente para kvPull não sobrescrever dados locais recentes
  localStorage.setItem('lastSaved',String(Date.now()));
  _kvPushDebounced();
  _publicarStats();
}
function loadAll(){
  const g=k=>{const v=localStorage.getItem(k);return v===null?null:JSON.parse(v);};
  let v;
  v=g('wc_imoveis');   if(Array.isArray(v))imoveis=v;
  v=g('wc_membros');   if(Array.isArray(v))membros=v;
  v=g('wc_itens');     if(Array.isArray(v)&&v.length)ITENS_COMPRAS=v;
  v=g('wc_enxoval');   if(v&&typeof v==='object')PRECOS_ENXOVAL=v;
  v=g('wc_limpeza');   {const migrado=_migrarPrecosPrimeiraLimpeza(v);if(migrado)PRECOS_PRIMEIRA_LIMPEZA=migrado;}
  v=g('wc_limpeza_checkout');if(Array.isArray(v)&&v.length)PRECOS_LIMPEZA_CHECKOUT=v;
  v=g('wc_fotos');     if(v&&typeof v==='object')Object.assign(PRECOS_FOTOS,v);
  v=g('wc_prestadores');if(Array.isArray(v))prestadores=v;
  v=g('wc_def_operacionais');if(Array.isArray(v)&&v.length)DEF_OPERACIONAIS=v;
  v=g('wc_vistoria_campos');if(Array.isArray(v))VISTORIA_CAMPOS=v;
  v=g('wc_templates_msg');if(Array.isArray(v))templatesMsg=v;
  v=g('wc_processo_texto');if(typeof v==='string')processoTexto=v;
  v=g('wc_anotacoes_texto');if(typeof v==='string')anotacoesTexto=v;
  v=g('wc_manual_fornecedores');if(typeof v==='string')manualFornecedores=v;
  _migrarFasesAntigas();
  _migrarGastosSetup();
  _migrarCatalogoItens();
}

let _autoSaveTimer=null;
function _autoSaveDebounced(){
  if(_autoSaveTimer)clearTimeout(_autoSaveTimer);
  _autoSaveTimer=setTimeout(()=>{
    const im=getImovel(_imovelAtivoId);if(!im)return;
    _coletarDadosAba(_abaAtiva,im);
    saveAll();
    _atualizarHeaderDetalhe(im);
  },800);
}
let _kvTimer=null;
function _kvPushDebounced(){
  const s=window.WC_SYNC||{};if(!s.url)return;
  // Regra 2: só envia após ter lido o servidor nesta sessão
  if(!window.__servidorLido)return;
  if(_kvTimer)clearTimeout(_kvTimer);
  _kvTimer=setTimeout(_kvSendNow,2500);
}
async function _kvSendNow(){
  _kvTimer=null;
  const s=window.WC_SYNC||{};if(!s.url||!window.__servidorLido)return;
  const blob={};
  SYNC_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)try{blob[k]=JSON.parse(v);}catch{}});
  // Regra 1: só envia se mudou de verdade
  const blobStr=JSON.stringify(blob);
  if(blobStr===_lastSentStr)return;
  _lastSentStr=blobStr;
  blob.lastSaved=Date.now();
  localStorage.setItem('lastSaved',String(blob.lastSaved));
  try{
    await fetch(s.url.replace(/\/$/,'')+'/save?token='+encodeURIComponent(s.token||''),
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(blob)});
  }catch{}
}

async function kvPull(showMsg){
  const s=window.WC_SYNC||{};
  if(!s.url){if(showMsg)showToast('Worker não configurado.','peach');return;}
  try{
    const r=await fetch(s.url.replace(/\/$/,'')+'/load?token='+encodeURIComponent(s.token||''));
    const j=await r.json();
    if(j&&j.data){
      window.__servidorLido=true; // Regra 2: marca que leu o servidor
      const localTs=+localStorage.getItem('lastSaved')||0;
      const serverTs=+(j.data.lastSaved)||0;
      // Regra 4: só sobrescreve o local se o servidor for estritamente mais novo
      if(serverTs>localTs){
        for(const k in j.data){
          const sv=j.data[k];
          // Regra 3: vazio/menor nunca sobrescreve cheio
          if(Array.isArray(sv)){
            const lv=localStorage.getItem(k);
            const la=lv?JSON.parse(lv):[];
            if(Array.isArray(la)&&la.length>sv.length)continue;
          }
          try{localStorage.setItem(k,JSON.stringify(sv));}catch{}
        }
        loadAll();
        if(_imovelAtivoId)renderAba(_abaAtiva);
        renderKanban();
      }
      if(showMsg)showToast('Sincronizado!','sage');
      return true;
    }
  }catch{}
  if(showMsg)showToast('Erro ao sincronizar.','peach');
}

async function _publicarStats(){
  const s=window.WC_SYNC||{};if(!s.url)return;
  try{
    const stats=imoveis.map(im=>({
      id:im.id,nome:im.nome,dataCriacao:im.dataCriacao,dataAtivacao:im.dataAtivacao,status:im.status,
      diasOnboarding:im.dataCriacao&&im.dataAtivacao?diasEntre(im.dataCriacao,im.dataAtivacao):null
    }));
    await fetch(s.url.replace(/\/$/,'')+'/stats?token='+encodeURIComponent(s.token||''),
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stats,prestadores})});
  }catch{}
}

// ═══════════════════ PERMISSÕES ═══════════════════
function aplicarPermissoes(){
  const u=getCurrentUser();if(!u)return;
  document.getElementById('sidebar-avatar').textContent=(u.nome||u.email||'?').charAt(0).toUpperCase();
  document.getElementById('sidebar-name').textContent=u.nome||u.email;
  document.getElementById('sidebar-role').textContent=({admin:'Administradora',coordenacao:'Coordenação',operacao:'Operação'}[u.perfil]||u.perfil);
  const adm=isAdmin();
  ['nav-config','nav-usuarios','navsec-admin'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=adm?'':'none';
  });
  document.querySelectorAll('[onclick="abrirNovoImovel()"]').forEach(b=>{
    b.style.display=(adm||u.perfil==='coordenacao')?'':'none';
  });
}

// ═══════════════════ KANBAN ═══════════════════
function renderKanban(){
  const busca=(document.getElementById('kanban-busca')?.value||'').trim().toLowerCase();
  const filtrarBusca=arr=>busca?arr.filter(im=>(im.nome||'').toLowerCase().includes(busca)):arr;
  const ativos=filtrarBusca(imoveis.filter(im=>im.status!=='perdido'&&im.status!=='ativo'));
  const ativos2=filtrarBusca(imoveis.filter(im=>im.status==='ativo'));
  const perdidos=imoveis.filter(im=>im.status==='perdido');
  const vazioMsg=busca?'Nenhum resultado':'Nenhum imóvel';
  const wrap=document.getElementById('kanban-wrap');
  wrap.innerHTML=FASES.map(fase=>{
    const cards=ativos.filter(im=>im.status===fase);
    return`<div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title">${FASE_LABEL[fase]}</span>
        <span class="kanban-col-count">${cards.length}</span>
      </div>
      <div class="kanban-cards">
        ${cards.map(im=>renderCard(im)).join('')||`<div class="empty-state" style="padding:16px 8px;font-size:11px;">${vazioMsg}</div>`}
      </div>
    </div>`;
  }).join('')+
  `<div class="kanban-col">
    <div class="kanban-col-header" style="border-top:3px solid var(--sage);">
      <span class="kanban-col-title" style="color:var(--sage)">✅ Ativo</span>
      <span class="kanban-col-count">${ativos2.length}</span>
    </div>
    <div class="kanban-cards">${ativos2.map(im=>renderCard(im)).join('')||`<div class="empty-state" style="padding:16px 8px;font-size:11px;">${vazioMsg}</div>`}</div>
  </div>`;

  // Perdidos
  const perdEl=document.getElementById('perdidos-lista');
  document.getElementById('perdidos-count').textContent=perdidos.length?`(${perdidos.length})`:'';
  perdEl.innerHTML=perdidos.length
    ?perdidos.map(im=>`<div class="imovel-perdido-row">
        <span class="nome">${esc(im.nome)}</span>
        <span class="text-muted">${fmtDate(im.dataCriacao)}</span>
        <button class="btn btn-xs" onclick="voltarOperacao('${im.id}')">Voltar</button>
        <button class="btn btn-xs btn-danger" onclick="apagarImovel('${im.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>`).join('')
    :'<div class="text-muted" style="font-size:12px;">Nenhum imóvel perdido.</div>';
}
function renderCard(im){
  const atrasado=_verificarAtrasado(im);
  const dias=im.dataCriacao?diasEntre(im.dataCriacao,hoje())+'d':'';
  const cor=FASE_COLOR[im.status]||'neutral';
  return`<div class="kanban-card fase-${im.status}${atrasado?' atrasado':''}" onclick="abrirDetalhe('${im.id}')">
    ${atrasado?'<div class="badge-atrasado"><i class="fa-solid fa-triangle-exclamation"></i> ATRASADO</div>':''}
    <div class="kanban-card-name">${esc(im.nome)}</div>
    <div class="kanban-card-meta">
      ${im.proprietarioNome?`<span>${esc(im.proprietarioNome)}</span>`:''}
      ${im.endereco?`<span style="font-size:10.5px;">${esc(im.endereco)}</span>`:''}
      <span>${dias} desde contrato</span>
    </div>
    <div class="kanban-card-tags">
      ${im.quartos?`<span class="tag tag-neutral"><i class="fa-solid fa-bed"></i> ${im.quartos}q</span>`:''}
      ${im.status==='ativo'?`<span class="tag tag-sage">Ativo</span>`:`<span class="tag tag-${cor}">${FASE_LABEL[im.status]||im.status}</span>`}
      ${im.contratoAssinado?'<span class="tag tag-sage" title="Contrato assinado"><i class="fa-solid fa-file-signature"></i></span>':''}
      ${im.formEnviadoEm?'<span class="tag tag-sage" title="Formulário enviado pelo proprietário"><i class="fa-solid fa-clipboard-check"></i></span>'
        :(im.formPreenchidoEm?'<span class="tag tag-lav" title="Proprietário está preenchendo, ainda não enviou"><i class="fa-solid fa-clipboard"></i></span>':'')}
      ${((im.manutencoes||[]).filter(m=>m.status!=='resolvido').length)?`<span class="tag tag-amber" title="Manutenções pendentes"><i class="fa-solid fa-wrench"></i> ${(im.manutencoes||[]).filter(m=>m.status!=='resolvido').length}</span>`:''}
      ${im.restricoes?`<span class="tag tag-peach" title="${esc(im.restricoes)}"><i class="fa-solid fa-triangle-exclamation"></i> Restrições</span>`:''}
    </div>
  </div>`;
}
function _verificarAtrasado(im){
  if(!im.dataEnvioParaCriacao||!im.prazoAtivacaoHoras)return false;
  return new Date()>new Date(new Date(im.dataEnvioParaCriacao).getTime()+im.prazoAtivacaoHoras*3600000)&&im.status!=='ativo';
}

// ═══════════════════ COMO USAR ═══════════════════
function abrirComoUsar(){
  document.getElementById('generico-titulo').textContent='Como usar o WeCare Onboarding';
  const secao=(titulo,html)=>`<div style="margin-bottom:18px;">
    <div style="font-weight:700;font-size:13.5px;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:6px;">${titulo}</div>
    <div style="font-size:13px;line-height:1.65;color:var(--text-2);">${html}</div>
  </div>`;
  document.getElementById('generico-body').innerHTML=`
  <div>
    ${secao('<i class="fa-solid fa-table-columns"></i> 1. O fluxo do imóvel (Kanban)', `
      Todo imóvel novo entra na fase <strong>Contrato</strong> e vai passando pelas fases nessa ordem, clicando no botão de avançar fase dentro do card:
      <ul style="margin:8px 0 0 18px;padding:0;">
        <li><strong>Contrato</strong> — imóvel entrou e está aguardando assinatura.</li>
        <li><strong>Setup e Definições</strong> — calculamos valores de fotos, limpeza e vistoria, e preparamos a equipe pra receber o imóvel.</li>
        <li><strong>Vistoria e Compras</strong> — equipe faz a primeira vistoria, anota o que falta e compra.</li>
        <li><strong>Formulário</strong> — com as informações da vistoria em mãos, preenchemos o formulário do proprietário.</li>
        <li><strong>Preparação do Imóvel</strong> — segunda vistoria, agendamento de fotos, limpeza, etc.</li>
        <li><strong>Criação do Anúncio</strong> — compilamos as informações e criamos o anúncio de fato.</li>
        <li><strong>Ativo</strong> — onboarding finalizado, imóvel operando.</li>
      </ul>
      Se o negócio cair, use "Marcar como perdido" — o imóvel some do fluxo principal mas fica guardado em "Imóveis Perdidos" (dá pra trazer de volta).
    `)}
    ${secao('<i class="fa-solid fa-house"></i> 2. Cadastrando um imóvel novo', `
      Clique em <strong>"+ Novo Imóvel"</strong> no topo do Kanban, preencha os dados básicos (nome, endereço, proprietário, comissão, quartos/banheiros) e salve. Ele já entra na fase Contrato.
    `)}
    ${secao('<i class="fa-solid fa-folder-open"></i> 3. As abas dentro do imóvel', `
      Clicando em um card do Kanban, abre o detalhe do imóvel com várias abas:
      <ul style="margin:8px 0 0 18px;padding:0;">
        <li><strong>📁 Captação</strong> — link da pasta do Drive com contrato/reunião/fotos; a IA analisa o conteúdo dessa pasta e pré-preenche dados automaticamente.</li>
        <li><strong>📝 Atualizações</strong> — linha do tempo do imóvel: mudanças de fase automáticas + notas que qualquer um da equipe escrever (ex: "vistoria feita, falta comprar toalhas").</li>
        <li><strong>Dados</strong> — cômodos, camas, comissão, dados do proprietário, dados de acesso (wifi, senha, portaria).</li>
        <li><strong>Contrato</strong> — status do contrato assinado, valores/custos de setup.</li>
        <li><strong>Definições</strong> — serviços contratados (seguro, kit amenities, internet, fechadura eletrônica), responsável pela limpeza, enxoval.</li>
        <li><strong>Formulário</strong> — pré-preenchimento e acompanhamento do formulário do proprietário (veja a seção 4).</li>
        <li><strong>Compras</strong> — lista de itens de enxoval/compras necessários pro imóvel, com custos.</li>
        <li><strong>Produção</strong> — agendamento de fotos, primeira limpeza e vistoria (data, responsável, custo).</li>
        <li><strong>Final</strong> — checklist de tudo que precisa estar pronto antes de ativar o imóvel.</li>
      </ul>
    `)}
    ${secao('<i class="fa-solid fa-clipboard-list"></i> 4. Formulário do proprietário', `
      Na aba <strong>Formulário</strong>, pré-preencha o que já souber: perguntas com opções (tipo de espaço, comodidades) aparecem como botões clicáveis — não precisa digitar. Perguntas de número usam um contador +/-.<br><br>
      Copie o link (botão de copiar ou WhatsApp direto) e mande pro proprietário. Ele abre sem login, confirma cada campo com "Está correto" ✓ ou edita, e pode salvar o progresso e voltar depois pelo mesmo link.<br><br>
      Só aparece <strong>"Proprietário enviou o formulário"</strong> (badge/alerta verde) quando ele realmente clica em "Enviar informações" no final — se ele só abriu e mexeu um pouco sem enviar, aparece um aviso amarelo "ainda não enviou".
    `)}
    ${secao('<i class="fa-solid fa-address-book"></i> 5. Fornecedores', `
      No menu lateral, "Fornecedores" tem o banco de prestadores de serviço (limpeza, fotógrafo, manutenção, etc.) — dá pra filtrar por tipo e cidade. Clique em "Novo Fornecedor" pra cadastrar, com telefone (vira link de WhatsApp), cidade, valor cobrado e nota.
    `)}
    ${secao('<i class="fa-solid fa-magnifying-glass-location"></i> 6. Intel de Mercado', `
      Painel de apoio pra buscar prestadores locais perto do endereço do imóvel (mapa embutido) e consultar o mesmo banco de fornecedores rapidamente.
    `)}
    ${secao('<i class="fa-solid fa-clipboard-check"></i> 7. Vistoria', `
      Painel dedicado às vistorias dos imóveis (rascunhos e vistorias finalizadas), separado da aba "Produção" de cada imóvel.
    `)}
    ${secao('<i class="fa-solid fa-rotate"></i> 8. Sincronização entre dispositivos', `
      O sistema salva automaticamente no seu navegador e sincroniza com o servidor sozinho a cada minuto. O botão <i class="fa-solid fa-rotate"></i> no topo força uma sincronização manual na hora. Os dados nunca são apagados por uma sincronização — se um dispositivo tiver uma lista maior que a do servidor, a lista maior sempre é mantida.
    `)}
  </div>`;
  document.getElementById('modal-generico').classList.add('open');
}

// ═══════════════════ NOVO IMÓVEL ═══════════════════
function abrirNovoImovel(){
  ['ni-nome','ni-endereco','ni-prop-nome','ni-prop-tel','ni-prop-email'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('ni-comissao').value='20';
  document.getElementById('ni-comissao-base').value='liquida';
  document.getElementById('ni-quartos').value='1';
  document.getElementById('ni-banheiros-completos').value='1';
  document.getElementById('ni-banheiros-lavabo').value='0';
  document.getElementById('ni-data-criacao').value=hoje();
  document.getElementById('modal-imovel-novo').classList.add('open');
  setTimeout(()=>document.getElementById('ni-nome').focus(),100);
}
function salvarNovoImovel(){
  const nome=document.getElementById('ni-nome').value.trim();
  if(!nome){showToast('Informe o nome do imóvel.','peach');return;}
  const im={
    id:uid(), nome,
    endereco:document.getElementById('ni-endereco').value.trim(),
    proprietarioNome:document.getElementById('ni-prop-nome').value.trim(),
    proprietarioTel:document.getElementById('ni-prop-tel').value.trim(),
    proprietarioEmail:document.getElementById('ni-prop-email').value.trim(),
    comissaoWecare:+document.getElementById('ni-comissao').value||20,
    comissaoBase:document.getElementById('ni-comissao-base').value,
    quartos:+document.getElementById('ni-quartos').value||1,
    andares:1,
    salas:+document.getElementById('ni-salas').value||1,
    cozinha:+document.getElementById('ni-cozinha').value||0,
    lavanderia:+document.getElementById('ni-lavanderia').value||0,
    areaExterna:+document.getElementById('ni-area-externa').value||0,
    varanda:+document.getElementById('ni-varanda').value||0,
    banheirosCompletos:+document.getElementById('ni-banheiros-completos').value||1,
    banheirosLavabo:+document.getElementById('ni-banheiros-lavabo').value||0,
    dataCriacao:document.getElementById('ni-data-criacao').value||hoje(),
    plataformas:[], camas:[], status:'contrato',
    dataAtivacao:null, statusAnterior:null,
    // captação
    captacaoLink:'', jarvisPreenchidoEm:null, incluirKpiClaire:false, incluirSetupClaire:false, mesReferenciaKpi:'',
    // fotos
    fotos:[], fotosIaEm:null, fotosIaEncontrados:0,
    // contrato
    gastosSetup:[],
    contratoLink:'', zapsignUuid:'', contratoAssinado:false, dataContratoAssinado:null,
    // definições
    seguroEasyCover:false, kitAmenities:false, internetClaro:false, ecohost:false, fechaduraEletronica:false,
    defLimpeza:{responsavel:''},
    defEnxoval:{tipo:'comprado',fornecedor:'',valorAluguelMensal:0,valorSetupAluguel:0},
    // reunião
    reuniao:{nomeArquivo:'', texto:'', dataUpload:null, iaPreenchidoEm:null, iaEncontrados:0},
    // formulário
    formToken:uid()+uid(), formRascunho:{}, formRespostas:{}, formConfirmados:{}, formPreenchidoEm:null, formEnviadoEm:null,
    atualizacoes:[],
    // operacional
    ops:{fotos:{data:'',responsavel:'',hora:'',custo:0},limpeza:{data:'',responsavel:'',hora:'',custo:0},vistoria:{data:'',responsavel:'',hora:'',custo:0,localizacao:'central'}},
    eventosExtras:[],
    // custos
    custos:[], margemWecare:15, descontoTipo:'reais', descontoValor:0, formasPagamento:'',
    // compras
    compras:{}, freteTotal:0, servicosOpcionaisCompras:{},
    // final
    linkFotos:'', linkRelatorio:'', responsavelCriacao:'', tarefaClaireId:null,
    prazoAtivacaoHoras:24, dataEnvioParaCriacao:null,
    valorMinNoite:0, valorBaseNoite:0, taxaHospedeExtra:0, taxaHospedeExtraAcimaDe:0, taxaLimpeza:0, observacoes:'',
    valorCaucao:0, politicaCancelamento:'',
    comentarios:{}
  };
  imoveis.push(im);saveAll();closeModal('modal-imovel-novo');renderKanban();
  showToast('Imóvel criado!','sage');abrirDetalhe(im.id);
}

// ═══════════════════ DETALHE ═══════════════════
function getImovel(id){return imoveis.find(x=>x.id===id);}
function abrirDetalhe(id){
  _imovelAtivoId=id;_abaAtiva='captacao';
  const im=getImovel(id);if(!im)return;
  document.getElementById('detalhe-titulo').textContent=im.nome;
  document.getElementById('detalhe-subtitulo').textContent=(im.proprietarioNome||'')+(im.endereco?' · '+im.endereco:'');
  _atualizarHeaderDetalhe(im);
  document.querySelectorAll('#detalhe-tabs .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  renderAba('captacao');
  document.getElementById('modal-detalhe').classList.add('open');
  const _db=document.getElementById('detalhe-body');
  if(_db&&!_db._autoSave){_db._autoSave=true;_db.addEventListener('input',_autoSaveDebounced);_db.addEventListener('change',_autoSaveDebounced);}
}
function _atualizarHeaderDetalhe(im){
  const cor=im.status==='ativo'?'sage':(FASE_COLOR[im.status]||'neutral');
  const label=im.status==='ativo'?'Ativo':(FASE_LABEL[im.status]||im.status);
  document.getElementById('detalhe-fase-tag').innerHTML=`<span class="tag tag-${cor}">${label}</span>`;
  const idx=FASES.indexOf(im.status);
  const btnAv=document.getElementById('detalhe-avancar-btn');
  const btnPerd=document.getElementById('detalhe-perdido-btn');
  if(im.status==='ativo'){btnAv.style.display='none';btnPerd.style.display='none';}
  else if(idx>=0&&idx<FASES.length-1){
    btnAv.style.display='';btnAv.innerHTML=`<i class="fa-solid fa-arrow-right"></i> ${FASE_LABEL[FASES[idx+1]]}`;
    btnPerd.style.display='';
  } else if(idx===FASES.length-1){
    btnAv.style.display='';btnAv.innerHTML=`<i class="fa-solid fa-check"></i> Marcar como Ativo 🎉`;
    btnPerd.style.display='';
  }
}
function showTab(aba,btn){
  // Descarrega qualquer edição pendente da aba anterior ANTES de trocar — sem isso, uma edição
  // seguida de troca rápida de aba se perdia (o autosave debounced de 800ms rodava depois, já
  // com _abaAtiva apontando pra aba nova, e colhia os campos errados).
  if(_autoSaveTimer){clearTimeout(_autoSaveTimer);_autoSaveTimer=null;}
  const imAtual=getImovel(_imovelAtivoId);
  if(imAtual){_coletarDadosAba(_abaAtiva,imAtual);saveAll();}
  _abaAtiva=aba;
  document.querySelectorAll('#detalhe-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderAba(aba);
}
function renderAba(aba){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const fns={captacao:()=>renderAbaCaptacao(im),dados:()=>renderAbaDados(im),contrato:()=>renderAbaContrato(im),
    definicoes:()=>renderAbaDefinicoes(im),fotos:()=>renderAbaFotos(im),formulario:()=>renderAbaFormulario(im),
    compras:()=>renderAbaCompras(im),enxoval:()=>renderAbaEnxoval(im),
    operacional:()=>renderAbaOperacional(im),custos:()=>renderAbaCustos(im),final:()=>renderAbaFinal(im),
    atualizacoes:()=>renderAbaAtualizacoes(im)};
  document.getElementById('detalhe-body').innerHTML=(fns[aba]||fns.dados)();
}

// ─── SALVAR / AVANCAR / PERDIDO ───
function salvarImovelAtual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  _coletarDadosAba(_abaAtiva,im);saveAll();renderKanban();
  _atualizarHeaderDetalhe(im);
  document.getElementById('detalhe-titulo').textContent=im.nome;
  showToast('Salvo!','sage');
}
function avancarFaseAtual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  _coletarDadosAba(_abaAtiva,im);
  const idx=FASES.indexOf(im.status);
  if(idx===FASES.length-1){im.status='ativo';im.dataAtivacao=im.dataAtivacao||hoje();}
  else if(idx>=0&&idx<FASES.length-1){im.status=FASES[idx+1];}
  _addAtualizacao(im,`Avançou para a fase "${im.status==='ativo'?'Ativo':FASE_LABEL[im.status]}".`,'fase');
  saveAll();renderKanban();_atualizarHeaderDetalhe(im);
  showToast(`Avançado para "${im.status==='ativo'?'Ativo':FASE_LABEL[im.status]}"!`,'sage');
}
function togglePerdidoAtual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.statusAnterior=im.status;im.status='perdido';
  _addAtualizacao(im,'Marcado como perdido.','fase');
  saveAll();renderKanban();closeModal('modal-detalhe');showToast('Marcado como perdido.','peach');
}
function voltarOperacao(id){
  const im=getImovel(id);if(!im)return;
  im.status=im.statusAnterior||'contrato';im.statusAnterior=null;
  _addAtualizacao(im,`Voltou à operação, fase "${FASE_LABEL[im.status]||im.status}".`,'fase');
  saveAll();renderKanban();showToast('Voltou à operação.','sage');
}
function _addAtualizacao(im,texto,tipo){
  if(!im.atualizacoes)im.atualizacoes=[];
  const u=getCurrentUser();
  im.atualizacoes.push({id:uid(),data:new Date().toISOString(),texto,tipo:tipo||'manual',autor:u?.nome||u?.email||'Equipe'});
}
function adicionarAtualizacaoManual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const el=document.getElementById('nova-atualizacao-texto');
  const texto=(el?.value||'').trim();
  if(!texto){showToast('Escreva algo antes de adicionar.','peach');return;}
  _addAtualizacao(im,texto,'manual');
  saveAll();renderAba('atualizacoes');showToast('Atualização adicionada!','sage');
}
function apagarAtualizacao(id){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.atualizacoes=(im.atualizacoes||[]).filter(a=>a.id!==id);
  saveAll();renderAba('atualizacoes');
}
function renderAbaAtualizacoes(im){
  const lista=(im.atualizacoes||[]).slice().sort((a,b)=>new Date(b.data)-new Date(a.data));
  return`<div class="form-grid">
    <div class="form-section-title"><i class="fa-solid fa-timeline"></i> Atualizações do imóvel</div>
    <div class="form-group">
      <textarea class="input" id="nova-atualizacao-texto" rows="2" placeholder="Ex: vistoria feita, falta comprar toalhas..."></textarea>
      <button class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="adicionarAtualizacaoManual()"><i class="fa-solid fa-plus"></i> Adicionar atualização</button>
    </div>
    <div style="margin-top:8px;">
      ${lista.length?lista.map(a=>`
        <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:${a.tipo==='fase'?'var(--purple-bg)':'var(--surface-2)'};color:${a.tipo==='fase'?'var(--purple-text)':'var(--text-2)'};font-size:11px;">
            <i class="fa-solid ${a.tipo==='fase'?'fa-arrow-right':'fa-note-sticky'}"></i>
          </div>
          <div style="flex:1;">
            <div style="font-size:13px;">${esc(a.texto)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${esc(a.autor||'')} · ${new Date(a.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          ${a.tipo==='manual'?`<button class="btn btn-xs btn-outline" onclick="apagarAtualizacao('${a.id}')" title="Remover"><i class="fa-solid fa-trash"></i></button>`:''}
        </div>`).join(''):'<div class="empty-state" style="padding:24px;text-align:center;font-size:13px;color:var(--text-muted);">Nenhuma atualização ainda.</div>'}
    </div>
  </div>`;
}
function confirmarApagarImovel(){if(confirm('Apagar este imóvel permanentemente?')){apagarImovel(_imovelAtivoId);closeModal('modal-detalhe');}}
function apagarImovel(id){imoveis=imoveis.filter(x=>x.id!==id);saveAll();renderKanban();showToast('Apagado.','peach');}

// ═══════════════════ COLETAR DADOS DAS ABAS ═══════════════════
function _coletarDadosAba(aba,im){
  const g=id=>{const el=document.getElementById(id);return el?el.value:''};
  const gc=id=>{const el=document.getElementById(id);return el?el.checked:false};
  const gn=id=>+g(id)||0;
  if(aba==='captacao'){
    const linkAnterior=im.captacaoLink||'';
    im.captacaoLink=g('cap-link');
    if(im.captacaoLink&&im.captacaoLink!==linkAnterior){
      triggerDriveAnalysis(im);
    }
    if(document.getElementById('cap-kpi-claire')){
      im.incluirKpiClaire=gc('cap-kpi-claire');
      im.incluirSetupClaire=gc('cap-kpi-setup');
      im.mesReferenciaKpi=g('cap-kpi-mes');
    }
  }
  if(aba==='dados'){
    im.nome=g('d-nome')||im.nome; im.endereco=g('d-endereco');
    im.proprietarioNome=g('d-prop-nome'); im.proprietarioTel=g('d-prop-tel'); im.proprietarioEmail=g('d-prop-email');
    im.comissaoWecare=gn('d-comissao'); im.comissaoBase=g('d-comissao-base');
    im.quartos=gn('d-quartos')||1; im.andares=gn('d-andares')||1; im.salas=gn('d-salas'); im.banheirosCompletos=gn('d-banheiros-completos')||0; im.banheirosLavabo=gn('d-banheiros-lavabo')||0; im.maxHospedes=gn('d-max-hospedes')||0;
    im.cozinha=+document.getElementById('d-cozinha')?.value||0; im.lavanderia=+document.getElementById('d-lavanderia')?.value||0; im.areaExterna=+document.getElementById('d-area-externa')?.value||0; im.varanda=+document.getElementById('d-varanda')?.value||0;
    im.plataformas=[];
    document.querySelectorAll('.pltf-check:checked').forEach(c=>im.plataformas.push(c.value));
    im.observacoes=g('d-obs');
    im.camas=_coletarCamas();
    // Acesso & Operação
    im.wifi={rede:g('d-wifi-rede'),senha:g('d-wifi-senha')};
    im.acesso=g('d-acesso'); im.senhaPorta=g('d-senha-porta'); im.vaga=g('d-vaga');
    im.zeladorNome=g('d-zelador-nome'); im.zeladorTel=g('d-zelador-tel');
    im.shortStayPermitido=g('d-short-stay');
    im.restricoes=g('d-restricoes');
    // Auto-preenche formRascunho com os dados de acesso
    _autoRascunhoFromDados(im);
    document.getElementById('detalhe-titulo').textContent=im.nome;
  }
  if(aba==='contrato'){
    im.contratoLink=g('ct-link');
    im.valorMinNoite=gn('ct-min-noite'); im.valorBaseNoite=gn('ct-base-noite');
    im.taxaHospedeExtra=gn('ct-taxa-extra'); im.taxaHospedeExtraAcimaDe=gn('ct-extra-acima');
    im.taxaLimpeza=gn('ct-taxa-limpeza');
    im.valorCaucao=gn('ct-caucao'); im.politicaCancelamento=g('ct-politica-cancelamento');
    if(!im.ops)im.ops={fotos:{},limpeza:{},vistoria:{}};
    ['fotos','limpeza','vistoria'].forEach(op=>{
      if(!im.ops[op])im.ops[op]={};
      const v=gn(`ct-op-${op}`);if(v!=null)im.ops[op].custo=v;
    });
    const mg=gn('ct-margem');if(mg!=null)im.margemWecare=mg;
    im.descontoTipo=g('ct-desc-tipo');
    im.descontoValor=gn('ct-desc-val');
    im.formasPagamento=g('ct-pagamento');
  }
  if(aba==='definicoes'){
    if(!im.defOperacionais)im.defOperacionais={};
    DEF_OPERACIONAIS.forEach(s=>{im.defOperacionais[s.id]=!!document.getElementById('def-op-'+s.id)?.checked;});
    // compat legado
    im.seguroEasyCover=im.defOperacionais['seguroEasyCover']||false;
    im.kitAmenities=im.defOperacionais['kitAmenities']||false;
    im.internetClaro=im.defOperacionais['internetClaro']||false;
    im.ecohost=im.defOperacionais['ecohost']||false;
    im.fechaduraEletronica=im.defOperacionais['fechaduraEletronica']||false;
    im.defLimpeza={responsavel:g('def-limpeza-resp')};
    const _enxTipo=g('def-enxoval-tipo');
    im.defEnxoval={tipo:_enxTipo,fornecedor:_enxTipo==='aluguel'?g('def-enxoval-forn-select'):g('def-enxoval-forn-texto'),valorAluguelMensal:gn('def-enxoval-mensal'),valorSetupAluguel:gn('def-enxoval-setup')};
    im.prazoAtivacaoHoras=gn('def-prazo-ativacao');
  }
  if(aba==='operacional'){
    ['fotos','limpeza','vistoria'].forEach(op=>{
      im.ops[op].data=g(`op-${op}-data`); im.ops[op].responsavel=g(`op-${op}-resp`);
      im.ops[op].hora=g(`op-${op}-hora`); im.ops[op].custo=gn(`op-${op}-custo`);
    });
    im.ops.vistoria.localizacao=g('op-vistoria-local');
  }
  if(aba==='custos'){
    im.margemWecare=gn('cs-margem'); im.descontoTipo=g('cs-desc-tipo');
    im.descontoValor=gn('cs-desc-val'); im.formasPagamento=g('cs-pagamento');
  }
  if(aba==='final'){
    im.responsavelCriacao=g('fn-resp-criacao'); im.dataEnvioParaCriacao=g('fn-data-envio');
    im.valorMinNoite=gn('fn-min-noite')||im.valorMinNoite;
  }
  if(aba==='compras'){_coletarCompras(im);}
  if(aba==='formulario'){im.formRascunho=_coletarRascunho();}
}
function _autoRascunhoFromDados(im){
  if(!im.formRascunho)im.formRascunho={};
  const conf=im.formConfirmados||{};
  const set=(qid,val)=>{ if(!conf[qid]&&val!=null&&String(val).trim()) im.formRascunho[qid]=String(val).trim(); };
  // q81: como hóspedes acessam o imóvel
  const acessoParts=[im.acesso,im.senhaPorta?`Senha da porta: ${im.senhaPorta}`:'',im.vaga?`Vaga: ${im.vaga}`:''].filter(Boolean);
  if(acessoParts.length) set('q81',acessoParts.join('\n'));
  // q83: contato portaria / zelador
  const zelParts=[im.zeladorNome,im.zeladorTel].filter(Boolean);
  if(zelParts.length) set('q83',zelParts.join(' — '));
  // q86: dados de Wi-Fi
  const wifiRede=(im.wifi||{}).rede; const wifiSenha=(im.wifi||{}).senha;
  if(wifiRede||wifiSenha) set('q86',[wifiRede?`Rede: ${wifiRede}`:'',wifiSenha?`Senha: ${wifiSenha}`:''].filter(Boolean).join('\n'));
  // q9: endereço
  if(im.endereco) set('q9',im.endereco);
}
function _coletarCamas(){
  const rows=document.querySelectorAll('.cama-row');
  const camas=[];
  rows.forEach(r=>{
    const tipo=r.querySelector('.cama-tipo')?.value;
    const qtd=+r.querySelector('.num-input-wrap input')?.value||1;
    if(tipo)camas.push({tipo,qtd});
  });
  return camas;
}
function _coletarCompras(im){
  document.querySelectorAll('.compra-qtd-input').forEach(inp=>{
    const idx=inp.dataset.idx;
    if(!im.compras)im.compras={};
    if(!im.compras[idx])im.compras[idx]={};
    im.compras[idx].qtdReal=+inp.value||0;
    im.compras[idx].comprado=inp.closest('tr')?.querySelector('.compra-check')?.checked||false;
  });
  const freteEl=document.getElementById('compras-frete');
  if(freteEl)im.freteTotal=+freteEl.value||0;
}

// ═══════════════════ ABA DADOS ═══════════════════
function renderAbaDados(im){
  const plataformas=['Airbnb','Booking','Vrbo','Expedia','Decolar','Site Próprio'];
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-house"></i> Informações do Imóvel</div>
  <div class="form-group"><label>Nome do Imóvel</label><input id="d-nome" class="input" value="${esc(im.nome)}"></div>
  <div class="form-group"><label>Endereço</label><input id="d-endereco" class="input" value="${esc(im.endereco||'')}"></div>
  <div class="form-row">
    <div class="form-group"><label>Quartos</label>${numInput({id:'d-quartos',value:im.quartos||1,min:1})}</div>
    <div class="form-group"><label>Andares</label>${numInput({id:'d-andares',value:im.andares||1,min:1})}</div>
    <div class="form-group"><label>Salas</label>${numInput({id:'d-salas',value:im.salas!=null?im.salas:1,min:0})}</div>
    <div class="form-group"><label>Banheiros completos</label>${numInput({id:'d-banheiros-completos',value:im.banheirosCompletos!=null?im.banheirosCompletos:(im.banheiros||1),min:0})}</div>
    <div class="form-group"><label>Lavabos</label>${numInput({id:'d-banheiros-lavabo',value:im.banheirosLavabo||0,min:0})}</div>
  </div>
  <div class="form-row" style="flex-wrap:wrap;gap:12px;margin-top:4px;">
    <div class="form-group"><label>Cozinhas</label>${numInput({id:'d-cozinha',value:_qtdComodo(im.cozinha),min:0})}</div>
    <div class="form-group"><label>Lavanderias</label>${numInput({id:'d-lavanderia',value:_qtdComodo(im.lavanderia),min:0})}</div>
    <div class="form-group"><label>Áreas Externas</label>${numInput({id:'d-area-externa',value:_qtdComodo(im.areaExterna),min:0})}</div>
    <div class="form-group"><label>Varandas/Pátios</label>${numInput({id:'d-varanda',value:_qtdComodo(im.varanda),min:0})}</div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-user"></i> Proprietário</div>
  <div class="form-row">
    <div class="form-group"><label>Nome</label><input id="d-prop-nome" class="input" value="${esc(im.proprietarioNome||'')}"></div>
    <div class="form-group"><label>Telefone / WhatsApp</label><input id="d-prop-tel" class="input" value="${esc(im.proprietarioTel||'')}"></div>
    <div class="form-group"><label>E-mail</label><input id="d-prop-email" type="email" class="input" value="${esc(im.proprietarioEmail||'')}" placeholder="proprietario@email.com"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Comissão WeCare (%)</label>${numInput({id:'d-comissao',value:im.comissaoWecare||20,min:0,max:100})}</div>
    <div class="form-group"><label>Base de Cálculo</label><select id="d-comissao-base" class="input">
      <option value="liquida"${im.comissaoBase==='liquida'?' selected':''}>Líquida (após plataforma)</option>
      <option value="bruta"${im.comissaoBase==='bruta'?' selected':''}>Bruta</option>
    </select></div>
  </div>

  <div class="form-row" style="flex-wrap:wrap;gap:12px;margin-top:4px;">
    <div class="form-group"><label>Máx. hóspedes</label>${numInput({id:'d-max-hospedes',value:im.maxHospedes||0,min:0})}</div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-bed"></i> Camas</div>
  <div id="camas-list">${_htmlCamas(im.camas||[])}</div>
  <button class="btn btn-outline btn-sm" onclick="adicionarCama()"><i class="fa-solid fa-plus"></i> Adicionar cama</button>

  <div class="form-section-title"><i class="fa-solid fa-globe"></i> Plataformas</div>
  <div class="form-row" style="flex-wrap:wrap;gap:12px;">
    ${plataformas.map(p=>`<label class="checkbox-label"><input type="checkbox" class="pltf-check" value="${p}"${(im.plataformas||[]).includes(p)?' checked':''}> ${p}</label>`).join('')}
  </div>

  <div class="form-section-title"><i class="fa-solid fa-wifi"></i> Acesso & Operação</div>
  <div class="form-row">
    <div class="form-group"><label>Wi-Fi — Nome da rede</label><input id="d-wifi-rede" class="input" value="${esc((im.wifi||{}).rede||'')}"></div>
    <div class="form-group"><label>Wi-Fi — Senha</label><input id="d-wifi-senha" class="input" value="${esc((im.wifi||{}).senha||'')}"></div>
  </div>
  <div class="form-group"><label>Como hóspedes acessam o imóvel</label><textarea id="d-acesso" class="input" rows="2" placeholder="Ex: Portaria 24h. Informar nome. Fechadura eletrônica…">${esc(im.acesso||'')}</textarea></div>
  <div class="form-row">
    <div class="form-group"><label>Senha da porta / fechadura</label><input id="d-senha-porta" class="input" value="${esc(im.senhaPorta||'')}"></div>
    <div class="form-group"><label>Vaga de garagem</label><input id="d-vaga" class="input" value="${esc(im.vaga||'')}"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Zelador / Portaria — Nome</label><input id="d-zelador-nome" class="input" value="${esc(im.zeladorNome||'')}"></div>
    <div class="form-group"><label>Zelador / Portaria — Telefone</label><input id="d-zelador-tel" class="input" value="${esc(im.zeladorTel||'')}"></div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-building-columns"></i> Condomínio</div>
  <div class="form-row" style="align-items:flex-end;gap:16px;">
    <div class="form-group"><label>Convenção aceita short stay</label>
      <select id="d-short-stay" class="input">
        <option value="">Não informado</option>
        <option value="sim"${im.shortStayPermitido==='sim'?' selected':''}>Sim</option>
        <option value="nao"${im.shortStayPermitido==='nao'?' selected':''}>Não</option>
      </select>
    </div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-triangle-exclamation"></i> Restrições</div>
  <div class="form-group"><textarea id="d-restricoes" class="input" rows="3" placeholder="Ex: proibido animais; sem festas; máximo 4 hóspedes; cláusula de adendo...">${esc(im.restricoes||'')}</textarea></div>

  <div class="form-section-title"><i class="fa-solid fa-comment-dots"></i> Observações</div>
  <div class="form-group"><textarea id="d-obs" class="input" rows="3">${esc(im.observacoes||'')}</textarea></div>
  <div style="margin-top:16px;">
    <button class="btn btn-sage" onclick="salvarImovelAtual()"><i class="fa-solid fa-floppy-disk"></i> Salvar dados</button>
  </div>
  </div>`;
}
function _htmlCamas(camas){
  const tipos=['Solteiro','Casal','Queen','King','Beliche','Bicama','Sofá-cama Solteiro','Sofá-cama Casal','Viúva'];
  return camas.map((c,i)=>`<div class="cama-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
    <select class="input cama-tipo" style="flex:2">${tipos.map(t=>`<option${t===c.tipo?' selected':''}>${t}</option>`).join('')}</select>
    ${numInput({id:`cama-qtd-${i}`,value:c.qtd||1,min:1,style:'flex-shrink:0;'})}
    <button class="btn btn-xs btn-danger" onclick="this.closest('.cama-row').remove()"><i class="fa-solid fa-trash"></i></button>
  </div>`).join('');
}
function adicionarCama(){
  const tipos=['Solteiro','Casal','Queen','King','Beliche','Bicama','Sofá-cama Solteiro','Sofá-cama Casal','Viúva'];
  const div=document.createElement('div');div.className='cama-row';
  div.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  div.innerHTML=`<select class="input cama-tipo" style="flex:2">${tipos.map(t=>`<option>${t}</option>`).join('')}</select>
    ${numInput({value:1,min:1,style:'flex-shrink:0;'})}
    <button class="btn btn-xs btn-danger" onclick="this.closest('.cama-row').remove()"><i class="fa-solid fa-trash"></i></button>`;
  document.getElementById('camas-list').appendChild(div);
}

// ═══════════════════ ABA CAPTAÇÃO ═══════════════════
function renderAbaCaptacao(im){
  const temLink=!!(im.captacaoLink||'').trim();
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-brands fa-google-drive"></i> Pasta de Captação</div>
  <div class="hint" style="margin-bottom:12px;">Link da pasta do Google Drive criada pela equipe de captação para este imóvel (contrato, reuniões, fotos, etc.).</div>
  <div class="form-group">
    <label>Link da Pasta no Drive</label>
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="cap-link" class="input" placeholder="https://drive.google.com/drive/folders/..." value="${esc(im.captacaoLink||'')}">
      ${temLink?`<a href="${esc(im.captacaoLink)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i> Abrir</a>`:''}
    </div>
  </div>
  ${im.jarvisPreenchidoEm?`<div class="alert-success" style="margin-top:4px;"><i class="fa-solid fa-robot"></i> Jarvis preencheu dados automaticamente em <strong>${fmtDate(im.jarvisPreenchidoEm)}</strong>.</div>`:''}
  ${im.claudeAnalisando
    ?`<div class="alert-info" style="margin-top:8px;"><span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span>🤖 Analisando...</div>`
    :im.claudeAnalisadoEm
      ?`<div class="alert-success" style="margin-top:8px;display:flex;align-items:center;gap:8px;"><span><i class="fa-solid fa-check-circle"></i> ✅ Analisado em <strong>${fmtDate(im.claudeAnalisadoEm)}</strong> · ${im.arquivosAnalisados||0} arquivo(s)</span><button class="btn btn-sm btn-outline" style="margin-left:auto;" onclick="triggerDriveAnalysis(getImovel('${im.id}'))">🔄 Reanalisar</button></div>`
      :temLink
        ?`<div class="hint" style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span><i class="fa-solid fa-info-circle"></i> Ainda não analisado.</span><button class="btn btn-sm btn-outline" onclick="triggerDriveAnalysis(getImovel('${im.id}'))"><i class="fa-solid fa-robot"></i> Analisar agora</button></div>`
        :`<div class="hint" style="margin-top:8px;"><i class="fa-solid fa-info-circle"></i> Salve o link para iniciar análise automática com IA</div>`
  }

  ${isAdmin()?(()=>{
    const custoFotosKpi=+im.ops?.fotos?.custo||0;
    const custoLimpezaKpi=+im.ops?.limpeza?.custo||0;
    const custoVistoriaKpi=+im.ops?.vistoria?.custo||0;
    const custosExtrasKpi=(im.eventosExtras||[]).filter(e=>e.gastoSetup).reduce((s,g)=>s+(+g.custo||0),0);
    const gastoSetupKpi=custoFotosKpi+custoLimpezaKpi+custoVistoriaKpi+custosExtrasKpi;
    const valorSetupCobradoKpi=im.valorSetupCobrado||0;
    return`
  <details style="margin-top:16px;">
    <summary style="cursor:pointer;font-size:12px;font-weight:600;color:var(--text3);user-select:none;padding:6px 0;">
      <i class="fa-solid fa-chart-line"></i> Integração com Claire (KPI)
    </summary>
    <div style="margin-top:10px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;">
        <input type="checkbox" id="cap-kpi-claire" ${im.incluirKpiClaire?'checked':''}> Colocar na Claire? <span class="text-muted" style="font-weight:400;">(Tempo de Onboarding)</span>
      </label>
      ${!im.dataAtivacao?`<div class="hint" style="color:var(--brand-red,#c0392b);margin:2px 0 6px;"><i class="fa-solid fa-triangle-exclamation"></i> Esse imóvel ainda não tem data de ativação (não está "Ativo") — só entra na média de Tempo de Onboarding quando tiver.</div>`:''}
      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;margin-top:8px;">
        <input type="checkbox" id="cap-kpi-setup" ${im.incluirSetupClaire?'checked':''}> Colocar o Setup na Claire? <span class="text-muted" style="font-weight:400;">(Redução de Custos)</span>
      </label>
      <div class="hint" style="margin:2px 0 8px;">Manda pra Claire: valor cobrado do Setup (${fmtMoeda(valorSetupCobradoKpi)}) como previsto, e Fotos+Limpeza+Vistoria+Extras de Setup (${fmtMoeda(gastoSetupKpi)}) como gasto. Preencha esses valores na aba Contrato antes de marcar.</div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;">
        Mês de referência (vale pros dois acima):
        <input type="month" id="cap-kpi-mes" class="input" style="width:150px;padding:4px 8px;font-size:12.5px;" value="${esc(im.mesReferenciaKpi||'')}">
      </label>
    </div>
  </details>
  `;})():''}

  <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
    <button class="btn btn-sage btn-sm" onclick="salvarImovelAtual()"><i class="fa-solid fa-floppy-disk"></i> Salvar link da pasta</button>
    ${temLink?`<a href="${esc(im.captacaoLink)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-brands fa-google-drive"></i> Abrir pasta no Drive</a>`:''}
  </div>
  </div>
  <hr class="divider" style="margin:20px 0;">
  ${renderAbaAtualizacoes(im)}`;
}

// ═══════════════════ ANÁLISE DRIVE + CLAUDE ═══════════════════
async function triggerDriveAnalysis(im){
  const s=window.WC_SYNC||{};
  if(!s.url){showToast('Worker não configurado.','peach');return;}
  showToast('🤖 Analisando pasta Drive...','');
  im.claudeAnalisando=true;saveAll();

  // Buscar vistoria recente do localStorage
  let vistoriaRecente=null;
  try{
    const vistorias=JSON.parse(localStorage.getItem('wc_vistorias')||'[]');
    const deste=vistorias.filter(v=>v.imovelId===im.id||v.imovelId===String(im.id));
    if(deste.length){
      deste.sort((a,b)=>new Date(b.data||b.criadoEm||0)-new Date(a.data||a.criadoEm||0));
      const v=deste[0];
      vistoriaRecente={pendencias:v.pendencias,comodos:v.comodos,aptoPara:v.aptoPara};
    }
  }catch{}

  try{
    const r=await fetch(s.url.replace(/\/$/,'')+'/analisar-drive?token='+encodeURIComponent(s.token||''),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:im.id,captacaoLink:im.captacaoLink||'',vistoriaRecente})
    });
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Falha na análise');
    await kvPull(false);
    renderAba(_abaAtiva);
    showToast('✅ Preenchimento concluído! '+j.arquivos+' arquivo(s) analisado(s)','sage');
  }catch(e){
    showToast('Erro na análise Drive: '+(e.message||'desconhecido'),'peach');
  }finally{
    const imAtual=getImovel(im.id);
    if(imAtual){imAtual.claudeAnalisando=false;saveAll();}
  }
}

// ═══════════════════ ABA FOTOS ═══════════════════
function renderAbaFotos(im){
  const fotos=im.fotos||[];
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-images"></i> Fotos do Imóvel</div>
  <div class="hint" style="margin-bottom:12px;">Suba as fotos do imóvel. A IA analisa e preenche automaticamente os campos de dados (quartos, camas, características, etc.).</div>

  <div style="border:2px dashed var(--border);border-radius:12px;padding:22px;text-align:center;background:var(--surface-2,#f8f4f9);">
    <input type="file" id="fotos-input" accept="image/*" multiple style="display:none;" onchange="_onUploadFotos(event)">
    <i class="fa-solid fa-camera fa-2x" style="color:var(--lavender);opacity:.7;margin-bottom:10px;display:block;"></i>
    <div style="font-size:13px;color:var(--text-2,#888);margin-bottom:14px;">${fotos.length?`<strong>${fotos.length}</strong> foto(s) carregada(s)`:'Nenhuma foto ainda'}</div>
    <button class="btn btn-primary btn-sm" onclick="document.getElementById('fotos-input').click()">
      <i class="fa-solid fa-upload"></i> ${fotos.length?'Adicionar mais fotos':'Escolher fotos'}
    </button>
  </div>
  <div id="fotos-status" style="margin-top:8px;"></div>

  ${fotos.length?`
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
    ${fotos.map((f,i)=>`<div style="position:relative;">
      <img src="${f.data}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" title="${esc(f.nome)}">
      <button onclick="_removerFoto(${i})" style="position:absolute;top:-7px;right:-7px;background:#c0392b;color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:11px;line-height:20px;text-align:center;padding:0;"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('')}
  </div>

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-wand-magic-sparkles"></i> Análise com Jarvis</div>
  ${im.fotosIaSolicitadoEm?`<div class="alert-success"><i class="fa-solid fa-check-circle"></i> Solicitação enviada ao Jarvis em <strong>${fmtDate(im.fotosIaSolicitadoEm)}</strong>. Os campos serão preenchidos automaticamente quando ele processar as fotos.</div>`:'<div class="alert-info"><i class="fa-solid fa-info-circle"></i> Clique abaixo para o Jarvis analisar as fotos e preencher os campos automaticamente.</div>'}
  <button class="btn btn-primary" id="btn-ia-fotos" onclick="_rodarIAFotos()" style="margin-top:8px;">
    <i class="fa-solid fa-robot"></i> Solicitar análise de fotos ao Jarvis
  </button>
  <div class="hint" style="margin-top:6px;">O Jarvis analisa detalhes visíveis nas fotos: tipo de camas, cômodos, estado de conservação, itens presentes, etc., e preenche os campos automaticamente.</div>
  `:''}
  </div>`;
}

async function _onUploadFotos(ev){
  const files=[...(ev.target.files||[])];
  if(!files.length)return;
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const status=document.getElementById('fotos-status');
  if(status)status.innerHTML='<div class="alert-info">Comprimindo fotos…</div>';
  if(!im.fotos)im.fotos=[];
  let ok=0;
  for(const file of files){
    try{
      const data=await _comprimirImagem(file,900,0.72);
      im.fotos.push({nome:file.name,data,tipo:file.type});ok++;
    }catch(e){showToast('Erro ao processar '+file.name,'peach');}
  }
  saveAll();
  if(status)status.innerHTML='';
  renderAba('fotos');
  if(ok)showToast(ok+' foto(s) adicionada(s)!','sage');
}
function _comprimirImagem(file,maxSide,quality){
  return new Promise((resolve,reject)=>{
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const canvas=document.createElement('canvas');
      let w=img.width,h=img.height;
      if(w>maxSide||h>maxSide){if(w>h){h=Math.round(h*maxSide/w);w=maxSide;}else{w=Math.round(w*maxSide/h);h=maxSide;}}
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror=reject;img.src=url;
  });
}
function _removerFoto(idx){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.fotos=(im.fotos||[]).filter((_,i)=>i!==idx);
  saveAll();renderAba('fotos');
}
async function _rodarIAFotos(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const fotos=im.fotos||[];
  if(!fotos.length){showToast('Nenhuma foto para analisar.','peach');return;}
  const s=window.WC_SYNC||{};
  if(!s.url){showToast('Worker não configurado.','peach');return;}
  const btn=document.getElementById('btn-ia-fotos');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Enviando solicitação ao Jarvis…';}
  try{
    const r=await fetch(s.url.replace(/\/$/,'')+'/jarvis-notify?id='+encodeURIComponent(im.id)+'&token='+encodeURIComponent(s.token||''),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:im.id,dados:{solicitarFotoAnalise:true,fotosCount:fotos.length,imovelNome:im.nome}})
    });
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Falha ao notificar Jarvis');
    im.fotosIaSolicitadoEm=new Date().toISOString();
    saveAll();
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-robot"></i> Solicitar análise de fotos ao Jarvis';}
    showToast('Solicitação enviada ao Jarvis! Os campos serão preenchidos automaticamente em breve.','sage');
    renderAba('fotos');
  }catch(e){
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-robot"></i> Solicitar análise de fotos ao Jarvis';}
    showToast('Erro: '+(e.message||'Jarvis indisponível'),'peach');
  }
}

// ═══════════════════ ABA CONTRATO ═══════════════════
function renderAbaContrato(im){
  const ops=im.ops||{fotos:{},limpeza:{},vistoria:{}};
  const gastosSetup=(im.eventosExtras||[]).filter(e=>e.gastoSetup);
  const custoFotos=+ops.fotos?.custo||0;
  const custoLimpeza=+ops.limpeza?.custo||0;
  const custoVistoria=+ops.vistoria?.custo||0;
  const custosExtras=gastosSetup.reduce((s,g)=>s+(+g.custo||0),0);
  const totalSetupBase=custoFotos+custoLimpeza+custoVistoria+custosExtras;
  const valorSetupCobrado=im.valorSetupCobrado||0;
  const margemSetup=valorSetupCobrado-totalSetupBase;
  const pctMargem=valorSetupCobrado>0?Math.round((margemSetup/valorSetupCobrado)*1000)/10:0;

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-file-signature"></i> Contrato</div>
  <div class="form-group">
    <label>Link do Contrato (PDF / Drive)</label>
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="ct-link" class="input" placeholder="https://..." value="${esc(im.contratoLink||'')}">
      ${im.contratoLink?`<a href="${esc(im.contratoLink)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i></a>`:''}
    </div>
  </div>
  ${im.contratoAssinado?`<div class="alert-success"><i class="fa-solid fa-check-circle"></i> Contrato assinado em <strong>${fmtDate(im.dataContratoAssinado)}</strong></div>`:''}
  <div class="form-group" style="margin-top:8px;">
    <button class="btn btn-outline btn-sm" onclick="marcarContratoAssinadoManual()"><i class="fa-solid fa-pen"></i> Marcar como assinado manualmente</button>
  </div>

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-wrench"></i> Setup</div>
  <div class="form-row">
    <div class="form-group"><label>Fotos (R$)</label>${numInput({id:'ct-op-fotos',value:custoFotos,min:0,step:50,oninput:'_atualizarSubtotalSetup()'})}</div>
    <div class="form-group"><label>Limpeza (R$)</label>${numInput({id:'ct-op-limpeza',value:custoLimpeza,min:0,step:50,oninput:'_atualizarSubtotalSetup()'})}</div>
    <div class="form-group"><label>Vistoria (R$)</label>${numInput({id:'ct-op-vistoria',value:custoVistoria,min:0,step:50,oninput:'_atualizarSubtotalSetup()'})}</div>
  </div>

  ${gastosSetup.length?`<div style="margin-bottom:8px;">
    ${gastosSetup.map(g=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
      <span style="flex:1;font-size:13px;">${esc(g.titulo)}</span>
      <span style="font-weight:600;font-size:13px;">${fmtMoeda(+g.custo||0)}</span>
      <button class="btn btn-xs btn-outline" onclick="desmarcarGastoSetup('${g.id}')" title="Remover da conta de Setup"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('')}
  </div>`:''}
  <div class="hint" style="margin-bottom:16px;">Gastos extras são cadastrados na aba <strong>Produção</strong> ("Outros Eventos"), marcando a caixa "Gasto de Setup?". Eles aparecem aqui automaticamente.</div>

  <div class="form-group"><label>Valor cobrado ao proprietário pelo Setup (R$)</label>${numInput({id:'ct-setup-cobrado',value:valorSetupCobrado,min:0,step:50,oninput:'_atualizarSubtotalSetup()'})}</div>
  <div style="background:var(--surface-2);border-radius:10px;padding:12px 14px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);">
      <span>Total de Gastos</span>
      <span id="ct-subtotal-val">${fmtMoeda(totalSetupBase)}</span>
    </div>
    <div id="ct-subtotal-detail" style="font-size:11px;color:var(--text-muted);margin-top:4px;">
      Fotos ${fmtMoeda(custoFotos)} + Limpeza ${fmtMoeda(custoLimpeza)} + Vistoria ${fmtMoeda(custoVistoria)}${custosExtras?` + Extras ${fmtMoeda(custosExtras)}`:''}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);margin-top:6px;">
      <span id="ct-setup-margem-label">Margem WeCare (${pctMargem}%)</span>
      <span id="ct-setup-margem-val" style="color:${margemSetup>=0?'var(--sage)':'var(--rose)'};">${fmtMoeda(margemSetup)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--rose);border-top:1px solid var(--border);margin-top:8px;padding-top:8px;">
      <span>Valor Cobrado (Setup)</span>
      <span id="ct-setup-total">${fmtMoeda(valorSetupCobrado)}</span>
    </div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-chart-line"></i> Precificação Inicial</div>
  <div class="form-row">
    <div class="form-group"><label>Valor Mínimo / Noite (R$)</label>${numInput({id:'ct-min-noite',value:im.valorMinNoite||0,min:0,step:10})}</div>
    <div class="form-group"><label>Valor Base / Noite (R$)</label>${numInput({id:'ct-base-noite',value:im.valorBaseNoite||0,min:0,step:10})}</div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Taxa Hóspede Extra (R$)</label>${numInput({id:'ct-taxa-extra',value:im.taxaHospedeExtra||0,min:0,step:10})}</div>
    <div class="form-group"><label>Acima de (nº hóspedes)</label>${numInput({id:'ct-extra-acima',value:im.taxaHospedeExtraAcimaDe||0,min:0})}</div>
  </div>
  <div class="form-group"><label>Taxa de Limpeza (R$)</label>${numInput({id:'ct-taxa-limpeza',value:im.taxaLimpeza||0,min:0,step:10})}</div>
  <div class="form-row">
    <div class="form-group"><label>Caução (R$)</label>${numInput({id:'ct-caucao',value:im.valorCaucao||0,min:0,step:10})}</div>
    <div class="form-group"><label>Política de Cancelamento</label>
      <select id="ct-politica-cancelamento" class="input">
        <option value="">Selecione...</option>
        <option value="Flexível"${im.politicaCancelamento==='Flexível'?' selected':''}>Flexível — reembolso completo até 24h antes do check-in</option>
        <option value="Moderada"${im.politicaCancelamento==='Moderada'?' selected':''}>Moderada — reembolso completo até 5 dias antes do check-in</option>
        <option value="Limitada"${im.politicaCancelamento==='Limitada'?' selected':''}>Limitada — 100% até 14 dias; 50% entre 7-14 dias; não reembolsável depois</option>
        <option value="Restrita"${im.politicaCancelamento==='Restrita'?' selected':''}>Restrita — 100% até 30 dias; 50% entre 7-30 dias; não reembolsável depois</option>
      </select>
    </div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-credit-card"></i> Formas de Pagamento</div>
  <div class="form-group">
    <textarea id="ct-pagamento" class="input" rows="3" placeholder="Ex: 50% na assinatura + 50% na entrega das chaves">${esc(im.formasPagamento||'')}</textarea>
  </div>
  <button class="btn btn-sm" style="margin-top:8px;" onclick="gerarPDFOrcamento()"><i class="fa-solid fa-file-pdf"></i> Gerar PDF do Orçamento</button>
  </div>`;
}
function _atualizarSubtotalSetup(){
  const f=+document.getElementById('ct-op-fotos')?.value||0;
  const l=+document.getElementById('ct-op-limpeza')?.value||0;
  const v=+document.getElementById('ct-op-vistoria')?.value||0;
  const im=getImovel(_imovelAtivoId);
  const extras=(im?.eventosExtras||[]).filter(e=>e.gastoSetup).reduce((s,g)=>s+(+g.custo||0),0);
  const total=f+l+v+extras;
  const cobrado=+document.getElementById('ct-setup-cobrado')?.value||0;
  const margem=cobrado-total;
  const pct=cobrado>0?Math.round((margem/cobrado)*1000)/10:0;
  const valEl=document.getElementById('ct-subtotal-val');
  const detEl=document.getElementById('ct-subtotal-detail');
  if(valEl)valEl.textContent=fmtMoeda(total);
  if(detEl)detEl.textContent=`Fotos ${fmtMoeda(f)} + Limpeza ${fmtMoeda(l)} + Vistoria ${fmtMoeda(v)}`+(extras?` + Extras ${fmtMoeda(extras)}`:'');
  const mgEl=document.getElementById('ct-setup-margem-label');
  const mgValEl=document.getElementById('ct-setup-margem-val');
  const totalEl=document.getElementById('ct-setup-total');
  if(mgEl)mgEl.textContent=`Margem WeCare (${pct}%)`;
  if(mgValEl){mgValEl.textContent=fmtMoeda(margem);mgValEl.style.color=margem>=0?'var(--sage)':'var(--rose)';}
  if(totalEl)totalEl.textContent=fmtMoeda(cobrado);
  if(im){im.valorSetupCobrado=cobrado;saveAll();}
}
function desmarcarGastoSetup(id){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const ev=(im.eventosExtras||[]).find(e=>e.id===id);if(!ev)return;
  ev.gastoSetup=false;
  saveAll();renderAba('contrato');
}
function marcarContratoAssinadoManual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.contratoAssinado=true;im.dataContratoAssinado=hoje();
  _addAtualizacao(im,'Contrato marcado como assinado.','fase');
  if(im.status==='contrato'){im.status=FASES[FASES.indexOf('contrato')+1];_addAtualizacao(im,`Avançou para a fase "${FASE_LABEL[im.status]}".`,'fase');}
  saveAll();renderKanban();renderAba('contrato');_atualizarHeaderDetalhe(im);
  showToast('Contrato marcado como assinado.','sage');
}

// ═══════════════════ ABA DEFINIÇÕES ═══════════════════
function renderAbaDefinicoes(im){
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-sliders"></i> Definições Operacionais</div>
  <div class="form-row" style="flex-wrap:wrap;gap:16px;">
    ${DEF_OPERACIONAIS.map(s=>`<label class="checkbox-label"><input type="checkbox" id="def-op-${esc(s.id)}"${(im.defOperacionais||{})[s.id]?' checked':''}> ${esc(s.nome)}</label>`).join('')}
    ${!DEF_OPERACIONAIS.length?`<span style="font-size:12px;color:var(--text-muted);">Nenhum serviço configurado. Adicione em Configurações.</span>`:''}
  </div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-broom"></i> Equipe de Limpeza</div>
  <div class="form-group">
    <label>Responsável / Empresa</label>
    <input id="def-limpeza-resp" class="input" value="${esc(im.defLimpeza?.responsavel||'')}">
  </div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-bed"></i> Enxoval</div>
  <div class="form-group">
    <label>Modalidade</label>
    <select id="def-enxoval-tipo" class="input" onchange="_onEnxovalTipoChange(this)">
      <option value="comprado"${(im.defEnxoval?.tipo||'comprado')==='comprado'?' selected':''}>Comprado (Buddemeyer)</option>
      <option value="aluguel"${im.defEnxoval?.tipo==='aluguel'?' selected':''}>Alugado</option>
    </select>
  </div>
  <div class="form-group">
    <label>Fornecedor</label>
    <input id="def-enxoval-forn-texto" class="input" value="${esc(im.defEnxoval?.fornecedor||'')}" style="${im.defEnxoval?.tipo==='aluguel'?'display:none;':''}">
    <select id="def-enxoval-forn-select" class="input" style="${im.defEnxoval?.tipo==='aluguel'?'':'display:none;'}">
      <option value="Flashee"${im.defEnxoval?.fornecedor==='Flashee'?' selected':''}>Flashee</option>
      <option value="Intense Clean"${im.defEnxoval?.fornecedor==='Intense Clean'?' selected':''}>Intense Clean</option>
    </select>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Valor Mensal (R$)</label><input id="def-enxoval-mensal" type="number" class="input" value="${im.defEnxoval?.valorAluguelMensal||0}"></div>
    <div class="form-group"><label>Setup (R$)</label><input id="def-enxoval-setup" type="number" class="input" value="${im.defEnxoval?.valorSetupAluguel||0}"></div>
  </div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-clock"></i> Prazo</div>
  <div class="form-group">
    <label>Prazo de Ativação (horas após envio para criação do anúncio)</label>
    <input id="def-prazo-ativacao" type="number" class="input" value="${im.prazoAtivacaoHoras||24}" min="1">
  </div>
  </div>`;
}
function _onEnxovalTipoChange(sel){
  const aluguel=sel.value==='aluguel';
  const txt=document.getElementById('def-enxoval-forn-texto');
  const sel2=document.getElementById('def-enxoval-forn-select');
  if(txt)txt.style.display=aluguel?'none':'';
  if(sel2)sel2.style.display=aluguel?'':'none';
}

// ═══════════════════ ABA FORMULÁRIO ═══════════════════
function _formUrl(im){
  if(!im||!im.formToken)return'';
  const base=location.origin+location.pathname.replace(/[^/]*$/,'');
  return`${base}form.html?id=${im.id}&t=${im.formToken}`;
}
function _todasPerguntas(){
  return (window.FORM_PERGUNTAS_FLAT||[]);
}
function renderAbaFormulario(im){
  const url=_formUrl(im);
  const secoes=window.FORM_SECOES||[];
  const rascunho=im.formRascunho||{};
  const respostas=im.formRespostas||{};
  const confirmados=im.formConfirmados||{};
  const totalPerg=_todasPerguntas().length;
  const preenchidas=Object.values({...rascunho}).filter(v=>String(v||'').trim()).length;

  const secoesHtml=secoes.map(sec=>`
    <div class="form-section-title" style="margin-top:18px;"><i class="fa-solid fa-${sec.icon}"></i> ${sec.secao}</div>
    ${sec.perguntas.map(p=>{
      const val=rascunho[p.id]||'';
      const respDada=respostas[p.id];
      const confirmado=confirmados[p.id];
      const statusIcon=confirmado?'<span class="tag tag-sage" title="Confirmado pelo proprietário"><i class="fa-solid fa-check"></i></span>'
        :(respDada!=null&&String(respDada).trim()?'<span class="tag tag-lav" title="Editado pelo proprietário"><i class="fa-solid fa-pen"></i></span>':'');
      let campo;
      if(p.tipo==='radio'||p.tipo==='checkbox'){
        const selecionadas=val?val.split(',').map(x=>x.trim()).filter(Boolean):[];
        const pills=(p.opcoes||[]).map(op=>
          `<button type="button" class="rascunho-pill${selecionadas.includes(op)?' selected':''}" data-op="${esc(op)}" data-tipo="${p.tipo}" onclick="_toggleRascunhoPill(this)">${esc(op)}</button>`
        ).join('');
        campo = `<div class="rascunho-pill-grid">${pills}</div><input type="hidden" class="input form-rascunho" data-qid="${p.id}" value="${esc(val)}">`;
      } else if(p.tipo==='textarea'){
        campo = `<textarea class="input form-rascunho" data-qid="${p.id}" rows="2" placeholder="Pré-preencher (opcional)">${esc(val)}</textarea>`;
      } else {
        campo = `<input class="input form-rascunho" data-qid="${p.id}" type="${p.tipo==='number'?'number':'text'}" placeholder="Pré-preencher (opcional)" value="${esc(val)}">`;
      }
      return `<div class="form-group">
        <label style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span>${esc(p.label)}</span> ${statusIcon}
        </label>
        ${campo}
        ${respDada!=null&&String(respDada).trim()&&String(respDada)!==String(val)?`<div class="hint" style="color:var(--purple-text)"><i class="fa-solid fa-reply"></i> Resposta do proprietário: <strong>${esc(respDada)}</strong>${!confirmado?` · <a href="#" onclick="event.preventDefault();_limparRespostaOwner('${p.id}')" style="color:var(--brand-red);">limpar resposta antiga</a>`:''}</div>`:''}
      </div>`;
    }).join('')}
  `).join('');

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Analisar com IA (Gemini)</div>
  <div class="form-group">
    <div class="hint" style="margin-bottom:10px;">Suba vídeos ou fotos da vistoria. A IA extrai automaticamente wifi, acesso, zelador, camas e preenche o formulário.</div>
    <label id="midia-drop-area" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:2px dashed var(--border);border-radius:12px;padding:28px 16px;cursor:pointer;transition:border-color .2s;background:var(--surface-2);" ondragover="event.preventDefault();this.style.borderColor='var(--brand-gold)'" ondragleave="this.style.borderColor=''" ondrop="_midiaDrop(event)">
      <i class="fa-solid fa-photo-film" style="font-size:28px;color:var(--brand-gold);"></i>
      <span style="font-weight:600;">Arraste vídeos ou fotos aqui</span>
      <span style="font-size:12px;color:var(--text-muted);">ou clique para selecionar — MP4, MOV, JPG, PNG</span>
      <input id="midia-file-input" type="file" accept="video/*,image/*" multiple style="display:none" onchange="_midiaFileSelected(this.files)">
    </label>
    <div id="midia-preview" style="display:none;margin-top:10px;"></div>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;">
      <button id="btn-analisar-midia" class="btn btn-primary" style="display:none;" onclick="analisarMidiaComIA()"><i class="fa-solid fa-wand-magic-sparkles"></i> Analisar com IA</button>
      <span id="midia-status" style="font-size:12px;color:var(--text-muted);"></span>
    </div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-clipboard"></i> Link Público do Formulário</div>
  <div class="form-group">
    <label>Link para enviar ao proprietário</label>
    <div style="display:flex;gap:8px;align-items:center;">
      <input class="input" readonly value="${esc(url)}" onclick="this.select()">
      <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText('${esc(url)}').then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i></button>
      <a href="${esc(url)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i></a>
      <a href="https://wa.me/?text=${encodeURIComponent('Olá! Para finalizar o cadastro do seu imóvel na WeCare, preencha este formulário (já deixamos algumas respostas prontas, é só confirmar ou ajustar): '+url)}" target="_blank" class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;"><i class="fa-brands fa-whatsapp"></i></a>
    </div>
    <div class="hint">Os campos abaixo são preenchidos pela <strong>IA da reunião</strong> (aba Reunião) ou manualmente. O proprietário abre sem login e tudo já aparece pronto para ele <strong>conferir, editar ou complementar</strong>.</div>
  </div>
  ${im.formEnviadoEm?`<div class="alert-success"><i class="fa-solid fa-check-circle"></i> Proprietário enviou o formulário em <strong>${fmtDate(im.formEnviadoEm)}</strong></div>`
    :(im.formPreenchidoEm?`<div class="alert-warn"><i class="fa-solid fa-pen"></i> Proprietário está preenchendo, mas ainda <strong>não enviou</strong> — última atividade em ${fmtDate(im.formPreenchidoEm)}.</div>`
    :'<div class="alert-info"><i class="fa-solid fa-info-circle"></i> Aguardando o proprietário confirmar/preencher.</div>')}
  <div class="hint" style="margin-top:4px;">Progresso do pré-preenchimento: <strong>${preenchidas}/${totalPerg}</strong> campos.</div>

  <div style="display:flex;gap:8px;margin-top:12px;">
    <button class="btn btn-sm btn-primary" onclick="salvarRascunhoForm()"><i class="fa-solid fa-save"></i> Salvar pré-preenchimento</button>
    ${im.formPreenchidoEm?`<button class="btn btn-outline btn-sm" onclick="importarRespostasParaRascunho()"><i class="fa-solid fa-download"></i> Trazer respostas do proprietário</button>`:''}
  </div>

  <div id="form-rascunho-secoes">${secoesHtml}</div>

  <div style="margin-top:16px;">
    <button class="btn btn-sm btn-primary" onclick="salvarRascunhoForm()"><i class="fa-solid fa-save"></i> Salvar pré-preenchimento</button>
  </div>
  </div>`;
}
// ═══════════════════ ANÁLISE DE MÍDIA COM GEMINI ═══════════════════
let _midiaFrames=[], _midiaArquivos=[];
function _midiaFileSelected(files){_midiaProcessarArquivos(Array.from(files));}
function _midiaDrop(e){e.preventDefault();document.querySelector('#midia-drop-area')?.style&&(document.querySelector('#midia-drop-area').style.borderColor='');_midiaProcessarArquivos(Array.from(e.dataTransfer.files));}
document.addEventListener('click',e=>{if(e.target.closest('#midia-drop-area'))document.getElementById('midia-file-input')?.click();});

async function _midiaProcessarArquivos(files){
  if(!files.length)return;
  _midiaArquivos=Array.from(files).filter(f=>f.type.startsWith('video/')||f.type.startsWith('image/'));
  _midiaFrames=[];
  const preview=document.getElementById('midia-preview');
  const btn=document.getElementById('btn-analisar-midia');
  const status=document.getElementById('midia-status');
  if(!_midiaArquivos.length){status.textContent='Formato não suportado.';return;}
  preview.style.display='block';
  btn.style.display='none';
  status.style.color='var(--text-muted)';

  const videos=_midiaArquivos.filter(f=>f.type.startsWith('video/'));
  const imgs=_midiaArquivos.filter(f=>f.type.startsWith('image/'));

  // Mostra lista de arquivos imediatamente
  preview.innerHTML=`<div style="display:flex;flex-direction:column;gap:4px;">
    ${videos.map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:8px;">
      <i class="fa-solid fa-video" style="color:var(--brand-gold)"></i>
      <span style="font-size:13px;flex:1;">${f.name}</span>
      <span style="font-size:11px;color:var(--text-muted);">${(f.size/1024/1024).toFixed(1)} MB</span>
    </div>`).join('')}
    ${imgs.map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:8px;">
      <i class="fa-solid fa-image" style="color:var(--sky)"></i>
      <span style="font-size:13px;flex:1;">${f.name}</span>
      <span style="font-size:11px;color:var(--text-muted);">${(f.size/1024/1024).toFixed(1)} MB</span>
    </div>`).join('')}
  </div><div id="midia-progress" style="font-size:12px;color:var(--text-muted);margin-top:8px;">Extraindo frames…</div>`;

  // Extrai frames dos vídeos — 1 frame a cada 8s, max 10 frames por vídeo
  for(const file of videos){
    document.getElementById('midia-progress').textContent=`Extraindo frames: ${file.name}…`;
    const frames=await _extrairFrames(file,8,10);
    _midiaFrames.push(...frames);
  }
  // Fotos direto como base64
  for(const file of imgs){
    const b64=await _fileToBase64(file);
    _midiaFrames.push(b64);
  }
  // Máximo 15 frames no total para caber no free tier
  if(_midiaFrames.length>15)_midiaFrames=_midiaFrames.slice(0,15);

  const prog=document.getElementById('midia-progress');
  if(prog)prog.textContent=`${_midiaFrames.length} frames extraídos de ${videos.length} vídeo(s). Pronto para análise.`;
  btn.style.display='inline-flex';
  status.textContent='';
}

async function _extrairFrames(file, intervaloSeg, maxFrames){
  return new Promise(resolve=>{
    const video=document.createElement('video');
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    const frames=[];
    video.muted=true; video.preload='auto';
    video.onloadedmetadata=()=>{
      const w=Math.min(video.videoWidth,960);
      canvas.width=w; canvas.height=Math.round(w*(video.videoHeight/video.videoWidth));
      const times=[];
      for(let t=1;t<video.duration&&times.length<maxFrames;t+=intervaloSeg)times.push(t);
      if(!times.length)times.push(0);
      let i=0;
      const next=()=>{if(i>=times.length){URL.revokeObjectURL(video.src);resolve(frames);return;}video.currentTime=times[i++];};
      video.onseeked=()=>{ctx.drawImage(video,0,0,canvas.width,canvas.height);frames.push(canvas.toDataURL('image/jpeg',0.6).split(',')[1]);next();};
      video.onerror=()=>resolve(frames);
      next();
    };
    video.onerror=()=>resolve(frames);
    video.src=URL.createObjectURL(file);
  });
}

function _fileToBase64(file){
  return new Promise(resolve=>{const r=new FileReader();r.onload=e=>resolve(e.target.result.split(',')[1]);r.readAsDataURL(file);});
}

async function analisarMidiaComIA(){
  if(!_midiaFrames.length)return;
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const status=document.getElementById('midia-status');
  const btn=document.getElementById('btn-analisar-midia');
  btn.disabled=true;
  status.style.color='var(--text-muted)';
  status.textContent='Enviando para o Gemini…';
  try{
    const r=await fetch(`${WC_SYNC.url}/analisar-midia?token=${WC_SYNC.token}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({frames:_midiaFrames})
    });
    const j=await r.json();
    if(!j.ok){status.style.color='var(--rose)';status.textContent='Erro: '+(j.error||'desconhecido');btn.disabled=false;return;}
    status.textContent='Salvando dados…';
    const r2=await fetch(`${WC_SYNC.url}/jarvis-notify?token=${WC_SYNC.token}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:im.id,dados:j.dados})
    });
    const j2=await r2.json();
    if(j2.ok){
      status.style.color='var(--green)';
      status.textContent='✓ Formulário preenchido automaticamente!';
      await kvPull(false);
      renderAba('formulario');
      showToast('IA preencheu o formulário!','sage');
    } else {
      status.style.color='var(--rose)';
      status.textContent='Erro ao salvar: '+(j2.error||'desconhecido');
    }
  }catch(e){status.style.color='var(--rose)';status.textContent='Erro: '+e.message;}
  btn.disabled=false;
}

async function importarDeJarvis(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const raw=document.getElementById('jarvis-json-input')?.value?.trim();
  const status=document.getElementById('jarvis-import-status');
  if(!raw){if(status)status.textContent='Cole o JSON primeiro.';return;}
  let payload;
  try{ payload=JSON.parse(raw); }catch(e){if(status)status.textContent='JSON inválido: '+e.message;return;}
  // Aceita tanto o JSON completo quanto só o objeto "dados"
  if(!payload.dados&&(payload.wifi_rede||payload.acesso||payload.zelador_nome||payload.quartos)){
    payload={dados:payload};
  }
  payload.id=im.id;
  if(status)status.textContent='Enviando…';
  try{
    const r=await fetch(`${WC_SYNC.url}/jarvis-notify?token=${WC_SYNC.token}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    const j=await r.json();
    if(j.ok){
      if(status)status.style.color='var(--green)';
      if(status)status.textContent='✓ Importado! Sincronizando…';
      await kvPull(false);
      renderAba('formulario');
      showToast('Dados do Jarvis importados!','sage');
    } else {
      if(status)status.style.color='var(--rose)';
      if(status)status.textContent='Erro: '+(j.error||'desconhecido');
    }
  }catch(e){
    if(status)status.style.color='var(--rose)';
    if(status)status.textContent='Falha na conexão: '+e.message;
  }
}
function _limparRespostaOwner(qid){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(im.formRespostas) delete im.formRespostas[qid];
  saveAll();
  renderAba('formulario');
}
function _toggleRascunhoPill(btn){
  const grid=btn.parentElement;
  const hidden=grid.nextElementSibling;
  const op=btn.dataset.op, tipo=btn.dataset.tipo;
  if(tipo==='radio'){
    grid.querySelectorAll('.rascunho-pill').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    hidden.value=op;
  } else {
    btn.classList.toggle('selected');
    const cur=hidden.value?hidden.value.split(',').map(x=>x.trim()).filter(Boolean):[];
    const i=cur.indexOf(op);
    if(btn.classList.contains('selected')){ if(i===-1)cur.push(op); }
    else if(i>-1){ cur.splice(i,1); }
    hidden.value=cur.join(', ');
  }
}
function _coletarRascunho(){
  const r={};
  document.querySelectorAll('.form-rascunho').forEach(el=>{
    const v=el.value.trim();
    if(v)r[el.dataset.qid]=v;
  });
  return r;
}
function salvarRascunhoForm(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.formRascunho=_coletarRascunho();
  saveAll();showToast('Pré-preenchimento salvo!','sage');
}
function importarRespostasParaRascunho(){
  const im=getImovel(_imovelAtivoId);if(!im||!im.formRespostas)return;
  im.formRascunho={...(im.formRespostas||{}),...(im.formRascunho||{})};
  saveAll();renderAba('formulario');showToast('Respostas do proprietário importadas.','sage');
}

// ═══════════════════ ABA COMPRAS ═══════════════════
function renderAbaCompras(im){
  const camas=im.camas||[];const banheiros=(im.banheirosCompletos||0)+(im.banheirosLavabo||0)||(im.banheiros||1);const banheirosCompletos=im.banheirosCompletos||(im.banheiros||1);const quartos=im.quartos||1;const hospedes=im.maxHospedes||0;const lavabos=im.banheirosLavabo||0;const andares=im.andares||1;
  const compras=im.compras||{};
  const cats=[...new Set(ITENS_COMPRAS.map(i=>i.cat))];
  let totalEstimado=0;
  const manutencoes=im.manutencoes||[];
  let totalManutencao=manutencoes.filter(m=>m.status!=='resolvido').reduce((s,m)=>s+(m.valor??m.custo??0),0);

  // Gerar linhas — itens de enxoval expandidos por tamanho de cama
  const modalidadeAtual=modalidadeEnxovalAtual(im);
  const rows=[];
  ITENS_COMPRAS.forEach((item,idx)=>{
    if(!itemValidoParaModalidade(item,modalidadeAtual))return;
    if(item.tipoPreco==='enxoval'&&camas.length){
      // agrupar camas por tipo enxoval
      const porTipo={};
      camas.forEach(c=>{
        const t=CAMA_TIPO_ENXOVAL[c.tipo]||'Solteiro';
        porTipo[t]=(porTipo[t]||[]);
        porTipo[t].push(c);
      });
      Object.entries(porTipo).forEach(([tipoEnx,camasTipo])=>{
        const camasParaItem=item.semSofaCama?camasTipo.filter(c=>!c.tipo.startsWith('Sofá-cama')):camasTipo;
        if(item.semSofaCama&&!camasParaItem.length)return; // grupo só tem sofá-cama, item não se aplica
        const [n,base]=(item.qtdRule||'1-colchao').split('-');
        const q=parseInt(n)||1;
        let qtdNec=0;
        // beliche conta como 2 colchões/leitos
        if(base==='colchao')qtdNec=q*camasParaItem.reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);
        else if(base==='leito')qtdNec=q*camasParaItem.reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);
        else qtdNec=q;
        const subKey=`${idx}_${tipoEnx}`;
        const precoUn=compras[subKey]?.precoOverride!==undefined?compras[subKey].precoOverride:(PRECOS_ENXOVAL[item.nome]||{})[tipoEnx]||0;
        const qtdTem=compras[subKey]?.qtdTem??compras[subKey]?.qtdReal??0;
        const falta=Math.max(0,qtdNec-qtdTem);
        const total=precoUn*falta;
        totalEstimado+=total;
        const comprado=compras[subKey]?.comprado||false;
        rows.push({subKey,item,label:`${item.nome} (${tipoEnx})`,qtdNec,qtdTem,falta,precoUn,total,comprado});
      });
    } else {
      const qtdNec=calcNecessario(item,camas,banheiros,quartos,banheirosCompletos,hospedes,lavabos,andares);
      const subKey=String(idx);
      const precoUn=compras[subKey]?.precoOverride!==undefined?compras[subKey].precoOverride:(item.tipoPreco==='fixo'?item.preco||0:getPrecoEnxovalUn(item.nome,camas));
      const qtdTem=compras[subKey]?.qtdTem??compras[subKey]?.qtdReal??0;
      const falta=Math.max(0,qtdNec-qtdTem);
      const total=precoUn*falta;
      totalEstimado+=total;
      const comprado=compras[subKey]?.comprado||false;
      rows.push({subKey,item,label:item.nome,qtdNec,qtdTem,falta,precoUn,total,comprado});
    }
  });

  const tabelasCat=cats.map(cat=>{
    const itensC=rows.filter(r=>r.item.cat===cat);
    if(!itensC.length)return'';
    return`<div style="margin-bottom:20px;">
      <div class="form-section-title"><i class="fa-solid fa-tag"></i> ${cat}</div>
      <table class="compras-table" style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr style="background:var(--surface-2)"><th style="padding:6px 8px;">✓</th><th>Item</th><th style="text-align:center;">Nec.</th><th style="text-align:center;">Já tem</th><th style="text-align:center;">Falta</th><th style="text-align:right;padding:0 8px;">R$/Un</th><th style="text-align:right;padding:0 8px;">Total</th><th>Link</th></tr></thead>
        <tbody>
        ${itensC.map(({subKey,item,label,qtdNec,qtdTem,falta,precoUn,total,comprado})=>`<tr style="${comprado?'opacity:.55;text-decoration:line-through;':''}border-bottom:1px solid var(--border);">
          <td style="padding:4px 8px;"><input type="checkbox" class="compra-check" ${comprado?'checked':''} data-idx="${subKey}" onchange="_onCompraCheck(this,'${subKey}')"></td>
          <td style="padding:4px 8px;">${esc(label)}</td>
          <td style="text-align:center;color:var(--text-muted);">${qtdNec}</td>
          <td style="text-align:center;"><input class="input compra-qtd-input" style="width:56px;padding:3px 6px;" type="number" min="0" value="${qtdTem}" data-idx="${subKey}" onchange="_onCompraQtd(this,'${subKey}')"></td>
          <td style="text-align:center;font-weight:600;color:${falta>0?'var(--rose)':'var(--green)'};">${falta}</td>
          <td style="text-align:right;padding:0 4px;"><input class="input compra-preco-input" data-subkey="${subKey}" style="width:72px;padding:3px 5px;text-align:right;" type="number" min="0" step="1" value="${precoUn}" oninput="_onCompraPrecoinput(this,'${subKey}')" onblur="_onCompraPreco(this,'${subKey}')"></td>
          <td id="cp-total-${subKey}" style="text-align:right;padding:0 8px;font-weight:600;">${fmtMoeda(total)}</td>
          <td style="padding:0 8px;">${item.link?`<a href="${esc(item.link)}" target="_blank" class="btn btn-xs btn-outline">🛒</a>`:'-'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('');

  const msgWA=_gerarMsgWhatsAppEnxoval(im,rows);

  const itensExtras=im.itensExtras||[];
  let totalExtras=itensExtras.reduce((s,x)=>s+(+x.precoUn||0)*(+x.qtd||1),0);

  const extrasHtml=`<div style="margin-top:28px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div class="form-section-title" style="margin-bottom:0;"><i class="fa-solid fa-circle-plus"></i> Itens Extras (solicitados pelo proprietário)</div>
      <button class="btn btn-sm btn-outline" onclick="toggleFormExtra()"><i class="fa-solid fa-plus"></i> Adicionar</button>
    </div>
    <div id="form-add-extra" style="display:none;background:var(--surface-2,#f5f0fa);border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:2;min-width:160px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Item</label><input id="extra-nome-input" class="input" placeholder="Ex: Espelho para quarto"></div>
        <div style="width:64px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Qtd</label><input id="extra-qtd-input" class="input" type="number" min="1" value="1" style="width:100%;"></div>
        <div style="width:110px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Preço unit. (R$)</label><input id="extra-preco-input" class="input" type="number" min="0" step="10" value="0" style="width:100%;"></div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-sage" onclick="confirmarItemExtra()"><i class="fa-solid fa-check"></i> Salvar</button>
          <button class="btn btn-sm btn-outline" onclick="toggleFormExtra()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    </div>
    ${!itensExtras.length?`<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">Nenhum item extra registrado.</div>`:`
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
      <thead><tr style="background:var(--surface-2)">
        <th style="padding:6px 8px;">Item</th>
        <th style="text-align:center;padding:6px 8px;">Qtd</th>
        <th style="text-align:right;padding:6px 8px;">R$/Un</th>
        <th style="text-align:right;padding:6px 8px;">Total</th>
        <th style="padding:6px 4px;width:32px;"></th>
      </tr></thead>
      <tbody>
      ${itensExtras.map((x,xi)=>`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:4px 8px;"><input class="input" style="width:100%;min-width:110px;padding:3px 6px;" value="${esc(x.nome||'')}" oninput="_onExtraNome(this,${xi})" onblur="_onExtraNomeBlur(this,${xi})"></td>
        <td style="text-align:center;padding:4px 8px;"><input class="input" style="width:56px;padding:3px 6px;text-align:center;" type="number" min="1" value="${+x.qtd||1}" oninput="_onExtraQtdInput(this,${xi})" onblur="_onExtraQtd(this,${xi})"></td>
        <td style="text-align:right;padding:4px 8px;"><input class="input" style="width:80px;padding:3px 6px;text-align:right;" type="number" min="0" step="10" value="${+x.precoUn||0}" oninput="_onExtraPrecoInput(this,${xi})" onblur="_onExtraPreco(this,${xi})"></td>
        <td style="text-align:right;padding:4px 8px;font-weight:600;" id="ext-total-${xi}">${fmtMoeda((+x.precoUn||0)*(+x.qtd||1))}</td>
        <td style="padding:4px 4px;"><button class="btn btn-xs btn-danger" onclick="_apagarItemExtra(${xi})"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')}
      </tbody>
    </table>`}
  </div>`;

  const frete=im.freteTotal||0;
  const totalServicosOpcionais=_totalServicosOpcionaisCompras(im);
  const servicosOpcionaisSel=im.servicosOpcionaisCompras||{};
  const servicosOpcionaisHtml=`<div style="margin-top:20px;">
    <div class="form-section-title"><i class="fa-solid fa-truck-ramp-box"></i> Serviços Opcionais</div>
    ${SERVICOS_OPCIONAIS_COMPRAS.map(so=>`<label class="checkbox-label" style="display:flex;align-items:center;gap:8px;padding:4px 0;">
      <input type="checkbox" ${servicosOpcionaisSel[so.id]?'checked':''} onchange="_onServicoOpcionalCompra(this,'${so.id}')"> ${esc(so.nome)} — ${fmtMoeda(so.valor)}
    </label>`).join('')}
  </div>`;
  const totalGeral=totalEstimado+totalExtras+frete+totalManutencao+totalServicosOpcionais;
  const margem=im.margemWecare||15;
  const descTipo=im.descontoTipo||'reais';
  const descVal=im.descontoValor||0;
  const totalComMargem=totalGeral*(1+margem/100);
  const descValor=descTipo==='reais'?descVal:totalComMargem*(descVal/100);
  const totalProp=totalComMargem-descValor;

  const manutHtml=`<div style="margin-top:28px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div class="form-section-title" style="margin-bottom:0;"><i class="fa-solid fa-wrench"></i> Manutenções / Reparos</div>
      <button class="btn btn-sm btn-outline" onclick="toggleFormManut()"><i class="fa-solid fa-plus"></i> Adicionar</button>
    </div>
    <div id="form-add-manut" style="display:none;background:var(--surface-2,#f5f0fa);border-radius:10px;padding:12px;margin-bottom:10px;display:none;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:160px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Nome da manutenção</label><input id="manut-nome-input" class="input" placeholder="Ex: Trocar torneira" style="width:100%;"></div>
        <div style="width:100px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Valor (R$)</label><input id="manut-valor-input" class="input" type="number" min="0" step="10" value="0" style="width:100%;"></div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-sage" onclick="confirmarManutencao()"><i class="fa-solid fa-check"></i> Salvar</button>
          <button class="btn btn-sm btn-outline" onclick="toggleFormManut()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    </div>
    ${!manutencoes.length?`<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">Nenhuma manutenção registrada. As irregularidades da vistoria aparecem aqui.</div>`:`
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
      <thead><tr style="background:var(--surface-2)">
        <th style="padding:6px 8px;width:32px;">✓</th>
        <th style="padding:6px 8px;">Descrição</th>
        <th style="text-align:right;padding:6px 8px;">Valor (R$)</th>
        <th style="padding:6px 4px;width:32px;"></th>
      </tr></thead>
      <tbody>
      ${manutencoes.map(m=>`<tr style="${m.status==='resolvido'?'opacity:.45;text-decoration:line-through;':''}border-bottom:1px solid var(--border);">
        <td style="padding:4px 8px;"><input type="checkbox" class="manut-check" ${m.status==='resolvido'?'checked':''} onchange="_onManutCheck(this,'${esc(m.id)}')"></td>
        <td style="padding:4px 8px;">${esc(m.nome||(m.comodo?m.comodo+(m.descricao?': '+m.descricao:''):m.descricao||''))}</td>
        <td style="padding:4px 8px;text-align:right;"><input class="input" style="width:80px;padding:3px 6px;text-align:right;" type="number" min="0" step="10" value="${m.valor??m.custo??0}" onchange="_onManutCusto(this,'${esc(m.id)}')"></td>
        <td style="padding:4px 4px;"><button class="btn btn-xs btn-danger" onclick="_apagarManutencao('${esc(m.id)}')"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')}
      </tbody>
    </table>`}
  </div>`;

  return`<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
    <div class="form-section-title" style="margin-bottom:0;"><i class="fa-solid fa-cart-shopping"></i> Compras &amp; Manutenção</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span class="tag tag-gold" style="font-size:13px;padding:6px 14px;">Total geral: <strong>${fmtMoeda(totalGeral)}</strong></span>
      <button class="btn btn-outline btn-sm" onclick="gerarPDFCompras()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
    </div>
  </div>
  ${tabelasCat}
  ${extrasHtml}
  ${servicosOpcionaisHtml}
  ${manutHtml}
  <div style="display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px;background:var(--surface-2,#f8f4f9);border-radius:10px;flex-wrap:wrap;">
    <span style="font-size:13px;font-weight:600;"><i class="fa-solid fa-truck"></i> Frete total (R$)</span>
    ${numInput({id:'compras-frete',value:frete,min:0,step:10,onchange:'_onFreteChange(this)'})}
    <span class="text-muted" style="font-size:12px;">Compras: ${fmtMoeda(totalEstimado)} + Extras: ${fmtMoeda(totalExtras)} + Serviços opcionais: ${fmtMoeda(totalServicosOpcionais)} + Frete: ${fmtMoeda(frete)} + Manutenção: ${fmtMoeda(totalManutencao)} = <strong>${fmtMoeda(totalGeral)}</strong></span>
  </div>

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-tag"></i> Desconto</div>
  <div class="form-row">
    <div class="form-group"><label>Tipo</label>
      <select id="cp-desc-tipo" class="input" onchange="_onDescontoChange()">
        <option value="reais"${descTipo==='reais'?' selected':''}>R$ (reais)</option>
        <option value="percent"${descTipo==='percent'?' selected':''}>% (porcentagem)</option>
      </select>
    </div>
    <div class="form-group"><label>Valor</label><input id="cp-desc-val" type="number" class="input" value="${descVal}" min="0" step="10" oninput="_onDescontoChange()"></div>
  </div>
  <div style="background:var(--surface-2);border-radius:10px;padding:14px;margin-bottom:16px;">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">Total Compras+Frete+Manut.: ${fmtMoeda(totalGeral)} + Margem ${margem}% = ${fmtMoeda(totalComMargem)}</div>
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;">
      <span>Total ao Proprietário</span><span id="cp-total-prop" style="color:var(--rose);">${fmtMoeda(totalProp)}</span>
    </div>
  </div>

  <div class="form-section-title" style="margin-top:24px;"><i class="fa-brands fa-whatsapp"></i> Mensagem WhatsApp — Enxoval Buddemeyer</div>
  <textarea id="wamsg-enxoval" class="input" rows="9" style="font-size:11.5px;font-family:monospace;" readonly onclick="this.select()">${esc(msgWA)}</textarea>
  <button class="btn btn-sm" style="margin-top:8px;" onclick="navigator.clipboard.writeText(document.getElementById('wamsg-enxoval').value).then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i> Copiar mensagem</button>
  </div>`;
}
function _onManutCheck(cb,manId){
  const im=getImovel(_imovelAtivoId);if(!im||!im.manutencoes)return;
  const m=im.manutencoes.find(x=>x.id===manId);
  if(m){m.status=cb.checked?'resolvido':'pendente';saveAll();renderKanban();}
}
function _onManutCusto(inp,manId){
  const im=getImovel(_imovelAtivoId);if(!im||!im.manutencoes)return;
  const m=im.manutencoes.find(x=>x.id===manId);
  if(m){m.valor=+inp.value||0;saveAll();}
}
function _onCompraPrecoinput(inp,subKey){
  // salva imediatamente enquanto digita (para PDF capturar valor atual)
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[subKey])im.compras[subKey]={};
  const preco=+inp.value||0;
  im.compras[subKey].precoOverride=preco;
  // atualiza total da linha inline
  const row=inp.closest('tr');
  if(row){
    const falta=parseInt(row.cells[4]?.textContent)||0;
    const totalEl=document.getElementById('cp-total-'+subKey);
    if(totalEl)totalEl.textContent=fmtMoeda(preco*falta);
  }
}
function _onCompraPreco(inp,subKey){
  // ao sair do campo: persiste e re-renderiza para atualizar totais gerais
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[subKey])im.compras[subKey]={};
  im.compras[subKey].precoOverride=+inp.value||0;
  saveAll();
  renderAba('compras');
}
function _onDescontoChange(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const tipo=document.getElementById('cp-desc-tipo')?.value||'reais';
  const val=+document.getElementById('cp-desc-val')?.value||0;
  im.descontoTipo=tipo;im.descontoValor=val;saveAll();
  renderAba('compras');
}
function toggleFormExtra(){
  const el=document.getElementById('form-add-extra');
  if(!el)return;
  const visible=el.style.display!=='none';
  el.style.display=visible?'none':'block';
  if(!visible){
    const ni=document.getElementById('extra-nome-input');
    if(ni){ni.value='';ni.focus();}
    document.getElementById('extra-qtd-input').value='1';
    document.getElementById('extra-preco-input').value='0';
  }
}
function confirmarItemExtra(){
  const nome=(document.getElementById('extra-nome-input')||{}).value||'';
  if(!nome.trim()){showToast('Informe o nome do item.','peach');return;}
  const qtd=+(document.getElementById('extra-qtd-input')||{}).value||1;
  const precoUn=+(document.getElementById('extra-preco-input')||{}).value||0;
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.itensExtras)im.itensExtras=[];
  im.itensExtras.push({id:uid(),nome:nome.trim(),qtd,precoUn});
  saveAll();renderAba('compras');showToast('Item extra adicionado!','sage');
}
function _apagarItemExtra(xi){
  const im=getImovel(_imovelAtivoId);if(!im||!im.itensExtras)return;
  im.itensExtras.splice(xi,1);saveAll();renderAba('compras');
}
function _onExtraNome(inp,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  im.itensExtras[xi].nome=inp.value;
}
function _onExtraNomeBlur(inp,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  im.itensExtras[xi].nome=inp.value;saveAll();
}
function _onExtraQtdInput(inp,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  const qtd=+inp.value||1;
  im.itensExtras[xi].qtd=qtd;
  const el=document.getElementById('ext-total-'+xi);
  if(el)el.textContent=fmtMoeda(qtd*(im.itensExtras[xi].precoUn||0));
}
function _onExtraQtd(inp,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  im.itensExtras[xi].qtd=+inp.value||1;saveAll();
}
function _onExtraPrecoInput(inp,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  const preco=+inp.value||0;
  im.itensExtras[xi].precoUn=preco;
  const el=document.getElementById('ext-total-'+xi);
  if(el)el.textContent=fmtMoeda(preco*(im.itensExtras[xi].qtd||1));
}
function _onExtraPreco(inp,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  im.itensExtras[xi].precoUn=+inp.value||0;saveAll();
}
function _onExtraPagadoria(sel,xi){
  const im=getImovel(_imovelAtivoId);if(!im||im.itensExtras?.[xi]==null)return;
  im.itensExtras[xi].pagadoria=sel.value;saveAll();
}
function toggleFormManut(){
  const el=document.getElementById('form-add-manut');
  if(!el)return;
  const visible=el.style.display!=='none';
  el.style.display=visible?'none':'block';
  if(!visible){
    const ni=document.getElementById('manut-nome-input');
    const vi=document.getElementById('manut-valor-input');
    if(ni){ni.value='';ni.focus();}
    if(vi)vi.value='0';
  }
}
function confirmarManutencao(){
  const nome=(document.getElementById('manut-nome-input')||{}).value||'';
  const valor=+(document.getElementById('manut-valor-input')||{}).value||0;
  if(!nome.trim()){showToast('Informe o nome da manutenção.','peach');return;}
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.manutencoes)im.manutencoes=[];
  const novaManut={id:uid(),nome:nome.trim(),valor,status:'pendente'};
  im.manutencoes.push(novaManut);
  saveAll();renderAba('compras');showToast('Manutenção adicionada!','sage');
  // Cria card no módulo de manutenção da Claire
  fetch('https://claire-dados.nicole-0e7.workers.dev/api/manutencoes?token=wecare-claire-2026-k7x9q2',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({imovelNome:im.nome||'Onboarding',nome:novaManut.nome,valor:novaManut.valor,dataSolicitacao:new Date().toISOString().split('T')[0]})
  }).catch(()=>{});
}
function adicionarManutencao(){toggleFormManut();}
function _apagarManutencao(manId){
  const im=getImovel(_imovelAtivoId);if(!im||!im.manutencoes)return;
  if(!confirm('Apagar esta manutenção?'))return;
  im.manutencoes=im.manutencoes.filter(m=>m.id!==manId);
  saveAll();renderAba('compras');renderKanban();showToast('Removida.','peach');
}
function adicionarEventoExtra(){
  const titulo=(document.getElementById('evx-novo-titulo')?.value||'').trim();
  if(!titulo){showToast('Informe o título do evento.','peach');return;}
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.eventosExtras)im.eventosExtras=[];
  im.eventosExtras.push({
    id:uid(),titulo,
    data:document.getElementById('evx-novo-data')?.value||'',
    hora:document.getElementById('evx-novo-hora')?.value||'',
    responsavel:(document.getElementById('evx-novo-resp')?.value||'').trim(),
    custo:+document.getElementById('evx-novo-custo')?.value||0,
    gastoSetup:document.getElementById('evx-novo-setup')?.checked||false,
  });
  saveAll();renderAba('operacional');showToast('Evento adicionado!','sage');
}
function _onEventoExtraChange(id,campo,valor){
  const im=getImovel(_imovelAtivoId);if(!im||!im.eventosExtras)return;
  const ev=im.eventosExtras.find(e=>e.id===id);if(!ev)return;
  ev[campo]=campo==='custo'?(+valor||0):valor;
  saveAll();
}
function _onEventoExtraGastoSetup(cb,id){
  const im=getImovel(_imovelAtivoId);if(!im||!im.eventosExtras)return;
  const ev=im.eventosExtras.find(e=>e.id===id);if(!ev)return;
  ev.gastoSetup=cb.checked;
  saveAll();
}
function apagarEventoExtra(id){
  const im=getImovel(_imovelAtivoId);if(!im||!im.eventosExtras)return;
  if(!confirm('Apagar este evento?'))return;
  im.eventosExtras=im.eventosExtras.filter(e=>e.id!==id);
  saveAll();renderAba('operacional');showToast('Removido.','peach');
}
function _onFreteChange(inp){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.freteTotal=+inp.value||0;
  saveAll();
}
function _onCompraCheck(cb,key){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[key])im.compras[key]={};
  im.compras[key].comprado=cb.checked;
  saveAll();
}
function _onCompraQtd(inp,key){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[key])im.compras[key]={};
  im.compras[key].qtdTem=+inp.value||0;
  // Atualiza a célula "Falta" na mesma linha sem re-render completo
  const tr=inp.closest('tr');
  if(tr){
    const qtdNec=+tr.querySelector('td:nth-child(3)').textContent||0;
    const falta=Math.max(0,qtdNec-(+inp.value||0));
    const faltaTd=tr.querySelector('td:nth-child(5)');
    if(faltaTd){faltaTd.textContent=falta;faltaTd.style.color=falta>0?'var(--rose)':'var(--green)';}
    const precoTd=tr.querySelector('td:nth-child(6)');
    const totalTd=tr.querySelector('td:nth-child(7)');
    if(precoTd&&totalTd){
      const precoUn=parseFloat((precoTd.textContent||'').replace(/[^0-9,]/g,'').replace(',','.'))||0;
      totalTd.textContent=fmtMoeda(precoUn*falta);
    }
  }
  saveAll();
}
function _gerarMsgWhatsAppEnxoval(im,rows){
  const linhas=rows.filter(r=>r.item.enxovalDep&&r.qtdReal>0&&r.item.tipoPreco==='enxoval');
  if(!linhas.length)return'(Sem itens de enxoval para este imóvel — adicione camas na aba Dados)';
  const tipo=_tipoEnxovalPrincipal(im.camas);
  let msg=`Olá! Sou da WeCare Hosting.\nGostaria de fazer um pedido de enxoval para o imóvel *"${im.nome||''}"*:\n\n`;
  linhas.forEach(({item,qtdReal,precoUn,total})=>{
    msg+=`• ${item.nome} (${tipo}) × ${qtdReal} — ${fmtMoeda(total)}\n`;
  });
  const totalEnxoval=linhas.reduce((s,r)=>s+r.total,0);
  msg+=`\n*Total: ${fmtMoeda(totalEnxoval)}*\n\nEndereço de entrega: ${im.endereco||'(informar)'}\nNome do proprietário: ${im.proprietarioNome||'(informar)'}`;
  return msg;
}
function _tipoEnxovalPrincipal(camas){
  const ordem=['King','Queen','Casal','Solteiro'];
  const tipos=(camas||[]).map(c=>CAMA_TIPO_ENXOVAL[c.tipo]||'Solteiro');
  return ordem.find(t=>tipos.includes(t))||'Solteiro';
}
function _rowsComprasFalta(im){
  const camas=im.camas||[];
  const banheiros=(im.banheirosCompletos||0)+(im.banheirosLavabo||0)||(im.banheiros||1);
  const banheirosCompletos=im.banheirosCompletos||(im.banheiros||1);
  const quartos=im.quartos||1;
  const hospedes=im.maxHospedes||0;const lavabos=im.banheirosLavabo||0;const andares=im.andares||1;
  const modalidadeAtual=modalidadeEnxovalAtual(im);
  const rows=[];
  ITENS_COMPRAS.forEach((item,idx)=>{
    if(!itemValidoParaModalidade(item,modalidadeAtual))return;
    if(item.tipoPreco==='enxoval'&&camas.length){
      const porTipo={};
      camas.forEach(c=>{const t=CAMA_TIPO_ENXOVAL[c.tipo]||'Solteiro';porTipo[t]=(porTipo[t]||[]);porTipo[t].push(c);});
      Object.entries(porTipo).forEach(([tipoEnx,camasTipo])=>{
        const[n,base]=(item.qtdRule||'1-colchao').split('-');const q=parseInt(n)||1;
        let qtdNec=0;
        const camasParaItem=item.semSofaCama?camasTipo.filter(c=>!c.tipo.startsWith('Sofá-cama')):camasTipo;
        if(base==='colchao')qtdNec=q*camasParaItem.reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);
        else if(base==='leito')qtdNec=q*camasParaItem.reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);
        else qtdNec=q;
        const subKey=`${idx}_${tipoEnx}`;
        const qtdTem=im.compras?.[subKey]?.qtdTem??im.compras?.[subKey]?.qtdReal??0;
        const falta=Math.max(0,qtdNec-qtdTem);
        if(falta>0){const pUn=im.compras?.[subKey]?.precoOverride!==undefined?im.compras[subKey].precoOverride:(PRECOS_ENXOVAL[item.nome]||{})[tipoEnx]||0;rows.push({label:`${item.nome} (${tipoEnx})`,cat:item.cat,qtdNec,qtdTem,falta,pUn,total:pUn*falta,link:item.link||''});}
      });
    } else {
      const qtdNec=calcNecessario(item,camas,banheiros,quartos,banheirosCompletos,hospedes,lavabos,andares);
      const subKey=String(idx);
      const pUn=im.compras?.[subKey]?.precoOverride!==undefined?im.compras[subKey].precoOverride:(item.tipoPreco==='fixo'?item.preco||0:getPrecoEnxovalUn(item.nome,camas));
      const qtdTem=im.compras?.[subKey]?.qtdTem??im.compras?.[subKey]?.qtdReal??0;
      const falta=Math.max(0,qtdNec-qtdTem);
      if(falta>0)rows.push({label:item.nome,cat:item.cat,qtdNec,qtdTem,falta,pUn,total:pUn*falta,link:item.link||''});
    }
  });
  return rows;
}
// ═══════════════════ LOGO NOS PDFs ═══════════════════
// Busca a logo real (fundo claro, pra cair bem no papel branco dos PDFs) e converte pra
// data URI — os PDFs abrem numa aba em branco via document.write, sem base URL confiável
// pra resolver um <img src="img/..."> relativo, então precisa ir embutida.
let _logoPdfCache=null;
async function _logoPdfDataUri(){
  if(_logoPdfCache)return _logoPdfCache;
  try{
    const resp=await fetch('img/logo-light-bg.png');
    const buf=await resp.arrayBuffer();
    // Não confia no Content-Type do servidor pro mime da data URI (alguns hosts servem
    // .png sem o header certo) — monta a data URI manualmente com o mime correto.
    let bin='';const bytes=new Uint8Array(buf);
    for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
    _logoPdfCache='data:image/png;base64,'+btoa(bin);
  }catch{_logoPdfCache='';}
  return _logoPdfCache;
}
async function gerarPDFCompras(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const rows=_rowsComprasFalta(im);
  const frete=im.freteTotal||0;
  const totalItens=rows.reduce((s,r)=>s+r.total,0);
  const manutencoes=(im.manutencoes||[]).filter(m=>m.status!=='resolvido');
  const totalManut=manutencoes.reduce((s,m)=>s+(m.valor??m.custo??0),0);
  const itensExtras=im.itensExtras||[];
  const totalExtras=itensExtras.reduce((s,x)=>s+(+x.precoUn||0)*(+x.qtd||1),0);
  const servicosOpcionaisSelCompras=im.servicosOpcionaisCompras||{};
  const servicosOpcionaisAtivosCompras=SERVICOS_OPCIONAIS_COMPRAS.filter(so=>servicosOpcionaisSelCompras[so.id]);
  const totalServicosOpcionaisCompras=servicosOpcionaisAtivosCompras.reduce((s,so)=>s+so.valor,0);
  const cats=[...new Set(rows.map(r=>r.cat))];
  const tabelas=cats.map(cat=>{
    const itens=rows.filter(r=>r.cat===cat);
    return`<tr style="background:#FAF3E4"><td colspan="4" style="padding:8px 10px;font-weight:700;font-size:12px;color:#132030;letter-spacing:.5px;">${cat.toUpperCase()}</td></tr>`+
    itens.map(r=>`<tr>
      <td style="padding:7px 10px;">${esc(r.label)}</td>
      <td style="text-align:center;">${r.falta}</td>
      <td style="text-align:right;color:#888;">${fmtMoeda(r.pUn)}</td>
      <td style="text-align:right;font-weight:600;">${fmtMoeda(r.total)}</td>
    </tr>`).join('');
  }).join('');
  const manutHtml=manutencoes.length?`
  <div style="margin-top:28px;">
    <div style="font-size:13px;font-weight:700;color:#132030;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #C49A5E;">Manutenções / Reparos</div>
    <table>
      <thead><tr><th>Descrição</th><th style="text-align:right;">Valor estimado</th></tr></thead>
      <tbody>`+
      manutencoes.map(m=>`<tr><td style="padding:7px 10px;">${esc(m.nome||(m.comodo?m.comodo+(m.descricao?': '+m.descricao:''):m.descricao||''))}</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(m.valor??m.custo??0)}</td></tr>`).join('')+
      `<tr class="total-row"><td style="padding:10px;text-align:right;">Subtotal manutenções</td><td style="text-align:right;padding:10px;">${fmtMoeda(totalManut)}</td></tr>
      </tbody>
    </table>
  </div>`:'';
  const banhTotal=(im.banheirosCompletos||0)+(im.banheirosLavabo||0)||(im.banheiros||1);
  const win=window.open('','_blank');
  const logoUri=await _logoPdfDataUri();
  win.document.write(`<html><head><meta charset="utf-8"><title>Orçamento — ${esc(im.nome)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#333;padding:32px 40px;max-width:800px;margin:0 auto;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #C49A5E;}
    .brand{display:flex;align-items:center;}
    .brand img{height:64px;width:auto;}
    .meta{font-size:12px;color:#888;text-align:right;line-height:1.6;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12.5px;}
    th{background:#132030;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
    tr:nth-child(even){background:#fafafa;}
    td{padding:6px 10px;border-bottom:1px solid #EFE7D6;vertical-align:middle;}
    .total-row{background:#FAF3E4!important;font-weight:700;}
    .summary{background:#132030;color:#fff;border-radius:12px;padding:16px 20px;margin-top:8px;}
    .summary-line{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;}
    .summary-total{display:flex;justify-content:space-between;font-size:18px;font-weight:800;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.2);}
    .summary-total span:last-child{color:#C49A5E;}
    @media print{body{padding:16px;}@page{margin:1cm;}}
  </style></head><body>
  <div class="header">
    <div class="brand">
      ${logoUri?`<img src="${logoUri}" alt="WeCare Hosting">`:'<div style="font-size:22px;font-weight:800;color:#132030;">WeCare Hosting</div>'}
    </div>
    <div class="meta">
      <div><strong>${esc(im.nome)}</strong></div>
      <div>${esc(im.endereco||'')}</div>
      <div>${im.quartos||1} quartos · ${banhTotal} banheiros</div>
      <div>${fmtDate(hoje())}</div>
    </div>
  </div>
  <div style="font-size:11px;color:#888;margin:-16px 0 20px;">Orçamento de Setup — Onboarding</div>
  ${rows.length===0&&!manutencoes.length?'<p style="color:#888;text-align:center;padding:40px;">Nenhum item para comprar e nenhuma manutenção pendente.</p>':`
  ${rows.length?`<table>
    <thead><tr><th>Item</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Preço unit.</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${tabelas}
    <tr class="total-row"><td colspan="3" style="padding:10px;text-align:right;">Subtotal compras</td><td style="text-align:right;padding:10px;">${fmtMoeda(totalItens)}</td></tr>
    </tbody>
  </table>`:''}
  ${itensExtras.length?`<div style="margin-top:28px;">
    <div style="font-size:13px;font-weight:700;color:#132030;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #C49A5E;">Itens Extras (solicitados pelo proprietário)</div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">R$/Un</th><th style="text-align:right;">Total</th></tr></thead>
      <tbody>`+
      itensExtras.map(x=>`<tr><td style="padding:7px 10px;">${esc(x.nome||'')}</td><td style="text-align:center;padding:7px 10px;">${+x.qtd||1}</td><td style="text-align:right;padding:7px 10px;color:#888;">${fmtMoeda(+x.precoUn||0)}</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda((+x.precoUn||0)*(+x.qtd||1))}</td></tr>`).join('')+
      `<tr class="total-row"><td colspan="3" style="padding:10px;text-align:right;">Subtotal extras</td><td style="text-align:right;padding:10px;">${fmtMoeda(totalExtras)}</td></tr>
      </tbody>
    </table>
  </div>`:''}
  ${servicosOpcionaisAtivosCompras.length?`<div style="margin-top:28px;">
    <div style="font-size:13px;font-weight:700;color:#132030;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #C49A5E;">Serviços Opcionais</div>
    <table>
      <thead><tr><th>Serviço</th><th style="text-align:right;">Valor</th></tr></thead>
      <tbody>`+
      servicosOpcionaisAtivosCompras.map(so=>`<tr><td style="padding:7px 10px;">${esc(so.nome)}</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(so.valor)}</td></tr>`).join('')+
      `<tr class="total-row"><td style="padding:10px;text-align:right;">Subtotal serviços opcionais</td><td style="text-align:right;padding:10px;">${fmtMoeda(totalServicosOpcionaisCompras)}</td></tr>
      </tbody>
    </table>
  </div>`:''}
  ${manutHtml}
  <div class="summary">
    ${rows.length?`<div class="summary-line"><span>Compras</span><span>${fmtMoeda(totalItens)}</span></div>`:''}
    ${itensExtras.length?`<div class="summary-line"><span>Itens Extras</span><span>${fmtMoeda(totalExtras)}</span></div>`:''}
    ${servicosOpcionaisAtivosCompras.length?`<div class="summary-line"><span>Serviços Opcionais</span><span>${fmtMoeda(totalServicosOpcionaisCompras)}</span></div>`:''}
    ${frete?`<div class="summary-line"><span>Frete estimado</span><span>${fmtMoeda(frete)}</span></div>`:''}
    ${manutencoes.length?`<div class="summary-line"><span>Manutenções</span><span>${fmtMoeda(totalManut)}</span></div>`:''}
    <div class="summary-total"><span>Total Geral</span><span>${fmtMoeda(totalItens+totalExtras+totalServicosOpcionaisCompras+frete+totalManut)}</span></div>
  </div>`}
  </body></html>`);
  win.document.close();win.print();
}

// ═══════════════════ ABA ENXOVAL ═══════════════════
function renderAbaEnxoval(im){
  const camas=im.camas||[];
  if(!camas.length)return`<div class="empty-state" style="padding:40px;text-align:center;"><i class="fa-solid fa-bed fa-2x" style="opacity:.4"></i><p>Adicione as camas na aba <strong>Dados</strong> primeiro.</p></div>`;

  const tipo=_tipoEnxovalPrincipal(camas);
  const leitos=totalLeitos(camas);const colchoes=totalColchoes(camas);

  let totalBud=0;
  const linhasBud=Object.entries(PRECOS_ENXOVAL).map(([nome,tabela])=>{
    const itemDef=ITENS_COMPRAS.find(i=>i.nome===nome);
    const qtdRule=itemDef?.qtdRule||'1-colchao';
    const qtd=calcNecessario({qtdRule},camas,(im.banheirosCompletos||0)+(im.banheirosLavabo||0)||(im.banheiros||1),im.quartos||1,im.banheirosCompletos||(im.banheiros||1),im.maxHospedes||0,im.banheirosLavabo||0,im.andares||1);
    const pUn=tabela[tipo]||Object.values(tabela)[0]||0;
    const total=pUn*qtd;totalBud+=total;
    return{nome,tipo,qtd,pUn,total};
  });

  const pkgSugerido=FLASHEE_PACKAGES.find(p=>p.label.toLowerCase().includes(tipo.toLowerCase()))||FLASHEE_PACKAGES[0];
  const flasheeMensal=pkgSugerido?.cobrado||0;
  const flasheeSetup=pkgSugerido?.setup||290;
  const flasheeCusto6=flasheeMensal*6+flasheeSetup;
  const flasheeCusto12=flasheeMensal*12+flasheeSetup;
  const flasheeCusto18=flasheeMensal*18+flasheeSetup;
  const eqMeses=flasheeMensal?Math.ceil((totalBud-flasheeSetup)/flasheeMensal):null;

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-bed"></i> Configuração Detectada</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
    ${camas.map(c=>`<span class="tag tag-lav">${c.qtd}× ${c.tipo}</span>`).join('')}
    <span class="tag tag-neutral">${colchoes} colchão(ões) · ${leitos} leito(s) · Tamanho: <strong>${tipo}</strong></span>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
    <div style="border:2px solid var(--rose);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:14px;color:var(--rose);margin-bottom:12px;"><i class="fa-solid fa-shopping-bag"></i> Compra — Buddemeyer</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead><tr style="background:#fdf0f4"><th style="text-align:left;padding:4px;">Item (${tipo})</th><th>Qtd</th><th>Un</th><th>Total</th></tr></thead>
        <tbody>${linhasBud.map(l=>`<tr style="border-bottom:1px solid #f0e0e8;">
          <td style="padding:4px 0;font-size:11.5px;">${esc(l.nome)}</td>
          <td style="text-align:center;">${l.qtd}</td><td>${fmtMoeda(l.pUn)}</td>
          <td><strong>${fmtMoeda(l.total)}</strong></td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3" style="font-weight:700;padding-top:8px;">TOTAL</td><td style="font-weight:700;color:var(--rose);">${fmtMoeda(totalBud)}</td></tr></tfoot>
      </table>
      <div class="hint" style="margin-top:8px;">Pagamento único. Enxoval do proprietário.</div>
    </div>
    <div style="border:2px solid var(--lavender);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:14px;color:var(--lavender);margin-bottom:12px;"><i class="fa-solid fa-rotate"></i> Aluguel — Flashee</div>
      <div style="font-size:12px;margin-bottom:8px;"><strong>Pacote:</strong> ${esc(pkgSugerido?.label||'—')}</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead><tr style="background:#f4f0fa"><th style="text-align:left;padding:4px;">Período</th><th>Mensalidade</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td style="padding:4px;">6 meses</td><td>${fmtMoeda(flasheeMensal)}/mês</td><td><strong>${fmtMoeda(flasheeCusto6)}</strong></td></tr>
          <tr><td style="padding:4px;">12 meses</td><td>${fmtMoeda(flasheeMensal)}/mês</td><td><strong>${fmtMoeda(flasheeCusto12)}</strong></td></tr>
          <tr><td style="padding:4px;">18 meses</td><td>${fmtMoeda(flasheeMensal)}/mês</td><td><strong>${fmtMoeda(flasheeCusto18)}</strong></td></tr>
        </tbody>
      </table>
      <div class="hint" style="margin-top:8px;">Setup: ${fmtMoeda(flasheeSetup)}. Flashee gerencia higiene.</div>
    </div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-scale-balanced"></i> Comparativo</div>
  <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-bottom:20px;">
    <thead><tr style="background:var(--surface-2)"><th style="text-align:left;padding:8px;">Critério</th><th style="text-align:center;">Buddemeyer</th><th style="text-align:center;">Flashee</th></tr></thead>
    <tbody>
      <tr><td style="padding:6px 8px;">Investimento inicial</td><td style="text-align:center;">${fmtMoeda(totalBud)}</td><td style="text-align:center;">${fmtMoeda(flasheeSetup)}</td></tr>
      <tr><td style="padding:6px 8px;">Custo mensal</td><td style="text-align:center;">R$ 0</td><td style="text-align:center;">${fmtMoeda(flasheeMensal)}/mês</td></tr>
      <tr><td style="padding:6px 8px;">Ponto de equilíbrio</td><td colspan="2" style="text-align:center;">${eqMeses?eqMeses+' meses (Flashee supera Buddemeyer)':'—'}</td></tr>
      <tr><td style="padding:6px 8px;">Propriedade do enxoval</td><td style="text-align:center;">Proprietário</td><td style="text-align:center;">Flashee</td></tr>
    </tbody>
  </table>

  <div class="form-section-title"><i class="fa-solid fa-list"></i> Todos os Pacotes Flashee</div>
  <table style="width:100%;font-size:12px;border-collapse:collapse;">
    <thead><tr style="background:var(--surface-2)"><th style="text-align:left;padding:6px 8px;">Pacote</th><th>Custo WeCare</th><th>Cobrado Prop.</th><th>Setup</th></tr></thead>
    <tbody>${FLASHEE_PACKAGES.map(p=>`<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:6px 8px;">${esc(p.label)}</td>
      <td style="text-align:center;">${fmtMoeda(p.custo)}/mês</td>
      <td style="text-align:center;">${fmtMoeda(p.cobrado)}/mês</td>
      <td style="text-align:center;">${fmtMoeda(p.setup)}</td>
    </tr>`).join('')}</tbody>
  </table>
  </div>`;
}

// ═══════════════════ ABA OPERACIONAL ═══════════════════
function renderAbaOperacional(im){
  const quartos=im.quartos||1;
  const pfS=PRECOS_FOTOS[Math.min(quartos,4)]||PRECOS_FOTOS[4];
  const plQ=Math.min(quartos,4);
  const plS=PRECOS_PRIMEIRA_LIMPEZA.filter(p=>p.quartos===plQ).length?PRECOS_PRIMEIRA_LIMPEZA.filter(p=>p.quartos===plQ):PRECOS_PRIMEIRA_LIMPEZA.filter(p=>p.quartos===4);
  const ops=im.ops||{fotos:{},limpeza:{},vistoria:{}};

  const sCard=(titulo,icon,cor,id,op,hint='')=>`
  <div style="border:2px solid var(--${cor});border-radius:12px;padding:16px;margin-bottom:16px;">
    <div style="font-weight:700;font-size:14px;color:var(--${cor});margin-bottom:10px;"><i class="fa-solid fa-${icon}"></i> ${titulo}</div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input id="op-${id}-data" type="date" class="input" value="${op.data||''}"></div>
      <div class="form-group"><label>Hora</label><input id="op-${id}-hora" type="time" class="input" value="${op.hora||''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Responsável / Empresa</label><input id="op-${id}-resp" class="input" value="${esc(op.responsavel||'')}"></div>
      <div class="form-group"><label>Custo (R$)</label><input id="op-${id}-custo" type="number" class="input" value="${op.custo||0}"></div>
    </div>
    ${hint?`<div class="hint">${hint}</div>`:''}
    <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="pedirCotacaoJarvis('${id}')">
      <i class="fa-solid fa-robot"></i> Pedir cotação ao Jarvis
    </button>
  </div>`;

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-gears"></i> Atividades Operacionais</div>
  ${sCard('Sessão de Fotos','camera','lavender','fotos',ops.fotos,
    pfS?`💡 Sugestão (${quartos} quarto${quartos>1?'s':''}): R$ ${pfS.min}–R$ ${pfS.max} · Responsável: ${pfS.resp}`:'')}
  ${sCard('Primeira Limpeza','broom','peach','limpeza',ops.limpeza,
    plS.length?`💡 Sugestão (${quartos}q): `+plS.map(p=>`${p.empresa} custo R$ ${p.custo} / cobrado R$ ${p.cobrado}`).join(' · '):'')}
  <div style="border:2px solid var(--sage);border-radius:12px;padding:16px;margin-bottom:16px;">
    <div style="font-weight:700;font-size:14px;color:var(--sage);margin-bottom:10px;"><i class="fa-solid fa-magnifying-glass"></i> Vistoria</div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input id="op-vistoria-data" type="date" class="input" value="${ops.vistoria?.data||''}"></div>
      <div class="form-group"><label>Hora</label><input id="op-vistoria-hora" type="time" class="input" value="${ops.vistoria?.hora||''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Responsável</label><input id="op-vistoria-resp" class="input" value="${esc(ops.vistoria?.responsavel||'')}"></div>
      <div class="form-group"><label>Custo (R$)</label><input id="op-vistoria-custo" type="number" class="input" value="${ops.vistoria?.custo||0}"></div>
    </div>
    <div class="form-group"><label>Localização</label>
      <select id="op-vistoria-local" class="input">
        <option value="central"${(ops.vistoria?.localizacao||'central')==='central'?' selected':''}>Central (SP)</option>
        <option value="litoral"${ops.vistoria?.localizacao==='litoral'?' selected':''}>Litoral</option>
        <option value="interior"${ops.vistoria?.localizacao==='interior'?' selected':''}>Interior</option>
      </select>
    </div>
    <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="pedirCotacaoJarvis('vistoria')">
      <i class="fa-solid fa-robot"></i> Pedir cotação ao Jarvis
    </button>
  </div>

  <div class="form-section-title" style="margin-top:8px;"><i class="fa-solid fa-calendar-plus"></i> Outros Eventos</div>
  <div class="hint" style="margin-bottom:10px;">Ex: segunda vistoria, instalação de internet, manutenção agendada — aparecem no Calendário junto com fotos/limpeza/vistoria.</div>
  ${(im.eventosExtras||[]).length?`<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:12px;">
    <thead><tr style="background:var(--surface-2)">
      <th style="text-align:left;padding:6px 8px;">Título</th>
      <th style="padding:6px 8px;">Data</th>
      <th style="padding:6px 8px;">Hora</th>
      <th style="text-align:left;padding:6px 8px;">Responsável</th>
      <th style="text-align:right;padding:6px 8px;">Custo (R$)</th>
      <th style="padding:6px 8px;">Gasto de Setup?</th>
      <th style="padding:6px 4px;width:32px;"></th>
    </tr></thead>
    <tbody>
    ${(im.eventosExtras||[]).map(ev=>`<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:4px 6px;"><input class="input" style="padding:3px 6px;" value="${esc(ev.titulo)}" onchange="_onEventoExtraChange('${ev.id}','titulo',this.value)"></td>
      <td style="padding:4px 6px;"><input class="input" type="date" style="padding:3px 6px;" value="${ev.data||''}" onchange="_onEventoExtraChange('${ev.id}','data',this.value)"></td>
      <td style="padding:4px 6px;"><input class="input" type="time" style="padding:3px 6px;" value="${ev.hora||''}" onchange="_onEventoExtraChange('${ev.id}','hora',this.value)"></td>
      <td style="padding:4px 6px;"><input class="input" style="padding:3px 6px;" value="${esc(ev.responsavel||'')}" onchange="_onEventoExtraChange('${ev.id}','responsavel',this.value)"></td>
      <td style="padding:4px 6px;text-align:right;"><input class="input" type="number" min="0" style="width:80px;text-align:right;padding:3px 6px;" value="${ev.custo||0}" onchange="_onEventoExtraChange('${ev.id}','custo',this.value)"></td>
      <td style="padding:4px 6px;text-align:center;"><input type="checkbox" ${ev.gastoSetup?'checked':''} onchange="_onEventoExtraGastoSetup(this,'${ev.id}')"></td>
      <td style="padding:4px 4px;"><button class="btn btn-xs btn-danger" onclick="apagarEventoExtra('${ev.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('')}
    </tbody>
  </table>`:''}
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;background:var(--surface-2,#f5f0fa);border-radius:10px;padding:12px;">
    <div style="flex:1;min-width:140px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Título</label><input id="evx-novo-titulo" class="input" placeholder="Ex: Instalação da internet" style="width:100%;"></div>
    <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Data</label><input id="evx-novo-data" type="date" class="input"></div>
    <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Hora</label><input id="evx-novo-hora" type="time" class="input"></div>
    <div style="min-width:120px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Responsável</label><input id="evx-novo-resp" class="input" style="width:100%;"></div>
    <div style="width:100px;"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:3px;">Custo (R$)</label><input id="evx-novo-custo" type="number" min="0" class="input" value="0" style="width:100%;"></div>
    <div style="display:flex;align-items:center;gap:4px;padding-bottom:8px;"><label style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;"><input id="evx-novo-setup" type="checkbox"> Gasto de Setup?</label></div>
    <button class="btn btn-sm btn-sage" onclick="adicionarEventoExtra()"><i class="fa-solid fa-plus"></i> Adicionar</button>
  </div>
  </div>`;
}

// ═══════════════════ ABA CUSTOS ═══════════════════
function renderAbaCustos(im){
  let totalCompras=0;
  ITENS_COMPRAS.forEach((item,idx)=>{
    const camas=im.camas||[];
    const qtdNec=calcNecessario(item,camas,(im.banheirosCompletos||0)+(im.banheirosLavabo||0)||(im.banheiros||1),im.quartos||1,im.banheirosCompletos||(im.banheiros||1),im.maxHospedes||0,im.banheirosLavabo||0,im.andares||1);
    const precoUn=item.tipoPreco==='fixo'?item.preco:getPrecoEnxovalUn(item.nome,camas);
    const qtdReal=im.compras?.[idx]?.qtdReal!=null?im.compras[idx].qtdReal:qtdNec;
    totalCompras+=precoUn*qtdReal;
  });
  const freteCustos=im.freteTotal||0;
  const totalServicosOpcionaisCustos=_totalServicosOpcionaisCompras(im);
  const subtotal=totalCompras+freteCustos+totalServicosOpcionaisCustos;
  const margem=im.margemWecare||15;
  const comissao=subtotal*(margem/100);
  let desc=0;
  if(im.descontoTipo==='reais')desc=im.descontoValor||0;
  else desc=(subtotal+comissao)*(im.descontoValor||0)/100;
  const total=subtotal+comissao-desc;

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-calculator"></i> Resumo de Custos (Compras)</div>
  <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
    <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 4px;">Total Compras</td><td style="text-align:right;">${fmtMoeda(totalCompras)}</td></tr>
    ${totalServicosOpcionaisCustos?`<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 4px;">Serviços Opcionais</td><td style="text-align:right;">${fmtMoeda(totalServicosOpcionaisCustos)}</td></tr>`:''}
    ${freteCustos?`<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 4px;">Frete</td><td style="text-align:right;">${fmtMoeda(freteCustos)}</td></tr>`:''}
    <tr style="border-top:2px solid var(--border)"><td style="padding:8px 4px;font-weight:600;">Subtotal</td><td style="text-align:right;font-weight:600;">${fmtMoeda(subtotal)}</td></tr>
  </table>
  <div class="hint" style="margin-bottom:12px;"><i class="fa-solid fa-circle-info"></i> Fotos, limpeza, vistoria e gastos de setup estão na aba <strong>Contrato</strong>.</div>

  <div class="form-section-title"><i class="fa-solid fa-percent"></i> Margem WeCare</div>
  <div class="form-row">
    <div class="form-group"><label>Margem (%)</label><input id="cs-margem" type="number" class="input" value="${margem}" min="0" max="100"></div>
    <div class="form-group"><label>Valor da Margem</label><input class="input" readonly value="${fmtMoeda(comissao)}"></div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-tag"></i> Desconto</div>
  <div class="form-row">
    <div class="form-group"><label>Tipo</label>
      <select id="cs-desc-tipo" class="input">
        <option value="reais"${(im.descontoTipo||'reais')==='reais'?' selected':''}>R$ (reais)</option>
        <option value="percent"${im.descontoTipo==='percent'?' selected':''}>% (porcentagem)</option>
      </select>
    </div>
    <div class="form-group"><label>Valor</label><input id="cs-desc-val" type="number" class="input" value="${im.descontoValor||0}" min="0"></div>
  </div>

  <div style="background:var(--surface-2,#f8f4f9);border-radius:10px;padding:16px;margin-top:16px;">
    <div style="font-size:18px;font-weight:700;display:flex;justify-content:space-between;">
      <span>Total ao Proprietário</span><span style="color:var(--rose);">${fmtMoeda(total)}</span>
    </div>
  </div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-credit-card"></i> Formas de Pagamento</div>
  <div class="form-group">
    <textarea id="cs-pagamento" class="input" rows="3" placeholder="Ex: 50% na assinatura + 50% na entrega das chaves">${esc(im.formasPagamento||'')}</textarea>
  </div>
  <button class="btn btn-sm" style="margin-top:8px;" onclick="gerarPDFOrcamento()"><i class="fa-solid fa-file-pdf"></i> Gerar PDF do Orçamento</button>
  </div>`;
}
async function gerarPDFOrcamento(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const rows=_rowsComprasFalta(im);
  const totalC=rows.reduce((s,r)=>s+r.total,0);
  const linhasComp=rows.map(r=>`<tr>
    <td style="padding:7px 10px;">${esc(r.label)}</td>
    <td style="text-align:center;color:#888;">${r.falta}</td>
    <td style="text-align:right;color:#888;">${fmtMoeda(r.pUn)}</td>
    <td style="text-align:right;font-weight:600;">${fmtMoeda(r.total)}</td>
  </tr>`).join('');
  const frete=im.freteTotal||0;
  const custoFotos=+im.ops?.fotos?.custo||0;
  const custoLimpeza=+im.ops?.limpeza?.custo||0;
  const custoVistoria=+im.ops?.vistoria?.custo||0;
  const gastosSetup=(im.eventosExtras||[]).filter(e=>e.gastoSetup);
  const custosExtras=gastosSetup.reduce((s,g)=>s+(+g.custo||0),0);
  const linhasExtras=gastosSetup.map(g=>`<tr><td style="padding:7px 10px;">${esc(g.titulo)}</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(+g.custo||0)}</td></tr>`).join('');
  const servicosOpcionaisSelPdf=im.servicosOpcionaisCompras||{};
  const servicosOpcionaisAtivos=SERVICOS_OPCIONAIS_COMPRAS.filter(so=>servicosOpcionaisSelPdf[so.id]);
  const custosServicosOpcionais=servicosOpcionaisAtivos.reduce((s,so)=>s+so.valor,0);
  const linhasServicosOpcionais=servicosOpcionaisAtivos.map(so=>`<tr><td style="padding:7px 10px;">${esc(so.nome)}</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(so.valor)}</td></tr>`).join('');
  const sub=totalC+frete+custoFotos+custoLimpeza+custoVistoria+custosExtras+custosServicosOpcionais;
  const marg=sub*(im.margemWecare||15)/100;
  const desc=im.descontoTipo==='reais'?(im.descontoValor||0):(sub+marg)*(im.descontoValor||0)/100;
  const total=sub+marg-desc;
  const banhTotal=(im.banheirosCompletos||0)+(im.banheirosLavabo||0)||(im.banheiros||1);
  const win=window.open('','_blank');
  const logoUri=await _logoPdfDataUri();
  win.document.write(`<html><head><meta charset="utf-8"><title>Orçamento — ${esc(im.nome)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#333;padding:32px 40px;max-width:800px;margin:0 auto;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #C49A5E;}
    .brand{display:flex;align-items:center;}
    .brand img{height:64px;width:auto;}
    .meta{font-size:12px;color:#888;text-align:right;line-height:1.6;}
    h2{font-size:13px;font-weight:700;color:#132030;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 8px;}
    table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:12.5px;}
    th{background:#132030;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
    tr:nth-child(even){background:#fafafa;}
    td{border-bottom:1px solid #EFE7D6;vertical-align:middle;}
    .section-divider{height:16px;}
    .summary{background:#132030;color:#fff;border-radius:12px;padding:20px 24px;margin-top:20px;}
    .summary-line{display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;color:rgba(255,255,255,.8);}
    .summary-sub{display:flex;justify-content:space-between;font-size:13px;font-weight:600;padding:8px 0;border-top:1px solid rgba(255,255,255,.15);margin-top:4px;}
    .summary-total{display:flex;justify-content:space-between;font-size:20px;font-weight:800;padding-top:10px;margin-top:6px;border-top:1px solid rgba(255,255,255,.3);}
    .summary-total span:last-child{color:#C49A5E;}
    .pagamento{background:#FAF3E4;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:12px;color:#132030;}
    @media print{body{padding:16px;}@page{margin:1cm;}}
  </style></head><body>
  <div class="header">
    <div class="brand">
      ${logoUri?`<img src="${logoUri}" alt="WeCare Hosting">`:'<div style="font-size:22px;font-weight:800;color:#132030;">WeCare Hosting</div>'}
    </div>
    <div class="meta">
      <div style="font-weight:700;color:#333;">${esc(im.nome)}</div>
      <div><strong>Proprietário:</strong> ${esc(im.proprietarioNome||'—')}</div>
      <div>${esc(im.endereco||'')}</div>
      <div>${im.quartos||1} quartos · ${banhTotal} banheiros &nbsp;|&nbsp; ${fmtDate(hoje())}</div>
    </div>
  </div>
  <div style="font-size:11px;color:#888;margin:-16px 0 20px;">Orçamento de Onboarding</div>

  <h2>Lista de Compras</h2>
  ${rows.length?`<table>
    <thead><tr><th>Item</th><th style="text-align:center;width:60px;">Qtd</th><th style="text-align:right;width:80px;">R$/Un</th><th style="text-align:right;width:90px;">Total</th></tr></thead>
    <tbody>${linhasComp}</tbody>
  </table>`:'<p style="color:#888;font-size:12px;padding:8px 0;">Nenhum item para comprar.</p>'}

  <h2>Produção e Setup</h2>
  <table><thead><tr><th>Serviço</th><th style="text-align:right;width:120px;">Valor</th></tr></thead><tbody>
    ${frete?`<tr><td style="padding:7px 10px;">Frete</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(frete)}</td></tr>`:''}
    ${custoFotos?`<tr><td style="padding:7px 10px;">Fotos profissionais</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(custoFotos)}</td></tr>`:''}
    ${custoLimpeza?`<tr><td style="padding:7px 10px;">Primeira limpeza</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(custoLimpeza)}</td></tr>`:''}
    ${custoVistoria?`<tr><td style="padding:7px 10px;">Vistoria</td><td style="text-align:right;padding:7px 10px;font-weight:600;">${fmtMoeda(custoVistoria)}</td></tr>`:''}
    ${linhasServicosOpcionais}
    ${linhasExtras}
    ${(!frete&&!custoFotos&&!custoLimpeza&&!custoVistoria&&!linhasServicosOpcionais&&!linhasExtras)?'<tr><td style="padding:7px 10px;color:#aaa;" colspan="2">Nenhum custo de setup informado</td></tr>':''}
  </tbody></table>

  <div class="summary">
    <div class="summary-line"><span>Compras (${rows.length} itens)</span><span>${fmtMoeda(totalC)}</span></div>
    ${frete?`<div class="summary-line"><span>Frete</span><span>${fmtMoeda(frete)}</span></div>`:''}
    ${custoFotos?`<div class="summary-line"><span>Fotos</span><span>${fmtMoeda(custoFotos)}</span></div>`:''}
    ${custoLimpeza?`<div class="summary-line"><span>Primeira limpeza</span><span>${fmtMoeda(custoLimpeza)}</span></div>`:''}
    ${custoVistoria?`<div class="summary-line"><span>Vistoria</span><span>${fmtMoeda(custoVistoria)}</span></div>`:''}
    ${custosServicosOpcionais?`<div class="summary-line"><span>Serviços Opcionais</span><span>${fmtMoeda(custosServicosOpcionais)}</span></div>`:''}
    ${custosExtras?`<div class="summary-line"><span>Outros</span><span>${fmtMoeda(custosExtras)}</span></div>`:''}
    <div class="summary-sub"><span>Subtotal</span><span>${fmtMoeda(sub)}</span></div>
    <div class="summary-line"><span>Margem WeCare (${im.margemWecare||15}%)</span><span>${fmtMoeda(marg)}</span></div>
    ${desc?`<div class="summary-line"><span>Desconto</span><span>–${fmtMoeda(desc)}</span></div>`:''}
    <div class="summary-total"><span>Total ao Proprietário</span><span>${fmtMoeda(total)}</span></div>
  </div>
  ${im.formasPagamento?`<div class="pagamento"><strong>Forma de Pagamento:</strong> ${esc(im.formasPagamento)}</div>`:''}
  </body></html>`);
  win.document.close();win.print();
}

// ═══════════════════ ABA FINAL ═══════════════════
function renderAbaFinal(im){
  const resp=im.responsavelCriacao||'';
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-list-check"></i> Checklist Final</div>
  ${_checklistItem('Contrato assinado',im.contratoAssinado)}
  ${_checklistItem('Formulário enviado pelo proprietário',!!im.formEnviadoEm)}
  ${_checklistItem('Fotos realizadas',!!(im.ops?.fotos?.data&&im.ops?.fotos?.responsavel))}
  ${_checklistItem('Primeira limpeza realizada',!!(im.ops?.limpeza?.data))}
  ${_checklistItem('Vistoria realizada',!!(im.ops?.vistoria?.data))}
  ${_checklistItem('Compras concluídas',_todasComprasFeitas(im))}

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-file-pdf"></i> Relatórios Compilados</div>
  <div class="hint" style="margin-bottom:8px;">Dois relatórios separados pra não confundir o agente de criação de anúncio: um só com as respostas do formulário, outro só com os dados operacionais/administrativos.</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button class="btn btn-outline btn-sm" onclick="gerarPDFFormulario()"><i class="fa-solid fa-file-pdf"></i> PDF do Formulário</button>
    <button class="btn btn-outline btn-sm" onclick="gerarPDFOutrasInformacoes()"><i class="fa-solid fa-file-pdf"></i> PDF de Outras Informações</button>
  </div>

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-user-check"></i> Criação do Anúncio</div>
  <div class="form-row">
    <div class="form-group"><label>Responsável</label>
      <input id="fn-resp-criacao" class="input" value="${esc(resp)}" placeholder="Nome do responsável" oninput="_onRespCriacaoChange(this)">
    </div>
    <div class="form-group"><label>Data de Envio</label><input id="fn-data-envio" type="date" class="input" value="${im.dataEnvioParaCriacao||''}"></div>
  </div>
  <div class="form-group"><label>Valor Mínimo / Noite confirmado (R$)</label><input id="fn-min-noite" type="number" class="input" value="${im.valorMinNoite||0}"></div>
  <div id="fn-claire-wrap" style="${resp?'':'display:none;'}margin-top:10px;">
    <button class="btn btn-primary btn-sm" onclick="criarTarefaClaire()">
      <i class="fa-solid fa-circle-plus"></i> Criar tarefa na Claire para <span id="fn-resp-label">${esc(resp)}</span>
    </button>
    ${im.tarefaClaireId?`<span class="tag tag-sage" style="margin-left:8px;"><i class="fa-solid fa-check"></i> Tarefa criada</span>`:''}
  </div>
  ${im.dataAtivacao?`<div style="background:var(--sage-light,#e8f5e9);border-radius:10px;padding:16px;margin-top:20px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🎉</div>
    <div style="font-weight:700;font-size:16px;color:var(--sage);">Imóvel Ativo desde ${fmtDate(im.dataAtivacao)}</div>
  </div>`:''}
  </div>`;
}
function _onRespCriacaoChange(inp){
  const v=inp.value.trim();
  const wrap=document.getElementById('fn-claire-wrap');
  const label=document.getElementById('fn-resp-label');
  if(wrap)wrap.style.display=v?'':'none';
  if(label)label.textContent=v||'responsável';
}
async function criarTarefaClaire(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  _coletarDadosAba('final',im);
  const resp=im.responsavelCriacao||'';
  if(!resp){showToast('Informe o responsável primeiro.','peach');return;}
  const respostas={...(im.formRespostas||{}),...(im.formRascunho||{})};
  const perguntas=(window.FORM_PERGUNTAS_FLAT||[]);
  const respostasTxt=perguntas.filter(p=>respostas[p.id]).map(p=>`• ${p.label}: ${respostas[p.id]}`).join('\n');
  const camas=(im.camas||[]).map(c=>`${c.qtd}x ${c.tipo}`).join(', ');
  const plataformas=(im.plataformas||[]).join(', ');
  const texto=`📋 CRIAÇÃO DE ANÚNCIO — ${im.nome}

🏠 Imóvel: ${im.nome}
📍 Endereço: ${im.endereco||'—'}
👤 Proprietário: ${im.proprietarioNome||'—'} | ${im.proprietarioTel||'—'}
🛏 Camas: ${camas||'—'} | Banheiros: ${im.banheiros||'—'} | Quartos: ${im.quartos||'—'}
💰 Valor mín/noite: R$ ${im.valorMinNoite||0}
📱 Plataformas: ${plataformas||'—'}
📁 Pasta captação: ${im.captacaoLink||'—'}
📸 Fotos: ${im.ops?.fotos?.data||'—'} (${im.ops?.fotos?.responsavel||'—'})

RESPOSTAS DO FORMULÁRIO:
${respostasTxt||'(sem respostas ainda)'}`;
  try{
    const r=await fetch('https://claire-dados.nicole-0e7.workers.dev/api/tasks?token=wecare-claire-2026-k7x9q2',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text:texto,cat:'onboarding',prio:'alta',due:im.dataEnvioParaCriacao||''})
    });
    const j=await r.json();
    if(j.ok||j.id||j.task){
      im.tarefaClaireId=j.id||j.task?.id||'criado';
      saveAll();renderAba('final');
      showToast('Tarefa criada na Claire para '+resp+'!','sage');
    }else throw new Error(j.error||'Erro');
  }catch(e){showToast('Erro: '+e.message,'peach');}
}
async function _pdfHeaderHtml(im,subtitulo){
  const logoUri=await _logoPdfDataUri();
  return`<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #C49A5E;">
    <div>
      ${logoUri?`<img src="${logoUri}" alt="WeCare Hosting" style="height:56px;width:auto;display:block;">`:'<div style="font-size:22px;font-weight:800;color:#132030;">WeCare Hosting</div>'}
      <div style="font-size:11px;color:#888;margin-top:6px;">${esc(subtitulo)}</div>
    </div>
    <div style="font-size:12px;color:#888;text-align:right;line-height:1.8;">
      <div style="font-weight:700;font-size:14px;color:#333;">${esc(im.nome)}</div>
      <div><strong>Proprietário:</strong> ${esc(im.proprietarioNome||'—')}</div>
      <div>${esc(im.endereco||'')}</div>
      <div>Gerado em ${fmtDate(hoje())}</div>
    </div>
  </div>`;
}
function _pdfCampoHtml(label,val,destaque=false){
  const vazio=!val||!String(val).trim();
  return`<div style="padding:7px 0;border-bottom:1px solid #EFE7D6;">
    <div style="font-size:10px;font-weight:700;color:#132030;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;">${label}</div>
    <div style="font-size:13px;color:${vazio?'#bbb':(destaque?'#B8863C':'#333')};${vazio?'font-style:italic;':''}">${vazio?'—':esc(String(val))}</div>
  </div>`;
}
function _pdfSecaoHtml(icone,titulo,conteudo){
  return`<div style="display:flex;align-items:center;gap:8px;background:#132030;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;margin-top:20px;">
    <span>${icone}</span><span style="font-size:13px;font-weight:700;">${titulo}</span>
  </div><div style="border:1px solid #EFE7D6;border-top:none;border-radius:0 0 8px 8px;padding:2px 14px 8px;">${conteudo}</div>`;
}
async function gerarPDFFormulario(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const respostas={...(im.formRespostas||{}),...(im.formRascunho||{})};
  const secoes=window.FORM_SECOES||[];
  const totalPergs=(secoes||[]).reduce((s,sec)=>s+(sec.perguntas||[]).length,0);
  const respondidos=Object.keys(respostas).filter(k=>respostas[k]&&String(respostas[k]).trim()).length;
  const pct=totalPergs?Math.round(respondidos/totalPergs*100):0;

  const secoesHtml=secoes.map(sec=>{
    const pergsHtml=(sec.perguntas||[]).map(p=>{
      const r=respostas[p.id];
      const vazio=!r||!String(r).trim();
      return`<div style="padding:7px 0;border-bottom:1px solid #EFE7D6;">
        <div style="font-size:10px;font-weight:700;color:#132030;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;">${esc(p.label)}</div>
        <div style="font-size:13px;color:${vazio?'#bbb':'#333'};${vazio?'font-style:italic;':''}">${vazio?'Não respondido':esc(String(r))}</div>
      </div>`;
    }).join('');
    const total=(sec.perguntas||[]).length;
    const conf=(sec.perguntas||[]).filter(p=>respostas[p.id]&&String(respostas[p.id]).trim()).length;
    return`<div style="margin-bottom:0;break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:center;background:#132030;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;margin-top:20px;">
        <span style="font-size:13px;font-weight:700;">${esc(sec.secao)}</span>
        <span style="font-size:11px;opacity:.75;">${conf}/${total}</span>
      </div>
      <div style="border:1px solid #EFE7D6;border-top:none;border-radius:0 0 8px 8px;padding:2px 14px 8px;">${pergsHtml}</div>
    </div>`;
  }).join('');

  const win=window.open('','_blank');
  win.document.write(`<html><head><meta charset="utf-8"><title>Formulário — ${esc(im.nome)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#333;padding:32px 40px;max-width:840px;margin:0 auto;}
    @media print{body{padding:16px;}@page{margin:1.2cm;size:A4;}}
  </style></head><body>
  ${await _pdfHeaderHtml(im,'Respostas do Formulário do Proprietário')}
  <div style="height:8px;background:#EFE7D6;border-radius:4px;margin-bottom:4px;"><div style="height:8px;background:#C49A5E;border-radius:4px;width:${pct}%"></div></div>
  <div style="font-size:11px;color:#888;margin-bottom:16px;">${respondidos} de ${totalPergs} campos do formulário preenchidos (${pct}%)</div>
  ${secoesHtml}
  </body></html>`);
  win.document.close();win.print();
}
async function gerarPDFOutrasInformacoes(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const campo=_pdfCampoHtml, sec=_pdfSecaoHtml;

  const camasStr=(im.camas||[]).map(c=>`${c.qtd||1}x ${c.tipo}`).join(' · ')||'—';

  const defs=[];
  if(im.seguroEasyCover) defs.push('Seguro EasyCover');
  if(im.kitAmenities)    defs.push('Kit Amenities WeCare');
  if(im.internetClaro)   defs.push('Internet Claro');
  if(im.ecohost)         defs.push('Sistema EcoHost');
  if(im.fechaduraEletronica) defs.push('Fechadura Eletrônica');

  const shortStayLabel={'sim':'✅ Sim','nao':'❌ Não','':'Não informado'}[im.shortStayPermitido||''];

  const fichaHtml=`
  ${sec('👤','Proprietário',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      ${campo('Nome',im.proprietarioNome)}
      ${campo('Telefone',im.proprietarioTel)}
      ${campo('E-mail',im.proprietarioEmail)}
    </div>
  `)}

  ${sec('🏠','Dados do Imóvel',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      ${campo('Endereço',im.endereco)}
      ${campo('Quartos',im.quartos)}
      ${campo('Banheiros completos',im.banheirosCompletos)}
      ${campo('Lavabos',im.banheirosLavabo||0)}
      ${campo('Salas',im.salas)}
      ${campo('Cozinhas',im.cozinha||0)}
    </div>
    ${campo('Camas',camasStr)}
  `)}

  ${sec('💰','Preços',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      ${campo('Diária mínima',im.valorMinNoite?fmtMoeda(im.valorMinNoite):'',true)}
      ${campo('Diária base',im.valorBaseNoite?fmtMoeda(im.valorBaseNoite):'',true)}
      ${campo('Taxa de limpeza',im.taxaLimpeza?fmtMoeda(im.taxaLimpeza):'',true)}
      ${campo('Taxa hóspede extra (acima de '+( im.taxaHospedeExtraAcimaDe||'—')+' pessoas)',im.taxaHospedeExtra?fmtMoeda(im.taxaHospedeExtra):'',true)}
      ${campo('Caução',im.valorCaucao?fmtMoeda(im.valorCaucao):'',true)}
      ${campo('Política de cancelamento',im.politicaCancelamento)}
      ${campo('Comissão WeCare',im.comissaoWecare?(im.comissaoWecare+'% '+(im.comissaoBase==='bruta'?'(bruta)':'(líquida)')):'',true)}
    </div>
  `)}

  ${sec('📢','Plataformas de Divulgação',campo('Plataformas',(im.plataformas||[]).join(' · ')))}

  ${sec('⚙️','Definições Operacionais',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      ${campo('Serviços contratados',defs.length?defs.join(', '):'Nenhum')}
      ${campo('Modalidade enxoval',im.defEnxoval?.tipo==='aluguel'?'Aluguel mensal (Flashee)':'Comprado (Buddemeyer)')}
      ${campo('Equipe de limpeza',im.defLimpeza?.responsavel)}
    </div>
  `)}

  ${sec('🏛️','Condomínio',campo('Convenção aceita short stay',shortStayLabel)+campo('Restrições',im.restricoes))}

  ${sec('🔑','Acesso & Operação',`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
      ${campo('Wi-Fi — rede',(im.wifi||{}).rede)}
      ${campo('Wi-Fi — senha',(im.wifi||{}).senha)}
      ${campo('Senha da porta / fechadura',im.senhaPorta)}
      ${campo('Vaga de garagem',im.vaga)}
      ${campo('Zelador / Portaria — nome',im.zeladorNome)}
      ${campo('Zelador / Portaria — telefone',im.zeladorTel)}
    </div>
    ${campo('Como hóspedes acessam',im.acesso)}
  `)}

  ${im.observacoes?sec('📝','Observações',campo('',im.observacoes)):''}
  `;

  const win=window.open('','_blank');
  win.document.write(`<html><head><meta charset="utf-8"><title>Outras Informações — ${esc(im.nome)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#333;padding:32px 40px;max-width:840px;margin:0 auto;}
    @media print{body{padding:16px;}@page{margin:1.2cm;size:A4;}}
  </style></head><body>
  ${await _pdfHeaderHtml(im,'Ficha de Onboarding — Outras Informações')}
  ${fichaHtml}
  </body></html>`);
  win.document.close();win.print();
}
function pedirCotacaoJarvis(modo){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const msgs={
    fotos:`Olá! Sou da WeCare Hosting.\nPrecisamos de sessão de fotos para o imóvel *${im.nome}* em ${im.endereco||'(verificar endereço)'}.\nSão ${im.quartos||'?'} quartos.\nQual a disponibilidade e valor da sessão?`,
    limpeza:`Olá! Sou da WeCare Hosting.\nPrecisamos de primeira limpeza para o imóvel *${im.nome}* em ${im.endereco||'(verificar endereço)'}.\nSão ${im.quartos||'?'} quartos e ${im.banheiros||'?'} banheiros.\nQual disponibilidade e valor?`,
    vistoria:`Olá! Sou da WeCare Hosting.\nPrecisamos de vistoria para o imóvel *${im.nome}* em ${im.endereco||'(verificar endereço)'}.\nQual o valor e disponibilidade?`,
  };
  const msg=msgs[modo]||`Cotação para ${modo} — ${im.nome}`;
  const tipoFiltro={fotos:'Fotógrafo',limpeza:'Limpeza',vistoria:'Vistoria'};
  const relevantes=prestadores.filter(p=>p.tipo===(tipoFiltro[modo]||modo));

  // Envia ao Jarvis
  const s=window.WC_SYNC||{};
  if(s.url){
    fetch(s.url.replace(/\/$/,'')+'/jarvis-notify?token='+encodeURIComponent(s.token||''),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:im.id,dados:{cotacaoSolicitada:{modo,mensagem:msg,solicitadoEm:new Date().toISOString()}}})
    }).catch(()=>{});
  }

  // Mostra modal com prestadores e links WA
  const listHtml=relevantes.length
    ?relevantes.map(p=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="flex:1;font-weight:600;font-size:13px;">${esc(p.nome)}</span>
        <span style="font-size:12px;color:var(--text3);">${esc(p.cidade||'')}</span>
        ${p.nota?`<span>${'⭐'.repeat(Math.min(+p.nota,5))}</span>`:''}
        ${p.telefone?`<a href="https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}" target="_blank" class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;"><i class="fa-brands fa-whatsapp"></i> Enviar</a>`:'<span class="text-muted" style="font-size:12px;">sem tel</span>'}
      </div>`).join('')
    :`<div class="text-muted" style="padding:12px 0;font-size:13px;">Nenhum fornecedor de ${modo} cadastrado. <a onclick="showPanel('fornecedores',null);closeModal('modal-generico')" style="cursor:pointer;color:var(--rose);">Adicionar fornecedor →</a></div>`;

  document.getElementById('generico-titulo').textContent='Cotação: '+modo.charAt(0).toUpperCase()+modo.slice(1)+' — '+im.nome;
  document.getElementById('generico-body').innerHTML=`
    <div class="hint" style="margin-bottom:12px;"><i class="fa-solid fa-robot"></i> Solicitação enviada ao Jarvis. Clique em "Enviar" para cada prestador desejado:</div>
    <div style="background:var(--surface-2,#f8f4f9);border-radius:8px;padding:12px;margin-bottom:14px;font-size:12px;font-family:monospace;white-space:pre-wrap;">${esc(msg)}</div>
    ${listHtml}`;
  document.getElementById('modal-generico').classList.add('open');
}
function _checklistItem(label,ok){
  return`<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">
    <span style="font-size:18px;">${ok?'✅':'⏳'}</span>
    <span style="${ok?'':'color:var(--text-muted);'}">${label}</span>
  </div>`;
}
function _todasComprasFeitas(im){
  if(!im.compras)return false;
  return ITENS_COMPRAS.every((_,idx)=>im.compras[idx]?.comprado);
}

// ═══════════════════ DASHBOARD ═══════════════════
function renderDashboard(){
  const total=imoveis.length;
  const ativos=imoveis.filter(i=>i.status==='ativo').length;
  const emAndamento=imoveis.filter(i=>i.status!=='ativo'&&i.status!=='perdido').length;
  const perdidos=imoveis.filter(i=>i.status==='perdido').length;
  const ativados=imoveis.filter(i=>i.status==='ativo'&&i.dataCriacao&&i.dataAtivacao);
  const tempoMedio=ativados.length
    ?Math.round(ativados.reduce((s,i)=>s+diasEntre(i.dataCriacao,i.dataAtivacao),0)/ativados.length):null;
  const porFase=FASES.map(f=>({fase:f,qtd:imoveis.filter(i=>i.status===f).length}));

  const stats=document.getElementById('dash-stats');
  if(stats)stats.innerHTML=
    _kpiCard('Total',total,'house','lav')+
    _kpiCard('Ativos',ativos,'circle-check','sage')+
    _kpiCard('Em Andamento',emAndamento,'spinner','gold')+
    _kpiCard('Perdidos',perdidos,'circle-xmark','peach')+
    _kpiCard('Tempo Médio',tempoMedio!=null?tempoMedio+' dias':'—','clock','lavender');

  const fases=document.getElementById('dash-fases');
  if(fases)fases.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;">
    ${porFase.map(({fase,qtd})=>`<div style="background:var(--bg3,#f8f4f9);border-radius:8px;padding:8px 14px;text-align:center;min-width:100px;">
      <div style="font-weight:700;font-size:20px;">${qtd}</div>
      <div style="font-size:11px;color:var(--text3,#888);">${FASE_LABEL[fase]}</div>
    </div>`).join('')}
  </div>`;

  const tbody=document.getElementById('dash-ativos-body');
  if(tbody)tbody.innerHTML=[...imoveis]
    .filter(i=>i.status==='ativo')
    .sort((a,b)=>b.dataAtivacao?.localeCompare(a.dataAtivacao||'')||0)
    .slice(0,10)
    .map(im=>`<tr>
      <td style="cursor:pointer;" onclick="abrirDetalhe('${im.id}')" class="link">${esc(im.nome)}</td>
      <td>${fmtDate(im.dataCriacao)}</td>
      <td>${fmtDate(im.dataAtivacao)}</td>
      <td>${im.dataCriacao&&im.dataAtivacao?diasEntre(im.dataCriacao,im.dataAtivacao)+'d':'—'}</td>
    </tr>`).join('');
}
function _kpiCard(label,val,icon,cor){
  return`<div style="background:var(--card-bg);border-radius:12px;padding:18px 20px;border-left:4px solid var(--${cor},var(--rose));">
    <div style="font-size:28px;font-weight:700;">${val}</div>
    <div style="font-size:13px;color:var(--text-muted);margin-top:4px;"><i class="fa-solid fa-${icon}"></i> ${label}</div>
  </div>`;
}

// ═══════════════════ INTEL DE MERCADO ═══════════════════
const INTEL_TIPOS=[
  {id:'limpeza',  label:'Limpeza',     icon:'broom',       q:'empresa+limpeza+residencial'},
  {id:'fotos',    label:'Fotógrafo',   icon:'camera',      q:'fotografo+imovel+airbnb'},
  {id:'hidraul',  label:'Hidráulica',  icon:'wrench',      q:'encanador+hidraulica'},
  {id:'eletrica', label:'Elétrica',    icon:'bolt',        q:'eletricista+residencial'},
  {id:'vistoria', label:'Vistoria',    icon:'magnifying-glass', q:'vistoria+imovel+laudo'},
  {id:'fechadura',label:'Fechadura',   icon:'lock',        q:'fechadura+eletronica+instalacao'},
  {id:'wifi',     label:'Internet',    icon:'wifi',        q:'instalacao+internet+fibra+claro'},
  {id:'reforma',  label:'Reforma',     icon:'hammer',      q:'pequenas+reformas+residencial'},
];

function renderIntel(){
  // O panel-intel tem HTML estático no index — só atualiza o container de prestadores
  const lista=document.getElementById('intel-prestadores-lista');
  if(lista)lista.innerHTML=_renderPrestadoresList();
  // Sincroniza endereço salvo com o campo
  const endEl=document.getElementById('intel-endereco');
  if(endEl&&_intelEndereco)endEl.value=_intelEndereco;
}
let _intelEndereco='';
function _salvarEnderecoIntel(){
  _intelEndereco=document.getElementById('intel-endereco')?.value||'';
  showToast('Endereço definido!','sage');
}
function _buscarEmbeddedMapa(query){
  const end=_intelEndereco||document.getElementById('intel-endereco')?.value||'';
  const q=end?query+' perto de '+end:query;
  const el=document.getElementById('intel-mapa-embed');
  if(el){
    el.innerHTML=`<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed" width="100%" height="380" frameborder="0" style="border:0;border-radius:10px;" allowfullscreen loading="lazy"></iframe>`;
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function _renderPrestadoresList(){
  if(!prestadores.length)return`<div class="empty-state" style="padding:24px;text-align:center;font-size:13px;color:var(--text-muted);">Nenhum prestador cadastrado ainda.</div>`;
  return`<table style="width:100%;font-size:13px;border-collapse:collapse;">
    <thead><tr style="border-bottom:2px solid var(--border)">
      <th style="text-align:left;padding:7px 6px;">Nome</th><th>Tipo</th><th>Telefone</th><th>Cidade</th><th>Nota</th><th></th>
    </tr></thead>
    <tbody>${prestadores.map((p,i)=>`<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:7px 6px;font-weight:600;">${esc(p.nome)}</td>
      <td><span class="tag tag-lav">${esc(p.tipo)}</span></td>
      <td>${p.telefone?`<a href="https://wa.me/55${p.telefone.replace(/\D/g,'')}" target="_blank">${esc(p.telefone)}</a>`:'—'}</td>
      <td>${esc(p.cidade||'—')}</td>
      <td>${p.nota?'⭐'.repeat(Math.min(+p.nota,5)):'—'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-xs btn-outline" onclick="editarPrestador(${i})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-xs btn-danger" onclick="apagarPrestador(${i})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
}
const TIPOS_PRESTADOR_BASE=['Limpeza','Fotógrafo','Hidráulica','Elétrica','Vistoria','Fechadura','Internet','Reforma','Outros'];
function _tiposPrestadorDisponiveis(){
  return[...new Set([...TIPOS_PRESTADOR_BASE,...prestadores.map(p=>p.tipo).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function _atualizarListaTiposPrestador(){
  const dl=document.getElementById('pr-tipo-list');
  if(dl)dl.innerHTML=_tiposPrestadorDisponiveis().map(t=>`<option value="${esc(t)}">`).join('');
}
function abrirNovoPrestador(){
  _editPrestadorIdx=null;
  ['pr-nome','pr-tipo','pr-cidade','pr-tel','pr-obs','pr-valor'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const av=document.getElementById('pr-avaliacao');if(av)av.value='5';
  _atualizarListaTiposPrestador();
  document.getElementById('modal-prestador').classList.add('open');
}
function editarPrestador(idx){
  _editPrestadorIdx=idx;const p=prestadores[idx];if(!p)return;
  document.getElementById('pr-nome').value=p.nome||'';
  const tipEl=document.getElementById('pr-tipo');if(tipEl)tipEl.value=p.tipo||'Limpeza';
  document.getElementById('pr-tel').value=p.telefone||'';
  document.getElementById('pr-cidade').value=p.cidade||'';
  const av=document.getElementById('pr-avaliacao');if(av)av.value=p.nota||'5';
  document.getElementById('pr-obs').value=p.obs||'';
  const vl=document.getElementById('pr-valor');if(vl)vl.value=p.valor||'';
  _atualizarListaTiposPrestador();
  document.getElementById('modal-prestador').classList.add('open');
}
function salvarPrestador(){
  const nome=document.getElementById('pr-nome').value.trim();
  if(!nome){showToast('Informe o nome.','peach');return;}
  const p={nome,
    tipo:document.getElementById('pr-tipo')?.value||'',
    telefone:document.getElementById('pr-tel')?.value.trim()||'',
    cidade:document.getElementById('pr-cidade')?.value.trim()||'',
    nota:+document.getElementById('pr-avaliacao')?.value||5,
    valor:document.getElementById('pr-valor')?.value.trim()||'',
    obs:document.getElementById('pr-obs')?.value.trim()||''};
  if(_editPrestadorIdx!=null)prestadores[_editPrestadorIdx]=p;
  else prestadores.push(p);
  saveAll();closeModal('modal-prestador');renderIntel();renderFornecedores();showToast('Prestador salvo!','sage');
}
function apagarPrestador(idx){
  if(!confirm('Apagar este prestador?'))return;
  prestadores.splice(idx,1);saveAll();renderIntel();renderFornecedores();showToast('Removido.','peach');
}

// ═══════════════════ VISTORIA ═══════════════════
// Vistorias vivem em im.vistorias[] (sincronizado normalmente via wc_imoveis), cada uma
// com token próprio — mesmo padrão do formToken do proprietário (ver _formUrl). Isso
// permite mandar o link pra um vistoriador externo sem expor o token mestre do sistema.
let _vistoriasMigradas=false;
function _migrarVistoriasParaImoveis(){
  // Uma vez só: puxa vistorias do formato antigo (localStorage puro, sem sync) pra dentro
  // do imóvel correspondente. Duas origens possíveis nesse localStorage:
  //  - vistoria_final_<chave>  → já tinha sido enviada (vira histórico só-leitura, sem token)
  //  - vistoria_draft_<imovelId> → ainda em rascunho, nunca enviada (vira rascunho de verdade,
  //    com token novo, pra dar pra continuar preenchendo por um link)
  if(_vistoriasMigradas)return;
  _vistoriasMigradas=true;
  let alterou=false;
  const porImovel={};
  imoveis.forEach(im=>{(im.vistorias||[]).forEach(v=>{if(v.legado)porImovel[v.id]=true;});});
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key)continue;
    if(key.startsWith('vistoria_final_')){
      if(porImovel[key])continue;
      try{
        const d=JSON.parse(localStorage.getItem(key)||'{}');
        const im=imoveis.find(x=>x.id===(d.imovelId||''));
        if(!im)continue;
        if(!im.vistorias)im.vistorias=[];
        if(im.vistorias.some(v=>v.id===key))continue;
        im.vistorias.push({
          id:key, legado:true, status:'enviado',
          criadoEm:d.sentAt||d.savedAt||new Date().toISOString(),
          enviadoEm:d.sentAt||d.savedAt||new Date().toISOString(),
          dados:d
        });
        alterou=true;
      }catch(e){}
    } else if(key.startsWith('vistoria_draft_')){
      if(porImovel[key])continue;
      try{
        const imovelId=key.slice('vistoria_draft_'.length);
        const d=JSON.parse(localStorage.getItem(key)||'{}');
        const im=imoveis.find(x=>x.id===imovelId);
        if(!im||!d||!Object.keys(d).length)continue;
        if(!im.vistorias)im.vistorias=[];
        if(im.vistorias.some(v=>v.id===key))continue;
        im.vistorias.push({
          id:key, legado:true, status:'rascunho',
          token:uid()+uid(),
          criadoEm:d.savedAt||new Date().toISOString(),
          comodosSnapshot:_getComodosImovel(im),
          dados:d
        });
        alterou=true;
      }catch(e){}
    }
  }
  if(alterou)saveAll();
}
function _vistoriaUrl(im,v){
  const base=location.origin+location.pathname.replace(/[^/]*$/,'');
  return`${base}vistoria.html?id=${im.id}&vid=${v.id}&t=${v.token}`;
}
function _mostrarLinkVistoria(im,v){
  const url=_vistoriaUrl(im,v);
  document.getElementById('generico-titulo').textContent='Link da Vistoria';
  document.getElementById('generico-body').innerHTML=`<div class="form-grid">
    <div class="form-group" style="grid-column:1/-1;">
      <label>Link para enviar ao vistoriador</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="input" readonly value="${esc(url)}" onclick="this.select()">
        <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText('${esc(url)}').then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i></button>
        <a href="${esc(url)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i></a>
        <a href="https://wa.me/?text=${encodeURIComponent('Olá! Segue o link da vistoria do imóvel '+(im.nome||im.id)+': '+url)}" target="_blank" class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;"><i class="fa-brands fa-whatsapp"></i></a>
      </div>
      <div class="hint">Quem abrir esse link não precisa de login e só enxerga essa vistoria — sem acesso ao resto do sistema. O progresso salva sozinho no servidor conforme ele preenche.</div>
    </div>
  </div>`;
  document.getElementById('modal-generico').classList.add('open');
}
function _verDetalhesVistoria(imovelId,vistoriaId){
  const im=imoveis.find(i=>i.id===imovelId);
  const v=im?.vistorias?.find(x=>x.id===vistoriaId);
  if(!im||!v)return;
  const d=v.dados||{};
  const aptoLabel={sim:'✓ Apto para operação',nao:'✗ Não apto — pendências'}[d.aptoPara]||'—';
  const comodosHtml=(d.comodos||[]).map(c=>{
    const extras=Object.entries(c.camposExtras||{}).filter(([,val])=>val!==''&&val!==false&&val!=null);
    const midias=Array.isArray(c.midiaFrames)?c.midiaFrames:[];
    return`<div style="padding:8px 0;border-bottom:1px solid var(--border);">
      <strong>${esc(c.nome)}</strong>${c.irregularidade?`<div style="color:var(--rose);font-size:12.5px;">⚠ ${esc(c.irregularidade)}</div>`:''}
      ${extras.length?`<div style="font-size:12.5px;color:var(--text-muted);">${extras.map(([k,val])=>`${esc(k)}: ${val===true?'✓':esc(String(val))}`).join(' · ')}</div>`:''}
      ${midias.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${midias.map(f=>`<img src="data:image/jpeg;base64,${f}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer;" onclick="window.open('data:image/jpeg;base64,${f}','_blank')">`).join('')}</div>`:''}
    </div>`;
  }).join('')||'<div class="text-muted" style="font-size:13px;">Sem detalhes de cômodos registrados.</div>';
  const geraisHtml=Object.entries(d.camposGerais||{}).filter(([,val])=>val!==''&&val!==false&&val!=null)
    .map(([k,val])=>`<div>${esc(k)}: <strong>${val===true?'Sim':esc(String(val))}</strong></div>`).join('')||'';
  document.getElementById('generico-titulo').textContent='Detalhes da Vistoria';
  document.getElementById('generico-body').innerHTML=`<div class="form-grid">
    <div class="form-group" style="grid-column:1/-1;">
      <div><strong>${esc(im.nome)}</strong> · ${fmtDate(d.data)} · ${esc(d.vistoriador||'—')}</div>
      <div style="margin-top:4px;">${aptoLabel}</div>
      ${geraisHtml?`<div style="margin-top:8px;font-size:13px;">${geraisHtml}</div>`:''}
      ${d.obsFinais?`<div class="hint" style="margin-top:8px;">${esc(d.obsFinais)}</div>`:''}
      <div style="margin-top:12px;">${comodosHtml}</div>
    </div>
  </div>`;
  document.getElementById('modal-generico').classList.add('open');
}
// ═══════════════════ CALENDÁRIO ═══════════════════
const CAL_TIPOS=[
  {key:'fotos',    label:'Fotos',    icon:'fa-camera',        cor:'gold'},
  {key:'limpeza',  label:'Limpeza',  icon:'fa-broom',         cor:'sage'},
  {key:'vistoria', label:'Vistoria', icon:'fa-clipboard-list',cor:'sky'},
];
let _calMesRef=null; // 'YYYY-MM'; null = mês atual
function _calMesAtual(){return _calMesRef||hoje().slice(0,7);}
function calendarioMudarMes(delta){
  const[y,m]=_calMesAtual().split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  _calMesRef=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  renderCalendario();
}
function calendarioIrParaHoje(){_calMesRef=null;renderCalendario();}
function _calEventosDoMes(mes){
  const eventos={};
  imoveis.filter(im=>im.status!=='perdido').forEach(im=>{
    CAL_TIPOS.forEach(t=>{
      const data=im.ops?.[t.key]?.data;
      if(data&&data.slice(0,7)===mes){
        if(!eventos[data])eventos[data]=[];
        eventos[data].push({...t,imovel:im.nome,imovelId:im.id,responsavel:im.ops[t.key].responsavel||''});
      }
    });
    (im.eventosExtras||[]).forEach(ev=>{
      if(ev.data&&ev.data.slice(0,7)===mes){
        if(!eventos[ev.data])eventos[ev.data]=[];
        eventos[ev.data].push({key:'extra',label:ev.titulo,icon:'fa-calendar-check',cor:'rose',imovel:im.nome,imovelId:im.id,responsavel:ev.responsavel||''});
      }
    });
  });
  return eventos;
}
function renderCalendario(){
  const wrap=document.getElementById('calendario-wrap');
  if(!wrap)return;
  const mes=_calMesAtual();
  const[ano,mesNum]=mes.split('-').map(Number);
  const eventos=_calEventosDoMes(mes);
  const primeiroDia=new Date(ano,mesNum-1,1);
  const diasNoMes=new Date(ano,mesNum,0).getDate();
  const diaSemanaInicio=primeiroDia.getDay();
  const nomesMes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const hojeStr=hoje();
  const celulas=[];
  for(let i=0;i<diaSemanaInicio;i++)celulas.push('<div class="cal-dia cal-dia-vazio"></div>');
  for(let d=1;d<=diasNoMes;d++){
    const dataStr=mes+'-'+String(d).padStart(2,'0');
    const evsDia=eventos[dataStr]||[];
    celulas.push(`<div class="cal-dia${dataStr===hojeStr?' cal-dia-hoje':''}">
      <div class="cal-dia-num">${d}</div>
      <div class="cal-dia-eventos">
        ${evsDia.map(e=>`<div class="cal-evento tag-${e.cor}" title="${esc(e.label)} · ${esc(e.imovel)}${e.responsavel?' · '+esc(e.responsavel):''}" onclick="abrirDetalhe('${e.imovelId}')">
          <i class="fa-solid ${e.icon}"></i> ${esc(e.imovel)}
        </div>`).join('')}
      </div>
    </div>`);
  }
  while(celulas.length%7!==0)celulas.push('<div class="cal-dia cal-dia-vazio"></div>');

  wrap.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
    <div class="section-title" style="margin-bottom:0;">Calendário de Fotos, Limpeza e Vistoria</div>
    <div style="display:flex;align-items:center;gap:10px;">
      <button class="btn btn-outline btn-sm" onclick="calendarioMudarMes(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <span style="font-weight:700;min-width:150px;text-align:center;">${nomesMes[mesNum-1]} de ${ano}</span>
      <button class="btn btn-outline btn-sm" onclick="calendarioMudarMes(1)"><i class="fa-solid fa-chevron-right"></i></button>
      <button class="btn btn-sm btn-outline" onclick="calendarioIrParaHoje()">Hoje</button>
    </div>
  </div>
  <div style="display:flex;gap:16px;margin-bottom:12px;font-size:12px;align-items:center;">
    ${CAL_TIPOS.map(t=>`<span style="display:flex;align-items:center;gap:5px;"><span class="tag tag-${t.cor}" style="padding:2px 6px;"><i class="fa-solid ${t.icon}"></i></span> ${t.label}</span>`).join('')}
    <span style="display:flex;align-items:center;gap:5px;"><span class="tag tag-rose" style="padding:2px 6px;"><i class="fa-solid fa-calendar-check"></i></span> Outros eventos</span>
  </div>
  <div class="cal-grid cal-grid-header">
    ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<div class="cal-dia-semana">${d}</div>`).join('')}
  </div>
  <div class="cal-grid">${celulas.join('')}</div>`;
}

function renderVistoria(){
  _migrarVistoriasParaImoveis();
  const imoveisAtivos=imoveis.filter(im=>im.status!=='perdido');
  const todasVistorias=imoveisAtivos.flatMap(im=>(im.vistorias||[]).map(v=>({...v,imovelId:im.id,imovelNome:im.nome})))
    .sort((a,b)=>(b.criadoEm||'').localeCompare(a.criadoEm||''));

  const linhas=todasVistorias.length?todasVistorias.map(v=>{
    const d=v.dados||{};
    const enviado=v.status==='enviado';
    const statusTag=enviado?'<span class="tag tag-sage">Enviado</span>':'<span class="tag tag-gold">Rascunho</span>';
    const cor=d.aptoPara==='sim'?'sage':d.aptoPara==='nao'?'rose':null;
    const aptoTag=cor?`<span class="tag tag-${cor}">${d.aptoPara==='sim'?'Apto':'Não apto'}</span>`:'—';
    const acaoPrincipal=enviado
      ?`<button class="btn btn-xs btn-outline" onclick="_verDetalhesVistoria('${esc(v.imovelId)}','${esc(v.id)}')"><i class="fa-solid fa-eye"></i> Detalhes</button>`
      :(v.token?`<button class="btn btn-xs btn-outline" onclick="_mostrarLinkVistoria(imoveis.find(i=>i.id==='${esc(v.imovelId)}'),imoveis.find(i=>i.id==='${esc(v.imovelId)}').vistorias.find(x=>x.id==='${esc(v.id)}'))"><i class="fa-solid fa-link"></i> Copiar link</button>`:'—');
    return`<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:10px 8px;font-weight:600;">${esc(v.imovelNome||v.imovelId)}</td>
      <td style="padding:10px 8px;">${fmtDate(d.data)||'—'}</td>
      <td style="padding:10px 8px;">${esc(d.vistoriador||'—')}</td>
      <td style="padding:10px 8px;">${statusTag}</td>
      <td style="padding:10px 8px;">${aptoTag}</td>
      <td style="padding:10px 8px;">${d.pendencias?.length||0} pendência(s)</td>
      <td style="padding:10px 8px;white-space:nowrap;">${acaoPrincipal}
        <button onclick="removerVistoria('${esc(v.imovelId)}','${esc(v.id)}')" title="Apagar vistoria" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px 6px;border-radius:4px;" onmouseover="this.style.color='var(--rose)'" onmouseout="this.style.color='var(--text-muted)'"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join(''):
  `<tr><td colspan="7" style="padding:32px;text-align:center;color:var(--text-muted);">Nenhuma vistoria registrada ainda.</td></tr>`;

  document.getElementById('vistoria-wrap').innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
    <div>
      <div class="section-title" style="margin-bottom:4px;">Vistorias de Onboarding</div>
      <div class="text-muted">Gere um link seguro pra um vistoriador preencher, sem precisar de login</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <select id="vistoria-select-imovel" class="input" style="min-width:200px;">
        <option value="">Selecionar imóvel…</option>
        ${imoveisAtivos.map(im=>`<option value="${esc(im.id)}">${esc(im.nome)}</option>`).join('')}
      </select>
      <button class="btn btn-rose" onclick="iniciarVistoria()">
        <i class="fa-solid fa-plus"></i> Nova Vistoria
      </button>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</span></div>
    <div class="card-body" style="padding:0;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:var(--surface-2);">
          <th style="padding:8px;text-align:left;">Imóvel</th>
          <th style="padding:8px;text-align:left;">Data</th>
          <th style="padding:8px;text-align:left;">Vistoriador</th>
          <th style="padding:8px;text-align:left;">Status</th>
          <th style="padding:8px;text-align:left;">Resultado</th>
          <th style="padding:8px;text-align:left;">Pendências</th>
          <th style="padding:8px;width:120px;"></th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  </div>`;
}
function removerVistoria(imovelId,vistoriaId){
  const im=imoveis.find(i=>i.id===imovelId);
  if(!im||!im.vistorias)return;
  if(!confirm('Apagar esta vistoria? Esta ação não pode ser desfeita.'))return;
  im.vistorias=im.vistorias.filter(v=>v.id!==vistoriaId);
  saveAll();renderVistoria();showToast('Vistoria removida.','peach');
}
function iniciarVistoria(){
  const id=document.getElementById('vistoria-select-imovel')?.value;
  if(!id){showToast('Selecione um imóvel.','peach');return;}
  const im=imoveis.find(i=>i.id===id);
  if(!im){showToast('Imóvel não encontrado.','peach');return;}
  const v={
    id:'vist_'+uid()+uid(),
    token:uid()+uid(),
    criadoEm:new Date().toISOString(),
    status:'rascunho',
    comodosSnapshot:_getComodosImovel(im),
    dados:{}
  };
  if(!im.vistorias)im.vistorias=[];
  im.vistorias.push(v);
  saveAll();
  renderVistoria();
  _mostrarLinkVistoria(im,v);
}

// ═══════════════════ FORNECEDORES ═══════════════════
function renderFornecedores(){
  const tipos=_tiposPrestadorDisponiveis();
  const filtroTipo=document.getElementById('forn-filtro-tipo')?.value||'';
  const filtroCidade=document.getElementById('forn-filtro-cidade')?.value?.toLowerCase()||'';
  const lista=prestadores.filter(p=>
    (!filtroTipo||p.tipo===filtroTipo)&&
    (!filtroCidade||((p.cidade||'').toLowerCase().includes(filtroCidade)))
  );
  const wrap=document.getElementById('fornecedores-wrap');
  if(!wrap)return;
  wrap.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
    <div>
      <div class="section-title" style="margin-bottom:4px;">Fornecedores</div>
      <div class="text-muted">Banco de prestadores de serviço WeCare (${prestadores.length} cadastrados)</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-sm" onclick="abrirManualFornecedores()"><i class="fa-solid fa-book"></i> Manual</button>
      <button class="btn btn-rose btn-sm" onclick="abrirNovoPrestador()"><i class="fa-solid fa-plus"></i> Novo Fornecedor</button>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fa-solid fa-filter" style="color:var(--text3)"></i> Filtros</span>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <select class="form-select" id="forn-filtro-tipo" onchange="renderFornecedores()" style="width:140px;padding:4px 8px;font-size:12px;">
          <option value="">Todos os tipos</option>
          ${tipos.map(t=>`<option${filtroTipo===t?' selected':''}>${t}</option>`).join('')}
        </select>
        <input class="form-input" id="forn-filtro-cidade" placeholder="Filtrar cidade..." style="width:140px;padding:4px 8px;font-size:12px;" oninput="renderFornecedores()" value="${filtroCidade}">
      </div>
    </div>
    <div class="card-body" style="overflow-x:auto;">
      ${lista.length?`<table style="width:100%;font-size:13px;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid var(--border)">
          <th style="text-align:left;padding:8px 6px;">Nome</th><th>Tipo</th><th>Telefone</th><th>Cidade</th><th>Valor</th><th>Nota</th><th>Obs</th><th></th>
        </tr></thead>
        <tbody>${lista.map((p,i)=>{
          const origIdx=prestadores.indexOf(p);
          return`<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 6px;font-weight:600;">${esc(p.nome)}</td>
            <td><span class="tag tag-lav">${esc(p.tipo)}</span></td>
            <td>${p.telefone?`<a href="https://wa.me/55${p.telefone.replace(/\D/g,'')}" target="_blank" style="color:var(--sage);"><i class="fa-brands fa-whatsapp"></i> ${esc(p.telefone)}</a>`:'—'}</td>
            <td>${esc(p.cidade||'—')}</td>
            <td>${esc(p.valor||'—')}</td>
            <td>${p.nota?'⭐'.repeat(Math.min(+p.nota,5)):'—'}</td>
            <td style="max-width:180px;font-size:11.5px;color:var(--text3);">${esc((p.obs||'').slice(0,80))}${(p.obs||'').length>80?'…':''}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn-xs btn-outline" onclick="editarPrestador(${origIdx})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-xs btn-danger" onclick="apagarPrestador(${origIdx})"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;}).join('')}</tbody>
      </table>`:`<div class="empty-state" style="padding:32px;text-align:center;font-size:13px;color:var(--text-muted);">
        Nenhum fornecedor encontrado.<br><button class="btn btn-sm btn-rose" style="margin-top:12px;" onclick="abrirNovoPrestador()"><i class="fa-solid fa-plus"></i> Adicionar primeiro fornecedor</button>
      </div>`}
    </div>
  </div>`;
}
function abrirManualFornecedores(){
  document.getElementById('manual-forn-texto').value=manualFornecedores;
  document.getElementById('modal-manual-fornecedores').classList.add('open');
}
function salvarManualFornecedores(){
  manualFornecedores=document.getElementById('manual-forn-texto').value;
  saveAll();
  closeModal('modal-manual-fornecedores');
  showToast('Manual salvo.');
}

// ═══════════════════ INFORMAÇÕES ═══════════════════
function renderInformacoes(){
  const wrap=document.getElementById('informacoes-wrap');
  if(!wrap)return;
  wrap.innerHTML=`
  <div class="tabs-bar" style="padding:0;margin-bottom:16px;">
    <button class="tab-btn${_infoTabAtiva==='mensagens'?' active':''}" onclick="showInfoTab('mensagens',this)"><i class="fa-solid fa-comment"></i> Mensagens</button>
    <button class="tab-btn${_infoTabAtiva==='processo'?' active':''}" onclick="showInfoTab('processo',this)"><i class="fa-solid fa-diagram-project"></i> Processo</button>
    <button class="tab-btn${_infoTabAtiva==='anotacoes'?' active':''}" onclick="showInfoTab('anotacoes',this)"><i class="fa-solid fa-note-sticky"></i> Anotações</button>
  </div>
  <div id="info-tab-content"></div>`;
  renderInfoTabContent();
}
function showInfoTab(tab,btn){
  _infoTabAtiva=tab;
  document.querySelectorAll('#informacoes-wrap .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderInfoTabContent();
}
function renderInfoTabContent(){
  const c=document.getElementById('info-tab-content');
  if(!c)return;
  if(_infoTabAtiva==='mensagens')c.innerHTML=renderInfoMensagensHTML();
  else if(_infoTabAtiva==='processo')c.innerHTML=editorRicoHTML('processo',processoTexto);
  else if(_infoTabAtiva==='anotacoes')c.innerHTML=editorRicoHTML('anotacoes',anotacoesTexto);
}

// ── Mensagens (templates) ──
function renderInfoMensagensHTML(){
  return `
  <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
    <button class="btn btn-rose btn-sm" onclick="abrirNovoTemplateMsg()"><i class="fa-solid fa-plus"></i> Novo Template</button>
  </div>
  ${templatesMsg.length?templatesMsg.map((t,i)=>`
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        <span class="card-title">${esc(t.nome)}</span>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="btn btn-xs" onclick="copiarTemplateMsg(${i})" title="Copiar texto"><i class="fa-solid fa-copy"></i></button>
          <button class="btn btn-xs btn-outline" onclick="editarTemplateMsg(${i})"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-xs btn-danger" onclick="apagarTemplateMsg(${i})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="card-body" style="white-space:pre-wrap;font-size:13px;color:var(--text-2);">${esc(t.texto)}</div>
    </div>
  `).join(''):`<div class="empty-state" style="padding:32px;text-align:center;font-size:13px;color:var(--text-muted);">
    Nenhum template cadastrado.<br><button class="btn btn-sm btn-rose" style="margin-top:12px;" onclick="abrirNovoTemplateMsg()"><i class="fa-solid fa-plus"></i> Adicionar primeiro template</button>
  </div>`}`;
}
function abrirNovoTemplateMsg(){
  _editTemplateMsgIdx=null;
  document.getElementById('modal-template-msg-title').textContent='Novo Template';
  document.getElementById('tpl-nome').value='';
  document.getElementById('tpl-texto').value='';
  document.getElementById('modal-template-msg').classList.add('open');
}
function editarTemplateMsg(idx){
  _editTemplateMsgIdx=idx;
  const t=templatesMsg[idx];
  document.getElementById('modal-template-msg-title').textContent='Editar Template';
  document.getElementById('tpl-nome').value=t.nome;
  document.getElementById('tpl-texto').value=t.texto;
  document.getElementById('modal-template-msg').classList.add('open');
}
function salvarTemplateMsg(){
  const nome=document.getElementById('tpl-nome').value.trim();
  const texto=document.getElementById('tpl-texto').value.trim();
  if(!nome||!texto){showToast('Preencha nome e texto do template.','erro');return;}
  if(_editTemplateMsgIdx!=null)templatesMsg[_editTemplateMsgIdx]={nome,texto};
  else templatesMsg.push({nome,texto});
  saveAll();
  closeModal('modal-template-msg');
  renderInfoTabContent();
  showToast('Template salvo.');
}
function apagarTemplateMsg(idx){
  if(!confirm('Apagar este template?'))return;
  templatesMsg.splice(idx,1);
  saveAll();
  renderInfoTabContent();
}
function copiarTemplateMsg(idx){
  navigator.clipboard.writeText(templatesMsg[idx].texto).then(()=>showToast('Texto copiado.'));
}

// ── Editor de texto rico (Processo / Anotações) ──
function editorRicoHTML(campo,valorHtml){
  return `
  <div class="card">
    <div class="rich-editor-toolbar">
      <button type="button" class="btn btn-xs" onclick="richExec('${campo}','bold')" title="Negrito"><i class="fa-solid fa-bold"></i></button>
      <button type="button" class="btn btn-xs" onclick="richExec('${campo}','italic')" title="Itálico"><i class="fa-solid fa-italic"></i></button>
      <button type="button" class="btn btn-xs" onclick="richExec('${campo}','formatBlock','H3')" title="Título"><i class="fa-solid fa-heading"></i></button>
      <button type="button" class="btn btn-xs" onclick="richExec('${campo}','insertUnorderedList')" title="Lista"><i class="fa-solid fa-list-ul"></i></button>
      <button type="button" class="btn btn-xs" onclick="richExec('${campo}','insertOrderedList')" title="Lista numerada"><i class="fa-solid fa-list-ol"></i></button>
      <button type="button" class="btn btn-xs" onclick="richExec('${campo}','formatBlock','P')" title="Parágrafo normal">¶</button>
    </div>
    <div class="rich-editor-body" id="rich-${campo}" contenteditable="true" oninput="richSalvar('${campo}')">${valorHtml||''}</div>
  </div>`;
}
function richExec(campo,cmd,val){
  document.getElementById('rich-'+campo).focus();
  document.execCommand(cmd,false,val||null);
  richSalvar(campo);
}
let _richSalvarTimer=null;
function richSalvar(campo){
  const html=document.getElementById('rich-'+campo).innerHTML;
  if(campo==='processo')processoTexto=html;
  else if(campo==='anotacoes')anotacoesTexto=html;
  clearTimeout(_richSalvarTimer);
  _richSalvarTimer=setTimeout(saveAll,600);
}

// ═══════════════════ CONFIG ═══════════════════
function renderConfig(){
  // ── Membros da equipe ──
  const mb=document.getElementById('config-membros');
  if(mb){
    const lista=membros||[];
    mb.innerHTML=(lista.length?`<table style="width:100%;font-size:12.5px;border-collapse:collapse;">`+
      lista.map((m,i)=>`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:6px 4px;">${esc(m.nome)}<br><span style="font-size:11px;color:var(--text-muted);">${esc(m.email||'')}</span></td>
        <td style="padding:6px 4px;color:var(--text-muted);">${esc(m.funcao||'')}</td>
        <td style="padding:4px;text-align:right;"><button class="btn btn-xs btn-danger" onclick="apagarMembro(${i})"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')+`</table>`
      :`<div class="text-muted" style="font-size:12px;padding:4px 0;">Nenhum membro cadastrado ainda.</div>`);
  }

  const ci=document.getElementById('config-itens');
  if(!ci)return;
  const baseOpts=['colchao','leito','banheiro-completo','banheiro','lavabo','quarto','andar','hospede','cada2hospede','unidade'];
  const baseLabels={
    'colchao':'por colchão','leito':'por leito (cama/beliche)',
    'banheiro-completo':'por banh. completo','banheiro':'por banheiro (total)',
    'lavabo':'por lavabo','quarto':'por quarto','andar':'por andar',
    'hospede':'por hóspede','cada2hospede':'a cada 2 hóspedes',
    'unidade':'unidade fixa (1 por apê)'
  };
  const modalOpts=[['comprado','Comprado'],['flashee','Flashee'],['intense','Intense']];
  ci.innerHTML=`<table style="width:100%;font-size:12px;border-collapse:collapse;">
    <thead><tr style="border-bottom:2px solid var(--border);">
      <th style="text-align:left;padding:6px 4px;">Item</th>
      <th style="text-align:center;padding:6px 4px;width:64px;">Qtd</th>
      <th style="text-align:left;padding:6px 4px;">Base de cálculo</th>
      <th style="text-align:left;padding:6px 4px;">Modalidades (vazio = sempre aparece)</th>
      <th style="padding:6px 4px;width:36px;"></th>
    </tr></thead>
    <tbody>${ITENS_COMPRAS.map((item,i)=>{
      const dash=item.qtdRule.indexOf('-');
      const n=item.qtdRule.slice(0,dash);
      const base=item.qtdRule.slice(dash+1);
      const modalidades=item.modalidades||[];
      return`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:5px 4px;"><span style="font-size:10px;color:var(--text-muted);">${esc(item.cat)}</span><br>${esc(item.nome)}</td>
        <td style="padding:5px 4px;text-align:center;"><input id="ci-n-${i}" type="number" class="input" value="${n}" min="1" style="width:52px;text-align:center;padding:2px 4px;font-size:12px;"></td>
        <td style="padding:5px 4px;">
          <select id="ci-base-${i}" class="input" style="font-size:12px;padding:4px 6px;">
            ${baseOpts.map(b=>`<option value="${b}"${b===base?' selected':''}>${baseLabels[b]||b}</option>`).join('')}
          </select>
        </td>
        <td style="padding:5px 4px;white-space:nowrap;">
          ${modalOpts.map(([v,lbl])=>`<label style="font-size:11px;margin-right:8px;"><input type="checkbox" id="ci-modal-${v}-${i}"${modalidades.includes(v)?' checked':''}> ${lbl}</label>`).join('')}
        </td>
        <td style="padding:5px 4px;white-space:nowrap;">
          <button class="btn btn-xs btn-sage" onclick="salvarRegra(${i})" title="Salvar esta linha"><i class="fa-solid fa-check"></i></button>
          <button class="btn btn-xs btn-danger" onclick="apagarItemConfig(${i})" title="Apagar item" style="margin-left:4px;"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>
  <div style="margin-top:12px;text-align:right;">
    <button class="btn btn-sm btn-sage" onclick="salvarTodasRegras()"><i class="fa-solid fa-floppy-disk"></i> Salvar todas as regras</button>
  </div>`;

  // ── Preços Fixos (preço unitário de cada item fixo) ──
  const cp=document.getElementById('config-precos');
  if(cp){
    const fixos=ITENS_COMPRAS.filter(it=>it.tipoPreco==='fixo');
    cp.innerHTML=`<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">Preço unitário de cada item de compras (itens com preço fixo, não enxoval). Clique em ✓ para salvar.</div>`+
      `<table style="width:100%;font-size:12px;border-collapse:collapse;">
      <thead><tr style="border-bottom:2px solid var(--border);">
        <th style="text-align:left;padding:5px 4px;">Item</th>
        <th style="text-align:right;padding:5px 4px;width:90px;">Preço (R$)</th>
        <th style="padding:5px 4px;width:32px;"></th>
      </tr></thead><tbody>`+
      fixos.map((item)=>{
        const idx=ITENS_COMPRAS.indexOf(item);
        return`<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:4px;"><span style="font-size:10px;color:var(--text-muted);">${esc(item.cat)}</span><br>${esc(item.nome)}</td>
          <td style="padding:4px;"><input id="cp-preco-${idx}" type="number" min="0" step="0.01" class="input" value="${item.preco||0}" style="width:80px;text-align:right;padding:3px 5px;font-size:12px;"></td>
          <td style="padding:4px;"><button class="btn btn-xs btn-sage" onclick="salvarPrecoFixo(${idx})"><i class="fa-solid fa-check"></i></button></td>
        </tr>`;
      }).join('')+`</tbody></table>`;
  }

  // ── Preços Enxoval por Tamanho ──
  const pe=document.getElementById('config-precos-enxoval');
  if(pe){
    const sizes=['Solteiro','Casal','Queen','King'];
    pe.innerHTML=`<table style="width:100%;font-size:12px;border-collapse:collapse;">
      <thead><tr style="border-bottom:2px solid var(--border);">
        <th style="text-align:left;padding:5px 4px;">Item</th>`+
        sizes.map(s=>`<th style="text-align:right;padding:5px 4px;width:68px;">${s}</th>`).join('')+
        `<th style="padding:5px 4px;width:48px;"></th>
      </tr></thead><tbody>`+
      Object.entries(PRECOS_ENXOVAL).map(([nome,tabela])=>
        `<tr style="border-bottom:1px solid var(--border);" id="enx-row-${CSS.escape(nome)}">
          <td style="padding:4px;">${esc(nome)}</td>`+
          sizes.map(s=>`<td style="padding:4px;"><input id="enx-${CSS.escape(nome)}-${s}" type="number" min="0" step="1" class="input" value="${tabela[s]||0}" style="width:60px;text-align:right;padding:3px 4px;font-size:12px;"></td>`).join('')+
          `<td style="padding:4px;white-space:nowrap;">
            <button class="btn btn-xs btn-sage" onclick="salvarPrecoEnxoval('${esc(nome)}')" title="Salvar"><i class="fa-solid fa-check"></i></button>
            <button class="btn btn-xs btn-danger" onclick="apagarPrecoEnxoval('${esc(nome)}')" title="Apagar" style="margin-left:3px;"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`
      ).join('')+
      `</tbody></table>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input id="enx-novo-nome" class="input" placeholder="Nome do item enxoval" style="flex:1;min-width:160px;font-size:12px;">
        <button class="btn btn-sm btn-sage" onclick="adicionarPrecoEnxoval()"><i class="fa-solid fa-plus"></i> Adicionar</button>
      </div>`;
  }

  // ── Tabela de Primeira Limpeza e Fotos ──
  const po=document.getElementById('config-precos-ops');
  if(po){
    const limpRows=PRECOS_PRIMEIRA_LIMPEZA.map(r=>
        `<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:4px;"><input id="limp-${r.id}-q" type="number" min="1" class="input" value="${r.quartos}" style="width:56px;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;"><input id="limp-${r.id}-empresa" class="input" value="${esc(r.empresa)}" style="width:100%;min-width:100px;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;text-align:right;"><input id="limp-${r.id}-c" type="number" min="0" class="input" value="${r.custo}" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;text-align:right;"><input id="limp-${r.id}-r" type="number" min="0" class="input" value="${r.cobrado}" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;white-space:nowrap;">
            <button class="btn btn-xs btn-sage" onclick="salvarPrecoLimpeza('${r.id}')" title="Salvar"><i class="fa-solid fa-check"></i></button>
            <button class="btn btn-xs btn-danger" onclick="apagarPrecoLimpeza('${r.id}')" title="Apagar" style="margin-left:3px;"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join('');
    const fotoRows=Object.entries(PRECOS_FOTOS).map(([q,v])=>
      `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:4px;">${q} quarto(s)</td>
        <td style="padding:4px;">${esc(v.resp||'')}</td>
        <td style="padding:4px;text-align:right;"><input id="foto-${q}-min" type="number" min="0" class="input" value="${v.min}" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;text-align:right;"><input id="foto-${q}-max" type="number" min="0" class="input" value="${v.max}" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;white-space:nowrap;">
          <button class="btn btn-xs btn-sage" onclick="salvarPrecoFoto(${q})" title="Salvar"><i class="fa-solid fa-check"></i></button>
          <button class="btn btn-xs btn-danger" onclick="apagarPrecoFoto(${q})" title="Apagar" style="margin-left:3px;"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('');
    po.innerHTML=`
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Primeira Limpeza (implementação)</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid var(--border);">
          <th style="text-align:left;padding:5px 4px;">Qtd Qts</th><th style="text-align:left;padding:5px 4px;">Empresa</th>
          <th style="text-align:right;padding:5px 4px;">Custo</th><th style="text-align:right;padding:5px 4px;">Cobrado</th><th></th>
        </tr></thead><tbody>${limpRows}
        <tr>
          <td style="padding:4px;"><input id="limp-novo-q" type="number" min="1" class="input" placeholder="Qtd" style="width:50px;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;"><input id="limp-novo-empresa" class="input" placeholder="Nome da empresa" style="width:100%;min-width:110px;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;text-align:right;"><input id="limp-novo-c" type="number" min="0" class="input" placeholder="Custo" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;text-align:right;"><input id="limp-novo-r" type="number" min="0" class="input" placeholder="Cobrado" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;"><button class="btn btn-xs btn-sage" onclick="adicionarPrecoLimpeza('limp')" title="Adicionar"><i class="fa-solid fa-plus"></i></button></td>
        </tr>
        </tbody></table>

      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-top:14px;margin-bottom:6px;">Fotos Profissionais</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid var(--border);">
          <th style="text-align:left;padding:5px 4px;">Qtd Qts</th><th style="text-align:left;padding:5px 4px;">Responsável</th>
          <th style="text-align:right;padding:5px 4px;">Mín</th><th style="text-align:right;padding:5px 4px;">Máx</th><th></th>
        </tr></thead><tbody>${fotoRows}
        <tr>
          <td style="padding:4px;"><input id="foto-novo-q" type="number" min="1" class="input" placeholder="Qtd" style="width:50px;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;"><input id="foto-novo-resp" class="input" placeholder="Responsável" style="width:100%;min-width:110px;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;text-align:right;"><input id="foto-novo-min" type="number" min="0" class="input" placeholder="Mín" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;text-align:right;"><input id="foto-novo-max" type="number" min="0" class="input" placeholder="Máx" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
          <td style="padding:4px;"><button class="btn btn-xs btn-sage" onclick="adicionarPrecoFoto()" title="Adicionar"><i class="fa-solid fa-plus"></i></button></td>
        </tr>
        </tbody></table>`;
  }

  // ── Tabela de Limpeza Check-out (espaço próprio) ──
  _renderConfigLimpezaCheckout();
  _renderConfigDefPagadoria();
  _renderConfigVistoriaCampos();
}
function _renderConfigLimpezaCheckout(){
  const el=document.getElementById('config-precos-checkout');
  if(!el)return;
  const linhas=PRECOS_LIMPEZA_CHECKOUT.map(r=>`<tr style="border-bottom:1px solid var(--border);">
    <td style="padding:4px;"><input id="co-${r.id}-empresa" class="input" value="${esc(r.empresa)}" style="width:100%;min-width:100px;padding:3px 4px;font-size:12px;"></td>
    <td style="padding:4px;"><input id="co-${r.id}-espec" class="input" value="${esc(r.especificacao)}" style="width:100%;min-width:140px;padding:3px 4px;font-size:12px;"></td>
    <td style="padding:4px;text-align:right;"><input id="co-${r.id}-custo" type="number" min="0" class="input" value="${r.custo}" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
    <td style="padding:4px;text-align:right;"><input id="co-${r.id}-cobrado" type="number" min="0" class="input" value="${r.cobrado}" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
    <td style="padding:4px;"><input id="co-${r.id}-regiao" class="input" value="${esc(r.regiao||'')}" style="width:100%;min-width:120px;padding:3px 4px;font-size:12px;"></td>
    <td style="padding:4px;white-space:nowrap;">
      <button class="btn btn-xs btn-sage" onclick="salvarLinhaLimpezaCheckout('${r.id}')" title="Salvar"><i class="fa-solid fa-check"></i></button>
      <button class="btn btn-xs btn-danger" onclick="apagarLinhaLimpezaCheckout('${r.id}')" title="Apagar" style="margin-left:3px;"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`).join('');
  el.innerHTML=`
    <div class="hint" style="margin-bottom:8px;">Limpeza feita entre hóspedes (turnover) — diferente da Primeira Limpeza, que é o serviço único de implementação.</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse;">
      <thead><tr style="border-bottom:2px solid var(--border);">
        <th style="text-align:left;padding:5px 4px;">Empresa</th>
        <th style="text-align:left;padding:5px 4px;">Especificação (hóspedes/metragem)</th>
        <th style="text-align:right;padding:5px 4px;">Custo</th>
        <th style="text-align:right;padding:5px 4px;">Cobrado</th>
        <th style="text-align:left;padding:5px 4px;">Região</th>
        <th></th>
      </tr></thead><tbody>${linhas}
      <tr>
        <td style="padding:4px;"><input id="co-novo-empresa" class="input" placeholder="Nome da empresa" style="width:100%;min-width:100px;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;"><input id="co-novo-espec" class="input" placeholder="Ex: até 3 hóspedes, 41-50m²" style="width:100%;min-width:140px;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;text-align:right;"><input id="co-novo-custo" type="number" min="0" class="input" placeholder="Custo" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;text-align:right;"><input id="co-novo-cobrado" type="number" min="0" class="input" placeholder="Cobrado" style="width:68px;text-align:right;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;"><input id="co-novo-regiao" class="input" placeholder="Região" style="width:100%;min-width:120px;padding:3px 4px;font-size:12px;"></td>
        <td style="padding:4px;"><button class="btn btn-xs btn-sage" onclick="adicionarLinhaLimpezaCheckout()" title="Adicionar"><i class="fa-solid fa-plus"></i></button></td>
      </tr>
      </tbody></table>`;
}
function _renderConfigDefPagadoria(){
  const el=document.getElementById('config-def-pagadoria');
  if(!el)return;
  el.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
      <input id="def-op-novo-nome" class="input" placeholder="Nome do serviço..." style="flex:1;">
      <button class="btn btn-sm btn-sage" onclick="_addDefOperacional()"><i class="fa-solid fa-plus"></i> Adicionar</button>
    </div>
    ${!DEF_OPERACIONAIS.length?`<div style="font-size:13px;color:var(--text-muted);">Nenhum serviço cadastrado.</div>`:`
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:var(--surface-2);">
        <th style="padding:7px 10px;text-align:left;">Serviço</th>
        <th style="padding:7px 4px;width:36px;"></th>
      </tr></thead>
      <tbody>
      ${DEF_OPERACIONAIS.map((s,i)=>`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:7px 10px;">${esc(s.nome)}</td>
        <td style="padding:4px;"><button class="btn btn-xs btn-danger" onclick="_removerDefOperacional(${i})"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')}
      </tbody>
    </table>`}`;
}
function _addDefOperacional(){
  const inp=document.getElementById('def-op-novo-nome');
  const nome=(inp?.value||'').trim();
  if(!nome){showToast('Informe o nome do serviço.','peach');return;}
  const id='def_'+nome.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  DEF_OPERACIONAIS.push({id,nome});
  saveAll();_renderConfigDefPagadoria();
  if(inp)inp.value='';
  showToast('Serviço adicionado!','sage');
}
function _removerDefOperacional(i){
  if(!confirm(`Remover "${DEF_OPERACIONAIS[i]?.nome}"?`))return;
  DEF_OPERACIONAIS.splice(i,1);
  saveAll();_renderConfigDefPagadoria();
  showToast('Removido.','peach');
}

// ═══════════════════ CAMPOS EXTRAS DE VISTORIA ═══════════════════
function _renderConfigVistoriaCampos(){
  const el=document.getElementById('config-vistoria-campos');
  if(!el)return;
  const tipoLabel={texto:'Texto',numero:'Número',checkbox:'Sim/Não',select:'Múltipla escolha'};
  el.innerHTML=`
    <div class="hint" style="margin-bottom:10px;">Vídeo por cômodo e irregularidades continuam fixos. Aqui você adiciona campos extras — gerais (uma vez na vistoria) ou por cômodo (repetem em cada cômodo do tipo escolhido).</div>
    <div style="margin-bottom:12px;">
      <button class="btn btn-sm btn-sage" onclick="abrirModalNovoCampoVistoria()"><i class="fa-solid fa-plus"></i> Novo Campo</button>
    </div>
    ${!VISTORIA_CAMPOS.length?`<div style="font-size:13px;color:var(--text-muted);">Nenhum campo extra cadastrado ainda.</div>`:`
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:var(--surface-2);">
        <th style="padding:7px 10px;text-align:left;">Campo</th>
        <th style="padding:7px 10px;text-align:left;">Tipo</th>
        <th style="padding:7px 10px;text-align:left;">Onde aparece</th>
        <th style="padding:7px 4px;width:36px;"></th>
      </tr></thead>
      <tbody>
      ${VISTORIA_CAMPOS.map((c,i)=>`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:7px 10px;">${esc(c.label)}</td>
        <td style="padding:7px 10px;">${tipoLabel[c.tipo]||c.tipo}</td>
        <td style="padding:7px 10px;">${c.escopo==='geral'?'Geral da vistoria':`Cômodo: ${c.comodosTipos==='todos'?'todos':esc((c.comodosTipos||[]).join(', '))}`}</td>
        <td style="padding:4px;"><button class="btn btn-xs btn-danger" onclick="_removerCampoVistoria(${i})"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('')}
      </tbody>
    </table>`}`;
}
function abrirModalNovoCampoVistoria(){
  document.getElementById('generico-titulo').textContent='Novo Campo de Vistoria';
  const comodoChecks=VISTORIA_COMODO_TIPOS.map(t=>`<label class="checkbox-label" style="margin-right:12px;display:inline-flex;"><input type="checkbox" class="campo-vist-comodo-tipo" value="${esc(t)}"> ${esc(t)}</label>`).join('');
  document.getElementById('generico-body').innerHTML=`<div class="form-grid">
    <div class="form-group" style="grid-column:1/-1;"><label>Nome do campo</label><input id="cv-label" class="input" placeholder="Ex: Ar-condicionado (quente/frio)"></div>
    <div class="form-group"><label>Tipo</label>
      <select id="cv-tipo" class="input" onchange="_toggleCampoVistoriaTipoUI()">
        <option value="texto">Texto curto</option>
        <option value="numero">Número</option>
        <option value="checkbox">Sim/Não (check)</option>
        <option value="select">Múltipla escolha</option>
      </select>
    </div>
    <div class="form-group"><label>Onde aparece</label>
      <select id="cv-escopo" class="input" onchange="_toggleCampoVistoriaEscopoUI()">
        <option value="geral">Geral da vistoria (uma vez)</option>
        <option value="comodo">Por cômodo (repete)</option>
      </select>
    </div>
    <div class="form-group" id="cv-opcoes-wrap" style="grid-column:1/-1;display:none;">
      <label>Opções (uma por linha)</label>
      <textarea id="cv-opcoes" class="input" rows="3" placeholder="Excelente&#10;Bom&#10;Regular&#10;Ruim"></textarea>
    </div>
    <div class="form-group" id="cv-comodos-wrap" style="grid-column:1/-1;display:none;">
      <label>Em quais cômodos? (deixe todos desmarcados = aparece em todos)</label>
      <div style="margin-top:6px;">${comodoChecks}</div>
    </div>
    <div style="margin-top:12px;grid-column:1/-1;"><button class="btn btn-sm btn-sage" onclick="_salvarNovoCampoVistoria()"><i class="fa-solid fa-save"></i> Salvar Campo</button></div>
  </div>`;
  document.getElementById('modal-generico').classList.add('open');
}
function _toggleCampoVistoriaTipoUI(){
  const tipo=document.getElementById('cv-tipo').value;
  document.getElementById('cv-opcoes-wrap').style.display=tipo==='select'?'block':'none';
}
function _toggleCampoVistoriaEscopoUI(){
  const escopo=document.getElementById('cv-escopo').value;
  document.getElementById('cv-comodos-wrap').style.display=escopo==='comodo'?'block':'none';
}
function _salvarNovoCampoVistoria(){
  const label=(document.getElementById('cv-label').value||'').trim();
  if(!label){showToast('Informe o nome do campo.','peach');return;}
  const tipo=document.getElementById('cv-tipo').value;
  const escopo=document.getElementById('cv-escopo').value;
  const campo={id:'vc_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),label,tipo,escopo};
  if(tipo==='select'){
    const opcoes=(document.getElementById('cv-opcoes').value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    if(!opcoes.length){showToast('Adicione ao menos uma opção.','peach');return;}
    campo.opcoes=opcoes;
  }
  if(escopo==='comodo'){
    const marcados=[...document.querySelectorAll('.campo-vist-comodo-tipo:checked')].map(c=>c.value);
    campo.comodosTipos=marcados.length?marcados:'todos';
  }
  VISTORIA_CAMPOS.push(campo);
  saveAll();closeModal('modal-generico');_renderConfigVistoriaCampos();
  showToast('Campo de vistoria adicionado!','sage');
}
function _removerCampoVistoria(i){
  const c=VISTORIA_CAMPOS[i];if(!c)return;
  if(!confirm(`Remover o campo "${c.label}"?`))return;
  VISTORIA_CAMPOS.splice(i,1);
  saveAll();_renderConfigVistoriaCampos();
  showToast('Campo removido.','peach');
}
function _lerModalidadesConfig(i){
  const modalidades=['comprado','flashee','intense'].filter(v=>document.getElementById(`ci-modal-${v}-${i}`)?.checked);
  return modalidades.length?modalidades:undefined;
}
function salvarRegra(i){
  const item=ITENS_COMPRAS[i];if(!item)return;
  const n=document.getElementById(`ci-n-${i}`)?.value||'1';
  const base=document.getElementById(`ci-base-${i}`)?.value||'unidade';
  item.qtdRule=`${n}-${base}`;
  item.modalidades=_lerModalidadesConfig(i);
  saveAll();showToast(`"${item.nome}" atualizado!`,'sage');
}
function salvarTodasRegras(){
  ITENS_COMPRAS.forEach((_,i)=>{
    const n=document.getElementById(`ci-n-${i}`)?.value||'1';
    const base=document.getElementById(`ci-base-${i}`)?.value||'unidade';
    ITENS_COMPRAS[i].qtdRule=`${n}-${base}`;
    ITENS_COMPRAS[i].modalidades=_lerModalidadesConfig(i);
  });
  saveAll();showToast('Todas as regras salvas!','sage');
}
function apagarItemConfig(i){
  const item=ITENS_COMPRAS[i];if(!item)return;
  if(!confirm(`Apagar "${item.nome}"?`))return;
  ITENS_COMPRAS.splice(i,1);
  saveAll();renderConfig();showToast('Item removido.','peach');
}
function _limparDados(){
  if(!confirm('ATENÇÃO: Apagar todos os dados locais? Esta ação não pode ser desfeita.'))return;
  ['wc_imoveis','wc_membros','wc_itens','wc_enxoval','wc_prestadores'].forEach(k=>localStorage.removeItem(k));
  imoveis=[];membros=[];prestadores=[];
  renderKanban();renderConfig();showToast('Dados locais apagados.','peach');
}

// ═══════════════════ USUÁRIOS ═══════════════════
function renderUsuarios(){
  carregarUsuarios();
  const w=document.getElementById('usuarios-lista');
  if(!w)return;
  w.innerHTML=`<table style="width:100%;font-size:13px;border-collapse:collapse;">
    <thead><tr style="border-bottom:2px solid var(--border)">
      <th style="text-align:left;padding:8px 6px;">Nome</th><th>E-mail</th><th>Perfil</th><th></th>
    </tr></thead>
    <tbody>${usuarios.map(u=>`<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:8px 6px;font-weight:600;">${esc(u.nome||'—')}</td>
      <td>${esc(u.email)}</td>
      <td><span class="tag tag-lav">${esc(u.perfil)}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-xs btn-outline" onclick="editarUsuario('${esc(u.email)}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-xs btn-danger" onclick="apagarUsuario('${esc(u.email)}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
}
function abrirNovoUsuario(){
  _editUsuarioEmail=null;
  ['u-nome','u-email','u-senha'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const pf=document.getElementById('u-perfil');if(pf)pf.value='operacao';
  document.getElementById('modal-usuario').classList.add('open');
}
function editarUsuario(email){
  _editUsuarioEmail=email;const u=usuarios.find(x=>x.email===email);if(!u)return;
  document.getElementById('u-nome').value=u.nome||'';
  document.getElementById('u-email').value=u.email;
  document.getElementById('u-senha').value=u.senha||'';
  const pf=document.getElementById('u-perfil');if(pf)pf.value=u.perfil||'operacao';
  document.getElementById('modal-usuario').classList.add('open');
}
function salvarUsuario(){
  const email=document.getElementById('u-email').value.trim().toLowerCase();
  if(!email){showToast('Informe o e-mail.','peach');return;}
  const u={email,
    senha:document.getElementById('u-senha').value,
    nome:document.getElementById('u-nome').value.trim(),
    perfil:document.getElementById('u-perfil')?.value||'operacao'};
  if(_editUsuarioEmail){
    const idx=usuarios.findIndex(x=>x.email===_editUsuarioEmail);
    if(idx>=0)usuarios[idx]=u;
  } else {
    if(usuarios.find(x=>x.email===email)){showToast('E-mail já cadastrado.','peach');return;}
    usuarios.push(u);
  }
  salvarUsuarios();closeModal('modal-usuario');renderUsuarios();showToast('Usuário salvo!','sage');
}
function apagarUsuario(email){
  const me=getCurrentUser();
  if(me?.email===email){showToast('Não pode apagar seu próprio usuário.','peach');return;}
  if(!confirm('Apagar este usuário?'))return;
  usuarios=usuarios.filter(x=>x.email!==email);salvarUsuarios();renderUsuarios();showToast('Usuário removido.','peach');
}

// ═══════════════════ MODAL GENÉRICO ═══════════════════
// Abrir modal de item de compras (edição inline)
function abrirEditarItem(idx){
  const item=ITENS_COMPRAS[idx];if(!item)return;
  document.getElementById('generico-titulo').textContent='Editar Item de Compras';
  document.getElementById('generico-body').innerHTML=`<div class="form-grid">
    <div class="form-group"><label>Nome</label><input id="edit-item-nome" class="input" value="${esc(item.nome)}"></div>
    <div class="form-group"><label>Categoria</label><input id="edit-item-cat" class="input" value="${esc(item.cat)}"></div>
    <div class="form-group"><label>Preço (R$)</label><input id="edit-item-preco" type="number" class="input" value="${item.preco||0}"></div>
    <div class="form-group"><label>Link (ML ou outro)</label><input id="edit-item-link" class="input" value="${esc(item.link||'')}"></div>
    <div class="form-group"><label>Qtd Rule</label><input id="edit-item-qtdrule" class="input" value="${esc(item.qtdRule||'1-unidade')}"></div>
    <div style="margin-top:12px;"><button class="btn btn-sm" onclick="_salvarItemEdicao(${idx})"><i class="fa-solid fa-save"></i> Salvar</button></div>
  </div>`;
  document.getElementById('modal-generico').classList.add('open');
}
function _salvarItemEdicao(idx){
  ITENS_COMPRAS[idx].nome=document.getElementById('edit-item-nome').value;
  ITENS_COMPRAS[idx].cat=document.getElementById('edit-item-cat').value;
  ITENS_COMPRAS[idx].preco=+document.getElementById('edit-item-preco').value||0;
  ITENS_COMPRAS[idx].link=document.getElementById('edit-item-link').value;
  ITENS_COMPRAS[idx].qtdRule=document.getElementById('edit-item-qtdrule').value;
  saveAll();closeModal('modal-generico');showToast('Item atualizado!','sage');
}

// ═══════════════════ STUBS / COMPATIBILIDADE HTML ═══════════════════
// O index.html v1 ainda chama algumas funções — garantir que existam sem errar
function abrirModalPrestador(){abrirNovoPrestador();}
function buscarNoMaps(){
  const end=document.getElementById('intel-endereco')?.value||'';
  if(end){_intelEndereco=end;renderIntel();_buscarEmbeddedMapa(end);}
}
function abrirMaps(query){_buscarEmbeddedMapa(query);}
function renderPrestadores(){renderIntel();}
// ── Membros ──
function abrirModalMembro(){
  document.getElementById('mb-nome').value='';
  document.getElementById('mb-funcao').value='';
  document.getElementById('mb-email').value='';
  document.getElementById('mb-senha').value='';
  document.getElementById('modal-membro').classList.add('open');
  setTimeout(()=>document.getElementById('mb-nome').focus(),100);
}
function salvarMembro(){
  const nome=document.getElementById('mb-nome').value.trim();
  if(!nome){showToast('Informe o nome.','peach');return;}
  const emailRaw=document.getElementById('mb-email').value.trim();
  const email=emailRaw.toLowerCase();
  if(!email){showToast('Informe o e-mail.','peach');return;}
  const senha=document.getElementById('mb-senha').value.trim();
  if(!senha){showToast('Informe a senha.','peach');return;}
  const funcao=document.getElementById('mb-funcao').value.trim();
  if(!membros)membros=[];
  const id=uid();
  membros.push({id,nome,funcao,email,senha});
  // criar login
  carregarUsuarios();
  if(!usuarios.find(u=>u.email===email)){
    usuarios.push({id,email,senha,nome,perfil:'operacional',modulos:[]});
    salvarUsuarios();
  }
  saveAll();closeModal('modal-membro');renderConfig();showToast('Membro adicionado!','sage');
}
function apagarMembro(i){
  if(!confirm(`Remover "${membros[i]?.nome}"?`))return;
  const emailRemover=membros[i]?.email;
  membros.splice(i,1);
  if(emailRemover){carregarUsuarios();usuarios=usuarios.filter(u=>u.email!==emailRemover);salvarUsuarios();}
  saveAll();renderConfig();showToast('Removido.','peach');
}

// ── Item de Compras ──
function abrirModalItem(){
  document.getElementById('modal-item-title').textContent='Novo Item';
  document.getElementById('it-cat').value='Cama';
  document.getElementById('it-nome').value='';
  document.getElementById('it-qtd-rule').value='1-unidade';
  document.getElementById('it-tipo-preco').value='fixo';
  document.getElementById('it-preco').value='';
  document.getElementById('it-link').value='';
  document.getElementById('it-enxoval-dep').value='';
  document.getElementById('it-modal-comprado').checked=false;
  document.getElementById('it-modal-flashee').checked=false;
  document.getElementById('it-modal-intense').checked=false;
  renderItTipoPreco();
  document.getElementById('modal-item').classList.add('open');
  setTimeout(()=>document.getElementById('it-nome').focus(),100);
}
function renderItTipoPreco(){
  const tipo=document.getElementById('it-tipo-preco')?.value;
  const wrap=document.getElementById('it-preco-wrap');
  if(wrap)wrap.style.display=tipo==='enxoval'?'none':'';
}
function salvarItem(){
  const nome=document.getElementById('it-nome').value.trim();
  if(!nome){showToast('Informe o nome do item.','peach');return;}
  const cat=document.getElementById('it-cat').value;
  const qtdRule=document.getElementById('it-qtd-rule').value||'1-unidade';
  const tipoPreco=document.getElementById('it-tipo-preco').value;
  const preco=+document.getElementById('it-preco').value||0;
  const link=document.getElementById('it-link').value.trim();
  const enxovalDep=document.getElementById('it-enxoval-dep').value==='sim';
  const modalidades=[];
  if(document.getElementById('it-modal-comprado').checked)modalidades.push('comprado');
  if(document.getElementById('it-modal-flashee').checked)modalidades.push('flashee');
  if(document.getElementById('it-modal-intense').checked)modalidades.push('intense');
  ITENS_COMPRAS.push({cat,nome,tipoPreco,preco:tipoPreco==='fixo'?preco:0,enxovalDep,qtdRule,link,modalidades:modalidades.length?modalidades:undefined});
  saveAll();closeModal('modal-item');renderConfig();showToast(`"${nome}" adicionado!`,'sage');
}

// ── Preços Fixos ──
function salvarPrecoFixo(idx){
  const v=+document.getElementById(`cp-preco-${idx}`)?.value||0;
  ITENS_COMPRAS[idx].preco=v;
  saveAll();showToast('Preço salvo!','sage');
}

// ── Preços Enxoval ──
function salvarPrecoEnxoval(nome){
  const sizes=['Solteiro','Casal','Queen','King'];
  if(!PRECOS_ENXOVAL[nome])PRECOS_ENXOVAL[nome]={};
  sizes.forEach(s=>{
    const el=document.getElementById(`enx-${CSS.escape(nome)}-${s}`);
    if(el)PRECOS_ENXOVAL[nome][s]=+el.value||0;
  });
  saveAll();showToast(`"${nome}" salvo!`,'sage');
}
function apagarPrecoEnxoval(nome){
  if(!confirm(`Apagar "${nome}" dos preços de enxoval?`))return;
  delete PRECOS_ENXOVAL[nome];
  saveAll();renderConfig();showToast('Removido.','peach');
}
function adicionarPrecoEnxoval(){
  const nome=document.getElementById('enx-novo-nome')?.value.trim();
  if(!nome){showToast('Informe o nome do item.','peach');return;}
  if(PRECOS_ENXOVAL[nome]){showToast('Item já existe.','peach');return;}
  PRECOS_ENXOVAL[nome]={Solteiro:0,Casal:0,Queen:0,King:0};
  saveAll();renderConfig();showToast(`"${nome}" adicionado!`,'sage');
}

// ── Limpeza e Fotos ──
function salvarPrecoLimpeza(id){
  const r=PRECOS_PRIMEIRA_LIMPEZA.find(x=>x.id===id);if(!r)return;
  r.quartos=+document.getElementById(`limp-${id}-q`)?.value||1;
  r.empresa=(document.getElementById(`limp-${id}-empresa`)?.value||'').trim();
  r.custo=+document.getElementById(`limp-${id}-c`)?.value||0;
  r.cobrado=+document.getElementById(`limp-${id}-r`)?.value||0;
  saveAll();showToast('Salvo!','sage');
}
function apagarPrecoLimpeza(id){
  if(!confirm('Apagar esta linha da Primeira Limpeza?'))return;
  PRECOS_PRIMEIRA_LIMPEZA=PRECOS_PRIMEIRA_LIMPEZA.filter(x=>x.id!==id);
  saveAll();renderConfig();showToast('Removido.','peach');
}
function adicionarPrecoLimpeza(prefixo){
  const q=+document.getElementById(`${prefixo}-novo-q`)?.value||0;
  const empresa=(document.getElementById(`${prefixo}-novo-empresa`)?.value||'').trim();
  const c=+document.getElementById(`${prefixo}-novo-c`)?.value||0;
  const r=+document.getElementById(`${prefixo}-novo-r`)?.value||0;
  if(!q||!empresa){showToast('Informe a quantidade de quartos e o nome da empresa.','peach');return;}
  PRECOS_PRIMEIRA_LIMPEZA.push({id:uid(),quartos:q,empresa,custo:c,cobrado:r});
  saveAll();renderConfig();showToast('Adicionado!','sage');
}
function salvarLinhaLimpezaCheckout(id){
  const r=PRECOS_LIMPEZA_CHECKOUT.find(x=>x.id===id);if(!r)return;
  r.empresa=(document.getElementById(`co-${id}-empresa`)?.value||'').trim();
  r.especificacao=(document.getElementById(`co-${id}-espec`)?.value||'').trim();
  r.custo=+document.getElementById(`co-${id}-custo`)?.value||0;
  r.cobrado=+document.getElementById(`co-${id}-cobrado`)?.value||0;
  r.regiao=(document.getElementById(`co-${id}-regiao`)?.value||'').trim();
  saveAll();showToast('Salvo!','sage');
}
function apagarLinhaLimpezaCheckout(id){
  if(!confirm('Apagar esta linha da Limpeza Check-out?'))return;
  PRECOS_LIMPEZA_CHECKOUT=PRECOS_LIMPEZA_CHECKOUT.filter(x=>x.id!==id);
  saveAll();renderConfig();showToast('Removido.','peach');
}
function adicionarLinhaLimpezaCheckout(){
  const empresa=(document.getElementById('co-novo-empresa')?.value||'').trim();
  const especificacao=(document.getElementById('co-novo-espec')?.value||'').trim();
  const custo=+document.getElementById('co-novo-custo')?.value||0;
  const cobrado=+document.getElementById('co-novo-cobrado')?.value||0;
  const regiao=(document.getElementById('co-novo-regiao')?.value||'').trim();
  if(!empresa){showToast('Informe o nome da empresa.','peach');return;}
  PRECOS_LIMPEZA_CHECKOUT.push({id:uid(),empresa,especificacao,custo,cobrado,regiao});
  saveAll();renderConfig();showToast('Adicionado!','sage');
}
function salvarPrecoFoto(q){
  const min=+document.getElementById(`foto-${q}-min`)?.value||0;
  const max=+document.getElementById(`foto-${q}-max`)?.value||0;
  if(!PRECOS_FOTOS[q])PRECOS_FOTOS[q]={};
  PRECOS_FOTOS[q].min=min;PRECOS_FOTOS[q].max=max;
  saveAll();showToast('Salvo!','sage');
}
function apagarPrecoFoto(q){
  if(!confirm(`Apagar a faixa de ${q} quarto(s) das Fotos Profissionais?`))return;
  delete PRECOS_FOTOS[q];
  saveAll();renderConfig();showToast('Removido.','peach');
}
function adicionarPrecoFoto(){
  const q=+document.getElementById('foto-novo-q')?.value||0;
  const resp=(document.getElementById('foto-novo-resp')?.value||'').trim();
  const min=+document.getElementById('foto-novo-min')?.value||0;
  const max=+document.getElementById('foto-novo-max')?.value||0;
  if(!q){showToast('Informe a quantidade de quartos.','peach');return;}
  PRECOS_FOTOS[q]={min,max,resp};
  saveAll();renderConfig();showToast('Adicionado!','sage');
}
function aplicarPresetPerfil(){}

// ═══════════════════ INIT ═══════════════════
function iniciarApp(){
  aplicarPermissoes();
  loadAll();
  const primeiroPanel=document.querySelector('.nav-item[onclick*="kanban"]');
  showPanel('kanban',primeiroPanel);
  kvPull(false).then(()=>{
    carregarUsuarios();
    if(usuarios.length>1||(usuarios[0]&&usuarios[0].email!=='admin@wecare.com')) _kvPushDebounced();
  });
  // Regra 5: auto-pull a cada ~60s se não houver mudança pendente
  setInterval(()=>{if(!_kvTimer)kvPull(false);},60000);
  // Regra 6: envia ao sair/ocultar aba
  window.addEventListener('beforeunload',()=>{
    if(!window.__servidorLido)return;
    const blob={};SYNC_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)try{blob[k]=JSON.parse(v);}catch{}});
    blob.lastSaved=Date.now();
    const s=window.WC_SYNC||{};
    if(s.url)navigator.sendBeacon(s.url.replace(/\/$/,'')+'/save?token='+encodeURIComponent(s.token||''),JSON.stringify(blob));
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')_kvSendNow();
  });
}

document.addEventListener('DOMContentLoaded',async()=>{
  garantirAdminPadrao();
  const u=getCurrentUser();
  if(u){
    document.getElementById('login-overlay').classList.add('hidden');
    iniciarApp();
  } else {
    document.getElementById('login-overlay')?.classList.remove('hidden');
    document.getElementById('login-email')?.focus();
    await sincronizarUsuariosNuvem(); // garante que todos os logins da nuvem funcionem nesta máquina
  }
  // Enter no login
  document.getElementById('login-senha')?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  document.getElementById('login-email')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('login-senha')?.focus();});
});
