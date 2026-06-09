// ═══════════════════ ESTADO ═══════════════════
let imoveis=[], membros=[], usuarios=[], prestadores=[];
let _imovelAtivoId=null, _abaAtiva='dados';
let _editMembroIdx=null, _editUsuarioEmail=null, _editPrestadorIdx=null;

// ═══════════════════ FASES ═══════════════════
const FASES=['contrato','compras','formulario','producao','compilamento','anuncio','auditoria'];
const FASE_LABEL={
  contrato:'Contrato Assinado', compras:'Compras', formulario:'Formulário',
  producao:'Produção', compilamento:'Compilamento', anuncio:'Criação do Anúncio', auditoria:'Auditoria'
};
const FASE_COLOR={
  contrato:'sky', compras:'gold', formulario:'lav',
  producao:'peach', compilamento:'rose', anuncio:'lavender', auditoria:'sage'
};

// ═══════════════════ ITENS DE COMPRAS ═══════════════════
let ITENS_COMPRAS=[
  // CAMA enxoval Buddemeyer
  {cat:'Cama',nome:'Jogo de Cama Basic Percalle',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'3-colchao',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Cobertor Aspen II',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'2-colchao',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Edredom Premier Hotel',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'1-colchao',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Capa p/ Edredom Hotel 180 fios',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'2-colchao',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Protetor de Colchão',tipoPreco:'enxoval',enxovalDep:true,qtdRule:'1-colchao',link:'https://wa.me/5511995563388'},
  // CAMA fixos
  {cat:'Cama',nome:'Fronha Basic Percalle c/ Abas',tipoPreco:'fixo',preco:43,enxovalDep:true,qtdRule:'2-leito',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Travesseiro Sanomed',tipoPreco:'fixo',preco:285,enxovalDep:true,qtdRule:'1-leito',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Travesseiro Toque de Pluma',tipoPreco:'fixo',preco:99,enxovalDep:true,qtdRule:'1-leito',link:'https://wa.me/5511995563388'},
  {cat:'Cama',nome:'Protetor de Travesseiro',tipoPreco:'fixo',preco:52,enxovalDep:true,qtdRule:'1-leito',link:'https://wa.me/5511995563388'},
  // BANHEIRO
  {cat:'Banheiro',nome:'Toalha de Banho Lory Hotel',tipoPreco:'fixo',preco:64,enxovalDep:true,qtdRule:'3-leito',link:'https://wa.me/5511995563388'},
  {cat:'Banheiro',nome:'Toalha de Rosto Lory Hotel',tipoPreco:'fixo',preco:30,enxovalDep:true,qtdRule:'3-leito',link:'https://wa.me/5511995563388'},
  {cat:'Banheiro',nome:'Tapete Piso Luxor Hotel',tipoPreco:'fixo',preco:42,enxovalDep:false,qtdRule:'3-banheiro',link:'https://wa.me/5511995563388'},
  {cat:'Banheiro',nome:'Lixeira Inox com Pedal 3L',tipoPreco:'fixo',preco:38.99,enxovalDep:false,qtdRule:'1-banheiro',link:'https://www.mercadolivre.com.br/p/MLB25959263'},
  {cat:'Banheiro',nome:'Dispenser de Sabonete',tipoPreco:'fixo',preco:23.90,enxovalDep:false,qtdRule:'1-banheiro',link:'https://www.mercadolivre.com.br/p/MLB22437413'},
  {cat:'Banheiro',nome:'Secador de Cabelo',tipoPreco:'fixo',preco:102,enxovalDep:false,qtdRule:'1-banheiro',link:'https://www.mercadolivre.com.br/secador-de-cabelos-mondial/p/MLB22448898'},
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
  // OUTROS
  {cat:'Outros',nome:'Detector de Fumaça',tipoPreco:'fixo',preco:59.90,enxovalDep:false,qtdRule:'1-unidade',link:'https://www.mercadolivre.com.br/detector-optico-de-fumaca/p/MLB22334567'},
  {cat:'Outros',nome:'Kit Amenities WeCare',tipoPreco:'fixo',preco:5.46,enxovalDep:false,qtdRule:'1-banheiro',link:''},
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

const PRECOS_PRIMEIRA_LIMPEZA={
  1:{dinairan:{custo:360,cobrado:396},flashee:{custo:350,cobrado:385}},
  2:{dinairan:{custo:430,cobrado:473}},
  3:{dinairan:{custo:500,cobrado:550}},
  4:{dinairan:{custo:580,cobrado:638}},
};
const PRECOS_FOTOS={
  1:{min:250,max:300,resp:'Flavia Mansur'},
  2:{min:300,max:380,resp:'Flavia Mansur'},
  3:{min:350,max:420,resp:'Flavia Mansur'},
  4:{min:350,max:420,resp:'Flavia Mansur'},
};
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
  const titles={kanban:'Kanban',dashboard:'Dashboard',intel:'Inteligência de Mercado',config:'Configurações',usuarios:'Usuários'};
  document.getElementById('panel-title').textContent=titles[id]||id;
  if(id==='kanban')renderKanban();
  if(id==='dashboard')renderDashboard();
  if(id==='intel')renderIntel();
  if(id==='config')renderConfig();
  if(id==='usuarios')renderUsuarios();
}

// Cálculo de quantidades
function totalColchoes(camas){return(camas||[]).reduce((s,c)=>s+(+c.qtd||1),0);}
function totalLeitos(camas){return(camas||[]).reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);}
function calcNecessario(item,camas,banheiros,quartos){
  const[n,base]=(item.qtdRule||'1-unidade').split('-');
  const q=parseInt(n)||1;
  if(base==='colchao')return q*totalColchoes(camas);
  if(base==='leito')return q*totalLeitos(camas);
  if(base==='banheiro')return q*(+banheiros||1);
  if(base==='quarto')return q*(+quartos||1);
  return q;
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
function salvarUsuarios(){localStorage.setItem('wc_users',JSON.stringify(usuarios));_kvPushDebounced();}
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
}

