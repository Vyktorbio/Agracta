/* Escritor PPTX local. Modelo reutilizado de prancha.html. Sem rede. */
(function(root){
"use strict";
const _CRCTAB = (() => {
  const t = new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; }
  return t;
})();
function crc32(u8){
  let c = 0xFFFFFFFF;
  for(let i=0;i<u8.length;i++) c = _CRCTAB[(c ^ u8[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const _enc = new TextEncoder();
function zipar(arquivos){                 /* [{nome, dados:Uint8Array}] */
  const locais = [], central = [];
  let desloc = 0;
  arquivos.forEach(f=>{
    const nome = _enc.encode(f.nome), c = crc32(f.dados), n = f.dados.length;
    const lh = new Uint8Array(30 + nome.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true);                       /* store */
    dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);
    dv.setUint32(14, c, true); dv.setUint32(18, n, true); dv.setUint32(22, n, true);
    dv.setUint16(26, nome.length, true); dv.setUint16(28, 0, true);
    lh.set(nome, 30);
    locais.push(lh, f.dados);

    const ch = new Uint8Array(46 + nome.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
    cv.setUint32(16, c, true); cv.setUint32(20, n, true); cv.setUint32(24, n, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, desloc, true);
    ch.set(nome, 46);
    central.push(ch);
    desloc += lh.length + n;
  });
  const tamCentral = central.reduce((a,b)=>a+b.length,0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, arquivos.length, true); fv.setUint16(10, arquivos.length, true);
  fv.setUint32(12, tamCentral, true); fv.setUint32(16, desloc, true);
  const partes = locais.concat(central, [fim]);
  const total = partes.reduce((a,b)=>a+b.length,0);
  const saida = new Uint8Array(total);
  let o = 0; partes.forEach(p=>{ saida.set(p, o); o += p.length; });
  return new Blob([saida], {type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"});
}

/* --------------------------------------------------------- OOXML do slide -- */
const POL = 914400;                        /* EMU por polegada */
const SL_L = 13.333, SL_A = 7.5, FAIXA = 1.30;
const CINZA_PPT = "808080", LARANJA_PPT = "F5901E";
const xesc = s => String(s==null?"":s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const emu = pol => Math.round(pol * POL);

/* quadrilátero de cor chapada, via geometria personalizada */
function _faixa(id, nome, pts, cor){
  const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const cx = Math.max(...xs) - x0, cy = Math.max(...ys) - y0;
  const cam = pts.map((p,i)=>
    `<a:${i===0?"moveTo":"lnTo"}><a:pt x="${emu(p[0]-x0)}" y="${emu(p[1]-y0)}"/></a:${i===0?"moveTo":"lnTo"}>`).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${nome}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr><a:xfrm><a:off x="${emu(x0)}" y="${emu(y0)}"/><a:ext cx="${emu(cx)}" cy="${emu(cy)}"/></a:xfrm>`
    + `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>`
    + `<a:pathLst><a:path w="${emu(cx)}" h="${emu(cy)}">${cam}<a:close/></a:path></a:pathLst></a:custGeom>`
    + `<a:solidFill><a:srgbClr val="${cor}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>`
    + `<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

/* `linhas` aceita a linha inteira num pedaço só (o caso comum) ou `runs` — vários
   pedaços na mesma linha, cada um podendo ser itálico. É o que permite o nome
   científico sair em itálico também no slide, e não só na figura. */
function _texto(id, nome, x, y, cx, cy, linhas){
  const _run = r =>
    `<a:r><a:rPr lang="pt-BR" sz="${Math.round((r.tam||11)*100)}"`
    + (r.negrito?` b="1"`:``) + (r.it?` i="1"`:``) + (r.esp?` spc="${r.esp}"`:``)
    + `><a:solidFill><a:srgbClr val="${r.cor||"595959"}"/></a:solidFill>`
    + `<a:latin typeface="${r.fonte||"Arial"}"/></a:rPr><a:t>${xesc(r.t)}</a:t></a:r>`;
  const paras = linhas.map(l=>
    `<a:p><a:pPr algn="${l.algn||"l"}"/>`
    + (Array.isArray(l.runs)
        ? l.runs.map(r=>_run({t:r.t, it:r.it, tam:l.tam, cor:l.cor, fonte:l.fonte, negrito:l.negrito, esp:l.esp})).join("")
        : _run(l))
    + `</a:p>`).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${nome}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(cx)}" cy="${emu(cy)}"/></a:xfrm>`
    + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>`
    + `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"><a:spAutoFit/></a:bodyPr>`
    + `<a:lstStyle/>${paras}</p:txBody></p:sp>`;
}

function _imagem(id, x, y, cx, cy){
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Grafico"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>`
    + `<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`
    + `<p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(cx)}" cy="${emu(cy)}"/></a:xfrm>`
    + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function slideXml(png_cx, png_cy, meta){
  const L = SL_L, A = SL_A, f = FAIXA;
  let sp = "";
  /* faixas encostando na borda — a versão do script deixava 0,05" de branco */
  sp += _faixa(2,"FaixaEsqCima", [[0,0],[f,0],[f,3.15],[0,3.72]], CINZA_PPT);
  sp += _faixa(3,"FaixaEsqBaixo",[[0,3.90],[f,3.33],[f,A],[0,A]], LARANJA_PPT);
  sp += _faixa(4,"FaixaDirCima", [[L-f,0],[L,0],[L,3.72],[L-f,3.15]], LARANJA_PPT);
  sp += _faixa(5,"FaixaDirBaixo",[[L-f,3.33],[L,3.90],[L,A],[L-f,A]], CINZA_PPT);

  const esq = 1.55, larg = L - esq - 1.58;
  let y = 0.55;
  if(meta.titulo){ sp += _texto(6,"Titulo", esq, y, larg, 0.6, [{t:meta.titulo, tam:32, negrito:true, cor:"3F3F3F"}]); y += 0.75; }
  if(meta.subtitulo){ sp += _texto(7,"Subtitulo", esq, y, larg, 0.35, [{t:meta.subtitulo, tam:15, negrito:true, cor:"C86A08"}]); y += 0.5; }

  /* a imagem cabe na área livre mantendo a proporção */
  const topo = y + 0.1, dispA = 4.55, dispL = larg;
  let iw = dispL, ih = iw * png_cy / png_cx;
  if(ih > dispA){ ih = dispA; iw = ih * png_cx / png_cy; }
  sp += _imagem(8, esq + (dispL - iw)/2, topo, iw, ih);

  let yr = topo + dispA + 0.12;
  /* rodape1 pode vir como texto ou como pedaços (o científico em itálico) */
  if(meta.rodape1 && (Array.isArray(meta.rodape1) ? meta.rodape1.length : true)){
    sp += _texto(9,"Rodape1", esq, yr, larg, 0.3,
      [Array.isArray(meta.rodape1) ? {runs:meta.rodape1, tam:11, cor:"595959"} : {t:meta.rodape1, tam:11, cor:"595959"}]);
    yr += 0.26;
  }
  if(meta.rodape2){ sp += _texto(10,"Rodape2", esq, yr, larg, 0.3, [{t:meta.rodape2, tam:11, cor:"595959"}]); yr += 0.3; }
  if(meta.confidencial)
    sp += _texto(11,"Conf", esq, yr, larg, 0.3, [{t:meta.confidencial, tam:11, cor:"7F7F7F", esp:300, algn:"ctr"}]);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"`
    + ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`
    + ` xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">`
    + `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>`
    + `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>`
    + `<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`
    + sp + `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

/* partes fixas: master, layout e tema mínimos que o PowerPoint aceita */
const _NS = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"`;
const _ARVORE_VAZIA = `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>`;

function partesPptx(pngBytes, larguraPng, alturaPng, meta){
  const xml = s => _enc.encode(s);
  const cabec = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
  const corTema = (n,v)=>`<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
  const tema = cabec
    + `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Agracta">`
    + `<a:themeElements><a:clrScheme name="Agracta">`
    + `<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>`
    + `<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>`
    + corTema("dk2","3F3F3F") + corTema("lt2","EEEEEE")
    + corTema("accent1","F5901E") + corTema("accent2","C86A08") + corTema("accent3","8A4405")
    + corTema("accent4","F5C08A") + corTema("accent5","808080") + corTema("accent6","595959")
    + corTema("hlink","0563C1") + corTema("folHlink","954F72")
    + `</a:clrScheme><a:fontScheme name="Agracta">`
    + `<a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>`
    + `<a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>`
    + `</a:fontScheme><a:fmtScheme name="Agracta">`
    + `<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>`
    + `<a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>`
    + `<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>`
    + `<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>`
    + `</a:fmtScheme></a:themeElements></a:theme>`;

  const master = cabec + `<p:sldMaster ${_NS}>` + _ARVORE_VAZIA
    + `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>`
    + `<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;
  const layout = cabec + `<p:sldLayout ${_NS} type="blank" preserve="1">` + _ARVORE_VAZIA
    + `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
  const apresent = cabec + `<p:presentation ${_NS}>`
    + `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>`
    + `<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>`
    + `<p:sldSz cx="${emu(SL_L)}" cy="${emu(SL_A)}"/><p:notesSz cx="${emu(SL_A)}" cy="${emu(SL_L)}"/></p:presentation>`;

  const rel = (itens)=> cabec + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + itens.map(i=>`<Relationship Id="${i[0]}" Type="${i[1]}" Target="${i[2]}"/>`).join("") + `</Relationships>`;
  const T = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";

  return [
    { nome:"[Content_Types].xml", dados: xml(cabec
      + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
      + `<Default Extension="xml" ContentType="application/xml"/>`
      + `<Default Extension="png" ContentType="image/png"/>`
      + `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>`
      + `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`
      + `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`
      + `<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
      + `<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`
      + `</Types>`) },
    { nome:"_rels/.rels", dados: xml(rel([["rId1", T+"officeDocument", "ppt/presentation.xml"]])) },
    { nome:"ppt/presentation.xml", dados: xml(apresent) },
    { nome:"ppt/_rels/presentation.xml.rels", dados: xml(rel([
        ["rId1", T+"slideMaster", "slideMasters/slideMaster1.xml"],
        ["rId2", T+"slide", "slides/slide1.xml"],
        ["rId3", T+"theme", "theme/theme1.xml"]])) },
    { nome:"ppt/slideMasters/slideMaster1.xml", dados: xml(master) },
    { nome:"ppt/slideMasters/_rels/slideMaster1.xml.rels", dados: xml(rel([
        ["rId1", T+"slideLayout", "../slideLayouts/slideLayout1.xml"],
        ["rId2", T+"theme", "../theme/theme1.xml"]])) },
    { nome:"ppt/slideLayouts/slideLayout1.xml", dados: xml(layout) },
    { nome:"ppt/slideLayouts/_rels/slideLayout1.xml.rels", dados: xml(rel([
        ["rId1", T+"slideMaster", "../slideMasters/slideMaster1.xml"]])) },
    { nome:"ppt/slides/slide1.xml", dados: xml(slideXml(larguraPng, alturaPng, meta)) },
    { nome:"ppt/slides/_rels/slide1.xml.rels", dados: xml(rel([
        ["rId1", T+"slideLayout", "../slideLayouts/slideLayout1.xml"],
        ["rId2", T+"image", "../media/image1.png"]])) },
    { nome:"ppt/theme/theme1.xml", dados: xml(tema) },
    { nome:"ppt/media/image1.png", dados: pngBytes }
  ];
}

function layoutFotos(n){
  if(![4,6,8].includes(n))throw Error('Escolha 4, 6 ou 8 fotos por slide.');
  const cols=n/2,gap=.18,left=.8,top=1.15,w=(SL_L-2*left-(cols-1)*gap)/cols,h=2.72;
  return Array.from({length:n},(_,i)=>({x:left+(i%cols)*(w+gap),y:top+Math.floor(i/cols)*(h+.15),w,h,photoH:1.78}));
}
function wrap(s,max){
  const words=String(s||'').split(/\s+/),out=[];let line='';
  words.forEach(word=>{while(word.length>max){if(line){out.push(line);line='';}out.push(word.slice(0,max));word=word.slice(max);}if((line+' '+word).trim().length>max){out.push(line);line=word;}else line=(line+' '+word).trim();});if(line)out.push(line);return out;
}
function caption(photo,box){
  let font=14,lines=[];
  do{lines=wrap(photo.label,Math.max(12,Math.floor(box.w*72/(font*.57))));if(lines.length*font*1.2<=48||font<=9)break;font--; }while(true);
  return {font,lines};
}
function fotoSlide(images,n,meta,page,total){
  let sp='';const L=SL_L,A=SL_A,f=.55;
  sp+=_faixa(2,'FaixaEsqCima',[[0,0],[f,0],[f,3.15],[0,3.72]],CINZA_PPT);
  sp+=_faixa(3,'FaixaEsqBaixo',[[0,3.90],[f,3.33],[f,A],[0,A]],LARANJA_PPT);
  sp+=_faixa(4,'FaixaDirCima',[[L-f,0],[L,0],[L,3.72],[L-f,3.15]],LARANJA_PPT);
  sp+=_faixa(5,'FaixaDirBaixo',[[L-f,3.33],[L,3.90],[L,A],[L-f,A]],CINZA_PPT);
  sp+=_texto(6,'Estudo',.8,.25,11.7,.45,[{t:meta.titulo,tam:26,negrito:true,cor:'3F3F3F'}]).replace('<a:spAutoFit/>','<a:normAutofit/>');
  sp+=_texto(7,'Identificação',.8,.77,11.7,.3,[{t:meta.subtitulo||'Registro fotográfico de parcelas',tam:13,cor:'C86A08'}]).replace('<a:spAutoFit/>','<a:normAutofit/>');
  const boxes=layoutFotos(n);
  images.forEach((p,i)=>{
    const b=boxes[i],factor=Math.min(b.w/p.width,b.photoH/p.height),iw=p.width*factor,ih=p.height*factor;
    sp+=_imagem(10+i*3,b.x+(b.w-iw)/2,b.y+(b.photoH-ih)/2,iw,ih).replace('rId2','rId'+(i+2)).replace('name="Grafico"','name="Foto '+(i+1)+'"');
    const cap=caption(p,b);
    sp+=_texto(11+i*3,'Tratamento '+(i+1),b.x,b.y+b.photoH+.06,b.w,.68,cap.lines.map(t=>({t,tam:cap.font,negrito:true,algn:'ctr'}))).replace('<a:spAutoFit/>','<a:normAutofit/>');
    sp+=_texto(12+i*3,'Parcela e data '+(i+1),b.x,b.y+b.photoH+.76,b.w,.3,[{t:p.detail,tam:10,algn:'ctr'}]).replace('<a:spAutoFit/>','<a:normAutofit/>');
  });
  sp+=_texto(100,'Rodapé',.8,7.12,11.7,.23,[{t:'CONFIDENTIAL INFORMATION     '+page+' / '+total,tam:10,cor:'808080',algn:'ctr'}]);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld '+_NS+'>'+_ARVORE_VAZIA.replace('</p:spTree>',sp+'</p:spTree>')+'<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
function partesFotos(images,n,meta){
  layoutFotos(n);if(!images.length)throw Error('Selecione pelo menos uma foto.');
  images.forEach(p=>{if(!(p.width>0&&p.height>0)||!(p.bytes instanceof Uint8Array))throw Error('Imagem inválida.');});
  const pages=[];for(let i=0;i<images.length;i+=n)pages.push(images.slice(i,i+n));
  const files=partesPptx(new Uint8Array(),1,1,{}).filter(f=>!/^ppt\/(slides|media)\//.test(f.nome));
  const decoder=new TextDecoder(),T='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  function rewrite(name,fn){const file=files.find(f=>f.nome===name);file.dados=_enc.encode(fn(decoder.decode(file.dados)));}
  const rel=items=>'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+items.map(i=>'<Relationship Id="'+i[0]+'" Type="'+T+i[1]+'" Target="'+i[2]+'"/>').join('')+'</Relationships>';
  rewrite('[Content_Types].xml',s=>s.replace(/<Override PartName="\/ppt\/slides\/slide1.xml"[^>]*\/>/,'').replace('</Types>','<Default Extension="jpg" ContentType="image/jpeg"/>'+pages.map((_,i)=>'<Override PartName="/ppt/slides/slide'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('')+'</Types>'));
  rewrite('ppt/presentation.xml',s=>s.replace(/<p:sldIdLst>.*?<\/p:sldIdLst>/,'<p:sldIdLst>'+pages.map((_,i)=>'<p:sldId id="'+(256+i)+'" r:id="rId'+(i+3)+'"/>').join('')+'</p:sldIdLst>'));
  rewrite('ppt/_rels/presentation.xml.rels',()=>rel([['rId1','slideMaster','slideMasters/slideMaster1.xml'],['rId2','theme','theme/theme1.xml']].concat(pages.map((_,i)=>['rId'+(i+3),'slide','slides/slide'+(i+1)+'.xml']))));
  pages.forEach((photos,i)=>{
    const rels=[['rId1','slideLayout','../slideLayouts/slideLayout1.xml']];
    photos.forEach((photo,j)=>{const name='foto'+(i*n+j+1)+'.jpg';files.push({nome:'ppt/media/'+name,dados:photo.bytes});rels.push(['rId'+(j+2),'image','../media/'+name]);});
    files.push({nome:'ppt/slides/slide'+(i+1)+'.xml',dados:_enc.encode(fotoSlide(photos,n,meta,i+1,pages.length))});
    files.push({nome:'ppt/slides/_rels/slide'+(i+1)+'.xml.rels',dados:_enc.encode(rel(rels))});
  });
  return files;
}
const api={layout:layoutFotos,caption,parts:partesFotos,zip:zipar,build:(images,n,meta)=>zipar(partesFotos(images,n,meta))};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FotosPptx=api;
})(typeof window==='object'?window:this);
