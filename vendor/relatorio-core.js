/* Exportações do estudo no aparelho. Sem rede, sem alteração do acervo. */
(function(root){
'use strict';
const A=x=>Array.isArray(x)?x:[],txt=x=>x==null?'':String(x),esc=x=>txt(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function number(v){if(v==null||typeof v==='boolean'||txt(v).trim()==='')return null;const n=Number(txt(v).trim().replace(',','.'));return Number.isFinite(n)?n:null;}
function flatten(value,path='',out=[]){
 if(value&&typeof value==='object'){const keys=Object.keys(value);if(!keys.length)out.push({campo:path,valor:Array.isArray(value)?'[]':'{}'});else keys.forEach(k=>flatten(value[k],path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'),out));}
 else out.push({campo:path,valor:value==null?'null':txt(value)});return out;
}
function note(notes,t,r,v){const key=t+'R'+r;let x=(notes[key]||{})[v];if((x==null||x==='')&&r===1)x=(notes[t]||{})[v];return x==null?'':x;}
function data(c){
 const s=c.projection,st=c.study,reps=Math.max(1,parseInt(st.numRepeticoes,10)||1),values=[],readers=[],raw=[],plots=[];
 s.tratamentos.forEach(t=>{for(let r=1;r<=reps;r++){const p=A(st.randomizado&&st.randomizacao&&st.randomizacao.ordem).find(p=>p.tratId===t.id&&Number(p.rep)===r);plots.push({tratamento:t.id,repeticao:r,parcela:p&&(p.parcela||p.campo)||'',chave:t.id+'R'+r});}});
 A(st.avaliacoes).forEach((av,ai)=>{
 const id=av.id||'av-'+ai,vars=new Set(A(av.variaveis));
 [av.notas,...Object.values(av.avaliadores||{}).map(a=>a.notas)].forEach(ns=>Object.values(ns||{}).forEach(row=>Object.keys(row||{}).forEach(v=>vars.add(v))));
 plots.forEach(p=>vars.forEach(v=>{
 const cfg=(av.varcfg||{})[v]||{},type=(av.tipos||{})[v]||'pct',base={estudo:s.codigo,estudo_id:s.sid,quadra_id:s.qid,avaliacao_id:id,data:av.data||'',hora:av.hora||'',tratamento:p.tratamento,repeticao:p.repeticao,parcela:p.parcela,chave:p.chave,variavel:v,tipo:type,unidade:cfg.unidade||(type==='pct'?'%':''),sentido:cfg.sentido||'menor'};
 function record(ns){const x=note(ns||{},p.tratamento,p.repeticao,v),n=number(x);return {...base,valor:n,valor_original:txt(x),estado:txt(x).trim()===''?'ausente':n==null?'nao_numerico':'registrado'};}
 values.push(record(av.notas));Object.entries(av.avaliadores||{}).forEach(([k,a])=>readers.push({...record(a.notas),avaliador_id:k,avaliador_nome:a.nome||''}));
 }));
 Object.entries(av.bruto||{}).forEach(([key,vs])=>Object.entries(vs||{}).forEach(([v,cell])=>{
 const p=plots.find(p=>p.chave===key)||plots.find(p=>p.tratamento===key&&p.repeticao===1);
 flatten(cell).forEach(r=>raw.push({avaliacao_id:id,data:av.data||'',chave:key,tratamento:p?p.tratamento:'',repeticao:p?p.repeticao:'',parcela:p?p.parcela:'',variavel:v,...r}));
 }));
 });
 return {parcelas:plots,observacoes:values,avaliadores:readers,subamostras:raw};
}
function sections(c,d){const s=c.projection,st=c.study;
 const missing=[['Objetivo',st.objetivo||st.descricao],['Cultura',s.cultura],['Alvo',s.alvo],['Início',s.inicio],['Delineamento',st.desenho],['Responsável',st.responsavel||st.finalizacao&&st.finalizacao.nome]];
 const sections=[{title:'Identificação e escopo',text:'Relatório dos registros disponíveis do estudo. Campos não registrados e análises pendentes permanecem explícitos. A interpretação e a aprovação científica cabem ao responsável.',headers:['Campo','Registro'],rows:[['Estudo',s.codigo],['Local',s.local],['Quadra',s.quadra],['Situação',s.finalizado?'Finalizado':'Em execução'],['Gerado em',c.generated],...missing.map(([k,v])=>[k,v||'Não registrado'])]},
 {title:'Tratamentos e protocolo',headers:['Tratamento','Produto','Dose','Método'],rows:s.tratamentos.map(t=>[t.id,t.produto,t.dose,t.metodo])},
 {title:'Parcelas e repetições',text:'A identificação de campo é a randomização registrada. Célula vazia significa que a parcela não foi identificada no registro.',headers:['Tratamento','Repetição','Parcela','Chave'],rows:d.parcelas.map(p=>[p.tratamento,p.repeticao,p.parcela,p.chave])},
 {title:'Aplicações e condução',text:'Os registros completos de clima, preparo, calibração e execução estão discriminados no anexo.',headers:['Aplicação','Data','Hora','Responsável'],rows:A(st.aplicacoes).map((a,i)=>[a.id||'ap-'+i,a.data,a.hora||a.inicio&&a.inicio.hora||'',a.nome||a.responsavel||'Não registrado'])},
 {title:'Avaliações',headers:['Avaliação','Data','Variáveis','Observações'],rows:A(st.avaliacoes).map((a,i)=>[a.id||'av-'+i,a.data,A(a.variaveis).join(', '),a.obs||''])},
 {title:'Resultados por tratamento e data',text:'Médias descritivas dos valores disponíveis. Uma repetição é mantida. Controle por Abbott somente quando disponível no Agracta. Ausência não equivale a zero; ranking descritivo não comprova diferença estatística.',headers:['Avaliação e variável','Tratamento','n','Média','DP','Controle %'],rows:s.resultados.map(r=>[r.data+' · '+r.avaliacao+' · '+r.variavel+' ('+r.unidade+')',r.tratamento,r.n,r.media,r.dp,r.controle])},
 {title:'Estatística e investigação forense',text:'Resultados preservados na finalização ou disponíveis no momento da exportação. Alertas são sinais para revisão e não comprovam fraude. Não há cálculo novo nesta exportação.',headers:['Análise','Situação'],rows:A(c.analysis&&c.analysis.jobs).map(j=>{const r=(c.analysis.results||{})[j.jobKey];return [j.modo+' · '+j.variavel+' · '+(j.date||''),!r?'Pendente':r.ok?'Calculado':r.erro||'Erro'];})},
 {title:'Dados individuais das parcelas',text:'Valores registrados antes de transformações estatísticas. O pacote para R inclui também avaliadores e subamostras separados.',headers:['Avaliação e variável','Tratamento','Rep.','Parcela','Valor','Estado'],rows:d.observacoes.map(r=>[r.avaliacao_id+' · '+r.variavel,r.tratamento,r.repeticao,r.parcela,r.valor_original,r.estado])}];
 for(const [title,value] of [['Protocolo registrado',st.protocolo],['Contexto ambiente e custos',c.context],['Resultados estatísticos completos',c.analysis],['Estatística do fechamento',st.estatisticaFinal],['Conferência dos registros',c.forensics],['Histórico e finalização',{audit:st.audit,auditLog:st.auditLog,finalizacao:st.finalizacao}]])sections.push({title,headers:['Campo','Registro'],rows:value?flatten(value).map(r=>[r.campo,r.valor]):[],text:value?'':'Não registrado ou indisponível.'});
 sections.push({title:'Anexo completo dos registros do estudo',text:'Todos os campos exportáveis do estudo e do contexto vinculado estão discriminados abaixo. Identidades cegadas permanecem protegidas. Dados de outros estudos e credenciais não integram o relatório.',headers:['Campo','Registro'],rows:flatten({study:st,context:c.context}).map(r=>[r.campo,r.valor])});
 return sections;
}
function csv(rows,headers){headers=headers||Object.keys(rows[0]||{});const cell=v=>'"'+txt(v).replace(/"/g,'""')+'"';return headers.map(cell).join(',')+'\r\n'+rows.map(r=>headers.map(k=>cell(r[k])).join(',')).join('\r\n')+'\r\n';}
const rScript=`# Agracta: execute este script dentro da pasta extraída.
# CSV UTF-8, separador vírgula, ponto decimal. IDs sempre como texto.
base <- getwd()
ler <- function(nome) read.csv(file.path(base, nome), colClasses="character", check.names=FALSE, na.strings=NULL, fileEncoding="UTF-8", stringsAsFactors=FALSE)
observacoes <- ler("observacoes.csv")
tratamentos <- ler("tratamentos.csv")
parcelas <- ler("parcelas.csv")
resultados <- ler("resultados.csv")
avaliadores <- ler("avaliadores.csv")
subamostras <- ler("subamostras.csv")
metadados <- ler("metadados.csv")
# valor_original preserva o registro. Ausência e não numérico estão em estado.
observacoes$valor <- suppressWarnings(as.numeric(observacoes$valor))
observacoes$data <- as.Date(observacoes$data, format="%Y-%m-%d")
observacoes$tratamento <- factor(observacoes$tratamento, levels=tratamentos$id)
observacoes$repeticao <- factor(observacoes$repeticao)
print(table(observacoes$estado, useNA="ifany"))
# Escolha uma avaliação e variável antes de analisar. Não trate datas, leituras
# de avaliadores ou subamostras como repetições independentes.
# O delineamento e os pressupostos devem orientar o modelo; não há ANOVA automática.
`;
function rFiles(c,d){const headers={observacoes:['estudo','estudo_id','quadra_id','avaliacao_id','data','hora','tratamento','repeticao','parcela','chave','variavel','tipo','unidade','sentido','valor','valor_original','estado'],avaliadores:['avaliacao_id','data','tratamento','repeticao','parcela','variavel','tipo','unidade','valor','valor_original','estado','avaliador_id','avaliador_nome'],subamostras:['avaliacao_id','data','chave','tratamento','repeticao','parcela','variavel','campo','valor'],parcelas:['tratamento','repeticao','parcela','chave'],tratamentos:['id','produto','dose','metodo','testemunha'],resultados:['avaliacao','data','hora','tratamento','variavel','tipo','unidade','sentido','n','media','dp','controle']};
 headers.metadados=['campo','valor'];
 const tables={...d,metadados:flatten({study:c.study,context:c.context,analysis:c.analysis}),tratamentos:c.projection.tratamentos,resultados:c.projection.resultados};return [...Object.keys(headers).map(k=>({nome:k+'.csv',text:csv(tables[k],headers[k])})),{nome:'registros_completos.json',text:JSON.stringify(c,null,2)},{nome:'importar.R',text:rScript},{nome:'LEIA-ME.md',text:'# Exportação Agracta para R\n\nExtraia o ZIP, abra um projeto R nessa pasta e execute source("importar.R"). Não requer pacotes adicionais.\n\nobservacoes.csv: uma linha por parcela, avaliação e variável, incluindo ausências. valor tem ponto decimal; valor_original preserva a escrita. estado distingue registrado, ausente e nao_numerico. IDs são texto.\n\navaliadores.csv mantém leituras independentes separadas. subamostras.csv contém o dado bruto em caminhos JSON Pointer (campo e índice dentro da célula; sub começa no índice 0); ~1 representa / e ~0 representa ~. Não são novas repetições.\n\nparcelas.csv conserva a ordem registrada; parcela vazia significa não identificada. resultados.csv contém médias descritivas, não observações independentes. metadados.csv discrimina os campos registrados. Registros não tabulados, notas legadas e metadados estão integralmente em registros_completos.json.\n\nNão aplicar ANOVA sem escolher avaliação, variável e modelo adequado ao delineamento. Fotos permanecem fora deste pacote.\n'}];}
function markdown(c,ss,images=[]){const m=v=>txt(v).replace(/\\/g,'\\\\').replace(/([|*_`<>\[\]])/g,'\\$1').replace(/[\r\n]+/g,' ');return '# Relatório do estudo '+m(c.projection.codigo)+'\n\n'+ss.map(s=>'## '+s.title+'\n\n'+(s.text?s.text+'\n\n':'')+(s.rows.length?'| '+s.headers.map(m).join(' | ')+' |\n| '+s.headers.map(()=>'---').join(' | ')+' |\n'+s.rows.map(r=>'| '+r.map(m).join(' | ')+' |').join('\n'):'Sem registros disponíveis.')+'\n').join('\n')+'\n## Figuras e fotos\n\n'+images.map((im,i)=>'!['+m(im.caption)+'](imagens/figura-'+(i+1)+'.jpg)\n\n'+m(im.caption)).join('\n\n');}
function html(ss){return ss.map(s=>'<section><h2>'+esc(s.title)+'</h2>'+(s.text?'<p>'+esc(s.text)+'</p>':'')+(s.rows.length?'<table><thead><tr>'+s.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+s.rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v==null?'—':v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<p>Sem registros disponíveis.</p>')+'</section>').join('');}
const api={data,sections,flatten,number,csv,rFiles,markdown,html,esc};if(typeof module==='object'&&module.exports)module.exports=api;else root.RelatorioCore=api;
})(typeof window==='object'?window:this);
