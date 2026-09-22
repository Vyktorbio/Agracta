/* ============================================================================
   FotosNotasCore — a foto da observação de campo mora no aparelho
   ----------------------------------------------------------------------------
   Até a 14a publicação a foto da nota viajava dentro do estado: base64 no
   localStorage (que estoura em ~5 MB) e, na nuvem, fatiada na coleção `media`.
   Foto não é dado de pesquisa que precise estar em todos os aparelhos, e cada
   foto no servidor custava espaço, escrita e — com o histórico append-only —
   uma cópia que nunca mais sai.

   Agora a foto fica num IndexedDB próprio deste aparelho (`agracta-fotos-notas`)
   e nunca entra em save(), outbox ou sincronização. A nota sincroniza só a
   etiqueta `fotoLocal:{nome, em}`, para os outros aparelhos saberem que a foto
   existe e com que nome procurá-la.

   O NOME É DO AGRACTA, não da câmera: IMG_20260922_0931.jpg não diz nada numa
   pasta de downloads. O arquivo sai como
       Agracta_<local>_<quadra>_<AAAA-MM-DD>_<titulo>_<id>.jpg
   sem acento nem espaço, para abrir igual em qualquer sistema.

   MOTOR PURO no nome; o armazenamento recebe o indexedDB por parâmetro, e por
   isso o teste roda no Node com fake-indexeddb.
   ============================================================================ */
(function(root){
  'use strict';

  var DB='agracta-fotos-notas', STORE='fotos';

  function trecho(v, max){
    var s=String(v==null?'':v).normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return s.slice(0,max).replace(/-+$/,'');
  }
  function extensao(tipo){
    return /png/i.test(tipo||'')?'png':/webp/i.test(tipo||'')?'webp':'jpg';
  }
  function tipoDe(dataUrl){
    var m=/^data:(image\/[a-z0-9.+-]+)[;,]/i.exec(String(dataUrl||''));
    return m?m[1].toLowerCase():'image/jpeg';
  }
  /* {local, quadra, data, titulo, id, tipo} → nome do arquivo. Parte que falta
     some do nome (nada de "sem-quadra" inventado); o id garante que dois nomes
     nunca coincidem. */
  function nomeArquivo(o){
    o=o||{};
    var data=/^\d{4}-\d{2}-\d{2}/.test(String(o.data||''))?String(o.data).slice(0,10):'';
    var id=trecho(String(o.id||'').replace(/^note_/,''),8);
    var partes=['Agracta',trecho(o.local,24),trecho(o.quadra,24),data,trecho(o.titulo,40),id]
      .filter(function(p){ return !!p; });
    return partes.join('_')+'.'+extensao(o.tipo);
  }

  function criar(idb){
    if(!idb) throw Error('Armazenamento do aparelho indisponível.');
    function abrir(){ return new Promise(function(resolve,reject){
      var rq;
      try{ rq=idb.open(DB,1); }catch(e){ reject(e); return; }
      rq.onupgradeneeded=function(){ var db=rq.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); };
      rq.onsuccess=function(){ resolve(rq.result); };
      rq.onerror=function(){ reject(rq.error); };
      rq.onblocked=function(){ reject(Error('Feche outras abas do Agracta para liberar o armazenamento das fotos.')); };
    }); }
    function tx(modo, acao){
      return abrir().then(function(db){ return new Promise(function(resolve,reject){
        var out, t=db.transaction(STORE,modo), os=t.objectStore(STORE);
        t.oncomplete=function(){ db.close(); resolve(out); };
        t.onabort=t.onerror=function(){ db.close(); reject(t.error||Error('Não foi possível guardar a foto no aparelho.')); };
        try{ acao(os,function(v){ out=v; }); }catch(e){ try{ t.abort(); }catch(_){} db.close(); reject(e); }
      }); });
    }
    return {
      /* dataUrl é a imagem já reduzida pelo app; meta é {nome, em}. */
      guardar:function(id, dataUrl, meta){
        if(!id||typeof dataUrl!=='string'||dataUrl.indexOf('data:image/')!==0) return Promise.reject(Error('Foto inválida.'));
        return tx('readwrite',function(os){ os.put({id:id, dataUrl:dataUrl, nome:(meta&&meta.nome)||'', em:(meta&&meta.em)||new Date().toISOString()}); });
      },
      /* {id: dataUrl} de todas as fotos deste aparelho. */
      todas:function(){
        return tx('readonly',function(os,done){
          var rq=os.getAll();
          rq.onsuccess=function(){ var o={}; (rq.result||[]).forEach(function(r){ if(r&&r.id) o[r.id]=r.dataUrl; }); done(o); };
        });
      },
      apagar:function(id){ return tx('readwrite',function(os){ os.delete(id); }); }
    };
  }

  var API={DB:DB, nomeArquivo:nomeArquivo, tipoDe:tipoDe, extensao:extensao, criar:criar};
  root.FotosNotasCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