// ═══════════════════ PERSISTÊNCIA / KV ═══════════════════
const SYNC_KEYS=['wc_imoveis','wc_membros','wc_itens','wc_enxoval','wc_prestadores','wc_users'];
function saveAll(){
  localStorage.setItem('wc_imoveis',JSON.stringify(imoveis));
  localStorage.setItem('wc_membros',JSON.stringify(membros));
  localStorage.setItem('wc_itens',JSON.stringify(ITENS_COMPRAS));
  localStorage.setItem('wc_enxoval',JSON.stringify(PRECOS_ENXOVAL));
  localStorage.setItem('wc_prestadores',JSON.stringify(prestadores));
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
  v=g('wc_prestadores');if(Array.isArray(v))prestadores=v;
}
let _kvTimer=null;
function _kvPushDebounced(){
  const s=window.WC_SYNC||{};if(!s.url)return;
  if(_kvTimer)clearTimeout(_kvTimer);
  _kvTimer=setTimeout(async()=>{
    try{
      const blob={};
      SYNC_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)try{blob[k]=JSON.parse(v);}catch{}});
      await fetch(s.url.replace(/\/$/,'')+'/save?token='+encodeURIComponent(s.token||''),
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(blob)});
    }catch{}
  },2500);
}
async function kvPull(showMsg){
  const s=window.WC_SYNC||{};
  if(!s.url){if(showMsg)showToast('Worker não configurado.','peach');return;}
  try{
    const r=await fetch(s.url.replace(/\/$/,'')+'/load?token='+encodeURIComponent(s.token||''));
    const j=await r.json();
    if(j&&j.data){
      for(const k in j.data)try{localStorage.setItem(k,JSON.stringify(j.data[k]));}catch{}
      loadAll();renderKanban();
      if(showMsg)showToast('Sincronizado!','sage');return true;
    }
  }catch{}
  if(showMsg)showToast('Erro ao sincronizar.','peach');
}
async function _publicarStats(){
  const s=window.WC_SYNC||{};if(!s.url)return;
  try{
    const stats=imoveis.map(im=>({nome:im.nome,dataCriacao:im.dataCriacao,dataAtivacao:im.dataAtivacao,status:im.status}));
    await fetch(s.url.replace(/\/$/,'')+'/stats?token='+encodeURIComponent(s.token||''),
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stats})});
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
  const ativos=imoveis.filter(im=>im.status!=='perdido'&&im.status!=='ativo');
  const ativos2=imoveis.filter(im=>im.status==='ativo');
  const perdidos=imoveis.filter(im=>im.status==='perdido');
  const wrap=document.getElementById('kanban-wrap');
  wrap.innerHTML=FASES.map(fase=>{
    const cards=ativos.filter(im=>im.status===fase);
    return`<div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title">${FASE_LABEL[fase]}</span>
        <span class="kanban-col-count">${cards.length}</span>
      </div>
      <div class="kanban-cards">
        ${cards.map(im=>renderCard(im)).join('')||'<div class="empty-state" style="padding:16px 8px;font-size:11px;">Nenhum imóvel</div>'}
      </div>
    </div>`;
  }).join('')+
  (ativos2.length?`<div class="kanban-col">
    <div class="kanban-col-header" style="border-top:3px solid var(--sage);">
      <span class="kanban-col-title" style="color:var(--sage)">✅ Ativo</span>
      <span class="kanban-col-count">${ativos2.length}</span>
    </div>
    <div class="kanban-cards">${ativos2.map(im=>renderCard(im)).join('')}</div>
  </div>`:'');

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
      ${im.formPreenchidoEm?'<span class="tag tag-lav" title="Formulário preenchido"><i class="fa-solid fa-clipboard-check"></i></span>':''}
    </div>
  </div>`;
}
function _verificarAtrasado(im){
  if(!im.dataEnvioParaCriacao||!im.prazoAtivacaoHoras)return false;
  return new Date()>new Date(new Date(im.dataEnvioParaCriacao).getTime()+im.prazoAtivacaoHoras*3600000)&&im.status!=='ativo';
}

// ═══════════════════ NOVO IMÓVEL ═══════════════════
function abrirNovoImovel(){
  ['ni-nome','ni-endereco','ni-prop-nome','ni-prop-tel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('ni-comissao').value='20';
  document.getElementById('ni-comissao-base').value='liquida';
  document.getElementById('ni-quartos').value='1';
  document.getElementById('ni-banheiros').value='1';
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
    comissaoWecare:+document.getElementById('ni-comissao').value||20,
    comissaoBase:document.getElementById('ni-comissao-base').value,
    quartos:+document.getElementById('ni-quartos').value||1,
    banheiros:+document.getElementById('ni-banheiros').value||1,
    dataCriacao:document.getElementById('ni-data-criacao').value||hoje(),
    plataformas:[], camas:[], status:'contrato',
    dataAtivacao:null, statusAnterior:null,
    // contrato
    contratoLink:'', zapsignUuid:'', contratoAssinado:false, dataContratoAssinado:null,
    // definições
    seguroEasyCover:false, kitAmenities:false, internetClaro:false, ecohost:false, fechaduraEletronica:false,
    defLimpeza:{responsavel:''},
    defEnxoval:{tipo:'comprado',fornecedor:'',valorAluguelMensal:0,valorSetupAluguel:0},
    // reunião
    reuniao:{nomeArquivo:'', texto:'', dataUpload:null, iaPreenchidoEm:null, iaEncontrados:0},
    // formulário
    formToken:uid()+uid(), formRascunho:{}, formRespostas:{}, formConfirmados:{}, formPreenchidoEm:null,
    // operacional
    ops:{fotos:{data:'',responsavel:'',hora:'',custo:0},limpeza:{data:'',responsavel:'',hora:'',custo:0},vistoria:{data:'',responsavel:'',hora:'',custo:0,localizacao:'central'}},
    // custos
    custos:[], margemWecare:15, descontoTipo:'reais', descontoValor:0, formasPagamento:'',
    // compras
    compras:{},
    // final
    linkFotos:'', linkRelatorio:'', responsavelCriacao:'',
    prazoAtivacaoHoras:24, dataEnvioParaCriacao:null,
    valorMinNoite:0, valorBaseNoite:0, taxaHospedeExtra:0, taxaHospedeExtraAcimaDe:0, taxaLimpeza:0, observacoes:'',
    comentarios:{}
  };
  imoveis.push(im);saveAll();closeModal('modal-imovel-novo');renderKanban();
  showToast('Imóvel criado!','sage');abrirDetalhe(im.id);
}

// ═══════════════════ DETALHE ═══════════════════
function getImovel(id){return imoveis.find(x=>x.id===id);}
function abrirDetalhe(id){
  _imovelAtivoId=id;_abaAtiva='dados';
  const im=getImovel(id);if(!im)return;
  document.getElementById('detalhe-titulo').textContent=im.nome;
  document.getElementById('detalhe-subtitulo').textContent=(im.proprietarioNome||'')+(im.endereco?' · '+im.endereco:'');
  _atualizarHeaderDetalhe(im);
  document.querySelectorAll('#detalhe-tabs .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  renderAba('dados');
  document.getElementById('modal-detalhe').classList.add('open');
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
  } else if(im.status==='auditoria'){
    btnAv.style.display='';btnAv.innerHTML=`<i class="fa-solid fa-check"></i> Marcar como Ativo 🎉`;
    btnPerd.style.display='';
  }
}
function showTab(aba,btn){
  _abaAtiva=aba;
  document.querySelectorAll('#detalhe-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderAba(aba);
}
function renderAba(aba){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const fns={dados:()=>renderAbaDados(im),contrato:()=>renderAbaContrato(im),
    definicoes:()=>renderAbaDefinicoes(im),reuniao:()=>renderAbaReuniao(im),formulario:()=>renderAbaFormulario(im),
    compras:()=>renderAbaCompras(im),enxoval:()=>renderAbaEnxoval(im),
    operacional:()=>renderAbaOperacional(im),custos:()=>renderAbaCustos(im),final:()=>renderAbaFinal(im)};
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
  if(im.status==='auditoria'){im.status='ativo';im.dataAtivacao=im.dataAtivacao||hoje();}
  else if(idx>=0&&idx<FASES.length-1){im.status=FASES[idx+1];}
  saveAll();renderKanban();_atualizarHeaderDetalhe(im);
  showToast(`Avançado para "${im.status==='ativo'?'Ativo':FASE_LABEL[im.status]}"!`,'sage');
}
function togglePerdidoAtual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.statusAnterior=im.status;im.status='perdido';
  saveAll();renderKanban();closeModal('modal-detalhe');showToast('Marcado como perdido.','peach');
}
function voltarOperacao(id){
  const im=getImovel(id);if(!im)return;
  im.status=im.statusAnterior||'contrato';im.statusAnterior=null;
  saveAll();renderKanban();showToast('Voltou à operação.','sage');
}
function confirmarApagarImovel(){if(confirm('Apagar este imóvel permanentemente?')){apagarImovel(_imovelAtivoId);closeModal('modal-detalhe');}}
function apagarImovel(id){imoveis=imoveis.filter(x=>x.id!==id);saveAll();renderKanban();showToast('Apagado.','peach');}

// ═══════════════════ COLETAR DADOS DAS ABAS ═══════════════════
function _coletarDadosAba(aba,im){
  const g=id=>{const el=document.getElementById(id);return el?el.value:''};
  const gc=id=>{const el=document.getElementById(id);return el?el.checked:false};
  const gn=id=>+g(id)||0;
  if(aba==='dados'){
    im.nome=g('d-nome')||im.nome; im.endereco=g('d-endereco');
    im.proprietarioNome=g('d-prop-nome'); im.proprietarioTel=g('d-prop-tel');
    im.comissaoWecare=gn('d-comissao'); im.comissaoBase=g('d-comissao-base');
    im.quartos=gn('d-quartos')||1; im.banheiros=gn('d-banheiros')||1;
    im.plataformas=[];
    document.querySelectorAll('.pltf-check:checked').forEach(c=>im.plataformas.push(c.value));
    im.observacoes=g('d-obs');
    im.camas=_coletarCamas();
    document.getElementById('detalhe-titulo').textContent=im.nome;
  }
  if(aba==='contrato'){
    im.contratoLink=g('ct-link'); im.zapsignUuid=g('ct-uuid');
    im.valorMinNoite=gn('ct-min-noite'); im.valorBaseNoite=gn('ct-base-noite');
    im.taxaHospedeExtra=gn('ct-taxa-extra'); im.taxaHospedeExtraAcimaDe=gn('ct-extra-acima');
    im.taxaLimpeza=gn('ct-taxa-limpeza');
  }
  if(aba==='definicoes'){
    im.seguroEasyCover=gc('def-seguro'); im.kitAmenities=gc('def-amenities');
    im.internetClaro=gc('def-internet'); im.ecohost=gc('def-ecohost'); im.fechaduraEletronica=gc('def-fechadura');
    im.defLimpeza={responsavel:g('def-limpeza-resp')};
    im.defEnxoval={tipo:g('def-enxoval-tipo'),fornecedor:g('def-enxoval-forn'),valorAluguelMensal:gn('def-enxoval-mensal'),valorSetupAluguel:gn('def-enxoval-setup')};
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
    im.linkFotos=g('fn-link-fotos'); im.linkRelatorio=g('fn-link-rel');
    im.responsavelCriacao=g('fn-resp-criacao'); im.dataEnvioParaCriacao=g('fn-data-envio');
    im.valorMinNoite=gn('fn-min-noite')||im.valorMinNoite;
  }
  if(aba==='compras'){_coletarCompras(im);}
  if(aba==='formulario'){im.formRascunho=_coletarRascunho();}
}
function _coletarCamas(){
  const rows=document.querySelectorAll('.cama-row');
  const camas=[];
  rows.forEach(r=>{
    const tipo=r.querySelector('.cama-tipo')?.value;
    const qtd=+r.querySelector('.cama-qtd')?.value||1;
    if(tipo)camas.push({tipo,qtd});
  });
  return camas;
}
function _coletarCompras(im){
  document.querySelectorAll('.compra-qtd-input').forEach(inp=>{
    const idx=inp.dataset.idx;
    if(!im.compras)im.compras={};
    im.compras[idx]={qtdReal:+inp.value||0,comprado:inp.closest('tr')?.querySelector('.compra-check')?.checked||false};
  });
}

// ═══════════════════ ABA DADOS ═══════════════════
function renderAbaDados(im){
  const plataformas=['Airbnb','Booking','Vrbo','Expedia','Decolar','Site Próprio'];
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-house"></i> Informações do Imóvel</div>
  <div class="form-group"><label>Nome do Imóvel</label><input id="d-nome" class="input" value="${esc(im.nome)}"></div>
  <div class="form-group"><label>Endereço</label><input id="d-endereco" class="input" value="${esc(im.endereco||'')}"></div>
  <div class="form-row">
    <div class="form-group"><label>Quartos</label><input id="d-quartos" type="number" class="input" value="${im.quartos||1}" min="1"></div>
    <div class="form-group"><label>Banheiros</label><input id="d-banheiros" type="number" class="input" value="${im.banheiros||1}" min="1"></div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-user"></i> Proprietário</div>
  <div class="form-row">
    <div class="form-group"><label>Nome</label><input id="d-prop-nome" class="input" value="${esc(im.proprietarioNome||'')}"></div>
    <div class="form-group"><label>Telefone / WhatsApp</label><input id="d-prop-tel" class="input" value="${esc(im.proprietarioTel||'')}"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Comissão WeCare (%)</label><input id="d-comissao" type="number" class="input" value="${im.comissaoWecare||20}" min="0" max="100"></div>
    <div class="form-group"><label>Base de Cálculo</label><select id="d-comissao-base" class="input">
      <option value="liquida"${im.comissaoBase==='liquida'?' selected':''}>Líquida (após plataforma)</option>
      <option value="bruta"${im.comissaoBase==='bruta'?' selected':''}>Bruta</option>
    </select></div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-bed"></i> Camas</div>
  <div id="camas-list">${_htmlCamas(im.camas||[])}</div>
  <button class="btn btn-outline btn-sm" onclick="adicionarCama()"><i class="fa-solid fa-plus"></i> Adicionar cama</button>

  <div class="form-section-title"><i class="fa-solid fa-globe"></i> Plataformas</div>
  <div class="form-row" style="flex-wrap:wrap;gap:12px;">
    ${plataformas.map(p=>`<label class="checkbox-label"><input type="checkbox" class="pltf-check" value="${p}"${(im.plataformas||[]).includes(p)?' checked':''}> ${p}</label>`).join('')}
  </div>

  <div class="form-section-title"><i class="fa-solid fa-comment-dots"></i> Observações</div>
  <div class="form-group"><textarea id="d-obs" class="input" rows="3">${esc(im.observacoes||'')}</textarea></div>
  </div>`;
}
function _htmlCamas(camas){
  const tipos=['Solteiro','Casal','Queen','King','Beliche','Bicama','Sofá-cama Solteiro','Sofá-cama Casal','Viúva'];
  return camas.map((c,i)=>`<div class="cama-row" style="display:flex;gap:8px;margin-bottom:8px;">
    <select class="input cama-tipo" style="flex:2">${tipos.map(t=>`<option${t===c.tipo?' selected':''}>${t}</option>`).join('')}</select>
    <input class="input cama-qtd" type="number" min="1" value="${c.qtd||1}" style="width:64px;">
    <button class="btn btn-xs btn-danger" onclick="this.closest('.cama-row').remove()"><i class="fa-solid fa-trash"></i></button>
  </div>`).join('');
}
function adicionarCama(){
  const tipos=['Solteiro','Casal','Queen','King','Beliche','Bicama','Sofá-cama Solteiro','Sofá-cama Casal','Viúva'];
  const div=document.createElement('div');div.className='cama-row';
  div.style.cssText='display:flex;gap:8px;margin-bottom:8px;';
  div.innerHTML=`<select class="input cama-tipo" style="flex:2">${tipos.map(t=>`<option>${t}</option>`).join('')}</select>
    <input class="input cama-qtd" type="number" min="1" value="1" style="width:64px;">
    <button class="btn btn-xs btn-danger" onclick="this.closest('.cama-row').remove()"><i class="fa-solid fa-trash"></i></button>`;
  document.getElementById('camas-list').appendChild(div);
}

