/* ============================================================================
   ProtocoloVivoCore — aprovação, emendas e desvios do protocolo (roadmap §6)
   ----------------------------------------------------------------------------
   Até aqui o protocolo era só o estudo sendo editado. Mudar o número de
   repetições depois de começar o ensaio gravava uma linha na trilha e pronto:
   não havia uma VERSÃO aprovada contra a qual a mudança fosse medida, nem a
   diferença entre as duas coisas que a BPL separa com cuidado:

     EMENDA   — mudança PLANEJADA no protocolo, antes de ser executada.
                O protocolo passa a dizer outra coisa, e ganha nova versão.
     DESVIO   — o que foi EXECUTADO saiu do protocolo sem que ele mudasse.
                O protocolo continua igual; o ensaio registra que não o seguiu.

   QUATRO REGRAS

   1. SEM APROVAÇÃO, NADA MUDA. Estudo em rascunho edita como sempre editou.
      Aprovar é um ato explícito, com senha e rubrica, e só dali em diante o
      protocolo passa a ter versão.
   2. APROVADO NÃO SE EDITA EM SILÊNCIO. Mudar um campo do protocolo aprovado
      vira emenda: o que era, o que ficou, quem, quando e POR QUÊ. Sem motivo
      não há emenda — e sem emenda não há alteração.
   3. O RETRATO É DO PROTOCOLO, NÃO DA EXECUÇÃO. Volume morto, frascos e o
      preparo do dia mudam a cada aplicação e não são emenda. Entram só os
      campos que um diretor de estudo assinaria.
   4. MOTOR PURO. Sem DOM, sem armazenamento: recebe o estudo, devolve
      objetos. O app grava; o teste roda no Node.
   ============================================================================ */
