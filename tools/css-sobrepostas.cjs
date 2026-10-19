/* Faxina do CSS — parte 1: declarações que SEMPRE perdem na cascata do index.html.
   Uso (da raiz): npm i --no-save postcss && node tools/css-sobrepostas.cjs . [--aplicar]
   Sem --aplicar só conta. Depois de aplicar, conferir a tela (estilo computado antes x depois). */
// Declarações que SEMPRE perdem: mesmo seletor, mesmo contexto (ou o vencedor sem @media),
// mesma propriedade, e uma declaração DEPOIS (na ordem do index.html) com importância >= .
// Só remove de folhas carregadas apenas pelo index.html.
const fs=require('fs'),path=require('path'),postcss=require('postcss');
const raiz=process.argv[2],aplicar=process.argv[3]==='--aplicar';
const ORDEM=['styles.css','integracoes.css','estudo-pagina.css','croqui-parcelas.css','fotos-estudo.css','theme-2026.css','ui-campo.css','satelites.css','agroapi.css','profundidade.css','interface-neutra.css','clima-pagina.css','tipografia.css','protocolo-vivo.css','protocolo-avaliacoes.css','cores-padrao.css'];
const SO_INDEX=new Set(['styles.css','theme-2026.css','ui-campo.css','estudo-pagina.css','croqui-parcelas.css','fotos-estudo.css','satelites.css','agroapi.css','clima-pagina.css','protocolo-vivo.css','protocolo-avaliacoes.css']);
const norm=s=>s.replace(/\s+/g,' ').replace(/\s*([>+~,])\s*/g,'$1').replace(/"/g,"'").trim();
const ctx=n=>{let c=[],a=n.parent;while(a&&a.type!=='root'){if(a.type==='atrule')c.unshift('@'+a.name+' '+a.params.replace(/\s+/g,' '));a=a.parent;}return c.join(' | ');};
const decls=[];let ord=0;const roots={};
for(const f of ORDEM){const p=path.join(raiz,f);if(!fs.existsSync(p))continue;const root=postcss.parse(fs.readFileSync(p,'utf8'));roots[f]=root;
 root.walkRules(r=>{if(r.parent.type==='atrule'&&/keyframes/i.test(r.parent.name))return;
  const sels=r.selector.split(/,(?![^(]*\))/).map(norm);const c=ctx(r);
  r.each(d=>{if(d.type!=='decl')return;decls.push({f,r,d,sels,c,prop:d.prop.toLowerCase(),imp:!!d.important,o:ord++});});});}
const idx=new Map();// chave sel|prop -> lista
for(const x of decls)for(const s of x.sels){const k=s+'|'+x.prop;(idx.get(k)||idx.set(k,[]).get(k)).push(x);}
const RISCO=/-webkit-|-moz-|-ms-|[dsl]v[hw]\b|color-mix|clamp\(|min\(|max\(|env\(|fit-content|oklch|lch\(|lab\(|:has|@supports/i;
const mortas=[];
for(const x of decls){ if(!SO_INDEX.has(x.f))continue;
 const todosCobertos=x.sels.every(s=>(idx.get(s+'|'+x.prop)||[]).some(y=>y.o>x.o&&(y.imp||!x.imp)&&(y.c===x.c||y.c==='')&&!(y.r===x.r&&y.d.value!==x.d.value)&&!RISCO.test(y.d.value)));
 if(todosCobertos)mortas.push(x);}
const porArq={};let imp=0;for(const x of mortas){porArq[x.f]=(porArq[x.f]||0)+1;if(x.imp)imp++;}
console.log('declaracoes que sempre perdem:',mortas.length,'(com !important:',imp+')',porArq);
if(aplicar){for(const x of mortas)x.d.remove();
 for(const f in roots){if(!SO_INDEX.has(f))continue;const root=roots[f];
  root.walkRules(r=>{if(!r.nodes.some(n=>n.type==='decl'))r.remove();});
  root.walkAtRules(a=>{if(['media','supports'].includes(a.name)&&a.nodes&&!a.nodes.length)a.remove();});
  fs.writeFileSync(path.join(raiz,f),root.toString());}}
