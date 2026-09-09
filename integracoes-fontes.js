(function(w){
  'use strict';
  var pronto=null,rascunho=null;
  function ui(){return w.agConhecimento;}function e(x){return ui().esc(x);}
  function itens(){return Object.values(w.ITENS||{}).filter(function(it){return it&&!(w._delItens||{})[it.id]&&!it.codigoCego;}).sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});}
  w.agFontesHtml=function(){
    return '<h2>Fontes e propriedades</h2><section class="con-painel"><h3>Agrofit · MAPA</h3><p>O catálogo embarcado preenche o banco de itens e funciona offline. A identidade confirmada do item liga seus resultados.</p>'+
      (pronto?'<p>'+pronto.produtos.length+' entradas · catálogo gerado em '+e(pronto.gerado)+'.</p>':'')+
      ui().bot('fonteCatalogo','Conferir catálogo')+' <a href="https://dados.agricultura.gov.br/dataset/sistema-de-agrotoxicos-fitossanitarios-agrofit" target="_blank" rel="noopener noreferrer">Consultar a fonte oficial</a><p class="con-note">Confira registro, cultura, alvo e bula vigentes antes de usar uma recomendação. Uma associação no Agracta não autoriza uso agrícola.</p></section>'+
      '<section class="con-painel"><h3>PPDB e outras bases licenciadas</h3><p>Importe propriedades obtidas com autorização de uso. A origem, a unidade e as condições acompanham cada valor.</p><label>Item<select id="fonteItem"><option value="">Selecione</option>'+itens().map(function(it){return '<option value="'+e(it.id)+'">'+e(it.nome)+' · '+e(it.id)+'</option>';}).join('')+'</select></label><label>Arquivo JSON<input id="fonteArquivo" type="file" accept=".json,application/json"></label>'+ui().bot('fonteValidar','Revisar importação')+'<div id="fonteRevisao"></div><p class="con-note">O arquivo deve declarar o ID do item, fonte, URL, licença, data, valores, unidades, condições e referências. A importação fica no banco interno de itens. Não é distribuída na área do cliente.</p><a href="https://sitem.herts.ac.uk/aeru/ppdb/en/support_cite.htm" target="_blank" rel="noopener noreferrer">Condições de uso da PPDB</a></section>';
  };
  w.agFonteItemHtml=function(it){
    if(!it||it.codigoCego||!it.propriedadesExternas)return '';
    var x=it.propriedadesExternas;
    return '<details class="con-painel"><summary>Propriedades · '+e(x.fonte)+'</summary><p>Consulta: '+e(x.consultadoEm)+'</p>'+tabela(x)+'<p class="con-note">'+e(x.licenca)+'</p></details>';
  };
  function tabela(x){return '<div class="con-scroll"><table><thead><tr><th>Propriedade</th><th>Valor</th><th>Condições e referência</th></tr></thead><tbody>'+x.propriedades.map(function(p){return '<tr><td>'+e(p.nome)+'</td><td>'+ui().numero(p.valor)+' '+e(p.unidade)+'</td><td>'+e(p.condicoes)+'<small>'+e(p.referencia)+'</small></td></tr>';}).join('')+'</tbody></table></div>';}
  w.agFontesAcao=async function(a){
    if(a==='fonteCatalogo'){
      var r=await fetch('data/agrofit.json?v=1');if(!r.ok)throw Error('Catálogo indisponível neste aparelho.');pronto=w.AgrofitCore.carregar(await r.json());
      if(!pronto)throw Error('Catálogo inválido.');ui().pintar();return;
    }
    if(a==='fonteValidar'){
      rascunho=null;
      var id=document.getElementById('fonteItem').value,file=document.getElementById('fonteArquivo').files[0];
      if(!id||!file)throw Error('Selecione o item e o arquivo.');if(file.size>250000)throw Error('O arquivo deve ter até 250 kB.');
      rascunho=w.FontesCore.validar(JSON.parse(await file.text()),id);
      document.getElementById('fonteRevisao').innerHTML='<h4>Revisão · '+e(rascunho.fonte)+'</h4><p>'+e(rascunho.consultadoEm)+' · '+e(rascunho.licenca)+'</p>'+tabela(rascunho)+'<label class="con-check"><input id="fonteLicenca" type="checkbox">Confirmo que tenho autorização para armazenar estes dados no Agracta.</label>'+ui().bot('fonteSalvar','Salvar propriedades revisadas');return;
    }
    if(a==='fonteSalvar'){
      if(!rascunho||!document.getElementById('fonteLicenca').checked)throw Error('Revise os dados e confirme a autorização de uso.');
      if(document.getElementById('fonteItem').value!==rascunho.itemId)throw Error('O item mudou. Revise o arquivo novamente.');
      var it=w.itemPorId(rascunho.itemId);if(!it||it.codigoCego)throw Error('O item não está disponível para esta importação.');
      w.itemAtualizar(it.id,{propriedadesExternas:rascunho});rascunho=null;ui().pintar();ui().msg('Propriedades salvas no item, com origem e referência.');
    }
  };
})(window);
