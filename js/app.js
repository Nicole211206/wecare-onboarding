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
  const titles={kanban:'Kanban',dashboard:'Dashboard',intel:'Inteligência de Mercado',fornecedores:'Fornecedores',vistoria:'Vistoria',config:'Configurações',usuarios:'Usuários'};
  document.getElementById('panel-title').textContent=titles[id]||id;
  if(id==='kanban'){kvPull(false).then(()=>renderKanban()).catch(()=>renderKanban());}
  if(id==='dashboard')renderDashboard();
  if(id==='intel')renderIntel();
  if(id==='fornecedores')renderFornecedores();
  if(id==='vistoria')renderVistoria();
  if(id==='config')renderConfig();
  if(id==='usuarios')renderUsuarios();
}

// Cálculo de quantidades
function totalColchoes(camas){return(camas||[]).reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);}
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
let _lastSentStr=null;

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
    // captação
    captacaoLink:'', jarvisPreenchidoEm:null,
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
    formToken:uid()+uid(), formRascunho:{}, formRespostas:{}, formConfirmados:{}, formPreenchidoEm:null,
    // operacional
    ops:{fotos:{data:'',responsavel:'',hora:'',custo:0},limpeza:{data:'',responsavel:'',hora:'',custo:0},vistoria:{data:'',responsavel:'',hora:'',custo:0,localizacao:'central'}},
    // custos
    custos:[], margemWecare:15, descontoTipo:'reais', descontoValor:0, formasPagamento:'',
    // compras
    compras:{}, freteTotal:0,
    // final
    linkFotos:'', linkRelatorio:'', responsavelCriacao:'', tarefaClaireId:null,
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
  _imovelAtivoId=id;_abaAtiva='captacao';
  const im=getImovel(id);if(!im)return;
  document.getElementById('detalhe-titulo').textContent=im.nome;
  document.getElementById('detalhe-subtitulo').textContent=(im.proprietarioNome||'')+(im.endereco?' · '+im.endereco:'');
  _atualizarHeaderDetalhe(im);
  document.querySelectorAll('#detalhe-tabs .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  renderAba('captacao');
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
  const fns={captacao:()=>renderAbaCaptacao(im),dados:()=>renderAbaDados(im),contrato:()=>renderAbaContrato(im),
    definicoes:()=>renderAbaDefinicoes(im),fotos:()=>renderAbaFotos(im),formulario:()=>renderAbaFormulario(im),
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
  if(aba==='captacao'){
    im.captacaoLink=g('cap-link');
  }
  if(aba==='dados'){
    im.nome=g('d-nome')||im.nome; im.endereco=g('d-endereco');
    im.proprietarioNome=g('d-prop-nome'); im.proprietarioTel=g('d-prop-tel');
    im.comissaoWecare=gn('d-comissao'); im.comissaoBase=g('d-comissao-base');
    im.quartos=gn('d-quartos')||1; im.banheiros=gn('d-banheiros')||1;
    im.plataformas=[];
    document.querySelectorAll('.pltf-check:checked').forEach(c=>im.plataformas.push(c.value));
    im.observacoes=g('d-obs');
    im.camas=_coletarCamas();
    // Acesso & Operação
    im.wifi={rede:g('d-wifi-rede'),senha:g('d-wifi-senha')};
    im.acesso=g('d-acesso'); im.senhaPorta=g('d-senha-porta'); im.vaga=g('d-vaga');
    im.zeladorNome=g('d-zelador-nome'); im.zeladorTel=g('d-zelador-tel');
    // Auto-preenche formRascunho com os dados de acesso
    _autoRascunhoFromDados(im);
    document.getElementById('detalhe-titulo').textContent=im.nome;
  }
  if(aba==='contrato'){
    im.contratoLink=g('ct-link');
    im.valorMinNoite=gn('ct-min-noite'); im.valorBaseNoite=gn('ct-base-noite');
    im.taxaHospedeExtra=gn('ct-taxa-extra'); im.taxaHospedeExtraAcimaDe=gn('ct-extra-acima');
    im.taxaLimpeza=gn('ct-taxa-limpeza');
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
    im.responsavelCriacao=g('fn-resp-criacao'); im.dataEnvioParaCriacao=g('fn-data-envio');
    im.valorMinNoite=gn('fn-min-noite')||im.valorMinNoite;
  }
  if(aba==='compras'){_coletarCompras(im);}
  if(aba==='formulario'){im.formRascunho=_coletarRascunho();}
}
function _autoRascunhoFromDados(im){
  if(!im.formRascunho)im.formRascunho={};
  const conf=im.formConfirmados||{};
  const set=(qid,val)=>{ if(!conf[qid]&&val&&String(val).trim()) im.formRascunho[qid]=String(val).trim(); };
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

// ═══════════════════ ABA CAPTAÇÃO ═══════════════════
function renderAbaCaptacao(im){
  const base=(window.WC_SYNC?.url||'').replace(/\/$/,'');
  const tkn=window.WC_SYNC?.token||'';
  const webhookUrl=base+'/jarvis-notify?token='+encodeURIComponent(tkn)+'&id='+im.id;
  const readUrl=base+'/imovel-dados?id='+im.id+'&token='+encodeURIComponent(tkn);
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

  <details style="margin-top:16px;">
    <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text3);user-select:none;padding:8px 0;">
      <i class="fa-solid fa-gear"></i> Configuração de Integração (Jarvis)
    </summary>
    <div style="margin-top:12px;">
      <div class="alert-info" style="margin-bottom:12px;"><i class="fa-solid fa-info-circle"></i> Configure estes endpoints no Jarvis. Ele lê a pasta automaticamente, preenche os campos e notifica o sistema.</div>

      <div class="form-group">
        <label>🔔 Webhook de Notificação (POST — Jarvis chama quando há novidade)</label>
        <div style="display:flex;gap:8px;">
          <input class="input" readonly style="font-family:monospace;font-size:11px;" value="${esc(webhookUrl)}">
          <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${esc(webhookUrl)}').then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="hint">Auth: token na query string <code>?token=...</code>. Body JSON: <code>{"id":"${im.id}", "dados":{...campos...}}</code></div>
      </div>

      <div class="form-group">
        <label>📖 Endpoint de Leitura (GET — Jarvis consulta dados atuais)</label>
        <div style="display:flex;gap:8px;">
          <input class="input" readonly style="font-family:monospace;font-size:11px;" value="${esc(readUrl)}">
          <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${esc(readUrl)}').then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="hint">Retorna JSON com todos os dados públicos do imóvel. Auth: <code>?token=...</code></div>
      </div>

      <div class="form-group" style="margin-top:8px;">
        <label>🔑 Token de Autenticação</label>
        <div style="display:flex;gap:8px;">
          <input class="input" readonly style="font-family:monospace;font-size:11px;" value="${esc(tkn)}">
          <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${esc(tkn)}').then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i></button>
        </div>
      </div>
    </div>
  </details>

  <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
    <button class="btn btn-sage btn-sm" onclick="salvarImovelAtual()"><i class="fa-solid fa-floppy-disk"></i> Salvar link da pasta</button>
    ${temLink?`<a href="${esc(im.captacaoLink)}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-brands fa-google-drive"></i> Abrir pasta no Drive</a>`:''}
  </div>
  </div>`;
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
  const gastosSetup=im.gastosSetup||[];
  const custoFotos=+ops.fotos?.custo||0;
  const custoLimpeza=+ops.limpeza?.custo||0;
  const custoVistoria=+ops.vistoria?.custo||0;
  const custosExtras=gastosSetup.reduce((s,g)=>s+(+g.valor||0),0);
  const totalSetupBase=custoFotos+custoLimpeza+custoVistoria+custosExtras;
  const margem=im.margemWecare||15;

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
    <div class="form-group"><label>Fotos (R$)</label><input id="ct-op-fotos" type="number" class="input" value="${custoFotos}" oninput="_atualizarSubtotalSetup()"></div>
    <div class="form-group"><label>Limpeza (R$)</label><input id="ct-op-limpeza" type="number" class="input" value="${custoLimpeza}" oninput="_atualizarSubtotalSetup()"></div>
    <div class="form-group"><label>Vistoria (R$)</label><input id="ct-op-vistoria" type="number" class="input" value="${custoVistoria}" oninput="_atualizarSubtotalSetup()"></div>
  </div>

  ${gastosSetup.length?`<div style="margin-bottom:8px;">
    ${gastosSetup.map(g=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
      <span style="flex:1;font-size:13px;">${esc(g.nome)}</span>
      <span style="font-weight:600;font-size:13px;">${fmtMoeda(+g.valor||0)}</span>
      <button class="btn btn-xs btn-outline" onclick="removerGastoSetup('${g.id}')"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('')}
  </div>`:''}

  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
    <input id="ct-gasto-nome" class="input" style="flex:1;min-width:140px;" placeholder="Nome do gasto extra">
    <input id="ct-gasto-val" type="number" class="input" style="width:110px;" placeholder="R$ 0,00" min="0">
    <button class="btn btn-outline btn-sm" onclick="addGastoSetup()"><i class="fa-solid fa-plus"></i> Adicionar gasto</button>
  </div>

  <div class="form-group"><label>Margem WeCare (%)</label><input id="ct-margem" type="number" class="input" value="${margem}" min="0" max="100"></div>
  <div style="background:var(--surface-2);border-radius:10px;padding:12px 14px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;font-weight:600;font-size:13px;color:var(--text-muted);">
      <span>Subtotal Setup (sem compras)</span>
      <span id="ct-subtotal-val">${fmtMoeda(totalSetupBase)}</span>
    </div>
    <div id="ct-subtotal-detail" style="font-size:11px;color:var(--text-muted);margin-top:4px;">
      Fotos ${fmtMoeda(custoFotos)} + Limpeza ${fmtMoeda(custoLimpeza)} + Vistoria ${fmtMoeda(custoVistoria)}${custosExtras?` + Extras ${fmtMoeda(custosExtras)}`:''}
    </div>
  </div>

  <div class="form-section-title"><i class="fa-solid fa-chart-line"></i> Precificação Inicial</div>
  <div class="form-row">
    <div class="form-group"><label>Valor Mínimo / Noite (R$)</label><input id="ct-min-noite" type="number" class="input" value="${im.valorMinNoite||0}"></div>
    <div class="form-group"><label>Valor Base / Noite (R$)</label><input id="ct-base-noite" type="number" class="input" value="${im.valorBaseNoite||0}"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Taxa Hóspede Extra (R$)</label><input id="ct-taxa-extra" type="number" class="input" value="${im.taxaHospedeExtra||0}"></div>
    <div class="form-group"><label>Acima de (nº hóspedes)</label><input id="ct-extra-acima" type="number" class="input" value="${im.taxaHospedeExtraAcimaDe||0}"></div>
  </div>
  <div class="form-group"><label>Taxa de Limpeza (R$)</label><input id="ct-taxa-limpeza" type="number" class="input" value="${im.taxaLimpeza||0}"></div>

  <div class="form-section-title" style="margin-top:24px;"><i class="fa-solid fa-calculator"></i> Resumo do Orçamento</div>
  ${(()=>{
    let totalCompras=0;
    ITENS_COMPRAS.forEach((item,idx)=>{
      const camas=im.camas||[];
      const qtdNec=calcNecessario(item,camas,im.banheiros||1,im.quartos||1);
      const precoUn=item.tipoPreco==='fixo'?item.preco:getPrecoEnxovalUn(item.nome,camas);
      const qtdReal=im.compras?.[idx]?.qtdReal!=null?im.compras[idx].qtdReal:qtdNec;
      totalCompras+=precoUn*qtdReal;
    });
    const frete=im.freteTotal||0;
    const custoFotos2=+ops.fotos?.custo||0;
    const custoLimpeza2=+ops.limpeza?.custo||0;
    const custoVistoria2=+ops.vistoria?.custo||0;
    const custosExtras2=gastosSetup.reduce((s,g)=>s+(+g.valor||0),0);
    const subtotalOrc=totalCompras+frete+custoFotos2+custoLimpeza2+custoVistoria2+custosExtras2;
    const margemOrc=im.margemWecare||15;
    const margemValorOrc=subtotalOrc*(margemOrc/100);
    const subtotalComMargem=subtotalOrc+margemValorOrc;
    const descTipo=im.descontoTipo||'reais';
    const descVal=im.descontoValor||0;
    const descValor=descTipo==='reais'?descVal:subtotalComMargem*(descVal/100);
    const totalProp=subtotalComMargem-descValor;
    return`<table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
      <tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">Total de Compras</td><td style="text-align:right;">${fmtMoeda(totalCompras)}</td></tr>
      ${frete?`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">Frete</td><td style="text-align:right;">${fmtMoeda(frete)}</td></tr>`:''}
      ${custoFotos2?`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">Fotos</td><td style="text-align:right;">${fmtMoeda(custoFotos2)}</td></tr>`:''}
      ${custoLimpeza2?`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">Limpeza</td><td style="text-align:right;">${fmtMoeda(custoLimpeza2)}</td></tr>`:''}
      ${custoVistoria2?`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">Vistoria</td><td style="text-align:right;">${fmtMoeda(custoVistoria2)}</td></tr>`:''}
      ${gastosSetup.map(g=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">${esc(g.nome)}</td><td style="text-align:right;">${fmtMoeda(+g.valor||0)}</td></tr>`).join('')}
      <tr style="border-top:2px solid var(--border)"><td style="padding:7px 4px;font-weight:600;">Subtotal</td><td style="text-align:right;font-weight:600;">${fmtMoeda(subtotalOrc)}</td></tr>
      <tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 4px;">Margem WeCare (${margemOrc}%)</td><td style="text-align:right;">${fmtMoeda(margemValorOrc)}</td></tr>
    </table>
    <div class="form-section-title"><i class="fa-solid fa-tag"></i> Desconto</div>
    <div class="form-row">
      <div class="form-group"><label>Tipo</label>
        <select id="ct-desc-tipo" class="input">
          <option value="reais"${descTipo==='reais'?' selected':''}>R$ (reais)</option>
          <option value="percent"${descTipo==='percent'?' selected':''}>% (porcentagem)</option>
        </select>
      </div>
      <div class="form-group"><label>Valor</label><input id="ct-desc-val" type="number" class="input" value="${descVal}" min="0"></div>
    </div>
    <div style="background:var(--surface-2);border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;">
        <span>Total ao Proprietário</span><span style="color:var(--rose);">${fmtMoeda(totalProp)}</span>
      </div>
    </div>
    <div class="form-section-title"><i class="fa-solid fa-credit-card"></i> Formas de Pagamento</div>
    <div class="form-group">
      <textarea id="ct-pagamento" class="input" rows="3" placeholder="Ex: 50% na assinatura + 50% na entrega das chaves">${esc(im.formasPagamento||'')}</textarea>
    </div>
    <button class="btn btn-sm" style="margin-top:8px;" onclick="gerarPDFOrcamento()"><i class="fa-solid fa-file-pdf"></i> Gerar PDF do Orçamento</button>`;
  })()}
  </div>`;
}
function _atualizarSubtotalSetup(){
  const f=+document.getElementById('ct-op-fotos')?.value||0;
  const l=+document.getElementById('ct-op-limpeza')?.value||0;
  const v=+document.getElementById('ct-op-vistoria')?.value||0;
  const im=getImovel(_imovelAtivoId);
  const extras=(im?.gastosSetup||[]).reduce((s,g)=>s+(+g.valor||0),0);
  const total=f+l+v+extras;
  const valEl=document.getElementById('ct-subtotal-val');
  const detEl=document.getElementById('ct-subtotal-detail');
  if(valEl)valEl.textContent=fmtMoeda(total);
  if(detEl)detEl.textContent=`Fotos ${fmtMoeda(f)} + Limpeza ${fmtMoeda(l)} + Vistoria ${fmtMoeda(v)}`+(extras?` + Extras ${fmtMoeda(extras)}`:'');
}
function addGastoSetup(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const nome=(document.getElementById('ct-gasto-nome')?.value||'').trim();
  const val=parseFloat(document.getElementById('ct-gasto-val')?.value||'0');
  if(!nome){showToast('Informe o nome do gasto.','');return;}
  if(!val||isNaN(val)){showToast('Informe o valor do gasto.','');return;}
  if(!im.gastosSetup)im.gastosSetup=[];
  im.gastosSetup.push({id:uid(),nome,valor:val});
  saveAll();renderAba('contrato');
}
function removerGastoSetup(id){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  im.gastosSetup=(im.gastosSetup||[]).filter(g=>g.id!==id);
  saveAll();renderAba('contrato');
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

  // Gerar linhas — itens de enxoval expandidos por tamanho de cama
  const rows=[];
  ITENS_COMPRAS.forEach((item,idx)=>{
    if(item.tipoPreco==='enxoval'&&camas.length){
      // agrupar camas por tipo enxoval
      const porTipo={};
      camas.forEach(c=>{
        const t=CAMA_TIPO_ENXOVAL[c.tipo]||'Solteiro';
        porTipo[t]=(porTipo[t]||[]);
        porTipo[t].push(c);
      });
      Object.entries(porTipo).forEach(([tipoEnx,camasTipo])=>{
        const [n,base]=(item.qtdRule||'1-colchao').split('-');
        const q=parseInt(n)||1;
        let qtdNec=0;
        // beliche conta como 2 colchões/leitos
        if(base==='colchao')qtdNec=q*camasTipo.reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);
        else if(base==='leito')qtdNec=q*camasTipo.reduce((s,c)=>s+(CAMA_LEITOS[c.tipo]||1)*(+c.qtd||1),0);
        else qtdNec=q;
        const precoUn=(PRECOS_ENXOVAL[item.nome]||{})[tipoEnx]||0;
        const subKey=`${idx}_${tipoEnx}`;
        const qtdTem=compras[subKey]?.qtdTem!=null?compras[subKey].qtdTem:0;
        const falta=Math.max(0,qtdNec-qtdTem);
        const total=precoUn*falta;
        totalEstimado+=total;
        const comprado=compras[subKey]?.comprado||false;
        rows.push({subKey,item,label:`${item.nome} (${tipoEnx})`,qtdNec,qtdTem,falta,precoUn,total,comprado});
      });
    } else {
      const qtdNec=calcNecessario(item,camas,banheiros,quartos);
      const precoUn=item.tipoPreco==='fixo'?item.preco||0:getPrecoEnxovalUn(item.nome,camas);
      const subKey=String(idx);
      const qtdTem=compras[subKey]?.qtdTem!=null?compras[subKey].qtdTem:0;
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
          <td style="text-align:right;padding:0 8px;">${fmtMoeda(precoUn)}</td>
          <td style="text-align:right;padding:0 8px;font-weight:600;">${fmtMoeda(total)}</td>
          <td style="padding:0 8px;">${item.link?`<a href="${esc(item.link)}" target="_blank" class="btn btn-xs btn-outline">🛒</a>`:'-'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('');

  const msgWA=_gerarMsgWhatsAppEnxoval(im,rows);

  const frete=im.freteTotal||0;
  return`<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
    <div class="form-section-title" style="margin-bottom:0;"><i class="fa-solid fa-cart-shopping"></i> Lista de Compras</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span class="tag tag-gold" style="font-size:13px;padding:6px 14px;">Total c/ frete: <strong>${fmtMoeda(totalEstimado+frete)}</strong></span>
      <button class="btn btn-outline btn-sm" onclick="gerarPDFCompras()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
    </div>
  </div>
  ${tabelasCat}
  <div style="display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px;background:var(--surface-2,#f8f4f9);border-radius:10px;flex-wrap:wrap;">
    <span style="font-size:13px;font-weight:600;"><i class="fa-solid fa-truck"></i> Frete total (R$)</span>
    <input type="number" id="compras-frete" class="input" style="width:120px;" min="0" step="0.01" value="${frete}" onchange="_onFreteChange(this)">
    <span class="text-muted" style="font-size:12px;">Itens: ${fmtMoeda(totalEstimado)} + Frete: ${fmtMoeda(frete)} = <strong>${fmtMoeda(totalEstimado+frete)}</strong></span>
  </div>

  <div class="form-section-title" style="margin-top:24px;"><i class="fa-brands fa-whatsapp"></i> Mensagem WhatsApp — Enxoval Buddemeyer</div>
  <textarea id="wamsg-enxoval" class="input" rows="9" style="font-size:11.5px;font-family:monospace;" readonly onclick="this.select()">${esc(msgWA)}</textarea>
  <button class="btn btn-sm" style="margin-top:8px;" onclick="navigator.clipboard.writeText(document.getElementById('wamsg-enxoval').value).then(()=>showToast('Copiado!','sage'))"><i class="fa-solid fa-copy"></i> Copiar mensagem</button>
  </div>`;
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
    <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="pedirCotacaoJarvis('${id}')">
      <i class="fa-solid fa-robot"></i> Pedir cotação ao Jarvis
    </button>
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
    <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="pedirCotacaoJarvis('vistoria')">
      <i class="fa-solid fa-robot"></i> Pedir cotação ao Jarvis
    </button>
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
  const freteCustos=im.freteTotal||0;
  const subtotal=totalCompras+freteCustos;
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
  const frete=im.freteTotal||0;
  const custoFotos=+im.ops?.fotos?.custo||0;
  const custoLimpeza=+im.ops?.limpeza?.custo||0;
  const custoVistoria=+im.ops?.vistoria?.custo||0;
  const gastosSetup=im.gastosSetup||[];
  const custosExtras=gastosSetup.reduce((s,g)=>s+(+g.valor||0),0);
  const linhasExtras=gastosSetup.map(g=>`<tr><td>${esc(g.nome)}</td><td style="text-align:right;">${fmtMoeda(+g.valor||0)}</td></tr>`).join('');
  const sub=totalC+frete+custoFotos+custoLimpeza+custoVistoria+custosExtras;
  const marg=sub*(im.margemWecare||15)/100;
  const desc=im.descontoTipo==='reais'?(im.descontoValor||0):(sub+marg)*(im.descontoValor||0)/100;
  const total=sub+marg-desc;
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Orçamento — ${im.nome}</title>
  <style>body{font-family:Arial;padding:24px;color:#333;}h1{color:#c7587a;font-size:20px;}h2{color:#a57ab5;font-size:15px;margin-top:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:6px 10px;font-size:11px;}th{background:#f7e4ec;}.total{font-size:15px;font-weight:700;text-align:right;margin-top:8px;}</style></head><body>
  <h1>Orçamento de Onboarding — ${esc(im.nome)}</h1>
  <p><strong>Proprietário:</strong> ${esc(im.proprietarioNome||'—')} &nbsp;|&nbsp; <strong>Data:</strong> ${fmtDate(hoje())}</p>
  <h2>Lista de Compras</h2>
  <table><thead><tr><th>Item</th><th>Qtd</th><th>R$/Un</th><th>Total</th></tr></thead><tbody>${linhasComp}</tbody></table>
  <div class="total">Total Compras: ${fmtMoeda(totalC)}</div>
  <h2>Produção e Setup</h2>
  <table><thead><tr><th>Serviço</th><th>Custo</th></tr></thead><tbody>
    ${frete?`<tr><td>Frete</td><td style="text-align:right;">${fmtMoeda(frete)}</td></tr>`:''}
    ${custoFotos?`<tr><td>Fotos</td><td style="text-align:right;">${fmtMoeda(custoFotos)}</td></tr>`:''}
    ${custoLimpeza?`<tr><td>Primeira Limpeza</td><td style="text-align:right;">${fmtMoeda(custoLimpeza)}</td></tr>`:''}
    ${custoVistoria?`<tr><td>Vistoria</td><td style="text-align:right;">${fmtMoeda(custoVistoria)}</td></tr>`:''}
    ${linhasExtras}
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
  const resp=im.responsavelCriacao||'';
  return`<div class="form-grid">
  <div class="form-section-title"><i class="fa-solid fa-list-check"></i> Checklist Final</div>
  ${_checklistItem('Contrato assinado',im.contratoAssinado)}
  ${_checklistItem('Formulário preenchido pelo proprietário',!!im.formPreenchidoEm)}
  ${_checklistItem('Fotos realizadas',!!(im.ops?.fotos?.data&&im.ops?.fotos?.responsavel))}
  ${_checklistItem('Primeira limpeza realizada',!!(im.ops?.limpeza?.data))}
  ${_checklistItem('Vistoria realizada',!!(im.ops?.vistoria?.data))}
  ${_checklistItem('Compras concluídas',_todasComprasFeitas(im))}

  <div class="form-section-title" style="margin-top:20px;"><i class="fa-solid fa-file-pdf"></i> Relatório Compilado</div>
  <div class="hint" style="margin-bottom:8px;">PDF com todas as respostas do formulário preenchido pelo proprietário.</div>
  <button class="btn btn-outline btn-sm" onclick="gerarPDFFormulario()"><i class="fa-solid fa-file-pdf"></i> Gerar PDF do formulário</button>

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
  const respostas={...(im.formRascunho||{}),...(im.formRespostas||{})};
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
function gerarPDFFormulario(){
  const im=getImovel(_imovelAtivoId);if(!im)return;
  const respostas={...(im.formRascunho||{}),...(im.formRespostas||{})};
  const secoes=window.FORM_SECOES||[];
  let html=`<html><head><title>Formulário — ${esc(im.nome)}</title>
  <style>body{font-family:Arial;padding:24px;color:#333;}h1{color:#c7587a;font-size:20px;}h2{color:#a57ab5;font-size:14px;margin-top:20px;border-bottom:1px solid #ddd;padding-bottom:4px;}.q{margin:10px 0;}.ql{font-weight:600;font-size:12px;color:#555;}.qa{font-size:13px;padding:4px 0;}.empty{color:#bbb;font-style:italic;}</style></head><body>
  <h1>Formulário — ${esc(im.nome)}</h1>
  <p style="font-size:12px;color:#888;">Proprietário: ${esc(im.proprietarioNome||'—')} | Endereço: ${esc(im.endereco||'—')} | Gerado: ${fmtDate(hoje())}</p>`;
  secoes.forEach(sec=>{
    html+=`<h2>${esc(sec.secao)}</h2>`;
    (sec.perguntas||[]).forEach(p=>{
      const r=respostas[p.id];
      html+=`<div class="q"><div class="ql">${esc(p.label)}</div><div class="qa">${r?esc(r):'<span class="empty">Não respondido</span>'}</div></div>`;
    });
  });
  html+='</body></html>';
  const win=window.open('','_blank');
  win.document.write(html);win.document.close();win.print();
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

// ═══════════════════ VISTORIA ═══════════════════
function _migrarVistoriasAntigas(){
  // Recupera vistorias salvas no formato antigo (vistoria_final_* e vistoria_draft_*)
  const lista=JSON.parse(localStorage.getItem('wc_vistorias')||'[]');
  const idsExistentes=new Set(lista.map(v=>v.id));
  let alterou=false;
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key||(!key.startsWith('vistoria_final_')&&!key.startsWith('vistoria_draft_')))continue;
    try{
      const d=JSON.parse(localStorage.getItem(key)||'{}');
      if(!d.imovelId&&!d.currentImovel?.id)continue;
      const imovelId=d.imovelId||d.currentImovel?.id||'';
      const vid=key;
      if(idsExistentes.has(vid))continue;
      lista.push({
        id:vid,
        imovelId,
        imovelNome:d.imovelNome||imovelId,
        data:d.data||d.dataVistoria||'',
        vistoriador:d.vistoriador||'',
        apto:d.aptoPara||d.apto||'',
        pendencias:d.pendencias||[],
        sentAt:d.sentAt||d.savedAt||new Date().toISOString()
      });
      idsExistentes.add(vid);
      alterou=true;
    }catch(e){}
  }
  if(alterou)localStorage.setItem('wc_vistorias',JSON.stringify(lista));
  return lista;
}
function renderVistoria(){
  const imoveis=(JSON.parse(localStorage.getItem('wc_imoveis')||'[]')).filter(im=>im.status!=='perdido');
  const vistorias=_migrarVistoriasAntigas();

  const linhas=vistorias.length?vistorias.slice().reverse().map(v=>{
    const im=imoveis.find(i=>i.id===v.imovelId);
    const cor=v.apto==='sim'?'sage':v.apto==='nao'?'rose':'gold';
    const label=v.apto==='sim'?'Apto':v.apto==='nao'?'Não apto':'Parcial';
    return`<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:10px 8px;font-weight:600;cursor:pointer;" onclick="window.open('vistoria.html?id=${encodeURIComponent(v.imovelId)}&vid=${encodeURIComponent(v.id)}','_blank')">${esc(im?.nome||v.imovelId)}</td>
      <td style="padding:10px 8px;cursor:pointer;" onclick="window.open('vistoria.html?id=${encodeURIComponent(v.imovelId)}&vid=${encodeURIComponent(v.id)}','_blank')">${fmtDate(v.data)}</td>
      <td style="padding:10px 8px;cursor:pointer;" onclick="window.open('vistoria.html?id=${encodeURIComponent(v.imovelId)}&vid=${encodeURIComponent(v.id)}','_blank')">${esc(v.vistoriador||'—')}</td>
      <td style="padding:10px 8px;cursor:pointer;" onclick="window.open('vistoria.html?id=${encodeURIComponent(v.imovelId)}&vid=${encodeURIComponent(v.id)}','_blank')"><span class="tag tag-${cor}">${label}</span></td>
      <td style="padding:10px 8px;cursor:pointer;" onclick="window.open('vistoria.html?id=${encodeURIComponent(v.imovelId)}&vid=${encodeURIComponent(v.id)}','_blank')">${v.pendencias?.length||0} pendência(s)</td>
      <td style="padding:10px 8px;text-align:center;"><button onclick="removerVistoria('${esc(v.id)}')" title="Apagar vistoria" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px 6px;border-radius:4px;" onmouseover="this.style.color='var(--rose)'" onmouseout="this.style.color='var(--text-muted)'"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`;
  }).join(''):
  `<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text-muted);">Nenhuma vistoria registrada ainda.</td></tr>`;

  document.getElementById('vistoria-wrap').innerHTML=`
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
    <div>
      <div class="section-title" style="margin-bottom:4px;">Vistorias de Onboarding</div>
      <div class="text-muted">Formulário digital de inspeção dos imóveis</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <select id="vistoria-select-imovel" class="input" style="min-width:200px;">
        <option value="">Selecionar imóvel…</option>
        ${imoveis.map(im=>`<option value="${esc(im.id)}">${esc(im.nome)}</option>`).join('')}
      </select>
      <button class="btn btn-rose" onclick="iniciarVistoria()">
        <i class="fa-solid fa-plus"></i> Nova Vistoria
      </button>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</span></div>
    <div class="card-body" style="padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:var(--surface-2);">
          <th style="padding:8px;text-align:left;">Imóvel</th>
          <th style="padding:8px;text-align:left;">Data</th>
          <th style="padding:8px;text-align:left;">Vistoriador</th>
          <th style="padding:8px;text-align:left;">Status</th>
          <th style="padding:8px;text-align:left;">Pendências</th>
          <th style="padding:8px;width:40px;"></th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  </div>`;
}
function removerVistoria(id){
  if(!confirm('Apagar esta vistoria? Esta ação não pode ser desfeita.'))return;
  try{
    const lista=JSON.parse(localStorage.getItem('wc_vistorias')||'[]');
    localStorage.setItem('wc_vistorias',JSON.stringify(lista.filter(v=>v.id!==id)));
    localStorage.removeItem('vistoria_final_'+id);
    localStorage.removeItem('vistoria_draft_'+id);
  }catch(e){console.warn('Erro ao remover vistoria',e);}
  renderVistoria();
}
function iniciarVistoria(){
  const id=document.getElementById('vistoria-select-imovel')?.value;
  const imoveis=JSON.parse(localStorage.getItem('wc_imoveis')||'[]');
  const im=imoveis.find(i=>i.id===id);
  const url='vistoria.html'+(id?`?id=${encodeURIComponent(id)}&nome=${encodeURIComponent(im?.nome||'')}`:``);
  window.open(url,'_blank');
}

// ═══════════════════ FORNECEDORES ═══════════════════
function renderFornecedores(){
  const tipos=[...new Set(['Limpeza','Fotógrafo','Hidráulica','Elétrica','Vistoria','Fechadura','Internet','Reforma','Outros'])];
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
    <button class="btn btn-rose btn-sm" onclick="abrirNovoPrestador()"><i class="fa-solid fa-plus"></i> Novo Fornecedor</button>
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

// ═══════════════════ CONFIG ═══════════════════
function renderConfig(){
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
  if(end){_intelEndereco=end;renderIntel();_buscarEmbeddedMapa(end);}
}
function abrirMaps(query){_buscarEmbeddedMapa(query);}
function renderPrestadores(){renderIntel();}
function abrirModalMembro(){} // membros não usados nesta versão
function salvarMembro(){}
function abrirModalItem(){} // itens editados inline na aba Compras
function salvarItem(){}
function renderItTipoPreco(){}
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