// ═══════════════════ ABA CONTRATO ═══════════════════
function renderAbaContrato(im){
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-file-signature"></i> Contrato</div>
  <div class="form-group">
    <label>Link do Contrato (PDF / Drive)</label>
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="ct-link" class="input" placeholder="https://..." value="${esc(im.contratoLink||'')}">
      ${im.contratoLink?`<a href="${esc(im.contratoLink)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i></a>`:''}
    </div>
  </div>
  <div class="form-group">
    <label>UUID do Documento no ZapSign</label>
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="ct-uuid" class="input" placeholder="ex: abcd-1234-efgh" value="${esc(im.zapsignUuid||'')}">
      <span class="tag ${im.contratoAssinado?'tag-sage':'tag-neutral'}">
        <i class="fa-solid fa-${im.contratoAssinado?'check-circle':'clock'}"></i> ${im.contratoAssinado?'Assinado':'Aguardando'}
      </span>
    </div>
    <div class="hint">O webhook do ZapSign avança automaticamente para "Compras" ao receber a assinatura.</div>
  </div>
  ${im.contratoAssinado?`<div class="alert-success"><i class="fa-solid fa-check-circle"></i> Contrato assinado em <strong>${fmtDate(im.dataContratoAssinado)}</strong></div>`:''}
  <div class="form-group" style="margin-top:8px;">
    <button class="btn btn-outline btn-sm" onclick="marcarContratoAssinadoManual()"><i class="fa-solid fa-pen"></i> Marcar como assinado manualmente</button>
  </div>

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-chart-line"></i> Precificação Inicial</div>
  <div class="form-row">
    <div class="form-group"><label>Valor Mínimo / Noite (R$)</label><input id="ct-min-noite" type="number" class="input" value="${im.valorMinNoite||0}"></div>
    <div class="form-group"><label>Valor Base / Noite (R$)</label><input id="ct-base-noite" type="number" class="input" value="${im.valorBaseNoite||0}"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Taxa Hóspede Extra (R$)</label><input id="ct-taxa-extra" type="number" class="input" value="${im.taxaHospedeExtra||0}"></div>
    <div class="form-group"><label>Acima de (nº hóspedes)</label><input id="ct-extra-acima" type="number" class="input" value="${im.taxaHospedeExtraAcimaDe||0}"></div>
  </div>
  <div class="form-group"><label>Taxa de Limpeza (R$)</label><input id="ct-taxa-limpeza" type="number" class="input" value="${im.taxaLimpeza||0}"></div>
  </div>`;
}
function marcarContratoAssinadoManual(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.contratoAssinado=true;im.dataContratoAssinado=hoje();
  if(im.status==='contrato')im.status='compras';
  saveAll();renderKanban();renderAba('contrato');_atualizarHeaderDetalhe(im);
  showToast('Contrato marcado como assinado.','sage');
}

// ═══════════════════ ABA DEFINIÇÕES ═══════════════════
function renderAbaDefinicoes(im){
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-sliders"></i> Definições Operacionais</div>
  <div class="form-row" style="flex-wrap:wrap;gap:16px;">
    ${[['def-seguro','seguroEasyCover','Seguro EasyCover'],['def-amenities','kitAmenities','Kit Amenities WeCare'],
       ['def-internet','internetClaro','Internet Claro'],['def-ecohost','ecohost','Sistema EcoHost'],
       ['def-fechadura','fechaduraEletronica','Fechadura Eletrônica']].map(([id,k,label])=>
      `<label class="checkbox-label"><input type="checkbox" id="${id}"${im[k]?' checked':''}> ${label}</label>`).join('')}
  </div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-broom"></i> Equipe de Limpeza</div>
  <div class="form-group">
    <label>Responsável / Empresa</label>
    <input id="def-limpeza-resp" class="input" value="${esc(im.defLimpeza?.responsavel||'')}">
  </div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-bed"></i> Enxoval</div>
  <div class="form-group">
    <label>Modalidade</label>
    <select id="def-enxoval-tipo" class="input">
      <option value="comprado"${(im.defEnxoval?.tipo||'comprado')==='comprado'?' selected':''}>Comprado (Buddemeyer)</option>
      <option value="aluguel"${im.defEnxoval?.tipo==='aluguel'?' selected':''}>Aluguel Mensal (Flashee)</option>
    </select>
  </div>
  <div class="form-group"><label>Fornecedor</label><input id="def-enxoval-forn" class="input" value="${esc(im.defEnxoval?.fornecedor||'')}"></div>
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

// ═══════════════════ ABA REUNIÃO (IA) ═══════════════════
function renderAbaReuniao(im){
  const r=im.reuniao||{};
  const temTexto=!!(r.texto&&r.texto.trim());
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-microphone-lines"></i> Transcrição da Reunião</div>
  <div class="hint" style="margin-bottom:12px;">Suba o <strong>PDF da transcrição do Gemini</strong>. A IA vai ler e preencher automaticamente o formulário do imóvel com o que foi falado na reunião.</div>

  <div style="border:2px dashed var(--border);border-radius:12px;padding:22px;text-align:center;background:var(--surface-2);">
    <input type="file" id="reuniao-pdf" accept="application/pdf" style="display:none;" onchange="_onUploadReuniaoPDF(event)">
    <i class="fa-solid fa-file-pdf" style="font-size:32px;color:var(--brand-red);opacity:.7;"></i>
    <div style="margin:10px 0 14px;font-size:13px;color:var(--text-2);">
      ${r.nomeArquivo?`Arquivo atual: <strong>${esc(r.nomeArquivo)}</strong>`+(r.dataUpload?` · ${fmtDate(r.dataUpload)}`:''):'Nenhum PDF enviado ainda'}
    </div>
    <button class="btn btn-primary btn-sm" onclick="document.getElementById('reuniao-pdf').click()">
      <i class="fa-solid fa-upload"></i> ${r.nomeArquivo?'Trocar PDF':'Escolher PDF'}
    </button>
  </div>
  <div id="reuniao-status" style="margin-top:12px;"></div>

  ${temTexto?`
  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-wand-magic-sparkles"></i> Preenchimento Automático</div>
  ${r.iaPreenchidoEm?`<div class="alert-success"><i class="fa-solid fa-check-circle"></i> IA preencheu <strong>${r.iaEncontrados||0}</strong> campos em ${fmtDate(r.iaPreenchidoEm)}. Veja/ajuste na aba <strong>Formulário</strong>.</div>`:'<div class="alert-info"><i class="fa-solid fa-info-circle"></i> Transcrição carregada. Clique abaixo para a IA preencher o formulário.</div>'}
  <button class="btn btn-primary" id="btn-ia-preencher" onclick="_rodarIAReuniao()">
    <i class="fa-solid fa-robot"></i> Ler transcrição e preencher formulário com IA
  </button>
  <div class="hint" style="margin-top:6px;">A IA não sobrescreve respostas que o proprietário já confirmou. Ela só preenche o rascunho.</div>

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-file-lines"></i> Texto Extraído</div>
  <textarea class="input" id="reuniao-texto" rows="8" style="font-size:12px;" onchange="_salvarTextoReuniao()">${esc(r.texto)}</textarea>
  <div class="hint">Você pode editar/colar o texto manualmente se precisar antes de rodar a IA.</div>
  `:`
  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-keyboard"></i> Ou cole o texto manualmente</div>
  <textarea class="input" id="reuniao-texto" rows="6" placeholder="Cole aqui o texto da transcrição, se preferir não subir o PDF..." onchange="_salvarTextoReuniao()"></textarea>
  <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="_salvarTextoReuniao(true)"><i class="fa-solid fa-save"></i> Salvar texto</button>
  `}
  </div>`;
}

