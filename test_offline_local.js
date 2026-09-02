/* Cofre offline e autorização do aparelho.
 *
 * Protege três regressões importantes:
 *   - dados padrão/locais não podem abrir sem um login online previamente validado;
 *   - a gravação só é confirmada depois que a transação IndexedDB conclui;
 *   - um checkpoint mais novo recupera inclusive os metadados de nomes/locais;
 *   - o Firestore não cria uma segunda fila IndexedDB concorrente.
 *
 * Rodar: node test_offline_local.js
 */
var fs=require('fs'),vm=require('vm');
var source=fs.readFileSync('firebase-sync.js','utf8');

function assert(ok,msg){if(!ok)throw new Error(msg);console.log('  ok    '+msg);}
function tick(){return new Promise(function(resolve){setImmediate(resolve);});}

function makeIndexedDB(seed){
  var mem={active:seed||null}, writes=0;
  return {
    mem:mem,
    writes:function(){return writes;},
    open:function(){
      var req={result:null,error:null};
      setImmediate(function(){
        var db={
          objectStoreNames:{contains:function(){return true;}},
          createObjectStore:function(){},close:function(){},
          transaction:function(){
            var tx={error:null,oncomplete:null,onerror:null,onabort:null};
            tx.objectStore=function(){return {
              get:function(key){
                var getReq={result:null,error:null,onsuccess:null,onerror:null};
                setImmediate(function(){getReq.result=mem[key]||null;if(getReq.onsuccess)getReq.onsuccess();});
                return getReq;
              },
              put:function(value,key){
                setImmediate(function(){mem[key]=value;writes++;if(tx.oncomplete)tx.oncomplete();});
              }
            };};
            return tx;
          }
        };
        req.result=db;
        if(req.onsuccess)req.onsuccess();
      });
      return req;
    }
  };
}

function makeContext(opts){
  opts=opts||{};
  var store=Object.assign({},opts.store||{}),session={};
  var ctx={
    console:console,Promise:Promise,setTimeout:setTimeout,clearTimeout:clearTimeout,
    setImmediate:setImmediate,Date:Date,JSON:JSON,Object:Object,Array:Array,
    String:String,Number:Number,Math:Math,encodeURIComponent:encodeURIComponent,
    decodeURIComponent:decodeURIComponent,escape:escape,unescape:unescape,Buffer:Buffer,
    indexedDB:opts.indexedDB||makeIndexedDB(opts.seed),
    _reloads:0
  };
  ctx.window=ctx;ctx.globalThis=ctx;
  ctx.btoa=function(s){return Buffer.from(s,'binary').toString('base64');};
  ctx.localStorage={
    getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
    setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}
  };
  ctx.sessionStorage={
    getItem:function(k){return Object.prototype.hasOwnProperty.call(session,k)?session[k]:null;},
    setItem:function(k,v){session[k]=String(v);}
  };
  ctx.location={reload:function(){ctx._reloads++;}};
  ctx.document={querySelector:function(){return null;},getElementById:function(){return null;},
    addEventListener:function(){},visibilityState:'visible'};
  ctx.addEventListener=function(){};
  ctx.cloudState=function(){return JSON.parse(JSON.stringify(opts.state||null));};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx:ctx,store:store,idb:ctx.indexedDB};
}

var estado={
  data:{Q1:{cultura:'soja',estudos:[{id:'E1'}]}},
  qgeo:{Q1:[[-22.66,-47.52],[-22.65,-47.51]]},qgeots:{Q1:10},
  locais:{L1:{nome:'Fazenda'}},qlocal:{Q1:'L1'},qnome:{Q1:'Quadra 1'},
  qnomets:{Q1:11},qlocalts:{Q1:12},locaists:{L1:13},
  randomizacoes:[],notas_campo:[],_deletedQuadras:{},_deletedLocais:{},_deletedNotas:{},rev:3
};

(async function(){
  console.log('\n--- Uma única fonte de persistência offline ---');
  assert(!/FB\.db\.enablePersistence\s*\(/.test(source),
    'Firestore usa cache em memória; o cofre durável continua sendo o do Agracta');

  console.log('\n--- Entrada offline exige aparelho previamente validado ---');
  var a=makeContext({state:estado});
  await tick();await tick();
  assert(a.ctx.AgractaFirebase.offlineAccessAllowed()===false,
    'dados locais sozinhos não liberam a tela sem autenticação anterior');
  a.store['agracta-trusted-device']='1';
  assert(a.ctx.AgractaFirebase.offlineAccessAllowed()===false,
    'marcador antigo sem identidade também não libera');
  a.store['agracta-trusted-device']=JSON.stringify({
    v:2,uid:'u1',email:'tecnico@example.com',name:'Técnico',authenticatedAt:100
  });
  assert(a.ctx.AgractaFirebase.offlineAccessAllowed()===true,
    'aparelho validado com dados locais pode entrar sem conexão');

  console.log('\n--- Confirmação espera a gravação durável ---');
  var terminou=false,p=a.ctx.AgractaFirebase.flushLocal().then(function(v){terminou=true;return v;});
  assert(terminou===false,'a promessa não confirma antes do fim da transação');
  await p;
  assert(terminou===true && a.idb.writes()>0,'confirma depois do oncomplete do IndexedDB');
  assert(a.idb.mem.active.state.data.Q1.cultura==='soja','checkpoint guarda os dados ativos');
  assert(a.idb.mem.active.state.qnomets.Q1===11,'checkpoint guarda metadados de nome');
  assert(Number(a.store['agracta-local-state-ts'])>0,'carimbo local acompanha checkpoint concluído');

  console.log('\n--- Abertura recupera o checkpoint mais novo ---');
  var novo=JSON.parse(JSON.stringify(estado));
  novo.data.Q1.cultura='milho';novo.qnome.Q1='Quadra recuperada';novo.qnomets.Q1=501;
  novo.qlocalts.Q1=502;novo.locaists.L1=503;
  var velho=JSON.parse(JSON.stringify(estado));velho.data.Q1.cultura='algodão';
  var b=makeContext({state:velho,seed:{savedAt:500,state:novo},store:{
    'iracema-v7':JSON.stringify(velho.data),'agracta-local-state-ts':'100',
    'iracema-safety':'backup-grande-antigo'
  }});
  await tick();await tick();await tick();
  assert(JSON.parse(b.store['iracema-v7']).Q1.cultura==='milho','estado mais novo volta ao armazenamento ativo');
  assert(JSON.parse(b.store['iracema-qnomets-v1']).Q1===501,'restaura qnomets');
  assert(JSON.parse(b.store['iracema-qlocalts-v1']).Q1===502,'restaura qlocalts');
  assert(JSON.parse(b.store['iracema-locaists-v1']).L1===503,'restaura locaists');
  assert(!Object.prototype.hasOwnProperty.call(b.store,'iracema-safety'),'remove backup redundante que ocupava a quota');
  assert(b.ctx._reloads===1,'reabre o app uma vez depois da recuperação');

  console.log('\n15 verificações, nenhuma falha.');
})().catch(function(e){console.error(e&&e.stack||e);process.exit(1);});