(function(root){
  'use strict';
  var VERSAO='1.0.0';

  var CAMPOS=[
    ['tipoEstudo','Tipo de estudo'], ['cultura','Cultura'], ['variedade','Variedade'],
    ['alvo','Alvo'], ['alvoSci','Alvo (nome científico)'],
    ['dataInicio','Início'], ['numAplicacoes','Nº de aplicações'],
    ['intervaloDias','Intervalo entre aplicações (dias)'], ['numRepeticoes','Repetições'],
    ['desenho','Desenho'], ['randomizado','Randomização'],
    ['metodoAplicacao','Método de aplicação'], ['metodoPorTratamento','Método por tratamento'],
    ['doseModo','Definição da dose'], ['doseUnidade','Unidade da dose'],
    ['janela','Janela de aplicação declarada'],
    ['avalInicio','Início das avaliações'], ['avalIntervalo','Intervalo das avaliações'],
    ['avalNum','Nº de avaliações'], ['avalMomentos','Momentos de avaliação'],
    ['avalUnidade','Unidade dos momentos'],
    ['tratamentos','Tratamentos']
  ];
  var ROTULO={}; CAMPOS.forEach(function(c){ ROTULO[c[0]]=c[1]; });

  function stable(v){
    if(v===null||typeof v!=='object') return JSON.stringify(v===undefined?null:v);
    if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
    return '{'+Object.keys(v).sort().filter(function(k){ return v[k]!==undefined; })
      .map(function(k){ return JSON.stringify(k)+':'+stable(v[k]); }).join(',')+'}';
  }
  function clone(v){ return v==null?v:JSON.parse(JSON.stringify(v)); }
  /* Campo técnico (_ts, _ui…) não é protocolo: mudar o carimbo não é emenda. */
  function semTecnico(o){
    if(o===null||typeof o!=='object') return o;
    if(Array.isArray(o)) return o.map(semTecnico);
    var r={}; Object.keys(o).forEach(function(k){ if(k.charAt(0)!=='_') r[k]=semTecnico(o[k]); });
    return r;
  }
  function vazio(v){ return v==null || v==='' || (typeof v==='object' && !Array.isArray(v) && !Object.keys(v).length); }

  function retrato(s){
    s=s||{}; var r={};
    CAMPOS.forEach(function(c){
      var v=s[c[0]];
      if(c[0]==='tratamentos') v=semTecnico(Array.isArray(v)?v:[]);
      else if(c[0]==='randomizado'||c[0]==='metodoPorTratamento') v=!!v;
      else if(vazio(v)) v='';
      else v=semTecnico(v);
      r[c[0]]=v;
    });
    return r;
  }

  function txtTrat(t){
    if(!t) return '—';
    var nome=[t.produto,t.dose].filter(function(x){ return x!=null && String(x).trim(); }).join(' ');
    return (t.id||'?')+(nome?(' ('+nome+')'):'')+(t.testemunha?' [testemunha]':'');
  }
  function txt(v){
    if(v===true) return 'sim'; if(v===false) return 'não';
    if(v===''||v==null) return '—';
    if(typeof v==='object') return stable(v);
    return String(v);
  }

  /* Diferenças legíveis entre dois retratos. Tratamento é comparado por id:
     "T3 mudou" diz mais que "a lista mudou". */
  function diferencas(a, b){
    a=a||{}; b=b||{}; var out=[];
    CAMPOS.forEach(function(c){
      var k=c[0];
      if(stable(a[k])===stable(b[k])) return;
      if(k!=='tratamentos'){ out.push({campo:k, rotulo:c[1], de:txt(a[k]), para:txt(b[k])}); return; }
      var ia={}, ib={};
      (a[k]||[]).forEach(function(t,i){ ia[(t&&t.id)||('#'+i)]=t; });
      (b[k]||[]).forEach(function(t,i){ ib[(t&&t.id)||('#'+i)]=t; });
      Object.keys(ia).forEach(function(id){
        if(!ib[id]) out.push({campo:k, rotulo:'Tratamento removido', de:txtTrat(ia[id]), para:'—'});
        else if(stable(ia[id])!==stable(ib[id])) out.push({campo:k, rotulo:'Tratamento '+id+' alterado', de:txtTrat(ia[id]), para:txtTrat(ib[id])});
      });
      Object.keys(ib).forEach(function(id){
        if(!ia[id]) out.push({campo:k, rotulo:'Tratamento incluído', de:'—', para:txtTrat(ib[id])});
      });
      var ordA=Object.keys(ia).filter(function(x){ return ib[x]; }), ordB=Object.keys(ib).filter(function(x){ return ia[x]; });
      if(ordA.join('|')!==ordB.join('|') && !out.some(function(d){ return d.campo==='tratamentos'; }))
        out.push({campo:k, rotulo:'Ordem dos tratamentos', de:ordA.join(', '), para:ordB.join(', ')});
    });
    return out;
  }
  function textoDiferenca(d){ return d.rotulo+': '+d.de+' → '+d.para; }

  function info(s){
    var p=s&&s.protocoloVivo;
    if(!p || p.status!=='aprovado') return {aprovado:false, versao:0, status:'rascunho'};
    return {aprovado:true, versao:p.versao||1, status:'aprovado', em:p.aprovadoEm, por:p.aprovadoPor, nome:p.aprovadoNome,
            emendas:(s.emendas||[]).length, desvios:(s.desvios||[]).length};
  }

  /* Devolve o bloco de aprovação. O app grava e registra na trilha. */
  function aprovar(s, autor){
    autor=autor||{};
    return {status:'aprovado', versao:1, aprovadoEm:autor.em||new Date().toISOString(),
      aprovadoPor:autor.por||'', aprovadoNome:autor.nome||'', rubrica:autor.rubrica||null,
      retrato:retrato(s), motor:VERSAO};
  }

  /* Aplica a emenda NO estudo `s` (o que vai ser gravado). `antes` é o estudo
     como está gravado. Devolve a emenda, ou null se nada do protocolo mudou. */
  function emendar(antes, s, motivo, autor){
    var p=s&&s.protocoloVivo; if(!p || p.status!=='aprovado') return null;
    var dif=diferencas(retrato(antes), retrato(s)); if(!dif.length) return null;
    motivo=String(motivo||'').trim(); if(!motivo) throw new Error('Emenda exige motivo.');
    autor=autor||{};
    var de=p.versao||1, para=de+1;
    var em={n:(s.emendas||[]).length+1, versaoDe:de, versaoPara:para,
      em:autor.em||new Date().toISOString(), por:autor.por||'', nome:autor.nome||'',
      motivo:motivo, mudancas:dif, retratoAnterior:clone(p.retrato||retrato(antes))};
    if(!Array.isArray(s.emendas)) s.emendas=[];
    s.emendas.push(em);
    p.versao=para; p.retrato=retrato(s);
    return em;
  }

  /* Desvio: o protocolo não muda. Descrição é obrigatória; impacto e ação,
     não — mas a ausência deles fica visível no registro. */
  function desvio(dados, autor){
    dados=dados||{}; autor=autor||{};
    var descricao=String(dados.descricao||'').trim();
    if(!descricao) throw new Error('Desvio exige descrição.');
    return {id:dados.id||('dv'+Date.now().toString(36)), data:dados.data||'',
      descricao:descricao, impacto:String(dados.impacto||'').trim(), acao:String(dados.acao||'').trim(),
      registradoEm:autor.em||new Date().toISOString(), por:autor.por||'', nome:autor.nome||''};
  }

  var API={VERSAO:VERSAO, CAMPOS:CAMPOS, ROTULO:ROTULO, retrato:retrato, diferencas:diferencas,
    textoDiferenca:textoDiferenca, info:info, aprovar:aprovar, emendar:emendar, desvio:desvio, stable:stable};
  root.ProtocoloVivoCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