async function _onUploadReuniaoPDF(ev){
  const file=ev.target.files&&ev.target.files[0];
  if(!file)return;
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const status=document.getElementById('reuniao-status');
  status.innerHTML='<div class="alert-info"><span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Lendo o PDF…</div>';
  try{
    const texto=await _extrairTextoPDF(file);
    if(!texto||!texto.trim())throw new Error('Não consegui extrair texto deste PDF (pode ser uma imagem digitalizada).');
    if(!im.reuniao)im.reuniao={};
    im.reuniao.nomeArquivo=file.name;
    im.reuniao.texto=texto;
    im.reuniao.dataUpload=hoje();
    im.reuniao.iaPreenchidoEm=null;
    saveAll();
    showToast('PDF lido com sucesso!','sage');
    renderAba('reuniao');
  }catch(e){
    status.innerHTML=`<div class="alert-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(e.message||'Erro ao ler PDF')}. Tente colar o texto manualmente.</div>`;
  }
}
async function _extrairTextoPDF(file){
  if(!window.pdfjsLib)throw new Error('Leitor de PDF não carregou. Recarregue a página.');
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let texto='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    texto+=content.items.map(it=>it.str).join(' ')+'\n';
  }
  return texto.trim();
}
function _salvarTextoReuniao(avisar){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const t=document.getElementById('reuniao-texto')?.value||'';
  if(!im.reuniao)im.reuniao={};
  im.reuniao.texto=t;
  if(t&&!im.reuniao.dataUpload)im.reuniao.dataUpload=hoje();
  saveAll();
  if(avisar){showToast('Texto salvo!','sage');renderAba('reuniao');}
}
async function _rodarIAReuniao(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const s=window.WC_SYNC||{};
  if(!s.url){showToast('Worker não configurado.','peach');return;}
  const texto=(im.reuniao&&im.reuniao.texto)||document.getElementById('reuniao-texto')?.value||'';
  if(!texto.trim()){showToast('Sem transcrição para ler.','peach');return;}
  const btn=document.getElementById('btn-ia-preencher');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> A IA está lendo a reunião…';}
  try{
    const perguntas=(window.FORM_PERGUNTAS_FLAT||[]).map(p=>({id:p.id,label:p.label}));
    const r=await fetch(s.url.replace(/\/$/,'')+'/extrair-formulario?token='+encodeURIComponent(s.token||''),
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcript:texto,perguntas})});
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Falha na IA');
    const answers=j.answers||{};
    // mescla no rascunho sem sobrescrever o que proprietário confirmou
    if(!im.formRascunho)im.formRascunho={};
    const conf=im.formConfirmados||{};
    let n=0;
    for(const k in answers){
      if(conf[k])continue; // não mexe no que já foi confirmado
      im.formRascunho[k]=answers[k];n++;
    }
    im.reuniao.iaPreenchidoEm=hoje();
    im.reuniao.iaEncontrados=n;
    saveAll();
    showToast(`IA preencheu ${n} campos!`,'sage');
    renderAba('reuniao');
  }catch(e){
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-robot"></i> Ler transcrição e preencher formulário com IA';}
    showToast('Erro: '+(e.message||'IA indisponível'),'peach');
  }
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
      const campo = p.tipo==='textarea'
        ? `<textarea class="input form-rascunho" data-qid="${p.id}" rows="2" placeholder="Pré-preencher (opcional)">${esc(val)}</textarea>`
        : `<input class="input form-rascunho" data-qid="${p.id}" type="${p.tipo==='number'?'number':'text'}" placeholder="Pré-preencher (opcional)" value="${esc(val)}">`;
      return `<div class="form-group">
        <label style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span>${esc(p.label)}</span> ${statusIcon}
        </label>
        ${campo}
        ${respDada!=null&&String(respDada).trim()&&String(respDada)!==String(val)?`<div class="hint" style="color:var(--purple-text)"><i class="fa-solid fa-reply"></i> Resposta do proprietário: <strong>${esc(respDada)}</strong></div>`:''}
      </div>`;
    }).join('')}
  `).join('');

  return`<div class="form-grid">
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
  ${im.formPreenchidoEm?`<div class="alert-success"><i class="fa-solid fa-check-circle"></i> Proprietário respondeu em <strong>${fmtDate(im.formPreenchidoEm)}</strong></div>`
    :'<div class="alert-info"><i class="fa-solid fa-info-circle"></i> Aguardando o proprietário confirmar/preencher.</div>'}
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
  im.formRascunho={...(im.formRascunho||{}),...im.formRespostas};
  saveAll();renderAba('formulario');showToast('Respostas do proprietário importadas.','sage');
}

