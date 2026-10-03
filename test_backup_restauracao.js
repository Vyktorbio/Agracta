'use strict';
const assert=require('node:assert/strict');
const {createContext}=require('./tests/state-harness.cjs');
const c=createContext(),clone=x=>JSON.parse(JSON.stringify(x));
c.render=()=>{};c.enforceAccess=()=>{};c.buildLocalChip=()=>{};c.updateAgendaBadge=()=>{};c._stxToast=()=>{};
c.data={__config:{},Q1:{cultura:'Soja',estudos:[{id:'S',aplicacoes:[{id:'P'}],avaliacoes:[{id:'A',notas:{T1R1:{v:7}},variaveis:['v']}]}]}};
c.QGEO={Q1:[[0,0],[0,1],[1,0]]};c.QGEO_TS={Q1:1};c._geo={test:true};c.GEOREF_TS=99;
c.LOCAIS={L:{nome:'Local'}};c.QLOCAL={Q1:'L'};c.QNOME={Q1:'Quadra 1'};c.QNOME_TS={Q1:1};c.QLOCAL_TS={Q1:1};c.LOCAIS_TS={L:1};
c.NOTAS_CAMPO=[{id:'N',titulo:'Observação fictícia',foto:'data:image/jpeg;base64,'+'x'.repeat(1200100)}];
c.RZLIB=[];c.ITENS={I:{id:'I',nome:'Item'}};c.ITENS_TS={I:1};c._delItens={};
c._delQuadras={};c._delLocais={};c._delNotas={};c._cloudRev=5;
(async()=>{
 const snap=c.safetySnap();const photo=snap.notas_campo[0].foto;
 assert.equal(snap.georefts,99);assert.equal(snap.itens.I.nome,'Item');
 c.NOTAS_CAMPO[0].titulo='Alterada';assert.equal(snap.notas_campo[0].titulo,'Observação fictícia','snapshot não muda junto com a memória ativa');
 // LocalStorage cannot hold the photo backup; real IndexedDB fallback must preserve it.
 const originalSet=c.localStorage.setItem;c.localStorage.setItem=(k,v)=>{if(k==='iracema-safety')throw new Error('QuotaExceededError');originalSet(k,v);};
 assert.equal(await new Promise(resolve=>{assert.equal(c.safetyBackup('teste quota',null,resolve),false,'contrato síncrono não confunde uma promessa com cópia confirmada');}),true,'cofre confirma a cópia independente');
 const archive=await c.AgractaFirebase.listBackups();assert.equal(archive.length,1);assert.equal(archive[0].notas_campo[0].foto,photo);
 const intact=c.data;assert.equal(c.safetyApply(snap),false,'restauração recusa enquanto a cópia atual não pode ser confirmada');assert.equal(c.data,intact);
 c.localStorage.setItem=originalSet;
 delete c.data.Q1;delete c.QGEO.Q1;delete c.QLOCAL.Q1;delete c.QNOME.Q1;c.NOTAS_CAMPO=[];
 c._delQuadras={Q1:Date.now()};c._delNotas={N:Date.now()};c._delLocais={L:Date.now()};
 const deleted=clone(c.cloudState());
 c.safetyApply(snap);const restored=clone(c.cloudState());
 assert.equal(restored.notas_campo[0].foto,photo);assert(restored.data.Q1);assert.equal(restored.georefts,99);
 assert.equal(restored._deletedQuadras.Q1,undefined);assert.equal(restored._deletedLocais.L,undefined);assert(restored.data.__config.restoreGeneration);
 for(const merged of [c.cloudMerge(restored,deleted),c.cloudMerge(deleted,restored)]){
   assert(merged.data.Q1,'a quadra restaurada sobrevive em ambos os aparelhos');assert.equal(merged.notas_campo[0].foto,photo);
 }
 // A different client with old tombstones must clear those when applying the new generation.
 c.data=clone(deleted.data);c._delQuadras=clone(deleted._deletedQuadras);c._delNotas=clone(deleted._deletedNotas);c._unsavedChanges=false;
 c.cloudApply(restored);assert.equal(c._delQuadras.Q1,undefined);assert.equal(c._delNotas.N,undefined);
 // Um retorno antigo, inclusive com rev maior, não passa por cima da restauração.
 const freshData=c.data;c._unsavedChanges=false;c.cloudApply(Object.assign({},deleted,{rev:1000}));assert.equal(c.data,freshData);
 const gen=c.data.__config.restoreGeneration;c.safetyApply(snap);assert(c.data.__config.restoreGeneration>gen,'restaurar o mesmo backup gera uma operação nova');
 // The generation travels in the existing normalized cloud schema and the local state.
 const again=clone(c.cloudState());const flat=c.AgractaFirebase.splitState(again);const rt=c.AgractaFirebase.buildState(flat,{rev:8});assert.equal(rt.data.__config.restoreGeneration,again.data.__config.restoreGeneration);
 assert.equal(c.cloudMerge(deleted,rt).notas_campo[0].foto,undefined,'foto continua no cofre local e não é enviada ao Firestore');
 // Lápides que faziam parte do próprio retrato continuam válidas.
 const tombed=clone(snap);tombed.data.Q1._deletedStudies={S:123};tombed._deletedQuadras={Q9:456};
 assert.equal(c.safetyApply(tombed),true);assert.equal(c.data.Q1._deletedStudies.S,123);assert.equal(c._delQuadras.Q9,456);
 // Importação substitui apenas depois de confirmar a cópia do estado atual.
 c.FileReader=function(){this.readAsText=file=>this.onload({target:{result:file.content}});};
 const fileEvent=payload=>({target:{files:[{content:JSON.stringify(payload)}],value:'backup.json'}});
 const beforeImport=c.data;c.localStorage.setItem=(k,v)=>{if(k==='iracema-safety')throw new Error('QuotaExceededError');originalSet(k,v);};
 c.importData(fileEvent({_iracema:true,data:{Q2:{estudos:[]}}}));assert.equal(c.data,beforeImport,'importação sem cópia confirmada mantém estado');
 c.localStorage.setItem=originalSet;
 c.importData(fileEvent({_iracema:true,data:{Q2:null}}));assert.equal(c.data,beforeImport,'arquivo inválido não substitui parcialmente o estado');
 const replacement=clone(snap);replacement._iracema=true;replacement.data={__config:{},Q2:{estudos:[]}};replacement.qgeo={};replacement.qlocal={};replacement.qnome={};replacement.georef=null;
 c.importData(fileEvent(replacement));assert(c.data.Q2);assert.equal(c.data.Q1,undefined);assert.equal(c._geo,null);assert.equal(c.data.__config.estudos,undefined);
 // Arquivo legado recupera os IDs que traz, sem ressuscitar exclusões alheias.
 c._delQuadras={Q1:100,Q9:200};
 c.importData(fileEvent({Q1:{estudos:[]}}));
 assert.equal(c._delQuadras.Q1,undefined);assert.equal(c._delQuadras.Q9,200);
 assert(c.cloudMerge(c.cloudState(),clone(c.cloudState())).data.Q1,'quadra legada continua presente após merge');
 c._delQuadras.Q1=300;assert.equal(c.safetyApply({data:{Q1:{estudos:[]}}}),true);
 assert.equal(c._delQuadras.Q1,undefined,'snapshot legado também limpa lápide conflitante');
 // Foto atual só no IndexedDB: excluir precisa guardar o arquivo antes.
 c.renderNotas=()=>{};c.NOTAS_CAMPO=[{id:'F',titulo:'Foto local',criadoEm:'2026-10-03'}];c._delNotas={};
 const localPhoto='data:image/jpeg;base64,Zm90bw==';
 c.NOTAS_CAMPO[0].fotoLocal=await c._fotoNotaGuardar(c.NOTAS_CAMPO[0],localPhoto);
 c._FOTO_NOTA={};
 assert.equal(await c.deleteNote('F'),true);
 assert.equal(c.NOTAS_CAMPO.length,0);assert.equal((await c._fotosNotasStore().todas()).F,undefined);
 const photoBackup=c.safetyList().at(-1);assert.equal(photoBackup.notas_campo[0].foto,localPhoto);
 assert.equal(c.safetyApply(photoBackup),true);assert.equal(c._fotoNota(c.NOTAS_CAMPO[0]),localPhoto);
 // Com localStorage cheio, a exclusão espera a confirmação do cofre.
 await c._fotoNotaGuardar(c.NOTAS_CAMPO[0],localPhoto);delete c.NOTAS_CAMPO[0].foto;c._FOTO_NOTA={};
 c.localStorage.setItem=(k,v)=>{if(k==='iracema-safety')throw Error('QuotaExceededError');originalSet(k,v);};
 assert.equal(await c.deleteNote('F'),true);
 const archivedPhoto=(await c.AgractaFirebase.listBackups()).find(s=>s.notas_campo.some(n=>n.id==='F'&&n.foto===localPhoto));
 assert(archivedPhoto,'imagem continua recuperável no cofre após exclusão');
 c.localStorage.setItem=originalSet;assert.equal(c.safetyApply(archivedPhoto),true);
 assert.equal(c._fotoNota(c.NOTAS_CAMPO[0]),localPhoto);
 // Se os dois destinos recusam, nem a observação nem sua foto são excluídas.
 c.localStorage.setItem=(k,v)=>{if(k==='iracema-safety')throw Error('QuotaExceededError');originalSet(k,v);};
 const realArchive=c.AgractaFirebase.saveBackup;
 c.AgractaFirebase.saveBackup=()=>Promise.reject(Error('cofre indisponível'));
 assert.equal(await c.deleteNote('F'),false);assert.equal(c.NOTAS_CAMPO[0].id,'F');
 assert.equal(c._fotoNota(c.NOTAS_CAMPO[0]),localPhoto);
 c.AgractaFirebase.saveBackup=realArchive;c.localStorage.setItem=originalSet;
 console.log('Backups: snapshot completo, foto grande com quota esgotada, geração persistente, restauração e lápides em dois aparelhos OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
