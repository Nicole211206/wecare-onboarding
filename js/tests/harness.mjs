// Carrega o js/app.js real num contexto isolado do node:vm, com DOM/storage/fetch falsos —
// pra testar a lógica de dados (loadAll, migrações, sync, merge) sem navegador.
// Uso: const app = carregarApp({localStorage: {...}, fetch}); app.run('loadAll()')
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const APP_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app.js');
const SRC = fs.readFileSync(APP_JS, 'utf8');

// Elemento DOM "coringa": qualquer propriedade/chamada devolve outro coringa.
function coringa() {
  const f = function () { return coringa(); };
  return new Proxy(f, {
    get: (t, k) => {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'length') return 0;
      if (k === 'value') return '';
      if (k === 'checked') return false;
      if (k === 'forEach') return () => {};
      if (k === 'classList') return {add() {}, remove() {}, contains() { return false; }, toggle() {}};
      return coringa();
    },
    set: () => true,
    apply: () => coringa(),
  });
}

export function carregarApp({localStorage: inicial = {}, fetch} = {}) {
  const store = new Map(Object.entries(inicial).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    key: i => [...store.keys()][i],
    get length() { return store.size; },
  };
  const toasts = [];
  const ctx = {
    console, localStorage, sessionStorage: localStorage, JSON, Math, Date, Promise, Set, Map, Object, Array, String, Number,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    fetch: fetch || (async () => { throw new Error('sem rede no teste'); }),
    navigator: {sendBeacon() { return true; }}, document: coringa(), confirm: () => true, alert() {}, location: {reload() {}},
    __toasts: toasts,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, {filename: 'app.js'});
  vm.runInContext("showToast=(m)=>__toasts.push(m);renderAba=()=>{};renderKanban=()=>{};renderConfig=()=>{};", ctx);
  return {run: code => vm.runInContext(code, ctx), store, toasts};
}