// ═══════════════════ ABA COMPRAS ═══════════════════
function renderAbaCompras(im){
  const camas=im.camas||[];const banheiros=im.banheiros||1;const quartos=im.quartos||1;
  const compras=im.compras||{};
  const cats=[...new Set(ITENS_COMPRAS.map(i=>i.cat))];
  let totalEstimado=0;
  const rows=ITENS_COMPRAS.map((item,idx)=>{
    const qtdNec=calcNecessario(item,camas,banheiros,quartos);
    let precoUn=0;
    if(item.tipoPreco==='fixo')precoUn=item.preco||0;
    else if(item.tipoPreco==='enxoval')precoUn=getPrecoEnxovalUn(item.nome,camas);
    const qtdReal=compras[idx]?.qtdReal!=null?compras[idx].qtdReal:qtdNec;
    const total=precoUn*qtdReal;
    totalEstimado+=total;
    const comprado=compras[idx]?.comprado||false;
    return{idx,item,qtdNec,qtdReal,precoUn,total,comprado};
  });

  const tabelasCat=cats.map(cat=>{
    const itensC=rows.filter(r=>r.item.cat===cat);
    if(!itensC.length)return'';
    return`<div style="margin-bottom:20px;">
      <div class="form-section-title"><i class="fa-solid fa-tag"></i> ${cat}</div>
      <table class="compras-table" style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr style="background:var(--surface-2)"><th style="padding:6px 8px;">✓</th><th>Item</th><th>Nec.</th><th>Real</th><th>R$/Un</th><th>Total</th><th>Link</th></tr></thead>
        <tbody>
        ${itensC.map(({idx,item,qtdNec,qtdReal,precoUn,total,comprado})=>`<tr style="${comprado?'opacity:.55;text-decoration:line-through;':''}border-bottom:1px solid var(--border);">
          <td style="padding:4px 8px;"><input type="checkbox" class="compra-check" ${comprado?'checked':''} onchange="_onCompraCheck(this,${idx})"></td>
          <td style="padding:4px 8px;">${esc(item.nome)}</td>
          <td style="text-align:center;">${qtdNec}</td>
          <td style="text-align:center;"><input class="input compra-qtd-input" style="width:56px;padding:3px 6px;" type="number" min="0" value="${qtdReal}" data-idx="${idx}" onchange="_onCompraQtd(this,${idx})"></td>
          <td style="text-align:right;padding:0 8px;">${fmtMoeda(precoUn)}</td>
          <td style="text-align:right;padding:0 8px;font-weight:600;">${fmtMoeda(total)}</td>
          <td style="padding:0 8px;">${item.link?`<a href="${esc(item.link)}" target="_blank" class="btn btn-xs btn-outline">🛒</a>`:'-'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('');

  const msgWA=_gerarMsgWhatsAppEnxoval(im,rows);

  return`<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
    <div class="form-section-title" style="margin-bottom:0;"><i class="fa-solid fa-cart-shopping"></i> Lista de Compras</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span class="tag tag-gold" style="font-size:13px;padding:6px 14px;">Total: <strong>${fmtMoeda(totalEstimado)}</strong></span>
      <button class="btn btn-outline btn-sm" onclick="gerarPDFCompras()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
    </div>
  </div>
  ${tabelasCat}

  <div class="form-section-title" style="margin-top:24px;"><i class="fa-brands fa-whatsapp"></i> Mensagem WhatsApp — Enxoval Buddemeyer</div>
  <textarea id="wamsg-enxoval" class="input" rows="9" style="font-size:11.5px;font-family:monospace;" readonly onclick="this.select()">${esc(msgWA)}</textarea>
  <button class="btn btn-sm" style="margin-top:8px;" onclick="navigator.clipboard.writeText(document.getElementById('wamsg-enxoval').value).then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i> Copiar mensagem</button>
  </div>`;
}
function _onCompraCheck(cb,idx){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[idx])im.compras[idx]={};
  im.compras[idx].comprado=cb.checked;
  saveAll();
}
function _onCompraQtd(inp,idx){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[idx])im.compras[idx]={};
  im.compras[idx].qtdReal=+inp.value||0;
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
function gerarPDFCompras(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const win=window.open('','_blank');
  const linhas=ITENS_COMPRAS.map((item,idx)=>{
    const camas=im.camas||[];const qtdNec=calcNecessario(item,camas,im.banheiros||1,im.quartos||1);
    const pUn=item.tipoPreco==='fixo'?item.preco:getPrecoEnxovalUn(item.nome,camas);
    const qtdReal=im.compras?.[idx]?.qtdReal??qtdNec;const comprado=im.compras?.[idx]?.comprado||false;
    return`<tr><td>${item.nome}</td><td style="text-align:center;">${qtdReal}</td><td style="text-align:right;">${fmtMoeda(pUn)}</td><td style="text-align:right;">${fmtMoeda(pUn*qtdReal)}</td><td style="text-align:center;">${comprado?'✅':''}</td></tr>`;
  }).join('');
  win.document.write(`<html><head><title>Compras — ${im.nome}</title>
  <style>body{font-family:Arial;padding:24px;}h2{color:#c7587a;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;}th{background:#f7e4ec;}</style></head><body>
  <h2>Lista de Compras — ${esc(im.nome)}</h2>
  <p>${esc(im.endereco||'')} | ${im.quartos} quartos / ${im.banheiros} banheiros</p>
  <table><thead><tr><th>Item</th><th>Qtd</th><th>R$/Un</th><th>Total</th><th>Comprado</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`);
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
    const qtd=calcNecessario({qtdRule},camas,im.banheiros||1,im.quartos||1);
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
  const plS=PRECOS_PRIMEIRA_LIMPEZA[Math.min(quartos,4)]||PRECOS_PRIMEIRA_LIMPEZA[4];
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
  </div>`;

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-gears"></i> Atividades Operacionais</div>
  ${sCard('Sessão de Fotos','camera','lavender','fotos',ops.fotos,
    pfS?`💡 Sugestão (${quartos} quarto${quartos>1?'s':''}): R$ ${pfS.min}–R$ ${pfS.max} · Responsável: ${pfS.resp}`:'')}
  ${sCard('Primeira Limpeza','broom','peach','limpeza',ops.limpeza,
    plS?.dinairan?`💡 Sugestão (${quartos}q): Dinairan custo R$ ${plS.dinairan.custo} / cobrado R$ ${plS.dinairan.cobrado}`:'')}
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
  </div>
  </div>`;
}

// ═══════════════════ ABA CUSTOS ═══════════════════
function renderAbaCustos(im){
  let totalCompras=0;
  ITENS_COMPRAS.forEach((item,idx)=>{
    const camas=im.camas||[];
    const qtdNec=calcNecessario(item,camas,im.banheiros||1,im.quartos||1);
    const precoUn=item.tipoPreco==='fixo'?item.preco:getPrecoEnxovalUn(item.nome,camas);
    const qtdReal=im.compras?.[idx]?.qtdReal!=null?im.compras[idx].qtdReal:qtdNec;
    totalCompras+=precoUn*qtdReal;
  });
  const totalOps=(+im.ops?.fotos?.custo||0)+(+im.ops?.limpeza?.custo||0)+(+im.ops?.vistoria?.custo||0);
  const subtotal=totalCompras+totalOps;
  const margem=im.margemWecare||15;
  const comissao=subtotal*(margem/100);
  let desc=0;
  if(im.descontoTipo==='reais')desc=im.descontoValor||0;
  else desc=(subtotal+comissao)*(im.descontoValor||0)/100;
  const total=subtotal+comissao-desc;

  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-calculator"></i> Resumo de Custos</div>
  <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
    <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 4px;">Total Compras</td><td style="text-align:right;">${fmtMoeda(totalCompras)}</td></tr>
    <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 4px;">Operacional (Fotos + Limpeza + Vistoria)</td><td style="text-align:right;">${fmtMoeda(totalOps)}</td></tr>
    <tr style="border-top:2px solid var(--border)"><td style="padding:8px 4px;font-weight:600;">Subtotal</td><td style="text-align:right;font-weight:600;">${fmtMoeda(subtotal)}</td></tr>
  </table>

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
function gerarPDFOrcamento(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  let totalC=0;
  const linhasComp=ITENS_COMPRAS.map((item,idx)=>{
    const camas=im.camas||[];
    const qtdNec=calcNecessario(item,camas,im.banheiros||1,im.quartos||1);
    const pUn=item.tipoPreco==='fixo'?item.preco:getPrecoEnxovalUn(item.nome,camas);
    const qtd=im.compras?.[idx]?.qtdReal??qtdNec;
    const tot=pUn*qtd;totalC+=tot;
    return`<tr><td>${item.nome}</td><td style="text-align:center;">${qtd}</td><td style="text-align:right;">${fmtMoeda(pUn)}</td><td style="text-align:right;">${fmtMoeda(tot)}</td></tr>`;
  }).join('');
  const ops=(+im.ops?.fotos?.custo||0)+(+im.ops?.limpeza?.custo||0)+(+im.ops?.vistoria?.custo||0);
  const sub=totalC+ops;const marg=sub*(im.margemWecare||15)/100;
  const desc=im.descontoTipo==='reais'?(im.descontoValor||0):(sub+marg)*(im.descontoValor||0)/100;
  const total=sub+marg-desc;
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Orçamento — ${im.nome}</title>
  <style>body{font-family:Arial;padding:24px;color:#333;}h1{color:#c7587a;font-size:20px;}h2{color:#a57ab5;font-size:15px;margin-top:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:6px 10px;font-size:11px;}th{background:#f7e4ec;}.total{font-size:15px;font-weight:700;text-align:right;margin-top:8px;}</style></head><body>
  <h1>Orçamento de Onboarding — ${esc(im.nome)}</h1>
  <p><strong>Proprietário:</strong> ${esc(im.proprietarioNome||'—')} &nbsp;|&nbsp; <strong>Data:</strong> ${fmtDate(hoje())}</p>
  <h2>Lista de Compras</h2>
  <table><thead><tr><th>Item</th><th>Qtd</th><th>R$/Un</th><th>Total</th></tr></thead><tbody>${linhasComp}</tbody></table>
  <h2>Operacional</h2>
  <table><thead><tr><th>Serviço</th><th>Custo</th></tr></thead><tbody>
    <tr><td>Fotos</td><td style="text-align:right;">${fmtMoeda(im.ops?.fotos?.custo||0)}</td></tr>
    <tr><td>Primeira Limpeza</td><td style="text-align:right;">${fmtMoeda(im.ops?.limpeza?.custo||0)}</td></tr>
    <tr><td>Vistoria</td><td style="text-align:right;">${fmtMoeda(im.ops?.vistoria?.custo||0)}</td></tr>
  </tbody></table>
  <div class="total">Subtotal: ${fmtMoeda(sub)}</div>
  <div class="total">Margem WeCare (${im.margemWecare||15}%): ${fmtMoeda(marg)}</div>
  ${desc?`<div class="total">Desconto: –${fmtMoeda(desc)}</div>`:''}
  <div class="total" style="font-size:20px;color:#c7587a;border-top:2px solid #c7587a;padding-top:8px;margin-top:8px;">Total ao Proprietário: ${fmtMoeda(total)}</div>
  ${im.formasPagamento?`<p style="margin-top:12px;font-size:12px;"><strong>Forma de Pagamento:</strong> ${esc(im.formasPagamento)}</p>`:''}
  </body></html>`);
  win.document.close();win.print();
}

// ═══════════════════ ABA FINAL ═══════════════════
function renderAbaFinal(im){
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-flag-checkered"></i> Checklist de Ativação</div>
  ${_checklistItem('Contrato assinado',im.contratoAssinado)}
  ${_checklistItem('Formulário preenchido pelo proprietário',!!im.formPreenchidoEm)}
  ${_checklistItem('Fotos realizadas',!!(im.ops?.fotos?.data&&im.ops?.fotos?.responsavel))}
  ${_checklistItem('Primeira limpeza realizada',!!(im.ops?.limpeza?.data))}
  ${_checklistItem('Vistoria realizada',!!(im.ops?.vistoria?.data))}
  ${_checklistItem('Compras concluídas',_todasComprasFeitas(im))}

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-photo-film"></i> Links de Entrega</div>
  <div class="form-group"><label>Pasta de Fotos (Drive / Dropbox)</label>
    <div style="display:flex;gap:8px;"><input id="fn-link-fotos" class="input" value="${esc(im.linkFotos||'')}">
    ${im.linkFotos?`<a href="${esc(im.linkFotos)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i></a>`:''}</div></div>
  <div class="form-group"><label>Relatório Final</label>
    <div style="display:flex;gap:8px;"><input id="fn-link-rel" class="input" value="${esc(im.linkRelatorio||'')}">
    ${im.linkRelatorio?`<a href="${esc(im.linkRelatorio)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-external-link-alt"></i></a>`:''}</div></div>

  <div class="form-section-title" style="margin-top:16px;"><i class="fa-solid fa-user-check"></i> Criação do Anúncio</div>
  <div class="form-row">
    <div class="form-group"><label>Responsável</label><input id="fn-resp-criacao" class="input" value="${esc(im.responsavelCriacao||'')}"></div>
    <div class="form-group"><label>Data de Envio</label><input id="fn-data-envio" type="date" class="input" value="${im.dataEnvioParaCriacao||''}"></div>
  </div>
  <div class="form-group"><label>Valor Mínimo / Noite confirmado (R$)</label><input id="fn-min-noite" type="number" class="input" value="${im.valorMinNoite||0}"></div>
  ${im.dataAtivacao?`<div style="background:var(--sage-light,#e8f5e9);border-radius:10px;padding:16px;margin-top:16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🎉</div>
    <div style="font-weight:700;font-size:16px;color:var(--sage);">Imóvel Ativo desde ${fmtDate(im.dataAtivacao)}</div>
  </div>`:''}
  </div>`;
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
function _abrirMapas(query){
  const end=_intelEndereco||document.getElementById('intel-endereco')?.value||'';
  const q=end?`${query}+perto+de+${end}`:query;
  window.open(`https://www.google.com/maps/search/${encodeURIComponent(q.replace(/\+/g,' '))}`,
    '_blank');
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
function abrirNovoPrestador(){
  _editPrestadorIdx=null;
  ['pr-nome','pr-tipo','pr-cidade','pr-tel','pr-obs','pr-valor'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const av=document.getElementById('pr-avaliacao');if(av)av.value='5';
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
  saveAll();closeModal('modal-prestador');renderIntel();showToast('Prestador salvo!','sage');
}
function apagarPrestador(idx){
  if(!confirm('Apagar este prestador?'))return;
  prestadores.splice(idx,1);saveAll();renderIntel();showToast('Removido.','peach');
}

// ═══════════════════ CONFIG ═══════════════════
function renderConfig(){
  const s=window.WC_SYNC||{};
  const workerUrl=s.url||'';
  const webhookUrl=workerUrl?workerUrl.replace(/\/$/,'')+'/zapsign-webhook':'(configure o Worker URL em index.html primeiro)';
  // Preenche campos do HTML estático
  const wurl=document.getElementById('cfg-webhook-url');
  if(wurl)wurl.value=webhookUrl;
  // Renderiza a lista de membros (compatibilidade)
  const mb=document.getElementById('config-membros');
  if(mb)mb.innerHTML=`<div class="text-muted" style="font-size:12px;">Membros gerenciados no painel <strong>Usuários</strong>.</div>`;
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
  if(end){_intelEndereco=end;renderIntel();}
}
function abrirMaps(query){
  const end=_intelEndereco||document.getElementById('intel-endereco')?.value||'';
  const q=end?`${query} perto de ${end}`:query;
  window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, '_blank');
}
function renderPrestadores(){renderIntel();}
function abrirModalMembro(){} // membros não usados nesta versão
function salvarMembro(){}
function abrirModalItem(){} // itens editados inline na aba Compras
function salvarItem(){}
function copiarWebhookUrl(){
  const el=document.getElementById('cfg-webhook-url');
  if(el){navigator.clipboard.writeText(el.value).then(()=>showToast('Copiado!','sage'));}
}
function salvarConfigZapSign(){showToast('Salvo na interface (configure worker.js para persistir).','sage');}
function renderItTipoPreco(){}
function aplicarPresetPerfil(){}

// ═══════════════════ INIT ═══════════════════
function iniciarApp(){
  aplicarPermissoes();
  loadAll();
  const primeiroPanel=document.querySelector('.nav-item[onclick*="kanban"]');
  showPanel('kanban',primeiroPanel);
  kvPull(false).then(()=>{
    // empurra usuários locais para a nuvem (garante que logins criados antes apareçam em todas as máquinas)
    carregarUsuarios();
    if(usuarios.length>1||(usuarios[0]&&usuarios[0].email!=='admin@wecare.com')) _kvPushDebounced();
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
