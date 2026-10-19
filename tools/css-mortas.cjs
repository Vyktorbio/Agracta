/* Faxina do CSS — parte 2: seletores que citam classe/id que não existe em nenhum JS/HTML.
   Uso (da raiz): npm i --no-save postcss postcss-selector-parser && node tools/css-mortas.cjs . [--aplicar] [folha1.css,folha2.css]
   Só aplique em folhas carregadas apenas pelo index.html. */
// Acha (e opcionalmente remove) seletores que citam classe/id inexistente em qualquer JS/HTML.
const fs=require('fs'),path=require('path'),postcss=require('postcss'),sp=require('postcss-selector-parser');
const raiz=process.argv[2], aplicar=process.argv[3]==='--aplicar', so=process.argv[4]?process.argv[4].split(','):null;
function lista(d,ext){let o=[];for(const n of fs.readdirSync(d)){const p=path.join(d,n),r=path.relative(raiz,p);
 if(/^(node_modules|tests|\.git)(\/|$)/.test(r))continue;const st=fs.statSync(p);
 if(st.isDirectory())o=o.concat(lista(p,ext));else if(ext.test(n))o.push(r);}return o;}
const fontes=lista(raiz,/\.(js|html|cjs|mjs|json|py)$/).map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const vistos=new Set();for(const m of fontes.matchAll(/[A-Za-z_][\w-]*/g))vistos.add(m[0]);
const prefixos=new Set();
/* Classe montada no código ('k'+i, 'sev-'+x): todo literal de texto seguido de + vira
   prefixo vivo, por curto que seja. Foi o 'k'+i do probit que ensinou isso. */
for(const m of fontes.matchAll(/['"`]([A-Za-z][\w-]*)['"`]\s*\+/g))prefixos.add(m[1]);
for(const m of fontes.matchAll(/([A-Za-z][\w-]*-)['"`]\s*\+/g))prefixos.add(m[1]);
for(const m of fontes.matchAll(/([A-Za-z][\w-]*-)\$\{/g))if(m[1].length>=3)prefixos.add(m[1]);
const vivo=t=>vistos.has(t)||[...prefixos].some(p=>t.startsWith(p));
const css=lista(raiz,/\.css$/).filter(f=>!so||so.includes(f));
let totR=0,totS=0,bytes=0;const rel=[];
for(const f of css){
 const p=path.join(raiz,f),src=fs.readFileSync(p,'utf8');const root=postcss.parse(src);let rr=0,ss=0;
 root.walkRules(rule=>{
  if(rule.parent&&rule.parent.type==='atrule'&&/keyframes/i.test(rule.parent.name))return;
  let sels;try{sels=sp().astSync(rule.selector);}catch(e){return;}
  const mortos=[];
  sels.each(sel=>{let morto=null;
   sel.walk(n=>{
    // dentro de :not/:is/:where/:has nada é obrigatório
    let a=n.parent;while(a&&a.type!=='selector'||(a&&a.parent&&a.parent.type==='pseudo')){ if(a.type==='pseudo')return; a=a.parent; }
    if((n.type==='class'||n.type==='id')&&!vivo(n.value))morto=morto||n.value;});
   if(morto)mortos.push([String(sel).trim(),morto]);});
  if(!mortos.length)return;
  ss+=mortos.length;
  if(mortos.length===sels.nodes.length){rr++;bytes+=rule.toString().length;rel.push(f+' :: '+rule.selector.slice(0,90).replace(/\s+/g,' ')+'  ['+mortos[0][1]+']');if(aplicar)rule.remove();}
  else if(aplicar){ const vivos=sels.nodes.filter(s=>!mortos.some(m=>m[0]===String(s).trim())); rule.selector=vivos.map(s=>String(s).trim()).join(','); }
 });
 // @media/@supports vazios depois da limpeza
 if(aplicar){root.walkAtRules(a=>{if(['media','supports'].includes(a.name)&&a.nodes&&!a.nodes.length)a.remove();});fs.writeFileSync(p,root.toString());}
 if(rr||ss){totR+=rr;totS+=ss;console.log(f.padEnd(26),'regras mortas',rr,'seletores mortos',ss);}
}
console.log('TOTAL regras',totR,'seletores',totS,'bytes ~',bytes);
if(process.env.LISTA)console.log(rel.join('\n'));
