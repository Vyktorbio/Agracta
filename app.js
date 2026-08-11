var P={"F1": [[604, 158], [760, 150], [761, 317], [586, 318]], "E7": [[796, 149], [852, 148], [807, 317], [791, 317]], "E6": [[867, 149], [903, 147], [877, 317], [823, 318]], "E5": [[924, 146], [975, 147], [954, 314], [899, 317]], "E4": [[996, 150], [1047, 146], [1013, 316], [972, 316]], "E3": [[1072, 147], [1111, 144], [1098, 310], [1031, 313]], "E2": [[1130, 141], [1150, 142], [1144, 312], [1117, 314]], "H2": [[129, 402], [239, 370], [254, 555], [151, 582]], "H1": [[258, 359], [345, 342], [341, 540], [271, 554]], "D3": [[405, 340], [565, 338], [553, 524], [415, 521]], "D2": [[580, 339], [707, 338], [622, 528], [571, 527]], "D1": [[723, 338], [762, 336], [766, 520], [641, 528]], "C6": [[803, 337], [878, 334], [796, 520], [790, 520]], "C5": [[894, 335], [950, 330], [887, 519], [813, 523]], "C4": [[964, 336], [1008, 333], [974, 518], [901, 520]], "C3": [[1024, 333], [1087, 332], [1063, 517], [988, 517]], "C2": [[1106, 331], [1153, 328], [1146, 512], [1084, 515]], "C1": [[1170, 330], [1193, 329], [1211, 503], [1160, 512]], "B4": [[365, 559], [549, 549], [499, 741], [367, 753]], "B2": [[630, 549], [704, 545], [629, 742], [582, 747]], "B1": [[718, 545], [777, 544], [782, 732], [646, 736]], "A5": [[796, 542], [876, 540], [811, 730], [801, 731]], "A4": [[895, 541], [965, 536], [908, 725], [831, 730]], "A3": [[982, 537], [1063, 533], [1046, 719], [926, 730]], "A2": [[1078, 534], [1145, 533], [1172, 717], [1068, 721]], "A1": [[1156, 530], [1215, 531], [1230, 710], [1190, 715]], "F2": [[432, 134], [600, 155], [586, 318], [420, 300]], "H3": [[8, 400], [125, 388], [110, 582], [2, 598]], "G1": [[130, 598], [360, 560], [350, 752], [118, 800]], "D4": [[350, 340], [400, 338], [405, 524], [355, 525]], "B3": [[468, 555], [555, 550], [540, 745], [460, 750]]};
var QPOS={"F1": [678, 236], "E7": [812, 233], "E6": [868, 233], "E5": [938, 231], "E4": [1007, 232], "E3": [1078, 228], "E2": [1135, 227], "H2": [193, 477], "H1": [304, 449], "D3": [484, 431], "D2": [620, 433], "D1": [723, 430], "C6": [817, 428], "C5": [886, 427], "C4": [962, 427], "C3": [1040, 425], "C2": [1122, 422], "C1": [1184, 418], "B4": [445, 650], "B2": [636, 646], "B1": [731, 639], "A5": [821, 636], "A4": [900, 633], "A3": [1004, 630], "A2": [1116, 626], "A1": [1198, 622], "F2": [525, 227], "H3": [76, 492], "G1": [290, 678], "D4": [378, 432], "B3": [555, 650]};

var FEN={
Soja:[{m:7,s:"09",l:"Emergência",c:"#66bb6a"},{m:20,s:"12",l:"Veg. inicial",c:"#43a047"},{m:40,s:"15",l:"Desenv. veg.",c:"#2e7d32"},{m:55,s:"61",l:"Floração",c:"#fdd835"},{m:70,s:"71",l:"Form. vagens",c:"#ffb300"},{m:95,s:"79",l:"Ench. grãos",c:"#f57c00"},{m:120,s:"87",l:"Mat. fisiol.",c:"#d84315"},{m:9999,s:"99",l:"Mat. colheita",c:"#8d6e63"}],
"Algodão":[{m:10,s:"09",l:"Emergência",c:"#66bb6a"},{m:30,s:"14",l:"Desenv. veg.",c:"#2e7d32"},{m:55,s:"51",l:"Botão floral",c:"#9ccc65"},{m:75,s:"65",l:"Floração",c:"#fdd835"},{m:110,s:"71",l:"Form. capulho",c:"#ffb300"},{m:140,s:"85",l:"Mat. capulho",c:"#efebe9"},{m:180,s:"89",l:"Colheita",c:"#a1887f"},{m:9999,s:"99",l:"Pós-colheita",c:"#9e9e9e"}],
Café:[{m:60,s:"19",l:"Cresc. veg.",c:"#2e7d32"},{m:120,s:"65",l:"Floração",c:"#fdd835"},{m:210,s:"73",l:"Granação",c:"#8bc34a"},{m:270,s:"85",l:"Maturação",c:"#d84315"},{m:9999,s:"91",l:"Repouso",c:"#6d4c41"}],
Milho:[{m:7,s:"09",l:"Emergência",c:"#66bb6a"},{m:25,s:"14",l:"Veg. inicial",c:"#43a047"},{m:50,s:"18",l:"Desenv. veg.",c:"#2e7d32"},{m:60,s:"51",l:"Pendoamento",c:"#fdd835"},{m:75,s:"63",l:"Polinização",c:"#ffb300"},{m:100,s:"73",l:"Grão pastoso",c:"#f57c00"},{m:130,s:"85",l:"Maturação",c:"#d84315"},{m:9999,s:"99",l:"Colheita",c:"#8d6e63"}],
"Feijão":[{m:7,s:"09",l:"Germinação",c:"#66bb6a"},{m:20,s:"13",l:"Desenv. veg.",c:"#2e7d32"},{m:35,s:"51",l:"Pré-floração",c:"#c0ca33"},{m:45,s:"61",l:"Floração",c:"#fdd835"},{m:60,s:"71",l:"Form. vagens",c:"#ffb300"},{m:75,s:"79",l:"Ench. grãos",c:"#f57c00"},{m:90,s:"89",l:"Maturação",c:"#8d6e63"},{m:9999,s:"99",l:"Colheita",c:"#9e9e9e"}],
Tomate:[{m:15,s:"13",l:"Transplante",c:"#66bb6a"},{m:35,s:"19",l:"Vegetativo",c:"#2e7d32"},{m:55,s:"61",l:"Floração",c:"#fdd835"},{m:80,s:"71",l:"Frutificação",c:"#f57c00"},{m:120,s:"89",l:"Colheita",c:"#e53935"},{m:9999,s:"97",l:"Fim ciclo",c:"#9e9e9e"}],
Morango:[{m:20,s:"11",l:"Estabelecimento",c:"#66bb6a"},{m:50,s:"19",l:"Vegetativo",c:"#2e7d32"},{m:70,s:"61",l:"Floração",c:"#fdd835"},{m:120,s:"87",l:"Produção",c:"#e53935"},{m:9999,s:"97",l:"Declínio",c:"#9e9e9e"}],
"Melão":[{m:10,s:"09",l:"Emergência",c:"#66bb6a"},{m:25,s:"19",l:"Vegetativo",c:"#2e7d32"},{m:40,s:"61",l:"Floração",c:"#fdd835"},{m:65,s:"71",l:"Frutificação",c:"#f57c00"},{m:80,s:"89",l:"Colheita",c:"#c0ca33"},{m:9999,s:"97",l:"Fim ciclo",c:"#9e9e9e"}],
"Cana de açúcar":[{m:30,s:"09",l:"Brotação",c:"#66bb6a"},{m:120,s:"25",l:"Perfilhamento",c:"#43a047"},{m:270,s:"34",l:"Grand. cresc.",c:"#2e7d32"},{m:365,s:"85",l:"Maturação",c:"#ffb300"},{m:9999,s:"99",l:"Corte/soca",c:"#6d4c41"}],
Pastagem:[{m:9999,s:"EST",l:"Pastagem estab.",c:"#66bb6a"}],
CITROS:[{m:9999,s:"PER",l:"Pomar perene",c:"#f57c00"}],
ESTUFAS:[{m:9999,s:"\u2014",l:"Estrutura",c:"#78909c"}],
_:[{m:20,s:"09",l:"Inicial",c:"#66bb6a"},{m:60,s:"19",l:"Vegetativo",c:"#2e7d32"},{m:90,s:"61",l:"Reprodutivo",c:"#fdd835"},{m:130,s:"85",l:"Maturação",c:"#f57c00"},{m:9999,s:"97",l:"Fim ciclo",c:"#9e9e9e"}]
};
var CC={Soja:"#4caf50","Algodão":"#bcaaa4",Café:"#8d6e63",Milho:"#fbc02d","Feijão":"#7cb342",Tomate:"#ef5350",Morango:"#ec407a","Melão":"#ffca28","Cana de açúcar":"#43a047",Pastagem:"#66bb6a",CITROS:"#ff9800",ESTUFAS:"#78909c",Pousio:"#757575",_:"#66bb6a"};
var CL=["Soja","Algodão","Milho","Café","Feijão","Tomate","Morango","Melão","Cana de açúcar","Pastagem","CITROS","ESTUFAS","Pousio"];
/* ===== Culturas adicionais por GRUPO BBCH (estende FEN/CC/CL de forma aditiva) ===== */
function _fenRamp(a){ var r=["#66bb6a","#43a047","#2e7d32","#9ccc65","#cddc39","#fdd835","#ffb300","#f57c00","#d84315","#8d6e63"]; var n=a.length;
  return a.map(function(s,i){ return {m:s[0],s:s[1],l:s[2],c:r[Math.min(r.length-1,Math.round(i*(r.length-1)/Math.max(1,n-1)))]}; }); }
var _GT={
  cereais:_fenRamp([[10,"09","Emergência"],[30,"21","Perfilhamento"],[55,"31","Alongamento"],[75,"55","Espigamento"],[90,"65","Floração"],[110,"75","Grão leitoso"],[130,"87","Grão duro"],[9999,"99","Colheita"]]),
  arroz:_fenRamp([[12,"09","Emergência"],[35,"21","Perfilhamento"],[60,"30","Elongação"],[80,"45","Emborrachamento"],[95,"65","Floração"],[115,"75","Grão leitoso"],[135,"87","Grão duro"],[9999,"99","Colheita"]]),
  sorgo:_fenRamp([[8,"09","Emergência"],[28,"14","Veg. inicial"],[55,"30","Elongação"],[70,"51","Emborrachamento"],[85,"65","Floração"],[110,"75","Grão leitoso"],[130,"87","Grão duro"],[9999,"99","Colheita"]]),
  leguminosas:_fenRamp([[8,"09","Emergência"],[22,"13","Desenv. veg."],[40,"51","Pré-floração"],[50,"61","Floração"],[65,"71","Form. vagens"],[85,"79","Ench. grãos"],[105,"89","Maturação"],[9999,"99","Colheita"]]),
  oleaginosas:_fenRamp([[10,"09","Emergência"],[30,"16","Desenv. veg."],[55,"51","Botão floral"],[70,"61","Floração"],[95,"71","Form. frutos"],[120,"79","Enchimento"],[9999,"89","Maturação"]]),
  solanaceas:_fenRamp([[12,"11","Mudas/Transpl."],[35,"19","Vegetativo"],[55,"61","Floração"],[80,"71","Frutificação"],[110,"81","Mat. frutos"],[9999,"89","Colheita"]]),
  raizes:_fenRamp([[15,"09","Emergência"],[35,"20","Parte aérea"],[55,"40","Engross. raiz/tubérculo"],[80,"60","Floração"],[110,"80","Enchimento"],[9999,"95","Colheita"]]),
  cucurbitaceas:_fenRamp([[8,"09","Emergência"],[25,"19","Vegetativo"],[40,"61","Floração"],[60,"71","Frutificação"],[9999,"89","Colheita"]]),
  brassicas:_fenRamp([[12,"11","Mudas/Transpl."],[35,"19","Vegetativo"],[60,"41","Form. cabeça"],[90,"49","Cabeça desenv."],[9999,"89","Colheita"]]),
  allium:_fenRamp([[15,"09","Emergência"],[45,"13","Desenv. folhas"],[90,"41","Form. bulbo"],[130,"47","Bulbo desenv."],[9999,"49","Colheita"]]),
  folhosas:_fenRamp([[10,"11","Mudas"],[25,"19","Vegetativo"],[40,"41","Form. cabeça/roseta"],[9999,"49","Colheita"]]),
  forrageira:[{m:9999,s:"EST",l:"Forrageira estab.",c:"#66bb6a"}],
  perene:[{m:9999,s:"PER",l:"Perene",c:"#f57c00"}]
};
var _GRPCOR={cereais:"#cda434",arroz:"#aed581",sorgo:"#c17900",leguminosas:"#7cb342",oleaginosas:"#fbc02d",solanaceas:"#ef5350",raizes:"#a1887f",cucurbitaceas:"#9ccc65",brassicas:"#4db6ac",allium:"#ce93d8",folhosas:"#81c784",forrageira:"#66bb6a",perene:"#ff9800"};
var _NEWC={
  cereais:["Trigo","Cevada","Aveia","Centeio","Triticale"],
  arroz:["Arroz"],
  sorgo:["Sorgo","Milheto"],
  leguminosas:["Caupi","Ervilha","Grão-de-bico","Lentilha"],
  oleaginosas:["Girassol","Canola","Amendoim","Gergelim"],
  solanaceas:["Pimentão","Pimenta","Berinjela"],
  raizes:["Batata","Batata-doce","Mandioca","Cenoura","Beterraba"],
  cucurbitaceas:["Melancia","Pepino","Abóbora","Abobrinha"],
  brassicas:["Brócolis","Couve-flor","Repolho","Couve"],
  allium:["Cebola","Alho"],
  folhosas:["Alface","Rúcula","Espinafre"],
  forrageira:["Braquiária","Urochloa","Mombaça","Panicum","Tifton","Cynodon","Azevém","Alfafa","Aveia forrageira"],
  perene:["Uva","Maçã","Pera","Pêssego","Ameixa","Banana","Manga","Abacate","Goiaba","Mamão","Maracujá","Abacaxi","Coco","Caqui","Cacau","Seringueira","Dendê","Oliveira","Erva-mate","Chá","Eucalipto"]
};
Object.keys(_NEWC).forEach(function(g){ _NEWC[g].forEach(function(name){
  if(!FEN[name]) FEN[name]=_GT[g];
  if(!CC[name]) CC[name]=_GRPCOR[g]||"#66bb6a";
  if(CL.indexOf(name)<0) CL.push(name);
}); });
var DD={
A1:{cultura:"Café",cultivar:"Catuaí vermelho",plantio:"15/03/2011",area:0.56,estudos:[]},
A2:{cultura:"Algodão",cultivar:"FM 944 GL",plantio:"01/06/2026",area:0.98,estudos:[]},
A3:{cultura:"Soja",cultivar:"BMX Nexus I2X",plantio:"22/10/2025",area:1.0,estudos:[]},
A4:{cultura:"Soja",cultivar:"57K58RSF CE (VÊNUS)",plantio:"28/10/2025",area:0.91,estudos:[]},
A5:{cultura:"Algodão",cultivar:"DP1949B3RF",plantio:"27/10/2025",area:0.8,estudos:[]},
B1:{cultura:"Soja",cultivar:"TMG 1155 RR",plantio:"26/12/2025",area:1.0,estudos:[]},
B2:{cultura:"Soja",cultivar:"Torque",plantio:"19/11/2025",area:0.93,estudos:[]},
B3:{cultura:"Soja",cultivar:"Coliseu",plantio:"15/11/2025",area:0.44,estudos:[]},
B4:{cultura:"Cana de açúcar",cultivar:"RB 72 454",plantio:"20/01/2026",area:1.78,estudos:[]},
C1:{cultura:"Soja",cultivar:"Venus Enlist",plantio:"23/12/2025",area:0.44,estudos:[]},
C2:{cultura:"Soja",cultivar:"BMX Nexus I2X",plantio:"22/10/2025",area:1.0,estudos:[]},
C3:{cultura:"Algodão",cultivar:"FM 945 STP",plantio:"18/02/2026",area:0.8,estudos:[]},
C4:{cultura:"Soja",cultivar:"Zeus",plantio:"12/02/2025",area:0.7,estudos:[]},
C5:{cultura:"Algodão",cultivar:"FM 974 GLT",plantio:"22/12/2025",area:0.8,estudos:[]},
C6:{cultura:"Algodão",cultivar:"FM 974 GLT",plantio:"01/07/2026",area:0.6,estudos:[]},
D1:{cultura:"Soja",cultivar:"Zeus",plantio:"12/10/2025",area:1.0,estudos:[]},
D2:{cultura:"Soja",cultivar:"Zeus",plantio:"15/12/2025",area:1.0,estudos:[]},
D3:{cultura:"Soja",cultivar:"Fibra",plantio:"26/11/2025",area:1.8,estudos:[]},
D4:{cultura:"Algodão",cultivar:"Deltapine 1949",plantio:"01/10/2025",area:1.8,estudos:[]},
E2:{cultura:"Soja",cultivar:"57K58RSF CE (VÊNUS)",plantio:"24/09/2025",area:0.5,estudos:[]},
E3:{cultura:"Soja",cultivar:"57K58RSF CE (VÊNUS)",plantio:"15/10/2025",area:0.68,estudos:[]},
E4:{cultura:"Soja",cultivar:"Nexus",plantio:"05/11/2025",area:0.65,estudos:[]},
E5:{cultura:"Milho",cultivar:"K7510VIP3",plantio:"04/07/2025",area:0.7,estudos:[]},
E6:{cultura:"Algodão",cultivar:"FM 974GLT",plantio:"01/05/2026",area:0.6,estudos:[]},
E7:{cultura:"Soja",cultivar:"Nexus",plantio:"11/11/2025",area:0.6,estudos:[]},
F1:{cultura:"Feijão",cultivar:"IAC 1850",plantio:"17/03/2026",area:1.8,estudos:[]},
F2:{cultura:"Soja",cultivar:"Zeus",plantio:"26/12/2025",area:0.65,estudos:[]},
G1:{cultura:"Pastagem",cultivar:"Brachiaria Decumbens",plantio:"07/07/2013",area:0.7,estudos:[]},
H1:{cultura:"Morango",cultivar:"San Andreas",plantio:"03/02/2026",area:null,estudos:[]},
H2:{cultura:"Tomate",cultivar:"HM 2798",plantio:"27/01/2026",area:1.2,estudos:[]},
H3:{cultura:"Melão",cultivar:"Gaucho",plantio:"29/01/2026",area:0.65,estudos:[]}
};

/* ============ DATE / STAGE UTILS ============ */
function pD(d){
  if(!d)return null;
  var s=String(d).trim();
  var m=s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  m=s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m?new Date(+m[1],+m[2]-1,+m[3]):null;
}
function fD(d){
  if(!d)return "";
  var dd=String(d.getDate()).padStart(2,'0');
  var mm=String(d.getMonth()+1).padStart(2,'0');
  return dd+"/"+mm+"/"+d.getFullYear();
}
function fDIso(d){
  if(!d)return "";
  var dd=String(d.getDate()).padStart(2,'0');
  var mm=String(d.getMonth()+1).padStart(2,'0');
  return d.getFullYear()+"-"+mm+"-"+dd;
}
function isoToBR(iso){
  if(!iso)return "";
  var m=String(iso).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m?m[3]+"/"+m[2]+"/"+m[1]:iso;
}
function brToIso(br){
  if(!br)return "";
  var m=String(br).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(!m)return "";
  return m[3]+"-"+String(m[2]).padStart(2,'0')+"-"+String(m[1]).padStart(2,'0');
}
function today0(){var d=new Date();d.setHours(0,0,0,0);return d}
function daysBetween(a,b){return Math.round((b-a)/864e5)}

/* ===== MOMENTO DA AVALIAÇÃO — HAT/DAT explícito, OPCIONAL ====================
   O app sempre derivou o momento da DATA (daysBetween → DAA). Isso basta para
   ensaio de campo, mas não para bioensaio: um knockdown lê a 1, 2, 4 e 24 horas
   DO MESMO DIA, e pela data as quatro leituras são o mesmo ponto — três eram
   descartadas sem avisar.

   Agora a avaliação PODE declarar `momento:{valor, unidade:'HAT'|'DAT'}`. Quando
   declara, é ele que manda no eixo do tempo; quando não declara — que é o caso
   de tudo que já existe — nada muda: continua o DAA derivado da data.

   `dias` é sempre em DIAS (HAT vira fração) porque a AACPD integra por trapézio
   sobre esse eixo; misturar hora com dia ali daria área errada. */
function avMomento(av, daaDerivado){
  var m=av&&av.momento, v=m?parseFloat(String(m.valor).replace(',','.')):NaN;
  var u=m&&(m.unidade==='HAT'||m.unidade==='DAT')?m.unidade:null;
  if(u && isFinite(v)){
    var dias=(u==='HAT')?(v/24):v;
    return { dias:dias, chave:u+':'+v, rotulo:_fmtMom(v)+' '+u, unidade:u, valor:v, explicito:true };
  }
  var d=(daaDerivado==null?0:daaDerivado);
  return { dias:d, chave:'DAA:'+d, rotulo:d+' DAA', unidade:'DAA', valor:d, explicito:false };
}
function _fmtMom(v){ return (Math.round(v*100)/100).toString().replace('.',','); }
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}

function cDAP(p){var d=pD(p);return d&&!isNaN(d)?Math.floor((today0()-d)/864e5):null}
function gS(c,dap){
  if(dap===null)return{s:"\u2014",l:"Sem data",c:"#616161"};
  if(dap<0)return{s:"PLAN",l:"Plantio em "+Math.abs(dap)+"d",c:"#42a5f5"};
  var t=FEN[c]||FEN._;
  for(var i=0;i<t.length;i++){if(dap<=t[i].m)return t[i]}
  return t[t.length-1];
}
function gC(c){return CC[c]||CC._}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function uid(){ try{ if(window.crypto&&crypto.randomUUID) return 's'+crypto.randomUUID(); }catch(e){} return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,6); }
/* Ícones SVG (estilo Lucide, monocromáticos, herdam a cor do texto via currentColor) */
function ic(n,sz){ var P={
  pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  sheet:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  maximize:'<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  sat:'<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
  weather:'<path d="M12 2v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="M20 12h2"/><path d="m17.7 6.3 1.4-1.4"/><path d="M16 12a4 4 0 1 0-8 0"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  thermo:'<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/>',
  droplet:'<path d="M12 2.7s6 5.5 6 10.3a6 6 0 0 1-12 0C6 8.2 12 2.7 12 2.7Z"/>',
  wind:'<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/>',
  rain:'<path d="M16 13a5 5 0 0 0-1-9.9A6 6 0 0 0 4 8a4 4 0 0 0 .5 8H16Z"/><path d="M8 19v2M12 19v2M16 19v2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sunrise:'<path d="M12 2v6M4.9 10.9l1.4 1.4M2 18h2M20 18h2M17.7 12.3l1.4-1.4M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  sunset:'<path d="M12 10V2M4.9 10.9l1.4 1.4M2 18h2M20 18h2M17.7 12.3l1.4-1.4M22 22H2"/><path d="m16 5-4 5-4-5"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  ruler:'<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>',
  gauge:'<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'
}; var s=sz||16; return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[n]||'')+'</svg>'; }
function todayISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function normStr(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}

/* ============ STATE ============ */
var data={},legO=false,agO=false,curV=null,curE=null,curS=null,curSid=null;
var RZLIB_KEY="iracema-randomizacoes-v1", RZLIB=[];

function normalizeRZLib(arr){
  arr=Array.isArray(arr)?arr:[];
  var by={}, out=[];
  arr.forEach(function(x){
    if(!x||typeof x!=='object'||!x.key||!x.texto)return;
    if(!x.id)x.id='rz'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    x.nome=String(x.nome||'Randomização').slice(0,80);
    x.updatedAt=parseInt(x.updatedAt)||Date.now();
    by[x.id]=x;
  });
  Object.keys(by).forEach(function(id){ out.push(by[id]); });
  out.sort(function(a,b){return (b.updatedAt||0)-(a.updatedAt||0);});
  return out.slice(0,20);
}
function loadRZLib(){ try{ return normalizeRZLib(JSON.parse(localStorage.getItem(RZLIB_KEY)||'[]')); }catch(e){ return []; } }
function saveRZLib(){
  RZLIB=normalizeRZLib(RZLIB);
  try{ localStorage.setItem(RZLIB_KEY, JSON.stringify(RZLIB)); }catch(e){}
  if(typeof cloudSaveSoon==='function') cloudSaveSoon();
  if(typeof dbUpsertRZAll==='function') dbUpsertRZAll(); /* Etapa 3 */
}
RZLIB=loadRZLib();

function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var result = "";
  var words = [];
  var asciiLength = ascii.length;
  var hash = sha256.h = sha256.h || [];
  var k = sha256.k = sha256.k || [];
  var primeCounter = k.length;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (var i = 0; i < 313; i += candidate) {
        isComposite[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  ascii += "\x80";
  while (ascii.length % 64 - 56) ascii += "\x00";
  for (var i = 0; i < ascii.length; i++) {
    var j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiLength * 8) / maxWord) | 0;
  words[words.length] = (asciiLength * 8) | 0;
  for (var j = 0; j < words.length; ) {
    var w = words.slice(j, j += 16);
    var oldHash = hash;
    hash = hash.slice(0, 8);
    for (var i = 0; i < 64; i++) {
      var w16 = w[i - 16], w15 = w[i - 15], w7 = w[i - 7], w2 = w[i - 2];
      var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      var temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16 ? w[i] : (w16 + s0 + w7 + s1) | 0));
      var temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (var i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (var i = 0; i < 8; i++) {
    for (var j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

function ensureConfig(){
  if(!data) return;
  if(!data.__config || typeof data.__config !== 'object') {
    data.__config = {};
  }
  var currentPwd = data.__config.adminPassword;
  if(typeof currentPwd !== 'string' || currentPwd === 'admin123' || currentPwd === 'mPskeYv' || currentPwd === 'mPsk3Yv') {
    data.__config.adminPassword = '21ecaab54a2b091391b1fb10eaf969fabbee7cdad3724f3371ae4dc72b4dad0f';
  }
  if(!Array.isArray(data.__config.allowedUsers)) {
    data.__config.allowedUsers = [];
  }
  if(!data.__config.delUsers || typeof data.__config.delUsers !== 'object') data.__config.delUsers = {};
  data.__config.allowedUsers.forEach(function(u){ if(u && typeof u==='object' && !u.addedAt) u.addedAt = 1; }); /* backfill: entradas antigas seguem válidas (só uma lápide nova remove) */
  if(typeof data.__config.adminEmail !== 'string' || data.__config.adminEmail === '' || data.__config.adminEmail === 'admin@agracta.com') {
    data.__config.adminEmail = 'machadovictorchaves@gmail.com';
  }
}

function load(){
  try{
    var s=localStorage.getItem("iracema-v7");
    if(s){
      var parsed=JSON.parse(s);
      data={};
      Object.keys(DD).forEach(function(k){
        data[k]=Object.assign({},DD[k],parsed[k]||{});
        if(!Array.isArray(data[k].estudos))data[k].estudos=[];
      });
      // traz quadras customizadas (criadas pelo usuário, fora de DD) que estão salvas
      Object.keys(parsed).forEach(function(k){
        if(!data[k])data[k]=parsed[k];
      });
      ensureConfig();
      save(); // persiste a limpeza
      return;
    }
  }catch(e){}
  data={};
  Object.keys(DD).forEach(function(k){
    data[k]=Object.assign({},DD[k]);
    if(!Array.isArray(data[k].estudos))data[k].estudos=[];
  });
  ensureConfig();
}
var _saveErrAlerted=false;
function save(){
  try{
    localStorage.setItem("iracema-v7",JSON.stringify(data));
    _saveErrAlerted=false;
  }catch(e){
    /* Sem espaço? Sacrifica os backups LOCAIS (a nuvem + Histórico da nuvem cobrem recuperação)
       e tenta gravar o estado ativo de novo ANTES de alertar — preservar o dado atual é prioridade. */
    var ok=false;
    try{
      var bk=JSON.parse(localStorage.getItem('iracema-safety')||'[]');
      while(!ok && bk.length){ bk.shift(); try{ localStorage.setItem('iracema-safety',JSON.stringify(bk)); }catch(e2){} try{ localStorage.setItem("iracema-v7",JSON.stringify(data)); ok=true; }catch(e3){} }
      if(!ok){ try{ localStorage.removeItem('iracema-safety'); localStorage.setItem("iracema-v7",JSON.stringify(data)); ok=true; }catch(e4){} }
    }catch(e5){}
    if(ok){ _saveErrAlerted=false; }
    else if(!_saveErrAlerted){
      _saveErrAlerted=true;
      alert("⚠ Falha ao salvar localmente.\n\n"+e.message+"\n\nSuas edições não estão sendo persistidas. Faça BACKUP agora (💾) e recarregue o app.");
    }
  }
  if(typeof cloudSaveSoon==='function') cloudSaveSoon();
}

/* ============ STUDY UTILS ============ */
// Compute the "next events" (applications + evaluations) for a study
function studyEvents(study){
  // study = {id,nome,dataInicio (iso), intervaloDias, numAplicacoes, avaliacoes:[iso,...]}
  var out=[];
  var start=pD(isoToBR(study.dataInicio)) || pD(study.dataInicio);
  if(start && !isNaN(start)){
    var n=Math.max(1, parseInt(study.numAplicacoes)||1);
    var iv=parseInt(study.intervaloDias)||0;
    for(var i=0;i<n;i++){
      var dt=(iv>0)?addDays(start,i*iv):new Date(start);
      out.push({type:'apl',idx:i+1,total:n,date:dt});
    }
  }
  (study.avaliacoes||[]).forEach(function(av,i){
    var iso=(av&&typeof av==='object')?av.data:av;  /* V2: avaliação é objeto {data,...}; V1: string */
    var d=pD(isoToBR(iso))||pD(iso);
    if(d && !isNaN(d))out.push({type:'eval',idx:i+1,date:d});
  });
  out.sort(function(a,b){return a.date-b.date});
  return out;
}

// Next upcoming event (including today)
function nextEvent(study){
  var t=today0();
  var evs=studyEvents(study);
  for(var i=0;i<evs.length;i++){
    if(evs[i].date >= t)return evs[i];
  }
  // if nothing upcoming, check overdue (past but within 3 days window)
  var last=evs[evs.length-1];
  if(last){
    var diff=daysBetween(last.date,t);
    if(diff<=3)return Object.assign({overdue:true,daysAgo:diff},last);
  }
  return null;
}

// All studies across all quadras, sorted by next event
/* ---------------------------------------------- Agenda: dispensar lembrete ---
   Dispensar NÃO marca o evento como realizado: a aplicação/avaliação continua
   pendente no estudo e no relatório. O que se apaga é só o lembrete. A dispensa
   fica gravada no próprio estudo (portanto acompanha o dado entre aparelhos) e
   entra na trilha BPL, com quem e quando. Dá pra trazer de volta. */
var agVerDispensados=false;
function _agEvKey(ev){ return ev.type+':'+ev.idx; }
function _agDisp(study){ if(!Array.isArray(study.dispensados)) study.dispensados=[]; return study.dispensados; }
function _agEstaDispensado(study, ev){
  if(!study || !Array.isArray(study.dispensados) || !study.dispensados.length) return false;
  var k=_agEvKey(ev);
  return study.dispensados.some(function(d){ return d && d.k===k; });
}
function _agAcharEstudo(qid, sid){
  var q=data[qid]; if(!q || !Array.isArray(q.estudos)) return null;
  for(var i=0;i<q.estudos.length;i++){ if(q.estudos[i] && q.estudos[i].id===sid) return q.estudos[i]; }
  return null;
}
function _agTotalDispensados(){
  var n=0;
  Object.keys(data).forEach(function(qid){
    var q=data[qid]; if(!q || !Array.isArray(q.estudos)) return;
    q.estudos.forEach(function(st){ if(st && Array.isArray(st.dispensados)) n+=st.dispensados.length; });
  });
  return n;
}
function _agSalvar(){
  try{ save(); }catch(e){}
  try{ if(typeof cloudSaveSoon==='function') cloudSaveSoon(); }catch(e){}
  try{ renderAgenda(); }catch(e){}
  try{ updateAgendaBadge(); }catch(e){}
  try{ if(document.getElementById('todayPnl')) renderToday(); }catch(e){}
  try{ updateTodayBadge(); }catch(e){}
  try{ if(typeof render==='function') render(); }catch(e){}
}
function agDispensar(qid, sid, key, rotulo){
  var s=_agAcharEstudo(qid,sid); if(!s) return;
  var d=_agDisp(s);
  if(!d.some(function(x){ return x && x.k===key; })){
    d.push({k:key, ts:Date.now(), quem:(typeof _currentUserName==='function'?_currentUserName():null)});
    if(typeof logStudyAuditInObject==='function')
      logStudyAuditInObject(s,'agenda.dispensar','Lembrete dispensado ('+(rotulo||key)+'). O evento segue pendente.');
  }
  _agSalvar();
}
function agRestaurar(qid, sid, key){
  var s=_agAcharEstudo(qid,sid); if(!s || !Array.isArray(s.dispensados)) return;
  s.dispensados=s.dispensados.filter(function(x){ return !(x && x.k===key); });
  if(typeof logStudyAuditInObject==='function')
    logStudyAuditInObject(s,'agenda.restaurar','Lembrete trazido de volta ('+key+').');
  _agSalvar();
}
function agLimparHoje(){
  var lista=collectTodayEvents(3).filter(function(e){ return !e.dispensado; });
  if(!lista.length){ if(typeof _stxToast==='function') _stxToast('Nada para limpar.'); return; }
  if(!confirm('Dispensar '+lista.length+' lembrete'+(lista.length>1?'s':'')+'?\n\nOs eventos continuam pendentes — só o aviso some. Dá para trazer de volta depois.')) return;
  var tocados={};
  lista.forEach(function(e){
    var s=_agAcharEstudo(e.qid, e.study.id); if(!s) return;
    var k=_agEvKey(e.ev), d=_agDisp(s);
    if(!d.some(function(x){ return x && x.k===k; })){
      d.push({k:k, ts:Date.now(), quem:(typeof _currentUserName==='function'?_currentUserName():null)});
      tocados[e.qid+'|'+e.study.id]=s;
    }
  });
  Object.keys(tocados).forEach(function(kk){
    if(typeof logStudyAuditInObject==='function')
      logStudyAuditInObject(tocados[kk],'agenda.dispensar','Lembretes dispensados em lote pelo painel HOJE. Os eventos seguem pendentes.');
  });
  _agSalvar();
  if(typeof _stxToast==='function') _stxToast(lista.length+' lembrete'+(lista.length>1?'s dispensados':' dispensado'));
}
function agToggleDispensados(){ agVerDispensados=!agVerDispensados; try{ renderAgenda(); }catch(e){} }
/* Dispensa de uma vez tudo que está na lista agora (sem tocar no que já foi dispensado). */
function agLimparTudo(){
  var lista=allUpcomingEvents(30).filter(function(e){ return !e.dispensado; });
  if(!lista.length){ if(typeof _stxToast==='function') _stxToast('Nada para limpar.'); return; }
  if(!confirm('Dispensar '+lista.length+' lembrete'+(lista.length>1?'s':'')+'?\n\nOs eventos continuam pendentes — só o aviso some. Dá para trazer de volta depois.')) return;
  var tocados={};
  lista.forEach(function(e){
    var s=_agAcharEstudo(e.qid, e.study.id); if(!s) return;
    var k=_agEvKey(e.event), d=_agDisp(s);
    if(!d.some(function(x){ return x && x.k===k; })){
      d.push({k:k, ts:Date.now(), quem:(typeof _currentUserName==='function'?_currentUserName():null)});
      tocados[e.qid+'|'+e.study.id]=s;
    }
  });
  Object.keys(tocados).forEach(function(kk){
    if(typeof logStudyAuditInObject==='function')
      logStudyAuditInObject(tocados[kk],'agenda.dispensar','Lembretes dispensados em lote pela agenda. Os eventos seguem pendentes.');
  });
  _agSalvar();
  if(typeof _stxToast==='function') _stxToast(lista.length+' lembrete'+(lista.length>1?'s dispensados':' dispensado'));
}

function allUpcomingEvents(windowDays, incluirDispensados){
  windowDays = windowDays || 30;
  var t=today0();
  var limit=addDays(t,windowDays);
  var all=[];
  Object.keys(data).forEach(function(qid){
    var q=data[qid];
    if(!q||!Array.isArray(q.estudos))return;
    q.estudos.forEach(function(st){
      st=(typeof normalizeStudy==='function')?normalizeStudy(st):st;
      /* Estudo finalizado não gera mais lembrete: ele acabou. Um único ponto de
         filtro aqui já limpa a AGENDA e o painel "hoje", que bebem da mesma fonte. */
      if(typeof estudoFinalizado==='function' && estudoFinalizado(st)) return;
      (typeof studyEventsV2==='function'?studyEventsV2(st):studyEvents(st)).forEach(function(ev){
        if(ev.realizada)return;
        var _disp=_agEstaDispensado(st,ev);
        if(_disp && !incluirDispensados) return;
        var diff=daysBetween(t,ev.date);
        if(diff>=-3 && ev.date<=limit){
          all.push({qid:qid,study:st,event:ev,diff:diff,dispensado:_disp});
        }
      });
    });
  });
  all.sort(function(a,b){return a.event.date-b.event.date});
  return all;
}

function quadraHasAlert(qid){
  var q=data[qid];
  if(!q||!q.estudos||!q.estudos.length)return false;
  for(var i=0;i<q.estudos.length;i++){
    var ne=nextEvent(q.estudos[i]);
    if(ne){
      var diff=daysBetween(today0(),ne.date);
      if(diff<=2)return true;
    }
  }
  return false;
}

var NS="http://www.w3.org/2000/svg";
/* ============ RENDER MAP ============ */
/* ===== Mapa real (sat\u00e9lite Esri) + georrefer\u00eancia ===== */
var IMG_W=1280, IMG_H=889;
var GEOREF_KEY="iracema-georef-v1";
var ESTACAO_CENTER=[-22.65804,-47.52112], ESTACAO_ZOOM=16; /* Plantec Laboratórios, SP-147 km 128 */
var SAT_MAX_ZOOM=21; /* Google chega a ~z21; Esri estica além de z19. */
var _map=null, _qLayer=null, _notesLayer=null, _baseSat=null, _geo=null;
var _grOverlay=null, _grHandles=null, _grOn=false;

/* ----- Homografia (4 cantos): mapeia pixel(x,y) -> [lat,lng] de forma projetiva ----- */
function _adj(m){ return [ m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
  m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
  m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3] ]; }
function _mmm(a,b){ var r=[],i,j,k; for(i=0;i<3;i++)for(j=0;j<3;j++){var s=0;for(k=0;k<3;k++)s+=a[i*3+k]*b[k*3+j];r[i*3+j]=s;} return r; }
function _mv(m,v){ return [ m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2] ]; }
function _basis(p){ var m=[p[0][0],p[1][0],p[2][0], p[0][1],p[1][1],p[2][1], 1,1,1];
  var v=_mv(_adj(m),[p[3][0],p[3][1],1]); return _mmm(m,[v[0],0,0, 0,v[1],0, 0,0,v[2]]); }
function _homography(src,dst){ return _mmm(_basis(dst), _adj(_basis(src))); }
/* c4 = [NO,NE,SE,SO] cada [lat,lng]; constroi H que leva pixel->(lng,lat) */
function buildH(c4){
  var src=[[0,0],[IMG_W,0],[IMG_W,IMG_H],[0,IMG_H]];
  var dst=[[c4[0][1],c4[0][0]],[c4[1][1],c4[1][0]],[c4[2][1],c4[2][0]],[c4[3][1],c4[3][0]]];
  return _homography(src,dst);
}
function loadGeoref(){
  try{
    var s=localStorage.getItem(GEOREF_KEY);
    var g = s ? JSON.parse(s) : (window.DEFAULT_GEOREF ? JSON.parse(JSON.stringify(window.DEFAULT_GEOREF)) : null);
    if(!g) return null;
    if(g.tl && !g.corners){ var br=[g.tr[0]+g.bl[0]-g.tl[0], g.tr[1]+g.bl[1]-g.tl[1]]; g={corners:[g.tl,g.tr,br,g.bl]}; } /* afim antigo (3 cantos) -> 4 cantos */
    if(g.corners && !g.H){ g.H=buildH(g.corners); }
    return g.H?g:null;
  }catch(e){ return null; }
}
function saveGeoref(g){ try{ localStorage.setItem(GEOREF_KEY, JSON.stringify(g)); }catch(e){} if(typeof cloudSaveSoon==='function') cloudSaveSoon(); if(typeof dbUpsertConfig==='function') dbUpsertConfig(); /* Etapa 3: georef vai no config */ }
function pxToLL(x,y){ var H=_geo.H, w=H[6]*x+H[7]*y+H[8];
  return [ (H[3]*x+H[4]*y+H[5])/w, (H[0]*x+H[1]*y+H[2])/w ]; }
function geoBounds(g){ return LF.latLngBounds(g.corners); }
function polyCentroid(lls){ var sx=0,sy=0,n=lls.length; for(var i=0;i<n;i++){sy+=lls[i][0];sx+=lls[i][1];} return [sy/n, sx/n]; }

function initMap(){
  if(_map) return;
  _map = LF.map('map', { center:ESTACAO_CENTER, zoom:ESTACAO_ZOOM, zoomControl:true, maxZoom:SAT_MAX_ZOOM, rotate:true, touchRotate:true, rotateControl:false, bearing:0,
    zoomSnap:0, zoomDelta:0.4, wheelDebounceTime:18, wheelPxPerZoomLevel:110, zoomAnimation:true });
  var _gsub=['mt0','mt1','mt2','mt3'];
  var _bases={
    'Sat\u00e9lite (Google)': LF.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { subdomains:_gsub, maxZoom:SAT_MAX_ZOOM, maxNativeZoom:20, attribution:'\u00a9 Google' }),
    'H\u00edbrido (Google)':  LF.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains:_gsub, maxZoom:SAT_MAX_ZOOM, maxNativeZoom:20, attribution:'\u00a9 Google' }),
    'Sat\u00e9lite (Esri)':   LF.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:SAT_MAX_ZOOM, maxNativeZoom:19, attribution:'\u00a9 Esri, Maxar' })
  };
  _baseSat=_bases['Sat\u00e9lite (Google)']; _baseSat.addTo(_map);
  try{ LF.control.layers(_bases, null, { position:'topleft', collapsed:true }).addTo(_map); }catch(e){}
  _qLayer = LF.layerGroup().addTo(_map);
  _notesLayer = LF.layerGroup().addTo(_map);
  _map.attributionControl.setPrefix('');
  try{ LF.control.scale({ metric:true, imperial:false, maxWidth:150, position:'bottomleft' }).addTo(_map); }catch(e){}
  addRotateControl();
  addMenuControl();
  addMapCtlToggle();
  setTimeout(function(){ try{ _map.invalidateSize(); }catch(e){} }, 200);
  window.addEventListener('resize', function(){ try{ _map.invalidateSize(); }catch(e){} });
  _geo = loadGeoref();
  _map.on('zoomend', function(){ if(_map.getZoom()>SAT_MAX_ZOOM) _map.setZoom(SAT_MAX_ZOOM); });
  if(_geo){ _map.fitBounds(geoBounds(_geo)); }
  else { setTimeout(startGeoref, 250); }
}

/* ---- R\u00e9gua de escala: refer\u00eancia de 1 hectare (quadrado 100\u00d7100 m) ---- */
/* R\u00e9gua de 1 ha (100\u00d7100 m) \u2014 m\u00f3vel (pegador central) e rotacion\u00e1vel (pegador amarelo) */
var _haRef=null, _haState=null, _haHandles=null;
function haCorners(){ var g=_haState, ca=Math.cos(g.ang), sa=Math.sin(g.ang), m=grMeters(g.clat);
  function pt(sx,sy){ var east=sx*50*ca+sy*50*(-sa), north=sx*50*sa+sy*50*ca; return [g.clat+north/m.mlat, g.clng+east/m.mlng]; }
  return [pt(-1,1),pt(1,1),pt(1,-1),pt(-1,-1)]; }
function haRotPos(){ var g=_haState, m=grMeters(g.clat), east=1.5*50*(-Math.sin(g.ang)), north=1.5*50*Math.cos(g.ang);
  return [g.clat+north/m.mlat, g.clng+east/m.mlng]; }
function haUpdate(){ if(_haRef) _haRef.setLatLngs(haCorners()); if(_haHandles){ _haHandles[0].setLatLng([_haState.clat,_haState.clng]); _haHandles[1].setLatLng(haRotPos()); } }
function haRemove(){ if(_haRef){ _map.removeLayer(_haRef); _haRef=null; } if(_haHandles){ _haHandles.forEach(function(h){ try{_map.removeLayer(h);}catch(e){} }); _haHandles=null; } _haState=null; }
function haCss(){ if(document.getElementById('haCtlCss'))return; var s=document.createElement('style'); s.id='haCtlCss';
  s.textContent='.ha-ctl button{font:700 11px/1 system-ui,sans-serif;background:rgba(22,24,22,.9);color:#e9e9e9;border:1px solid #3a3a3a;border-radius:5px;padding:5px 8px;cursor:pointer}.ha-ctl button.on{background:#e9e9e9;color:#161816}.ha-tip{background:rgba(20,22,20,.85);color:#fff;border:none;font:600 10px/1 system-ui,sans-serif;box-shadow:none}.ha-tip:before{display:none}.leaflet-control-scale-line{background:rgba(22,24,22,.7);color:#e9e9e9;border-color:#888;border-top:none}';
  document.head.appendChild(s);
}
function toggleHaRef(){
  if(!_map) return;
  haCss();
  var b=document.getElementById('haRefBtn');
  if(_haRef){ haRemove(); if(b)b.classList.remove('on'); return; }
  var c=_map.getCenter(); _haState={clat:c.lat, clng:c.lng, ang:0};
  _haRef=LF.polygon(haCorners(),{color:'#fff',weight:1.5,dashArray:'5,4',fill:false,interactive:false}).addTo(_map);
  _haRef.bindTooltip('1 ha (100\u00d7100 m)',{permanent:true,direction:'center',className:'ha-tip'}).openTooltip();
  var mv=LF.marker([_haState.clat,_haState.clng],{draggable:true,zIndexOffset:1000,
    icon:LF.divIcon({className:'gr-handle',html:'<div class="gr-h gr-move">&#10010;</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(_map);
  mv.on('drag',function(){ var p=mv.getLatLng(); _haState.clat=p.lat; _haState.clng=p.lng; haUpdate(); });
  var rot=LF.marker(haRotPos(),{draggable:true,zIndexOffset:1000,
    icon:LF.divIcon({className:'gr-handle',html:'<div class="gr-h gr-rot">&#8635;</div>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(_map);
  rot.on('drag',function(){ var p=rot.getLatLng(), m=grMeters(_haState.clat);
    var east=(p.lng-_haState.clng)*m.mlng, north=(p.lat-_haState.clat)*m.mlat;
    _haState.ang=Math.atan2(-east, north); haUpdate(); });
  _haHandles=[mv,rot];
  if(b)b.classList.add('on');
}
function addHaControl(){
  if(!_map || _map.__haCtl) return; _map.__haCtl=true;
  haCss();
  var C=LF.control({position:'bottomleft'});
  C.onAdd=function(){ var d=LF.DomUtil.create('div','ha-ctl'); d.innerHTML='<button id="haRefBtn" title="Mostrar um quadrado de 1 hectare (100\u00d7100 m) no centro do mapa">1 ha</button>'; LF.DomEvent.disableClickPropagation(d); d.querySelector('button').onclick=toggleHaRef; return d; };
  C.addTo(_map);
}
/* ---- Medição de área: desenho manual ou contorno andando com GPS ---- */
var _measure={open:false,mode:null,pts:[],layer:null,shapeLayer:null,handleLayer:null,gpsWatch:null,lastGps:null,lastTouchTs:0,touchBound:false,panelHot:false,touchStart:null,touchMoved:false,draggingPoint:false};
function measureCss(){ if(document.getElementById('measureCss'))return; var s=document.createElement('style'); s.id='measureCss';
  s.textContent='.measure-panel{position:fixed;left:12px;bottom:80px;z-index:1250;width:300px;max-width:calc(100vw - 24px);background:rgba(15,21,18,.97);border:1px solid var(--border,#26322b);border-radius:14px;box-shadow:0 18px 54px rgba(0,0,0,.52);padding:12px;color:var(--text,#e8efe9);font-family:var(--font,system-ui);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}'+
  '.measure-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.measure-title{font-size:12px;font-weight:900;letter-spacing:1px;color:var(--accent,#37d684);text-transform:uppercase}.measure-x{background:none;border:none;color:var(--text-3,#7c8a80);font-size:20px;line-height:1;cursor:pointer;padding:0 4px}'+
  '.measure-read{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px}.measure-kpi{background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);border-radius:10px;padding:8px;min-width:0}.measure-kpi b{display:block;font-size:18px;line-height:1.05;color:var(--text,#e8efe9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.measure-kpi span{display:block;font-size:9px;color:var(--text-3,#7c8a80);text-transform:uppercase;letter-spacing:.4px;margin-top:3px}.measure-kpi.main{grid-column:1/3}.measure-kpi.main b{font-size:27px;color:var(--accent,#37d684)}'+
  '.measure-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.measure-actions button{border:1px solid var(--border,#26322b);background:var(--surface-2,#0c1210);color:var(--text-2,#9fb1a5);border-radius:9px;padding:9px 8px;font-weight:800;font-size:12px;cursor:pointer}.measure-actions button.on{background:var(--accent-deep,#103225);border-color:var(--accent-d,#1f8a52);color:var(--accent,#37d684)}.measure-actions button.danger{color:#ff9a8a;border-color:#5a2a2a;background:#2a1616}'+
  '.measure-note{font-size:11px;color:var(--text-3,#7c8a80);line-height:1.35;margin-top:8px}.measure-handle{cursor:grab}.measure-dot{width:18px;height:18px;border-radius:50%;background:#37d684;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.55);cursor:grab;touch-action:none;box-sizing:border-box}.measure-dot:after{content:"";display:block;width:6px;height:6px;margin:3px auto 0;border-radius:50%;background:rgba(15,21,18,.52)}.measure-handle.leaflet-drag-target .measure-dot,.measure-dot:active{background:#ffd166;transform:scale(1.12)}'+
  '.measure-panel.drawing{width:268px;padding:9px;bottom:72px}.measure-panel.drawing .measure-head{margin-bottom:6px}.measure-panel.drawing .measure-read{grid-template-columns:1.28fr .88fr .55fr;gap:5px;margin-bottom:7px}.measure-panel.drawing .measure-kpi{padding:6px;border-radius:8px}.measure-panel.drawing .measure-kpi.main{grid-column:auto}.measure-panel.drawing .measure-kpi b{font-size:14px}.measure-panel.drawing .measure-kpi.main b{font-size:18px}.measure-panel.drawing .measure-actions{gap:6px}.measure-panel.drawing .measure-actions button{padding:8px 6px;font-size:11px}.measure-panel.drawing .measure-note{margin-top:6px;font-size:10px}'+
  '.leaflet-container.measure-drawing-map{cursor:crosshair;touch-action:none}';
  document.head.appendChild(s); }
function measureEnsureLayer(){ if(!_map) initMap(); if(!_measure.layer) _measure.layer=LF.layerGroup().addTo(_map); return _measure.layer; }
function measureEnsureSubLayers(){
  var root=measureEnsureLayer();
  if(!_measure.shapeLayer){ _measure.shapeLayer=LF.layerGroup(); root.addLayer(_measure.shapeLayer); }
  if(!_measure.handleLayer){ _measure.handleLayer=LF.layerGroup(); root.addLayer(_measure.handleLayer); }
  return {shape:_measure.shapeLayer,handles:_measure.handleLayer};
}
function toggleMeasure(){ if(_measure.open) closeMeasure(); else openMeasure(); }
function openMeasure(){
  if(!_map) initMap();
  if(typeof scoutingModeActive!=='undefined'&&scoutingModeActive) toggleScoutingMode(false);
  measureCss(); measureEnsureLayer(); _measure.open=true;
  if(!document.getElementById('measurePanel')){ var p=document.createElement('div'); p.id='measurePanel'; p.className='measure-panel'; document.body.appendChild(p); }
  measureDraw();
}
function closeMeasure(){
  measureStopDraw(); measureStopGps(); _measure.open=false;
  var p=document.getElementById('measurePanel'); if(p)p.remove();
  render();
  if(_measure.pts.length) measureDraw();
}
function measureRenderPanel(){
  if(!_measure.open)return;
  var p=document.getElementById('measurePanel'); if(!p)return;
  var pts=_measure.pts, st=measureStats(pts), gpsOn=!!_measure.gpsWatch, drawing=_measure.mode==='draw', shownPts=pts.length;
  p.className='measure-panel'+(drawing?' drawing':'');
  var readHtml=drawing
    ? '<div class="measure-kpi main"><b>'+esc(fmtHa(st.area))+'</b><span>área</span></div>'+
      '<div class="measure-kpi"><b>'+esc(fmtDist(st.perim))+'</b><span>perímetro</span></div>'+
      '<div class="measure-kpi"><b>'+shownPts+'</b><span>pontos</span></div>'
    : '<div class="measure-kpi main"><b>'+esc(fmtHa(st.area))+'</b><span>área</span></div>'+
      '<div class="measure-kpi"><b>'+esc(fmtM2(st.area))+'</b><span>m²</span></div>'+
      '<div class="measure-kpi"><b>'+esc(fmtDist(st.perim))+'</b><span>perímetro</span></div>'+
      '<div class="measure-kpi"><b>'+shownPts+'</b><span>pontos</span></div>'+
      '<div class="measure-kpi"><b>'+esc(gpsOn?'gps':'pausado')+'</b><span>modo</span></div>';
  var actions=drawing
    ? '<button class="on" onclick="measureSetMode(null)">Concluir</button>'+
      '<button onclick="measureUndo()">Desfazer</button>'+
      '<button class="'+(_haRef?'on':'')+'" onclick="measureToggleHaRef()">1 ha</button>'+
      '<button class="danger" onclick="measureClear()">Limpar</button>'
    : '<button onclick="measureSetMode(\'draw\')">Desenhar</button>'+
      '<button class="'+(gpsOn?'on':'')+'" onclick="measureGpsToggle()">GPS</button>'+
      '<button class="'+(_haRef?'on':'')+'" onclick="measureToggleHaRef()">1 ha</button>'+
      '<button onclick="measureUndo()">Desfazer</button>'+
      '<button class="danger" onclick="measureClear()">Limpar</button>';
  p.innerHTML='<div class="measure-head"><div class="measure-title">'+(drawing?'Desenho ativo':'Medição')+'</div><button class="measure-x" onclick="closeMeasure()">×</button></div>'+
    '<div class="measure-read">'+readHtml+'</div>'+
    '<div class="measure-actions">'+actions+'</div>'+
    '<div class="measure-note">'+esc(measureNote())+'</div>';
  measureBindPanelGuard(p);
}
function measureNote(){
  if(_measure.gpsWatch) return 'GPS registrando o contorno'+(_measure.lastGps&&_measure.lastGps.accuracy!=null?' · ±'+Math.round(_measure.lastGps.accuracy)+'m'+(_measure.lastGps.accuracy>25?' (impreciso — aguardando melhor sinal)':''):'')+'.';
  if(_measure.mode==='draw') return 'Toque no mapa para adicionar pontos. Arraste as bolinhas para ajustar o contorno.';
  if(_haRef) return 'Referência de 1 ha ligada; arraste o centro ou gire pelo pegador.';
  return 'Escolha Desenhar ou GPS.';
}
function measureToggleHaRef(){
  openMeasure();
  toggleHaRef();
  measureRenderPanel();
}
function measureBindPanelGuard(p){
  if(!p)return;
  p.onmouseenter=function(){ _measure.panelHot=true; };
  p.onmouseleave=function(){ _measure.panelHot=false; };
  p.onmousemove=function(ev){ if(ev)ev.stopPropagation(); };
  p.onclick=function(ev){ if(ev)ev.stopPropagation(); };
  p.ontouchstart=function(ev){ _measure.panelHot=true; if(ev)ev.stopPropagation(); };
  p.ontouchmove=function(ev){ if(ev)ev.stopPropagation(); };
  p.ontouchend=function(ev){ _measure.panelHot=false; if(ev)ev.stopPropagation(); };
  p.ontouchcancel=function(ev){ _measure.panelHot=false; if(ev)ev.stopPropagation(); };
}
function measureClampPoint(cp){
  var c=_map&&_map.getContainer?_map.getContainer():null; if(!c)return cp;
  return LF.point(Math.max(8, Math.min(c.clientWidth-8, cp.x)), Math.max(8, Math.min(c.clientHeight-8, cp.y)));
}
function measureTouchContainerPoint(ev){
  if(!_map)return null;
  var c=_map.getContainer(), r=c.getBoundingClientRect();
  var t=(ev.touches&&ev.touches[0])||(ev.changedTouches&&ev.changedTouches[0]);
  if(!t)return null;
  return measureClampPoint(LF.point(t.clientX-r.left, t.clientY-r.top));
}
function measureBindTouchDraw(on){
  if(!_map)return;
  var c=_map.getContainer();
  if(on){
    c.classList.add('measure-drawing-map');
    if(_measure.touchBound)return;
    c.addEventListener('touchstart',measureOnTouchStart,{passive:false});
    c.addEventListener('touchmove',measureOnTouchMove,{passive:false});
    c.addEventListener('touchend',measureOnTouchEnd,{passive:false});
    c.addEventListener('touchcancel',measureOnTouchCancel,{passive:false});
    _measure.touchBound=true;
    return;
  }
  c.classList.remove('measure-drawing-map');
  if(!_measure.touchBound)return;
  c.removeEventListener('touchstart',measureOnTouchStart);
  c.removeEventListener('touchmove',measureOnTouchMove);
  c.removeEventListener('touchend',measureOnTouchEnd);
  c.removeEventListener('touchcancel',measureOnTouchCancel);
  _measure.touchBound=false;
}
function measureTouchOnHandle(ev){
  var t=ev&&ev.target;
  return !!(t&&t.closest&&t.closest('.measure-handle'));
}
function measureSetMode(mode){
  openMeasure();
  measureStopDraw();
  if(mode==='draw'){
    _measure.mode='draw';
    if(_map){
      _map.getContainer().style.cursor='crosshair';
      _map.on('click', measureOnClick);
      measureBindTouchDraw(true);
      try{ _map.doubleClickZoom.disable(); }catch(e){}
    }
  }else _measure.mode=null;
  render();
  measureRenderPanel();
}
function measureStopDraw(){
  if(_map){
    _map.off('click', measureOnClick);
    _map.getContainer().style.cursor='';
    measureBindTouchDraw(false);
    try{ _map.doubleClickZoom.enable(); }catch(e){}
  }
  _measure.mode=null;
  _measure.touchStart=null; _measure.touchMoved=false; _measure.panelHot=false; _measure.draggingPoint=false;
}
function measureOnClick(e){
  if(_measure.mode!=='draw')return;
  if(_measure.draggingPoint)return;
  if(Date.now()-(_measure.lastTouchTs||0)<500)return;
  if(e&&e.originalEvent&&measureTouchOnHandle(e.originalEvent))return;
  _measure.pts.push([e.latlng.lat,e.latlng.lng]);
  measureDraw();
}
function measureOnTouchStart(ev){
  if(_measure.mode!=='draw'||_measure.panelHot||measureTouchOnHandle(ev))return;
  var t=(ev.touches&&ev.touches[0])||(ev.changedTouches&&ev.changedTouches[0]);
  if(t&&measureClientInPanel(t.clientX,t.clientY)){
    _measure.panelHot=true;
    return;
  }
  var cp=measureTouchContainerPoint(ev); if(!cp)return;
  if(ev.cancelable)ev.preventDefault();
  _measure.touchStart={x:cp.x,y:cp.y};
  _measure.touchMoved=false;
}
function measureOnTouchMove(ev){
  if(_measure.mode!=='draw'||_measure.panelHot||measureTouchOnHandle(ev))return;
  var t=(ev.touches&&ev.touches[0])||(ev.changedTouches&&ev.changedTouches[0]);
  if(t&&measureClientInPanel(t.clientX,t.clientY)){
    if(ev.cancelable)ev.preventDefault();
    _measure.panelHot=true;
    return;
  }
  var cp=measureTouchContainerPoint(ev); if(!cp)return;
  if(ev.cancelable)ev.preventDefault();
  if(_measure.touchStart){
    var dx=cp.x-_measure.touchStart.x, dy=cp.y-_measure.touchStart.y;
    if(Math.sqrt(dx*dx+dy*dy)>10) _measure.touchMoved=true;
  }
}
function measureOnTouchEnd(ev){
  if(_measure.mode!=='draw')return;
  if(measureTouchOnHandle(ev)){ _measure.touchStart=null; return; }
  if(ev.cancelable)ev.preventDefault();
  if(_measure.touchStart&&!_measure.touchMoved){
    var cp=measureTouchContainerPoint(ev); if(!cp) cp=LF.point(_measure.touchStart.x,_measure.touchStart.y);
    var ll=_map.containerPointToLatLng(cp);
    _measure.pts.push([ll.lat,ll.lng]);
    _measure.lastTouchTs=Date.now();
    measureDraw();
  }
  _measure.touchStart=null;
  _measure.touchMoved=false;
}
function measureOnTouchCancel(ev){
  if(ev&&ev.cancelable)ev.preventDefault();
  _measure.touchStart=null;
  _measure.touchMoved=false;
}
function measureClientInPanel(x,y,margin){
  var p=document.getElementById('measurePanel'); if(!p)return false;
  var r=p.getBoundingClientRect(), m=margin||0;
  return x>=r.left-m&&x<=r.right+m&&y>=r.top-m&&y<=r.bottom+m;
}
function measureGpsToggle(){
  openMeasure();
  if(_measure.gpsWatch){ measureStopGps(); measureRenderPanel(); return; }
  if(!navigator.geolocation){ alert('GPS não disponível neste navegador.'); return; }
  measureStopDraw(); _measure.mode=null; _measure.lastGps=null;
  _measure.gpsWatch=navigator.geolocation.watchPosition(function(pos){
    _measure.lastGps=pos.coords;
    var a=(pos.coords.accuracy==null?9999:pos.coords.accuracy);
    if(a>25){ measureRenderPanel(); return; } /* leitura imprecisa (±>25m): não cria ponto */
    var ll=[pos.coords.latitude,pos.coords.longitude], last=_measure.pts[_measure.pts.length-1];
    if(!last || measureDistance(last,ll)>=2){
      _measure.pts.push(ll); measureDraw();
      if(_measure.pts.length===1) try{ _map.setView(ll, Math.max(_map.getZoom()||16,17)); }catch(e){}
    }
  }, function(err){ alert('Não consegui acompanhar o GPS.\n('+err.message+')'); measureStopGps(); measureRenderPanel(); },
  {enableHighAccuracy:true, timeout:15000, maximumAge:0});
  measureRenderPanel();
}
function measureStopGps(){
  if(_measure.gpsWatch){ try{ navigator.geolocation.clearWatch(_measure.gpsWatch); }catch(e){} _measure.gpsWatch=null; }
}
function measureUndo(){ if(_measure.pts.length)_measure.pts.pop(); measureDraw(); }
function measureClear(){ _measure.pts=[]; _measure.touchStart=null; _measure.touchMoved=false; _measure.lastGps=null; if(_measure.shapeLayer)_measure.shapeLayer.clearLayers(); if(_measure.handleLayer)_measure.handleLayer.clearLayers(); measureRenderPanel(); }
function measureDrawShape(){
  var layers=measureEnsureSubLayers(), ll=_measure.pts.map(function(p){return [p[0],p[1]];});
  layers.shape.clearLayers();
  if(ll.length>1) LF.polyline(ll,{color:'#37d684',weight:3,opacity:.95}).addTo(layers.shape);
  if(ll.length>2) LF.polygon(ll,{color:'#37d684',weight:2,fillColor:'#37d684',fillOpacity:.18}).addTo(layers.shape);
}
function measureDraw(){
  var layers=measureEnsureSubLayers();
  layers.handles.clearLayers();
  measureDrawShape();
  _measure.pts.forEach(function(p,i){
    var m=LF.marker(p,{draggable:!!_measure.open,zIndexOffset:1300,icon:LF.divIcon({className:'measure-handle',html:'<div class="measure-dot"></div>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(layers.handles);
    m.on('dragstart',function(){ _measure.draggingPoint=true; });
    m.on('drag',function(){ var ll=m.getLatLng(); _measure.pts[i]=[ll.lat,ll.lng]; measureDrawShape(); measureRenderPanel(); });
    m.on('dragend',function(){ _measure.draggingPoint=false; measureDraw(); });
    m.on('click',function(ev){ if(ev&&ev.originalEvent) LF.DomEvent.stopPropagation(ev.originalEvent); });
  });
  measureRenderPanel();
}
function measureDistance(a,b){
  var R=6371000, la1=a[0]*Math.PI/180, la2=b[0]*Math.PI/180, dlat=la2-la1, dlng=(b[1]-a[1])*Math.PI/180;
  var h=Math.sin(dlat/2)*Math.sin(dlat/2)+Math.cos(la1)*Math.cos(la2)*Math.sin(dlng/2)*Math.sin(dlng/2);
  return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function measureStats(pts){
  pts=pts||[]; var per=0, area=0, i;
  for(i=1;i<pts.length;i++) per+=measureDistance(pts[i-1],pts[i]);
  if(pts.length>2) per+=measureDistance(pts[pts.length-1],pts[0]);
  if(pts.length>2){
    var lat0=pts.reduce(function(s,p){return s+p[0];},0)/pts.length, m=grMeters(lat0), xy=pts.map(function(p){return {x:p[1]*m.mlng,y:p[0]*m.mlat};}), sum=0;
    for(i=0;i<xy.length;i++){ var j=(i+1)%xy.length; sum+=xy[i].x*xy[j].y-xy[j].x*xy[i].y; }
    area=Math.abs(sum/2);
  }
  return {area:area,perim:per};
}
function fmtHa(m2){ return (m2/10000).toLocaleString('pt-BR',{maximumFractionDigits:m2<10000?4:2})+' ha'; }
function fmtM2(m2){ return Math.round(m2).toLocaleString('pt-BR'); }
function fmtDist(m){ return m>=1000?(m/1000).toLocaleString('pt-BR',{maximumFractionDigits:2})+' km':Math.round(m).toLocaleString('pt-BR')+' m'; }
/* ---- Controle de rota\u00e7\u00e3o do mapa (gira mantendo as quadras corretas) ---- */
function addRotateControl(){
  if(!_map || _map.__rotCtl || typeof _map.setBearing!=='function') return; _map.__rotCtl=true;
  if(!document.getElementById('rotCtlCss')){ var s=document.createElement('style'); s.id='rotCtlCss';
    s.textContent='.rot-ctl{display:flex;flex-direction:column;gap:5px}.rot-ctl button{width:36px;height:36px;border:1px solid var(--border,#26322b);border-radius:10px;background:rgba(15,21,18,.92);color:#cfe0d4;font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);line-height:1}.rot-ctl button:hover{background:rgba(28,38,32,.96);color:var(--accent,#37d684)}.rot-ctl .rot-n{font-size:12px;letter-spacing:.5px}';
    document.head.appendChild(s); }
  var C=LF.control({position:'topleft'});
  C.onAdd=function(){
    var d=LF.DomUtil.create('div','rot-ctl');
    d.innerHTML='<button class="rot-l" title="Girar \u00e0 esquerda">\u27f2</button><button class="rot-n" title="Apontar para o Norte (0\u00b0)">N</button><button class="rot-r" title="Girar \u00e0 direita">\u27f3</button>';
    LF.DomEvent.disableClickPropagation(d); LF.DomEvent.disableScrollPropagation(d);
    d.querySelector('.rot-l').onclick=function(){ _map.setBearing((_map.getBearing()||0)+1); };
    d.querySelector('.rot-n').onclick=function(){ _map.setBearing(0); };
    d.querySelector('.rot-r').onclick=function(){ _map.setBearing((_map.getBearing()||0)-1); };
    return d;
  };
  C.addTo(_map);
}
/* ---- Agrupador: zoom/camadas/girar somem atr\u00e1s de UM bot\u00e3o (mapa limpo) ---- */
function addMapCtlToggle(){
  if(!_map || _map.__ctlToggle) return; _map.__ctlToggle=true;
  if(!document.getElementById('mapCtlCss')){ var s=document.createElement('style'); s.id='mapCtlCss';
    s.textContent='.leaflet-top.leaflet-left .leaflet-control{display:none}.leaflet-top.leaflet-left .leaflet-control.mapctl-toggle{display:block}body.mapctl-open .leaflet-top.leaflet-left .leaflet-control{display:block}body.mapctl-open .leaflet-top.leaflet-left .rot-ctl{display:flex}';
    document.head.appendChild(s); }
  var C=LF.control({position:'topleft'});
  C.onAdd=function(){
    var d=LF.DomUtil.create('div','rot-ctl mapctl-toggle');
    d.innerHTML='<button id="mapCtlBtn" title="Controles do mapa (zoom, camadas, girar)" aria-expanded="false" aria-label="Controles do mapa">\u2699\ufe0e</button>';
    LF.DomEvent.disableClickPropagation(d); LF.DomEvent.disableScrollPropagation(d);
    d.querySelector('button').onclick=function(){
      var open=!document.body.classList.contains('mapctl-open');
      document.body.classList.toggle('mapctl-open', open);
      this.textContent=open?'\u2715':'\u2699\ufe0e';
      this.setAttribute('aria-expanded', open?'true':'false');
    };
    return d;
  };
  C.addTo(_map);
  /* o agrupador fica no TOPO da pilha da esquerda */
  try{ var corner=_map._controlCorners['topleft'], el=C.getContainer(); corner.insertBefore(el, corner.firstChild); }catch(e){}
}
/* ---- Bot\u00e3o \u2630 Menu no canto superior direito do mapa ---- */
function addMenuControl(){
  if(!_map || _map.__menuCtl) return; _map.__menuCtl=true;
  var C=LF.control({position:'topright'});
  C.onAdd=function(){
    var d=LF.DomUtil.create('div','rot-ctl menu-ctl');
    d.innerHTML='<button id="menuBtn" title="Menu \u2014 ferramentas e instalar o app">\u2630</button>';
    LF.DomEvent.disableClickPropagation(d); LF.DomEvent.disableScrollPropagation(d);
    d.querySelector('button').onclick=toggleMainMenu;
    return d;
  };
  C.addTo(_map);
}

/* ---- Modo de alinhamento (encaixe da imagem no sat\u00e9lite) ---- */
/* Alinhamento: retangulo controlado (mover / girar / largura / altura) — nunca entorta */
var _gr=null;
function grMeters(lat){ return { mlat:110540, mlng:111320*Math.cos(lat*Math.PI/180) }; }
function grComputeCorners(){ /* retorna {tl,tr,bl} em [lat,lng]; hw,hh em metros */
  var g=_gr, ca=Math.cos(g.ang), sa=Math.sin(g.ang), m=grMeters(g.clat);
  function pt(sx,sy){ var east=sx*g.hw*ca+sy*g.hh*(-sa), north=sx*g.hw*sa+sy*g.hh*(ca);
    return [ g.clat+north/m.mlat, g.clng+east/m.mlng ]; }
  return { tl:pt(-1,1), tr:pt(1,1), bl:pt(-1,-1) };
}
function grFromCorners4(c){ /* c=[NO,NE,SE,SO] -> _gr */
  var tl=c[0],tr=c[1],bl=c[3], clat=(tr[0]+bl[0])/2, clng=(tr[1]+bl[1])/2, m=grMeters(clat);
  var wE=(tr[1]-tl[1])*m.mlng, wN=(tr[0]-tl[0])*m.mlat, hE=(bl[1]-tl[1])*m.mlng, hN=(bl[0]-tl[0])*m.mlat;
  return { clat:clat, clng:clng, hw:Math.hypot(wE,wN)/2, hh:Math.hypot(hE,hN)/2, ang:Math.atan2(wN,wE) };
}
function grUpdateOverlay(){ if(!_grOverlay||!_gr) return; var c=grComputeCorners();
  _grOverlay.reposition(LF.latLng(c.tl), LF.latLng(c.tr), LF.latLng(c.bl)); }
function cancelGeorefLayers(){
  if(_grOverlay){ try{_map.removeLayer(_grOverlay);}catch(e){} _grOverlay=null; }
  if(_grHandles){ if(_grHandles.mv) _map.removeLayer(_grHandles.mv); _grHandles=null; }
}
function startGeoref(){
  if(!_map) initMap();
  _grOn=true; cancelGeorefLayers();
  if(_geo && _geo.corners){ _gr=grFromCorners4(_geo.corners); }
  else { var c=_map.getCenter(); _gr={clat:c.lat, clng:c.lng, hw:320, hh:220, ang:0}; }
  var img=document.querySelector('#mapInner img'), src=img?img.src:'';
  var c0=grComputeCorners();
  _grOverlay=LF.imageOverlay.rotated(src, LF.latLng(c0.tl), LF.latLng(c0.tr), LF.latLng(c0.bl), {opacity:0.55, interactive:false}).addTo(_map);
  _grOverlay.bringToFront();
  _grHandles={};
  _grHandles.mv=LF.marker([_gr.clat,_gr.clng],{draggable:true, zIndexOffset:1000,
    icon:LF.divIcon({className:'gr-handle',html:'<div class="gr-h gr-move">&#10010;</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(_map);
  _grHandles.mv.on('drag',function(){ var p=_grHandles.mv.getLatLng(); _gr.clat=p.lat; _gr.clng=p.lng; grUpdateOverlay(); });
  _map.setView([_gr.clat,_gr.clng], Math.max(_map.getZoom(),16));
  buildGrPanel();
}
function setGrRot(v){ if(_gr){ _gr.ang=parseFloat(v)*Math.PI/180; grUpdateOverlay(); } }
function setGrW(v){ if(_gr){ _gr.hw=parseFloat(v); grUpdateOverlay(); } }
function setGrH(v){ if(_gr){ _gr.hh=parseFloat(v); grUpdateOverlay(); } }
function setGrOpacity(v){ if(_grOverlay){ try{_grOverlay.setOpacity(parseFloat(v));}catch(e){} } }
function grReset(){ var c=_map.getCenter(); _gr={clat:c.lat, clng:c.lng, hw:320, hh:220, ang:0};
  if(_grHandles && _grHandles.mv) _grHandles.mv.setLatLng([_gr.clat,_gr.clng]); grUpdateOverlay(); buildGrPanel(); }
function lockGeoref(){
  if(!_gr) return;
  var c=grComputeCorners(), tl=c.tl, tr=c.tr, bl=c.bl, br=[tr[0]+bl[0]-tl[0], tr[1]+bl[1]-tl[1]];
  var corners=[tl,tr,br,bl]; /* NO,NE,SE,SO */
  _geo={ corners:corners, H:buildH(corners) };
  _touchGeoref();
  saveGeoref(_geo);
  if(QGEO){ if(confirm('Regenerar as quadras a partir da imagem alinhada?\nIsso descarta ajustes manuais de vértices que você tenha feito.')){ QGEO=null; localStorage.removeItem(QGEO_KEY); window._grRegen=true; } }
  ensureQGEO();
  if(window._grRegen && QGEO){ window._grRegen=false; var _now=Date.now(); QGEO_TS={}; Object.keys(QGEO).forEach(function(_id){ QGEO_TS[_id]=_now; }); saveQGEOTS(); } /* regenerou todas: carimba todas agora */
  cancelGeoref();
  render();
  _map.fitBounds(geoBounds(_geo));
}
function cancelGeoref(){ _grOn=false; cancelGeorefLayers(); hideGrPanel(); }
function buildGrPanel(){
  var p=document.getElementById('grPanel');
  if(!p){ p=document.createElement('div'); p.id='grPanel'; p.className='gr-panel'; document.body.appendChild(p); }
  var rot=_gr?(_gr.ang*180/Math.PI).toFixed(1):0, w=_gr?Math.round(_gr.hw):320, h=_gr?Math.round(_gr.hh):220;
  p.innerHTML=
    '<div class="gr-title">&#128205; ALINHAR MAPA</div>'+
    '<div class="gr-hint">Arraste o <b>+</b> azul para <b>mover</b>. Use os controles para <b>girar</b> e ajustar <b>largura/altura</b> at&eacute; encaixar nos talh&otilde;es. A imagem nunca entorta &mdash; se bagun&ccedil;ar, clique <b>Resetar</b>.</div>'+
    '<label class="gr-ctl"><span>Girar</span><input type="range" min="-180" max="180" step="0.5" value="'+rot+'" oninput="setGrRot(this.value)"></label>'+
    '<label class="gr-ctl"><span>Largura</span><input type="range" min="50" max="1500" step="5" value="'+w+'" oninput="setGrW(this.value)"></label>'+
    '<label class="gr-ctl"><span>Altura</span><input type="range" min="50" max="1500" step="5" value="'+h+'" oninput="setGrH(this.value)"></label>'+
    '<label class="gr-ctl"><span>Opacidade</span><input type="range" min="0.15" max="1" step="0.05" value="0.55" oninput="setGrOpacity(this.value)"></label>'+
    '<div class="gr-btns"><button class="gr-ok" onclick="lockGeoref()">Travar e gerar quadras</button><button class="gr-reset" onclick="grReset()">Resetar</button><button class="gr-cancel" onclick="cancelGeoref()">Cancelar</button></div>';
  p.style.display='block';
}
function showGrPanel(){
  var p=document.getElementById('grPanel');
  if(!p){
    p=document.createElement('div'); p.id='grPanel'; p.className='gr-panel';
    p.innerHTML='<div class="gr-title">\ud83d\udccd ALINHAR MAPA</div>'+
      '<div class="gr-hint">Posicione o mapa sobre a fazenda (Plantec, SP-147). Arraste <b>NO</b>, <b>NE</b> e <b>SO</b> para girar e dimensionar, e o <b>&#10010;</b> central para mover tudo, at\u00e9 encaixar no sat\u00e9lite. Use a opacidade para conferir.</div>'+
      '<label class="gr-op">Opacidade <input type="range" min="0.15" max="1" step="0.05" value="0.6" oninput="setGrOpacity(this.value)"></label>'+
      '<div class="gr-btns"><button class="gr-ok" onclick="lockGeoref()">Travar e gerar quadras</button><button class="gr-cancel" onclick="cancelGeoref()">Cancelar</button></div>';
    document.body.appendChild(p);
  }
  p.style.display='block';
}
function hideGrPanel(){ var p=document.getElementById('grPanel'); if(p)p.style.display='none'; }

/* ===== Geometria das quadras em lat/lng (editavel) + EDITOR ===== */
var QGEO_KEY="iracema-qgeo-v1", QGEO=null;
function loadQGEO(){ try{ var s=localStorage.getItem(QGEO_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function saveQGEO(){ try{ localStorage.setItem(QGEO_KEY, JSON.stringify(QGEO)); }catch(e){} if(typeof cloudSaveSoon==='function') cloudSaveSoon(); try{ if(typeof dbUpsertQuadra==='function' && typeof editId!=='undefined' && editId) dbUpsertQuadra(editId); }catch(e){} /* Etapa 3: geometria da quadra em edição */ }
/* CARIMBO DE TEMPO por quadra (e do georef): no merge, "vale o mais recente". Carimba SÓ em edição real
   (desenhar / mover vértice / alinhar) — NUNCA ao carregar o padrão nem ao aplicar a nuvem — pra um aparelho
   zerado nunca "ganhar". Empate (ex.: dados antigos sem carimbo) => a NUVEM vence (não perde o mapa que já existe). */
var QGEO_TS_KEY="iracema-qgeots-v1", QGEO_TS=null, GEOREF_TS_KEY="iracema-georefts-v1", GEOREF_TS=null;
function loadQGEOTS(){ try{ var s=localStorage.getItem(QGEO_TS_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function saveQGEOTS(){ try{ localStorage.setItem(QGEO_TS_KEY, JSON.stringify(QGEO_TS||{})); }catch(e){} }
function _touchQGEO(qid){ if(!qid) return; if(!QGEO_TS||typeof QGEO_TS!=='object') QGEO_TS={}; QGEO_TS[qid]=Date.now(); saveQGEOTS(); }
function loadGeorefTS(){ try{ var n=parseInt(localStorage.getItem(GEOREF_TS_KEY),10); return isNaN(n)?0:n; }catch(e){ return 0; } }
function saveGeorefTS(){ try{ localStorage.setItem(GEOREF_TS_KEY, String(GEOREF_TS||0)); }catch(e){} }
function _touchGeoref(){ GEOREF_TS=Date.now(); saveGeorefTS(); }
function _mergeQGEO(lq,cq,lts,cts,del){
  lq=lq||{};cq=cq||{};lts=lts||{};cts=cts||{};del=del||{};
  var ids={},k; for(k in lq)ids[k]=1; for(k in cq)ids[k]=1;
  var g={},t={};
  Object.keys(ids).forEach(function(id){
    var hasL=(id in lq), hasC=(id in cq), lt=lts[id]||0, ct=cts[id]||0;
    if(del[id] && Math.max(lt,ct) <= del[id]) return; /* lápide só apaga o que existia ANTES da exclusão; quadra recriada DEPOIS sobrevive */
    var useLocal = (hasL&&hasC) ? (lt>ct) : hasL; /* ambos têm: ESTRITAMENTE mais novo vence; empate => nuvem */
    g[id] = useLocal ? lq[id] : cq[id];
    t[id] = Math.max(lt,ct);
  });
  return {geo:g, ts:t};
}
/* Merge genérico de mapa {id:valor} com carimbos {id:ts}: a edição mais NOVA vence por id;
   empate/sem carimbo => nuvem (aparelho parado não atropela renomeações/movimentações dos outros). */
function _mergeMapTS(lm,cm,lts,cts){
  lm=lm||{};cm=cm||{};lts=lts||{};cts=cts||{};
  var ids={},k; for(k in lm)ids[k]=1; for(k in cm)ids[k]=1;
  var m={},t={};
  Object.keys(ids).forEach(function(id){
    var hasL=(id in lm), hasC=(id in cm), lt=lts[id]||0, ct=cts[id]||0;
    var useLocal=(hasL&&hasC)?(lt>ct):hasL;
    m[id]=useLocal?lm[id]:cm[id];
    var mx=Math.max(lt,ct); if(mx)t[id]=mx;
  });
  return {map:m, ts:t};
}
function buildQGEOfromP(){ QGEO={}; Object.keys(P).forEach(function(id){ QGEO[id]=P[id].map(function(v){ return pxToLL(v[0],v[1]); }); }); }
function ensureQGEO(){
  if(QGEO_TS==null) QGEO_TS=loadQGEOTS()||{};
  if(GEOREF_TS==null) GEOREF_TS=loadGeorefTS();
  if(!QGEO){
    var q=loadQGEO();
    if(q) QGEO=q;
    else if(window.DEFAULT_QGEO){ QGEO=JSON.parse(JSON.stringify(window.DEFAULT_QGEO)); saveQGEO(); }
    else if(_geo){ buildQGEOfromP(); saveQGEO(); }
  }
  if(QGEO){ Object.keys(QGEO).forEach(function(id){ if(!data[id]) data[id]={cultura:'',cultivar:'',plantio:'',area:null,estudos:[]}; }); }
  return !!QGEO;
}

/* ===== LOCAIS — múltiplos locais georreferenciados (mundo todo) ===== */
var LOCAIS_KEY="iracema-locais-v1", QLOCAL_KEY="iracema-qlocal-v1", LOCAL_ATIVO_KEY="iracema-local-ativo", QNOME_KEY="iracema-qnome-v1";
var HOME_LOCAL="iracemapolis";
var LOCAIS=null, QLOCAL=null, localAtivo=null, _locPick=null, QNOME=null;
/* Carimbos de config (renomear/mover quadra, renomear local): a edição mais nova vence no merge */
var QNOMETS_KEY="iracema-qnomets-v1", QLOCALTS_KEY="iracema-qlocalts-v1", LOCAISTS_KEY="iracema-locaists-v1";
var QNOME_TS=null, QLOCAL_TS=null, LOCAIS_TS=null;
function ensureCfgTS(){
  function ld(k){ try{ var s=localStorage.getItem(k); return s?(JSON.parse(s)||{}):{};}catch(e){ return {}; } }
  if(!QNOME_TS||typeof QNOME_TS!=='object') QNOME_TS=ld(QNOMETS_KEY);
  if(!QLOCAL_TS||typeof QLOCAL_TS!=='object') QLOCAL_TS=ld(QLOCALTS_KEY);
  if(!LOCAIS_TS||typeof LOCAIS_TS!=='object') LOCAIS_TS=ld(LOCAISTS_KEY);
}
function saveCfgTS(){ try{ localStorage.setItem(QNOMETS_KEY,JSON.stringify(QNOME_TS||{})); localStorage.setItem(QLOCALTS_KEY,JSON.stringify(QLOCAL_TS||{})); localStorage.setItem(LOCAISTS_KEY,JSON.stringify(LOCAIS_TS||{})); }catch(e){} }
function _touchQNome(id){ ensureCfgTS(); QNOME_TS[id]=Date.now(); saveCfgTS(); }
function _touchQLocal(id){ ensureCfgTS(); QLOCAL_TS[id]=Date.now(); saveCfgTS(); }
function _touchLocal(id){ ensureCfgTS(); LOCAIS_TS[id]=Date.now(); saveCfgTS(); }
function loadLocais(){ try{ var s=localStorage.getItem(LOCAIS_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function saveLocais(){ try{ localStorage.setItem(LOCAIS_KEY, JSON.stringify(LOCAIS)); }catch(e){} if(typeof cloudSaveSoon==='function') cloudSaveSoon(); if(typeof dbUpsertLocaisAll==='function') dbUpsertLocaisAll(); /* Etapa 3 */ }
function loadQLocal(){ try{ var s=localStorage.getItem(QLOCAL_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function saveQLocal(){ try{ localStorage.setItem(QLOCAL_KEY, JSON.stringify(QLOCAL)); }catch(e){} if(typeof cloudSaveSoon==='function') cloudSaveSoon(); }
/* Nome de exibição da quadra (permite mesmo nome em locais diferentes; o id interno é único) */
function loadQNome(){ try{ var s=localStorage.getItem(QNOME_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function saveQNome(){ try{ localStorage.setItem(QNOME_KEY, JSON.stringify(QNOME)); }catch(e){} if(typeof cloudSaveSoon==='function') cloudSaveSoon(); }
function quadraNome(id){ if(!QNOME){ QNOME=loadQNome()||{}; } return (QNOME[id]!=null && QNOME[id]!=='') ? QNOME[id] : id; }
function novoQuadraId(nome){ var b=String(nome||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'Q'; if((!QGEO || !QGEO[b]) && !(_delQuadras&&_delQuadras[b])) return b; var k; do{ k=b+'~'+Math.random().toString(36).slice(2,6); }while((QGEO&&QGEO[k])||(_delQuadras&&_delQuadras[k])); return k; }
function _homeCentro(){ try{ if(_geo&&_geo.corners){ var c=_geo.corners; return [ (c[0][0]+c[2][0])/2, (c[0][1]+c[2][1])/2 ]; } }catch(e){} return ESTACAO_CENTER.slice(); }

/* ===== TIPO DA QUADRA: 'campo' (padrão) ou 'lab' =====
   Mora em data[qid].tipo. Não precisou de schema novo: _rowQuadra joga toda
   chave desconhecida de data[qid] em `extras` e a leitura devolve inteira —
   sincroniza e faz merge de graça. Ausente = 'campo', então quadra antiga
   continua exatamente como está. Uma quadra de LAB não tem polígono; guarda
   um ponto (data[qid].ponto) só para poder ser tocada no mapa. */
function quadraTipo(id){ var d=(typeof data!=='undefined'&&data[id])||{}; return d.tipo==='lab'?'lab':'campo'; }
function isQuadraLab(id){ return quadraTipo(id)==='lab'; }

/* Especialidade do laboratório. Todos são da área de Biologia; o que muda é o
   que se registra em cada um:
     Entomologia   — bioensaio de mortalidade (tratamento x repetição x avaliação)
     Fitopatologia — fungos in vitro (crescimento micelial) e in vivo (severidade)
     Nematologia   — não é ensaio: é FILA DE AMOSTRAS (entrada, extração, leitura,
                     entrega), por número de estudo. Ver nemPainel(). */
var LAB_TIPOS=['Entomologia','Fitopatologia','Nematologia'];
var LAB_CORES={Entomologia:'#d99a2b', Fitopatologia:'#7a5cd6', Nematologia:'#2f9bbf'};
function quadraLabTipo(id){
  var d=(typeof data!=='undefined'&&data[id])||{};
  return LAB_TIPOS.indexOf(d.labTipo)>=0?d.labTipo:'';
}
function labTipoCor(t){ return LAB_CORES[t]||'#21a86b'; }
function setQuadraLabTipo(id,tipo){
  if(!data[id]||!isQuadraLab(id)) return false;
  if(LAB_TIPOS.indexOf(tipo)<0) return false;
  if(data[id].labTipo===tipo) return true;
  data[id].labTipo=tipo;
  _touchQGEO(id); saveQGEO(); save();
  try{ if(typeof dbUpsertQuadra==='function') dbUpsertQuadra(id); }catch(e){}
  return true;
}
function quadraPonto(id){
  var d=(typeof data!=='undefined'&&data[id])||{};
  if(d.ponto&&d.ponto.length===2&&isFinite(d.ponto[0])&&isFinite(d.ponto[1])) return [Number(d.ponto[0]),Number(d.ponto[1])];
  return null;
}
/* Troca o tipo de uma quadra existente. Campo -> lab só é permitido quando não
   há polígono desenhado: a geometria é o dado mais caro da quadra e some sem
   volta, então em vez de apagar calado a função recusa e explica. */
function setQuadraTipo(id,tipo){
  if(!data[id]) return false;
  var novo=(tipo==='lab')?'lab':'campo';
  if(novo===quadraTipo(id)) return true;
  ensureQGEO();
  if(novo==='lab' && QGEO && QGEO[id] && QGEO[id].length>=3){
    alert('A quadra "'+quadraNome(id)+'" tem polígono desenhado no mapa.\n\nApague os vértices antes de transformá-la em laboratório — assim a geometria não se perde sem querer.');
    return false;
  }
  if(novo==='lab'){
    data[id].tipo='lab';
    if(!quadraPonto(id)){ try{ var c=_map?_map.getCenter():null; data[id].ponto=c?[c.lat,c.lng]:_homeCentro(); }catch(e){ data[id].ponto=_homeCentro(); } }
  }else{
    delete data[id].tipo; delete data[id].ponto;
  }
  _touchQGEO(id); saveQGEO(); save();
  try{ if(typeof dbUpsertQuadra==='function') dbUpsertQuadra(id); }catch(e){}
  return true;
}
function ensureLocais(){
  if(!LOCAIS) LOCAIS=loadLocais()||{};
  if(!QLOCAL) QLOCAL=loadQLocal()||{};
  if(!QNOME) QNOME=loadQNome()||{};
  /* só cria o local padrão se NÃO existir NENHUM (assim dá pra excluir o de Iracemápolis) */
  if(Object.keys(LOCAIS).length===0) LOCAIS[HOME_LOCAL]={nome:"Estação Iracemápolis", centro:_homeCentro(), zoom:17};
  var fallback = LOCAIS[HOME_LOCAL] ? HOME_LOCAL : Object.keys(LOCAIS)[0];
  var changed=false;
  if(QGEO && fallback){ Object.keys(QGEO).forEach(function(id){ if(!QLOCAL[id] || !LOCAIS[QLOCAL[id]]){ QLOCAL[id]=fallback; changed=true; } }); }
  if(!localAtivo){ try{ localAtivo=localStorage.getItem(LOCAL_ATIVO_KEY)||fallback; }catch(e){ localAtivo=fallback; } }
  if(!LOCAIS[localAtivo]) localAtivo=Object.keys(LOCAIS)[0];
  if(changed) saveQLocal();
  return LOCAIS;
}
/* Enumera as quadras do local. Percorre QGEO (quadras de campo, que existem por
   terem geometria) E data (para alcançar as de LABORATÓRIO, que não têm polígono
   e portanto não têm entrada em QGEO). Sem isso a quadra de lab some de tudo:
   mapa, contagens, checagem de nome repetido e mudança de local. */
function quadrasDoLocal(id){
  ensureLocais(); var out=[], visto={};
  function add(q){ if(visto[q]) return; if((QLOCAL[q]||HOME_LOCAL)!==id) return; visto[q]=1; out.push(q); }
  if(QGEO) Object.keys(QGEO).forEach(add);
  if(typeof data!=='undefined'&&data) Object.keys(data).forEach(function(q){
    if(q==='__config') return;
    if(_delQuadras&&_delQuadras[q]) return;   /* respeita a lápide de exclusão */
    if(QGEO&&QGEO[q]) return;                 /* já entrou pelo laço de cima */
    if(!isQuadraLab(q)) return;               /* sem geometria e sem ser lab: resto órfão, fica fora */
    add(q);
  });
  return out;
}
function quadrasAtivas(){ return quadrasDoLocal(localAtivo); }
function novoLocalId(){ return 'loc'+Date.now().toString(36)+Math.floor(Math.random()*1000); }
function flyToLocal(id){
  if(!_map) initMap(); ensureLocais(); var Lc=LOCAIS[id]; if(!Lc) return;
  var qs=quadrasDoLocal(id);
  if(qs.length){ var b=99,s=999,e=-99,n=-999;
    qs.forEach(function(q){
      var pts=QGEO[q]||[];
      if(!pts.length){ var pl=quadraPonto(q); if(pl) pts=[pl]; } /* lab: entra pelo ponto */
      pts.forEach(function(p){ if(p[0]<b)b=p[0]; if(p[0]>n)n=p[0]; if(p[1]<s)s=p[1]; if(p[1]>e)e=p[1]; });
    });
    if(b<=n&&s<=e&&(n-b)<0.25&&(e-s)<0.25){
      /* só enquadra nas quadras se elas estiverem juntas (< ~27 km). Se uma quadra
         estiver fora do lugar, o bounds fica gigante e afastaria o zoom — nesse caso
         caímos no centro cadastrado do local (abaixo). */
      try{ if(_map.getBearing) _map.setBearing(0); }catch(e0){}
      try{ _map.flyToBounds([[b,s],[n,e]],{padding:[60,60],maxZoom:18,duration:0.8}); return; }
      catch(e2){ try{ _map.fitBounds([[b,s],[n,e]],{padding:[60,60],maxZoom:18}); return; }catch(e3){} }
    }
  }
  try{ if(_map.getBearing) _map.setBearing(0); }catch(eb){}
  var z=Math.min(SAT_MAX_ZOOM, Lc.zoom||16);
  try{ _map.flyTo(Lc.centro||ESTACAO_CENTER, z, {duration:0.8}); }
  catch(e4){ try{ _map.setView(Lc.centro||ESTACAO_CENTER, z); }catch(e5){} }
}
function setLocalAtivo(id){
  ensureLocais(); if(!LOCAIS[id]) return;
  localAtivo=id; try{ localStorage.setItem(LOCAL_ATIVO_KEY, id); }catch(e){}
  ndviMeans=null; if(ndviOverlay&&_map){ try{_map.removeLayer(ndviOverlay);}catch(e){} ndviOverlay=null; }
  closeLocalMenu();
  flyToLocal(id); render(); buildLocalChip(); if(typeof renderNdviRank==='function') renderNdviRank();
  /* o chip do clima acompanha o local: trocar de lugar troca a estação. climaMac
     zera junto, senão o painel continuaria aberto na estação do local anterior. */
  climaMac=null;
  if(typeof climaChipAtualiza==='function'){ try{ climaChipAtualiza(); }catch(e){} }
  var p=document.getElementById('ndviPanel'); if(p&&p.style.display==='block'){ try{ ndviLoadDates(); }catch(e){} if(ndviIndex&&ndviDate) setTimeout(function(){ try{ndviLoadImage();}catch(e){} },350); }
}
/* ---- UI: chip do local + menu + modal "Novo local" (busca geocoder) ---- */
function _locCss(){ if(document.getElementById('locCss'))return; var s=document.createElement('style'); s.id='locCss';
  s.textContent='.loc-chip{display:inline-flex;align-items:center;gap:6px;margin-top:5px;background:var(--surface-3,#161e1a);border:1px solid var(--border,#26322b);color:var(--accent,#37d684);padding:5px 11px;border-radius:999px;font:600 11px/1 -apple-system,system-ui,sans-serif;cursor:pointer;max-width:78vw;white-space:nowrap;transition:background .15s,border-color .15s}.loc-chip:hover{background:#1d2721;border-color:#33453a}.loc-chip b{color:#eaf3ed;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:44vw}.loc-chip .car{color:var(--text-3,#6d7f73);font-size:9px}.loc-chip .sub{color:var(--text-3,#6d7f73);font-weight:600}'+
  '.loc-menu{position:fixed;z-index:1600;background:#0e120e;border:1px solid #2a3a2a;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.6);min-width:230px;max-width:86vw;overflow:hidden;font:13px system-ui,sans-serif}.loc-mi{padding:9px 12px;color:#cfe0cf;cursor:pointer;display:flex;justify-content:space-between;gap:8px;align-items:center}.loc-mi:hover{background:#16241a}.loc-mi.on{background:#15301a}.loc-mi .sub{color:#6a8a6a;font-size:11px;display:flex;align-items:center;gap:6px}.loc-sep{height:1px;background:#1e2e1e}.loc-new{color:#9ac49a;font-weight:700}.loc-x{color:#7a5a5a;font-size:13px;padding:0 3px;cursor:pointer}.loc-x:hover{color:#ff8a80}'+
  '.loc-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1700;display:none;align-items:center;justify-content:center;padding:16px}.loc-box{background:#0e120e;border:1px solid #2a3a2a;border-radius:14px;max-width:440px;width:100%;padding:16px;font:13px system-ui,sans-serif;color:#dfeadf;box-sizing:border-box}.loc-box h3{margin:0 0 6px;font-size:15px;color:#cfe6cf}.loc-box label{display:block;font-size:11px;color:#8aa88a;margin:10px 0 3px;font-weight:600;letter-spacing:.4px}.loc-box input{width:100%;box-sizing:border-box;background:#0a0e0a;border:1px solid #2a3a2a;border-radius:8px;color:#eaf0ea;padding:9px;font-size:14px}.loc-box .row{display:flex;gap:8px}.loc-btn{flex:1;border:none;border-radius:9px;padding:10px;font-weight:700;cursor:pointer;font-size:13px}.loc-ok{background:#1f5a2a;color:#eafaea}.loc-ok:hover{background:#246a31}.loc-cancel{background:#222;color:#bbb}.loc-2nd{background:#16301c;color:#9ac49a}.loc-res{margin-top:6px;max-height:168px;overflow:auto}.loc-ri{padding:8px;border:1px solid #1e2e1e;border-radius:8px;margin-top:5px;cursor:pointer;font-size:12px;color:#cfe0cf}.loc-ri:hover{background:#16241a}'+
  '.lm-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-soft,#1e2e1e)}.lm-info{display:flex;flex-direction:column;gap:2px;min-width:0}.lm-info b{color:var(--text,#eaf3ed);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lm-info span{font-size:11px;color:var(--text-3,#6a8a6a)}.lm-del{flex:none;background:rgba(216,75,67,.12);color:var(--danger,#d84b43);border:1px solid rgba(216,75,67,.42);border-radius:8px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer}.lm-del:hover{background:rgba(216,75,67,.22)}';
  document.head.appendChild(s);
}
function buildLocalChip(){
  _locCss(); ensureLocais();
  var host=document.querySelector('.top-bar > div:first-child'); if(!host) return;
  var chip=document.getElementById('localChip');
  if(!chip){ chip=document.createElement('div'); chip.id='localChip'; chip.className='loc-chip'; chip.onclick=toggleLocalMenu; host.appendChild(chip); }
  var nome=(LOCAIS[localAtivo]&&LOCAIS[localAtivo].nome)||'—';
  var n=quadrasDoLocal(localAtivo).length;
  chip.innerHTML='<b>'+esc(nome)+'</b> <span class="sub">'+n+' quadra'+(n===1?'':'s')+'</span> <span class="car">▾</span>';
}
function closeLocalMenu(){ var m=document.getElementById('localMenu'); if(m) m.remove(); document.removeEventListener('click', _locMenuOutside, true); }
function _locMenuOutside(e){ var m=document.getElementById('localMenu'), c=document.getElementById('localChip'); if(m && !m.contains(e.target) && c && !c.contains(e.target)) closeLocalMenu(); }
/* ---------------------------------------- lugares duplicados ---------------
   O merge entre aparelhos pode criar duas entradas em LOCAIS para a MESMA
   estação (ids diferentes, mesmo nome) — foi o que fez Iracemápolis aparecer
   como duas localidades. Vínculo órfão o ensureLocais já resolve; isto aqui é
   o outro caso, que ele não vê porque as duas entradas são válidas. */
function _locNorm(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
         .toLowerCase().replace(/\s+/g,' ').trim();
}
function diagnosticarLugares(){
  ensureLocais();
  var lugares=Object.keys(LOCAIS).map(function(id){
    return { id:id, nome:LOCAIS[id].nome||'(sem nome)',
             quadras:quadrasDoLocal(id).length, ativo:(id===localAtivo) };
  });
  var porNome={};
  lugares.forEach(function(l){ var k=_locNorm(l.nome); (porNome[k]=porNome[k]||[]).push(l); });
  var grupos=Object.keys(porNome).map(function(k){ return porNome[k]; })
              .filter(function(g){ return g.length>1; });
  return { lugares:lugares, duplicados:grupos };
}
/* Funde os de mesmo nome, mantendo o que tem mais quadras (empate: o ativo). */
function fundirLugaresDuplicados(silencioso){
  var d=diagnosticarLugares();
  if(!d.duplicados.length){
    if(!silencioso && typeof _stxToast==='function') _stxToast('Nenhum local duplicado.');
    return 0;
  }
  var movidas=0, apagados=[];
  d.duplicados.forEach(function(g){
    var alvo=g.slice().sort(function(a,b){
      if(b.quadras!==a.quadras) return b.quadras-a.quadras;
      return (b.ativo?1:0)-(a.ativo?1:0);
    })[0];
    g.forEach(function(l){
      if(l.id===alvo.id) return;
      quadrasDoLocal(l.id).forEach(function(q){ QLOCAL[q]=alvo.id; movidas++; });
      delete LOCAIS[l.id]; apagados.push(l.nome);
      if(localAtivo===l.id) localAtivo=alvo.id;
    });
  });
  saveQLocal(); saveLocais();
  try{ localStorage.setItem(LOCAL_ATIVO_KEY, localAtivo); }catch(e){}
  if(typeof _touchGeoref==='function') _touchGeoref();
  if(typeof cloudSaveSoon==='function') cloudSaveSoon();
  try{ renderLocalChip(); }catch(e){}
  try{ render(); }catch(e){}
  if(!silencioso && typeof _stxToast==='function')
    _stxToast(apagados.length+' local'+(apagados.length>1?'is':'')+' duplicado'+(apagados.length>1?'s':'')+' fundido'+(apagados.length>1?'s':'')+' · '+movidas+' quadras religadas');
  return apagados.length;
}
function toggleLocalMenu(){ if(document.getElementById('localMenu')){ closeLocalMenu(); } else { openLocalMenu(); } }
function openLocalMenu(){
  _locCss(); ensureLocais(); closeLocalMenu();
  var chip=document.getElementById('localChip'), r=chip?chip.getBoundingClientRect():{left:12,bottom:50};
  var m=document.createElement('div'); m.id='localMenu'; m.className='loc-menu';
  var html='';
  Object.keys(LOCAIS).forEach(function(id){ var Lc=LOCAIS[id], n=quadrasDoLocal(id).length, on=(id===localAtivo);
    html+='<div class="loc-mi'+(on?' on':'')+'" data-go="'+id+'"><span>'+(on?'✓ ':'')+esc(Lc.nome)+'</span><span class="sub">'+n+'q</span></div>';
  });
  var _dup=diagnosticarLugares().duplicados;
  if(_dup.length){
    html+='<div class="loc-sep"></div><div class="loc-mi" data-fundir="1" style="color:#a8571e">'+
          '&#9888; '+_dup.length+' local'+(_dup.length>1?'is':'')+' repetido'+(_dup.length>1?'s':'')+' — juntar</div>';
  }
  html+='<div class="loc-sep"></div><div class="loc-mi loc-new" data-new="1">'+ic('plus',15)+' Novo local…</div>'+
        '<div class="loc-mi loc-manage" data-manage="1">'+ic('gear',15)+' Gerenciar locais</div>';
  m.innerHTML=html; document.body.appendChild(m);
  m.style.left=Math.max(8,Math.min(r.left, window.innerWidth-m.offsetWidth-8))+'px';
  m.style.top=((r.bottom||50)+6)+'px';
  m.addEventListener('click', function(e){
    var it=e.target.closest('.loc-mi'); if(!it) return;
    if(it.getAttribute('data-fundir')){
      var d=diagnosticarLugares();
      var txt=d.duplicados.map(function(g){
        return '• ' + g[0].nome + ' (' + g.map(function(x){ return x.quadras+'q'; }).join(' + ') + ')';
      }).join('\n');
      if(confirm('Estes locais têm o mesmo nome e são a mesma coisa:\n\n'+txt+
                 '\n\nJuntar num só? As quadras vão todas para o que tem mais, nenhuma é apagada.')){
        closeLocalMenu(); fundirLugaresDuplicados();
      }
      return;
    }
    if(it.getAttribute('data-new')){ closeLocalMenu(); abrirNovoLocal(); return; }
    if(it.getAttribute('data-manage')){ closeLocalMenu(); gerenciarLocais(); return; }
    var go=it.getAttribute('data-go'); if(go) setLocalAtivo(go);
  });
  setTimeout(function(){ document.addEventListener('click', _locMenuOutside, true); },0);
}
function excluirLocal(id){
  ensureLocais(); if(!LOCAIS[id]) return;
  if(Object.keys(LOCAIS).length<=1){ alert('Não dá pra excluir o último local — precisa existir pelo menos um.'); return; }
  var qs=quadrasDoLocal(id), nome=LOCAIS[id].nome;
  requireDeletePassword('Excluir o local "'+nome+'"'+(qs.length?(' e suas '+qs.length+' quadra(s).'):'.'), function(){
    safetyBackup('antes de excluir local '+nome);
    qs.forEach(function(q){ delete QGEO[q]; if(data[q]) delete data[q]; delete QLOCAL[q]; if(QNOME) delete QNOME[q]; _delQuadras[q]=Date.now(); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('quadras',q); }catch(e){} });
    delete LOCAIS[id];
    _delLocais[id]=Date.now(); saveDelTombs(); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('locais',id); }catch(e){} /* Etapa 3 */
    var resto=Object.keys(LOCAIS);
    if(localAtivo===id) localAtivo=resto[0];
    _cloudAllowShrink=true; /* exclusão intencional (merge preserva adições de outros aparelhos) */
    saveQGEO(); save(); saveLocais(); saveQLocal(); saveQNome();
    if(typeof updateAgendaBadge==='function') updateAgendaBadge();
    setLocalAtivo(localAtivo);
    if(document.getElementById('locManage')) gerenciarLocais(); /* re-renderiza o painel se aberto */
  });
}
/* Painel "Gerenciar locais" — excluir qualquer local (com confirmação forte) */
function gerenciarLocais(){
  _locCss(); ensureLocais();
  var m=document.getElementById('locManage');
  if(!m){ m=document.createElement('div'); m.id='locManage'; m.className='loc-modal'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  var rows=Object.keys(LOCAIS).map(function(id){ var Lc=LOCAIS[id], n=quadrasDoLocal(id).length;
    return '<div class="lm-row"><div class="lm-info"><b>'+esc(Lc.nome)+'</b><span>'+n+' quadra'+(n===1?'':'s')+'</span></div>'+
      '<div class="lm-acts" style="display:flex;gap:6px">'+
      '<button class="lm-ren" style="background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:8px;padding:7px 11px;font-weight:700;cursor:pointer" onclick="renomearLocal(\''+id+'\')">Renomear</button>'+
      '<button class="lm-del" onclick="excluirLocal(\''+id+'\')">Excluir</button></div></div>';
  }).join('');
  m.innerHTML='<div class="loc-box" style="position:relative"><button class="panel-x-tr" onclick="document.getElementById(\'locManage\').style.display=\'none\'" aria-label="Fechar" title="Fechar">✕</button><h3>'+ic('gear',16)+' Gerenciar locais</h3>'+
    '<div style="font-size:11px;color:#8a948e;margin-bottom:8px">Excluir um local remove ele e as quadras dele (pede confirmação digitando o nome). Não dá pra excluir o último.</div>'+
    rows+
    '<div class="row" style="margin-top:12px"><button class="loc-btn loc-cancel" onclick="document.getElementById(\'locManage\').style.display=\'none\'">Fechar</button></div></div>';
  m.style.display='flex';
}
function abrirNovoLocal(){
  _locCss();
  var m=document.getElementById('locModal');
  if(!m){ m=document.createElement('div'); m.id='locModal'; m.className='loc-modal'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  _locPick=null;
  m.innerHTML='<div class="loc-box">'+
    '<h3>📍 Novo local</h3>'+
    '<div style="font-size:11px;color:#6a8a6a;margin-bottom:2px">Crie um local em qualquer lugar do mundo. Depois desenhe as quadras dele (já georreferenciadas).</div>'+
    '<label>Nome do local</label><input id="locNome" placeholder="Ex.: Fazenda Cordeirópolis" autocomplete="off">'+
    '<label>Buscar endereço / cidade</label>'+
    '<div class="row"><input id="locBusca" placeholder="Ex.: Cordeirópolis SP" autocomplete="off"><button class="loc-btn loc-2nd" style="flex:none;padding:10px 14px" onclick="geocodeGo()">Buscar</button></div>'+
    '<div id="locRes" class="loc-res"></div>'+
    '<div style="font-size:11px;color:#6a8a6a;margin:10px 0 2px">…ou use o que está visível no mapa agora:</div>'+
    '<div class="row" style="margin-top:4px"><button class="loc-btn loc-ok" onclick="criarLocal()">Criar local</button><button class="loc-btn loc-cancel" onclick="document.getElementById(\'locModal\').style.display=\'none\'">Cancelar</button></div>'+
    '</div>';
  m.style.display='flex';
  setTimeout(function(){ var i=document.getElementById('locNome'); if(i) i.focus(); var bi=document.getElementById('locBusca'); if(bi) bi.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); geocodeGo(); } }; },60);
}
function geocodeGo(){
  var q=((document.getElementById('locBusca')||{}).value||'').trim(); if(!q) return;
  var res=document.getElementById('locRes'); if(res) res.innerHTML='<div style="color:#8aa88a;font-size:12px;padding:6px">Buscando…</div>';
  fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=pt-BR&q='+encodeURIComponent(q))
    .then(function(r){return r.json();}).then(function(arr){
      if(!arr||!arr.length){ if(res) res.innerHTML='<div style="color:#c88;font-size:12px;padding:6px">Nada encontrado.</div>'; return; }
      if(res){ res.innerHTML=arr.map(function(o,i){ return '<div class="loc-ri" data-i="'+i+'">'+esc(o.display_name)+'</div>'; }).join('');
        res.querySelectorAll('.loc-ri').forEach(function(el){ el.onclick=function(){ var o=arr[+el.getAttribute('data-i')];
          _locPick={centro:[parseFloat(o.lat),parseFloat(o.lon)], zoom:16};
          if(_map) _map.setView(_locPick.centro,_locPick.zoom);
          res.querySelectorAll('.loc-ri').forEach(function(x){x.style.borderColor='#1e2e1e';}); el.style.borderColor='#3a7a3a';
          var nm=document.getElementById('locNome'); if(nm&&!nm.value) nm.value=(o.name||o.display_name.split(',')[0]);
        }; });
      }
    }).catch(function(){ if(res) res.innerHTML='<div style="color:#c88;font-size:12px;padding:6px">Erro na busca (sem internet?).</div>'; });
}
function criarLocal(){
  ensureLocais();
  var nome=((document.getElementById('locNome')||{}).value||'').trim();
  if(!nome){ alert('Dê um nome ao local.'); return; }
  var centro, zoom;
  if(_locPick){ centro=_locPick.centro; zoom=_locPick.zoom; }
  else if(_map){ var c=_map.getCenter(); centro=[c.lat,c.lng]; zoom=_map.getZoom(); }
  else { centro=ESTACAO_CENTER.slice(); zoom=16; }
  var id=novoLocalId();
  LOCAIS[id]={nome:nome, centro:centro, zoom:zoom}; _touchLocal(id); saveLocais(); _locPick=null;
  var m=document.getElementById('locModal'); if(m) m.style.display='none';
  setLocalAtivo(id);
  setTimeout(function(){ alert('Local "'+nome+'" criado!\n\nAgora toque em ☰ Menu → ✏️ Editar quadras → ＋ Nova quadra para desenhar as quadras deste local. Elas já ficam georreferenciadas e o NDVI funciona dentro delas.'); },180);
}

function renomearLocal(id){
  ensureLocais(); if(!LOCAIS[id]) return;
  _locCss();
  var m=document.getElementById('locModal');
  if(!m){ m=document.createElement('div'); m.id='locModal'; m.className='loc-modal'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  m.innerHTML='<div class="loc-box"><h3>Renomear local</h3>'+
    '<label>Novo nome</label><input id="locRenInp" autocomplete="off" value="'+esc(LOCAIS[id].nome||'')+'">'+
    '<div class="row" style="margin-top:10px"><button class="loc-btn loc-ok" onclick="salvarRenomearLocal(\''+id+'\')">Salvar</button><button class="loc-btn loc-cancel" onclick="document.getElementById(\'locModal\').style.display=\'none\'">Cancelar</button></div></div>';
  m.style.display='flex';
  setTimeout(function(){ var i=document.getElementById('locRenInp'); if(i){ i.focus(); try{i.select();}catch(e){} i.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); salvarRenomearLocal(id); } }; } },60);
}
function salvarRenomearLocal(id){
  ensureLocais(); if(!LOCAIS[id]) return;
  var nv=((document.getElementById('locRenInp')||{}).value||'').trim();
  if(!nv){ alert('Dê um nome ao local.'); return; }
  LOCAIS[id].nome=nv; _touchLocal(id); saveLocais();
  var m=document.getElementById('locModal'); if(m) m.style.display='none';
  if(typeof buildLocalChip==='function') buildLocalChip();
  try{ render(); }catch(e){}
  if(document.getElementById('locManage')) gerenciarLocais();
}
/* ---- Menu de ferramentas (☰): Editar quadras / Alinhar / Backup / Importar ---- */
function _menuCss(){ if(document.getElementById('menuCss'))return; var s=document.createElement('style'); s.id='menuCss';
  s.textContent='.main-menu{position:fixed;bottom:60px;right:14px;z-index:1500;background:#0e120e;border:1px solid #2a3a2a;border-radius:11px;box-shadow:0 10px 30px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column;min-width:200px}.main-menu button{background:none;border:none;color:#cfe0cf;text-align:left;padding:12px 15px;font:600 13px system-ui,sans-serif;cursor:pointer;white-space:nowrap}.main-menu button:hover{background:#16241a}.main-menu .mm-sep{height:1px;background:#1e2e1e;margin:0}.main-menu .mm-user{padding:8px 15px 2px;font:600 11px system-ui,sans-serif;color:#6d7f73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}';
  document.head.appendChild(s);
}
function closeMainMenu(){ var m=document.getElementById('mainMenu'); if(m) m.remove(); document.removeEventListener('click', _mainMenuOutside, true); }
function _mainMenuOutside(e){ var m=document.getElementById('mainMenu'), b=document.getElementById('menuBtn'); if(m && !m.contains(e.target) && b && !b.contains(e.target)) closeMainMenu(); }
/* ---- Instalação do app (PWA) ---- */
var _deferredPrompt=null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); _deferredPrompt=e; });
window.addEventListener('appinstalled', function(){ _deferredPrompt=null; });
function isStandalone(){ try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true; }catch(e){ return false; } }
function isiOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent||''); }
function installApp(){
  if(typeof closeMainMenu==='function') closeMainMenu();
  if(_deferredPrompt){ _deferredPrompt.prompt(); try{ _deferredPrompt.userChoice.then(function(){ _deferredPrompt=null; }); }catch(e){} return; }
  if(isiOS()){ alert('📲 Instalar no iPhone:\n\n1) Abra este site no SAFARI (não dentro do WhatsApp/Instagram)\n2) Toque em Compartilhar (o quadrado com a seta ↑, na barra de baixo)\n3) Role e toque em "Adicionar à Tela de Início"\n4) Toque em "Adicionar"\n\nPronto: vira um ícone na sua tela.'); return; }
  alert('📲 Instalar no Android:\n\n1) Abra este site no CHROME (não dentro do WhatsApp/Instagram)\n2) Toque no menu ⋮ (3 pontinhos, canto de cima)\n3) Toque em "Instalar app" (ou "Adicionar à tela inicial")\n4) Confirme.');
}
/* Forçar atualização: limpa service worker + caches (preserva o Pyodide) e recarrega na versão nova.
   Resolve o PWA preso numa versão velha sem precisar desinstalar. Os dados ficam salvos (localStorage/Firestore). */
function forcarAtualizacao(){
  if(typeof closeMainMenu==='function') closeMainMenu();
  if(!confirm('Atualizar o app para a versão mais nova?\n\nSeus dados continuam salvos. O app vai recarregar.')) return;
  var done=false, go=function(){ if(done) return; done=true; try{ location.reload(true); }catch(e){ location.reload(); } };
  try{
    var ps=[];
    if('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations){
      ps.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all((rs||[]).map(function(r){ return r.unregister(); })); }).catch(function(){}));
    }
    if(window.caches && caches.keys){
      ps.push(caches.keys().then(function(ks){ return Promise.all((ks||[]).map(function(k){ if(k==='agracta-pyodide-v1') return Promise.resolve(); /* não re-baixar 115MB */ return caches.delete(k); })); }).catch(function(){}));
    }
    Promise.all(ps).then(go).catch(go);
    setTimeout(go, 4000); /* fallback se algo travar */
  }catch(e){ go(); }
}
/* Tela cheia: esconde o "casco" e mostra só o mapa */
function toggleFullscreenMap(){
  if(typeof closeMainMenu==='function') closeMainMenu();
  var on=document.body.classList.toggle('map-full');
  var ex=document.getElementById('fullExit');
  if(on){
    if(!ex){ ex=document.createElement('button'); ex.id='fullExit'; ex.className='full-exit'; ex.innerHTML=ic('maximize',14)+' Sair'; ex.onclick=toggleFullscreenMap; document.body.appendChild(ex); }
    ex.style.display='block';
  } else if(ex){ ex.style.display='none'; }
  setTimeout(function(){ try{ if(_map) _map.invalidateSize(); }catch(e){} }, 160);
}
function isAdmin(){ try{ var c=data&&data.__config, e=(_authUser&&_authUser.email||'').toLowerCase().trim(); if(!e) return false; var adm=String((c&&c.adminEmail)||'machadovictorchaves@gmail.com').toLowerCase().trim(); return e===adm || e==='machadovictorchaves@gmail.com'; }catch(e){ return false; } }
function toggleMainMenu(){
  if(document.getElementById('mainMenu')){ closeMainMenu(); return; }
  _menuCss();
  var m=document.createElement('div'); m.id='mainMenu'; m.className='main-menu';
  var adm=isAdmin();
  m.innerHTML=
    (!isStandalone()?'<button class="mm-install" onclick="installApp()">'+ic('phone')+' Instalar app</button><div class="mm-sep"></div>':'')+
    '<button onclick="forcarAtualizacao()">🔄 Forçar atualização</button>'+
    '<button onclick="toggleTheme()">'+(document.documentElement.classList.contains('light')?'◑ Tema escuro':'◐ Tema claro')+'</button>'+
    '<div class="mm-sep"></div>'+
    '<button onclick="closeMainMenu();toggleQuadraEdit()">'+ic('pencil')+' Editar quadras</button>'+
    (adm?'<button onclick="closeMainMenu();startGeoref()">'+ic('pin')+' Alinhar mapa</button>':'')+
    '<div class="mm-sep"></div>'+
    '<button onclick="closeMainMenu();openImportProtocolo()">📥 Importar protocolo (planilha)</button>'+
    '<div class="mm-sep"></div>'+
    (adm?'<button onclick="closeMainMenu();exportXlsx(false)">'+ic('sheet')+' Exportar planilha (Excel/Sheets)</button><div class="mm-sep"></div>':'')+
    '<button onclick="closeMainMenu();exportData()">'+ic('save')+' Backup (arquivo)</button>'+
    '<button onclick="closeMainMenu();document.getElementById(\'imp\').click()">'+ic('download')+' Importar</button>'+
    '<button onclick="closeMainMenu();openBackups()">'+ic('archive')+' Backups (restaurar)</button>'+
    '<button onclick="closeMainMenu();openCloudHistory()">'+ic('refresh')+' Histórico da nuvem</button>'+
    '<button onclick="closeMainMenu();openAvalRecovery()">'+ic('save')+' Recuperação de avaliações</button>'+
    (adm?'<button onclick="closeMainMenu();openAdminPanel()">'+ic('gear')+' Painel Admin</button>':'')+
    (adm?'<button onclick="closeMainMenu();openComplianceISMS()">'+ic('archive')+' Conformidade &amp; ISMS</button>':'')+
    (_authUser?('<div class="mm-sep"></div><div class="mm-user">'+esc(_authUser.email||'')+'</div><button onclick="doLogout()">'+ic('logout')+' Sair</button>'):'');
  document.body.appendChild(m);
  /* abre logo abaixo do botão ☰ (canto superior direito) */
  var b=document.getElementById('menuBtn'), r=b?b.getBoundingClientRect():null;
  if(r){ m.style.bottom='auto'; m.style.top=(r.bottom+6)+'px'; m.style.right=Math.max(8,(window.innerWidth-r.right))+'px'; m.style.maxHeight='calc(100vh - '+(r.bottom+18)+'px)'; m.style.overflowY='auto'; }
  setTimeout(function(){ document.addEventListener('click', _mainMenuOutside, true); },0);
}

var editMode=false, editId=null, drawMode=false, drawPts=[], _editLayer=null, _editPoly=null;

function toggleQuadraEdit(){
  if(!_map) initMap();
  if(!ensureQGEO()){ alert('Primeiro alinhe o mapa (bot\u00e3o "Alinhar") para gerar as quadras.'); return; }
  if(_grOn) cancelGeoref();
  editMode=!editMode; editId=null; endDraw();
  window._qEditing=editMode; /* trava o eco do realtime enquanto edita (não atropela) */
  if(editMode){
    if(typeof scoutingModeActive!=='undefined'&&scoutingModeActive) toggleScoutingMode(false);
    if(!_editLayer) _editLayer=LF.layerGroup().addTo(_map); buildEditPanel();
  }
  else {
    editExitCleanup();
    /* Ao sair da edição, as alterações locais são a verdade: descarta o estado
       represado (eco antigo) e empurra o estado atual na hora — senão os últimos
       ajustes de polígono eram revertidos pelo eco do realtime. */
    _cloudPending=null;
    if(typeof cloudSyncNow==='function') cloudSyncNow();
  }
  render();
}
function editExitCleanup(){ if(_editLayer) _editLayer.clearLayers(); _editPoly=null; var p=document.getElementById('edPanel'); if(p)p.style.display='none'; }
function selectQuadra(id){ if(!editMode||drawMode) return; editId=id; render(); buildEditPanel(); }

function drawVertexHandles(){
  if(!_editLayer) return;
  _editLayer.clearLayers();
  if(drawMode){ drawDrawingPreview(); return; }
  if(!editId || !QGEO[editId]) return;
  var pts=QGEO[editId];
  pts.forEach(function(ll,i){
    var m=LF.marker(ll,{draggable:true, zIndexOffset:1200,
      icon:LF.divIcon({className:'v-handle',html:'<div></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(_editLayer);
    m.on('drag',function(){ var p=m.getLatLng(); QGEO[editId][i]=[p.lat,p.lng]; if(_editPoly) _editPoly.setLatLngs(QGEO[editId]); });
    m.on('dragend',function(){ _touchQGEO(editId); saveQGEO(); drawVertexHandles(); });
    m.on('dblclick',function(ev){ LF.DomEvent.stop(ev); if(QGEO[editId].length>3){ QGEO[editId].splice(i,1); _touchQGEO(editId); saveQGEO(); render(); } });
  });
  for(var i=0;i<pts.length;i++){
    var a=pts[i], b=pts[(i+1)%pts.length], mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    (function(insertAt,midll){
      LF.marker(midll,{zIndexOffset:1100, icon:LF.divIcon({className:'v-mid',html:'<div>+</div>',iconSize:[13,13],iconAnchor:[6,6]})})
        .addTo(_editLayer).on('click',function(){ QGEO[editId].splice(insertAt+1,0,midll); _touchQGEO(editId); saveQGEO(); render(); });
    })(i, mid);
  }
}

/* "＋ Nova quadra" agora passa por aqui: campo segue desenhando no mapa (fluxo
   de sempre, intocado); laboratório não desenha nada — só pede o nome. */
function novaQuadraTipo(){
  if(!editMode) return;
  var ov=document.getElementById('qtipoOvl');
  if(!ov){
    _calcCss(); /* reusa o CSS .calc-* do app, sem folha nova */
    ov=document.createElement('div'); ov.id='qtipoOvl'; ov.className='calc-ovl';
    ov.onclick=function(e){ if(e.target===ov) fecharNovaQuadraTipo(); };
    document.body.appendChild(ov);
  }
  ov.innerHTML='<div class="calc-box" style="max-width:380px">'+
    '<div class="calc-top"><div class="calc-title">Nova quadra</div><button class="calc-x" onclick="fecharNovaQuadraTipo()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">O que você vai registrar aqui?</div>'+
    '<div class="qtipo-opts">'+
      '<button class="qtipo-op" onclick="fecharNovaQuadraTipo();startDrawQuadra()">'+
        '<div class="qtipo-ico">🗺️</div><div><div class="qtipo-t">Campo</div>'+
        '<div class="qtipo-d">Desenha o polígono no mapa. Área, NDVI e fenologia funcionam.</div></div></button>'+
      '<button class="qtipo-op" onclick="novaQuadraLabTipo()">'+
        '<div class="qtipo-ico">🧪</div><div><div class="qtipo-t">Laboratório</div>'+
        '<div class="qtipo-d">Sem desenho. Entomologia, Fitopatologia ou Nematologia.</div></div></button>'+
    '</div></div>';
  ov.style.display='flex';
}
/* Passo 2: qual laboratório. Todos são de Biologia; a especialidade decide o que
   o app vai pedir depois (variáveis da avaliação, ou a fila de amostras). */
function novaQuadraLabTipo(){
  var ov=document.getElementById('qtipoOvl'); if(!ov) return;
  var desc={
    Entomologia:'Bioensaio de mortalidade — tratamentos, repetições e a calculadora de diluição.',
    Fitopatologia:'Fungos in vitro (crescimento micelial) e in vivo (severidade, incidência).',
    Nematologia:'Fila de amostras: entrada, extração, leitura e entrega — por número de estudo.'
  };
  ov.innerHTML='<div class="calc-box" style="max-width:380px">'+
    '<div class="calc-top"><div class="calc-title">Qual laboratório?</div><button class="calc-x" onclick="fecharNovaQuadraTipo()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">Área de Biologia</div>'+
    '<div class="qtipo-opts">'+LAB_TIPOS.map(function(t){
      return '<button class="qtipo-op" onclick="fecharNovaQuadraTipo();criarQuadraLab(\''+t+'\')">'+
        '<div class="qtipo-ico" style="color:'+labTipoCor(t)+'">🧫</div><div><div class="qtipo-t">'+t+'</div>'+
        '<div class="qtipo-d">'+desc[t]+'</div></div></button>';
    }).join('')+'</div>'+
    '<div class="calc-actions"><button class="calc-close" onclick="novaQuadraTipo()">Voltar</button></div>'+
    '</div>';
}
function fecharNovaQuadraTipo(){ var o=document.getElementById('qtipoOvl'); if(o) o.style.display='none'; }

/* Quadra de laboratório: sem polígono. Fica no mapa como um marcador (o lab é
   um prédio, tem lugar), então continua alcançável pelo mesmo toque de sempre. */
/* Criação em três passos: tipo -> nome -> ONDE FICA.
   O centro do mapa era um palpite ruim: o marcador nascia em qualquer lugar que
   a tela estivesse mostrando, e o usuário não via. Agora ou vem do GPS (você
   está dentro do laboratório) ou você toca no mapa. */
var _labPend=null, _labPick=false;
function criarQuadraLab(labTipo){
  if(!editMode) return;
  if(LAB_TIPOS.indexOf(labTipo)<0) labTipo='';
  var nome=prompt('Nome do laboratório:', labTipo?('Lab. '+labTipo):'Laboratório');
  if(nome===null) return; nome=String(nome).trim(); if(!nome) return;
  ensureLocais(); ensureQGEO();
  var dup=quadrasDoLocal(localAtivo).some(function(q){ return quadraNome(q).toLowerCase()===nome.toLowerCase(); });
  if(dup){ alert('Já existe uma quadra chamada "'+nome+'" neste local.'); return; }
  _labPend={nome:nome, labTipo:labTipo};
  labOndeFica();
}
function labOndeFica(){
  if(!_labPend) return;
  _calcCss();
  var ov=document.getElementById('qtipoOvl');
  if(!ov){ ov=document.createElement('div'); ov.id='qtipoOvl'; ov.className='calc-ovl';
    ov.onclick=function(e){ if(e.target===ov) fecharNovaQuadraTipo(); }; document.body.appendChild(ov); }
  ov.innerHTML='<div class="calc-box" style="max-width:380px">'+
    '<div class="calc-top"><div class="calc-title">Onde fica o laboratório?</div><button class="calc-x" onclick="labCancelar()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">'+esc(_labPend.nome)+(_labPend.labTipo?' · '+esc(_labPend.labTipo):'')+'</div>'+
    '<div class="qtipo-opts">'+
      '<button class="qtipo-op" onclick="labPontoGps()">'+
        '<div class="qtipo-ico">📍</div><div><div class="qtipo-t">Usar meu GPS</div>'+
        '<div class="qtipo-d">Se você está no laboratório agora. Pega a posição mais precisa em alguns segundos.</div></div></button>'+
      '<button class="qtipo-op" onclick="labPontoMapa()">'+
        '<div class="qtipo-ico">👆</div><div><div class="qtipo-t">Tocar no mapa</div>'+
        '<div class="qtipo-d">Fecha esta janela e você toca no prédio do laboratório.</div></div></button>'+
    '</div></div>';
  ov.style.display='flex';
}
function labCancelar(){ _labPend=null; _labPick=false; fecharNovaQuadraTipo(); labFimPick(); }
function labPontoGps(){
  if(!_labPend) return;
  var ov=document.getElementById('qtipoOvl');
  var box=ov&&ov.querySelector('.calc-box');
  if(box) box.innerHTML='<div class="calc-top"><div class="calc-title">📍 Procurando o GPS…</div></div>'+
    '<div class="calc-sub" id="labGpsMsg">Segure o aparelho parado. Isso leva alguns segundos.</div>'+
    '<div class="calc-actions"><button class="calc-close" onclick="labCancelar()">Cancelar</button></div>';
  gpsBest({target:12, maxWait:9000, maxAcc:120}, function(b){
    var m=document.getElementById('labGpsMsg');
    if(m) m.textContent='Precisão de ±'+Math.round(b.acc)+' m — afinando…';
  }, function(b,err){
    if(!b){
      alert('Não consegui o GPS.'+(err?'\n('+err+')':'')+'\n\nToque no mapa para marcar o laboratório.');
      labPontoMapa(); return;
    }
    labFinalizar([b.lat,b.lng], 'GPS ±'+Math.round(b.acc)+' m');
  });
}
function labPontoMapa(){
  if(!_labPend) return;
  fecharNovaQuadraTipo();
  _labPick=true; drawMode=false;
  if(_map){ _map.on('click', labCliqueMapa); _map.getContainer().style.cursor='crosshair'; }
  buildEditPanel();
}
function labCliqueMapa(e){ if(!_labPick) return; labFinalizar([e.latlng.lat, e.latlng.lng], 'marcado no mapa'); }
function labFimPick(){
  _labPick=false;
  if(_map){ _map.off('click', labCliqueMapa); _map.getContainer().style.cursor=''; }
}
function labFinalizar(ponto, origem){
  var p=_labPend; if(!p) return;
  _labPend=null; labFimPick(); fecharNovaQuadraTipo();
  var id=novoQuadraId(p.nome);
  QLOCAL[id]=localAtivo; _touchQLocal(id);
  QNOME[id]=p.nome; _touchQNome(id);
  data[id]={cultura:'',cultivar:'',plantio:'',area:null,estudos:[],
            tipo:'lab', labTipo:p.labTipo, ponto:ponto};
  _touchQGEO(id); /* carimbo: quadra nova vence aparelho zerado no merge */
  saveQGEO(); saveQLocal(); saveQNome(); save();
  try{ if(typeof dbUpsertQuadra==='function') dbUpsertQuadra(id); }catch(e){}
  endDraw(); editId=id; render(); buildEditPanel();
  /* leva o mapa até ele: nasceu longe da tela, ninguém vê */
  try{ if(_map) _map.setView(ponto, Math.max(_map.getZoom()||16, 17)); }catch(e){}
  /* NÃO abre openE aqui: aquilo é o formulário de cultura/cultivar/plantio, que
     não existe em laboratório — ele cobria o mapa e escondia o marcador novo. */
  alert('Laboratório "'+p.nome+'"'+(p.labTipo?' ('+p.labTipo+')':'')+' criado ('+origem+').\n\nEstá no mapa como 🧪, no centro da tela. Em modo de edição dá para arrastar o marcador.');
}

function startDrawQuadra(){
  if(!editMode) return;
  drawMode=true; drawPts=[]; editId=null;
  if(_map){ _map.on('click', onDrawClick); _map.getContainer().style.cursor='crosshair'; }
  buildEditPanel(); render();
}
function onDrawClick(e){ if(!drawMode) return; drawPts.push([e.latlng.lat, e.latlng.lng]); drawDrawingPreview(); buildEditPanel(); }
function drawDrawingPreview(){
  if(!_editLayer) return;
  _editLayer.clearLayers();
  if(drawPts.length>=2) LF.polyline(drawPts,{color:'#ffce00',weight:2,dashArray:'4,4',interactive:false}).addTo(_editLayer);
  drawPts.forEach(function(ll){ LF.marker(ll,{interactive:false,icon:LF.divIcon({className:'v-handle',html:'<div></div>',iconSize:[14,14],iconAnchor:[7,7]})}).addTo(_editLayer); });
}
function finishDrawQuadra(){
  if(drawPts.length<3){ alert('Clique pelo menos 3 pontos no mapa para formar a quadra.'); return; }
  var nome=prompt('Nome da nova quadra (ex.: A1):'); if(nome===null) return; nome=String(nome).trim(); if(!nome) return;
  ensureLocais();
  /* o nome deve ser \u00fanico DENTRO do local ativo \u2014 pode repetir em outro local */
  var dup=quadrasDoLocal(localAtivo).some(function(q){ return quadraNome(q).toLowerCase()===nome.toLowerCase(); });
  if(dup){ alert('J\u00e1 existe uma quadra chamada "'+nome+'" neste local.'); return; }
  var id=novoQuadraId(nome); /* id interno \u00fanico (mesmo se o nome repete em outro local) */
  QGEO[id]=drawPts.slice();
  QLOCAL[id]=localAtivo; _touchQLocal(id);
  QNOME[id]=nome; _touchQNome(id);
  if(!data[id]) data[id]={cultura:'',cultivar:'',plantio:'',area:null,estudos:[]};
  _touchQGEO(id); /* quadra nova: carimba agora -> vence aparelho zerado */
  saveQGEO(); saveQLocal(); saveQNome(); save();
  endDraw(); editId=id; render(); buildEditPanel();
  if(typeof openE==='function') openE(id);
}
function endDraw(){ drawMode=false; drawPts=[]; if(_map){ _map.off('click', onDrawClick); _map.getContainer().style.cursor=''; } }
function cancelDrawQuadra(){ endDraw(); if(_editLayer)_editLayer.clearLayers(); render(); buildEditPanel(); }
function deleteQuadra(){
  if(!editId) return;
  var id=editId, nome=quadraNome(id);
  requireDeletePassword('Excluir a quadra "'+nome+'" e todos os dados dela.', function(){
    safetyBackup('antes de excluir quadra '+nome);
    delete QGEO[id]; if(data[id]) delete data[id];
    ensureLocais(); delete QLOCAL[id]; if(QNOME) delete QNOME[id];
    _delQuadras[id]=Date.now(); saveDelTombs(); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('quadras',id); }catch(e){} /* tombstone + Etapa 3 soft-delete */
    _cloudAllowShrink=true; /* exclusão intencional (merge preserva o que outro aparelho adicionou) */
    saveQLocal(); saveQNome();
    saveQGEO(); save(); editId=null; render(); buildEditPanel(); updateAgendaBadge();
  });
}
function trocarTipoQuadra(tipo){
  if(!editId) return;
  if(setQuadraTipo(editId,tipo)){ render(); buildEditPanel(); }
}
function trocarLabTipo(t){
  if(!editId) return;
  if(setQuadraLabTipo(editId,t)){ render(); buildEditPanel(); }
}
function buildEditPanel(){
  var p=document.getElementById('edPanel');
  if(!p){ p=document.createElement('div'); p.id='edPanel'; p.className='gr-panel'; document.body.appendChild(p); }
  var html='<div class="gr-title">&#9999;&#65039; EDITAR QUADRAS</div>';
  if(_labPick){
    html+='<div class="gr-hint">Toque no <b>mapa</b>, em cima do pr&eacute;dio do laborat&oacute;rio'+
      (_labPend?' <b>'+esc(_labPend.nome)+'</b>':'')+'. D&aacute; para arrastar o marcador depois.</div>'+
      '<div class="gr-btns"><button class="gr-cancel" onclick="labCancelar()">Cancelar</button></div>';
    p.innerHTML=html; p.style.display='block'; return;
  }
  if(drawMode){
    html+='<div class="gr-hint">Clique no mapa para marcar os <b>cantos</b> da nova quadra (m&iacute;nimo 3).</div>'+
      '<div class="gr-btns"><button class="gr-ok" onclick="finishDrawQuadra()">Concluir ('+drawPts.length+' pts)</button><button class="gr-cancel" onclick="cancelDrawQuadra()">Cancelar</button></div>';
  } else if(editId){
    var _lab=isQuadraLab(editId);
    html+='<div class="gr-hint">Editando <b>'+esc(quadraNome(editId))+'</b>. '+
      (_lab?'Quadra de <b>laborat&oacute;rio</b>: sem pol&iacute;gono. Arraste o marcador 🧪 para posicionar o lab. (Salva sozinho.)'
           :'Arraste os <b>pontos amarelos</b>; clique no <b>+</b> para inserir; <b>duplo-clique</b> remove. Clique em outra quadra para troc&aacute;-la. (Salva sozinho.)')+'</div>'+
      '<div class="gr-tipo"><span class="gr-tipo-lbl">Tipo</span>'+
        '<button class="gr-tipo-op'+(_lab?'':' on')+'" onclick="trocarTipoQuadra(\'campo\')">🗺️ Campo</button>'+
        '<button class="gr-tipo-op'+(_lab?' on':'')+'" onclick="trocarTipoQuadra(\'lab\')">🧪 Laborat&oacute;rio</button></div>'+
      (_lab?('<div class="gr-tipo"><span class="gr-tipo-lbl">Lab</span>'+
        LAB_TIPOS.map(function(t){
          var on=(quadraLabTipo(editId)===t);
          return '<button class="gr-tipo-op'+(on?' on':'')+'"'+(on?' style="background:'+labTipoCor(t)+';border-color:'+labTipoCor(t)+';color:#fff"':'')+
                 ' onclick="trocarLabTipo(\''+t+'\')">'+t+'</button>';
        }).join('')+'</div>'):'')+
      '<div class="gr-btns"><button class="gr-ok" onclick="novaQuadraTipo()">&#43; Nova</button><button class="gr-reset" onclick="deleteQuadra()">&#128465; Excluir</button><button class="gr-cancel" onclick="toggleQuadraEdit()">Concluir</button></div>';
  } else {
    html+='<div class="gr-hint">Clique numa <b>quadra</b> para ajustar os v&eacute;rtices ou trocar o tipo, ou crie uma <b>nova</b>. Tudo salva automaticamente.</div>'+
      '<div class="gr-btns"><button class="gr-ok" onclick="novaQuadraTipo()">&#43; Nova quadra</button><button class="gr-cancel" onclick="toggleQuadraEdit()">Concluir</button></div>';
  }
  p.innerHTML=html; p.style.display='block';
}

/* ===== Nuvem (Supabase): dados compartilhados + tempo real ===== */
/* Supabase DESATIVADO — o app migrou para Firebase/Firestore. O firebase-sync.js sobrescreve
   cloudInit/doLogin/save/sync/admin, e _dwOn() (dual-write) é forçado false. As credenciais foram
   ZERADAS de propósito: a camada Supabase do index.html é código morto, e zerar a URL impede que,
   se o firebase-sync.js falhar ao carregar, o cloudInit caia silenciosamente no banco Supabase
   ANTIGO (split-brain — sincronizaria os dados para o lugar errado). Limpeza completa do código
   morto SB.* fica para uma refatoração dedicada. */
var SUPABASE_URL='';
var SUPABASE_ANON='';
var SB=null, _cloudApplying=false, _cloudTimer=null, _cloudCh=null, _cloudReady=false, _cloudPending=null;
/* _cloudRev: revisão monotônica do documento (evita aplicar/empurrar estado mais antigo).
   _cloudInitDone: só permite ESCREVER na nuvem DEPOIS de ter LIDO ela uma vez
   (impede que um cliente recém-aberto, com dados velhos, atropele a nuvem). */
var _cloudRev=null, _cloudInitDone=false, _cloudWatchdog=null;
var _unsavedChanges=false;
try{ _unsavedChanges=(localStorage.getItem('iracema-unsaved')==='true'); }catch(e){}
function setUnsavedChanges(val){
  _unsavedChanges=val;
  try{ localStorage.setItem('iracema-unsaved', val?'true':'false'); }catch(e){}
}
function cloudInit(){ if(SB) return SB; try{ if(window.supabase && SUPABASE_URL) SB=window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON); }catch(e){ SB=null; } return SB; }
function cloudState(){
  ensureQGEO(); ensureLocais(); ensureNotas(); ensureCfgTS();
  return {
    data:data,
    qgeo:QGEO,
    qgeots:(QGEO_TS||{}),
    georef:_geo,
    georefts:(GEOREF_TS||0),
    locais:LOCAIS,
    qlocal:QLOCAL,
    qnome:QNOME,
    qnomets:(QNOME_TS||{}),
    qlocalts:(QLOCAL_TS||{}),
    locaists:(LOCAIS_TS||{}),
    randomizacoes:RZLIB,
    _deletedQuadras:_delQuadras,
    _deletedLocais:_delLocais,
    notas_campo:NOTAS_CAMPO,
    _deletedNotas:_delNotas,
    rev:(_cloudRev||0)
  };
}
/* Indicador visível de sincronização (toque = forçar sync) */
function cloudBadge(kind,txt){
  if(!document.getElementById('cloudBadgeCss')){
    var s=document.createElement('style'); s.id='cloudBadgeCss';
    s.textContent='.cloud-badge{position:fixed;left:50%;transform:translateX(-50%);bottom:78px;z-index:900;font:600 11px/1 -apple-system,system-ui,sans-serif;letter-spacing:.3px;padding:6px 13px;border-radius:999px;color:#cfe0d4;background:rgba(15,21,18,.9);border:1px solid #26322b;box-shadow:0 6px 22px rgba(0,0,0,.46);cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:opacity .5s;user-select:none}.cb-saved{opacity:.62}.cb-saving{color:#bff3d4}.cb-error{color:#ffb3a8;border-color:#7a2b22;opacity:1}.cb-offline{color:#dccd8c;border-color:#5a4d1f;opacity:1}';
    document.head.appendChild(s);
  }
  var el=document.getElementById('cloudBadge');
  if(!el){ el=document.createElement('div'); el.id='cloudBadge'; el.title='Toque para salvar na nuvem agora'; el.onclick=function(){ try{ if(_unsavedChanges && typeof cloudSave==='function'){ cloudBadge('saving'); cloudSave(); } else if(typeof cloudResync==='function'){ cloudResync(); } }catch(e){} }; document.body.appendChild(el); }
  var L={saving:'↻ salvando na nuvem…', error:'⚠ não subiu — toque p/ salvar', offline:'⌁ salvo no aparelho · sem internet', idle:''};
  kind=kind||'idle';
  clearTimeout(window._cbHideT); clearTimeout(window._cbShowT);
  function _paint(){ el.className='cloud-badge cb-'+kind; el.textContent=(L[kind]||'')+(txt?(' '+txt):''); el.style.display='block'; el.style.opacity='1'; }
  if(kind==='error' || kind==='offline'){
    _paint(); /* SÓ problema real fica visível (tocável p/ tentar salvar). Nada de "salvando/salvo". */
  } else {
    /* salvando / salvo / idle => SEMPRE invisível — acaba o piscar de vez, mesmo em conexão lenta/iPad */
    el.style.display='none';
  }
}
function cloudApply(st){
  if(!st) return;
  /* não atropela edição de quadra em andamento — guarda e aplica ao terminar */
  if(window._qEditing || window._avEditing){ _cloudPending=st; return; }
  /* não aplica um estado MAIS ANTIGO sobre um mais novo (protege de push obsoleto/realtime) */
  if(st.rev!=null && _cloudRev!=null && st.rev < _cloudRev){ return; }
  if(_unsavedChanges){
    st=cloudMerge(cloudState(), st);
    setTimeout(cloudSaveSoon, 50);
  }
  _cloudApplying=true;
  try{
    if(st.rev!=null) _cloudRev=st.rev;
    if(st.data && typeof st.data==='object'){ data=st.data; try{ localStorage.setItem("iracema-v7", JSON.stringify(data)); }catch(e){} }
    if(st.qgeo && typeof st.qgeo==='object'){ QGEO=st.qgeo; saveQGEO(); }
    if(st.qgeots && typeof st.qgeots==='object'){ QGEO_TS=st.qgeots; saveQGEOTS(); }
    if(st.georef){ _geo=st.georef; saveGeoref(_geo); }
    if(st.georefts!=null){ GEOREF_TS=st.georefts; saveGeorefTS(); }
    if(st.locais && typeof st.locais==='object'){ LOCAIS=st.locais; try{ localStorage.setItem(LOCAIS_KEY, JSON.stringify(LOCAIS)); }catch(e){} }
    if(st.qlocal && typeof st.qlocal==='object'){ QLOCAL=st.qlocal; try{ localStorage.setItem(QLOCAL_KEY, JSON.stringify(QLOCAL)); }catch(e){} }
    if(st.qnome && typeof st.qnome==='object'){ QNOME=st.qnome; try{ localStorage.setItem(QNOME_KEY, JSON.stringify(QNOME)); }catch(e){} }
    if(st.qnomets && typeof st.qnomets==='object'){ QNOME_TS=st.qnomets; }
    if(st.qlocalts && typeof st.qlocalts==='object'){ QLOCAL_TS=st.qlocalts; }
    if(st.locaists && typeof st.locaists==='object'){ LOCAIS_TS=st.locaists; }
    saveCfgTS();
    if(Array.isArray(st.randomizacoes)){ RZLIB=normalizeRZLib(st.randomizacoes); try{ localStorage.setItem(RZLIB_KEY, JSON.stringify(RZLIB)); }catch(e){} }
    if(st._deletedQuadras && typeof st._deletedQuadras==='object'){ _delQuadras=_mergeObj(_delQuadras, st._deletedQuadras); }
    if(st._deletedLocais && typeof st._deletedLocais==='object'){ _delLocais=_mergeObj(_delLocais, st._deletedLocais); }
    if(st.notas_campo && Array.isArray(st.notas_campo)){ NOTAS_CAMPO=st.notas_campo; try{ localStorage.setItem(NOTAS_CAMPO_KEY, JSON.stringify(NOTAS_CAMPO)); }catch(e){} }
    if(st._deletedNotas && typeof st._deletedNotas==='object'){ _delNotas=_mergeObj(_delNotas, st._deletedNotas); try{ localStorage.setItem(DELN_KEY, JSON.stringify(_delNotas)); }catch(e){} }
    saveDelTombs();
    if(QGEO){ Object.keys(QGEO).forEach(function(id){ if(!data[id]) data[id]={cultura:'',cultivar:'',plantio:'',area:null,estudos:[]}; }); }
    ensureLocais(); if(typeof buildLocalChip==='function') buildLocalChip();
    render(); if(typeof updateAgendaBadge==='function') updateAgendaBadge();
    enforceAccess();
  }catch(e){}
  _cloudApplying=false;
}
function cloudApplyPending(){ if(_cloudPending && !window._qEditing){ var p=_cloudPending; _cloudPending=null; cloudApply(p); } }
var _cloudAllowShrink=false; /* exclusão de quadra/local: merge preserva adições de outros + tombstone remove o alvo */
var _cloudReplace=false; /* restauração/import: grava o estado como está (substitui, sem merge) */
/* Tombstones de exclusão de QUADRA/LOCAL — deletar SEM perder o que outro aparelho adicionou. */
var DELQ_KEY="iracema-delq-v1", DELL_KEY="iracema-dell-v1";
var _delQuadras=(function(){try{return JSON.parse(localStorage.getItem(DELQ_KEY)||'{}')||{};}catch(e){return {};}})();
var _delLocais=(function(){try{return JSON.parse(localStorage.getItem(DELL_KEY)||'{}')||{};}catch(e){return {};}})();
function saveDelTombs(){ try{ localStorage.setItem(DELQ_KEY,JSON.stringify(_delQuadras)); localStorage.setItem(DELL_KEY,JSON.stringify(_delLocais)); }catch(e){} }
/* ===== Merge por entidade: une quadras/estudos/aplicações/avaliações por id, p/ NÃO perder
   o que outro aparelho adicionou quando dois salvam quase ao mesmo tempo. ===== */
/* Item RECRIADO depois da exclusão sobrevive à lápide — mesma regra que qViva() usa para quadras.
   Sem isso, ids determinísticos (avaliação auto_<data>) nascem já condenados: basta a data ter
   sido excluída uma vez para toda avaliação futura daquela data sumir no primeiro merge. */
function _vivoTomb(x,deleted){
  var t=deleted[x.id];
  if(!t) return true;
  return (x._ts||0) > t;
}
function _mergeById(la,ca,mergeFn,deleted){
  deleted=deleted||{};
  la=la||[]; ca=ca||[]; var byId={}, order=[];
  ca.forEach(function(x){ if(x&&x.id&&_vivoTomb(x,deleted)){ if(!byId[x.id])order.push(x.id); byId[x.id]=x; } });
  la.forEach(function(x){ if(!x||!x.id||!_vivoTomb(x,deleted))return; if(byId[x.id]){ byId[x.id]=mergeFn?mergeFn(x,byId[x.id]):x; } else { order.push(x.id); byId[x.id]=x; } });
  return order.map(function(id){ return byId[id]; });
}
function _mergeObj(a,b){ var o={},k; if(b)for(k in b)o[k]=b[k]; if(a)for(k in a)o[k]=a[k]; return o; }
/* Lista de autorizados (BPL): UNIÃO por email — acumula e NUNCA some por aparelho zerado. 'delUsers' = lápides p/ remover. */
function _mergeDelUsers(a,b){ var o={},k; a=a||{}; b=b||{}; for(k in b)o[k]=b[k]; for(k in a){ o[k]=Math.max(o[k]||0, a[k]||0); } return o; }
function _mergeAllowedUsers(la,ca,del){
  la=Array.isArray(la)?la:[]; ca=Array.isArray(ca)?ca:[]; del=del||{};
  var by={}; function add(u){ if(!u||typeof u.email!=='string')return; var e=u.email.toLowerCase().trim(); if(!e)return; var ex=by[e]; if(!ex||(u.addedAt||0)>(ex.addedAt||0)) by[e]=u; }
  ca.forEach(add); la.forEach(add);
  var out=[]; Object.keys(by).forEach(function(e){ var u=by[e]; if((u.addedAt||0) >= (del[e]||0)) out.push(u); }); return out;
}
function _mergeRZLib(a,b){ return normalizeRZLib((b||[]).concat(a||[])); }
function _markDeleted(o,key,id){ if(!o||!id)return; if(!o[key]||typeof o[key]!=='object')o[key]={}; o[key][id]=Date.now(); }
/* Merge de UMA avaliação: une variáveis/tipos e notas por parcela/tratamento e variável.
   Células com metadado usam a edição mais recente; vazio antigo não apaga valor novo. */
function _mergeAval(la,ca){
  /* campos escalares (data/tipo/bbch/obs): a edição mais NOVA vence; empate/sem carimbo: local (compat) */
  var _lt=la._ts||0, _ct=ca._ts||0, m={},k;
  if(_ct>_lt){ for(k in la)m[k]=la[k]; for(k in ca)m[k]=ca[k]; }
  else { for(k in ca)m[k]=ca[k]; for(k in la)m[k]=la[k]; }
  if(_lt||_ct) m._ts=Math.max(_lt,_ct);
  var vars=(ca.variaveis||[]).slice();
  (la.variaveis||[]).forEach(function(v){ if(vars.indexOf(v)<0) vars.push(v); });
  m.variaveis=vars;
  var tipos={},t; for(t in (ca.tipos||{}))tipos[t]=ca.tipos[t]; for(t in (la.tipos||{}))tipos[t]=la.tipos[t]; m.tipos=tipos;
  var vcfg={},vc; for(vc in (ca.varcfg||{}))vcfg[vc]=ca.varcfg[vc]; for(vc in (la.varcfg||{}))vcfg[vc]=la.varcfg[vc]; m.varcfg=vcfg;
  var cN=ca.notas||{}, lN=la.notas||{}, cM=ca.notasMeta||{}, lM=la.notasMeta||{}, trats={}, tr;
  var cB=ca.bruto||{}, lB=la.bruto||{};
  for(tr in cN)trats[tr]=1; for(tr in lN)trats[tr]=1; for(tr in cM)trats[tr]=1; for(tr in lM)trats[tr]=1;
  for(tr in cB)trats[tr]=1; for(tr in lB)trats[tr]=1;
  var notas={}, metas={}, brutos={};
  function mts(meta,row,v){ var x=meta&&meta[row]&&meta[row][v]; return parseInt(x&&x.ts)||0; }
  function newerMeta(row,v){
    var cm=cM&&cM[row]&&cM[row][v], lm=lM&&lM[row]&&lM[row][v];
    if((parseInt(lm&&lm.ts)||0)>=(parseInt(cm&&cm.ts)||0)) return lm||cm||null;
    return cm||lm||null;
  }
  Object.keys(trats).forEach(function(tr){
    var cr=cN[tr]||{}, lr=lN[tr]||{}, cols={}, row={}, metaRow={}, brutoRow={}, vv;
    for(vv in cr)cols[vv]=1; for(vv in lr)cols[vv]=1;
    if(cM[tr])for(vv in cM[tr])cols[vv]=1; if(lM[tr])for(vv in lM[tr])cols[vv]=1;
    if(cB[tr])for(vv in cB[tr])cols[vv]=1; if(lB[tr])for(vv in lB[tr])cols[vv]=1;
    Object.keys(cols).forEach(function(v){
      var hasC=Object.prototype.hasOwnProperty.call(cr,v), hasL=Object.prototype.hasOwnProperty.call(lr,v);
      var cv=hasC?cr[v]:undefined, lv=hasL?lr[v]:undefined, ct=mts(cM,tr,v), lt=mts(lM,tr,v);
      var src=null;
      if(lt||ct){
        if(lt>=ct && hasL) src='l';
        else if(hasC) src='c';
        else if(hasL) src='l';
      }else if(lv!==''&&lv!=null) src='l';
      else if(cv!==undefined) src='c';
      else if(hasL) src='l';
      if(src==='l') row[v]=lv; else if(src==='c') row[v]=cv;
      /* o BRUTO acompanha o lado que venceu a célula (o carimbo de _avTouchCell cobre os dois).
         Se o vencedor não trouxe bruto, herda o do outro — não joga fora sub-amostra de um
         aparelho só porque o outro mexeu no derivado. */
      var lb=(lB[tr]||{})[v], cb=(cB[tr]||{})[v];
      var b=(src==='c')?((cb!==undefined)?cb:lb):((lb!==undefined)?lb:cb);
      if(b!==undefined) brutoRow[v]=b;
      var mm=newerMeta(tr,v); if(mm) metaRow[v]=mm;
    });
    notas[tr]=row;
    if(Object.keys(metaRow).length) metas[tr]=metaRow;
    if(Object.keys(brutoRow).length) brutos[tr]=brutoRow;
  });
  m.notas=notas;
  m.notasMeta=metas;
  m.bruto=brutos;
  return m;
}
/* Aplicação: a edição mais NOVA vence o item inteiro (empate/sem carimbo: local, compat) */
function _mergeAplicacao(la,ca){ return ((ca&&ca._ts)||0)>((la&&la._ts)||0) ? ca : la; }
function _mergeStudy(ls,cs){
  /* escalares do estudo: a edição mais NOVA vence; empate/sem carimbo: local (compat) */
  var lt=ls._ts||0, ct=cs._ts||0, m={},k;
  if(ct>lt){ for(k in ls)m[k]=ls[k]; for(k in cs)m[k]=cs[k]; }
  else { for(k in cs)m[k]=cs[k]; for(k in ls)m[k]=ls[k]; }
  if(lt||ct) m._ts=Math.max(lt,ct);
  var delAp=_mergeObj(ls._deletedAplicacoes,cs._deletedAplicacoes), delAv=_mergeObj(ls._deletedAvaliacoes,cs._deletedAvaliacoes);
  m._deletedAplicacoes=delAp; m._deletedAvaliacoes=delAv;
  m.aplicacoes=_mergeById(ls.aplicacoes,cs.aplicacoes,_mergeAplicacao,delAp);
  m.avaliacoes=_mergeById(ls.avaliacoes,cs.avaliacoes,_mergeAval,delAv);
  if(!(ls.tratamentos&&ls.tratamentos.length)&&(cs.tratamentos&&cs.tratamentos.length)) m.tratamentos=cs.tratamentos;
  return m;
}
function _mergeNota(la,ca){
  /* a edição mais NOVA vence (permite REABRIR nota resolvida); empate/sem carimbo: local + resolvida vence (compat) */
  var lt=la._ts||0, ct=ca._ts||0, m={}, k;
  if(ct>lt){ for(k in la)m[k]=la[k]; for(k in ca)m[k]=ca[k]; }
  else { for(k in ca)m[k]=ca[k]; for(k in la)m[k]=la[k]; }
  if(lt||ct) m._ts=Math.max(lt,ct);
  else m.resolvido = la.resolvido || ca.resolvido;
  if(!m.foto) m.foto = la.foto || ca.foto;
  return m;
}
function cloudMerge(local,cloud){
  if(!cloud) return local; if(!local) return cloud;
  var out={};
  var delQ=_mergeObj(local._deletedQuadras,cloud._deletedQuadras)||{};
  var delL=_mergeObj(local._deletedLocais,cloud._deletedLocais)||{};
  var delN=_mergeObj(local._deletedNotas,cloud._deletedNotas)||{};
  out._deletedQuadras=delQ; out._deletedLocais=delL; out._deletedNotas=delN;
  function strip(obj,tomb){ var o={},k; for(k in (obj||{})){ if(!tomb[k]) o[k]=obj[k]; } return o; }
  var _mq=_mergeQGEO(local.qgeo,cloud.qgeo,local.qgeots,cloud.qgeots,delQ); out.qgeo=_mq.geo; out.qgeots=_mq.ts; /* mapa: vale o mais recente por quadra */
  function qViva(id){ return !delQ[id] || ((_mq.ts[id]||0) > delQ[id]); } /* recriada DEPOIS da exclusão: viva (lápide não engole) */
  function stripQ(obj){ var o={},k; for(k in (obj||{})){ if(qViva(k)) o[k]=obj[k]; } return o; }
  /* nomes/locais das quadras e cadastro de locais: a edição mais NOVA vence por id (empate/sem carimbo => nuvem) */
  var _mn=_mergeMapTS(local.qnome,cloud.qnome,local.qnomets,cloud.qnomets);
  var _ml=_mergeMapTS(local.qlocal,cloud.qlocal,local.qlocalts,cloud.qlocalts);
  var _mlo=_mergeMapTS(local.locais,cloud.locais,local.locaists,cloud.locaists);
  out.qnome=stripQ(_mn.map); out.qnomets=stripQ(_mn.ts);
  out.qlocal=stripQ(_ml.map); out.qlocalts=stripQ(_ml.ts);
  out.locais=strip(_mlo.map,delL); out.locaists=strip(_mlo.ts,delL);
  out.randomizacoes=_mergeRZLib(local.randomizacoes,cloud.randomizacoes);
  var _lgt=local.georefts||0,_cgt=cloud.georefts||0; out.georef=(_lgt>_cgt)?(local.georef||cloud.georef):(cloud.georef||local.georef); out.georefts=Math.max(_lgt,_cgt); /* georef: mais recente vence (empate => nuvem) */
  out.notas_campo = _mergeById(local.notas_campo, cloud.notas_campo, _mergeNota, delN);
  out.data={};
  var ids={},k; for(k in (cloud.data||{}))ids[k]=1; for(k in (local.data||{}))ids[k]=1;
  Object.keys(ids).forEach(function(qid){
    if(!qViva(qid)) return; /* quadra excluída: não ressuscita pelo merge (recriada depois, sobrevive) */
    var lq=(local.data||{})[qid], cq=(cloud.data||{})[qid];
    if(!lq){ out.data[qid]=cq; return; } if(!cq){ out.data[qid]=lq; return; }
    if(qid === '__config'){
      var isAdmin = false;
      var email = (typeof _authUser !== 'undefined' && _authUser && _authUser.email) ? _authUser.email : null;
      var admEmail = (cq && cq.adminEmail) || 'machadovictorchaves@gmail.com';
      if(email && (email.toLowerCase().trim() === admEmail.toLowerCase().trim() || email.toLowerCase().trim() === 'machadovictorchaves@gmail.com')){
        isAdmin = true;
      }
      if(window._adminUnlocked) isAdmin = true; /* destravou o painel com a senha -> autoridade do admin nesta sessão */
      var cfg = isAdmin ? _mergeObj(lq, cq) : _mergeObj(cq, lq); /* escalares (adminEmail/senha) por papel */
      cfg.delUsers = _mergeDelUsers(lq.delUsers, cq.delUsers);
      cfg.allowedUsers = _mergeAllowedUsers(lq.allowedUsers, cq.allowedUsers, cfg.delUsers); /* UNIÃO: nunca perde autorizado, mesmo abrindo aparelho/domínio zerado */
      out.data[qid] = cfg;
      return;
    }
    /* campos da quadra (cultura/cultivar/plantio/área): a edição mais NOVA vence.
       Sem carimbo (legado), NUVEM vence — aparelho parado não atropela o que os outros mudaram. */
    var lts2=lq._ts||0, cts2=cq._ts||0, base=(lts2>cts2)?cq:lq, top=(lts2>cts2)?lq:cq;
    var m={},kk; for(kk in base)m[kk]=base[kk]; for(kk in top)m[kk]=top[kk];
    if(lts2||cts2) m._ts=Math.max(lts2,cts2);
    var delS=_mergeObj(lq._deletedStudies,cq._deletedStudies); m._deletedStudies=delS;
    m.estudos=_mergeById(lq.estudos,cq.estudos,_mergeStudy,delS);
    out.data[qid]=m;
  });
  return out;
}
function cloudSave(){
  if(!cloudInit() || _cloudApplying || !_cloudInitDone) return; /* só escreve depois de ter lido a nuvem */
  if(window._cloudSavingActive){
    clearTimeout(_cloudTimer);
    _cloudTimer=setTimeout(cloudSave, 500);
    return;
  }
  cloudBadge('saving');
  var allowShrink=_cloudAllowShrink; _cloudAllowShrink=false;
  var replace=_cloudReplace; _cloudReplace=false;
  _cloudSaveAttempt(allowShrink, replace, 0);
}
/* Gravação com RETRY (concorrência otimista): relê a nuvem, faz MERGE preservando o local e grava.
   Se o banco RECUSA (revisão já avançou em outro aparelho), RE-TENTA — relê, re-merge e regrava —
   sem perder o que foi digitado aqui. Só desiste após várias falhas (aí puxa a versão boa).
   - allowShrink (exclusão de quadra/local): TAMBÉM faz merge (com tombstones); só sinaliza ao banco que pode encolher.
   - replace (restauração/import): grava o estado como está, sem merge. */
function _cloudSaveAttempt(allowShrink, replace, tries){
  if(!cloudInit()){ cloudBadge('error'); window._cloudSavingActive=false; return; }
  var localState=cloudState();
  window._cloudSavingActive=true;
  /* WATCHDOG: se a requisição travar (sinal cai no campo e a conexão estola sem resolver nem rejeitar),
     destrava sozinho em ~15s em vez de deixar o botão Salvar morto pra sempre. Os dados continuam no
     aparelho (localStorage); isto só liberta o checkpoint pra nuvem. Cada etapa de rede renova a janela. */
  function _armWd(){ clearTimeout(_cloudWatchdog); _cloudWatchdog=setTimeout(function(){ if(window._cloudSavingActive){ window._cloudSavingActive=false; cloudBadge('error','— toque p/ tentar'); } }, (window._cloudWdMs||15000)); }
  _armWd();
  try{
    SB.from('app_state').select('state').eq('id',1).single().then(function(res){
      _armWd(); /* select voltou: renova a janela p/ a etapa de update */
      var cs = res && res.data && res.data.state;
      var cRev = (cs && cs.rev!=null) ? cs.rev : 0;
      var toSave = (replace || !cs) ? localState : cloudMerge(localState, cs);
      var newRev = (cRev||0)+1; toSave.rev=newRev;
      if(allowShrink || replace) toSave._allowShrink=true; /* avisa o banco: encolhimento é intencional */
      if(cs){ try{ cloudApply(toSave); }catch(e){} } /* reflete o estado a gravar e mantém o local p/ a próxima tentativa */
      SB.from('app_state').update({ state: toSave, updated_at:new Date().toISOString() }).eq('id',1)
        .then(function(r2){
          if(r2 && r2.error){
            /* banco RECUSOU (rev velha/conflito) -> re-tenta do zero (relê+merge+regrava), preservando o local */
            if(tries<4){ cloudBadge('saving'); setTimeout(function(){ _cloudSaveAttempt(allowShrink, replace, tries+1); }, 250+tries*300); }
            else { window._cloudSavingActive=false; cloudBadge('error','— toque p/ tentar'); setTimeout(function(){ try{ cloudPull(); }catch(e){} }, 800); }
          } else { window._cloudSavingActive=false; _cloudRev=newRev; setUnsavedChanges(false); cloudBadge('saved'); }
        }, function(){ if(tries<4){ setTimeout(function(){ _cloudSaveAttempt(allowShrink, replace, tries+1); }, 400+tries*300); } else { window._cloudSavingActive=false; cloudBadge('error'); } });
    }, function(){ if(tries<3){ setTimeout(function(){ _cloudSaveAttempt(allowShrink, replace, tries+1); }, 500); } else { window._cloudSavingActive=false; cloudBadge('error'); } });
  }catch(e){ window._cloudSavingActive=false; cloudBadge('error'); }
}
function cloudSaveSoon(){ setUnsavedChanges(true); if(_cloudApplying || !_cloudInitDone) return; cloudBadge('saving'); clearTimeout(_cloudTimer); _cloudTimer=setTimeout(cloudSave, 900); }
function cloudSyncNow(){ if(!cloudInit()) return; clearTimeout(_cloudTimer); cloudSave(); }
/* Puxa o estado atual da nuvem e aplica (não sobrescreve edição em andamento). */
function cloudPull(){
  if(!cloudInit()) return;
  cloudBadge('saving');
  try{
    SB.from('app_state').select('state').eq('id',1).single().then(function(res){
      var st = res && res.data && res.data.state;
      _cloudInitDone=true; /* já lemos a nuvem -> a partir de agora pode escrever */
      if(st && st.data && Object.keys(st.data).length){
        if(_unsavedChanges){
          var merged=cloudMerge(cloudState(), st);
          cloudApply(merged);
          cloudSaveSoon();
        } else {
          cloudApply(st);
          cloudBadge('saved');
        }
      } else {
        cloudBadge('saved');
      }
    }, function(){ cloudBadge('offline'); });
  }catch(e){ cloudBadge('offline'); }
}
/* Reconciliação ao voltar o foco / reconectar: se há mudança local pendente, empurra (ela vence);
   senão, puxa o mais recente da nuvem. E garante o realtime vivo. */
function cloudResync(){
  if(!cloudInit()) return;
  if(_rrOn()){ cloudReadRows().then(function(ok){ if(ok) cloudSubscribeRows(); }); return; } /* modo-linhas: relê das tabelas */
  if(!_cloudInitDone){ cloudPull(); cloudSubscribe(); return; } /* ainda não leu a nuvem -> só puxa */
  if(_cloudTimer){ cloudSyncNow(); }
  else { cloudPull(); }
  cloudSubscribe();
}
function cloudSubscribe(){
  if(!SB) return;
  try{
    if(_cloudCh){ try{ SB.removeChannel(_cloudCh); }catch(e){} _cloudCh=null; }
    _cloudCh=SB.channel('app_state_rt').on('postgres_changes', {event:'UPDATE', schema:'public', table:'app_state'}, function(p){
      if(p && p.new && p.new.state) cloudApply(p.new.state);
      else cloudPull(); /* estado grande demais p/ o payload do realtime: puxa por REST (senão o aparelho fica para trás em silêncio) */
    }).subscribe(function(status){
      if(status==='SUBSCRIBED'){ _cloudReady=true; cloudBadge('saved'); }
      else if(status==='CHANNEL_ERROR' || status==='TIMED_OUT' || status==='CLOSED'){ _cloudReady=false; cloudBadge('offline'); clearTimeout(window._cloudReTimer); window._cloudReTimer=setTimeout(cloudSubscribe, 4000); }
    });
  }catch(e){ cloudBadge('offline'); }
}
/* ===================== LOGIN (Supabase Auth) ===================== */
var _authUser=null, _appStarted=false;
function authBusy(b){ var btn=document.getElementById('authBtn'); if(btn){ btn.disabled=!!b; btn.textContent=b?'Entrando…':'Entrar'; } }
function authErr(msg){ var e=document.getElementById('authErr'); if(e){ e.textContent=msg||''; e.style.display=msg?'block':'none'; } }
function traduzAuthErro(m){ m=String(m||'');
  if(/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if(/Email not confirmed/i.test(m)) return 'E-mail ainda não confirmado. Fale com o administrador.';
  if(/network|fetch|Failed/i.test(m)) return 'Sem conexão com o servidor. Tente de novo.';
  return m; }
function _authCss(){ if(document.getElementById('authCss'))return; var s=document.createElement('style'); s.id='authCss';
  s.textContent='.auth-gate{position:fixed;inset:0;z-index:3000;background:radial-gradient(120% 90% at 50% 0%,#fbfbfc,#eef0f2 58%,#e4e7ea);display:none;align-items:center;justify-content:center;padding:20px}.auth-gate.on{display:flex}'+
  '.auth-box{width:100%;max-width:372px;background:#ffffff;border:1px solid #e2e5e8;border-radius:16px;box-shadow:0 24px 60px rgba(20,24,28,.12);padding:28px 24px;font-family:var(--font,system-ui)}'+
  '.auth-logo{font-size:11px;letter-spacing:1.2px;color:#1f242a;font-weight:850;text-align:center;text-transform:uppercase}'+
  '.auth-title{font-size:22px;font-weight:850;color:#16201b;text-align:center;margin:5px 0 2px}'+
  '.auth-sub{font-size:12px;color:#6c7770;text-align:center;margin-bottom:18px}'+
  '.auth-l{display:block;font-size:10px;letter-spacing:.8px;color:#59665f;font-weight:800;margin:13px 0 5px;text-transform:uppercase}'+
  '.auth-i{width:100%;box-sizing:border-box;background:#fff;border:1px solid #d8ded8;border-radius:10px;color:#18211d;padding:12px;font-size:15px;outline:none}'+
  '.auth-i:focus{border-color:rgba(31,36,42,.55);box-shadow:0 0 0 3px rgba(31,36,42,.10)}'+
  '.auth-btn{width:100%;margin-top:18px;border:none;border-radius:11px;padding:13px;font-size:15px;font-weight:800;cursor:pointer;background:linear-gradient(180deg,#2c323a,#1d2229);color:#fff}'+
  '.auth-btn:disabled{opacity:.6;cursor:default}'+
  '.auth-err{display:none;margin-top:12px;background:rgba(255,107,107,.12);border:1px solid #7a2b22;color:#ffb3a8;font-size:12px;padding:9px 11px;border-radius:9px;text-align:center}'+
  '.auth-foot{margin-top:16px;font-size:11px;color:var(--text-3,#6d7f73);text-align:center;line-height:1.5}';
  document.head.appendChild(s); }
function buildAuthGate(){
  _authCss();
  var g=document.getElementById('authGate');
  if(!g){ g=document.createElement('div'); g.id='authGate'; g.className='auth-gate'; document.body.appendChild(g); }
  g.innerHTML='<form class="auth-box" onsubmit="return false">'+
    '<div class="auth-logo">Agracta</div>'+
    '<div class="auth-title">Entrar</div>'+
    '<div class="auth-sub">Acesso restrito</div>'+
    '<label class="auth-l">E-MAIL</label><input id="authEmail" class="auth-i" type="email" autocomplete="username" inputmode="email" placeholder="voce@exemplo.com">'+
    '<label class="auth-l">SENHA</label><input id="authPass" class="auth-i" type="password" autocomplete="current-password" placeholder="••••••••">'+
    '<div id="authErr" class="auth-err"></div>'+
    '<button id="authBtn" class="auth-btn" onclick="doLogin()">Entrar</button>'+
    '<div class="auth-foot">Esqueceu a senha? Fale com o administrador.</div>'+
    '</form>';
  var p=document.getElementById('authPass'); if(p) p.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); doLogin(); } };
  var em=document.getElementById('authEmail'); if(em) em.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); var pp=document.getElementById('authPass'); if(pp) pp.focus(); } };
}
function showAuthGate(){ buildAuthGate(); var g=document.getElementById('authGate'); if(g) g.classList.add('on'); setTimeout(function(){ var em=document.getElementById('authEmail'); if(em&&!em.value) em.focus(); },60); }
function hideAuthGate(){ var g=document.getElementById('authGate'); if(g) g.classList.remove('on'); }
function doLogin(){
  if(!cloudInit()){ authErr('Sem conexão com o servidor.'); return; }
  var email=((document.getElementById('authEmail')||{}).value||'').trim();
  var pass=(document.getElementById('authPass')||{}).value||'';
  if(!email||!pass){ authErr('Preencha e-mail e senha.'); return; }
  authErr(''); authBusy(true);
  SB.auth.signInWithPassword({email:email, password:pass}).then(function(res){
    authBusy(false);
    if(res && res.error){ authErr(traduzAuthErro(res.error.message)); }
  }, function(){ authBusy(false); authErr('Falha de conexão.'); });
}
function clearLocalStorageData(){
  var keys = [
    'iracema-v7', 'iracema-safety', 'iracema-unsaved',
    'iracema-randomizacoes-v1', 'iracema-georef-v1', 'iracema-qgeo-v1', 'iracema-qgeots-v1', 'iracema-georefts-v1',
    'iracema-locais-v1', 'iracema-qlocal-v1', 'iracema-qnome-v1',
    'iracema-qnomets-v1', 'iracema-qlocalts-v1', 'iracema-locaists-v1',
    'iracema-local-ativo', 'iracema-notas-v1',
    'iracema-delq-v1', 'iracema-dell-v1', 'iracema-deln-v1'
  ];
  keys.forEach(function(k){
    try{ localStorage.removeItem(k); }catch(e){}
  });
  data = {};
}

function checkAccess(email){
  if(!email) return false;
  ensureConfig();
  var conf = data.__config;
  var admEmail = (conf.adminEmail || '').toLowerCase().trim();
  if(!admEmail) {
    conf.adminEmail = email.toLowerCase().trim();
    admEmail = conf.adminEmail;
    save();
  }
  if(email.toLowerCase().trim() === admEmail) {
    return true;
  }
  var allowed = conf.allowedUsers || [];
  var user = allowed.find(function(u){
    return u && typeof u.email === 'string' && u.email.toLowerCase().trim() === email.toLowerCase().trim();
  });
  return !!user;
}

function enforceAccess(){
  /* SEM TRAVA: o login virou só sessão/identidade. Ninguém é deslogado por "não autorizado" —
     acabou o "não permitido". A nuvem é a fonte da verdade. (Controle de acesso removido a pedido.) */
  return;
}

function doLogout(){
  if(typeof closeMainMenu==='function') closeMainMenu();
  /* NUNCA trava o usuário: se houver pendência, dispara a gravação e PERGUNTA — mas sempre deixa sair. */
  if(_cloudInitDone && _unsavedChanges){
    try{ if(typeof cloudSave==='function') cloudSave(); }catch(e){}
    if(!confirm('Pode haver dados ainda subindo pra nuvem. Sair mesmo assim?\n\n(Recomendado: toque em Cancelar, espere o selo "salvo na nuvem" e saia de novo.)')) return;
  }
  clearLocalStorageData();
  if(SB){ try{ SB.auth.signOut(); }catch(e){} }
}
function onAuthed(user){
  _authUser=user; hideAuthGate();
  if(!_appStarted){ _appStarted=true; cloudStart(); }
  else if(typeof cloudResync==='function'){ cloudResync(); }
  /* NÃO chama enforceAccess aqui: ele roda dentro do cloudApply, DEPOIS de ler a nuvem.
     Chamar aqui (síncrono) deslogaria um técnico recém-autorizado com a lista local ainda velha. */
}
/* Gate de login: só libera o app (e a leitura/escrita na nuvem) após autenticar.
   A sessão persiste no navegador (supabase) -> funciona offline no campo depois do 1º login. */
function authInit(){
  if(!cloudInit()){ if(!_appStarted){ _appStarted=true; if(typeof cloudStart==='function') cloudStart(); } return; }
  buildAuthGate();
  SB.auth.getSession().then(function(res){
    var session = res && res.data && res.data.session;
    if(session && session.user){ onAuthed(session.user); } else { showAuthGate(); }
  }, function(){ showAuthGate(); });
  SB.auth.onAuthStateChange(function(event, session){
    if(session && session.user){ onAuthed(session.user); }
    else { _authUser=null; showAuthGate(); }
  });
}
var _deletePwdCb=null;
function deletePasswordCss(){ if(document.getElementById('deletePwdCss'))return; var s=document.createElement('style'); s.id='deletePwdCss';
  s.textContent='.delpwd-ovl{position:fixed;inset:0;z-index:3600;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}'+
  '.delpwd-box{width:100%;max-width:380px;background:var(--surface,#101613);border:1px solid var(--border,#26322b);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.58);padding:18px;color:var(--text,#e8efe9);font-family:var(--font,system-ui)}'+
  '.delpwd-title{font-size:16px;font-weight:900;color:#ff9a8a;margin-bottom:5px}.delpwd-sub{font-size:12px;color:var(--text-2,#9fb1a5);line-height:1.45;margin-bottom:12px}.delpwd-user{font-weight:800;color:var(--text,#e8efe9)}'+
  '.delpwd-lab{display:block;font-size:10px;letter-spacing:.8px;color:var(--text-3,#7c8a80);font-weight:800;text-transform:uppercase;margin-bottom:5px}.delpwd-inp{width:100%;box-sizing:border-box;background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);border-radius:10px;color:var(--text,#e8efe9);padding:12px;font-size:15px;outline:none}.delpwd-inp:focus{border-color:var(--danger,#ff6b6b)}'+
  '.delpwd-err{min-height:18px;color:#ff9a8a;font-size:12px;margin-top:7px}.delpwd-actions{display:flex;gap:8px;margin-top:12px}.delpwd-ok{flex:1;background:#9b2c26;color:#fff;border:none;border-radius:10px;padding:11px;font-weight:900;cursor:pointer}.delpwd-ok:disabled{opacity:.6;cursor:default}.delpwd-cancel{background:#222;color:#bbb;border:none;border-radius:10px;padding:11px 14px;font-weight:800;cursor:pointer}';
  document.head.appendChild(s); }
function requireDeletePassword(label, cb, opts){
  opts=opts||{}; window._delPwdOkText=opts.ok||'Excluir';
  /* Firebase: o gate de confirmação depende só da identidade logada (_authUser),
     não mais do cliente Supabase (SB fica null após a migração). */
  if(!cloudInit()||!_authUser||!_authUser.email){ alert('Para confirmar, entre com sua conta e digite a senha.'); return; }
  deletePasswordCss(); _deletePwdCb=cb;
  var m=document.getElementById('deletePwdModal');
  if(!m){ m=document.createElement('div'); m.id='deletePwdModal'; m.className='delpwd-ovl'; m.onclick=function(e){ if(e.target===m) deletePasswordClose(); }; document.body.appendChild(m); }
  m.style.display='flex';
  m.innerHTML='<div class="delpwd-box">'+
    '<div class="delpwd-title">'+esc(opts.title||'Confirmar exclusão')+'</div>'+
    '<div class="delpwd-sub">'+esc(label||'Esta ação')+'<br>Digite a senha de <span class="delpwd-user">'+esc(_authUser.email)+'</span>.</div>'+
    '<label class="delpwd-lab">Senha</label><input id="deletePwdInput" class="delpwd-inp" type="password" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')deletePasswordConfirm()">'+
    '<div id="deletePwdErr" class="delpwd-err"></div>'+
    '<div class="delpwd-actions"><button id="deletePwdOk" class="delpwd-ok" onclick="deletePasswordConfirm()">'+esc(opts.ok||'Excluir')+'</button><button class="delpwd-cancel" onclick="deletePasswordClose()">Cancelar</button></div>'+
  '</div>';
  setTimeout(function(){ var i=document.getElementById('deletePwdInput'); if(i)i.focus(); },60);
}
function deletePasswordBusy(on){ var b=document.getElementById('deletePwdOk'); if(b){ b.disabled=!!on; b.textContent=on?'Verificando...':(window._delPwdOkText||'Excluir'); } }
function deletePasswordClose(){ var m=document.getElementById('deletePwdModal'); if(m)m.style.display='none'; _deletePwdCb=null; }
function deletePasswordConfirm(){
  var pass=(document.getElementById('deletePwdInput')||{}).value||'', err=document.getElementById('deletePwdErr');
  if(!pass){ if(err)err.textContent='Digite a senha.'; return; }
  deletePasswordBusy(true); if(err)err.textContent='';
  /* Reautentica no FIREBASE (o app migrou de Supabase). reauthenticateWithCredential confirma a
     senha sem derrubar a sessão; só então libera o callback de exclusão. */
  var ok=function(){ deletePasswordBusy(false); var cb=_deletePwdCb; deletePasswordClose(); if(typeof cb==='function') cb(); };
  var fail=function(e){ deletePasswordBusy(false);
    var code=(e&&(e.code||e.message))||'';
    if(/wrong-password|invalid-credential|invalid-login|INVALID_LOGIN_CREDENTIALS/i.test(code)) { if(err)err.textContent='Senha incorreta.'; }
    else if(/too-many-requests/i.test(code)) { if(err)err.textContent='Muitas tentativas. Aguarde um momento.'; }
    else if(/network/i.test(code)) { if(err)err.textContent='Falha de conexão ao validar a senha.'; }
    else { if(err)err.textContent=(typeof traduzAuthErro==='function'?traduzAuthErro(code):'Não foi possível validar a senha.'); }
  };
  try{
    var u=firebase.auth().currentUser;
    if(!u){ fail({code:'no-user'}); return; }
    var cred=firebase.auth.EmailAuthProvider.credential(_authUser.email||u.email, pass);
    u.reauthenticateWithCredential(cred).then(ok, fail);
  }catch(e){ fail(e); }
}
function cloudStart(){
  if(!cloudInit()){ return; }
  cloudBadge('saving');
  if(_rrOn()){
    /* Etapa 3 Fase C: fonte da verdade = tabelas por-linha (escrita segue dupla; blob = backup).
       Leitura inicial com RE-TENTATIVA (rede instável não pode deixar o app travado/vazio). */
    window._rrInitTries=0;
    (function _rrInit(){
      if(_cloudInitDone || !_rrOn()) return;
      function _retry(){ window._rrInitTries++; cloudBadge('offline'); if(window._rrInitTries<=30){ clearTimeout(window._rrInitT); window._rrInitT=setTimeout(_rrInit, Math.min(15000, 1200*window._rrInitTries)); } }
      try{ cloudReadRows().then(function(ok){ if(ok){ cloudSubscribeRows(); } else { _retry(); } }, function(){ _retry(); }); }catch(e){ _retry(); }
    })();
  } else {
  /* Leitura inicial do blob com RE-TENTATIVA: se a rede instável faz a leitura falhar
     (rejeição OU res.error tipo 'cannot coerce'/0 linhas transitório), NÃO inicializa e
     NÃO semeia (semear sobre leitura falha empurraria os 32 padrões — o trigger do servidor
     bloqueia, mas a tela ficava errada e travada). Re-tenta sozinha até conseguir, e assina
     o realtime mesmo offline p/ pegar quando voltar. */
  window._cloudInitTries=0;
  function _cloudInitRead(){
    if(_cloudInitDone || _rrOn()) return;
    function _retry(){ _cloudInitTries++; cloudBadge('offline'); cloudSubscribe(); if(_cloudInitTries<=30){ clearTimeout(window._cloudInitT); window._cloudInitT=setTimeout(_cloudInitRead, Math.min(15000, 1200*_cloudInitTries)); } }
    try{
      SB.from('app_state').select('state').eq('id',1).single().then(function(res){
        if(res && res.error){ _retry(); return; }            /* leitura falhou -> re-tenta, sem semear */
        var st = res && res.data && res.data.state;
        if(st && st.data && Object.keys(st.data).length){
          _cloudInitDone=true;
          if(_unsavedChanges){ var merged=cloudMerge(cloudState(), st); cloudApply(merged); cloudSaveSoon(); }
          else { cloudApply(st); cloudBadge('saved'); }
          cloudSubscribe();
        } else {
          /* leitura OK porém nuvem GENUINAMENTE vazia: só semeia se há dados locais REAIS
             (evita semear os 32 padrões de um aparelho zerado). */
          var nLocal=0; try{ nLocal=Object.keys((typeof data!=='undefined'?data:{})).filter(function(k){return k!=='__config';}).length; }catch(e){}
          if(nLocal>0 && _unsavedChanges){ _cloudInitDone=true; cloudSave(); cloudSubscribe(); }
          else { _retry(); } /* nuvem vazia + local sem mudança real -> não escreve; re-tenta (provável leitura ruim) */
        }
      }, function(){ _retry(); });                            /* rejeição de rede -> re-tenta */
    }catch(e){ _retry(); }
  }
  _cloudInitRead();
  }
  if(!window.__cloudNet){ window.__cloudNet=true;
    window.addEventListener('online', function(){ cloudBadge('saving'); cloudResync(); });
    window.addEventListener('offline', function(){ cloudBadge('offline'); });
  }
  /* Re-sincroniza ao voltar pra aba (realtime pode ter caído com o sleep/rede) */
  if(!window.__cloudFocus){ window.__cloudFocus=true;
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') cloudResync(); });
    window.addEventListener('focus', function(){ cloudResync(); });
    /* FLUSH ao esconder: no campo, salva-se a nota e a tela trava/troca de app ANTES do
       debounce de 900ms disparar -> o push ficava pendente até a próxima abertura.
       Agora, ao esconder a aba/app, qualquer pendência sobe NA HORA. */
    function _flushHidden(){ try{ if(_unsavedChanges && _cloudInitDone && !_cloudApplying){ clearTimeout(_cloudTimer); cloudSave(); } }catch(e){} }
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') _flushHidden(); });
    window.addEventListener('pagehide', _flushHidden);
  }
}

/* ===================== ETAPA 3 — FASE A: leitura por-linha + sombra =====================
   SÓ LEITURA. Lê as tabelas normalizadas (Fase 4), reconstrói o estado no MESMO formato
   do blob e COMPARA com o estado atual, sem tocar em nada que grava. Roda apenas quando
   chamado de propósito (window.shadowSync()) — nunca no fluxo normal do usuário.
   Objetivo: provar que as tabelas reproduzem 100% o estado antes de qualquer corte. */
function _dbReadAll(){
  if(!cloudInit()||!SB) return Promise.reject('sem conexão');
  function all(tab, cols){ // pagina de 1000 em 1000 (lancamentos pode passar disso)
    return new Promise(function(res){
      var out=[], from=0, page=1000;
      (function next(){
        SB.from(tab).select(cols).range(from, from+page-1).then(function(r){
          if(r.error){ res({error:r.error.message, rows:out}); return; }
          out=out.concat(r.data||[]);
          if((r.data||[]).length===page){ from+=page; next(); } else res({rows:out});
        }, function(e){ res({error:String(e), rows:out}); });
      })();
    });
  }
  return Promise.all([
    all('locais','*'), all('quadras','*'), all('estudos','*'),
    all('aplicacoes','*'), all('avaliacoes','*'),
    all('lancamentos','avaliacao_id,parcela,variavel,valor,client_ts'),
    all('notas_campo','*'), all('randomizacoes','*'), all('config','*')
  ]).then(function(a){
    return { locais:a[0], quadras:a[1], estudos:a[2], aplicacoes:a[3],
             avaliacoes:a[4], lancamentos:a[5], notas_campo:a[6], randomizacoes:a[7], config:a[8] };
  });
}
/* reconstrói o estado (formato do blob) a partir das linhas das tabelas */
function _dbBuildState(R){
  var S={ data:{}, qgeo:{}, qgeots:{}, qnome:{}, qlocal:{}, locais:{}, locaists:{},
          randomizacoes:[], notas_campo:[], georef:null };
  (R.locais.rows||[]).forEach(function(r){ if(r.deleted_at) return; S.locais[r.id]=Object.assign({}, r.extras||{}, {nome:r.nome, centro:r.centro, zoom:(r.zoom!=null?Number(r.zoom):undefined)}); if(r.client_ts!=null)S.locaists[r.id]=Number(r.client_ts); });
  (R.quadras.rows||[]).forEach(function(r){
    if(r.deleted_at) return;
    S.qgeo[r.id]=r.geo; if(r.client_ts!=null)S.qgeots[r.id]=Number(r.client_ts);
    S.qnome[r.id]=r.nome; S.qlocal[r.id]=r.local_id;
    var d=Object.assign({}, r.extras||{}); d.culturas=r.culturas||[];
    if(d.area==null && r.area_ha!=null) d.area=r.area_ha; d.estudos=[]; S.data[r.id]=d;
  });
  var estById={};
  (R.estudos.rows||[]).forEach(function(e){
    if(e.deleted_at) return;
    var est=Object.assign({}, e.extras||{}, { id:e.id, codigo:e.codigo, nome:e.nome, descricao:e.descricao,
      dataInicio:e.data_inicio, numAplicacoes:e.num_aplicacoes, intervaloDias:e.intervalo_dias,
      numRepeticoes:e.num_repeticoes, tratamentos:e.tratamentos||[], randomizacao:e.randomizacao,
      auditLog:e.audit||[], _ts:(e.client_ts!=null?Number(e.client_ts):undefined), aplicacoes:[], avaliacoes:[] });
    estById[e.id]=est; if(S.data[e.quadra_id]) S.data[e.quadra_id].estudos.push(est);
  });
  (R.aplicacoes.rows||[]).forEach(function(a){ if(a.deleted_at) return; var e=estById[a.estudo_id]; if(!e)return;
    e.aplicacoes.push(Object.assign({}, a.extras||{}, {id:a.id, data:a.data, bbch:a.bbch, obs:a.obs, carimbo:a.carimbo, _ts:(a.client_ts!=null?Number(a.client_ts):undefined)})); });
  var avById={};
  (R.avaliacoes.rows||[]).forEach(function(av){ if(av.deleted_at) return; var e=estById[av.estudo_id]; if(!e)return;
    var id=av.id; if(id&&id.indexOf(av.estudo_id+':auto_')===0) id=id.slice(av.estudo_id.length+1);
    var a=Object.assign({}, av.extras||{}, {id:id, data:av.data, tipo:av.tipo, bbch:av.bbch, obs:av.obs,
      auto:av.auto, variaveis:av.variaveis||[], tipos:av.tipos||{}, carimbo:av.carimbo,
      _ts:(av.client_ts!=null?Number(av.client_ts):undefined), notas:{}, notasMeta:{}});
    e.avaliacoes.push(a); avById[av.id]=a; });
  (R.lancamentos.rows||[]).forEach(function(l){ var a=avById[l.avaliacao_id]; if(!a)return;
    (a.notas[l.parcela]=a.notas[l.parcela]||{})[l.variavel]=l.valor;
    (a.notasMeta[l.parcela]=a.notasMeta[l.parcela]||{})[l.variavel]={ts:(l.client_ts!=null?Number(l.client_ts):0)}; });
  S.notas_campo=(R.notas_campo.rows||[]).filter(function(r){return !r.deleted_at;}).map(function(r){ return Object.assign({}, r.extras||{}, {id:r.id, localId:r.local_id, quadraId:r.quadra_id, lat:r.lat, lng:r.lng, titulo:r.titulo, categoria:r.categoria, severidade:r.severidade, recomendacao:r.recomendacao, descricao:r.descricao, foto:r.foto_b64, criadoEm:r.criado_em, resolvido:r.resolvido, _ts:(r.client_ts!=null?Number(r.client_ts):undefined)}); });
  S.randomizacoes=(R.randomizacoes.rows||[]).filter(function(r){return !r.deleted_at;}).map(function(r){ return r.dados; });
  var cfg=(R.config.rows||[]).find(function(r){return r.id===1;});
  if(cfg&&cfg.dados){ var dd=cfg.dados;
    if(dd._georef!==undefined || dd._georefts!==undefined){ /* corte v2: georef vem dentro do config */
      S.georef=dd._georef||null; S.georefts=dd._georefts;
      var cc=Object.assign({}, dd); delete cc._georef; delete cc._georefts; S.data.__config=cc;
    } else { S.data.__config=dd; }
  }
  return S;
}
function _countCells(stateData){ var n=0; Object.keys(stateData||{}).forEach(function(k){ if(k==='__config')return; (stateData[k].estudos||[]).forEach(function(e){ (e.avaliacoes||[]).forEach(function(a){ var no=a.notas||{}; Object.keys(no).forEach(function(tr){ Object.keys(no[tr]||{}).forEach(function(v){ if(no[tr][v]!=='' && no[tr][v]!=null) n++; }); }); }); }); }); return n; }
function _countEnt(stateData){ var e=0,ap=0,av=0; Object.keys(stateData||{}).forEach(function(k){ if(k==='__config')return; (stateData[k].estudos||[]).forEach(function(s){ e++; ap+=(s.aplicacoes||[]).length; av+=(s.avaliacoes||[]).length; }); }); return {estudos:e,aplicacoes:ap,avaliacoes:av}; }
/* Compara tabelas (T) x blob atual (B). Loga relatório e devolve o objeto. */
function shadowSync(){
  console.log('[shadow] lendo tabelas por-linha…');
  return _dbReadAll().then(function(R){
    var errs=Object.keys(R).filter(function(k){return R[k].error;}).map(function(k){return k+': '+R[k].error;});
    var T=_dbBuildState(R);
    var B=(typeof cloudState==='function')?cloudState():{data:data,qgeo:QGEO,locais:LOCAIS,randomizacoes:RZLIB,notas_campo:NOTAS_CAMPO};
    var bq=Object.keys(B.data||{}).filter(function(k){return k!=='__config';}).length;
    var tq=Object.keys(T.data||{}).filter(function(k){return k!=='__config';}).length;
    var bc=_countEnt(B.data), tc=_countEnt(T.data);
    // fidelidade no overlap de avaliações (mesmo estudo+id): % de células iguais
    var bAv={}; Object.keys(B.data||{}).forEach(function(qid){ if(qid==='__config')return; (B.data[qid].estudos||[]).forEach(function(s){ (s.avaliacoes||[]).forEach(function(a){ bAv[s.id+'|'+a.id]=a; }); }); });
    var overlap=0, cellsBoth=0, cellsEqual=0, avDiff=[];
    Object.keys(T.data||{}).forEach(function(qid){ if(qid==='__config')return; (T.data[qid].estudos||[]).forEach(function(s){ (s.avaliacoes||[]).forEach(function(ta){ var ba=bAv[s.id+'|'+ta.id]; if(!ba)return; overlap++; var tn=ta.notas||{}, bn=ba.notas||{}; var rows={}; Object.keys(tn).forEach(function(r){rows[r]=1;}); Object.keys(bn).forEach(function(r){rows[r]=1;}); var d=0; Object.keys(rows).forEach(function(r){ var tr=tn[r]||{}, br=bn[r]||{}; var cols={}; Object.keys(tr).forEach(function(c){cols[c]=1;}); Object.keys(br).forEach(function(c){cols[c]=1;}); Object.keys(cols).forEach(function(c){ var tv=tr[c], bv=br[c]; if(tv!=null&&tv!==''||bv!=null&&bv!==''){ cellsBoth++; if(String(tv==null?'':tv)===String(bv==null?'':bv)) cellsEqual++; else d++; } }); }); if(d) avDiff.push(s.id+'|'+ta.id+' ('+d+' células diferentes)'); }); }); });
    var rep={
      erros_leitura: errs,
      contagens:{ quadras:{blob:bq, tabelas:tq}, estudos:{blob:bc.estudos, tabelas:tc.estudos}, aplicacoes:{blob:bc.aplicacoes, tabelas:tc.aplicacoes}, avaliacoes:{blob:bc.avaliacoes, tabelas:tc.avaliacoes}, celulas:{blob:_countCells(B.data), tabelas:_countCells(T.data)}, locais:{blob:Object.keys(B.locais||{}).length, tabelas:Object.keys(T.locais||{}).length}, notas_campo:{blob:(B.notas_campo||[]).length, tabelas:(T.notas_campo||[]).length}, randomizacoes:{blob:(B.randomizacoes||[]).length, tabelas:(T.randomizacoes||[]).length} },
      georef:{ blob_tem: !!(B.georef||(typeof _geo!=='undefined'&&_geo)), tabelas_tem: !!T.georef },
      fidelidade_avaliacoes_no_overlap:{ avaliacoes_em_ambos:overlap, celulas_comparadas:cellsBoth, celulas_iguais:cellsEqual, pct: cellsBoth?(Math.round(cellsEqual/cellsBoth*1000)/10+'%'):'n/a', avaliacoes_com_diferenca:avDiff.slice(0,20) }
    };
    console.log('[shadow] RELATÓRIO', rep);
    window._shadowRep=rep; window._shadowT=T;
    return rep;
  });
}

/* ===================== ETAPA 3 — FASE B: escrita dupla + outbox =====================
   Grava no blob (verdade atual) E, EM PARALELO, nas tabelas por-linha. SÓ roda com a
   flag _dualWrite LIGADA (padrão DESLIGADA → dormente p/ o usuário). Best-effort: NUNCA
   quebra o salvar do blob (tudo em try/catch). Fila offline (IndexedDB) sobe quando há rede. */
/* LIGADA por padrão (warming de produção). Kill-switch: setDualWrite(false) grava '0'. */
function _dwOn(){ try{ if(window._dualWrite===false) return false; return localStorage.getItem('agracta-dualwrite')!=='0'; }catch(e){ return window._dualWrite!==false; } }
function setDualWrite(on){ window._dualWrite=!!on; try{ localStorage.setItem('agracta-dualwrite', on?'1':'0'); }catch(e){} if(on) outboxFlush(); return _dwOn(); }
function _f4date(t){ if(!t) return null; t=String(t); if(/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0,10); var m=t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(m) return m[3]+'-'+m[2]+'-'+m[1]; return null; }
function _f4int(x){ if(x===''||x==null) return null; var n=parseInt(x,10); return isNaN(n)?null:n; }
var _OB_DB='agracta-outbox', _OB_STORE='ops';
function _obOpen(){ return new Promise(function(res,rej){ try{ if(!window.indexedDB){rej('sem idb');return;} var rq=indexedDB.open(_OB_DB,1); rq.onupgradeneeded=function(e){ var db=e.target.result; if(!db.objectStoreNames.contains(_OB_STORE)){ db.createObjectStore(_OB_STORE,{keyPath:'k',autoIncrement:true}); } }; rq.onsuccess=function(){res(rq.result);}; rq.onerror=function(){rej(rq.error);}; }catch(e){rej(e);} }); }
function outboxAdd(ops){ if(!ops||!ops.length) return; try{ _obOpen().then(function(db){ try{ var tx=db.transaction(_OB_STORE,'readwrite'), os=tx.objectStore(_OB_STORE); ops.forEach(function(o){ os.add(o); }); tx.oncomplete=function(){ try{db.close();}catch(_){} if(navigator.onLine) outboxFlush(); }; tx.onerror=function(){ try{db.close();}catch(_){} }; }catch(_){ try{db.close();}catch(__){} } }, function(){}); }catch(e){} }
var _obFlushing=false;
function outboxFlush(){
  if(_obFlushing) return; if(!cloudInit()||!SB||!navigator.onLine) return; _obFlushing=true;
  _obOpen().then(function(db){
    var all=[]; try{ var tx=db.transaction(_OB_STORE,'readonly'), cur=tx.objectStore(_OB_STORE).openCursor();
      cur.onsuccess=function(e){ var c=e.target.result; if(c){ var v=c.value; v.k=c.key; all.push(v); c.continue(); } else { _obProcess(db, all); } };
      cur.onerror=function(){ try{db.close();}catch(_){} _obFlushing=false; };
    }catch(_){ try{db.close();}catch(__){} _obFlushing=false; }
  }, function(){ _obFlushing=false; });
}
function _obProcess(db, ops){
  var i=0;
  function del(k){ try{ var tx=db.transaction(_OB_STORE,'readwrite'); tx.objectStore(_OB_STORE).delete(k); }catch(e){} }
  function step(){
    if(i>=ops.length){ try{db.close();}catch(_){} _obFlushing=false; return; }
    var o=ops[i++]; if(!o||!o.table){ del(o&&o.k); return step(); }
    var q;
    try{
      if(o.update){ q=SB.from(o.table).update(o.update).eq(o.eqCol||'id', o.eqVal); } /* soft-delete: deleted_at */
      else { q=SB.from(o.table).upsert(o.row, {onConflict:o.onConflict||'id'}); }
    }
    catch(e){ return step(); }
    q.then(function(r){ if(r&&r.error){ /* mantém p/ retry (ex.: FK ainda não chegou) */ } else { del(o.k); } step(); }, function(){ step(); });
  }
  step();
}
/* monta as linhas (revertendo o mapeamento da migração) */
function _rowQuadra(qid){ var d=(typeof data!=='undefined'&&data[qid])||{}; var ex={}; for(var k in d){ if(k!=='estudos'&&k!=='culturas'&&k!=='_deletedStudies') ex[k]=d[k]; } return { id:qid, local_id:((typeof QLOCAL!=='undefined'&&QLOCAL[qid])||'iracemapolis'), nome:((typeof QNOME!=='undefined'&&QNOME[qid])||qid), geo:((typeof QGEO!=='undefined'&&QGEO[qid])||null), area_ha:(d.area!=null&&d.area!==''?Number(d.area):null), culturas:(d.culturas||[]), extras:ex, client_ts:((typeof QGEO_TS!=='undefined'&&QGEO_TS[qid])||Date.now()) }; }
function _rowLocal(lid){ var L=(typeof LOCAIS!=='undefined'&&LOCAIS[lid])||{}; return { id:lid, nome:(L.nome||lid), centro:(L.centro||null), zoom:(L.zoom!=null?Number(L.zoom):null), client_ts:((typeof LOCAIS_TS!=='undefined'&&LOCAIS_TS[lid])||Date.now()) }; }
function _rowEstudo(qid, est){ var skip={aplicacoes:1,avaliacoes:1,tratamentos:1,randomizacao:1,auditLog:1,id:1,codigo:1,nome:1,descricao:1,dataInicio:1,numAplicacoes:1,intervaloDias:1,numRepeticoes:1,_deletedStudies:1}; var ex={}; for(var k in est){ if(!skip[k]) ex[k]=est[k]; } return { id:est.id, quadra_id:qid, codigo:est.codigo||null, nome:est.nome||null, descricao:est.descricao||null, data_inicio:_f4date(est.dataInicio), num_aplicacoes:_f4int(est.numAplicacoes), intervalo_dias:_f4int(est.intervaloDias), num_repeticoes:_f4int(est.numRepeticoes), tratamentos:est.tratamentos||[], randomizacao:est.randomizacao||null, audit:est.auditLog||[], extras:ex, client_ts:est._ts||Date.now() }; }
function _avTableId(sid, av){ return (av.id&&av.id.indexOf('auto_')===0)?(sid+':'+av.id):av.id; }
function _rowAval(sid, av){ var skip={id:1,data:1,tipo:1,bbch:1,obs:1,auto:1,variaveis:1,tipos:1,carimbo:1,notas:1,notasMeta:1}; var ex={}; for(var k in av){ if(!skip[k]) ex[k]=av[k]; } return { id:_avTableId(sid,av), estudo_id:sid, data:_f4date(av.data), tipo:av.tipo||null, bbch:av.bbch||null, obs:av.obs||null, auto:!!av.auto, variaveis:av.variaveis||[], tipos:av.tipos||{}, carimbo:av.carimbo||null, extras:ex, client_ts:av._ts||Date.now() }; }
/* hook do saveAvaliacao: enfileira a cadeia (local→quadra→estudo→avaliação→lançamentos) na ordem dos FKs */
function dbUpsertAvaliacao(qid, sid, av){
  if(!_dwOn()) return;
  try{
    var est=((typeof data!=='undefined'&&data[qid]&&(data[qid].estudos||[]).find(function(s){return s.id===sid;}))||{id:sid});
    var avid=_avTableId(sid, av);
    var ops=[];
    ops.push({table:'locais', row:_rowLocal((typeof QLOCAL!=='undefined'&&QLOCAL[qid])||'iracemapolis')});
    ops.push({table:'quadras', row:_rowQuadra(qid)});
    ops.push({table:'estudos', row:_rowEstudo(qid, est)});
    ops.push({table:'avaliacoes', row:_rowAval(sid, av)});
    var notas=av.notas||{}, meta=av.notasMeta||{};
    Object.keys(notas).forEach(function(parc){ Object.keys(notas[parc]||{}).forEach(function(vari){
      var val=notas[parc][vari]; var ts=(meta[parc]&&meta[parc][vari]&&meta[parc][vari].ts)||av._ts||Date.now();
      ops.push({table:'lancamentos', onConflict:'avaliacao_id,parcela,variavel', row:{avaliacao_id:avid, parcela:parc, variavel:vari, valor:(val===''?null:val), client_ts:ts}});
    }); });
    outboxAdd(ops);
  }catch(e){}
}
function _rowAplicacao(sid, ap){ var skip={id:1,data:1,bbch:1,obs:1,carimbo:1}; var ex={}; for(var k in ap){ if(!skip[k]) ex[k]=ap[k]; } return { id:ap.id, estudo_id:sid, data:_f4date(ap.data), bbch:ap.bbch||null, obs:ap.obs||null, carimbo:ap.carimbo||null, extras:ex, client_ts:ap._ts||Date.now() }; }
function dbUpsertQuadra(qid){ if(!_dwOn()||!qid||qid==='__config') return; try{ outboxAdd([{table:'locais',row:_rowLocal((typeof QLOCAL!=='undefined'&&QLOCAL[qid])||'iracemapolis')},{table:'quadras',row:_rowQuadra(qid)}]); }catch(e){} }
function dbUpsertEstudo(qid, est){ if(!_dwOn()||!est||!est.id) return; try{ outboxAdd([{table:'locais',row:_rowLocal((typeof QLOCAL!=='undefined'&&QLOCAL[qid])||'iracemapolis')},{table:'quadras',row:_rowQuadra(qid)},{table:'estudos',row:_rowEstudo(qid,est)}]); }catch(e){} }
function dbUpsertAplicacao(qid, sid, ap){ if(!_dwOn()||!ap||!ap.id) return; try{ var est=((typeof data!=='undefined'&&data[qid]&&(data[qid].estudos||[]).find(function(s){return s.id===sid;}))||{id:sid}); outboxAdd([{table:'locais',row:_rowLocal((typeof QLOCAL!=='undefined'&&QLOCAL[qid])||'iracemapolis')},{table:'quadras',row:_rowQuadra(qid)},{table:'estudos',row:_rowEstudo(qid,est)},{table:'aplicacoes',row:_rowAplicacao(sid,ap)}]); }catch(e){} }
/* --- builders restantes p/ cobertura COMPLETA da escrita-dupla (Etapa 3) --- */
function _rowNota(n){ var skip={id:1,localId:1,quadraId:1,lat:1,lng:1,titulo:1,categoria:1,severidade:1,recomendacao:1,descricao:1,foto:1,criadoEm:1,resolvido:1}; var ex={}; for(var k in n){ if(!skip[k]) ex[k]=n[k]; } return { id:n.id, local_id:n.localId||null, quadra_id:n.quadraId||null, lat:(n.lat!=null&&n.lat!==''?Number(n.lat):null), lng:(n.lng!=null&&n.lng!==''?Number(n.lng):null), titulo:n.titulo||null, categoria:n.categoria||null, severidade:n.severidade||null, recomendacao:n.recomendacao||null, descricao:n.descricao||null, foto_b64:n.foto||null, criado_em:_f4date(n.criadoEm), resolvido:!!n.resolvido, extras:ex, client_ts:n._ts||Date.now() }; }
function dbUpsertNotasAll(){ if(!_dwOn()) return; try{ if(typeof ensureNotas==='function') ensureNotas(); var ops=(NOTAS_CAMPO||[]).filter(function(n){return n&&n.id;}).map(function(n){ return {table:'notas_campo', row:_rowNota(n)}; }); if(ops.length) outboxAdd(ops); }catch(e){} }
function dbUpsertConfig(){ if(!_dwOn()) return; try{ ensureConfig(); var dados=Object.assign({}, data.__config||{}); dados._georef=(typeof _geo!=='undefined'?_geo:null); dados._georefts=(typeof GEOREF_TS!=='undefined'?GEOREF_TS:null); outboxAdd([{table:'config', onConflict:'id', row:{id:1, dados:dados, client_ts:Date.now()}}]); }catch(e){} }
function dbUpsertLocaisAll(){ if(!_dwOn()) return; try{ if(typeof ensureLocais==='function') ensureLocais(); var ops=Object.keys(LOCAIS||{}).map(function(lid){ return {table:'locais', row:_rowLocal(lid)}; }); if(ops.length) outboxAdd(ops); }catch(e){} }
function dbUpsertRZAll(){ if(!_dwOn()) return; try{ var ops=(RZLIB||[]).filter(function(r){return r&&r.id;}).map(function(r){ return {table:'randomizacoes', row:{id:r.id, nome:(r.nome||null), dados:r, client_ts:Date.now()}}; }); if(ops.length) outboxAdd(ops); }catch(e){} }
/* soft-delete: marca deleted_at (não apaga) — leitura por-linha filtra deleted_at IS NULL */
function dbSoftDelete(table, id){ if(!_dwOn()||!table||!id) return; try{ outboxAdd([{table:table, update:{deleted_at:new Date().toISOString()}, eqCol:'id', eqVal:id}]); }catch(e){} }
function dbSoftDeleteAval(sid, avid){ if(!avid) return; var id=(String(avid).indexOf('auto_')===0)?(sid+':'+avid):avid; dbSoftDelete('avaliacoes', id); }
if(!window.__obNet){ window.__obNet=true; try{ window.addEventListener('online', function(){ try{outboxFlush();}catch(e){} }); document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible'){ try{outboxFlush();}catch(e){} } }); }catch(e){} }

/* ===================== ETAPA 3 — FASE C (cliente): LER das tabelas por-linha =====================
   Atrás da flag _readRows (padrão DESLIGADA → comportamento idêntico ao de hoje). Quando LIGADA,
   o app carrega o estado das TABELAS (não do blob) e reage ao realtime POR LINHA. As escritas
   seguem duplas (tabelas + blob), então o blob fica como BACKUP QUENTE → rollback instantâneo
   com setReadRows(false). Validar ao vivo (shadow 100%) ANTES de ligar pra equipe. */
/* RE-CORTE: realtime por-linha CONFIRMADO ao vivo (assinei `quadras`, regravei 1 linha e o
   evento CHEGOU). Logo, Realtime está habilitado e as tabelas estão na publicação. Leitura
   por-linha LIGADA por padrão → dado passa entre aparelhos na hora (≠ blob 634KB, cujo evento
   o realtime descarta por tamanho). Cobertura de escrita-dupla completa + soft-delete + merge
   + retry. Kill-switch/rollback: setReadRows(false) grava '0'. */
/* CONFIABILIDADE PRIMEIRO: leitura volta ao BLOB por padrão. No modo por-linha, uma
   releitura em 2º plano podia sobrepor um pin/avaliação recém-criado antes de subir
   (corrida em conexão lenta → "não fica"). No blob o registro fica firme na tela e sobe
   quando há rede. Real-time por-linha fica p/ quando a conexão do projeto for estável +
   o merge-com-pendente estiver pronto. Re-liga explícito: setReadRows(true)/localStorage '1'. */
function _rrOn(){ try{ if(window._readRows===true) return true; if(window._readRows===false) return false; return localStorage.getItem('agracta-readrows')==='1'; }catch(e){ return window._readRows===true; } }
function setReadRows(on){ window._readRows=!!on; try{ localStorage.setItem('agracta-readrows', on?'1':'0'); }catch(e){} if(on){ cloudReadRows().then(function(ok){ if(ok) cloudSubscribeRows(); }); } return _rrOn(); }
function _applyRowsState(S){
  _cloudApplying=true;
  try{
    if(S.data){ data=S.data; try{ localStorage.setItem('iracema-v7', JSON.stringify(data)); }catch(e){} }
    if(S.qgeo){ QGEO=S.qgeo; saveQGEO(); }
    if(S.qgeots){ QGEO_TS=S.qgeots; saveQGEOTS(); }
    if(S.georef){ _geo=S.georef; saveGeoref(_geo); }
    if(S.georefts!=null){ GEOREF_TS=S.georefts; saveGeorefTS(); }
    if(S.locais){ LOCAIS=S.locais; try{ localStorage.setItem(LOCAIS_KEY, JSON.stringify(LOCAIS)); }catch(e){} }
    if(S.qlocal){ QLOCAL=S.qlocal; try{ localStorage.setItem(QLOCAL_KEY, JSON.stringify(QLOCAL)); }catch(e){} }
    if(S.qnome){ QNOME=S.qnome; try{ localStorage.setItem(QNOME_KEY, JSON.stringify(QNOME)); }catch(e){} }
    if(Array.isArray(S.randomizacoes)){ RZLIB=(typeof normalizeRZLib==='function'?normalizeRZLib(S.randomizacoes):S.randomizacoes); try{ localStorage.setItem(RZLIB_KEY, JSON.stringify(RZLIB)); }catch(e){} }
    if(Array.isArray(S.notas_campo)){ NOTAS_CAMPO=S.notas_campo; try{ localStorage.setItem(NOTAS_CAMPO_KEY, JSON.stringify(NOTAS_CAMPO)); }catch(e){} }
    if(QGEO){ Object.keys(QGEO).forEach(function(id){ if(!data[id]) data[id]={cultura:'',cultivar:'',plantio:'',area:null,estudos:[]}; }); }
    ensureLocais(); if(typeof buildLocalChip==='function') buildLocalChip();
    render(); if(typeof updateAgendaBadge==='function') updateAgendaBadge();
    if(typeof enforceAccess==='function') enforceAccess();
  }catch(e){}
  _cloudApplying=false;
}
var _rrPending=null, _rrCh=null, _rrTimer=null;
function cloudReadRows(){
  if(!cloudInit()) return Promise.resolve(false);
  return _dbReadAll().then(function(R){
    if(Object.keys(R).some(function(k){return R[k].error;})){ cloudBadge('offline'); return false; }
    var S=_dbBuildState(R);
    if(window._qEditing||window._avEditing){ _rrPending=S; return true; } /* não atropela edição em curso */
    /* não atropela edição local NÃO-SALVA: mescla (como o caminho do blob) e empurra o local */
    if(_unsavedChanges){ try{ S=cloudMerge(cloudState(), S); }catch(e){} setTimeout(function(){ try{ if(_unsavedChanges) cloudSaveSoon(); }catch(e){} }, 50); }
    _applyRowsState(S); _cloudInitDone=true; cloudBadge('saved'); return true;
  }, function(){ cloudBadge('offline'); return false; });
}
function cloudReadRowsApplyPending(){ if(_rrPending && !window._qEditing && !window._avEditing){ var s=_rrPending; _rrPending=null; _applyRowsState(s); } }
function _rrSoon(){ clearTimeout(_rrTimer); _rrTimer=setTimeout(function(){ if(window._qEditing||window._avEditing){ _rrSoon(); return; } cloudReadRows(); }, 400); }
/* re-render debounced (sem reler a nuvem) após aplicar um delta */
function _rrRenderSoon(){ clearTimeout(window._rrRenderT); window._rrRenderT=setTimeout(function(){ try{ render(); if(typeof updateAgendaBadge==='function')updateAgendaBadge(); if(typeof updateTodayBadge==='function')updateTodayBadge(); }catch(e){} }, 120); }
/* acha uma avaliação em memória pelo id da TABELA (lida com namespace de auto_) */
function _rrFindAvByTableId(tid){
  if(!tid) return null; var out=null;
  Object.keys(data||{}).some(function(qid){ if(qid==='__config')return false; return (data[qid].estudos||[]).some(function(s){ return (s.avaliacoes||[]).some(function(a){ if(_avTableId(s.id,a)===tid){ out={qid:qid,sid:s.id,av:a}; return true; } return false; }); }); });
  return out;
}
/* APLICA o delta de UM evento de realtime direto na memória (instantâneo, sem reler tudo).
   Cobre o caso comum (lancamentos = células, e avaliacoes); estrutural cai no _rrSoon. */
function _rrEvent(table, p){
  try{
    if(!_rrOn()) return;
    if(window._qEditing || window._avEditing){ _rrSoon(); return; } /* não atropela edição em curso */
    var nw=(p&&p.new)||{}, od=(p&&p.old)||{}, ev=(p&&p.eventType)||'';
    if(table==='lancamentos'){
      var avid=nw.avaliacao_id||od.avaliacao_id, parc=nw.parcela||od.parcela, vari=nw.variavel||od.variavel;
      var loc=_rrFindAvByTableId(avid);
      if(!loc||!parc||!vari){ _rrSoon(); return; } /* avaliação não em memória → re-lê */
      var a=loc.av; a.notas=a.notas||{}; a.notasMeta=a.notasMeta||{};
      if(ev==='DELETE'){ if(a.notas[parc]) delete a.notas[parc][vari]; }
      else { var val=nw.valor; (a.notas[parc]=a.notas[parc]||{})[vari]=(val==null?'':val); (a.notasMeta[parc]=a.notasMeta[parc]||{})[vari]={ts:(nw.client_ts!=null?Number(nw.client_ts):Date.now())}; }
      try{ localStorage.setItem('iracema-v7', JSON.stringify(data)); }catch(e){}
      _rrRenderSoon(); return;
    }
    if(table==='avaliacoes'){
      var estId=nw.estudo_id||od.estudo_id, tid=nw.id||od.id; if(!estId||!tid){ _rrSoon(); return; }
      var est=null; Object.keys(data||{}).some(function(k){ if(k==='__config')return false; var s=(data[k].estudos||[]).find(function(x){return x.id===estId;}); if(s){est=s;return true;} return false; });
      if(!est){ _rrSoon(); return; } /* estudo não em memória → re-lê */
      var realId=(tid.indexOf(estId+':auto_')===0)?tid.slice(estId.length+1):tid;
      est.avaliacoes=est.avaliacoes||[];
      var a=est.avaliacoes.find(function(x){return x.id===realId;});
      if(ev==='DELETE' || nw.deleted_at){ if(a) est.avaliacoes=est.avaliacoes.filter(function(x){return x.id!==realId;}); _rrRenderSoon(); return; }
      if(!a){ a={id:realId,notas:{},notasMeta:{}}; est.avaliacoes.push(a); }
      a.data=nw.data; a.tipo=nw.tipo; a.bbch=nw.bbch; a.obs=nw.obs; a.auto=nw.auto; if(nw.variaveis)a.variaveis=nw.variaveis; if(nw.tipos)a.tipos=nw.tipos; if(nw.carimbo)a.carimbo=nw.carimbo;
      try{ localStorage.setItem('iracema-v7', JSON.stringify(data)); }catch(e){}
      _rrRenderSoon(); return;
    }
    _rrSoon(); /* quadras/estudos/locais/notas/randomizações/config: re-leitura leve (raras) */
  }catch(e){ _rrSoon(); }
}
function cloudSubscribeRows(){
  if(!SB) return;
  try{
    if(_rrCh){ try{ SB.removeChannel(_rrCh); }catch(e){} _rrCh=null; }
    _rrCh=SB.channel('agracta_rows_rt');
    ['locais','quadras','estudos','aplicacoes','avaliacoes','lancamentos','notas_campo','randomizacoes','config'].forEach(function(t){
      _rrCh.on('postgres_changes',{event:'*',schema:'public',table:t}, function(p){ _rrEvent(t, p); });
    });
    _rrCh.subscribe(function(status){ if(status==='SUBSCRIBED'){ _cloudReady=true; cloudBadge('saved'); } else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){ _cloudReady=false; clearTimeout(window._rrReTimer); window._rrReTimer=setTimeout(cloudSubscribeRows, 4000); } });
  }catch(e){}
}

/* Quadra de laboratório no mapa: marcador 🧪 em vez de polígono. Sem geometria
   não há área nem NDVI, mas o toque é o mesmo (showD) e em modo de edição o
   marcador é arrastável para posicionar o prédio do laboratório. */
function renderQuadraLab(id){
  var ll=quadraPonto(id); if(!ll) return;
  var isEd=(editMode && id===editId);
  var n=((data[id]&&data[id].estudos)||[]).length;
  var m=LF.marker(ll,{
    draggable:!!editMode, zIndexOffset:900,
    icon:LF.divIcon({className:'lab-pin'+(isEd?' on':''),
      html:'<div class="lab-pin-b">🧪</div><div class="lab-pin-t">'+esc(quadraNome(id))+(n?' <b>'+n+'</b>':'')+'</div>',
      iconSize:[0,0], iconAnchor:[13,13]})
  }).addTo(_qLayer);
  m.on('click',function(){
    if(scoutingModeActive) return;
    if(_measure&&_measure.mode==='draw') return;
    if(editMode) selectQuadra(id); else showD(id);
  });
  m.on('dragend',function(e){
    var p=e.target.getLatLng();
    if(!data[id]) return;
    data[id].ponto=[p.lat,p.lng]; _touchQGEO(id); saveQGEO(); save();
    try{ if(typeof dbUpsertQuadra==='function') dbUpsertQuadra(id); }catch(e2){}
  });
}
function render(){
  initMap();
  if(!_qLayer) return;
  _qLayer.clearLayers();
  ensureQGEO(); ensureLocais();
  if(!QGEO) return;
  _editPoly=null;
  var ids=quadrasAtivas();
  for(var k=0;k<ids.length;k++){
    var id=ids[k], latlngs=QGEO[id], d=data[id]||{}, dap=cDAP(d.plantio), st=gS(d.cultura,dap), ac=gC(d.cultura);
    if(isQuadraLab(id)){ renderQuadraLab(id); continue; } /* lab: marcador, não polígono */
    if(!latlngs || latlngs.length<3) continue;
    var dapStr=dap!==null?(dap>=0?dap+"d":"\u2013"+Math.abs(dap)+"d"):"";
    var hasAlert=quadraHasAlert(id);
    var isEd=(editMode && id===editId);

    var _zona=(ndviZonas && ndviMeans && ndviMeans[id]!=null), _zc=_zona?_ndviColor(ndviMeans[id]):ac, _zfo=isEd?0.18:(_zona?0.62:0.08);
    var poly=LF.polygon(latlngs,{className:'q-poly',color:isEd?'#ffce00':_zc,weight:isEd?3:2,opacity:0.95,fillColor:_zc,fillOpacity:_zfo,interactive:(!drawMode && !ndviProbe && !scoutingModeActive && !(_measure&&_measure.mode==='draw'))});
    (function(qid,zfo,zona){
      if(!drawMode){
        poly.on('click',function(){ if(scoutingModeActive) return; /* modo observação: o toque é da NOTA, não abre a quadra */ if(_measure&&_measure.mode==='draw') return; if(editMode) selectQuadra(qid); else showD(qid); });
        if(!editMode){ poly.on('mouseover',function(){this.setStyle({fillOpacity:zona?0.8:0.25,weight:3});}); poly.on('mouseout',function(){this.setStyle({fillOpacity:zfo,weight:2});}); }
      }
    })(id,_zfo,_zona);
    poly.addTo(_qLayer);
    if(isEd) _editPoly=poly;

    var nEst=(d.estudos||[]).length, inner='';
    if(hasAlert) inner+='<div class="q-alert"></div>';
    inner+='<div class="q-dot" style="background:'+st.c+'"></div>';
    var _ncult=getCulturas(d).length;
    inner+='<div class="q-id">'+esc(quadraNome(id))+(_ncult>=2?'<span class="q-multi">+'+(_ncult-1)+'</span>':'')+'</div>';
    inner+='<div class="q-st" style="color:'+st.c+'">'+esc(st.s)+'</div>';
    if(dapStr) inner+='<div class="q-dap">'+dapStr+'</div>';
    if(nEst>0){ var bc=hasAlert?'#ff5252':'#1e3a1e', bb=hasAlert?'#ff8a80':'#5a8a5a'; inner+='<div class="q-badge" style="background:'+bc+';border:1px solid '+bb+'">'+nEst+'</div>'; }
    if(ndviMeans && ndviMeans[id]!=null) inner+='<div class="q-ndvi">'+ndviMeans[id].toFixed(2)+'</div>';
    var icon=LF.divIcon({className:'q-label',html:'<div class="q-lblbox">'+inner+'</div>',iconSize:[0,0],iconAnchor:[0,0]});
    LF.marker(polyCentroid(latlngs),{icon:icon,interactive:false,keyboard:false}).addTo(_qLayer);
  }
  if(editMode) drawVertexHandles();
  if(typeof renderNotas==='function') renderNotas();
}

/* ============ LEGEND (removida da UI — funções mantidas como no-op seguro) ============ */
function toggleLegend(){ var p=document.getElementById("legendPanel"); if(p){ legO=!legO; p.classList.toggle("open",legO); } }
function renderLeg(){
  if(!document.getElementById("legendPanel")) return;
  var cs={};var vals=Object.values(data);for(var i=0;i<vals.length;i++){var d=vals[i];if(d.cultura)cs[d.cultura]=(cs[d.cultura]||0)+1}
  var h='<div class="lg-title">CULTURAS</div><div class="lg-crops">';
  var entries=Object.entries(cs).sort(function(a,b){return b[1]-a[1]});
  for(var i=0;i<entries.length;i++){
    var crop=entries[i][0],n=entries[i][1],c=gC(crop);
    h+='<span class="lg-crop" style="color:'+c+'"><span class="lg-dot" style="background:'+c+'"></span>'+esc(crop)+' <span style="opacity:.4">\u00d7'+n+'</span></span>';
  }
  h+='</div><div class="lg-title" style="margin-top:10px">MARCADOR = EST\u00c1GIO</div><div class="lg-stages">';
  var stages=[{c:"#66bb6a",l:"Emerg\u00eancia"},{c:"#2e7d32",l:"Vegetativo"},{c:"#fdd835",l:"Flora\u00e7\u00e3o"},{c:"#ffb300",l:"Forma\u00e7\u00e3o"},{c:"#f57c00",l:"Enchimento"},{c:"#d84315",l:"Matura\u00e7\u00e3o"},{c:"#8d6e63",l:"Colheita"},{c:"#42a5f5",l:"Planejado"}];
  for(var i=0;i<stages.length;i++){h+='<span class="lg-stage"><span class="lg-bar" style="background:'+stages[i].c+'"></span>'+stages[i].l+'</span>'}
  h+='</div><div style="margin-top:10px;font-size:8px;color:#555;letter-spacing:1.5px;font-weight:700">ESTUDOS</div>';
  h+='<div style="font-size:8px;color:#888;margin-top:4px;line-height:1.5">• Badge verde: nº de estudos ativos<br>• Badge vermelho + anel pulsante: evento em 0–2 dias<br>• Clique na quadra para ver detalhes</div>';
  document.getElementById("legendPanel").innerHTML=h;
}

/* ============ AGENDA ============ */
function toggleAgenda(){
  agO=!agO;
  document.getElementById("agendaPanel").classList.toggle("open",agO);
  if(agO)renderAgenda();
}
function renderAgenda(){
  var events=allUpcomingEvents(30, agVerDispensados);
  var today=today0();

  var groups={overdue:[],today:[],soon:[],week:[],month:[]};
  events.forEach(function(e){
    if(e.diff<0)groups.overdue.push(e);
    else if(e.diff===0)groups.today.push(e);
    else if(e.diff<=3)groups.soon.push(e);
    else if(e.diff<=7)groups.week.push(e);
    else groups.month.push(e);
  });

  var _nDisp=_agTotalDispensados();
  var h='<div class="ag-title">AGENDA (30 DIAS)<button class="ag-close" onclick="toggleAgenda()">×</button></div>';
  h+='<div class="ag-acoes">';
  h+='<button class="ag-acao" onclick="agLimparTudo()">Limpar lembretes</button>';
  if(_nDisp) h+='<button class="ag-acao ag-acao-alt" onclick="agToggleDispensados()">'+(agVerDispensados?'Ocultar':'Ver')+' dispensados ('+_nDisp+')</button>';
  h+='</div>';

  function renderGroup(title,arr,cls){
    if(!arr.length)return "";
    var gh='<div class="ag-group"><div class="ag-group-title">'+title+' ('+arr.length+')</div>';
    arr.forEach(function(e){
      var typeLabel = e.event.type==='apl' ? ('APLICAÇÃO '+e.event.idx+'/'+e.event.total) : ('AVALIAÇÃO '+e.event.idx);
      var dateLabel = fD(e.event.date);
      if(e.diff===0)dateLabel='HOJE';
      else if(e.diff===1)dateLabel='Amanhã';
      else if(e.diff===-1)dateLabel='Ontem';
      else if(e.diff<0)dateLabel='há '+Math.abs(e.diff)+'d';
      else dateLabel='em '+e.diff+'d';
      var color = e.diff<=0?'#ff5252':(e.diff<=3?'#ffb74d':'#64b5f6');
      var _k=_agEvKey(e.event), _sid=e.study.id;
      var _btn = e.dispensado
        ? '<button class="ag-x ag-x-volta" title="Trazer o lembrete de volta" onclick="event.stopPropagation();agRestaurar(\''+e.qid+'\',\''+_sid+'\',\''+_k+'\')">&#8630;</button>'
        : '<button class="ag-x" title="Dispensar o lembrete (o evento segue pendente)" onclick="event.stopPropagation();agDispensar(\''+e.qid+'\',\''+_sid+'\',\''+_k+'\',\''+typeLabel+'\')">&times;</button>';
      gh+='<div class="ag-item '+cls+(e.dispensado?' ag-dispensado':'')+'" onclick="closeAgendaAndOpen(\''+e.qid+'\')">';
      gh+='<div class="ag-item-top"><span class="ag-item-qid">'+esc(quadraNome(e.qid))+'</span><span class="ag-item-date" style="color:'+color+'">'+dateLabel+'</span>'+_btn+'</div>';
      gh+='<div class="ag-item-name">'+esc(e.study.nome)+'</div>';
      gh+='<div class="ag-item-type" style="color:'+color+'">'+typeLabel+' • '+fD(e.event.date)+'</div>';
      gh+='</div>';
    });
    gh+='</div>';
    return gh;
  }

  h+=renderGroup('⚠️ ATRASADOS',groups.overdue,'overdue');
  h+=renderGroup('🔴 HOJE',groups.today,'today');
  h+=renderGroup('🟠 PRÓXIMOS 3 DIAS',groups.soon,'soon');
  h+=renderGroup('📅 ESTA SEMANA',groups.week,'');
  h+=renderGroup('📆 PRÓXIMOS 30 DIAS',groups.month,'');

  if(!events.length)h+='<div class="ag-empty">'+(_nDisp&&!agVerDispensados?'Nenhum lembrete ativo.<br>Há '+_nDisp+' dispensado'+(_nDisp>1?'s':'')+' — use o botão acima para ver.':'Nenhum evento programado.<br>Adicione estudos nas quadras para visualizar aqui.')+'</div>';

  document.getElementById("agendaPanel").innerHTML=h;
}
function closeAgendaAndOpen(qid){
  agO=false;
  document.getElementById("agendaPanel").classList.remove("open");
  showD(qid);
}
function updateAgendaBadge(){
  var events=allUpcomingEvents(7);
  var urgent=events.filter(function(e){return e.diff<=2}).length;
  var badge=document.getElementById("agendaBadge");
  if(!badge) return;
  badge.textContent = urgent>0 ? String(urgent) : '';
  badge.style.display = urgent>0 ? 'inline-block' : 'none';
}

/* ============ DETAIL PANEL ============ */
/* ===== NDVI / NDRE / GNDVI (Sentinel-2 via proxy local) ===== */
var NDVI_PROXY=(location.hostname==='localhost'||location.hostname==='127.0.0.1')?'http://localhost:8799':'https://ndvi-iracemapolis.onrender.com';
var ndviIndex=null, ndviDate=null, ndviOverlay=null, ndviOpacity=0.78, ndviClip=true, ndviMeans=null, ndviZonas=false;
function _lerpColor(a,b,t){ function h(s,i){return parseInt(s.substr(i,2),16);} function c(x){x=Math.max(0,Math.min(255,Math.round(x)));return (x<16?'0':'')+x.toString(16);} return '#'+c(h(a,1)+(h(b,1)-h(a,1))*t)+c(h(a,3)+(h(b,3)-h(a,3))*t)+c(h(a,5)+(h(b,5)-h(a,5))*t); }
function _ndviColor(v){ if(v==null||isNaN(v)) return '#9e9e9e'; var s=[[0.15,'#d73027'],[0.3,'#fc8d59'],[0.45,'#fee08b'],[0.6,'#d9ef8b'],[0.75,'#91cf60'],[0.85,'#1a9850']]; if(v<=s[0][0])return s[0][1]; if(v>=s[s.length-1][0])return s[s.length-1][1]; for(var i=1;i<s.length;i++){ if(v<=s[i][0]) return _lerpColor(s[i-1][1],s[i][1],(v-s[i-1][0])/(s[i][0]-s[i-1][0])); } return s[s.length-1][1]; }
function ndviToggleZonas(){
  /* antes só recusava quando faltava a média; agora ela é calculada na hora — era isso que
     fazia o botão "colorir quadras por valor" parecer morto depois de carregar o índice */
  if(!ndviZonas && !ndviMeans){
    if(!ndviIndex||!ndviDate){ if(typeof _stxToast==='function')_stxToast('Carregue um índice (NDVI/NDRE…) primeiro'); return; }
    computeQuadraMeans(function(ok,msg){
      if(!ok){ if(typeof _stxToast==='function')_stxToast('Não deu para colorir: '+msg); return; }
      ndviZonas=true;
      if(ndviOverlay){ try{ ndviOverlay.setOpacity(0.12); }catch(e){} }
      render();
      if(document.getElementById('ndviPanel')&&document.getElementById('ndviPanel').style.display==='block') buildNdviPanel();
    });
    return;
  }
  ndviZonas=!ndviZonas; if(ndviOverlay){ try{ ndviOverlay.setOpacity(ndviZonas?0.12:ndviOpacity); }catch(e){} } render(); if(document.getElementById('ndviPanel')&&document.getElementById('ndviPanel').style.display==='block') buildNdviPanel(); }
/* NDVI usa sempre a área visível do mapa; o checkbox "Apenas quadras" liga/desliga o recorte. */
var _ndviMoveT=null;
function pointInRing(x,y,ring){ var inside=false,i,j;
  for(i=0,j=ring.length-1;i<ring.length;j=i++){ var xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    if(((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside; } return inside; }
/* Largura ideal (px) p/ amostrar o bbox perto do nativo do Sentinel-2 (~10 m), com leve
   superamostragem p/ suavizar; teto = máx da Process API (2500). Evita subamostrar áreas grandes. */
function ndviPx(bb){
  try{
    var w=bb[0], s=bb[1], e=bb[2], n=bb[3], midLat=(s+n)/2;
    var mWidth=Math.abs(e-w)*111320*Math.cos(midLat*Math.PI/180);
    var px=Math.round(mWidth/10*1.6);
    return Math.max(1024, Math.min(2500, px||1024));
  }catch(_e){ return 1024; }
}
/* Média do índice por quadra — é o que alimenta o zonamento ("colorir quadras por valor")
   e o ranking. TODO caminho de erro aqui era silencioso (catch vazio, blob nulo), então o
   botão de zonamento simplesmente não fazia nada e o usuário não tinha como saber por quê. */
function computeQuadraMeans(cb){
  function falhou(msg){ try{ ndviStatus(msg,'err'); }catch(e){} if(cb) cb(false,msg); }
  if(!ndviIndex||!ndviDate){ falhou('Carregue um índice (NDVI/NDRE…) antes de medir as quadras.'); return; }
  if(!quadrasAtivas().length){ falhou('Nenhuma quadra visível para medir.'); return; }
  var bb=ndviBBoxMedida();
  if(_bboxDegenerada(bb)){ falhou('Não consegui definir a área das quadras para medir (mapa sem dimensão ou quadras sem contorno).'); return; }
  try{ ndviStatus('Medindo as quadras…','wait'); }catch(e){}
  var w=bb[0], s=bb[1], e=bb[2], n=bb[3];
  fetch(NDVI_PROXY+'/index?index='+ndviIndex+'&date='+ndviDate+'&bbox='+bb.join(',')+'&width='+ndviPx(bb)+'&raw=1')
   .then(function(r){ if(!r.ok) throw new Error('o servidor NDVI respondeu '+r.status); return r.blob(); })
   .then(function(blob){ if(!blob) throw new Error('resposta vazia do servidor NDVI');
     var bu=URL.createObjectURL(blob), img=new Image();
     img.onerror=function(){ try{ URL.revokeObjectURL(bu); }catch(er){} falhou('Não consegui ler a imagem bruta do índice.'); };
     img.onload=function(){
       try{
         var iw=img.naturalWidth, ih=img.naturalHeight;
         var cv=document.createElement('canvas'); cv.width=iw; cv.height=ih;
         var ctx=cv.getContext('2d'); ctx.drawImage(img,0,0);
         var data=ctx.getImageData(0,0,iw,ih).data, means={};
         quadrasAtivas().forEach(function(id){
           var pp=QGEO[id]; if(!pp||pp.length<3) return;
           var ring=pp.map(function(p){ return [ (p[1]-w)/(e-w)*iw, (n-p[0])/(n-s)*ih ]; });
           var minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
           ring.forEach(function(q){ minx=Math.min(minx,q[0]); maxx=Math.max(maxx,q[0]); miny=Math.min(miny,q[1]); maxy=Math.max(maxy,q[1]); });
           minx=Math.max(0,Math.floor(minx)); maxx=Math.min(iw-1,Math.ceil(maxx));
           miny=Math.max(0,Math.floor(miny)); maxy=Math.min(ih-1,Math.ceil(maxy));
           var sum=0,cnt=0;
           for(var y=miny;y<=maxy;y++){ for(var x=minx;x<=maxx;x++){
             if(!pointInRing(x+0.5,y+0.5,ring)) continue;
             var o=(y*iw+x)*4; if(data[o+3]<128) continue;
             sum+=data[o]; cnt++; } }
           if(cnt>0) means[id]=(sum/cnt/255)*2-1;
         });
         if(!Object.keys(means).length){ URL.revokeObjectURL(bu); falhou('Não consegui medir nenhuma quadra nessa imagem (sem pixel válido — nuvem ou recorte fora da área?).'); return; }
         ndviMeans=means; renderNdviRank(); render();
         try{ ndviStatus(ndviIndex+' • '+ndviDate+' • '+Object.keys(means).length+' quadra(s) medida(s)','ok'); }catch(e){}
         URL.revokeObjectURL(bu);
         if(cb) cb(true,'');
         return;
       }catch(err){ URL.revokeObjectURL(bu); falhou('Falhei ao medir as quadras: '+(err&&err.message||err)); return; }
     };
     img.src=bu;
   }).catch(function(err){ falhou('Não consegui medir as quadras: '+(err&&err.message||err)); });
}
function renderNdviRank(){
  var el=document.getElementById('ndviRank'); if(!el) return;
  if(!ndviMeans){ el.innerHTML=''; return; }
  var arr=Object.keys(ndviMeans).map(function(id){return {id:id,v:ndviMeans[id]};}).sort(function(a,b){return b.v-a.v;});
  el.innerHTML='<div class="ndvi-rank-title">RANKING '+(ndviIndex||'')+' &middot; '+(ndviDate||'')+'</div>'+
    arr.map(function(o){ return '<div class="ndvi-rank-row" onclick="if(typeof showD===\'function\')showD(\''+o.id+'\')"><span>'+esc(quadraNome(o.id))+'</span><b>'+o.v.toFixed(2)+'</b></div>'; }).join('');
}
function quadrasMultiPolygon(){
  ensureQGEO(); var polys=[];
  quadrasAtivas().forEach(function(id){
    var pts=QGEO[id]; if(!pts||pts.length<3) return;
    var ring=pts.map(function(p){return [p[1],p[0]];}); ring.push(ring[0]); polys.push([ring]);
  });
  return { type:"MultiPolygon", coordinates: polys };
}
function ndviSetClip(v){ ndviClip=!!v; ndviLoadImage(); }
function ndviRefresh(){ ndviLoadDates(); if(ndviIndex && ndviDate) ndviLoadImage(); else ndviStatus('Escolha um índice e uma data.'); }
/* Ao mover/zoom o mapa com um índice ativo, recarrega a camada para a nova área (debounce) */
function ndviOnMove(){ var p=document.getElementById('ndviPanel'); if(!(p && p.style.display==='block' && ndviIndex && ndviDate)) return; clearTimeout(_ndviMoveT); _ndviMoveT=setTimeout(function(){ ndviLoadImage(); }, 700); }
function stationBBox(){
  ensureQGEO(); var a=99,b=999,c=-99,d=-999;
  quadrasAtivas().forEach(function(id){ QGEO[id].forEach(function(p){ if(p[0]<a)a=p[0]; if(p[0]>c)c=p[0]; if(p[1]<b)b=p[1]; if(p[1]>d)d=p[1]; }); });
  var ml=(c-a)*0.06, mg=(d-b)*0.06;
  return [b-mg, a-ml, d+mg, c+ml]; /* w,s,e,n */
}
/* BBox usado pelo NDVI: 'quadras' = Plantec; 'view' = o que está visível no mapa (qualquer lugar, via GPS) */
function ndviBBox(){
  /* Cobre o que está VISÍVEL no mapa (como funcionava antes). Pra pegar quadras de borda, é só
     dar um zoom-out até elas aparecerem e recarregar o NDVI. (Cobrir tudo derrubava a qualidade.) */
  if(_map){
    var b=_map.getBounds(), w=b.getWest(), s=b.getSouth(), e=b.getEast(), n=b.getNorth();
    var cx=(w+e)/2, cy=(s+n)/2, maxSpan=0.25;
    if(e-w>maxSpan){ w=cx-maxSpan/2; e=cx+maxSpan/2; }
    if(n-s>maxSpan){ s=cy-maxSpan/2; n=cy+maxSpan/2; }
    return [w,s,e,n];
  }
  return stationBBox();
}
/* Para MEDIR as quadras a caixa tem que cobrir as quadras — não o pedaço visível do mapa.
   Com a bbox do viewport, quadra fora da tela caía fora da imagem, o anel de pixels dava
   vazio e ela ficava sem média (o zonamento não pintava). E se o mapa ainda não tem tamanho
   a bbox do viewport degenera num ponto (oeste=leste), o que fazia a conta dividir por zero
   e devolver NaN em silêncio. Medido: com a caixa das quadras, as 34 saem medidas. */
function ndviBBoxMedida(){
  try{ ensureQGEO(); }catch(e){}
  var w=1e9,s=1e9,e=-1e9,n=-1e9,achou=false;
  quadrasAtivas().forEach(function(id){
    var pp=(typeof QGEO!=='undefined')?QGEO[id]:null; if(!pp||pp.length<3) return;
    pp.forEach(function(pt){ achou=true; if(pt[1]<w)w=pt[1]; if(pt[1]>e)e=pt[1]; if(pt[0]<s)s=pt[0]; if(pt[0]>n)n=pt[0]; });
  });
  if(!achou) return ndviBBox();
  var mw=(e-w)*0.02||0.0005, mh=(n-s)*0.02||0.0005;   /* folga p/ não cortar a borda da quadra */
  w-=mw; e+=mw; s-=mh; n+=mh;
  var cx=(w+e)/2, cy=(s+n)/2, maxSpan=0.25;            /* mesmo teto do ndviBBox */
  if(e-w>maxSpan){ w=cx-maxSpan/2; e=cx+maxSpan/2; }
  if(n-s>maxSpan){ s=cy-maxSpan/2; n=cy+maxSpan/2; }
  return [w,s,e,n];
}
function _bboxDegenerada(bb){ return !bb || !(bb[2]-bb[0]>1e-9) || !(bb[3]-bb[1]>1e-9); }
function ndviStatus(msg, kind){ var el=document.getElementById('ndviStatus'); if(el){ el.textContent=msg||''; el.style.color=kind==='err'?'#ff8a80':(kind==='ok'?'#9ac49a':'#9ab39a'); } }
var ndviProbe=false, _gpsMarker=null, _gpsCircle=null;
function quadraAt(lat,lng){ ensureQGEO(); var f=null;
  quadrasAtivas().forEach(function(id){ var pp=QGEO[id]; if(!pp||pp.length<3)return;
    var ring=pp.map(function(p){return [p[1],p[0]];}); if(pointInRing(lng,lat,ring)) f=id; }); return f; }
function ndviToggleProbe(){
  ndviProbe=!ndviProbe;
  if(_map){ _map.getContainer().style.cursor=ndviProbe?'crosshair':'';
    if(ndviProbe) _map.on('click',onProbeClick); else _map.off('click',onProbeClick); }
  buildNdviPanel(); render();
}
function onProbeClick(e){
  if(!ndviProbe) return;
  if(!ndviDate){ ndviStatus('Escolha uma data primeiro.','err'); return; }
  var lat=e.latlng.lat, lng=e.latlng.lng, q=quadraAt(lat,lng);
  var pop=LF.popup({className:'ndvi-pop',maxWidth:230}).setLatLng(e.latlng).setContent('<div class="ndvi-pop-b">Consultando…</div>').openOn(_map);
  fetch(NDVI_PROXY+'/point?lat='+lat+'&lng='+lng+'&date='+ndviDate)
   .then(function(r){return r.json();}).then(function(d){
     if(d.error){ pop.setContent('<div class="ndvi-pop-b">Erro: '+esc(d.error)+'</div>'); return; }
     function row(l,v){ return '<div class="ndvi-pop-row"><span>'+l+'</span><b>'+(v==null?'—':(v>0?'+':'')+v.toFixed(2))+'</b></div>'; }
     pop.setContent('<div class="ndvi-pop-b"><div class="ndvi-pop-t">'+(q?('Quadra '+esc(q)):'fora das quadras')+' &middot; '+(d.date||ndviDate)+'</div>'+row('NDVI',d.ndvi)+row('NDRE',d.ndre)+row('GNDVI',d.gndvi)+row('NDMI',d.ndmi)+'</div>');
   }).catch(function(){ pop.setContent('<div class="ndvi-pop-b">Proxy desligado? Rode python3 ndvi-proxy.py</div>'); });
}
/* GPS de PRECISÃO: coleta vários sinais por alguns segundos e fica com o de MENOR erro
   (ignora leituras grosseiras > maxAcc; para cedo quando atinge 'target'). onUpd = cada melhora; onEnd = melhor (ou null). */
function gpsBest(opts, onUpd, onEnd){
  opts=opts||{};
  var target=opts.target||10, maxWait=opts.maxWait||9000, maxAcc=opts.maxAcc||80;
  if(!navigator.geolocation){ if(onEnd)onEnd(null,'GPS indisponível'); return; }
  var best=null, watch=null, timer=null, done=false;
  function finish(reason){ if(done)return; done=true; try{navigator.geolocation.clearWatch(watch);}catch(e){} clearTimeout(timer); if(onEnd)onEnd(best, best?null:(reason||'sem sinal')); }
  try{
    watch=navigator.geolocation.watchPosition(function(p){
      var a=(p.coords.accuracy==null?9999:p.coords.accuracy);
      if(a>maxAcc) return;
      if(!best || a<best.acc){ best={lat:p.coords.latitude,lng:p.coords.longitude,acc:a,ts:Date.now()}; if(onUpd)onUpd(best); }
      if(best && best.acc<=target) finish();
    }, function(err){ if(!best) finish(err&&err.message); }, {enableHighAccuracy:true, timeout:maxWait, maximumAge:0});
  }catch(e){ finish('erro'); return; }
  timer=setTimeout(function(){ finish('timeout'); }, maxWait+500);
}
function locateMe(){
  if(!navigator.geolocation){ alert('GPS não disponível neste navegador.'); return; }
  if(!_map) initMap();
  var centered=false;
  function draw(b, fim){
    var ll=[b.lat,b.lng];
    if(_gpsMarker) _map.removeLayer(_gpsMarker);
    _gpsMarker=LF.marker(ll,{icon:LF.divIcon({className:'gps-dot',html:'<div></div>',iconSize:[20,20],iconAnchor:[10,10]}),zIndexOffset:1400}).addTo(_map);
    if(_gpsCircle) _map.removeLayer(_gpsCircle);
    _gpsCircle=LF.circle(ll,{radius:Math.max(b.acc,1),color:'#2196f3',weight:1,fillColor:'#2196f3',fillOpacity:.12,interactive:false}).addTo(_map);
    _gpsMarker.bindPopup('Você está aqui · ±'+Math.round(b.acc)+' m'+(fim?'':' · afinando…')).openPopup();
    if(!centered){ centered=true; try{ _map.setView(ll, Math.max(_map.getZoom()||16,17)); }catch(e){} }
    if(fim && ndviIndex && ndviDate){ setTimeout(function(){ try{ ndviLoadImage(); }catch(e){} }, 400); }
  }
  gpsBest({target:8, maxWait:9000, maxAcc:80}, function(b){ draw(b,false); }, function(b,err){
    if(!b){ alert('Não consegui o GPS.\nObs.: abrindo o arquivo direto (file://) o navegador bloqueia o GPS — funciona via localhost/https ou no app instalado.'+(err?('\n('+err+')'):'')); return; }
    draw(b,true);
  });
}
/* ===================== NAVEGAÇÃO GPS ATÉ UM PONTO (quadra / estudo / pin) ===================== */
var _navWatch=null,_navTarget=null,_navLine=null,_navTgtMarker=null,_navHeading=null,_navLabel='',_navOrient=null,_navCentered=false;
function _bearing(a,b){ var p1=a[0]*Math.PI/180,p2=b[0]*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180; var y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl); return (Math.atan2(y,x)*180/Math.PI+360)%360; }
function _cardinal(b){ return ['Norte','Nordeste','Leste','Sudeste','Sul','Sudoeste','Oeste','Noroeste'][Math.round((((b%360)+360)%360)/45)%8]; }
function _navCss(){ if(document.getElementById('navCss'))return; var s=document.createElement('style'); s.id='navCss';
  s.textContent='.nav-hud{position:fixed;top:46px;left:50%;transform:translateX(-50%);z-index:1600;background:rgba(12,18,15,.94);color:#eafaea;border:1px solid #2a4a2a;border-radius:14px;padding:10px 12px;box-shadow:0 8px 30px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);width:min(92vw,360px);font-family:-apple-system,system-ui,sans-serif}'+
  '.nav-row{display:flex;align-items:center;gap:12px}'+
  '.nav-arrow{font-size:30px;line-height:1;color:#37d684;transition:transform .25s ease;flex:none;width:34px;text-align:center}'+
  '.nav-info{flex:1;min-width:0}.nav-dist{font-size:26px;font-weight:900;line-height:1;color:#eafaea}'+
  '.nav-dir{font-size:12px;color:#bfe6cd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '.nav-stop{flex:none;background:#3a1414;color:#ffb3a8;border:1px solid #7a2b22;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer}'+
  '.nav-sub{font-size:11px;color:#9ac49a;margin-top:6px;text-align:center}'+
  '.nav-target .nav-tg{width:20px;height:20px;border-radius:50%;background:rgba(55,214,132,.3);border:3px solid #37d684;box-shadow:0 0 0 2px rgba(0,0,0,.35)}';
  document.head.appendChild(s); }
function navStartQuadra(id){ var c=(typeof quadraCenter==='function')?quadraCenter(id):null; if(!c){ alert('Esta quadra não tem geometria no mapa.'); return; } navStart(c[0],c[1],'Quadra '+quadraNome(id)); }
function navStart(lat,lng,label){
  if(!navigator.geolocation){ alert('GPS não disponível neste navegador.'); return; }
  if(!_map) initMap();
  navStop();
  _navTarget=[lat,lng]; _navLabel=label||'destino'; _navCentered=false;
  try{ if(typeof closeDetail==='function') closeDetail(); }catch(e){}
  ['sdOvl','dOvl','eeOvl'].forEach(function(o){ var el=document.getElementById(o); if(el) el.classList.remove('open'); });
  _navCss();
  _navTgtMarker=LF.marker(_navTarget,{icon:LF.divIcon({className:'nav-target',html:'<div class="nav-tg"></div>',iconSize:[26,26],iconAnchor:[13,13]}),zIndexOffset:1500}).addTo(_map);
  _navHud(); _navInitHeading();
  try{ _navWatch=navigator.geolocation.watchPosition(_navOnPos, function(err){ var s=document.getElementById('navSub'); if(s) s.textContent='GPS: '+((err&&err.message)||'sem sinal')+' (precisa de https/app)'; }, {enableHighAccuracy:true,maximumAge:1000,timeout:20000}); }catch(e){}
}
function _navHud(){ var h=document.getElementById('navHud'); if(!h){ h=document.createElement('div'); h.id='navHud'; h.className='nav-hud'; document.body.appendChild(h); }
  h.innerHTML='<div class="nav-row"><div class="nav-arrow" id="navArrow">&#9650;</div><div class="nav-info"><div class="nav-dist" id="navDist">— m</div><div class="nav-dir" id="navDir">'+esc(_navLabel)+'</div></div><button class="nav-stop" onclick="navStop()">Parar</button></div><div class="nav-sub" id="navSub">obtendo GPS…</div>'; }
function _navOnPos(p){
  if(!_navTarget) return;
  var me=[p.coords.latitude,p.coords.longitude], acc=(p.coords.accuracy!=null?p.coords.accuracy:null);
  if(_gpsMarker) _map.removeLayer(_gpsMarker);
  _gpsMarker=LF.marker(me,{icon:LF.divIcon({className:'gps-dot',html:'<div></div>',iconSize:[20,20],iconAnchor:[10,10]}),zIndexOffset:1400}).addTo(_map);
  if(_navLine) _map.removeLayer(_navLine);
  _navLine=LF.polyline([me,_navTarget],{color:'#37d684',weight:4,opacity:.9,dashArray:'2 9'}).addTo(_map);
  var dist=measureDistance(me,_navTarget), brg=_bearing(me,_navTarget);
  if(!_navCentered){ _navCentered=true; try{ _map.fitBounds(LF.latLngBounds([me,_navTarget]).pad(0.35)); }catch(e){} }
  var dEl=document.getElementById('navDist'),dirEl=document.getElementById('navDir'),arEl=document.getElementById('navArrow'),sub=document.getElementById('navSub');
  if(dEl){ dEl.textContent=(dist<1000?Math.round(dist)+' m':(dist/1000).toFixed(2)+' km'); dEl.style.color=(dist<=5?'#37d684':'#eafaea'); }
  if(dirEl) dirEl.textContent=_navLabel+' · '+_cardinal(brg)+' '+Math.round(brg)+'°';
  if(arEl) arEl.style.transform='rotate('+(brg-(_navHeading!=null?_navHeading:0))+'deg)';
  if(sub){ if(dist<=5) sub.textContent='✓ Você chegou! (±'+(acc!=null?Math.round(acc):'?')+' m)'; else sub.textContent=(_navHeading!=null?'Siga a seta':'Rumo (do Norte): '+_cardinal(brg))+' · ±'+(acc!=null?Math.round(acc):'?')+' m'; }
}
function _navInitHeading(){
  function onO(ev){ var hd=null; if(ev.webkitCompassHeading!=null) hd=ev.webkitCompassHeading; else if(ev.absolute===true && ev.alpha!=null) hd=(360-ev.alpha)%360; if(hd!=null) _navHeading=hd; }
  _navOrient=onO;
  try{
    if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){ DeviceOrientationEvent.requestPermission().then(function(st){ if(st==='granted') window.addEventListener('deviceorientation',onO,true); }).catch(function(){}); }
    else { window.addEventListener('deviceorientationabsolute',onO,true); window.addEventListener('deviceorientation',onO,true); }
  }catch(e){}
}

function navStop(){
  if(_navWatch!=null){ try{ navigator.geolocation.clearWatch(_navWatch); }catch(e){} _navWatch=null; }
  if(_navOrient){ try{ window.removeEventListener('deviceorientationabsolute',_navOrient,true); window.removeEventListener('deviceorientation',_navOrient,true); }catch(e){} _navOrient=null; }
  if(_navLine){ try{ _map.removeLayer(_navLine); }catch(e){} _navLine=null; }
  if(_navTgtMarker){ try{ _map.removeLayer(_navTgtMarker); }catch(e){} _navTgtMarker=null; }
  _navHeading=null; _navTarget=null; _navCentered=false;
  var h=document.getElementById('navHud'); if(h) h.remove();
}


function deleteQuadraFromEdit(){
  if(!curE) return;
  var id=curE, nome=quadraNome(id);
  requireDeletePassword('Excluir a quadra "'+nome+'" e todos os dados dela.', function(){
    safetyBackup('antes de excluir quadra '+nome);
    delete QGEO[id]; if(data[id]) delete data[id];
    ensureLocais(); delete QLOCAL[id]; if(QNOME) delete QNOME[id];
    _delQuadras[id]=Date.now(); saveDelTombs(); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('quadras',id); }catch(e){} /* Etapa 3 */
    _cloudAllowShrink=true;
    saveQLocal(); saveQNome();
    saveQGEO(); save();
    closeEdit();
    if(editId===id) editId=null;
    render();
    if(typeof buildEditPanel==='function') buildEditPanel();
    updateAgendaBadge();
  });
}

/* ===== NOTAS DE CAMPO (Scouting) ===== */
var NOTAS_CAMPO_KEY="iracema-notas-v1", DELN_KEY="iracema-deln-v1";
var NOTAS_CAMPO=null, _delNotas=null;
var scoutingModeActive=false;
var _currentNoteCoords=null;
var _tempPhotoBase64=null;

function loadNotas(){
  try{
    var s=localStorage.getItem(NOTAS_CAMPO_KEY);
    NOTAS_CAMPO=s?JSON.parse(s):[];
  }catch(e){ NOTAS_CAMPO=[]; }
  try{
    var d=localStorage.getItem(DELN_KEY);
    _delNotas=d?JSON.parse(d):{};
  }catch(e){ _delNotas={}; }
  if(!Array.isArray(NOTAS_CAMPO)) NOTAS_CAMPO=[];
  if(!_delNotas || typeof _delNotas!=='object') _delNotas={};
}

function saveNotas(){
  try{
    localStorage.setItem(NOTAS_CAMPO_KEY, JSON.stringify(NOTAS_CAMPO));
    localStorage.setItem(DELN_KEY, JSON.stringify(_delNotas));
  }catch(e){}
  if(typeof cloudSaveSoon==='function') cloudSaveSoon();
  if(typeof dbUpsertNotasAll==='function') dbUpsertNotasAll(); /* Etapa 3: observações de campo */
}

function ensureNotas(){
  if(!NOTAS_CAMPO || !_delNotas) loadNotas();
}

/* FAB das ferramentas do mapa: abre/fecha o leque (NDVI/Clima/Medir/Observação/GPS) */
function toggleToolDock(force){
  var d=document.getElementById('toolDock'); if(!d) return;
  var open=(force!==undefined)?!!force:!d.classList.contains('open');
  d.classList.toggle('open', open);
  var fab=d.querySelector('.tool-fab'); if(fab) fab.setAttribute('aria-expanded', open?'true':'false');
  /* troca do ícone via inline (imune a temas: a regra global .tool-ico{display:inline-flex} vencia o CSS) */
  var o=d.querySelector('.fab-open'), c=d.querySelector('.fab-close');
  if(o) o.style.setProperty('display', open?'none':'inline-flex', 'important');
  if(c) c.style.setProperty('display', open?'inline-flex':'none', 'important');
}
try{ toggleToolDock(false); }catch(e){} /* estado inicial fechado (o !important do tema claro vence o inline simples) */
function toggleScoutingMode(forceState){
  var active=(forceState!==undefined)?forceState:!scoutingModeActive;
  scoutingModeActive=active;
  var btn=document.querySelector('.tool-note');
  var banner=document.getElementById('scoutingBanner');
  
  if(scoutingModeActive){
    if(typeof editMode!=='undefined' && (editMode || drawMode)){
      _stxToast("Conclua ou cancele a edição do talhão antes.");
      scoutingModeActive=false;
      return;
    }
    if(typeof toggleNdvi==='function' && document.getElementById('ndviPanel') && document.getElementById('ndviPanel').style.display==='block'){
      toggleNdvi();
    }
    if(typeof toggleClima==='function' && document.getElementById('climaPanel') && document.getElementById('climaPanel').style.display==='block'){
      toggleClima();
    }
    if(typeof _measure!=='undefined' && _measure.open){
      toggleMeasure();
    }
    
    if(btn) btn.classList.add('on');
    if(banner) banner.style.display='flex';
    _map.getContainer().style.cursor='crosshair';
    _map.on('click', onMapClickScouting);
    render(); /* re-desenha as quadras NÃO-interativas: o toque vira só da nota (não abre mais a quadra) */
    /* ESC também sai do modo (além do ✕ e de tocar o pin de novo) */
    if(!window.__scoutEsc){ window.__scoutEsc=true;
      document.addEventListener('keydown', function(ev){ if(ev.key==='Escape' && scoutingModeActive) toggleScoutingMode(false); });
    }
  }else{
    if(btn) btn.classList.remove('on');
    if(banner) banner.style.display='none';
    if(_map) {
      _map.getContainer().style.cursor='';
      _map.off('click', onMapClickScouting);
      render(); /* devolve a interatividade das quadras */
    }
  }
}

function onMapClickScouting(e){
  if(!scoutingModeActive) return;
  var lat=e.latlng.lat;
  var lng=e.latlng.lng;
  openNoteModal(lat, lng);
}

function scoutingUseGPS(){
  _stxToast("Obtendo localização GPS de alta precisão…");
  gpsBest(
    {target:10, maxWait:8000, maxAcc:100},
    function(b){},
    function(b, err){
      if(err || !b){
        alert("Não foi possível obter a localização do GPS. Verifique a permissão do navegador.");
        return;
      }
      var lat=b.lat;
      var lng=b.lng;
      toggleScoutingMode(false);
      openNoteModal(lat, lng);
    }
  );
}

function findQuadraContaining(lat, lng){
  var found=null;
  ensureQGEO();
  if(!QGEO) return null;
  var ids=quadrasAtivas();
  for(var i=0;i<ids.length;i++){
    var id=ids[i];
    var ring=QGEO[id];
    if(!ring || ring.length<3) continue;
    var ringXY=ring.map(function(p){ return [p[1], p[0]]; });
    if(pointInRing(lng, lat, ringXY)){
      found=id;
      break;
    }
  }
  return found;
}

function openNoteModal(lat, lng){
  _tempPhotoBase64=null;
  _currentNoteCoords={lat:lat, lng:lng};
  var qid=findQuadraContaining(lat, lng);
  
  var h='<button class="panel-x-tr" onclick="closeNoteModal()" aria-label="Fechar" title="Fechar">✕</button>'+
        '<div class="edit-title">NÚCLEO REGISTRADOR</div>'+
        '<div class="edit-id">Nova Observação</div>'+
        '<div class="edit-subtitle">'+lat.toFixed(6)+', '+lng.toFixed(6)+(qid?' &middot; Talhão: '+quadraNome(qid):'')+'</div>';
        
  h+='<form id="noteForm" onsubmit="saveNoteForm(event)">'+
     '<label class="e-lbl">TÍTULO / TÓPICO</label>'+
     '<input type="text" id="noteTitle" class="e-inp" required placeholder="Ex: Foco de Lagarta, Deficiência de N, etc.">'+
     
     '<label class="e-lbl">CATEGORIA</label>'+
     '<select id="noteCategory" class="e-inp" required style="background:#060a06;color:#ddd;border:1px solid #1e2e1e;">'+
       '<optgroup label="Agronômico">'+
         '<option value="praga">🕷️ Praga</option>'+
         '<option value="doenca">🦠 Doença</option>'+
         '<option value="daninha">🌱 Planta Daninha</option>'+
         '<option value="deficiencia">🧪 Deficiência Nutricional</option>'+
       '</optgroup>'+
       '<optgroup label="Manutenção / Infraestrutura">'+
         '<option value="irrigacao">💧 Irrigação</option>'+
         '<option value="vazamento">💦 Vazamento</option>'+
         '<option value="buraco">🕳️ Buraco / Erosão</option>'+
         '<option value="manutencao">🔧 Manutenção (geral)</option>'+
       '</optgroup>'+
       '<option value="outro">📝 Outro / Observação Geral</option>'+
     '</select>'+
     
     '<div class="e-row">'+
       '<div>'+
         '<label class="e-lbl">SEVERIDADE</label>'+
         '<select id="noteSeverity" class="e-inp" required style="background:#060a06;color:#ddd;border:1px solid #1e2e1e;">'+
           '<option value="baixa">🟢 Baixa</option>'+
           '<option value="media">🟡 Média</option>'+
           '<option value="alta">🔴 Alta</option>'+
         '</select>'+
       '</div>'+
       '<div>'+
         '<label class="e-lbl">RECOMENDAÇÃO</label>'+
         '<select id="noteRecommendation" class="e-inp" required style="background:#060a06;color:#ddd;border:1px solid #1e2e1e;">'+
           '<option value="monitorar">🔍 Apenas Monitorar</option>'+
           '<option value="aplicar">⚠️ Aplicar Tratamento</option>'+
           '<option value="nenhuma">✅ Nenhuma Ação</option>'+
         '</select>'+
       '</div>'+
     '</div>'+
     
     '<label class="e-lbl">DESCRIÇÃO DETALHADA</label>'+
     '<textarea id="noteDescription" class="e-inp" rows="4" placeholder="Descreva os sintomas, nível de severidade ou observações gerais..." style="resize:vertical;font-family:inherit;"></textarea>'+
     
     '<div class="e-btns">'+
       '<button type="submit" class="e-btn e-save">SALVAR NOTA</button>'+
       '<button type="button" onclick="closeNoteModal()" class="e-btn e-cancel">CANCELAR</button>'+
     '</div>'+
     '</form>';
     
  var _np=document.getElementById("notePnl"); _np.style.position="relative"; _np.innerHTML=h;
  document.getElementById("noteOvl").style.display="flex";
}

function closeNoteModal(){
  document.getElementById("noteOvl").style.display="none";
  _currentNoteCoords=null;
  _tempPhotoBase64=null;
}

function handleNotePhoto(event){
  var file=event.target.files[0];
  if(!file) return;
  
  var statusSpan=document.getElementById('notePhotoStatus');
  if(statusSpan) statusSpan.textContent='Processando imagem…';
  
  var reader=new FileReader();
  reader.onload=function(e){
    var base64=e.target.result;
    resizeImage(base64, 800, 800, 0.75, function(resizedBase64){
      _tempPhotoBase64=resizedBase64;
      if(statusSpan) statusSpan.textContent='Imagem anexada ('+Math.round(resizedBase64.length/1024)+' KB)';
      
      var previewContainer=document.getElementById('notePhotoPreviewContainer');
      var previewImg=document.getElementById('notePhotoPreview');
      if(previewContainer && previewImg){
        previewImg.src=resizedBase64;
        previewContainer.style.display='block';
      }
    });
  };
  reader.readAsDataURL(file);
}

function removeNotePhoto(){
  _tempPhotoBase64=null;
  var statusSpan=document.getElementById('notePhotoStatus');
  if(statusSpan) statusSpan.textContent='Nenhuma foto anexada';
  
  var previewContainer=document.getElementById('notePhotoPreviewContainer');
  if(previewContainer) previewContainer.style.display='none';
  
  var fileInput=document.getElementById('notePhoto');
  if(fileInput) fileInput.value='';
}

function resizeImage(base64, maxWidth, maxHeight, quality, callback){
  var img=new Image();
  img.onload=function(){
    var width=img.width;
    var height=img.height;
    
    if(width>height){
      if(width>maxWidth){
        height=Math.round(height*maxWidth/width);
        width=maxWidth;
      }
    }else{
      if(height>maxHeight){
        width=Math.round(width*maxHeight/height);
        height=maxHeight;
      }
    }
    
    var canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    
    var ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0,width,height);
    
    var resized=canvas.toDataURL('image/jpeg', quality);
    callback(resized);
  };
  img.src=base64;
}

function saveNoteForm(event){
  if(event) event.preventDefault();
  if(!_currentNoteCoords){ alert('Local da observação não definido — toque no mapa ou use "Usar GPS" e tente de novo.'); return; }

  var title=document.getElementById('noteTitle').value.trim();
  var category=document.getElementById('noteCategory').value;
  var severity=document.getElementById('noteSeverity').value;
  var recommendation=document.getElementById('noteRecommendation').value;
  var description=document.getElementById('noteDescription').value.trim();
  
  if(!title){
    alert("Por favor, preencha o título da nota.");
    return;
  }
  
  ensureNotas();
  var qid=findQuadraContaining(_currentNoteCoords.lat, _currentNoteCoords.lng);
  
  var newNote={
    id:"note_"+uid(),
    lat:_currentNoteCoords.lat,
    lng:_currentNoteCoords.lng,
    localId:localAtivo,
    quadraId:qid,
    titulo:title,
    categoria:category,
    severidade:severity,
    recomendacao:recommendation,
    descricao:description,
    foto:_tempPhotoBase64,
    criadoEm:new Date().toISOString().split('T')[0],
    resolvido:false,
    _ts:Date.now() /* carimbo: no merge, a edição mais nova vence */
  };
  
  NOTAS_CAMPO.push(newNote);
  saveNotas();
  closeNoteModal();
  toggleScoutingMode(false); /* salvou: sai do modo sozinho (sem caçar o Cancelar) */
  renderNotas(true);
  _stxToast("✓ Observação salva!");
}

function renderNotas(force){
  if(!_map || !_notesLayer) return;
  /* não destrói um popup de nota ABERTO (senão o pin "fecha sozinho" quando o app salva/sincroniza).
     Só pula no redesenho ambiente (render/sync); ações de nota chamam renderNotas(true). */
  if(!force){ try{ var _aberto=false; _notesLayer.eachLayer(function(l){ if(l.isPopupOpen && l.isPopupOpen()) _aberto=true; }); if(_aberto) return; }catch(e){} }
  _notesLayer.clearLayers();
  
  ensureNotas();
  
  var activeNotes=NOTAS_CAMPO.filter(function(n){
    return (n.localId||HOME_LOCAL)===localAtivo;
  });
  
  activeNotes.forEach(function(n){
    var color='#26a69a';
    var iconSvg='';
    
    if(n.categoria==='praga'){
      color='#ef5350';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M5 7l1.5 1.5M19 7l-1.5 1.5M9 18l-1.5 1.5M15 18l1.5 1.5M12 6a6 6 0 0 0-6 6v3a6 6 0 0 0 12 0v-3a6 6 0 0 0-6-6zM6 12h12M12 8v8"/></svg>';
    }else if(n.categoria==='doenca'){
      color='#ff9800';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8a7.02 7.02 0 0 1-9 10z"/><path d="M19 2c-2.26 4.33-5.27 7.14-8 10"/></svg>';
    }else if(n.categoria==='daninha'){
      color='#ab47bc';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8M12 8c-2-2.5-5-2.5-7 .5 2 .5 4 1.5 7-1.5zM12 12c2.5-2 2.5-5-.5-7-.5 2-1.5 4 1 7z"/></svg>';
    }else if(n.categoria==='deficiencia'){
      color='#29b6f6';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>';
    }else if(n.categoria==='irrigacao'){
      color='#2196f3';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
    }else if(n.categoria==='vazamento'){
      color='#00acc1';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 4.8 7 3.5c-.29 1.3-1.14 2.63-2.29 3.56S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A11 11 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>';
    }else if(n.categoria==='buraco'){
      color='#8d6e63';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/></svg>';
    }else if(n.categoria==='manutencao'){
      color='#607d8b';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
    }else{
      color='#26a69a';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    }
    
    if(n.resolvido){
      color='#90a4ae';
      iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    }
    
    var markerHtml='<div class="note-pin'+(n.resolvido?' resolved':'')+'" style="background-color: '+color+'; color: white;">'+
      iconSvg+
      '</div>';
      
    var icon=LF.divIcon({
      className:'custom-note-icon',
      html:markerHtml,
      iconSize:[32, 32],
      iconAnchor:[16, 32]
    });
    
    var marker=LF.marker([n.lat, n.lng], {icon:icon}).addTo(_notesLayer);
    marker.bindPopup(getNotePopupHtml(n), {maxWidth:300, className:'note-pop'});
  });
}

function getNotePopupHtml(n){
  var catLabels={
    praga:'🕷️ Praga',
    doenca:'🦠 Doença',
    daninha:'🌱 Planta Daninha',
    deficiencia:'🧪 Deficiência',
    irrigacao:'💧 Irrigação',
    vazamento:'💦 Vazamento',
    buraco:'🕳️ Buraco / Erosão',
    manutencao:'🔧 Manutenção',
    outro:'📝 Geral'
  };
  
  var catColors={
    praga:'#ef5350',
    doenca:'#ff9800',
    daninha:'#ab47bc',
    deficiencia:'#29b6f6',
    irrigacao:'#2196f3',
    vazamento:'#00acc1',
    buraco:'#8d6e63',
    manutencao:'#607d8b',
    outro:'#26a69a'
  };
  
  var catName=catLabels[n.categoria] || 'Outro';
  var catColor=catColors[n.categoria] || '#26a69a';
  
  var h='<div class="note-popup" style="font-family:-apple-system,system-ui,sans-serif;color:var(--text, #ddd);padding:2px;">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid var(--border, rgba(255,255,255,0.08));padding-bottom:6px;">'+
            '<span style="font-size:10px;font-weight:700;color:'+catColor+';letter-spacing:1px;text-transform:uppercase;">'+catName+'</span>'+
            '<span style="font-size:10px;color:var(--text-3, #888);">'+n.criadoEm+'</span>'+
          '</div>'+
          '<h3 style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:var(--text, #fff);line-height:1.2;">'+esc(n.titulo)+'</h3>';
          
  if(n.quadraId){
    h+='<div style="font-size:11px;color:var(--text-2, #aaa);margin-bottom:8px;"><b>Talhão:</b> '+esc(quadraNome(n.quadraId))+'</div>';
  }
  
  var sevLabels={
    baixa:'🟢 Baixa',
    media:'🟡 Média',
    alta:'🔴 Alta'
  };
  var recLabels={
    monitorar:'🔍 Monitorar',
    aplicar:'⚠️ Aplicar Tratamento',
    nenhuma:'✅ Nenhuma Ação'
  };
  
  if(n.severidade || n.recomendacao){
    h+='<div style="font-size:11px;color:var(--text-2, #aaa);margin-bottom:8px;display:flex;gap:12px;flex-wrap:wrap;">';
    if(n.severidade){
      h+='<span><b>Severidade:</b> '+(sevLabels[n.severidade]||n.severidade)+'</span>';
    }
    if(n.recomendacao){
      h+='<span><b>Ação:</b> '+(recLabels[n.recomendacao]||n.recomendacao)+'</span>';
    }
    h+='</div>';
  }
  
  if(n.descricao){
    h+='<p style="margin:0 0 8px 0;font-size:12px;color:var(--text-2, #bbb);line-height:1.4;white-space:pre-wrap;">'+esc(n.descricao)+'</p>';
  }
  
  if(n.foto){
    h+='<div class="note-popup-img-container" style="margin-bottom:10px;border-radius:6px;overflow:hidden;border:1px solid var(--border, rgba(255,255,255,0.1));max-height:140px;cursor:pointer;" onclick="openFullPhoto(\''+n.id+'\')">'+
         '<img src="'+n.foto+'" style="width:100%;height:100%;object-fit:cover;" title="Clique para ampliar">'+
       '</div>';
  }
  
  h+='<div style="display:flex;gap:6px;margin-top:8px;">'+
         '<button onclick="toggleNoteResolved(\''+n.id+'\')" style="flex:1;background:var(--accent-soft, #1e3a1e);color:var(--accent, #8c8);border:1px solid var(--accent, #3a5a3a);padding:5px 8px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:bold;">'+ 
           (n.resolvido?'Reabrir':'Marcar Resolvido')+ 
         '</button>'+
         '<button onclick="deleteNote(\''+n.id+'\')" style="background:rgba(215,90,78,.15);color:var(--danger, #f88);border:1px solid var(--danger, #5a3a3a);padding:5px 8px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:bold;">'+
           'Excluir'+
         '</button>'+
       '</div>'+
       '</div>';
       
  return h;
}

function openFullPhoto(noteId){
  ensureNotas();
  var n=null;
  for(var i=0;i<NOTAS_CAMPO.length;i++){
    if(NOTAS_CAMPO[i].id===noteId){
      n=NOTAS_CAMPO[i];
      break;
    }
  }
  if(!n || !n.foto) return;
  
  var modal=document.getElementById('photoFullOvl');
  if(!modal){
    modal=document.createElement('div');
    modal.id='photoFullOvl';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.92);display:none;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
    modal.onclick=function(){ modal.style.display='none'; };
    
    var img=document.createElement('img');
    img.id='photoFullImg';
    img.style.cssText='max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.8);';
    modal.appendChild(img);
    
    document.body.appendChild(modal);
  }
  
  document.getElementById('photoFullImg').src=n.foto;
  modal.style.display='flex';
}

function toggleNoteResolved(noteId){
  ensureNotas();
  var idx=-1;
  for(var i=0;i<NOTAS_CAMPO.length;i++){
    if(NOTAS_CAMPO[i].id===noteId){
      idx=i;
      break;
    }
  }
  if(idx!==-1){
    NOTAS_CAMPO[idx].resolvido=!NOTAS_CAMPO[idx].resolvido;
    NOTAS_CAMPO[idx]._ts=Date.now(); /* carimbo: resolver/reabrir mais novo vence no merge */
    saveNotas();
    try{ _map.closePopup(); }catch(e){}
    renderNotas(true);
    _stxToast(NOTAS_CAMPO[idx].resolvido?"✓ Observação marcada como resolvida!":"Observação reaberta.");
  }
}

function deleteNote(noteId){
  if(!confirm("Tem certeza que deseja excluir esta observação de campo?")) return;
  
  ensureNotas();
  var idx=-1;
  for(var i=0;i<NOTAS_CAMPO.length;i++){
    if(NOTAS_CAMPO[i].id===noteId){
      idx=i;
      break;
    }
  }
  if(idx!==-1){
    _delNotas[noteId]=Date.now(); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('notas_campo',noteId); }catch(e){} /* Etapa 3 */
    NOTAS_CAMPO.splice(idx,1);
    saveNotas();
    try{ _map.closePopup(); }catch(e){}
    renderNotas(true);
    _stxToast("Observação excluída.");
  }
}

/* ===================== CLIMA — estação meteorológica (Ecowitt) ===================== */
var CLIMA_PROXY=NDVI_PROXY;
var _climaStations=null, climaMac=null, _climaTimer=null, _climaMode='estacao', _climaWhere=null;
function _climaCss(){ if(document.getElementById('climaCss'))return; var s=document.createElement('style'); s.id='climaCss';
  s.textContent='.clima-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}'+
  '.clima-card{background:var(--surface-2,#11210f);border:1px solid var(--border,#26322b);border-radius:10px;padding:8px 10px;min-width:0}'+
  '.clima-card .lab{font-size:10px;color:var(--text-3,#8aa88a);font-weight:600;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '.clima-card .val{font-size:17px;font-weight:800;color:var(--text,#eaf3ed);margin-top:2px;line-height:1.1}'+
  '.clima-card .val small{font-size:10px;font-weight:600;color:var(--text-3,#8aa88a)}'+
  '.clima-temp{grid-column:1/3;display:flex;align-items:center;justify-content:space-between;gap:10px}'+
  '.clima-temp .t{font-size:32px;font-weight:800;color:var(--text,#eaf3ed);line-height:1}'+
  '.clima-foot{font-size:10px;color:var(--text-3,#7a8a7a);margin-top:2px;text-align:center}';
  document.head.appendChild(s);
}
function _climaNorm(t){ return (t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,''); }
function climaMatch(){
  if(!_climaStations||!_climaStations.length) return null;
  var nm=_climaNorm((LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].nome)||'');
  if(nm){
    for(var i=0;i<_climaStations.length;i++){ var sn=_climaNorm(_climaStations[i].name); if(sn&&(sn.indexOf(nm)>=0||nm.indexOf(sn)>=0)) return _climaStations[i].mac; }
    var toks=nm.match(/[a-z]{4,}/g)||[];
    for(var j=0;j<_climaStations.length;j++){ var s2=_climaNorm(_climaStations[j].name);
      for(var k=0;k<toks.length;k++){ if(s2.indexOf(toks[k])>=0) return _climaStations[j].mac; } }
  }
  /* NÃO cai na primeira estação da lista. Num local sem Ecowitt (Picolini, em
     Cordeirópolis) isso mostrava o tempo de Iracemápolis como se fosse dali —
     dado de outro município apresentado como local, sem nada avisando. Sem
     estação que case, quem chamou trata o null e vai para o satélite. */
  return null;
}
function toggleClima(){
  var p=document.getElementById('climaPanel');
  if(p&&p.style.display==='block'){ p.style.display='none'; if(_climaTimer){clearInterval(_climaTimer);_climaTimer=null;} return; }
  var nv=document.getElementById('ndviPanel'); if(nv) nv.style.display='none';
  if(typeof scoutingModeActive!=='undefined'&&scoutingModeActive) toggleScoutingMode(false);
  _climaCss(); buildClimaPanel(); climaModeInit();
}
function climaModeInit(){ if(_climaMode==='local') climaLocalLoad(); else climaInit(); }
function climaSetMode(m){ _climaMode=m; buildClimaPanel(); climaModeInit(); }
function buildClimaPanel(){
  var p=document.getElementById('climaPanel');
  if(!p){ p=document.createElement('div'); p.id='climaPanel'; p.className='ndvi-panel'; document.body.appendChild(p); }
  var modeBtns='<div class="ndvi-ixrow" style="margin-bottom:6px">'+
    '<button class="ndvi-ix'+(_climaMode==='estacao'?' on':'')+'" onclick="climaSetMode(\'estacao\')">'+ic('sat',14)+' Estação</button>'+
    '<button class="ndvi-ix'+(_climaMode==='local'?' on':'')+'" onclick="climaSetMode(\'local\')">'+ic('globe',14)+' Local</button></div>';
  var ctrl='';
  if(_climaMode==='estacao'){
    var opts=_climaStations? _climaStations.map(function(st){ return '<option value="'+st.mac+'"'+(st.mac===climaMac?' selected':'')+'>'+esc(st.name)+'</option>'; }).join('') : '';
    ctrl=(_climaStations? '<label class="gr-ctl"><span>Estação</span><select onchange="climaPick(this.value)">'+opts+'</select></label>' : '');
    /* A coordenada da estação é digitada por quem instala e às vezes fica no
       padrão de fábrica. Isso não afeta a LEITURA (que vem pelo MAC), mas
       estraga o nascer/pôr do sol — e ninguém descobre sem ser avisado. */
    var _stSel=(_climaStations||[]).filter(function(s){ return s.mac===climaMac; })[0];
    if(_stSel && _coordSuspeita(_stSel.lat,_stSel.lng)){
      var _cAtivo=(LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].centro)||null;
      var _dist=_cAtivo?Math.round(_kmEntre(_cAtivo[0],_cAtivo[1],_stSel.lat,_stSel.lng)):null;
      ctrl+='<div style="margin:6px 0;padding:7px 9px;border-radius:8px;background:#2a210c;border:1px solid #6b531b;color:#ffd98a;font-size:11px;line-height:1.5">'+
        '⚠ A coordenada cadastrada nesta estação ('+(+_stSel.lat).toFixed(4)+', '+(+_stSel.lng).toFixed(4)+')'+
        (_dist!=null?(' fica a '+_dist+' km daqui'):' não parece ser do Brasil')+'. '+
        'A leitura do tempo continua correta — ela vem pelo aparelho, não pela coordenada. Só o nascer/pôr do sol a usa. Vale corrigir no app da Ecowitt.</div>';
    }
  } else {
    var nm=(typeof LOCAIS==='object'&&LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].nome)||'—';
    ctrl='<div class="gr-ctl"><span>Local</span><span style="flex:1;color:var(--accent,#37d684);font-weight:700;overflow:hidden;text-overflow:ellipsis">'+esc(nm)+'</span><button class="ndvi-ix" onclick="climaGps()">'+ic('pin',14)+' GPS</button></div>';
  }
  p.innerHTML='<div class="gr-head"><div class="gr-title">'+ic('weather',14)+' CLIMA</div><button class="gr-x" onclick="toggleClima()" aria-label="Fechar" title="Fechar">×</button></div>'+modeBtns+ctrl+
    '<div id="climaBody"></div>'+
    '';
  p.style.display='block';
}
function _climaLocalCoord(){
  var c=(typeof LOCAIS==='object'&&LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].centro);
  if(c&&c.length===2&&!isNaN(c[0])) return c.slice();
  return null;
}
function climaGps(){
  if(!navigator.geolocation){ climaSay('GPS indisponível neste aparelho.','err'); return; }
  climaSay('Pegando seu GPS…');
  gpsBest({target:15, maxWait:8000, maxAcc:300}, null, function(b){
    if(b) climaLocalLoad([b.lat,b.lng],true);
    else climaSay('Não consegui o GPS (precisa de https e permissão).','err');
  });
}
function climaLocalLoad(ll,fromGps){
  if(_climaTimer){ clearInterval(_climaTimer); _climaTimer=null; }
  ll = ll || _climaWhere || _climaLocalCoord();
  if(!ll){ climaSay('Sem coordenada do local — toque em 📍 GPS, ou defina o centro do Local.'); return; }
  _climaWhere=ll;
  climaSay('Buscando previsão do local…');
  var url='https://api.open-meteo.com/v1/forecast?latitude='+(+ll[0]).toFixed(4)+'&longitude='+(+ll[1]).toFixed(4)+
    '&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,vapour_pressure_deficit,shortwave_radiation'+
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,sunrise,sunset,daylight_duration'+
    '&timezone=America%2FSao_Paulo&forecast_days=7';
  fetch(url).then(function(r){return r.json();}).then(function(j){
    if(!j||j.error){ climaSay('Previsão indisponível: '+((j&&j.reason)||'erro'),'err'); return; }
    climaLocalRender(j, ll, fromGps);
  }).catch(function(){ climaSay('Sem internet pra previsão agora. (Open-Meteo precisa de conexão.)','err'); });
}
function climaLocalRender(j, ll, fromGps){
  var b=document.getElementById('climaBody'); if(!b) return;
  function card(lab,val,unit){ return '<div class="clima-card"><div class="lab">'+lab+'</div><div class="val">'+val+(unit?' <small>'+unit+'</small>':'')+'</div></div>'; }
  function nv(x,dec){ if(x==null||x==='') return '—'; return (typeof x==='number'&&dec!=null)?x.toFixed(dec):x; }
  function hm(iso){ if(!iso) return '—'; var t=String(iso).split('T')[1]||''; return t.slice(0,5); }
  var c=j.current||{}, du=j.daily||{};
  var dir=(c.wind_direction_10m!=null)?Math.round(c.wind_direction_10m):null;
  var h='<div class="clima-grid">';
  h+='<div class="clima-card clima-temp"><div><div class="lab">'+ic('thermo',13)+' Temperatura</div><div class="t">'+nv(c.temperature_2m,1)+'°C</div></div>'+
     '<div style="text-align:right"><div class="lab">Máx/Mín hoje</div><div class="val">'+nv(du.temperature_2m_max&&du.temperature_2m_max[0],0)+'/'+nv(du.temperature_2m_min&&du.temperature_2m_min[0],0)+'<small>°C</small></div></div></div>';
  h+=card(''+ic('droplet',13)+'Umidade', nv(c.relative_humidity_2m,0),'%');
  h+=card(''+ic('gauge',13)+'VPD', nv(c.vapour_pressure_deficit,2),'kPa');
  h+=card(''+ic('gauge',13)+'Pressão', nv(c.surface_pressure,0),'hPa');
  h+=card(''+ic('wind',13)+'Vento', nv(c.wind_speed_10m,1), 'km/h'+(dir!=null?' '+_compass(dir):''));
  h+=card(''+ic('rain',13)+'Chuva agora', nv(c.precipitation,1),'mm');
  h+=card(''+ic('droplet',13)+'ETo hoje', nv(du.et0_fao_evapotranspiration&&du.et0_fao_evapotranspiration[0],1),'mm');
  h+='</div>';
  var dl=du.daylight_duration&&du.daylight_duration[0], dlh=dl!=null?Math.floor(dl/3600):null, dlm=dl!=null?Math.round((dl%3600)/60):null;
  h+='<div class="clima-grid" style="margin-top:0">'+card(''+ic('sunrise',13)+'Nascer', hm(du.sunrise&&du.sunrise[0]),'')+card(''+ic('sunset',13)+'Pôr', hm(du.sunset&&du.sunset[0]),'')+
     (dlh!=null?'<div class="clima-card" style="grid-column:1/3"><div class="lab">'+ic('sun',13)+'Horas de luz</div><div class="val">'+dlh+'h'+(dlm?(' '+dlm+'min'):'')+'</div></div>':'')+'</div>';
  if(du.time&&du.time.length>1){
    h+='<div class="clima-card" style="margin-top:7px"><div class="lab">PREVISÃO</div>'+
       '<div style="display:grid;grid-template-columns:auto auto 1fr auto;gap:3px 10px;font-size:12px;margin-top:5px;align-items:center">';
    for(var i=1;i<Math.min(du.time.length,6);i++){
      var dt=new Date(du.time[i]+'T12:00:00');
      h+='<span style="color:var(--text-3,#8aa88a);text-transform:capitalize">'+esc(dt.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}))+'</span>'+
         '<span><b>'+nv(du.temperature_2m_min[i],0)+'–'+nv(du.temperature_2m_max[i],0)+'°</b></span>'+
         '<span>'+ic('rain',13)+''+nv(du.precipitation_sum[i],1)+' mm</span>'+
         '<span>ETo '+nv(du.et0_fao_evapotranspiration[i],1)+'</span>';
    }
    h+='</div></div>';
  }
  var lbl = fromGps ? ('📍 onde estou ('+(+ll[0]).toFixed(3)+', '+(+ll[1]).toFixed(3)+')')
    : ('📍 '+esc((typeof LOCAIS==='object'&&LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].nome)||((+ll[0]).toFixed(3)+', '+(+ll[1]).toFixed(3))));
  h+='<div class="clima-foot">'+lbl+' · previsão Open-Meteo (grátis)</div>';
  b.innerHTML=h;
}
function climaSay(msg,cls){ var b=document.getElementById('climaBody'); if(b) b.innerHTML='<div class="ndvi-status'+(cls?' '+cls:'')+'" style="margin:8px 0;min-height:auto">'+esc(msg)+'</div>'; }

/* ===== CHIP DO CLIMA SOBRE O MAPA ==========================================
   O tempo é o dado que se olha de relance, e no dock ele estava a dois toques
   de distância. O chip segue o LOCAL ATIVO: se o local tem estação Ecowitt, é
   dela que vem o número (selo "estação"); se não tem — Picolini, em
   Cordeirópolis — cai na previsão por satélite e o selo diz "satélite", para
   ninguém confundir leitura de sensor com previsão de grade.
   Toque abre o painel completo, que continua sendo o mesmo de antes. */
var _climaChipTimer=null, _climaChipMac=null;
function _climaChipEl(){ return document.getElementById('climaChip'); }
function climaChipPinta(o){
  var el=_climaChipEl(); if(!el) return;
  if(!o){ el.style.display='none'; return; }
  var n=function(v,d){ return (v==null||v==='')?null:(Math.round(v*Math.pow(10,d||0))/Math.pow(10,d||0)); };
  var t=n(o.temp,1), ur=n(o.umidade,0), vt=n(o.vento,0);
  if(t==null && ur==null){ el.style.display='none'; return; }
  /* Uma linha só. O nome do lugar saiu: já está na barra de cima, e era ele que
     fazia o chip ocupar meia tela. Fica no title, para quem quiser confirmar. */
  /* O separador mora DENTRO do span do vento: em tela estreita o CSS esconde o
     vento, e um " · " solto ficava pendurado no fim da linha. */
  var linha='';
  if(ur!=null) linha+='<span class="cc-u">'+ic('droplet',10)+' '+ur+'%</span>';
  if(vt!=null) linha+='<span class="cc-w">'+(linha?' · ':'')+ic('wind',10)+' '+vt+' km/h</span>';
  el.innerHTML='<span class="cc-t">'+(t!=null?(String(t).replace('.',',')+'°'):'—')+'</span>'+
    (linha?('<span class="cc-v">'+linha+'</span>'):'')+
    '<span class="cc-src '+(o.estacao?'est':'sat')+'">'+(o.estacao?'estação':'satélite')+'</span>';
  el.title=(o.estacao?'Estação Ecowitt de ':'Previsão por satélite para ')+(o.lugar||'este local')+
           ' — toque para abrir o painel completo';
  el.style.display='flex';
}
function climaChipAtualiza(){
  var el=_climaChipEl(); if(!el) return;
  var lugar=(typeof LOCAIS==='object'&&LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].nome)||'';
  function satelite(){
    var ll=(typeof _climaLocalCoord==='function')?_climaLocalCoord():null;
    if(!ll){ climaChipPinta(null); return; }
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+(+ll[0]).toFixed(4)+'&longitude='+(+ll[1]).toFixed(4)+
          '&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=America%2FSao_Paulo')
      .then(function(r){ return r.json(); })
      .then(function(j){ var c=j&&j.current; if(!c){ climaChipPinta(null); return; }
        climaChipPinta({temp:c.temperature_2m, umidade:c.relative_humidity_2m, vento:c.wind_speed_10m,
                        lugar:lugar, estacao:false}); })
      .catch(function(){ climaChipPinta(null); });
  }
  function comEstacoes(){
    var mac=climaMatch();
    _climaChipMac=mac;
    if(!mac){ satelite(); return; }
    fetch(CLIMA_PROXY+'/clima?mac='+encodeURIComponent(mac)).then(function(r){ return r.json(); }).then(function(d){
      if(!d||d.error){ satelite(); return; }
      var v=function(x){ return (x&&x.value!=null)?x.value:null; };
      climaChipPinta({temp:v(d.temp), umidade:v(d.humidity), vento:v(d.wind_speed), lugar:lugar, estacao:true});
    }).catch(satelite);
  }
  if(_climaStations){ comEstacoes(); return; }
  fetch(CLIMA_PROXY+'/clima/estacoes').then(function(r){ return r.json(); }).then(function(arr){
    if(Array.isArray(arr)) _climaStations=arr;
    comEstacoes();
  }).catch(satelite);   /* proxy dormindo não pode deixar o chip vazio */
}
function climaChipIniciar(){
  if(!_climaChipEl()) return;
  climaChipAtualiza();
  if(_climaChipTimer) clearInterval(_climaChipTimer);
  /* 5 min: é o passo de gravação da própria Ecowitt; puxar mais rápido só gasta bateria */
  _climaChipTimer=setInterval(function(){ if(!document.hidden) climaChipAtualiza(); }, 300000);
}
function climaInit(){
  if(_climaStations){ if(!climaMac) climaMac=climaMatch(); buildClimaPanel(); climaLoad(); return; }
  climaSay('Conectando à estação…');
  fetch(CLIMA_PROXY+'/clima/estacoes').then(function(r){return r.json();}).then(function(arr){
    if(!arr||arr.error){ climaSay((arr&&arr.error)||'Não consegui listar as estações.','err'); return; }
    _climaStations=arr; climaMac=climaMatch(); buildClimaPanel(); climaLoad();
  }).catch(function(){ climaSay('Servidor do clima fora do ar. Tente em alguns segundos (ele “acorda” na 1ª chamada).','err'); });
}
function climaPick(mac){ climaMac=mac; climaLoad(); }
function climaLoad(){
  /* Sem estação que case com o local ativo, o clima vem do satélite (Open-Meteo)
     para a coordenada DESTE local — e o rodapé diz que é previsão, não estação.
     Antes caía na primeira estação da lista e mostrava outro município como se
     fosse aqui. Trocar de estação na mão continua funcionando. */
  if(!climaMac){
    var _nm=(typeof LOCAIS==='object'&&LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].nome)||'este local';
    climaSay('Sem estação Ecowitt em '+_nm+' — usando a previsão por satélite.');
    try{ climaLocalLoad(null,false); }catch(e){}
    return;
  }
  if(_climaTimer){ clearInterval(_climaTimer); _climaTimer=null; }
  climaSay('Carregando dados ao vivo…');
  fetch(CLIMA_PROXY+'/clima?mac='+encodeURIComponent(climaMac)).then(function(r){return r.json();}).then(function(d){
    if(!d||d.error){ climaSay((d&&d.error)||'Erro ao ler a estação.','err'); return; }
    climaRender(d);
    _climaTimer=setInterval(function(){ var p=document.getElementById('climaPanel'); if(p&&p.style.display==='block') climaLoad(); else { clearInterval(_climaTimer); _climaTimer=null; } }, 300000);
  }).catch(function(){ climaSay('Não consegui ler a estação agora.','err'); });
}
function _cval(n,dec){ if(!n||n.value==null||n.value==='') return '—'; var v=n.value; if(typeof v==='number'&&dec!=null) v=v.toFixed(dec); return v; }
function _compass(deg){ if(deg==null) return ''; return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'][Math.round(deg/22.5)%16]; }
/* Nascer/pôr do sol + horas de luz — cálculo OFFLINE (equação do nascer do sol, NOAA).
   date local; lat/lng em graus. Retorna {sunrise:Date, sunset:Date, dayMs} (UTC) ou {polar}. */
function sunriseSunset(date, lat, lng){
  var rad=Math.PI/180;
  var Jdate=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000 + 2440587.5;
  var n=Math.ceil(Jdate - 2451545.0 + 0.0008);
  var Jstar=n - (lng/360.0);
  var M=(357.5291 + 0.98560028*Jstar) % 360, Mr=M*rad;
  var C=1.9148*Math.sin(Mr) + 0.0200*Math.sin(2*Mr) + 0.0003*Math.sin(3*Mr);
  var lambda=(M + C + 282.9372) % 360, lr=lambda*rad;
  var Jtransit=2451545.0 + Jstar + 0.0053*Math.sin(Mr) - 0.0069*Math.sin(2*lr);
  var delta=Math.asin(Math.sin(lr)*Math.sin(23.4397*rad));
  var cosH=(Math.sin(-0.833*rad) - Math.sin(lat*rad)*Math.sin(delta)) / (Math.cos(lat*rad)*Math.cos(delta));
  if(cosH>=1) return {polar:'night'};
  if(cosH<=-1) return {polar:'day'};
  var H=Math.acos(cosH)/rad;
  function jd2date(jd){ return new Date((jd - 2440587.5)*86400000); }
  var sr=jd2date(Jtransit - H/360.0), ss=jd2date(Jtransit + H/360.0);
  return { sunrise:sr, sunset:ss, dayMs:(ss-sr) };
}
/* Coordenada p/ o sol da estação selecionada: prefere o CENTRO do Local georreferenciado
   que casa com a estação (confiável); senão a coord cadastrada da estação. */
function _climaSunLL(){
  var st=(_climaStations||[]).filter(function(s){return s.mac===climaMac;})[0]; if(!st) return null;
  if(typeof LOCAIS==='object' && LOCAIS){
    var sn=_climaNorm(st.name||''), ids=Object.keys(LOCAIS), i, k;
    for(i=0;i<ids.length;i++){ var c=LOCAIS[ids[i]].centro, ln=_climaNorm(LOCAIS[ids[i]].nome||'');
      if(c&&c.length===2&&ln&&(sn.indexOf(ln)>=0||ln.indexOf(sn)>=0)) return c; }
    var toks=sn.match(/[a-z]{4,}/g)||[];
    for(i=0;i<ids.length;i++){ var c2=LOCAIS[ids[i]].centro, ln2=_climaNorm(LOCAIS[ids[i]].nome||'');
      if(c2&&c2.length===2){ for(k=0;k<toks.length;k++){ if(ln2.indexOf(toks[k])>=0) return c2; } } }
  }
  /* Última reserva: a coordenada CADASTRADA na estação. Só que ela é digitada
     por quem instala o aparelho e frequentemente fica no padrão de fábrica —
     em agosto/2026, das quatro estações, a de Anápolis apontava para Cleveland
     (EUA), 7.259 km fora, e a de Iracemápolis para a capital, 138 km fora.
     Usar isso para calcular nascer/pôr do sol daria horário de outro fuso.
     Só aceita se for plausível: dentro do Brasil e perto do local ativo. */
  if(st.lat!=null && st.lng!=null && _coordPlausivel(st.lat, st.lng)) return [st.lat, st.lng];
  return null;
}
/* São DUAS perguntas diferentes, e misturá-las num limite só estava errado:

   USAR a coordenada?  Só recusa erro grosseiro — fora do Brasil ou a mais de
   300 km. A 138 km o erro no nascer do sol é de ~3,5 min, irrelevante em campo;
   recusar por isso seria jogar fora um dado utilizável.

   AVISAR o usuário?  Bem antes disso. Estação a mais de 50 km do local que ela
   deveria representar é erro de cadastro, mesmo que o cálculo aguente. Ele só
   conserta no app da Ecowitt se alguém contar. */
function _coordDistanciaDoLocal(lat, lng){
  try{
    var c=(LOCAIS&&localAtivo&&LOCAIS[localAtivo]&&LOCAIS[localAtivo].centro)||null;
    if(c&&c.length===2) return _kmEntre(c[0],c[1],Number(lat),Number(lng));
  }catch(e){}
  return null;
}
function _coordNoBrasil(lat, lng){
  lat=Number(lat); lng=Number(lng);
  return isFinite(lat)&&isFinite(lng) && lat>-34 && lat<6 && lng>-74 && lng<-34;
}
function _coordPlausivel(lat, lng){          /* dá para USAR no cálculo do sol? */
  if(!_coordNoBrasil(lat,lng)) return false;
  var d=_coordDistanciaDoLocal(lat,lng);
  return !(d!=null && d>300);
}
function _coordSuspeita(lat, lng){           /* merece AVISO ao usuário? */
  if(lat==null||lng==null) return false;
  if(!_coordNoBrasil(lat,lng)) return true;
  var d=_coordDistanciaDoLocal(lat,lng);
  return (d!=null && d>50);
}
function _kmEntre(la1,lo1,la2,lo2){
  var R=6371, r=Math.PI/180;
  var dLa=(la2-la1)*r, dLo=(lo2-lo1)*r;
  var a=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
}
function climaRender(d){
  var b=document.getElementById('climaBody'); if(!b) return;
  function card(lab,val,unit){ return '<div class="clima-card"><div class="lab">'+lab+'</div><div class="val">'+val+(unit?' <small>'+unit+'</small>':'')+'</div></div>'; }
  var dir=(d.wind_dir&&d.wind_dir.value!=null)?Math.round(d.wind_dir.value):null;
  var h='<div class="clima-grid">';
  h+='<div class="clima-card clima-temp"><div><div class="lab">'+ic('thermo',13)+' Temperatura</div><div class="t">'+_cval(d.temp,1)+'°C</div></div>'+
     '<div style="text-align:right"><div class="lab">Sensação</div><div class="val">'+_cval(d.feels_like,1)+'<small>°C</small></div></div></div>';
  h+=card(''+ic('droplet',13)+'Umidade', _cval(d.humidity,0),'%');
  h+=card(''+ic('droplet',13)+'Orvalho', _cval(d.dew_point,1),'°C');
  h+=card(''+ic('gauge',13)+'VPD', _cval(d.vpd,2), (d.vpd&&d.vpd.unit)||'kPa');
  h+=card(''+ic('gauge',13)+'Pressão', _cval(d.pressure,0),'hPa');
  h+=card(''+ic('wind',13)+'Vento', _cval(d.wind_speed,1), 'km/h'+(dir!=null?' '+_compass(dir):''));
  h+=card(''+ic('wind',13)+'Rajada', _cval(d.wind_gust,1),'km/h');
  h+=card(''+ic('rain',13)+'Chuva hoje', _cval(d.rain_day,1),'mm');
  h+=card(''+ic('sun',13)+'Radiação', _cval(d.solar,0),'W/m²');
  h+='</div>';
  h+='<div class="clima-grid" style="margin-top:0">'+card('Chuva semana', _cval(d.rain_week,1),'mm')+card('Chuva mês', _cval(d.rain_month,1),'mm')+'</div>';
  /* Sol: nascer/pôr + horas de luz (offline, do Local/estação) */
  var ll=_climaSunLL();
  if(ll){
    var su=sunriseSunset(new Date(), ll[0], ll[1]);
    if(su && !su.polar){
      var tz={timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'};
      var sr=su.sunrise.toLocaleTimeString('pt-BR',tz), ss=su.sunset.toLocaleTimeString('pt-BR',tz);
      var hh=Math.floor(su.dayMs/3600000), mm=Math.round((su.dayMs%3600000)/60000); if(mm===60){hh++;mm=0;}
      h+='<div class="clima-grid" style="margin-top:0">'+card(''+ic('sunrise',13)+'Nascer do sol', sr,'')+card(''+ic('sunset',13)+'Pôr do sol', ss,'')+
         '<div class="clima-card" style="grid-column:1/3"><div class="lab">'+ic('sun',13)+'Horas de luz</div><div class="val">'+hh+'h'+(mm?(' '+mm+'min'):'')+'</div></div></div>';
    }
  }
  var ts=d.time?new Date(d.time*1000):null;
  h+='<div class="clima-foot">'+(ts?('atualizado '+ts.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})):'')+' · auto 5 min '+ic('refresh',11)+'</div>';
  b.innerHTML=h;
}
function toggleNdvi(){
  var p=document.getElementById('ndviPanel');
  if(p && p.style.display==='block'){ p.style.display='none'; return; }
  var cp=document.getElementById('climaPanel'); if(cp) cp.style.display='none';
  if(typeof scoutingModeActive!=='undefined'&&scoutingModeActive) toggleScoutingMode(false);
  if(!_map) initMap();
  ensureQGEO(); /* não bloqueia: o NDVI também funciona fora das quadras */
  if(_map && !_map.__ndviMove){ _map.__ndviMove=true; _map.on('moveend', ndviOnMove); }
  buildNdviPanel(); ndviCheckProxy();
}
function buildNdviPanel(){
  var p=document.getElementById('ndviPanel');
  if(!p){ p=document.createElement('div'); p.id='ndviPanel'; p.className='ndvi-panel'; document.body.appendChild(p); }
  function btn(ix,label){ return '<button class="ndvi-ix'+(ndviIndex===ix?' on':'')+'" onclick="ndviSetIndex(\''+ix+'\')">'+(label||ix)+'</button>'; }
  p.innerHTML='<div class="gr-head"><div class="gr-title">'+ic('sat',14)+' ÍNDICES (Sentinel-2)</div><button class="gr-x" onclick="toggleNdvi()" aria-label="Fechar" title="Fechar">×</button></div>'+
    '<div class="ndvi-ixrow">'+btn('NDVI')+btn('NDRE')+btn('GNDVI')+btn('NDMI')+'</div>'+
    '<button class="ndvi-zona-btn'+(ndviZonas?' on':'')+'" onclick="ndviToggleZonas()">'+ic('sat',13)+' '+(ndviZonas?'Zonamento ligado (quadras coloridas)':'Colorir quadras por valor (zonamento)')+'</button>'+
    '<label class="gr-ctl"><span>Data</span><input type="date" id="ndviDateInput" max="'+todayISO()+'"'+(ndviDate?' value="'+ndviDate+'"':'')+' onchange="ndviSetDate(this.value)"></label>'+
    '<label class="gr-ctl"><span>Sugestões</span><select id="ndviDateSel" onchange="ndviSetDate(this.value)"><option value="">datas com imagem…</option></select></label>'+
    '<label class="gr-ctl"><span>Opacidade</span><input type="range" min="0.2" max="1" step="0.05" value="'+ndviOpacity+'" oninput="ndviSetOpacity(this.value)"></label>'+
    '<label class="gr-ctl" style="cursor:pointer"><span>Apenas quadras</span><input type="checkbox" '+(ndviClip?'checked':'')+' onchange="ndviSetClip(this.checked)" style="flex:none;width:auto"></label>'+
    '<div class="ndvi-legend"><span>baixo</span><i class="ndvi-bar"></i><span>alto</span></div>'+
    '<div class="ndvi-ticks"><span>-0.2</span><span>0.2</span><span>0.5</span><span>0.8</span></div>'+
    '<div class="gr-btns" style="margin:6px 0 2px"><button class="ndvi-ix'+(ndviProbe?' on':'')+'" style="flex:1" onclick="ndviToggleProbe()">'+ic('search',14)+' '+(ndviProbe?'Consultando — clique no mapa':'Consultar ponto')+'</button></div>'+
    '<div id="ndviStatus" class="ndvi-status"></div>'+
    '<div id="ndviRank" class="ndvi-rank"></div>'+
    '<button class="ndvi-clear-btn" onclick="ndviClear()">'+ic('refresh',14)+' Remover NDVI do mapa</button>';
  p.style.display='block';
}
function ndviCheckProxy(){
  ndviStatus('Conectando ao proxy…');
  fetch(NDVI_PROXY+'/health').then(function(r){return r.json();}).then(function(h){
    if(!h.hasCreds){ ndviStatus('Proxy ligado, mas falta a credencial (crie ndvi-credenciais.json).','err'); return; }
    ndviLoadDates();
  }).catch(function(){ ndviStatus('Proxy desligado. No Terminal: python3 ndvi-proxy.py','err'); });
}
function ndviLoadDates(){
  var bb=ndviBBox(), to=todayISO();
  var dt=new Date(); dt.setMonth(dt.getMonth()-6);
  var from=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  ndviStatus('Buscando datas disponíveis…');
  fetch(NDVI_PROXY+'/dates?bbox='+bb.join(',')+'&from='+from+'&to='+to).then(function(r){return r.json();}).then(function(arr){
    if(arr.error || !arr.length){ ndviStatus('Lista de datas indisponível — digite uma data no campo acima.'); return; }
    var sel=document.getElementById('ndviDateSel'); if(!sel)return;
    sel.innerHTML='<option value="">datas com imagem…</option>'+arr.map(function(d){
      return '<option value="'+d.date+'">'+d.date+(d.cloud!=null?'  ('+Math.round(d.cloud)+'% nuvem)':'')+'</option>'; }).join('');
    ndviStatus(arr.length+' datas disponíveis. Escolha índice + data.','ok');
  }).catch(function(){ ndviStatus('Lista de datas indisponível — digite uma data no campo acima.'); });
}
function ndviSetIndex(ix){ ndviIndex=ix; buildNdviPanel(); ndviCheckProxy(); ndviLoadImage(); }
function ndviSetDate(d){ ndviDate=d||null; var inp=document.getElementById('ndviDateInput'); if(inp&&d) inp.value=d; ndviLoadImage(); }
function ndviSetOpacity(v){ ndviOpacity=parseFloat(v); if(ndviOverlay) ndviOverlay.setOpacity(ndviOpacity); }
function ndviClear(){ ndviIndex=null; ndviMeans=null; if(ndviOverlay){ _map.removeLayer(ndviOverlay); ndviOverlay=null; } buildNdviPanel(); ndviCheckProxy(); render(); }
var _ndviObjURL=null;
function ndviLoadImage(){
  if(!ndviIndex || !ndviDate) return;
  var bb=ndviBBox(), w=bb[0], s=bb[1], e=bb[2], n=bb[3];
  ndviStatus('Carregando '+ndviIndex+' de '+ndviDate+'…');
  fetch(NDVI_PROXY+'/index?index='+ndviIndex+'&date='+ndviDate+'&bbox='+bb.join(',')+'&width='+ndviPx(bb))
   .then(function(r){ if(r.ok) return r.blob(); return r.json().then(function(j){ throw (j.error||'erro'); }); })
   .then(function(blob){
     var bu=URL.createObjectURL(blob), img=new Image();
     img.onload=function(){
       var iw=img.naturalWidth||1024, ih=img.naturalHeight||1024, url=bu;
       var isTC=(ndviIndex==='TRUECOLOR');
       if(ndviClip && !isTC){
         try{
           var cv=document.createElement('canvas'); cv.width=iw; cv.height=ih;
           var ctx=cv.getContext('2d'); ctx.beginPath();
           quadrasAtivas().forEach(function(id){
             var pp=QGEO[id]; if(!pp||pp.length<3) return;
             pp.forEach(function(p,i){ var px=(p[1]-w)/(e-w)*iw, py=(n-p[0])/(n-s)*ih; if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); });
             ctx.closePath();
           });
           ctx.clip(); ctx.drawImage(img,0,0); url=cv.toDataURL('image/png');
         }catch(err){ url=bu; }
       }
       if(ndviOverlay) _map.removeLayer(ndviOverlay);
       if(_ndviObjURL){ try{ URL.revokeObjectURL(_ndviObjURL); }catch(er){} _ndviObjURL=null; } /* libera o blob do overlay anterior */
       ndviOverlay=LF.imageOverlay(url,[[s,w],[n,e]],{opacity:ndviOpacity}).addTo(_map);
       ndviOverlay.bringToFront();
       if(url===bu){ _ndviObjURL=bu; } else { try{ URL.revokeObjectURL(bu); }catch(er){} } /* recortou (dataURL) -> o blob não é mais usado */
       if(isTC){ ndviStatus('Cor real (Sentinel-2) • '+ndviDate,'ok'); ndviMeans=null; renderNdviRank(); }
       else { ndviStatus(ndviIndex+' • '+ndviDate+(ndviClip?' (apenas quadras)':''),'ok'); computeQuadraMeans(); }
     };
     img.onerror=function(){ try{ URL.revokeObjectURL(bu); }catch(er){} ndviStatus('Erro ao carregar a imagem.','err'); };
     img.src=bu;
   }).catch(function(e){ ndviStatus('Sem imagem nessa data: '+e,'err'); });
}
/* Série temporal por quadra (Statistical API) */
function ndviSerie(id){
  if(!_map) initMap(); ensureQGEO();
  var pts=QGEO&&QGEO[id]; if(!pts) return;
  var ring=pts.map(function(p){return [p[1],p[0]];}); ring.push(ring[0]);
  var geom={type:'Polygon', coordinates:[ring]};
  var to=todayISO(); var dt=new Date(); dt.setFullYear(dt.getFullYear()-1);
  var from=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  var ix=ndviIndex||'NDVI';
  showSerieModal(id, ix, 'carregando');
  fetch(NDVI_PROXY+'/stats?index='+ix+'&from='+from+'&to='+to+'&geom='+encodeURIComponent(JSON.stringify(geom)))
   .then(function(r){return r.json();}).then(function(arr){
     if(arr.error){ showSerieModal(id, ix, null, arr.error); return; }
     showSerieModal(id, ix, arr);
   }).catch(function(){ showSerieModal(id, ix, null, 'Proxy desligado? Rode: python3 ndvi-proxy.py'); });
}
function showSerieModal(id, ix, arr, err){
  var m=document.getElementById('ndviModal');
  if(!m){ m=document.createElement('div'); m.id='ndviModal'; m.className='ndvi-modal'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  var inner='<div class="ndvi-modal-box"><div class="ndvi-modal-top"><b>'+esc(ix)+' — quadra '+esc(id)+'</b><button onclick="document.getElementById(\'ndviModal\').style.display=\'none\'">✕</button></div>';
  if(err){ inner+='<div class="ndvi-status" style="color:#ff8a80">'+esc(String(err))+'</div>'; }
  else if(arr==='carregando'){ inner+='<div class="ndvi-status">Calculando série dos últimos 12 meses…</div>'; }
  else if(!arr.length){ inner+='<div class="ndvi-status">Sem dados no período (muita nuvem?).</div>'; }
  else { inner+=serieSvg(arr); var last=arr[arr.length-1];
    inner+='<div class="ndvi-status">Último: <b style="color:#9ac49a">'+last.mean.toFixed(2)+'</b> em '+last.date+' • '+arr.length+' datas</div>'; }
  inner+='</div>';
  m.innerHTML=inner; m.style.display='flex';
}
function serieSvg(arr){
  var W=520,H=180,pad=30;
  var means=arr.map(function(d){return d.mean;});
  var mn=Math.min.apply(null,means), mx=Math.max.apply(null,means); if(mx-mn<0.05){mx+=0.03;mn-=0.03;}
  function X(i){ return pad + (W-2*pad)*(arr.length<2?0.5:i/(arr.length-1)); }
  function Y(v){ return H-pad - (H-2*pad)*(v-mn)/(mx-mn); }
  var path=arr.map(function(d,i){return (i?'L':'M')+X(i).toFixed(1)+' '+Y(d.mean).toFixed(1);}).join(' ');
  var dots=arr.map(function(d,i){return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(d.mean).toFixed(1)+'" r="2.5" fill="#9ac49a"/>';}).join('');
  var lbls='<text x="4" y="14" fill="#789" font-size="10">'+mx.toFixed(2)+'</text><text x="4" y="'+(H-pad+4)+'" fill="#789" font-size="10">'+mn.toFixed(2)+'</text>';
  var dlab='<text x="'+pad+'" y="'+(H-8)+'" fill="#789" font-size="9">'+arr[0].date+'</text><text x="'+(W-pad)+'" y="'+(H-8)+'" fill="#789" font-size="9" text-anchor="end">'+arr[arr.length-1].date+'</text>';
  return '<svg width="100%" viewBox="0 0 '+W+' '+H+'" class="ndvi-svg"><rect width="'+W+'" height="'+H+'" fill="#0a110a"/><path d="'+path+'" fill="none" stroke="#5a8a5a" stroke-width="2"/>'+dots+lbls+dlab+'</svg>';
}

/* Área (hectares) e centro (lat,lng) calculados do polígono da quadra */
function quadraAreaHa(id){
  ensureQGEO();
  var pts=QGEO&&QGEO[id]; if(!pts||pts.length<3) return null;
  var lat0=0; pts.forEach(function(p){lat0+=p[0];}); lat0/=pts.length;
  var mLat=110540, mLng=111320*Math.cos(lat0*Math.PI/180), a=0;
  for(var i=0;i<pts.length;i++){ var j=(i+1)%pts.length;
    a += (pts[i][1]*mLng)*(pts[j][0]*mLat) - (pts[j][1]*mLng)*(pts[i][0]*mLat); }
  return Math.abs(a)/2/10000;
}
function quadraCenter(id){
  ensureQGEO();
  var pts=QGEO&&QGEO[id]; if(!pts||!pts.length) return null;
  var sLat=0,sLng=0; pts.forEach(function(p){sLat+=p[0];sLng+=p[1];});
  return [sLat/pts.length, sLng/pts.length];
}
/* Comprimento × largura reais (m) da quadra: retângulo de MENOR ÁREA que a encaixa
   (rotating-calipers sobre o fecho convexo). Independe da orientação em relação ao norte —
   mede ao longo dos eixos da própria quadra, então serve pra planejar parcelas. */
/* "5x4 m" / "5 x 4" / "5,5x4" -> {comprimento, largura} em m (fallback p/ parcela quando a quadra não tem geometria) */
function _parseParcelaDim(str){
  var m=String(str||'').replace(',','.').match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if(!m) return null;
  var a=parseFloat(m[1]), b=parseFloat(m[2]); if(!(a>0&&b>0)) return null;
  return { comprimento:Math.max(a,b), largura:Math.min(a,b) };
}
function quadraDims(id){
  ensureQGEO();
  var pts=QGEO&&QGEO[id]; if(!pts||pts.length<3) return null;
  var la0=0,lo0=0; pts.forEach(function(p){la0+=p[0];lo0+=p[1];}); la0/=pts.length; lo0/=pts.length;
  var k=Math.cos(la0*Math.PI/180);
  var m=pts.map(function(p){ return {x:(p[1]-lo0)*111320*k, y:(p[0]-la0)*110540}; });
  var P=m.slice().sort(function(a,b){ return a.x-b.x || a.y-b.y; });
  function cross(o,a,b){ return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x); }
  var lo=[],up=[],i;
  for(i=0;i<P.length;i++){ while(lo.length>=2 && cross(lo[lo.length-2],lo[lo.length-1],P[i])<=0) lo.pop(); lo.push(P[i]); }
  for(i=P.length-1;i>=0;i--){ while(up.length>=2 && cross(up[up.length-2],up[up.length-1],P[i])<=0) up.pop(); up.push(P[i]); }
  lo.pop(); up.pop(); var H=lo.concat(up); if(H.length<3) H=m;
  var best=null;
  for(i=0;i<H.length;i++){
    var a=H[i], b=H[(i+1)%H.length], ex=b.x-a.x, ey=b.y-a.y, len=Math.sqrt(ex*ex+ey*ey);
    if(len<1e-9) continue;
    var ux=ex/len, uy=ey/len, minu=1e18,maxu=-1e18,minv=1e18,maxv=-1e18;
    for(var j=0;j<H.length;j++){ var du=H[j].x*ux+H[j].y*uy, dv=-H[j].x*uy+H[j].y*ux;
      if(du<minu)minu=du; if(du>maxu)maxu=du; if(dv<minv)minv=dv; if(dv>maxv)maxv=dv; }
    var w=maxu-minu, hgt=maxv-minv, area=w*hgt;
    if(!best || area<best.area) best={area:area, a:w, b:hgt};
  }
  if(!best) return null;
  return { comprimento:Math.max(best.a,best.b), largura:Math.min(best.a,best.b) };
}

/* ===================== EXPORTAR ESTUDO p/ planilha + NDVI do período ===================== */
var _stxText='';
function _isoShift(iso,days){ var d=new Date(iso+'T00:00:00'); if(isNaN(d)) return iso; d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function _stxCopyFallback(text){ try{ var ta=document.createElement('textarea'); ta.value=text; ta.style.cssText='position:fixed;opacity:0'; document.body.appendChild(ta); ta.focus(); ta.select(); var ok=document.execCommand('copy'); document.body.removeChild(ta); return ok; }catch(e){ return false; } }
function _stxCopy(text){ try{ if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function(){return true;},function(){return _stxCopyFallback(text);}); }catch(e){} return Promise.resolve(_stxCopyFallback(text)); }
function _stxToast(msg){ var t=document.getElementById('stxToast'); if(!t){ t=document.createElement('div'); t.id='stxToast'; t.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:3000;background:#1f5a2a;color:#eafaea;padding:9px 16px;border-radius:999px;font:600 13px system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.4);transition:opacity .3s;pointer-events:none'; document.body.appendChild(t);} t.textContent=msg; t.style.opacity='1'; clearTimeout(window._stxTt); window._stxTt=setTimeout(function(){t.style.opacity='0';},1900); }
/* ===================== ESTATÍSTICA — ANOVA (DBC) + Tukey HSD + letrinhas ===================== */
function _lgamma(x){ var c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5]; var y=x,t=x+5.5; t-=(x+0.5)*Math.log(t); var sm=1.000000000190015; for(var j=0;j<6;j++){y++;sm+=c[j]/y;} return -t+Math.log(2.5066282746310005*sm/x); }
function _betacf(a,b,x){ var FPMIN=1e-30,qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap; if(Math.abs(d)<FPMIN)d=FPMIN; d=1/d; var h=d; for(var m=1;m<=240;m++){ var m2=2*m,aa=m*(b-m)*x/((qam+m2)*(a+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN)d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN)c=FPMIN; d=1/d; h*=d*c; aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN)d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN)c=FPMIN; d=1/d; var del=d*c; h*=del; if(Math.abs(del-1)<3e-7)break; } return h; }
function _betai(a,b,x){ if(x<=0)return 0; if(x>=1)return 1; var bt=Math.exp(_lgamma(a+b)-_lgamma(a)-_lgamma(b)+a*Math.log(x)+b*Math.log(1-x)); return x<(a+1)/(a+b+2) ? bt*_betacf(a,b,x)/a : 1-bt*_betacf(b,a,1-x)/b; }
function _fpval(F,d1,d2){ if(!(F>0)||!isFinite(F))return 1; return _betai(d2/2,d1/2,d2/(d2+d1*F)); }
function _erfc(x){ var z=Math.abs(x),t=1/(1+0.5*z); var r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277))))))))); return x>=0?r:2-r; }
function _ncdf(x){ return 1-0.5*_erfc(x/Math.SQRT2); }
function _prange(w,k){ if(w<=0)return 0; var lo=-8,hi=8,n=240,h=(hi-lo)/n,sum=0,SQ=Math.sqrt(2*Math.PI); for(var i=0;i<=n;i++){ var u=lo+i*h,f=Math.exp(-u*u/2)/SQ*Math.pow(_ncdf(u)-_ncdf(u-w),k-1),wg=(i===0||i===n)?1:(i%2?4:2); sum+=wg*f; } return Math.min(1,Math.max(0,k*sum*h/3)); }
function _ptukey(q,k,nu){ if(nu>2000) return _prange(q,k); var c=(nu/2)*Math.log(nu/2)-_lgamma(nu/2), lo=1e-4, hi=Math.max(3,1+10/Math.sqrt(Math.max(1,nu))), n=160, h=(hi-lo)/n, sum=0; for(var i=0;i<=n;i++){ var s=lo+i*h, dens=Math.exp(Math.log(2)+c+(nu-1)*Math.log(s)-nu*s*s/2), f=_prange(q*s,k)*dens, wg=(i===0||i===n)?1:(i%2?4:2); sum+=wg*f; } return Math.min(1,Math.max(0,sum*h/3)); }
function _qtukey(k,nu,alpha){ alpha=alpha||0.05; var target=1-alpha,lo=0.1,hi=30; for(var it=0;it<60;it++){ var mid=(lo+hi)/2; if(_ptukey(mid,k,nu)<target) lo=mid; else hi=mid; } return (lo+hi)/2; }
function _tukeyLetters(order, tMean, hsd){ var n=order.length, m=order.map(function(id){return tMean[id];}); var ivs=[], lastB=-1; for(var a=0;a<n;a++){ var b=a; while(b+1<n && (m[a]-m[b+1])<=hsd+1e-9) b++; if(b>lastB){ ivs.push([a,b]); lastB=b; } } var lt=order.map(function(){return '';}); ivs.forEach(function(iv,ki){ var ch=String.fromCharCode(97+ki); for(var x=iv[0];x<=iv[1];x++) lt[x]+=ch; }); var out={}; order.forEach(function(id,i){ out[id]=lt[i]; }); return out; }
/* ANOVA em blocos casualizados (DBC, blocos=repetições) + Tukey 5% p/ UMA avaliação+variável. null se desbalanceado/insuficiente. */
/* ===== O ESTUDO TEM REPLICAÇÃO DE VERDADE? =================================
   Esta função é o portão. Ela decide, olhando o dado REGISTRADO e não o que o
   usuário gostaria, se cabe inferência (ANOVA, Tukey, p-valor) ou se a folha
   tem de sair como demonstração descritiva.

   DBC: sempre replicado — o delineamento já nasce com blocos.
   Faixas: replicado só se houver 2+ treços preenchidos por tratamento. Com um
   treço só, cada tratamento tem uma medida por faixa e não existe termo de erro
   independente: qualquer p-valor ali estaria medindo variação DENTRO da faixa e
   apresentando como se fosse efeito do produto.

   Devolve {ok, motivo, blocos, desenho, rotulo} — o rotulo é o que sai impresso
   na folha, para o leitor saber o que está olhando sem precisar perguntar. */
function estudoTemReplicacao(s, av, v){
  s = normalizeStudy(s);
  var trats=(s.tratamentos||[]).filter(function(t){ return t && t.id; });
  if(s.desenho!=='faixas'){
    var r=Math.max(1, parseInt(s.numRepeticoes)||1);
    return { ok:(r>=2 && trats.length>=2), blocos:r, desenho:'dbc',
             rotulo:r+' blocos ao acaso',
             motivo:(r>=2&&trats.length>=2)?'':'delineamento precisa de 2+ tratamentos e 2+ repetições' };
  }
  /* Em faixas, conta quantos treços de fato têm nota para CADA tratamento —
     não o que foi planejado, o que foi medido. */
  var reps=Math.max(1, parseInt(s.numRepeticoes)||1), minCheios=Infinity;
  trats.forEach(function(t){
    var n=0;
    for(var r=1;r<=reps;r++){
      var raw=av?_avNota(av,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},v):null;
      if(raw!=null && raw!=='' && !isNaN(parseFloat(String(raw).replace(',','.')))) n++;
    }
    if(n<minCheios) minCheios=n;
  });
  if(!isFinite(minCheios)) minCheios=0;
  if(trats.length<2)
    return { ok:false, blocos:minCheios, desenho:'faixas', rotulo:'faixa única',
             motivo:'só há um tratamento — não há o que comparar' };
  if(minCheios>=2)
    return { ok:true, blocos:minCheios, desenho:'faixas',
             rotulo:minCheios+' treços por faixa (blocos por posição)', motivo:'' };
  return { ok:false, blocos:minCheios, desenho:'faixas', rotulo:'faixas sem treços',
           motivo:'cada tratamento ocupa uma faixa só e foi medido em um ponto: '+
                  'medir mais pontos dentro da MESMA faixa não cria repetição. '+
                  'Divida as faixas em treços transversais e amostre os mesmos treços em todas.' };
}
function statDBC(s, av, v){
  var ts=(s.tratamentos||[]).map(function(t){return t.id;}), r=Math.max(1,parseInt(s.numRepeticoes)||1), t=ts.length;
  if(t<2 || r<2) return null;
  /* Ensaio em faixas sem treços: devolve NULO em vez de um p-valor bonito.
     O motor daria conta de calcular — o problema é que o número não
     significaria o que o leitor vai achar que significa. Quem chama já sabe
     lidar com nulo (a folha cai no descritivo e explica). */
  if(s.desenho==='faixas'){
    var _rep=estudoTemReplicacao(s, av, v);
    if(!_rep.ok) return null;
  }
  var Y={}, all=[], ok=true;
  ts.forEach(function(tid){ Y[tid]=[]; for(var rep=1;rep<=r;rep++){ var raw=_avNota(av,{key:_avRowKey(tid,rep),tratId:tid,rep:rep},v); var x=parseFloat(String(raw==null?'':raw).replace(',','.')); if(isNaN(x)) ok=false; Y[tid].push(x); all.push(x); } });
  if(!ok) return null; /* precisa estar tudo preenchido (balanceado) */
  var N=t*r, grand=all.reduce(function(a,b){return a+b;},0)/N;
  var tM={}; ts.forEach(function(tid){ tM[tid]=Y[tid].reduce(function(a,b){return a+b;},0)/r; });
  var bM=[],j; for(j=0;j<r;j++){ var sb=0; ts.forEach(function(tid){ sb+=Y[tid][j]; }); bM.push(sb/t); }
  var SSt=0; ts.forEach(function(tid){ SSt+=Math.pow(tM[tid]-grand,2); }); SSt*=r;
  var SSb=0; for(j=0;j<r;j++) SSb+=Math.pow(bM[j]-grand,2); SSb*=t;
  var SStot=0; all.forEach(function(x){ SStot+=Math.pow(x-grand,2); });
  var SSe=Math.max(0,SStot-SSt-SSb), dft=t-1, dfb=r-1, dfe=(t-1)*(r-1);
  var MSt=SSt/dft, MSe=dfe>0?SSe/dfe:0, F=MSe>0?MSt/MSe:Infinity, p=_fpval(F,dft,dfe);
  var cv=grand!==0?Math.sqrt(MSe)/Math.abs(grand)*100:null;
  var q=_qtukey(t,dfe,0.05), hsd=q*Math.sqrt(MSe/r);
  var order=ts.slice().sort(function(a,b){return tM[b]-tM[a];});
  return { t:t,r:r,N:N, grand:grand, dft:dft,dfb:dfb,dfe:dfe, SSt:SSt,SSb:SSb,SSe:SSe,SStot:SStot, MSt:MSt,MSe:MSe, F:F,p:p,cv:cv, q:q,hsd:hsd, tMean:tM, letras:_tukeyLetters(order,tM,hsd), order:order, sig:(p<0.05) };
}
function buildStudyRecord(qid,s){
  var q=data[qid]||{};
  var locNome=(LOCAIS&&QLOCAL&&LOCAIS[QLOCAL[qid]]&&LOCAIS[QLOCAL[qid]].nome)||(LOCAIS&&LOCAIS[HOME_LOCAL]&&LOCAIS[HOME_LOCAL].nome)||'';
  var aHa=quadraAreaHa(qid), dim=quadraDims(qid), ctr=quadraCenter(qid);
  var L=[]; function add(k,v){ L.push(k+'\t'+(v==null?'':String(v))); }
  add('Local',locNome); add('Quadra',quadraNome(qid));
  add('Cultura',q.cultura||''); add('Cultivar',q.cultivar||'');
  add('Estudo (codigo)',s.codigo||''); if(s.descricao) add('Descricao',s.descricao);
  add('Inicio',isoToBR(s.dataInicio)||''); add('No aplicacoes',s.numAplicacoes);
  add('Intervalo (dias)',s.intervaloDias); add('Repeticoes',s.numRepeticoes);
  add('Tratamentos',s.tratamentos.length); add('Parcelas (trat x rep)', s.tratamentos.length*s.numRepeticoes);
  add('Area (ha)', aHa!=null?aHa.toFixed(2):''); if(dim) add('Dimensoes C x L (m)', Math.round(dim.comprimento)+' x '+Math.round(dim.largura));
  if(ctr) add('Coordenadas (lat, lng)', ctr[0].toFixed(6)+', '+ctr[1].toFixed(6));
  function byData(a,b){ return (a.data||'').localeCompare(b.data||''); }
  if(s.tratamentos.length){ L.push(''); L.push('TRATAMENTOS'); L.push('#\tProduto\tDose\tV.Calda\tTestemunha\tObs');
    s.tratamentos.forEach(function(t){ L.push((t.id||'')+'\t'+(t.produto||'')+'\t'+(t.dose||'')+'\t'+(t.volume||'')+'\t'+(isTestemunha(s,t.id)?(studyTestemunha(s)===t.id?'sim (ref)':'sim'):'')+'\t'+(t.obs||'')); }); }
  if(s.aplicacoes.length){ L.push(''); L.push('APLICACOES'); L.push('Data\tBBCH\tObs');
    s.aplicacoes.slice().sort(byData).forEach(function(a){ L.push((isoToBR(a.data)||'')+'\t'+(a.bbch||'')+'\t'+(a.obs||'')); var ct=_carimboTSV(a.carimbo); if(ct)L.push(ct); }); }
  /* AVALIAÇÕES: só as datas/metadados + carimbo (os valores por parcela vão na MATRIZ — sem duplicar) */
  var _avsM=s.avaliacoes.slice().sort(byData).filter(function(a){return a.variaveis&&a.variaveis.length;});
  if(s.avaliacoes.length){ L.push(''); L.push('AVALIACOES (datas e carimbo)'); L.push('Data\tTipo\tBBCH\tObs');
    s.avaliacoes.slice().sort(byData).forEach(function(a){
      L.push((isoToBR(a.data)||'')+'\t'+(a.tipo||'')+'\t'+(a.bbch||'')+'\t'+(a.obs||''));
      var ct=_carimboTSV(a.carimbo); if(ct)L.push(ct);
    }); }
  /* lista de variáveis na ordem que aparecem */
  var _vars=[]; _avsM.forEach(function(a){ (a.variaveis||[]).forEach(function(v){ if(_vars.indexOf(v)<0)_vars.push(v); }); });
  /* MATRIZ tratamento × repetição (colável no Excel), AGRUPADA POR VARIÁVEL */
  if(_avsM.length){
    L.push(''); L.push('MATRIZ DE RESULTADOS (tratamento x repeticao)');
    var _reps=Math.max(1,parseInt(s.numRepeticoes)||1), _hdr='Trat'; for(var _r=1;_r<=_reps;_r++) _hdr+='\t'+_repLetter(_r);
    _vars.forEach(function(v){
      _avsM.forEach(function(a){
        if((a.variaveis||[]).indexOf(v)<0) return;
        L.push(''); L.push(v+' — '+(isoToBR(a.data)||''));
        L.push(_hdr);
        (s.tratamentos||[]).forEach(function(t){
          var line=t.id+(isTestemunha(s,t.id)?' (test.)':'');
          for(var r=1;r<=_reps;r++){ var val=_avNota(a,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},v); line+='\t'+(val==null?'':val); }
          L.push(line);
        });
      });
    });
  }
  /* RESUMO consolidado: média de cada avaliação (+ % controle) e AUDPC numa tabela só, agrupado por variável */
  var _test=studyTestemunha(s), _avsR=_avsM;
  if(_avsR.length){
    var _means={}; _avsR.forEach(function(a){ _means[a.data]=_avMeans(s,a); });
    var _bv={}; _avsR.forEach(function(a){ if(!a.data)return; (a.variaveis||[]).forEach(function(v){ (_bv[v]=_bv[v]||[]).push({date:a.data}); }); });
    function _audpc(v,tr){ var pts=_bv[v]; if(!pts||pts.length<2)return null; var t0=new Date(pts[0].date), days=pts.map(function(p){return Math.max(0,Math.round((new Date(p.date)-t0)/864e5));}); var ss=0,prev=null,pt=null; for(var i=0;i<pts.length;i++){ var mm=_means[pts[i].date], y=mm&&mm[tr]&&mm[tr][v]; if(y==null)return null; if(prev!=null)ss+=(prev+y)/2*(days[i]-pt); prev=y; pt=days[i]; } return ss; }
    L.push(''); L.push('RESUMO — media por avaliacao · (% controle vs testemunha '+_test+') · AUDPC');
    var _rh='Variavel\tTrat'; _avsR.forEach(function(a){ _rh+='\t'+(isoToBR(a.data)||''); }); _rh+='\tAUDPC';
    L.push(_rh);
    _vars.forEach(function(v){
      s.tratamentos.forEach(function(t){
        var isT=(t.id===_test), line=v+'\t'+t.id+(isTestemunha(s,t.id)?' (test.)':'');
        _avsR.forEach(function(a){
          var mm=_means[a.data], mv=mm[t.id]&&mm[t.id][v], tm=mm[_test]&&mm[_test][v];
          var cell=(mv!=null?String(_r1(mv)):'');
          if(!isT){ var _c=_pctCtrl(tm,mv,_avSentido(a,v)); if(_c!=null) cell+=' ('+_r1(_c)+'%)'; }
          line+='\t'+cell;
        });
        var au=_audpc(v,t.id), tau=_audpc(v,_test), ac=(au!=null?String(Math.round(au)):'');
        if(!isT && tau!=null && tau>0 && au!=null) ac+=' ('+_r1((tau-au)/tau*100)+'%)';
        line+='\t'+ac;
        L.push(line);
      });
    });
  }
  /* ESTATÍSTICA — ANOVA-DBC + Tukey 5% por avaliação/variável (médias + letras + F/p/CV) */
  if(_avsM.length){
    L.push(''); L.push('ESTATISTICA — comparacao de medias (motor BioEstat; ANOVA-DBC rapida como reserva). Mesma letra = nao difere.');
    _vars.forEach(function(v){
      _avsM.forEach(function(a){
        if((a.variaveis||[]).indexOf(v)<0) return;
        var be=(typeof _bioestatResumo==='function')?_bioestatResumo(qid,s,a,v):null;
        L.push('');
        if(be){
          L.push(v+' — '+(isoToBR(a.data)||'')+'\t'+(be.metodo||'comparação')+(be.p!=null?'\tp='+(be.p<0.001?'<0,001':_r1(be.p)):'')+(be.tipo?'\t'+be.tipo:'')+(be.transform?'\ttransf: '+be.transform:'')+'\t(motor BioEstat)');
          L.push('Trat\tProduto\tMedia\tGrupo');
          (be.order||[]).forEach(function(tid){ var t=(s.tratamentos||[]).find(function(x){return x.id===tid;})||{}; var mv=be.vals&&be.vals[tid]; L.push(tid+(isTestemunha(s,tid)?' (test.)':'')+'\t'+(t.produto||'')+'\t'+(mv!=null?_r1(mv):'')+'\t'+(be.letras[tid]||'')); });
          return;
        }
        var st=(typeof statDBC==='function')?statDBC(s,a,v):null;
        if(!st){ L.push(v+' — '+(isoToBR(a.data)||'')+'\t(insuficiente ou desbalanceado p/ ANOVA)'); return; }
        L.push(v+' — '+(isoToBR(a.data)||'')+'\tF='+_r1(st.F)+'\tp='+(st.p<0.001?'<0,001':_r1(st.p))+'\tCV='+_r1(st.cv)+'%\t'+(st.sig?'significativo':'ns')+'\t(ANOVA-DBC rapida — motor nao rodou)');
        L.push('Trat\tProduto\tMedia\tLetra');
        (st.order||(s.tratamentos||[]).map(function(t){return t.id;})).forEach(function(tid){
          var t=(s.tratamentos||[]).find(function(x){return x.id===tid;})||{};
          L.push(tid+(isTestemunha(s,tid)?' (test.)':'')+'\t'+(t.produto||'')+'\t'+_r1(st.tMean[tid])+'\t'+(st.letras[tid]||''));
        });
      });
    });
  }
  var ds=[]; if(s.dataInicio)ds.push(s.dataInicio);
  (s.aplicacoes||[]).forEach(function(a){ if(a.data)ds.push(a.data); });
  (s.avaliacoes||[]).forEach(function(a){ if(a.data)ds.push(a.data); });
  ds=ds.filter(Boolean).sort();
  var today=todayISO(), from, to;
  if(ds.length){ from=ds[0]; to=_isoShift(ds[ds.length-1],15); if(to>today)to=today; if(from>=to)from=_isoShift(to,-45); }
  else { from=_isoShift(today,-180); to=today; }
  return { text:L.join('\n'), from:from, to:to };
}
function studyFetchNdvi(qid,from,to,cb){
  ensureQGEO(); var pts=QGEO&&QGEO[qid]; if(!pts){ cb(null,'sem geometria'); return; }
  var ring=pts.map(function(p){return [p[1],p[0]];}); ring.push(ring[0]);
  var geom={type:'Polygon',coordinates:[ring]};
  fetch(NDVI_PROXY+'/stats?index=NDVI&from='+from+'&to='+to+'&geom='+encodeURIComponent(JSON.stringify(geom)))
   .then(function(r){return r.json();}).then(function(arr){ if(arr&&arr.error){cb(null,arr.error);return;} cb(arr||[]); })
   .catch(function(){ cb(null,'Servidor NDVI fora do ar (pode estar acordando ~50s).'); });
}
/* ===== EXPORT NO LAYOUT DA PLANILHA DO USUÁRIO (modelo.xls) — colável em A1 ===== */
function buildStudyModelo(qid, s, opts){
  opts=opts||{}; var soDados=!!opts.soDados, paraColar=soDados||!!opts.paraColar;
  /* soDados: só VALORES (sem rótulos) p/ colar com "pular vazios" no Excel.
     paraColar: sem as seções extras (Cálculo de aplicação, rodapé estatístico) que não
     existem no modelo.xls — evita despejar lixo na planilha do usuário. */
  s=(typeof normalizeStudy==='function')?normalizeStudy(s):s;
  var q=data[qid]||{};
  var loc=(typeof LOCAIS!=='undefined' && typeof QLOCAL!=='undefined' && LOCAIS[QLOCAL[qid]])||{};
  var lx=loc.extras||loc||{};
  var ctr=(typeof quadraCenter==='function')?quadraCenter(qid):null;
  var dim=(typeof quadraDims==='function')?quadraDims(qid):null;
  var reps=Math.max(1,parseInt(s.numRepeticoes)||1);
  var trats=s.tratamentos||[];
  var test=(typeof studyTestemunha==='function')?studyTestemunha(s):null;
  var BR=function(d){ return d?((typeof isoToBR==='function'?isoToBR(d):d)||d):''; };
  var cells={}, maxR=0, maxC=10;
  /* O modelo.xls REAL tem 2 linhas em branco físicas: linha 0 (topo) e linha 14 (entre PROTOCOLO
     e DESCRIÇÃO). O conteúdo é indexado de forma compactada; _mr() mapeia p/ a linha FÍSICA do
     modelo (≤12 → +1; ≥13 → +2) pra colar exatamente nas células certas. */
  function _mr(r){ return r + (r<=12?1:2); }
  function put(r,c,v){ if(v==null||v==='')return; r=_mr(r); cells[r+'_'+c]=String(v).replace(/[\t\n\r]/g,' '); if(r>maxR)maxR=r; if(c>maxC)maxC=c; }
  function lbl(r,c,v){ if(soDados)return; r=_mr(r); cells[r+'_'+c]=v; if(r>maxR)maxR=r; if(c>maxC)maxC=c; }
  /* CABEÇALHO (rótulos cols 0/2/4/6 ; valores 1/3/5/7) — linhas 0–10, igual ao modelo.xls */
  lbl(0,0,'STATUS DO ESTUDO'); put(0,1,(s.aplicacoes&&s.aplicacoes.length)?'INSTALADO':'AGUARDANDO APLICAÇÃO');
  lbl(1,0,'OBJETIVO DO ESTUDO:'); put(1,1,s.objetivo||s.descricao||'');
  lbl(2,0,'Proposta Comercial:'); lbl(2,2,'RET ou Dispensa:'); lbl(2,4,'Cultivar:'); put(2,5,q.cultivar||''); lbl(2,6,'Equipamento:');
  lbl(3,0,'Número de Estudo:'); put(3,1,s.codigo||s.nome||''); lbl(3,2,'Diretor de Estudo:'); lbl(3,4,'Data de Plantio:'); put(3,5,BR(q.plantio)); lbl(3,6,'Pressão de trabalho:');
  lbl(4,0,'Município:'); put(4,1,lx.municipio||''); lbl(4,2,'Técnico de Campo:'); put(4,3,(typeof _currentUserName==='function'?_currentUserName():'')); lbl(4,4,'Data de Emergência:'); lbl(4,6,'Volume de calda:');
  lbl(5,0,'UF:'); put(5,1,lx.uf||''); lbl(5,2,'Cultura:'); put(5,3,q.cultura||''); lbl(5,4,'Espaçamento de plantio:'); put(5,5,q.espacamento||''); lbl(5,6,'Ponta de pulverização:');
  lbl(6,0,'Latitude (S):'); put(6,1,ctr?ctr[0].toFixed(6):''); lbl(6,2,'Alvo:'); put(6,3,s.alvo||q.alvo||''); lbl(6,4,'Tamanho da Parcela'); put(6,5,dim?(Math.round(dim.comprimento)+'x'+Math.round(dim.largura)+' m'):''); lbl(6,6,'N° de Bicos:');
  lbl(7,0,'Longitude (O):'); put(7,1,ctr?ctr[1].toFixed(6):''); lbl(7,2,'Data de Início (1ª aplicação):'); put(7,3,BR(s.dataInicio)); lbl(7,4,'População:'); lbl(7,6,'Distância bico-cultura:');
  lbl(8,0,'Altitude:'); lbl(8,2,'Data de Término:'); lbl(8,4,'Quadra:'); put(8,5,(typeof quadraNome==='function'?quadraNome(qid):qid)); lbl(8,6,'Delineamento estatístico'); put(8,7,s.delineamento||'DBC');
  lbl(9,0,'Estação Experimental:'); put(9,1,loc.nome||''); lbl(9,2,'Número de Tratamentos:'); put(9,3,trats.length); lbl(9,4,'Adjuvante Utilizado:');
  lbl(10,0,'Endereço:'); put(10,1,lx.endereco||''); lbl(10,2,'Número de Repetições:'); put(10,3,reps); lbl(10,4,'Classe de Solo:');
  lbl(12,0,'PROTOCOLO');
  /* TRATAMENTOS — DESCRIÇÃO linha 13, cabeçalho 14, dados 15+ (igual ao modelo.xls) */
  lbl(13,0,'DESCRIÇÃO DOS TRATAMENTOS');
  ['N°','Tratamentos','Ingrediente Ativo','Concentração (g/kg) (g/l)','Dose (g/ha) (ml/ha)','Concentração de g i.a./ha','Nº de Aplicações','Intervalo de Aplicação (Dias)','Volume de Calda','Adjuvante'].forEach(function(h,c){ lbl(14,c,h); });
  trats.forEach(function(t,i){ var r=15+i; var nm=(t.produto||'').trim(); if(test===t.id) nm=nm?(/test|untreat|controle|check/i.test(nm)?nm:(nm+' (testemunha)')):'Testemunha'; put(r,0,i+1); put(r,1,nm); put(r,2,t.ia||''); put(r,4,t.dose||''); put(r,6,s.numAplicacoes||''); put(r,7,s.intervaloDias||''); put(r,8,t.volume||''); });
  /* CLIMA (rótulos col 11 ; aplicações cols 12+) — linhas 0–12, igual ao modelo.xls */
  lbl(0,11,'Dados climáticos relativos à aplicação');
  [[1,'Aplicação'],[2,'Data da aplicação'],[3,'Horário inicial'],[4,'Horário final'],[5,'T °C inicial'],[6,'T °C final'],[7,'UR (%) inicial'],[8,'UR (%) final'],[9,'Vento (km/h) inicial'],[10,'Vento (km/h) final'],[11,'Nebulosidade (%)'],[12,'Estádio fenológico']].forEach(function(p){ lbl(p[0],11,p[1]); });
  (s.aplicacoes||[]).slice().sort(function(a,b){return (a.data||'').localeCompare(b.data||'');}).slice(0,8).forEach(function(a,i){ var c=12+i;
    var ini=(a.inicio&&a.inicio.clima)||(a.carimbo&&a.carimbo.clima)||{}, fim=(a.fim&&a.fim.clima)||{};
    var hIni=(a.inicio&&a.inicio.hora)||((a.carimbo&&a.carimbo.clima&&a.carimbo.clima.hora)||''), hFim=(a.fim&&a.fim.hora)||'';
    put(1,c,i+1); put(2,c,BR(a.data));
    put(3,c,hIni); put(4,c,hFim);
    put(5,c, ini.temp!=null?ini.temp:''); put(6,c, fim.temp!=null?fim.temp:'');
    put(7,c, ini.umidade!=null?ini.umidade:''); put(8,c, fim.umidade!=null?fim.umidade:'');
    put(9,c, ini.vento!=null?ini.vento:''); put(10,c, fim.vento!=null?fim.vento:'');
    put(12,c,a.bbch||''); });
  /* GRADE DE AVALIAÇÕES (blocos de 8 colunas a partir da col 11) — Trat | a b c d | média | E% */
  var avs=(s.avaliacoes||[]).slice().sort(function(a,b){return (a.data||'').localeCompare(b.data||'');}).filter(function(a){return a.variaveis&&a.variaveis.length;});
  var blk=0;
  avs.forEach(function(a){ (a.variaveis||[]).forEach(function(v){
    if(blk>=20) return; var c0=11+8*blk; blk++;
    var be=(typeof _bioestatResumo==='function')?_bioestatResumo(qid,s,a,v):null; /* motor BioEstat: fonte preferida das letras */
    var st=(typeof statDBC==='function')?statDBC(s,a,v):null; /* reserva: ANOVA-DBC + Tukey */
    lbl(13,c0,'AVALIAÇÃO — '+v+' · '+BR(a.data));
    lbl(14,c0,'Trat.'); ['a','b','c','d'].forEach(function(rl,ri){ lbl(14,c0+1+ri,rl); }); lbl(14,c0+5,'média'); lbl(14,c0+6,'E%'); lbl(14,c0+7,'grupo');
    function med(tid){ var vs=[]; for(var rp=1;rp<=reps;rp++){ var raw=_avNota(a,{key:_avRowKey(tid,rp),tratId:tid,rep:rp},v); if(raw!=null&&raw!==''){ var n=parseFloat(String(raw).replace(',','.')); if(!isNaN(n))vs.push(n);} } return vs.length?vs.reduce(function(x,y){return x+y;},0)/vs.length:null; }
    var tMed=test?med(test):null;
    trats.forEach(function(t,ti){ var r=15+ti; put(r,c0,ti+1);
      for(var rp=1;rp<=4;rp++){ var raw=(rp<=reps)?_avNota(a,{key:_avRowKey(t.id,rp),tratId:t.id,rep:rp},v):null; put(r,c0+rp, raw==null?'':raw); }
      var m=med(t.id); put(r,c0+5, m!=null?(Math.round(m*100)/100):'');
      if(test && t.id!==test){ var _ec=_pctCtrl(tMed,m,_avSentido(a,v)); if(_ec!=null) put(r,c0+6, Math.round(_ec*10)/10); }
      var letra=(be&&be.letras&&be.letras[t.id]!=null)?be.letras[t.id]:((st&&st.letras)?(st.letras[t.id]||''):'');
      if(letra) put(r,c0+7, letra);
    });
    if(!paraColar){ var rf=15+trats.length;
      if(be){ lbl(rf,c0,(be.metodo||'comparação')+(be.p!=null?('  p='+(be.p<0.001?'<0,001':_r1(be.p))+(be.p<0.05?'  *':'  ns')):'')+'  · motor BioEstat'); }
      else if(st){ lbl(rf,c0,'F='+_r1(st.F)+'  p='+(st.p<0.001?'<0,001':_r1(st.p))+'  CV='+_r1(st.cv)+'%'+(st.sig?'  *':'  ns')+'  · ANOVA-DBC rápida'); }
    }
  }); });
  /* CÁLCULO DE APLICAÇÃO (motor BioCalculo) — calda/produto por tratamento. Só no download/cópia
     completa; OMITIDO em paraColar (não faz parte do modelo.xls do usuário). */
  var parc=_parseParcelaDim((s.protocolo||{}).tamanhoParcela)||_calcParcelaDefault(); /* protocolo do estudo, senão o padrão salvo da calculadora (3×5) — nunca a quadra inteira */
  if(!paraColar && window.BioCalculoCampo && parc){
    var crow=maxR+2;
    /* preparo de calda do cadastro do estudo — o export tem que bater com a calculadora */
    var _dead=Math.max(0,_numBR(s.volumeMorto,0)), _bot=Math.max(1,Math.round(_numBR(s.numFrascos,1))||1), _cap=Math.max(0,_numBR(s.capacidadeFrasco,0));
    var _cbr=function(n){ return String(n).replace('.',','); };
    lbl(crow,0,'CÁLCULO DE APLICAÇÃO  (parcela '+Math.round(parc.comprimento)+'×'+Math.round(parc.largura)+' m · '+reps+' parcela(s)/trat'+(_dead>0?(' · vol. morto '+_cbr(_dead)+' mL'):'')+(_bot>1?(' · '+_bot+' frascos/preparo'):'')+(_cap>0?(' · frasco '+_cbr(_cap)+' L'):'')+')');
    var ch=crow+1;
    ['N°','Tratamento','Dose','V.Calda (L/ha)','Concentração','Calda/parcela','Calda total','Produto/parcela','Produto total'].forEach(function(h,c){ lbl(ch,c,h); });
    var _cf=function(x,p){ return BioCalculoCampo.formatBR(x,p==null?2:p); };
    trats.forEach(function(t,i){
      var rr=ch+1+i;
      put(rr,0,i+1); put(rr,1,(t.produto||t.id)+(test===t.id&&!/test|untreat|controle|check/i.test(t.produto||'')?' (test.)':'')); put(rr,2,(typeof doseTextoDe==='function')?doseTextoDe(s,t.dose):(t.dose||'')); put(rr,3,t.volume||'');
      var dval=(typeof _calcNum==='function')?_calcNum(t.dose):parseFloat(String(t.dose||'').replace(',','.'));
      var vol=(typeof _calcNum==='function')?_calcNum(t.volume):parseFloat(String(t.volume||'').replace(',','.'));
      /* unidade declarada no estudo quando a dose veio só com o número. 'ppm' não
         é dose por área e o motor de campo não sabe o que fazer com ela — esta
         planilha é a de campo, então cai no padrão. */
      var dunit=(typeof doseUnidadeDe==='function')?doseUnidadeDe(s,t.dose):'L/ha';
      if(dunit==='ppm') dunit=(typeof _calcDoseUnit==='function')?_calcDoseUnit(t.dose):'L/ha';
      if(dval>0 && vol>0){
        try{ var res=BioCalculoCampo.calculateTreatment({doseHa:dval,doseUnit:dunit,sprayVolume:vol,plotLength:parc.comprimento,plotWidth:parc.largura,numPlots:reps,numBottles:_bot,deadVolumeMl:_dead,bottleCapacity:_cap});
          put(rr,4,_cf(res.concentration)+' '+res.concentrationUnit);
          put(rr,5,_cf(res.sprayPerPlotMl/1000)+' L');
          put(rr,6,_cf(res.sprayTotalMl/1000)+' L');
          put(rr,7,_cf(res.productPerPlot)+' '+res.productUnit);
          put(rr,8,_cf(res.productTotal)+' '+res.productUnit);
        }catch(e){}
      }
    });
  }
  /* serializa em grade TSV (colar em A1) */
  var out=[]; for(var r=0;r<=maxR;r++){ var row=[]; for(var c=0;c<=maxC;c++){ row.push(cells[r+'_'+c]||''); } out.push(row.join('\t')); }
  while(out.length && !out[out.length-1].replace(/\t/g,'').length) out.pop(); /* tira linhas em branco do fim */
  return out.join('\n');
}
function copyStudyModelo(qid,sid){
  /* MODELO LIMPO: rótulos + dados, SEM as seções extras. Colar em A1 de uma cópia em branco
     do modelo (Excel ou Sheets). */
  try{ var q=data[qid]||{}; var s=(q.estudos||[]).find(function(x){return x.id===sid;}); if(!s){ _stxToast('Estudo não encontrado'); return; }
    var tsv=buildStudyModelo(qid,s,{paraColar:true});
    _stxCopy(tsv).then(function(ok){ _stxToast(ok?'✓ Modelo limpo copiado — cole em A1 de uma cópia EM BRANCO do modelo':'Selecione e copie'); });
  }catch(e){ _stxToast('Erro: '+e.message); }
}
function copyStudyDados(qid,sid){
  /* SÓ OS DADOS (valores nas células certas, sem rótulos). No Excel, use Colar Especial →
     "Pular células em branco" sobre o seu modelo já preenchido: preenche só os dados, sem apagar
     rótulos nem suas anotações. */
  try{ var q=data[qid]||{}; var s=(q.estudos||[]).find(function(x){return x.id===sid;}); if(!s){ _stxToast('Estudo não encontrado'); return; }
    var tsv=buildStudyModelo(qid,s,{soDados:true});
    _stxCopy(tsv).then(function(ok){ _stxToast(ok?'✓ Só os dados copiados — no Excel: Colar Especial → Pular vazios, em A1 do seu modelo':'Selecione e copie'); });
  }catch(e){ _stxToast('Erro: '+e.message); }
}
function _xlsPut(ws,r,c,v){
  if(v==null||String(v).trim()==='')return;
  var addr=XLSX.utils.encode_cell({r:r,c:c}), old=ws[addr]||{}, n=_protoNum(v), numeric=(typeof v==='number'||(n!=null&&String(v).trim().match(/^[+-]?\d+(?:[.,]\d+)?$/)));
  ws[addr]=Object.assign({},old,{t:numeric?'n':'s',v:numeric?n:String(v)});
  delete ws[addr].f; delete ws[addr].w;
}
function _bioestatLetters(qid,s,av,v){
  var c=_bioAutoCache[qid+'|'+s.id], rel=c&&c.results&&c.results[(av.id||av.data)+'|'+v]; if(!rel||!rel.ok)return {};
  var cm=rel.comparacao_medias||{}, cmp=cm.scott_knott||cm.tukey||cm.dunn;
  return (cmp&&cmp.letras)||(rel.analise&&rel.analise.letras)||{};
}
/* Resumo completo do resultado do motor BioEstat (cache) p/ as saídas rápidas usarem o MESMO motor do xls.
   Retorna {order, vals(médias), letras, p, metodo, tipo, transform} ou null se o motor ainda não rodou. */
function _bioestatResumo(qid,s,av,v){
  var c=_bioAutoCache[qid+'|'+s.id], rel=c&&c.results&&c.results[(av.id||av.data)+'|'+v];
  if(!rel||!rel.ok) return null;
  var a=rel.analise||{}, cm=rel.comparacao_medias||{}, cmp=cm.scott_knott||cm.tukey||cm.dunn||null;
  var desc={}; (rel.descritiva||[]).forEach(function(d){ desc[d.tratamento]=(d.media!=null?d.media:d.proporcao); });
  var order=(cmp&&cmp.ordem)||a.ordem||Object.keys(desc);
  var vals=(cmp&&(cmp.medias_exibicao||cmp.medias||cmp.medianas))||a.medias_estimadas||a.proporcoes_estimadas||desc;
  var letras=(cmp&&cmp.letras)||a.letras||{};
  var metodo=cm.scott_knott?'Scott-Knott':(cm.tukey?'Tukey':(cm.dunn?'Dunn (Kruskal-Wallis)':(a.tabela_anova?'ANOVA':'GLM')));
  var p=(typeof _bioestatP==='function')?_bioestatP(rel):null;
  return { order:order, vals:vals, letras:letras, p:p, metodo:metodo, tipo:(rel.deteccao&&rel.deteccao.tipo_resposta)||'', transform:a.transformacao||'' };
}
async function downloadStudyWorkbook(qid,sid){
  try{
    if(!window.XLSX)throw new Error('Leitor de Excel indisponível.');
    var q=data[qid]||{}, s=(q.estudos||[]).find(function(x){return x.id===sid;}); if(!s)throw new Error('Estudo não encontrado.');
    s=normalizeStudy(s);
    if((s.tratamentos||[]).length>7)throw new Error('Este modelo possui espaço para até 7 tratamentos. Use “Copiar” para protocolos maiores.');
    _stxToast('Preparando planilha e resultados…');
    _bioestatEnsureStudy(qid,sid);
    /* só precisamos das LETRAS da análise (não do forense) — não espera os jobs de triagem forense */
    var _aJobs=_bioestatJobs(qid,s), _analiseOk=function(c){ return !c || c.status==='ready' || c.status==='empty' || _aJobs.every(function(j){ return c.results && c.results[j.jobKey]; }); };
    var cache=_bioAutoCache[qid+'|'+sid], limite=Date.now()+90000;
    while(cache&&cache.status==='loading'&&!_analiseOk(cache)&&Date.now()<limite){await new Promise(function(ok){setTimeout(ok,500);});cache=_bioAutoCache[qid+'|'+sid];}
    var resp=await fetch('modelos/modelo-protocolo.xls'); if(!resp.ok)throw new Error('Modelo de planilha não encontrado.');
    var wb=XLSX.read(await resp.arrayBuffer(),{type:'array',cellFormula:true,cellStyles:true,cellDates:true}), ws=wb.Sheets[wb.SheetNames[0]];
    var p=s.protocolo||{}, loc=(LOCAIS&&QLOCAL&&LOCAIS[QLOCAL[qid]])||{}, lx=loc.extras||loc||{}, ctr=quadraCenter(qid), dim=quadraDims(qid);
    var status=(s.aplicacoes&&s.aplicacoes.length)?'INSTALADO':'AGUARDANDO APLICAÇÃO', tech=(typeof _currentUserName==='function'?_currentUserName():'');
    [[1,1,status],[2,1,s.objetivo||s.descricao],[3,1,p.proposta],[3,3,p.ret],[3,5,p.cultivar||q.cultivar],[3,7,p.equipamento],
      [4,1,s.codigo],[4,3,p.diretor],[4,5,isoToBR(p.plantio||q.plantio)],[4,7,p.pressao],
      [5,1,p.municipio||lx.municipio],[5,3,p.tecnico||tech],[5,5,isoToBR(p.emergencia)],[5,7,p.volumeCalda],
      [6,1,p.uf||lx.uf],[6,3,p.cultura||q.cultura],[6,5,p.espacamento||q.espacamento],[6,7,p.ponta],
      [7,1,p.latitude||(ctr&&ctr[0].toFixed(6))],[7,3,s.alvo||p.alvo],[7,5,p.tamanhoParcela||(dim&&(Math.round(dim.comprimento)+'x'+Math.round(dim.largura)+' m'))],[7,7,p.bicos],
      [8,1,p.longitude||(ctr&&ctr[1].toFixed(6))],[8,3,isoToBR(s.dataInicio)],[8,5,p.populacao],[8,7,p.distanciaBico],
      [9,1,p.altitude],[9,3,isoToBR(p.termino)],[9,5,p.quadra||quadraNome(qid)],[9,7,s.delineamento||p.delineamento||'DBC'],
      [10,1,p.estacao||loc.nome],[10,3,s.tratamentos.length],[10,5,p.adjuvante],
      [11,1,p.endereco||lx.endereco],[11,3,s.numRepeticoes],[11,5,p.classeSolo]
    ].forEach(function(x){_xlsPut(ws,x[0],x[1],x[2]);});
    var test=studyTestemunha(s);
    (s.tratamentos||[]).forEach(function(t,i){var r=17+i,nm=t.produto||'';if(t.id===test)nm+=(nm?' (testemunha)':'Testemunha');
      [[0,i+1],[1,nm],[2,t.ingredienteAtivo],[3,t.concentracao],[4,t.dose],[5,t.concentracaoAtivo],[6,s.numAplicacoes],[7,s.intervaloDias],[8,t.volume],[9,t.adjuvante]].forEach(function(x){_xlsPut(ws,r,x[0],x[1]);});
    });
    (s.aplicacoes||[]).slice().sort(function(a,b){return (a.data||'').localeCompare(b.data||'');}).slice(0,8).forEach(function(a,i){
      var c=12+i, ini=(a.inicio&&a.inicio.clima)||(a.carimbo&&a.carimbo.clima)||{}, fim=(a.fim&&a.fim.clima)||{};
      [[2,i+1],[3,isoToBR(a.data)],[4,(a.inicio&&a.inicio.hora)||''],[5,(a.fim&&a.fim.hora)||''],[6,ini.temp],[7,fim.temp],[8,ini.umidade],[9,fim.umidade],[10,ini.vento],[11,fim.vento],[12,ini.nebulosidade],[13,a.bbch]].forEach(function(x){_xlsPut(ws,x[0],c,x[1]);});
    });
    var blk=0,reps=Math.max(1,parseInt(s.numRepeticoes)||1);
    (s.avaliacoes||[]).slice().sort(function(a,b){return (a.data||'').localeCompare(b.data||'');}).forEach(function(a){(a.variaveis||[]).forEach(function(v){
      if(blk>=21)return;var c0=11+8*blk++, letras=_bioestatLetters(qid,s,a,v);
      _xlsPut(ws,15,c0,'AVALIAÇÃO — '+v+' · '+isoToBR(a.data)); _xlsPut(ws,16,c0+7,'grupo');
      (s.tratamentos||[]).forEach(function(t,ti){var r=17+ti;_xlsPut(ws,r,c0,ti+1);
        for(var rp=1;rp<=Math.min(4,reps);rp++){var raw=_avNota(a,{key:_avRowKey(t.id,rp),tratId:t.id,rep:rp},v);_xlsPut(ws,r,c0+rp,raw);}
        if(letras[t.id])_xlsPut(ws,r,c0+7,letras[t.id]);
      });
    });});
    var nome=(s.codigo||'estudo').replace(/[^\w.-]+/g,'_')+'-Agracta.xlsx';
    XLSX.writeFile(wb,nome,{bookType:'xlsx',cellStyles:true});
    _stxToast('✓ Planilha completa baixada');
  }catch(e){console.error(e);alert('Não consegui gerar a planilha: '+e.message);}
}
function studyExport(qid,sid){
  var q=data[qid]||{}; var s=(q.estudos||[]).find(function(x){return x.id===sid;}); if(!s) return;
  s=normalizeStudy(s);
  var rec=buildStudyRecord(qid,s); _stxText=rec.text;
  _stxCopy(rec.text).then(function(ok){ _stxToast(ok?'✓ Registro copiado p/ planilha':'Selecione no quadro e copie'); });
  showStudyExportModal(qid,s,rec.from,rec.to);
  var nb=document.getElementById('stxNdvi'); if(nb) nb.innerHTML='<div class="ndvi-status">Buscando NDVI do período ('+esc(isoToBR(rec.from))+' → '+esc(isoToBR(rec.to))+')…</div>';
  studyFetchNdvi(qid,rec.from,rec.to,function(arr,err){
    var b=document.getElementById('stxNdvi'); if(!b) return;
    if(err||!arr||!arr.length){ b.innerHTML='<div class="ndvi-status" style="color:#d9b">NDVI: '+(err?esc(err):'sem dados no período (muita nuvem?)')+'</div>'; return; }
    var lines=['','NDVI DO PERIODO (inicio -> fim)','Data\tNDVI medio'];
    arr.forEach(function(d){ lines.push(d.date+'\t'+d.mean.toFixed(3)); });
    var f=arr[0], l=arr[arr.length-1], dv=l.mean-f.mean;
    lines.push('Variacao\t'+(dv>=0?'+':'')+dv.toFixed(3)+' ('+f.mean.toFixed(2)+' -> '+l.mean.toFixed(2)+')');
    _stxText=rec.text+'\n'+lines.join('\n');
    var ta=document.getElementById('stxText'); if(ta) ta.value=_stxText;
    b.innerHTML=serieSvg(arr)+'<div class="ndvi-status">NDVI '+f.mean.toFixed(2)+' → '+l.mean.toFixed(2)+' ('+(dv>=0?'+':'')+dv.toFixed(2)+') · '+arr.length+' datas no período</div>';
  });
}
function showStudyExportModal(qid,s,from,to){
  var m=document.getElementById('stxModal');
  if(!m){ m=document.createElement('div'); m.id='stxModal'; m.className='ndvi-modal'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  var title=esc((s.codigo||'(sem codigo)')+' — '+quadraNome(qid));
  m.innerHTML='<div class="ndvi-modal-box" style="max-width:560px">'+
    '<div class="ndvi-modal-top"><b>📄 '+title+'</b><button onclick="document.getElementById(\'stxModal\').style.display=\'none\'">✕</button></div>'+
    '<div class="ndvi-status"><b>Para a SUA planilha (modelo.xls):</b> cabeçalho, tratamentos, clima e grade (a/b/c/d/média/E%/grupo) nas células certas — <b>sem despejar rótulos nem seções extras</b>.<br>• <b>Modelo limpo</b>: cole em <b>A1</b> de uma cópia <b>em branco</b> do modelo (Excel ou Sheets).<br>• <b>Só dados</b>: no <b>Excel</b>, sobre o seu arquivo já preenchido — <b>Colar Especial → Pular células em branco</b> em A1 (preenche só os dados, não apaga nada).</div>'+
    '<textarea id="stxText" readonly style="width:100%;height:148px;box-sizing:border-box;background:#0a110a;color:#cfe0cf;border:1px solid #2a3a2a;border-radius:8px;font:11px/1.45 ui-monospace,Menlo,monospace;padding:8px;white-space:pre;overflow:auto">'+esc(_stxText)+'</textarea>'+
    '<div id="stxNdvi" style="margin-top:8px"></div>'+
    '<div class="gr-btns" style="margin-top:10px;flex-wrap:wrap"><button class="ndvi-ix" style="flex:1 1 46%;background:#1f5a2a;color:#eafaea;border-color:#2e7d3e" onclick="copyStudyModelo(\''+qid+'\',\''+s.id+'\')">📋 Copiar modelo limpo</button><button class="ndvi-ix" style="flex:1 1 46%;background:#1f5a2a;color:#eafaea;border-color:#2e7d3e" onclick="copyStudyDados(\''+qid+'\',\''+s.id+'\')">📋 Copiar só dados (Excel)</button><button class="ndvi-ix" style="flex:1 1 46%" onclick="downloadStudyWorkbook(\''+qid+'\',\''+s.id+'\')">⬇ Baixar planilha completa</button><button class="ndvi-ix" style="flex:1 1 46%" onclick="_stxCopy(document.getElementById(\'stxText\').value).then(function(ok){_stxToast(ok?\'✓ Copiado (registro + NDVI)\':\'Selecione e copie\');})">📋 Copiar tudo (livre)</button><button class="gr-cancel" style="flex:1 1 100%" onclick="document.getElementById(\'stxModal\').style.display=\'none\'">Fechar</button></div>'+
  '</div>';
  m.style.display='flex';
}

function showD(id){
  curV=id;
  var d=data[id]||{},dap=cDAP(d.plantio),st=gS(d.cultura,dap),ac=gC(d.cultura),pd=pD(d.plantio);
  var aHa=quadraAreaHa(id), ctr=quadraCenter(id), dim=quadraDims(id);
  var t=FEN[d.cultura]||FEN._,prog=0;
  if(dap!==null&&dap>=0){var tot=(t.length>=2)?t[t.length-2].m:120;prog=Math.min(100,(dap/tot)*100)}

  /* LABORATÓRIO: nada de cultura, DAP, área, progresso ou fenologia BBCH —
     não há planta plantada aqui. No lugar entra a especialidade do lab e,
     na Nematologia, a fila de amostras. */
  var _lab=isQuadraLab(id), _labT=quadraLabTipo(id), _labC=labTipoCor(_labT);
  var h;
  if(_lab){
    h='<div class="panel-header" style="position:relative;border-bottom:1px solid '+_labC+'22"><button class="panel-x-tr" onclick="closeDetail()" aria-label="Fechar" title="Fechar">\u2715</button>'+
      '<div><div class="panel-qlbl" style="color:'+_labC+'">LABORAT\u00d3RIO</div><div class="panel-qid">'+esc(quadraNome(id))+'</div></div>'+
      '<div class="panel-sbox" style="background:'+_labC+'15;border:1px solid '+_labC+'55;margin-right:36px"><div class="panel-scode" style="color:'+_labC+'">\ud83e\uddea</div><div class="panel-slbl" style="color:'+_labC+'">'+esc(_labT||'\u2014')+'</div></div></div>';
    h+='<div class="panel-body"><div class="info-grid">'+
      '<div><div class="info-l">ESPECIALIDADE</div><div class="info-v" style="color:'+_labC+'">'+esc(_labT||'\u2014')+'</div></div>'+
      '<div><div class="info-l">\u00c1REA</div><div class="info-v">Biologia</div></div>'+
      '<div><div class="info-l">ESTUDOS</div><div class="info-v">'+((d.estudos||[]).length)+'</div></div>'+
      '</div>';
    var _lp=quadraPonto(id)||ctr;
    if(_lp) h+='<div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--gp-text-3,#727c75);border-top:1px solid var(--gp-line,rgba(255,255,255,.09));padding-top:10px">'+
      '<span title="Onde o laborat\u00f3rio est\u00e1 marcado no mapa">&#128205; <b style="color:var(--gp-text,#e9ede9)">'+_lp[0].toFixed(5)+', '+_lp[1].toFixed(5)+'</b></span></div>';
    if(_labT==='Nematologia') h+=nemPainel(id);
  }else{
  h='<div class="panel-header" style="position:relative;border-bottom:1px solid '+ac+'22"><button class="panel-x-tr" onclick="closeDetail()" aria-label="Fechar" title="Fechar">✕</button><div><div class="panel-qlbl" style="color:'+ac+'">QUADRA</div><div class="panel-qid">'+esc(quadraNome(id))+'</div></div><div class="panel-sbox" style="background:'+st.c+'15;border:1px solid '+st.c+'55;margin-right:36px"><div class="panel-scode" style="color:'+st.c+'">'+esc(st.s)+'</div><div class="panel-slbl" style="color:'+st.c+'">'+esc(st.l)+'</div></div></div>';

  h+='<div class="panel-body"><div class="info-grid"><div><div class="info-l">CULTURA</div><div class="info-v" style="color:'+ac+'">'+esc(d.cultura||"\u2014")+'</div></div><div><div class="info-l">CULTIVAR</div><div class="info-v">'+esc(d.cultivar||"\u2014")+'</div></div><div><div class="info-l">PLANTIO</div><div class="info-v">'+(pd?pd.toLocaleDateString("pt-BR"):"\u2014")+'</div></div><div><div class="info-l">DAP</div><div class="info-v" style="color:'+st.c+'">'+(dap!==null?(dap>=0?dap+" dias":"em "+Math.abs(dap)+"d"):"\u2014")+'</div></div><div><div class="info-l">\u00c1REA</div><div class="info-v">'+(aHa!=null?aHa.toFixed(2)+" ha":d.area?d.area+" ha":"\u2014")+'</div></div><div><div class="info-l">EST\u00c1GIO</div><div class="info-v" style="color:'+st.c+'">'+esc(st.l)+'</div></div></div>';

  h+='<div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--gp-text-3,#727c75);border-top:1px solid var(--gp-line,rgba(255,255,255,.09));padding-top:10px">'+
     '<span title="Área calculada do polígono">&#128208; <b style="color:var(--gp-text,#e9ede9)">'+(aHa!=null?aHa.toFixed(2)+' ha':'—')+'</b> <span style="color:var(--gp-text-3,#727c75)">medida</span></span>'+
     (dim?'<span title="Comprimento × largura — retângulo de menor área que encaixa na quadra (medido ao longo dos eixos dela)">&#128207; <b style="color:var(--gp-text,#e9ede9)">'+Math.round(dim.comprimento)+' &times; '+Math.round(dim.largura)+' m</b> <span style="color:var(--gp-text-3,#727c75)">C&times;L</span></span>':'')+
     (ctr?'<span title="Coordenadas do centro da quadra">&#128205; <b style="color:var(--gp-text,#e9ede9)">'+ctr[0].toFixed(5)+', '+ctr[1].toFixed(5)+'</b></span>':'')+
     '</div>';
  var _cs=getCulturas(d);
  if(_cs.length>=2){
    h+='<div class="cult-list"><div class="cult-list-t">CULTURAS ('+_cs.length+')</div>';
    _cs.forEach(function(c){
      var cdap=cDAP(c.plantio), cst=gS(c.cultura,cdap), cc=gC(c.cultura);
      h+='<div class="cult-item"><span class="cult-dot" style="background:'+cc+'"></span>'+
         '<span class="cult-name" style="color:'+cc+'">'+esc(c.cultura)+'</span>'+
         (c.cultivar?'<span class="cult-cv">'+esc(c.cultivar)+'</span>':'')+
         '<span class="cult-st" style="color:'+cst.c+'">'+esc(cst.s)+(cdap!=null?' · '+(cdap>=0?cdap+'d':'em '+Math.abs(cdap)+'d'):'')+'</span></div>';
    });
    h+='</div>';
  }
  if(dap!==null&&dap>=0)h+='<div class="prog-wrap"><div class="prog-top"><span class="prog-t">PROGRESSO</span><span class="prog-p">'+Math.round(prog)+'%</span></div><div class="prog-bar"><div class="prog-fill" style="width:'+prog+'%;background:linear-gradient(90deg,'+ac+','+st.c+')"></div></div></div>';

  h+='<div class="fen-wrap"><div class="fen-title">FENOLOGIA · ESCALA BBCH</div><div class="fen-row">';
  for(var i=0;i<t.length;i++){if(t[i].m>=9999)continue;var a=st.s===t[i].s;h+='<div class="fen-item"'+(a?' style="background:'+t[i].c+'22;border-color:'+t[i].c+'"':'')+'><div class="fen-code"'+(a?' style="color:'+t[i].c+'"':'')+'>'+esc(t[i].s)+'</div><div class="fen-dap"'+(a?' style="color:'+t[i].c+'"':'')+'>\u2264'+t[i].m+'d</div></div>'}
  h+='</div></div>';
  }

  // STUDIES SECTION
  h+='<div class="studies-wrap"><div class="studies-head"><div class="studies-title">ESTUDOS ('+(d.estudos||[]).length+')</div><button class="studies-add" onclick="openStudyEdit(\''+id+'\',null)">+ ADICIONAR</button></div>';

  if(!(d.estudos||[]).length){
    h+='<div class="q-noest" style="font-size:10px;text-align:center;padding:14px;font-style:italic;border-radius:6px">Nenhum estudo cadastrado nesta quadra</div>';
  }else{
    (d.estudos||[]).forEach(function(study){
      h+=renderStudyCard(id,study);
    });
  }
  h+='</div>';

  /* NDVI é satélite sobre polígono: laboratório não tem nem um nem outro. */
  h+='</div><div class="panel-btns">'+
     (_lab?'':'<button class="p-btn" style="background:#f0f1f3;color:#2b3138;border:1px solid #d7dbe0" onclick="ndviSerie(\''+id+'\')">'+ic('sat',14)+' NDVI</button>')+
     '<button class="p-btn" style="background:#f0f1f3;color:#2b3138;border:1px solid #d7dbe0" onclick="navStartQuadra(\''+id+'\')">'+ic('pin',14)+' Ir até</button>'+
     '<button class="p-btn p-btn-edit" onclick="openE(\''+id+'\')">'+(_lab?'EDITAR LABORAT&Oacute;RIO':'EDITAR QUADRA')+'</button></div>';
  document.getElementById("dPnl").innerHTML=h;
  document.getElementById("dOvl").classList.add("open");
}

function renderStudyCard(qid,study){
  var ne=nextEvent(study);
  var cls='';
  var nextHtml='';
  if(ne){
    var t=today0();
    var diff=daysBetween(t,ne.date);
    var label='';
    var chipCls='next-apl';
    if(ne.type==='eval')chipCls='next-eval';
    if(diff===0){label='HOJE';chipCls='next-today';cls='next-alert'}
    else if(diff<0){label='Atrasado há '+Math.abs(diff)+' dia(s)';chipCls='next-overdue';cls='next-alert'}
    else if(diff<=2){label='em '+diff+' dia'+(diff>1?'s':'');cls='next-soon'}
    else label='em '+diff+' dias';
    var typeName = ne.type==='apl' ? ('Aplicação '+ne.idx+'/'+ne.total) : ('Avaliação '+ne.idx);
    nextHtml='<div class="study-next '+chipCls+'"><span>'+typeName+' • '+fD(ne.date)+'</span><span style="font-weight:700">'+label+'</span></div>';
  }

  // Timeline of all events
  var evs=studyEvents(study);
  var tlHtml='';
  if(evs.length){
    tlHtml='<div class="study-timeline">';
    var t=today0();
    evs.forEach(function(ev){
      var diff=daysBetween(t,ev.date);
      var c='';
      if(diff<0)c='done';
      else if(diff===0)c='today';
      else if(diff<=2)c='soon';
      var lbl = ev.type==='apl' ? ('A'+ev.idx) : ('V'+ev.idx);
      var dateLbl = fD(ev.date).slice(0,5);
      tlHtml+='<span class="tl-item '+c+'" title="'+fD(ev.date)+'">'+lbl+' '+dateLbl+'</span>';
    });
    tlHtml+='</div>';
  }

  var nApl=Math.max(1,parseInt(study.numAplicacoes)||1);
  var intInfo = study.intervaloDias>0 ? (study.intervaloDias+' dias entre aplicações') : 'Aplicação única';
  var nAval=(study.avaliacoes||[]).length;

  var html='<div class="study-card '+cls+'">';
  html+='<div class="study-top"><div class="study-name">'+esc(study.nome||'(sem nome)')+'</div>';
  html+='<div class="study-actions"><button class="study-btn" onclick="studyExport(\''+qid+'\',\''+study.id+'\')" title="Copiar dados do ensaio + NDVI do período p/ planilha">📄</button><button class="study-btn" onclick="openStudyEdit(\''+qid+'\',\''+study.id+'\')" title="Editar">✎</button><button class="study-btn del" onclick="deleteStudy(\''+qid+'\',\''+study.id+'\')" title="Excluir">×</button></div></div>';
  html+='<div class="study-meta"><b>Início:</b> '+(study.dataInicio?fD(pD(isoToBR(study.dataInicio))):'—')+' • <b>'+nApl+'</b> aplicação(ões) • '+intInfo+' • <b>'+nAval+'</b> avaliação(ões)</div>';
  html+=nextHtml;
  html+=tlHtml;
  html+='</div>';
  return html;
}

function closeDetail(){document.getElementById("dOvl").classList.remove("open");curV=null}

/* ============ QUADRA EDIT ============ */
/* ===== Multi-cultura: cada quadra pode ter 1+ culturas (cons\u00f3rcio/rota\u00e7\u00e3o) =====
   data[id].culturas = [{cultura,cultivar,plantio}, ...]; a 1\u00aa \u00e9 a PRINCIPAL e espelha
   cultura/cultivar/plantio (compat com cor/r\u00f3tulo/fenologia/agenda). */
function getCulturas(d){
  if(!d) return [];
  if(Array.isArray(d.culturas) && d.culturas.length) return d.culturas.filter(function(c){return c&&c.cultura;});
  if(d.cultura) return [{cultura:d.cultura, cultivar:d.cultivar||'', plantio:d.plantio||''}];
  return [];
}
var _ecRows=[];
function _ecOpts(sel){ var o='<option value="">\u2014 selecionar \u2014</option>'; for(var i=0;i<CL.length;i++){ o+='<option value="'+esc(CL[i])+'"'+(sel===CL[i]?' selected':'')+'>'+esc(CL[i])+'</option>'; } return o; }
function ecReadRows(){
  var rows=document.querySelectorAll('#ecRows .e-cult-row');
  _ecRows=[].map.call(rows,function(r){ return {
    cultura:(r.querySelector('.ec-c')||{}).value||'',
    cultivar:(r.querySelector('.ec-v')||{}).value||'',
    plantio:(r.querySelector('.ec-p')||{}).value||''
  }; });
}
function renderEcRows(){
  var box=document.getElementById('ecRows'); if(!box) return;
  box.innerHTML=_ecRows.map(function(c,i){
    return '<div class="e-cult-row" data-i="'+i+'">'+
      '<div class="e-cult-head"><span class="e-cult-n">Cultura '+(i+1)+(i===0?' \u00b7 principal':'')+'</span>'+(_ecRows.length>1?'<button type="button" class="e-cult-del" onclick="ecDelRow('+i+')">\u2715</button>':'')+'</div>'+
      '<input class="e-inp ec-c" list="clOpts" value="'+esc(c.cultura||'')+'" placeholder="Cultura (escolha ou digite uma nova)" autocomplete="off">'+
      '<div class="e-row" style="margin-top:6px"><input class="e-inp ec-v" value="'+esc(c.cultivar||'')+'" placeholder="Cultivar"><input class="e-inp ec-p" value="'+esc(c.plantio||'')+'" placeholder="Plantio dd/mm/aaaa"></div>'+
    '</div>';
  }).join('');
}
function ecAddRow(){ ecReadRows(); _ecRows.push({cultura:'',cultivar:'',plantio:''}); renderEcRows(); }
function ecDelRow(i){ ecReadRows(); _ecRows.splice(i,1); if(!_ecRows.length)_ecRows.push({cultura:'',cultivar:'',plantio:''}); renderEcRows(); }
function openE(id){
  closeDetail();curE=id; ensureLocais();
  var d=data[id]||{};
  var _medHa=quadraAreaHa(id);
  _ecRows=getCulturas(d).map(function(c){return {cultura:c.cultura,cultivar:c.cultivar||'',plantio:c.plantio||''};});
  if(!_ecRows.length)_ecRows=[{cultura:'',cultivar:'',plantio:''}];
  var dl='<datalist id="clOpts">'+CL.map(function(c){return '<option value="'+esc(c)+'">';}).join('')+'</datalist>';
  var curLoc=(QLOCAL[id]||HOME_LOCAL);
  var locOpts=Object.keys(LOCAIS).map(function(lid){ return '<option value="'+lid+'"'+(curLoc===lid?' selected':'')+'>'+esc(LOCAIS[lid].nome)+'</option>'; }).join('');
  /* Laborat\u00f3rio: nome, local e especialidade. Cultura, cultivar, plantio e \u00e1rea
     n\u00e3o existem aqui \u2014 pedir isso \u00e9 o que fazia a tela parecer de outro app. */
  var _lab=isQuadraLab(id);
  document.getElementById("ePnl").innerHTML=
    '<div class="edit-title">'+(_lab?'EDITAR LABORAT\u00d3RIO':'EDITAR QUADRA')+'</div>'+dl+
    '<label class="e-lbl">'+(_lab?'NOME DO LABORAT\u00d3RIO':'NOME DA QUADRA')+'</label><input id="eqnome" class="e-inp" value="'+esc(quadraNome(id))+'" placeholder="'+(_lab?'Ex.: Lab. Entomologia':'Ex.: A1')+'" autocomplete="off">'+
    '<label class="e-lbl">LOCAL</label><select id="eqloc" class="e-inp">'+locOpts+'</select>'+
    (_lab
      ? '<label class="e-lbl">ESPECIALIDADE</label><select id="eqlabtipo" class="e-inp">'+
          LAB_TIPOS.map(function(t){ return '<option value="'+t+'"'+(quadraLabTipo(id)===t?' selected':'')+'>'+t+'</option>'; }).join('')+
        '</select>'
      : '<label class="e-lbl">CULTURAS</label><div id="ecRows"></div>'+
        '<button type="button" class="e-add-cult" onclick="ecAddRow()">+ Adicionar cultura</button>'+
        '<label class="e-lbl">\u00c1REA (HA)'+(_medHa!=null?' <span style="color:#8aa88a;font-weight:400">\u00b7 medida do mapa: '+_medHa.toFixed(2)+'</span>':'')+'</label><input id="ea" class="e-inp" value="'+(_medHa!=null?_medHa.toFixed(2):(d.area!=null?d.area:""))+'" placeholder="'+(_medHa!=null?_medHa.toFixed(2):"1.0")+'" type="number" step="0.01">'
    )+
    '<div class="e-btns"><button class="e-btn e-save" onclick="saveE()">SALVAR</button><button class="e-btn e-cancel" onclick="closeEdit()">CANCELAR</button></div>'+
    '<button type="button" class="e-btn-del" onclick="deleteQuadraFromEdit()">'+(_lab?'EXCLUIR LABORAT\u00d3RIO':'EXCLUIR QUADRA')+'</button>';
  if(!_lab) renderEcRows();
  document.getElementById("eOvl").classList.add("open");
}
function closeEdit(){document.getElementById("eOvl").classList.remove("open");curE=null}
function saveE(){
  if(!curE)return;
  /* Renomear (atualiza só o nome de exibição; o id interno não muda) */
  var novoNome=((document.getElementById('eqnome')||{}).value||'').trim();
  if(novoNome && novoNome!==quadraNome(curE)){
    ensureLocais();
    var loc=QLOCAL[curE]||HOME_LOCAL;
    var dup=quadrasDoLocal(loc).some(function(q){ return q!==curE && quadraNome(q).toLowerCase()===novoNome.toLowerCase(); });
    if(dup){ alert('Já existe uma quadra chamada "'+novoNome+'" neste local.'); return; }
    QNOME[curE]=novoNome; _touchQNome(curE); saveQNome();
  }
  /* Mover para outro local */
  var novoLoc=((document.getElementById('eqloc')||{}).value)||'';
  if(novoLoc && LOCAIS[novoLoc] && novoLoc!==(QLOCAL[curE]||HOME_LOCAL)){
    var nm=quadraNome(curE);
    var dupDest=quadrasDoLocal(novoLoc).some(function(q){ return q!==curE && quadraNome(q).toLowerCase()===nm.toLowerCase(); });
    if(dupDest){ alert('No local de destino já existe uma quadra "'+nm+'". Renomeie antes de mover.'); return; }
    QLOCAL[curE]=novoLoc; _touchQLocal(curE); saveQLocal();
  }
  var prev=data[curE]||{};
  var ehLab=(prev.tipo==='lab');
  if(!ehLab) ecReadRows();
  var culturas=ehLab?[]:_ecRows.filter(function(c){return c.cultura;}).map(function(c){return {cultura:c.cultura,cultivar:(c.cultivar||'').trim(),plantio:(c.plantio||'').trim()};});
  var estudos = prev.estudos||[];
  var prim = culturas[0]||{cultura:'',cultivar:'',plantio:''};
  var elArea=document.getElementById("ea");   /* não existe na tela de laboratório */
  data[curE]={
    cultura:prim.cultura, cultivar:prim.cultivar, plantio:prim.plantio,
    culturas:culturas,
    area:(elArea?(parseFloat(elArea.value)||null):(ehLab?null:prev.area)),
    estudos:estudos,
    _deletedStudies:prev._deletedStudies, /* preserva lápides de estudos (antes, editar a quadra as apagava) */
    _ts:Date.now() /* carimbo: no merge, a edição mais nova vence */
  };
  /* O objeto acima é montado do ZERO — sem isto, salvar a tela de edição
     transformava o laboratório de volta em quadra de campo e perdia o ponto
     dele no mapa. */
  if(ehLab){
    data[curE].tipo='lab';
    data[curE].ponto=prev.ponto;
    var selLT=document.getElementById('eqlabtipo');
    var novoLT=selLT?selLT.value:prev.labTipo;
    data[curE].labTipo=(LAB_TIPOS.indexOf(novoLT)>=0)?novoLT:prev.labTipo;
  }
  save();
  try{ if(typeof dbUpsertQuadra==='function') dbUpsertQuadra(curE); }catch(e){} /* Etapa 3 Fase B */
  closeEdit();render();renderLeg();updateAgendaBadge();
  if(curV)showD(curV);
}

/* ============ STUDY EDIT ============ */
function openStudyEdit(qid,sid){
  curS=qid;curSid=sid;
  closeDetail();
  var study = null;
  if(sid){
    var arr = (data[qid]||{}).estudos||[];
    study = arr.find(function(s){return s.id===sid});
  }
  if(!study){
    study={
      id:uid(),
      nome:'',
      dataInicio:fDIso(today0()),
      intervaloDias:14,
      numAplicacoes:1,
      avaliacoes:[]
    };
  }

  var avalHtml = '<div class="eval-dates" id="evalList">';
  (study.avaliacoes||[]).forEach(function(iso,i){
    avalHtml+='<div class="eval-chip"><span>'+fD(pD(isoToBR(iso)))+'</span><button class="eval-chip-rm" onclick="removeAval('+i+')">×</button></div>';
  });
  avalHtml+='</div>';

  var isNew = !sid;
  var h='<div class="edit-title">'+(isNew?'NOVO ESTUDO':'EDITAR ESTUDO')+'</div>';
  h+='<div class="edit-id">'+esc(quadraNome(qid))+'</div>';
  h+='<div class="edit-subtitle" style="color:#8a8">'+esc((data[qid]||{}).cultura||'')+' • '+esc((data[qid]||{}).cultivar||'')+'</div>';

  h+='<label class="e-lbl">NOME DO ESTUDO</label>';
  h+='<input id="s_nome" class="e-inp" value="'+esc(study.nome||'')+'" placeholder="Ex: Fungicida X vs. ferrugem asiática">';

  h+='<label class="e-lbl">DATA DA 1ª APLICAÇÃO</label>';
  h+='<input id="s_dataInicio" class="e-inp" type="date" value="'+esc(study.dataInicio||'')+'">';

  h+='<div class="e-row">';
  h+='<div><label class="e-lbl">Nº DE APLICAÇÕES</label>';
  h+='<input id="s_numApl" class="e-inp" type="number" min="1" value="'+(study.numAplicacoes||1)+'"></div>';
  h+='<div><label class="e-lbl">INTERVALO (DIAS)</label>';
  h+='<input id="s_intervalo" class="e-inp" type="number" min="0" value="'+(study.intervaloDias||0)+'" placeholder="Ex: 14"></div>';
  h+='</div>';
  h+='<div class="e-hint">Se houver mais de 1 aplicação, as próximas serão calculadas automaticamente.</div>';

  h+='<label class="e-lbl">DATAS DE AVALIAÇÃO</label>';
  h+=avalHtml;
  h+='<div class="eval-add-row"><input id="s_newAval" class="e-inp" type="date"><button class="eval-add-btn" onclick="addAval()">+</button></div>';
  h+='<div class="e-hint">Adicione uma ou mais datas de avaliação de campo.</div>';

  h+='<div class="e-btns"><button class="e-btn e-save" onclick="saveStudy()">SALVAR</button><button class="e-btn e-cancel" onclick="closeStudyEdit()">CANCELAR</button></div>';
  if(!isNew){
    h+='<button class="e-btn-del" onclick="deleteStudy(\''+qid+'\',\''+sid+'\',true)">EXCLUIR ESTUDO</button>';
  }

  document.getElementById("sPnl").innerHTML=h;
  document.getElementById("sOvl").classList.add("open");

  // store working copy
  document.getElementById("sPnl").dataset.study=JSON.stringify(study);
}

function closeStudyEdit(){
  document.getElementById("sOvl").classList.remove("open");
  var qid=curS;curS=null;curSid=null;
  if(qid)showD(qid);
}

function getWorkingStudy(){
  try{return JSON.parse(document.getElementById("sPnl").dataset.study||'{}')}catch(e){return{}}
}
function setWorkingStudy(s){
  document.getElementById("sPnl").dataset.study=JSON.stringify(s);
}

function addAval(){
  var v=document.getElementById("s_newAval").value;
  if(!v)return;
  var s=getWorkingStudy();
  if(!Array.isArray(s.avaliacoes))s.avaliacoes=[];
  if(s.avaliacoes.indexOf(v)===-1){
    s.avaliacoes.push(v);
    s.avaliacoes.sort();
  }
  setWorkingStudy(s);
  // re-render the eval list
  var ul=document.getElementById("evalList");
  var hh='';
  s.avaliacoes.forEach(function(iso,i){
    hh+='<div class="eval-chip"><span>'+fD(pD(isoToBR(iso)))+'</span><button class="eval-chip-rm" onclick="removeAval('+i+')">×</button></div>';
  });
  ul.innerHTML=hh;
  document.getElementById("s_newAval").value='';
}
function removeAval(i){
  var s=getWorkingStudy();
  if(!Array.isArray(s.avaliacoes))return;
  s.avaliacoes.splice(i,1);
  setWorkingStudy(s);
  var ul=document.getElementById("evalList");
  var hh='';
  s.avaliacoes.forEach(function(iso,j){
    hh+='<div class="eval-chip"><span>'+fD(pD(isoToBR(iso)))+'</span><button class="eval-chip-rm" onclick="removeAval('+j+')">×</button></div>';
  });
  ul.innerHTML=hh;
}

function saveStudy(){
  if(!curS)return;
  var s=getWorkingStudy();
  s.nome=document.getElementById("s_nome").value.trim();
  s.dataInicio=document.getElementById("s_dataInicio").value;
  s.numAplicacoes=parseInt(document.getElementById("s_numApl").value)||1;
  s.intervaloDias=parseInt(document.getElementById("s_intervalo").value)||0;
  if(!s.nome){alert("Dê um nome ao estudo.");return}
  if(!s.dataInicio){alert("Informe a data da 1ª aplicação.");return}
  if(!s.id)s.id=uid();

  var q = data[curS]||{};
  if(!Array.isArray(q.estudos))q.estudos=[];
  var idx = q.estudos.findIndex(function(x){return x.id===s.id});

  var action = '';
  var details = '';
  if(idx>=0) {
    action = 'Alteração do Estudo';
    var old = q.estudos[idx];
    var changes = [];
    if(old.nome !== s.nome) changes.push('Nome: "' + old.nome + '" -> "' + s.nome + '"');
    if(old.dataInicio !== s.dataInicio) changes.push('Início: ' + old.dataInicio + ' -> ' + s.dataInicio);
    if(old.numAplicacoes !== s.numAplicacoes) changes.push('Nº Apls: ' + old.numAplicacoes + ' -> ' + s.numAplicacoes);
    if(old.intervaloDias !== s.intervaloDias) changes.push('Intervalo: ' + old.intervaloDias + ' -> ' + s.intervaloDias);
    details = changes.length ? changes.join(', ') : 'Alterado via V1 editor';
  } else {
    action = 'Criação do Estudo';
    details = 'Nome: "' + s.nome + '" (V1)';
  }
  logStudyAuditInObject(s, action, details);
  s._ts=Date.now(); /* carimbo: no merge, a edição mais nova vence */

  if(idx>=0)q.estudos[idx]=s; else q.estudos.push(s);
  data[curS]=q;
  save();
  try{ if(typeof dbUpsertEstudo==='function') dbUpsertEstudo(curS, s); }catch(e){} /* Etapa 3 Fase B */
  _stxToast('✓ Estudo salvo!');
  var qid=curS;
  closeStudyEdit();
  render();updateAgendaBadge();
  showD(qid);
}

function deleteStudy(qid,sid,skipConfirm){
  requireDeletePassword('Excluir este estudo e seus resultados.', function(){
    safetyBackup('antes de excluir estudo');
    var q=data[qid];if(!q||!q.estudos)return;
    _markDeleted(q,'_deletedStudies',sid); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('estudos',sid); }catch(e){} /* Etapa 3 */
    q.estudos=q.estudos.filter(function(s){return s.id!==sid});
    save();
    if(document.getElementById("sOvl").classList.contains("open")){
      closeStudyEdit();
    }
    render();updateAgendaBadge();
    showD(qid);
  });
}


/* ============ ESCALAS BBCH POR CULTURA ============
  Fontes:
  - Soja: Munger et al. 1998 (BBCH) + Fehr & Caviness 1977 (V/R)
  - Algodão: Munger et al. 1998
  - Café: Arcila-Pulgarín et al. 2002
  - Milho: Weber & Bleiholder 1990; Lancashire et al. 1991
  - Feijão/Tomate/Cana/outros: Monografia BBCH geral (Hack et al. 1992; Meier 2001)
*/

var BBCH = {
  soja:[
    {code:"00",label:"00 — Semente seca",fase:"Germinação",equiv:""},
    {code:"05",label:"05 — Radícula emergiu",fase:"Germinação",equiv:""},
    {code:"09",label:"09 — Emergência (hipocótilo rompe o solo)",fase:"Germinação",equiv:"VE"},
    {code:"10",label:"10 — Cotilédones completamente abertos",fase:"Des. folhas",equiv:"VC"},
    {code:"11",label:"11 — 1º par de folhas unifolioladas",fase:"Des. folhas",equiv:"V1"},
    {code:"12",label:"12 — 1ª folha trifoliolada",fase:"Des. folhas",equiv:"V2"},
    {code:"13",label:"13 — 2ª folha trifoliolada",fase:"Des. folhas",equiv:"V3"},
    {code:"14",label:"14 — 3ª folha trifoliolada",fase:"Des. folhas",equiv:"V4"},
    {code:"15",label:"15 — 4ª folha trifoliolada",fase:"Des. folhas",equiv:"V5"},
    {code:"16",label:"16 — 5ª folha trifoliolada",fase:"Des. folhas",equiv:"V6"},
    {code:"19",label:"19 — 8+ folhas trifolioladas",fase:"Des. folhas",equiv:"V7+"},
    {code:"51",label:"51 — Primórdios florais visíveis",fase:"Inflorescência",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:"R1"},
    {code:"61",label:"61 — Início floração (10% abertas)",fase:"Floração",equiv:"R1"},
    {code:"65",label:"65 — Plena floração (50% abertas)",fase:"Floração",equiv:"R2"},
    {code:"69",label:"69 — Fim da floração",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Vagens começam a desenvolver (10%)",fase:"Vagens",equiv:"R3"},
    {code:"75",label:"75 — 50% das vagens no tamanho final",fase:"Vagens",equiv:"R4"},
    {code:"79",label:"79 — Quase todas vagens no tamanho final",fase:"Vagens",equiv:"R4/R5"},
    {code:"81",label:"81 — Início enchimento de grãos (10%)",fase:"Grãos",equiv:"R5.1"},
    {code:"85",label:"85 — 50% dos grãos enchendo vagens",fase:"Grãos",equiv:"R5.3"},
    {code:"89",label:"89 — Grãos atingiram tamanho final",fase:"Grãos",equiv:"R6"},
    {code:"91",label:"91 — Início maturação (10% vagens maduras)",fase:"Maturação",equiv:"R7"},
    {code:"95",label:"95 — 50% das folhas amareladas ou caídas",fase:"Maturação",equiv:"R7"},
    {code:"97",label:"97 — Plantas maduras/secas",fase:"Maturação",equiv:"R8"},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  algodao:[
    {code:"00",label:"00 — Semente seca",fase:"Germinação",equiv:""},
    {code:"09",label:"09 — Emergência",fase:"Germinação",equiv:""},
    {code:"10",label:"10 — Cotilédones abertos",fase:"Des. folhas",equiv:""},
    {code:"11",label:"11 — 1ª folha verdadeira",fase:"Des. folhas",equiv:""},
    {code:"13",label:"13 — 3 folhas verdadeiras",fase:"Des. folhas",equiv:""},
    {code:"15",label:"15 — 5 folhas verdadeiras",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ folhas verdadeiras",fase:"Des. folhas",equiv:""},
    {code:"51",label:"51 — 1º botão floral visível (square)",fase:"Botões",equiv:"B1"},
    {code:"55",label:"55 — Botões em ramos secundários",fase:"Botões",equiv:""},
    {code:"59",label:"59 — 1º botão prestes a abrir",fase:"Botões",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:"F1"},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Fim da floração",fase:"Floração",equiv:""},
    {code:"71",label:"71 — 1ª maçã formada",fase:"Maçãs",equiv:"M1"},
    {code:"75",label:"75 — Maçãs em metade tamanho final",fase:"Maçãs",equiv:""},
    {code:"79",label:"79 — Maçãs no tamanho final",fase:"Maçãs",equiv:""},
    {code:"81",label:"81 — 10% das maçãs abertas",fase:"Abertura",equiv:""},
    {code:"85",label:"85 — 50% das maçãs abertas",fase:"Abertura",equiv:""},
    {code:"89",label:"89 — Maturação completa (90%+ abertas)",fase:"Maturação",equiv:""},
    {code:"95",label:"95 — 50% folhas caídas (desfolha)",fase:"Senescência",equiv:""},
    {code:"97",label:"97 — Planta seca/morta",fase:"Senescência",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  cafe:[
    {code:"00",label:"00 — Gema dormente",fase:"Brotação",equiv:""},
    {code:"07",label:"07 — Início brotação",fase:"Brotação",equiv:""},
    {code:"09",label:"09 — Gemas abertas",fase:"Brotação",equiv:""},
    {code:"11",label:"11 — 1º par de folhas verdadeiras",fase:"Des. folhas",equiv:""},
    {code:"15",label:"15 — 5 pares de folhas",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ pares de folhas",fase:"Des. folhas",equiv:""},
    {code:"31",label:"31 — Alongamento dos ramos",fase:"Des. ramos",equiv:""},
    {code:"51",label:"51 — Botões florais visíveis",fase:"Inflorescência",equiv:""},
    {code:"55",label:"55 — Botões grão de chumbo",fase:"Inflorescência",equiv:""},
    {code:"59",label:"59 — Botões prontos para abrir",fase:"Inflorescência",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"67",label:"67 — Pétalas murchando",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Fim floração (queda pétalas)",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Chumbinho (frutos pequenos verdes)",fase:"Frutos",equiv:""},
    {code:"75",label:"75 — Frutos em expansão (meio tamanho)",fase:"Frutos",equiv:""},
    {code:"79",label:"79 — Frutos no tamanho final, verdes",fase:"Frutos",equiv:""},
    {code:"81",label:"81 — Início maturação (verde-cana)",fase:"Maturação",equiv:""},
    {code:"85",label:"85 — Frutos cereja (maduros vermelhos)",fase:"Maturação",equiv:""},
    {code:"87",label:"87 — Frutos passa (escuros)",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena",fase:"Maturação",equiv:""},
    {code:"97",label:"97 — Pós-colheita (repouso)",fase:"Repouso",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  milho:[
    {code:"00",label:"00 — Semente seca",fase:"Germinação",equiv:""},
    {code:"09",label:"09 — Emergência",fase:"Germinação",equiv:"VE"},
    {code:"11",label:"11 — 1ª folha expandida",fase:"Des. folhas",equiv:"V1"},
    {code:"13",label:"13 — 3 folhas",fase:"Des. folhas",equiv:"V3"},
    {code:"15",label:"15 — 5 folhas",fase:"Des. folhas",equiv:"V5"},
    {code:"17",label:"17 — 7 folhas",fase:"Des. folhas",equiv:"V7"},
    {code:"19",label:"19 — 9+ folhas",fase:"Des. folhas",equiv:"V9+"},
    {code:"32",label:"32 — 2 nós visíveis",fase:"Alongamento",equiv:""},
    {code:"34",label:"34 — 4 nós visíveis",fase:"Alongamento",equiv:""},
    {code:"51",label:"51 — Pendão emerge da bainha",fase:"Inflorescência",equiv:"VT"},
    {code:"55",label:"55 — Metade do pendão visível",fase:"Inflorescência",equiv:""},
    {code:"59",label:"59 — Pendão totalmente emergido",fase:"Inflorescência",equiv:""},
    {code:"61",label:"61 — Início liberação de pólen",fase:"Floração",equiv:""},
    {code:"63",label:"63 — Estigmas visíveis",fase:"Floração",equiv:"R1"},
    {code:"65",label:"65 — Plena polinização",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Fim floração (estigmas secando)",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Grãos em bolha (16% MS)",fase:"Grãos",equiv:"R2"},
    {code:"73",label:"73 — Leitoso inicial",fase:"Grãos",equiv:"R3"},
    {code:"75",label:"75 — Leitoso pleno (40% MS)",fase:"Grãos",equiv:"R4"},
    {code:"79",label:"79 — Grãos tamanho final",fase:"Grãos",equiv:""},
    {code:"83",label:"83 — Pastoso mole (45% MS)",fase:"Maturação",equiv:"R5"},
    {code:"85",label:"85 — Pastoso duro (55% MS)",fase:"Maturação",equiv:""},
    {code:"87",label:"87 — Camada preta (maturação fisiológica)",fase:"Maturação",equiv:"R6"},
    {code:"89",label:"89 — Maturação completa (grão duro)",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  feijao:[
    {code:"00",label:"00 — Semente seca",fase:"Germinação",equiv:""},
    {code:"09",label:"09 — Emergência",fase:"Germinação",equiv:"V1"},
    {code:"10",label:"10 — Cotilédones abertos",fase:"Des. folhas",equiv:"V2"},
    {code:"11",label:"11 — 1ª folha trifoliolada",fase:"Des. folhas",equiv:"V3"},
    {code:"13",label:"13 — 3ª folha trifoliolada",fase:"Des. folhas",equiv:"V4"},
    {code:"15",label:"15 — 5ª folha trifoliolada",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ folhas trifolioladas",fase:"Des. folhas",equiv:""},
    {code:"51",label:"51 — Botões florais visíveis",fase:"Inflorescência",equiv:"R5"},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:"R6"},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Fim floração",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Primeiras vagens formadas",fase:"Vagens",equiv:"R7"},
    {code:"75",label:"75 — Vagens metade tamanho",fase:"Vagens",equiv:""},
    {code:"79",label:"79 — Vagens tamanho final",fase:"Vagens",equiv:"R8"},
    {code:"81",label:"81 — Início maturação (10%)",fase:"Maturação",equiv:"R9"},
    {code:"85",label:"85 — 50% vagens maduras",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena",fase:"Maturação",equiv:""},
    {code:"97",label:"97 — Planta seca",fase:"Senescência",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  tomate:[
    {code:"00",label:"00 — Semente seca",fase:"Germinação",equiv:""},
    {code:"09",label:"09 — Emergência",fase:"Germinação",equiv:""},
    {code:"11",label:"11 — 1ª folha verdadeira",fase:"Des. folhas",equiv:""},
    {code:"15",label:"15 — 5 folhas verdadeiras",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ folhas verdadeiras",fase:"Des. folhas",equiv:""},
    {code:"51",label:"51 — 1º cacho floral visível",fase:"Inflorescência",equiv:""},
    {code:"55",label:"55 — Botões fechados",fase:"Inflorescência",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Fim floração",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Primeiros frutos formados",fase:"Frutos",equiv:""},
    {code:"75",label:"75 — Frutos metade tamanho",fase:"Frutos",equiv:""},
    {code:"79",label:"79 — Frutos tamanho final (verdes)",fase:"Frutos",equiv:""},
    {code:"81",label:"81 — Início maturação (1º fruto colorindo)",fase:"Maturação",equiv:""},
    {code:"85",label:"85 — 50% frutos coloridos",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  cana:[
    {code:"00",label:"00 — Tolete/muda dormente",fase:"Brotação",equiv:""},
    {code:"09",label:"09 — Emergência de broto",fase:"Brotação",equiv:""},
    {code:"12",label:"12 — 2 folhas",fase:"Des. folhas",equiv:""},
    {code:"15",label:"15 — 5 folhas",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ folhas",fase:"Des. folhas",equiv:""},
    {code:"21",label:"21 — Início perfilhamento",fase:"Perfilhamento",equiv:""},
    {code:"25",label:"25 — Perfilhamento pleno",fase:"Perfilhamento",equiv:""},
    {code:"29",label:"29 — Fim perfilhamento",fase:"Perfilhamento",equiv:""},
    {code:"31",label:"31 — Início alongamento colmos",fase:"Alongamento",equiv:""},
    {code:"35",label:"35 — Colmos em alongamento pleno",fase:"Alongamento",equiv:""},
    {code:"39",label:"39 — Colmos atingem altura final",fase:"Alongamento",equiv:""},
    {code:"51",label:"51 — Início emissão do pendão",fase:"Florescimento",equiv:""},
    {code:"65",label:"65 — Plena florada (se ocorrer)",fase:"Florescimento",equiv:""},
    {code:"81",label:"81 — Início maturação (acúmulo sacarose)",fase:"Maturação",equiv:""},
    {code:"85",label:"85 — Maturação avançada",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena (ponto de corte)",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  morango:[
    {code:"00",label:"00 — Muda dormente",fase:"Plantio",equiv:""},
    {code:"09",label:"09 — Pegamento da muda",fase:"Plantio",equiv:""},
    {code:"11",label:"11 — 1ª folha nova",fase:"Des. folhas",equiv:""},
    {code:"15",label:"15 — 5 folhas",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ folhas",fase:"Des. folhas",equiv:""},
    {code:"51",label:"51 — Botões florais visíveis",fase:"Inflorescência",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Fim floração",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Primeiros frutos formados",fase:"Frutos",equiv:""},
    {code:"79",label:"79 — Frutos tamanho final (verdes)",fase:"Frutos",equiv:""},
    {code:"85",label:"85 — 50% frutos vermelhos",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  melao:[
    {code:"00",label:"00 — Semente seca",fase:"Germinação",equiv:""},
    {code:"09",label:"09 — Emergência",fase:"Germinação",equiv:""},
    {code:"11",label:"11 — 1ª folha verdadeira",fase:"Des. folhas",equiv:""},
    {code:"15",label:"15 — 5 folhas",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — 9+ folhas",fase:"Des. folhas",equiv:""},
    {code:"21",label:"21 — 1ª ramificação lateral",fase:"Ramificação",equiv:""},
    {code:"51",label:"51 — Botões florais visíveis",fase:"Inflorescência",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Primeiros frutos formados",fase:"Frutos",equiv:""},
    {code:"75",label:"75 — Frutos metade tamanho",fase:"Frutos",equiv:""},
    {code:"79",label:"79 — Frutos tamanho final",fase:"Frutos",equiv:""},
    {code:"81",label:"81 — Início maturação",fase:"Maturação",equiv:""},
    {code:"85",label:"85 — Maturação avançada",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Produto colhido",fase:"Colheita",equiv:""}
  ],
  pastagem:[
    {code:"00",label:"00 — Dormência/pós-pastejo",fase:"Rebrote",equiv:""},
    {code:"09",label:"09 — Emergência de brotos",fase:"Rebrote",equiv:""},
    {code:"21",label:"21 — Início perfilhamento",fase:"Perfilhamento",equiv:""},
    {code:"25",label:"25 — Perfilhamento pleno",fase:"Perfilhamento",equiv:""},
    {code:"31",label:"31 — Alongamento dos colmos",fase:"Alongamento",equiv:""},
    {code:"39",label:"39 — Altura de pré-pastejo atingida",fase:"Alongamento",equiv:""},
    {code:"51",label:"51 — Emergência da inflorescência",fase:"Florescimento",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Florescimento",equiv:""},
    {code:"85",label:"85 — Sementes em maturação",fase:"Maturação",equiv:""},
    {code:"92",label:"92 — Senescência parcial",fase:"Senescência",equiv:""},
    {code:"99",label:"99 — Pós-pastejo/corte",fase:"Corte",equiv:""}
  ],
  citros:[
    {code:"00",label:"00 — Gemas dormentes",fase:"Repouso",equiv:""},
    {code:"07",label:"07 — Início brotação",fase:"Brotação",equiv:""},
    {code:"09",label:"09 — Brotações verdes visíveis",fase:"Brotação",equiv:""},
    {code:"11",label:"11 — 1ª folha nova",fase:"Des. folhas",equiv:""},
    {code:"19",label:"19 — Folhas novas maduras",fase:"Des. folhas",equiv:""},
    {code:"51",label:"51 — Botões florais visíveis",fase:"Inflorescência",equiv:""},
    {code:"59",label:"59 — Botões quase abrindo",fase:"Inflorescência",equiv:""},
    {code:"60",label:"60 — Primeiras flores abertas",fase:"Floração",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"69",label:"69 — Queda de pétalas",fase:"Floração",equiv:""},
    {code:"71",label:"71 — Chumbinho (frutos pequenos)",fase:"Frutos",equiv:""},
    {code:"75",label:"75 — Frutos metade tamanho",fase:"Frutos",equiv:""},
    {code:"79",label:"79 — Frutos tamanho final (verdes)",fase:"Frutos",equiv:""},
    {code:"81",label:"81 — Início mudança de cor",fase:"Maturação",equiv:""},
    {code:"85",label:"85 — Cor típica da cultivar",fase:"Maturação",equiv:""},
    {code:"89",label:"89 — Maturação plena (ponto colheita)",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Fruto colhido",fase:"Colheita",equiv:""}
  ],
  estufa:[
    {code:"00",label:"00 — Área vazia / preparo",fase:"Preparo",equiv:""},
    {code:"09",label:"09 — Plantio/emergência",fase:"Plantio",equiv:""},
    {code:"15",label:"15 — Desenvolvimento vegetativo",fase:"Vegetativo",equiv:""},
    {code:"51",label:"51 — Início formação órgãos reprodutivos",fase:"Inflorescência",equiv:""},
    {code:"65",label:"65 — Plena floração",fase:"Floração",equiv:""},
    {code:"75",label:"75 — Frutos/grãos em formação",fase:"Frutos",equiv:""},
    {code:"89",label:"89 — Maturação",fase:"Maturação",equiv:""},
    {code:"99",label:"99 — Ciclo finalizado",fase:"Colheita",equiv:""}
  ]
};

/* Mapeamento entre nome da cultura usado nas quadras e chave BBCH */
var BBCH_MAP = {
  "Soja":"soja",
  "Algodão":"algodao",
  "Algodao":"algodao",
  "Café":"cafe",
  "Cafe":"cafe",
  "CITROS":"citros",
  "Citros":"citros",
  "Milho":"milho",
  "Feijão":"feijao",
  "Feijao":"feijao",
  "Tomate":"tomate",
  "Cana":"cana",
  "Morango":"morango",
  "Melão":"melao",
  "Melao":"melao",
  "Pastagem":"pastagem",
  "ESTUFAS":"estufa",
  "Estufa":"estufa"
};
/* Mapeia as culturas novas ao melhor BBCH detalhado existente (seletor de estádio na avaliação) */
(function(){
  var add={ milho:["Trigo","Cevada","Aveia","Centeio","Triticale","Arroz","Sorgo","Milheto"],
    feijao:["Caupi","Ervilha","Grão-de-bico","Lentilha"],
    soja:["Girassol","Canola","Amendoim","Gergelim"],
    tomate:["Pimentão","Pimenta","Berinjela"],
    melao:["Melancia","Pepino","Abóbora","Abobrinha"],
    pastagem:["Braquiária","Urochloa","Mombaça","Panicum","Tifton","Cynodon","Azevém","Alfafa","Aveia forrageira"],
    citros:["Uva","Maçã","Pera","Pêssego","Ameixa","Banana","Manga","Abacate","Goiaba","Mamão","Maracujá","Abacaxi","Coco","Caqui","Cacau","Seringueira","Dendê","Oliveira","Erva-mate","Chá","Eucalipto"] };
  Object.keys(add).forEach(function(sc){ add[sc].forEach(function(n){ if(!BBCH_MAP[n]) BBCH_MAP[n]=sc; }); });
})();

function getBBCHList(cultura){
  var k=BBCH_MAP[cultura];
  return k?BBCH[k]:null;
}

function getBBCHInfo(cultura,code){
  var list=getBBCHList(cultura);
  if(!list||!code)return null;
  for(var i=0;i<list.length;i++){
    if(list[i].code===code)return list[i];
  }
  return null;
}

/* ============ NOVO SISTEMA DE ESTUDOS ============
  Estrutura de um estudo:
  {
    id:"s...",
    codigo:"EST-2026-0847",        // Código destacado
    descricao:"Avaliação de ...",   // Objetivo/descrição (livre)
    dataInicio:"2026-04-01",        // 1ª aplicação (ISO)
    intervaloDias:14,               // Intervalo entre aplicações
    numAplicacoes:3,
    tratamentos:[                   // Tabela de tratamentos
      {id:"T1", produto:"...", dose:"0.5 L/ha", volume:"200 L/ha", obs:""},
      ...
    ],
    numRepeticoes:4,                // Padrão, editável
    aplicacoes:[                    // Histórico de aplicações realizadas
      {id, data:"ISO", bbch:"65", obs:""}
    ],
    avaliacoes:[                    // Histórico de avaliações
      {id, data:"ISO", tipo:"Severidade", bbch:"71", obs:""}
    ]
  }
*/

var TIPOS_AVALIACAO = [
  "Incidência",
  "Severidade",
  "Fitotoxicidade",
  "Produção",
  "Stand de plantas",
  "Altura",
  "População de insetos",
  "Eficácia",
  "Outro"
];

function newStudy(){
  return {
    id:uid(),
    codigo:"",
    descricao:"",
    tipoEstudo:"",        /* dirige o catálogo de variáveis da avaliação */
    dataInicio:"",
    intervaloDias:14,
    numAplicacoes:1,
    tratamentos:[],
    numRepeticoes:4,
    volumeMorto:0,        /* mL — calda que fica no pulverizador/mangueira */
    numFrascos:1,         /* frascos por preparo de calda */
    capacidadeFrasco:0,   /* L — 0 = não confere capacidade */
    /* preparo no laboratório (só usado quando a quadra é do tipo 'lab') */
    labVolumeMl:50,       /* mL — volume do pote; 50 = falcon */
    labFonteTipo:'gL',    /* gL | gkg | mae | puro */
    labFonteValor:'',     /* valor do rótulo / ppm da solução-mãe */
    labPureza:'',         /* % — vazio = 100 */
    labDensidade:'',      /* g/mL — vazio = 1,00 (obrigatória para g/kg) */
    /* Como a dose dos tratamentos é definida. Declarado UMA vez no cadastro em
       vez de adivinhado a cada leitura: é o que faz o rótulo do gráfico e da
       tabela dizerem "500 mL/ha" em vez de chutar L/ha, e o que decide qual
       receita a calculadora do laboratório abre. */
    doseModo:'campo',     /* campo | ppm */
    doseUnidade:'L/ha',   /* L/ha | mL/ha | g/ha | kg/ha — só vale em doseModo 'campo' */
    /* ===== DESENHO EXPERIMENTAL ==========================================
       'dbc'    — blocos ao acaso dentro de UMA quadra. É tudo que existia.
       'faixas' — cada tratamento ocupa uma FAIXA/área própria, possivelmente
                  em quadras diferentes (o caso do Bosqueiro: item de teste em
                  1 ha, produto do produtor em 1 ha, testemunha em 6 plantas).

       Em faixas o tratamento NÃO é repetido: ele aparece uma vez, num pedaço
       contíguo de terra. Medir vinte pontos dentro da faixa não gera vinte
       repetições — gera vinte medidas do mesmo pedaço, e a diferença entre
       faixas carrega solo, declive e bordadura junto com o produto. Isso é
       pseudorreplicação, e p-valor tirado dali não quer dizer o que parece.

       A saída válida é BLOCAR POR POSIÇÃO: dividir as faixas em treços
       transversais e amostrar os mesmos treços em todas elas. Aí cada treço é
       um bloco legítimo, absorve o gradiente do terreno, e a ANOVA volta a
       valer. `faixas[]` amarra tratamento -> quadra; o treço entra como a
       "repetição" de sempre na grade de notas (T1R1, T1R2...), então o motor
       estatístico não muda. Quem decide se há análise é estudoTemReplicacao(). */
    desenho:'dbc',        /* dbc | faixas */
    faixas:[],            /* [{tratId, qid, areaHa}] — só em desenho 'faixas' */
    testemunha:'',
    aplicacoes:[],
    avaliacoes:[],
    avalInicio:"",
    avalIntervalo:7,
    avalNum:0,
    randomizado:false,
    randomizacao:null,
    protocolo:null,
    protocoloOrigem:null,
    audit:[]
  };
}

function newTratamento(numero){
  return {
    id:"T"+numero,
    produto:"",
    ingredienteAtivo:"",
    concentracao:"",
    concentracaoAtivo:"",
    dose:"",
    volume:"",
    adjuvante:"",
    obs:""
  };
}

/* Junta uma avaliação duplicada (mesma data) noutra, sem perder NENHUMA nota (valor preenchido vence). */
function _fundeAval(keep, extra){
  if(!keep||!extra) return;
  if(extra.variaveis&&extra.variaveis.length){ var seen={}; keep.variaveis=(keep.variaveis||[]).concat(extra.variaveis).filter(function(v){ if(seen[v])return false; seen[v]=1; return true; }); }
  keep.tipos=Object.assign({}, extra.tipos||{}, keep.tipos||{});
  keep.varcfg=Object.assign({}, extra.varcfg||{}, keep.varcfg||{});
  /* bruto das sub-amostras/razão: célula preenchida vence célula vazia (não perde na fusão) */
  var eb=extra.bruto||{}; if(!keep.bruto)keep.bruto={};
  for(var kb in eb){ var er2=eb[kb]||{}, kr2=keep.bruto[kb]||(keep.bruto[kb]={});
    for(var vb in er2){ if(kr2[vb]==null) kr2[vb]=er2[vb]; } }
  var en=extra.notas||{}; if(!keep.notas)keep.notas={};
  for(var k in en){ var er=en[k]||{}; var kr=keep.notas[k]||(keep.notas[k]={}); for(var v2 in er){ var ev=er[v2]; if(ev!=null&&String(ev).trim()!=='' && (kr[v2]==null||String(kr[v2]).trim()==='')) kr[v2]=ev; } }
  var em=extra.notasMeta||{}; if(!keep.notasMeta)keep.notasMeta={};
  for(var k2 in em){ if(!keep.notasMeta[k2]) keep.notasMeta[k2]=em[k2]; }
  if(!keep.tipo&&extra.tipo)keep.tipo=extra.tipo;
  if(!keep.bbch&&extra.bbch)keep.bbch=extra.bbch;
  if(!keep.obs&&extra.obs)keep.obs=extra.obs;
  if(!keep.carimbo&&extra.carimbo)keep.carimbo=extra.carimbo;
  if(extra.realizada)keep.realizada=true;
  if(extra.auto===false)keep.auto=false;
}
/* Remove avaliações DUPLICADAS por data (vêm de aparelhos diferentes com ids diferentes; o merge mantinha
   as duas, inflando a contagem — ex.: 36 em vez de 6). Junta os dados; não perde nenhuma nota. */
function _dedupeAvaliacoes(s){
  if(!s||!Array.isArray(s.avaliacoes)||s.avaliacoes.length<2) return;
  if(window._avEditing) return; /* não mexe enquanto uma avaliação está aberta */
  var byKey={}, order=[], dup=false;
  s.avaliacoes.forEach(function(a){
    /* A data sozinha não identifica mais a avaliação: um knockdown lê 1, 2, 4 e
       24 HAT no mesmo dia, e fundir por data juntava as quatro numa só — perda
       silenciosa, antes mesmo de qualquer gráfico. Quem declara HAT/DAT entra na
       chave; quem não declara continua fundindo por data, como sempre. */
    var _m=(a&&a.momento)?avMomento(a,null):null;
    var _mk=(_m&&_m.explicito)?('|'+_m.chave):'';
    var key=(a&&a.data)?('d:'+a.data+_mk):('id:'+((a&&a.id)||Math.random())); /* sem data => não funde */
    if(!byKey[key]){ byKey[key]=a; order.push(key); }
    else { dup=true; _fundeAval(byKey[key], a); }
  });
  if(dup) s.avaliacoes=order.map(function(k){return byKey[k];});
}
/* Número vindo de input/legado: aceita vírgula decimal; vazio/inválido => fallback. */
function _numBR(v,fallback){
  if(typeof v==='number') return isFinite(v)?v:fallback;
  var t=String(v==null?'':v).trim().replace(',','.');
  if(t==='') return fallback;
  var n=parseFloat(t);
  return isFinite(n)?n:fallback;
}
function normalizeStudy(s){
  /* Garante que todos os campos existem mesmo em estudos antigos */
  if(!s)return newStudy();
  if(!s.id)s.id=uid();
  if(typeof s.codigo!=="string")s.codigo=s.nome||"";
  if(typeof s.descricao!=="string")s.descricao="";
  if(typeof s.tipoEstudo!=="string")s.tipoEstudo="";
  if(typeof s.dataInicio!=="string")s.dataInicio="";
  if(typeof s.intervaloDias!=="number")s.intervaloDias=parseInt(s.intervaloDias)||14;
  if(typeof s.numAplicacoes!=="number")s.numAplicacoes=parseInt(s.numAplicacoes)||1;
  if(!Array.isArray(s.tratamentos))s.tratamentos=[];
  if(typeof s.numRepeticoes!=="number")s.numRepeticoes=parseInt(s.numRepeticoes)||4;
  /* preparo de calda (alimenta a calculadora de aplicação) — aceita vírgula do teclado BR */
  if(typeof s.volumeMorto!=="number")s.volumeMorto=_numBR(s.volumeMorto,0);
  if(typeof s.numFrascos!=="number")s.numFrascos=Math.max(1,Math.round(_numBR(s.numFrascos,1))||1);
  if(typeof s.capacidadeFrasco!=="number")s.capacidadeFrasco=_numBR(s.capacidadeFrasco,0);
  /* laboratório: estudo antigo não tem os campos — entra com o padrão do falcon.
     Fonte/pureza/densidade ficam como TEXTO (vazio = "não informado", que é
     diferente de zero: o núcleo trata vazio como 100% / 1,00 g/mL). */
  if(typeof s.labVolumeMl!=="number")s.labVolumeMl=_numBR(s.labVolumeMl,50)||50;
  if(['gL','gkg','mae','puro'].indexOf(s.labFonteTipo)<0)s.labFonteTipo='gL';
  if(s.labFonteValor==null)s.labFonteValor='';
  if(s.labPureza==null)s.labPureza='';
  if(s.labDensidade==null)s.labDensidade='';
  /* Dose: estudo antigo não declarou nada. Em vez de cravar L/ha, LÊ a unidade
     que os tratamentos já escreveram — se todos concordam, é ela. Assim um
     estudo velho todo em mL/ha não passa a se anunciar como L/ha. A unidade do
     estudo é só o padrão: dose que traz a própria unidade continua mandando. */
  /* Desenho: estudo antigo não declarou nada e é DBC, que é o que sempre foi. */
  if(s.desenho!=='faixas' && s.desenho!=='dbc') s.desenho='dbc';
  if(!Array.isArray(s.faixas)) s.faixas=[];
  /* Faixa só sobrevive se apontar para um tratamento que existe: apagar um
     tratamento não pode deixar faixa órfã amarrando uma quadra a nada. */
  if(s.desenho==='faixas'){
    var _ids={}; (s.tratamentos||[]).forEach(function(t){ if(t&&t.id) _ids[t.id]=1; });
    s.faixas=s.faixas.filter(function(f){ return f && f.tratId && _ids[f.tratId]; })
                     .map(function(f){ return {tratId:f.tratId, qid:f.qid||'', areaHa:(f.areaHa!=null&&f.areaHa!==''?Number(f.areaHa):null)}; });
  }else if(s.faixas.length){ s.faixas=[]; }
  if(s.doseModo!=='ppm' && s.doseModo!=='campo') s.doseModo='campo';
  if(['L/ha','mL/ha','g/ha','kg/ha'].indexOf(s.doseUnidade)<0){
    var _un={};
    if(typeof _calcDoseUnit==='function'){
      (s.tratamentos||[]).forEach(function(t){
        if(!t||t.testemunha) return;
        var raw=String(t.dose||'');
        if(/[a-zA-Z]/.test(raw)) _un[_calcDoseUnit(raw)]=1;   /* só conta quem escreveu unidade */
      });
    }
    var _uk=Object.keys(_un);
    s.doseUnidade=(_uk.length===1)?_uk[0]:'L/ha';
  }
  if(typeof s.testemunha!=="string")s.testemunha="";
  /* Testemunhas múltiplas: flag por tratamento (t.testemunha). Migra a testemunha primária antiga. */
  s.tratamentos.forEach(function(t){ if(t) t.testemunha=!!t.testemunha; });
  if(s.testemunha && !s.tratamentos.some(function(t){return t&&t.testemunha;})){ var _pt=s.tratamentos.find(function(t){return t&&t.id===s.testemunha;}); if(_pt) _pt.testemunha=true; } /* só semeia a testemunha legada se NADA estiver marcado — antes re-marcava o T1 toda vez (bug) */
  /* Momento explícito da avaliação: OPCIONAL. Vazio/ausente = derivar da data,
     que é como tudo que já existe funciona. Só sobrevive se estiver completo e
     for um número — meio preenchido vira ausente, para não inventar um eixo. */
  (s.avaliacoes||[]).forEach(function(a){
    if(!a) return;
    var m=a.momento;
    if(!m || (m.unidade!=='HAT' && m.unidade!=='DAT')){ if(m) delete a.momento; return; }
    var v=parseFloat(String(m.valor).replace(',','.'));
    if(!isFinite(v)){ delete a.momento; return; }
    a.momento={valor:v, unidade:m.unidade};
  });
  if(typeof s.avalInicio!=="string")s.avalInicio="";
  if(typeof s.avalIntervalo!=="number")s.avalIntervalo=parseInt(s.avalIntervalo)||7;
  if(typeof s.avalNum!=="number")s.avalNum=parseInt(s.avalNum)||0;
  if(!s.protocolo||typeof s.protocolo!=="object")s.protocolo=null;
  if(!s.protocoloOrigem||typeof s.protocoloOrigem!=="object")s.protocoloOrigem=null;
  s.randomizado=!!s.randomizado;
  if(!s.randomizacao||typeof s.randomizacao!=="object")s.randomizacao=null;
  if(!Array.isArray(s.aplicacoes))s.aplicacoes=[];
  /* Converte avaliacoes antigas (array de strings ISO) para novo formato */
  if(Array.isArray(s.avaliacoes)){
    s.avaliacoes=s.avaliacoes.map(function(a){
      if(typeof a==="string")return {id:uid(),data:a,tipo:"",bbch:"",obs:""};
      if(!a.id)a.id=uid();
      if(!a.tipo)a.tipo="";
      if(!a.bbch)a.bbch="";
      if(!a.obs)a.obs="";
      if(!Array.isArray(a.variaveis))a.variaveis=[];
      if(!a.notas||typeof a.notas!=="object")a.notas={};
      if(!a.tipos||typeof a.tipos!=="object")a.tipos={};
      if(!a.notasMeta||typeof a.notasMeta!=="object")a.notasMeta={};
      if(!a.varcfg||typeof a.varcfg!=="object")a.varcfg={}; /* sub-amostras / N padrão / escala por variável */
      if(!a.bruto||typeof a.bruto!=="object")a.bruto={};    /* dado bruto: sub-amostras e n/N por parcela */
      return a;
    });
  }else s.avaliacoes=[];
  _dedupeAvaliacoes(s); /* corrige duplicatas de avaliação acumuladas no merge entre aparelhos */
  if(!Array.isArray(s.audit)) s.audit=[];
  return s;
}

/* Nome legível do usuário logado (perfis/roster/admin) — p/ auditoria e assinatura */
function _currentUserName(){
  var email = (typeof _authUser !== 'undefined' && _authUser && _authUser.email) ? _authUser.email : null;
  if(!email) return 'Local/Offline';
  try{
    ensureConfig();
    var allowed = (data && data.__config && data.__config.allowedUsers || []);
    var user = allowed.find(function(u){ return u && typeof u.email === 'string' && u.email.toLowerCase().trim() === email.toLowerCase().trim(); });
    if(user && user.nome) return user.nome;
    var admEmail = (data && data.__config && data.__config.adminEmail || '').toLowerCase().trim();
    if(admEmail && email.toLowerCase().trim() === admEmail) return 'Administrador';
  }catch(e){}
  return email;
}
/* Trilha BPL: além de quem/quando/ação, aceita extra (mudancas de→para, motivo). Append-only. */
function logStudyAuditInObject(study, action, details, extra) {
  if(!study) return;
  if(!Array.isArray(study.audit)) study.audit = [];
  var entry = {
    ts: Date.now(),
    user: _currentUserName(),
    por: (typeof _authUser !== 'undefined' && _authUser && _authUser.email) ? _authUser.email : null,
    action: action,
    details: details
  };
  if(extra && typeof extra==='object'){ for(var k in extra){ if(extra[k]!=null) entry[k]=extra[k]; } }
  study.audit.push(entry);
}
/* Diferenças célula a célula (de→para) entre duas grades de notas — p/ a trilha */
function _avDiffCells(oldN, newN){
  oldN=oldN||{}; newN=newN||{}; var out=[], rows={};
  Object.keys(oldN).forEach(function(r){rows[r]=1;}); Object.keys(newN).forEach(function(r){rows[r]=1;});
  Object.keys(rows).forEach(function(r){
    var o=oldN[r]||{}, n=newN[r]||{}, cols={};
    Object.keys(o).forEach(function(c){cols[c]=1;}); Object.keys(n).forEach(function(c){cols[c]=1;});
    Object.keys(cols).forEach(function(c){
      var ov=(o[c]==null?'':String(o[c])), nv=(n[c]==null?'':String(n[c]));
      if(ov!==nv) out.push({parcela:r, variavel:c, de:ov, para:nv});
    });
  });
  return out;
}
/* Reabrir avaliação ASSINADA p/ editar (BPL: exige motivo, fica na trilha) */
var _avReopen=null;
function reabrirAvaliacao(aid){
  var motivo=(window.prompt('Esta avaliação está ASSINADA.\nPara editar (exigência BPL), descreva o MOTIVO da alteração:')||'').trim();
  if(!motivo){ if(typeof _stxToast==='function')_stxToast('Reabertura cancelada — o motivo é obrigatório.'); return; }
  _avReopen={ avid:aid, motivo:motivo, by:((typeof _authUser!=='undefined'&&_authUser&&_authUser.email)||''), byNome:_currentUserName(), ts:Date.now() };
  openStudyEditAvaliacao(aid, null, true);
}

function studyAuditHtml(study){
  var s = study;
  if(!s.audit || !s.audit.length) {
    return '<div class="sd-section">' +
      '<div class="sd-section-title">🛡️ Trilha de Auditoria BPL</div>' +
      '<div class="sd-empty" style="color:var(--text-3,#8aa88a)">Nenhum registro de auditoria gravado ainda.</div>' +
      '</div>';
  }
  
  var html = '<div class="sd-section">' +
    '<div class="sd-section-title">🛡️ Trilha de Auditoria BPL</div>' +
    '<div style="background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);border-radius:12px;padding:12px;max-height:250px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">';
    
  s.audit.slice().reverse().forEach(function(entry){
    var dt = new Date(entry.ts);
    var dateStr = isNaN(dt.getTime()) ? '?' : dt.toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'});
    html += '<div style="border-bottom:1px solid var(--border,#26322b);padding-bottom:6px;font-size:11px;line-height:1.45">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
        '<span style="color:var(--accent,#37d684);font-weight:700">' + esc(entry.action) + '</span>' +
        '<span style="color:var(--text-3,#7c8a80);font-size:10px">' + dateStr + '</span>' +
      '</div>' +
      '<div style="color:var(--text,#e8efe9);word-break:break-word">' + esc(entry.details) + '</div>' +
      (entry.motivo ? '<div style="color:#d8b6e6;font-size:10px;margin-top:2px">Motivo: <b>'+esc(entry.motivo)+'</b></div>' : '') +
      ((Array.isArray(entry.mudancas) && entry.mudancas.length) ? '<div style="margin-top:3px;font-size:10px;color:var(--text-2,#9fb1a5);border-left:2px solid var(--border,#26322b);padding-left:6px">'+entry.mudancas.slice(0,12).map(function(m){return esc(m.parcela)+'·'+esc(m.variavel)+': <span style="color:#ff9a8a">'+esc(m.de||'∅')+'</span> → <span style="color:#9fe0b6">'+esc(m.para||'∅')+'</span>';}).join('<br>')+((entry.total_mudancas&&entry.total_mudancas>12)?('<br>… +'+(entry.total_mudancas-12)+' alterações'):'')+'</div>' : '') +
      '<div style="color:var(--text-2,#9fb1a5);font-size:9px;margin-top:2px;font-style:italic">Por: ' + esc(entry.user) + (entry.por?(' ('+esc(entry.por)+')'):'') + '</div>' +
      '</div>';
  });
  
  html += '</div></div>';
  return html;
}

/* Modelos padrao importados de Randomizacoes_ordem_final.xlsx.
   Cada token e tratamento+repeticao de campo (ex.: 9B). T2 e T15 tinham uma
   duplicidade obvia na planilha; aqui ficam corrigidos para manter 1 vez/trat/rep. */
var REP_LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var RANDOMIZACAO_MODELOS={
  2:'1A 2A 1B 2B 1C 2C 1D 2D'.split(' '),
  3:'1A 2A 3A 2B 1B 3B 2C 3C 1C 2D 1D 3D'.split(' '),
  4:'1A 2A 3A 4A 3B 1B 4B 2B 3C 1C 4C 2C 1D 2D 3D 4D'.split(' '),
  5:'1A 2A 3A 4A 5A 1B 3B 5B 4B 2B 3C 5C 2C 1C 4C 2D 5D 1D 3D 4D'.split(' '),
  6:'1A 2A 3A 4A 5A 6A 1B 2B 3B 6B 4B 5B 6C 2C 4C 1C 3C 5C 2D 4D 6D 1D 5D 3D'.split(' '),
  7:'1A 2A 3A 4A 5A 6A 7A 2B 3B 1B 7B 5B 6B 4B 7C 3C 6C 2C 4C 5C 1C 3D 7D 6D 1D 4D 5D 2D'.split(' '),
  8:'1A 2A 3A 4A 5A 6A 7A 8A 1B 3B 4B 7B 5B 2B 6B 8B 3C 5C 1C 7C 2C 8C 6C 4C 2D 5D 3D 1D 8D 6D 4D 7D'.split(' '),
  9:'1A 2A 3A 4A 5A 6A 7A 8A 9A 2B 5B 1B 9B 6B 3B 8B 4B 7B 8C 6C 1C 9C 4C 2C 5C 3C 7C 1D 6D 4D 8D 3D 7D 2D 9D 5D'.split(' '),
  10:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 4B 2B 5B 3B 1B 9B 6B 8B 10B 7B 8C 6C 4C 7C 2C 10C 5C 9C 3C 1C 6D 7D 2D 4D 8D 1D 10D 5D 3D 9D'.split(' '),
  11:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 11A 4B 2B 7B 11B 3B 9B 1B 10B 5B 8B 6B 10C 7C 4C 11C 8C 2C 5C 1C 6C 3C 9C 5D 1D 8D 4D 6D 10D 3D 7D 2D 11D 9D'.split(' '),
  12:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 11A 12A 3B 4B 9B 1B 11B 2B 7B 12B 8B 5B 10B 6B 7C 4C 9C 11C 1C 10C 5C 3C 12C 6C 8C 2C 5D 1D 7D 4D 6D 10D 2D 9D 3D 12D 8D 11D'.split(' '),
  13:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 11A 12A 13A 2B 5B 7B 11B 3B 1B 12B 4B 8B 10B 13B 9B 6B 10C 7C 11C 1C 3C 13C 5C 12C 6C 2C 9C 4C 8C 3D 10D 6D 1D 13D 7D 4D 2D 11D 9D 5D 8D 12D'.split(' '),
  14:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 11A 12A 13A 14A 1B 7B 9B 6B 4B 13B 3B 10B 14B 2B 11B 8B 12B 5B 10C 6C 13C 1C 11C 4C 9C 7C 12C 14C 3C 8C 5C 2C 10D 6D 11D 4D 1D 5D 2D 12D 13D 3D 8D 14D 7D 9D'.split(' '),
  15:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 11A 12A 13A 14A 15A 5B 8B 4B 1B 13B 7B 14B 3B 15B 10B 2B 11B 9B 12B 6B 15C 5C 10C 8C 14C 9C 13C 1C 3C 2C 4C 7C 12C 6C 11C 10D 3D 9D 2D 8D 5D 15D 6D 11D 4D 12D 1D 14D 7D 13D'.split(' '),
  16:'1A 2A 3A 4A 5A 6A 7A 8A 9A 10A 11A 12A 13A 14A 15A 16A 8B 6B 11B 3B 16B 1B 2B 5B 4B 12B 14B 9B 15B 13B 7B 10B 14C 9C 11C 6C 16C 2C 10C 1C 3C 15C 8C 13C 7C 5C 12C 4C 10D 1D 9D 2D 6D 14D 7D 4D 15D 3D 13D 11D 16D 12D 5D 8D'.split(' ')
};
function _repLetter(rep){
  rep=Math.max(1,parseInt(rep)||1);
  var s='', n=rep;
  while(n>0){ n--; s=REP_LETTERS[n%26]+s; n=Math.floor(n/26); }
  return s||'A';
}
function _repDisplay(rep){ return _repLetter(rep).toLowerCase(); }
function _repIndex(label){
  var s=String(label||'').toUpperCase(), n=0;
  for(var i=0;i<s.length;i++){ var p=REP_LETTERS.indexOf(s[i]); if(p<0)return 0; n=n*26+p+1; }
  return n;
}
function _parseCampoCode(tok){
  var m=String(tok||'').trim().toUpperCase().match(/^(\d+)\s*([A-Z]+)$/);
  return m?{tratNum:parseInt(m[1]),rep:_repIndex(m[2]),repLabel:m[2]}:null;
}
function _campoCode(tratNum,rep){ return String(tratNum)+_repLetter(rep); }
function _studyProtocolKey(s){
  s=normalizeStudy(s);
  return (s.tratamentos||[]).map(function(t){return t.id;}).join(',')+'|rep='+Math.max(1,parseInt(s.numRepeticoes)||1);
}
function _randomizacaoValida(ordem,nTrat,reps){
  if(!ordem||ordem.length!==nTrat*reps)return false;
  for(var r=1;r<=reps;r++){
    var seen={};
    ordem.forEach(function(p){ if(parseInt(p.rep)===r) seen[p.tratNum||0]=(seen[p.tratNum||0]||0)+1; });
    for(var t=1;t<=nTrat;t++){ if(seen[t]!==1)return false; }
  }
  return true;
}
function _modeloRandomizacao(s,ids,reps){
  var tokens=RANDOMIZACAO_MODELOS[ids.length];
  if(!tokens)return null;
  var ordem=[], parcela=1, ok=true;
  tokens.forEach(function(tok){
    if(!ok)return;
    var p=_parseCampoCode(tok);
    if(!p||p.tratNum<1||p.tratNum>ids.length){ ok=false; return; }
    if(p.rep<=reps){
      ordem.push({parcela:parcela++,tratId:ids[p.tratNum-1],tratNum:p.tratNum,rep:p.rep,repLabel:_repLetter(p.rep),campo:_campoCode(p.tratNum,p.rep)});
    }
  });
  if(!ok||!_randomizacaoValida(ordem,ids.length,reps))return null;
  return {key:_studyProtocolKey(s),ordem:ordem,geradaEm:todayISO(),modelo:'planilha',nome:'T'+ids.length,reps:'A-'+_repLetter(reps)};
}
function _studyRandomModeloInfo(st){
  st=normalizeStudy(st||{});
  var n=(st.tratamentos||[]).length, reps=Math.max(1,parseInt(st.numRepeticoes)||1);
  return {n:n,reps:reps,ok:!!RANDOMIZACAO_MODELOS[n]&&reps<=4,nome:'T'+n,repsNome:'A-'+_repLetter(Math.min(reps,4))};
}
function _hashSeed(str){
  var h=2166136261>>>0;
  for(var i=0;i<String(str).length;i++){ h^=String(str).charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  return h||123456789;
}
function _seedRand(seed){
  var x=seed>>>0;
  return function(){ x^=x<<13; x^=x>>>17; x^=x<<5; return ((x>>>0)/4294967296); };
}
function _shuffleCopy(arr,seed){
  var a=arr.slice(), rnd=_seedRand(seed);
  for(var i=a.length-1;i>0;i--){ var j=Math.floor(rnd()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
function buildRandomizacao(s){
  s=normalizeStudy(s);
  var ids=(s.tratamentos||[]).map(function(t){return t.id;});
  var reps=Math.max(1,parseInt(s.numRepeticoes)||1), ordem=[], parcela=1;
  var modelo=_modeloRandomizacao(s,ids,reps);
  if(modelo) return modelo;
  var base=_hashSeed((s.id||'estudo')+'|'+_studyProtocolKey(s));
  for(var r=1;r<=reps;r++){
    _shuffleCopy(ids,base+r*9973).forEach(function(tid){
      var tratNum=ids.indexOf(tid)+1;
      ordem.push({parcela:parcela++,tratId:tid,tratNum:tratNum,rep:r,repLabel:_repLetter(r),campo:_campoCode(tratNum,r)});
    });
  }
  return {key:_studyProtocolKey(s),ordem:ordem,geradaEm:todayISO(),modelo:'gerada'};
}
function ensureStudyRandomizacao(s){
  s=normalizeStudy(s);
  var key=_studyProtocolKey(s), reps=Math.max(1,parseInt(s.numRepeticoes)||1);
  var hasModelo=!!RANDOMIZACAO_MODELOS[(s.tratamentos||[]).length] && reps<=4;
  if(!s.randomizacao || s.randomizacao.key!==key || !Array.isArray(s.randomizacao.ordem) || (hasModelo && !s.randomizacao.manual && s.randomizacao.modelo!=='planilha')){
    s.randomizacao=buildRandomizacao(s);
  }
  return s.randomizacao;
}
function randomizacaoToText(s){
  s=normalizeStudy(s); var rz=ensureStudyRandomizacao(s), reps=Math.max(1,parseInt(s.numRepeticoes)||1), ids=(s.tratamentos||[]).map(function(t){return t.id;}), lines=[];
  if(rz.textoManual) return rz.textoManual;
  for(var r=1;r<=reps;r++){
    var a=rz.ordem.filter(function(p){return parseInt(p.rep)===r;}).sort(function(a,b){return a.parcela-b.parcela;}).map(function(p){
      if(rz.modelo==='planilha'||p.campo){
        var tn=p.tratNum||ids.indexOf(p.tratId)+1;
        return p.campo||_campoCode(tn,p.rep);
      }
      return p.tratId;
    });
    lines.push(a.join(' '));
  }
  return lines.join('\n');
}
function parseRandomizacaoText(s,text){
  s=normalizeStudy(s);
  var ids=(s.tratamentos||[]).map(function(t){return t.id;}), idSet={}, reps=Math.max(1,parseInt(s.numRepeticoes)||1), total=ids.length*reps;
  ids.forEach(function(id){ idSet[id.toUpperCase()]=id; });
  if(!ids.length) return {ok:false,msg:'Cadastre os tratamentos antes.'};
  var raw=String(text||'').trim(), campoTokens=raw.toUpperCase().match(/\b\d+\s*[A-Z]+\b/g)||[];
  if(campoTokens.length){
    if(campoTokens.length!==total) return {ok:false,msg:'A randomização precisa ter '+total+' parcelas ('+ids.length+' tratamentos × '+reps+' repetições).'};
    var campoOrdem=[], campoSeen={}, campoParcela=1;
    for(var c=0;c<campoTokens.length;c++){
      var cp=_parseCampoCode(campoTokens[c]);
      if(!cp||cp.tratNum<1||cp.tratNum>ids.length) return {ok:false,msg:'Parcela não reconhecida: '+campoTokens[c]+'. Use tratamento 1 a '+ids.length+' com repetição A, B, C...'};
      if(cp.rep<1||cp.rep>reps) return {ok:false,msg:'A repetição '+cp.repLabel+' não existe neste protocolo. Ajuste o Nº de repetições ou remova essa repetição.'};
      var ckey=cp.tratNum+'|'+cp.rep;
      if(campoSeen[ckey]) return {ok:false,msg:'Parcela repetida: '+_campoCode(cp.tratNum,cp.rep)+'.'};
      campoSeen[ckey]=1;
      campoOrdem.push({parcela:campoParcela++,tratId:ids[cp.tratNum-1],tratNum:cp.tratNum,rep:cp.rep,repLabel:_repLetter(cp.rep),campo:_campoCode(cp.tratNum,cp.rep)});
    }
    if(!_randomizacaoValida(campoOrdem,ids.length,reps)) return {ok:false,msg:'A ordem precisa conter cada tratamento exatamente uma vez em cada repetição.'};
    return {ok:true,randomizacao:{key:_studyProtocolKey(s),ordem:campoOrdem,geradaEm:todayISO(),manual:true,textoManual:raw,modelo:'manual-campo'}};
  }
  var lines=String(text||'').split(/\n+/).map(function(l){return l.replace(/^\s*(rep(?:eti[cç][aã]o)?|r)\s*\d+\s*[:;,\-]\s*/i,'').trim();}).filter(Boolean);
  var byLine=lines.map(function(l){ return (l.match(/[A-Za-z]*\d+/g)||[]).map(function(tok){
    tok=tok.toUpperCase(); if(/^T\d+$/.test(tok)) return tok; if(/^\d+$/.test(tok)) return 'T'+tok; return tok;
  }); });
  var ordem=[], parcela=1, i,j;
  function checkRep(tokens,rep){
    if(tokens.length!==ids.length) return 'A repetição '+rep+' tem '+tokens.length+' tratamentos; esperado '+ids.length+'.';
    var seen={}, out=[];
    for(var k=0;k<tokens.length;k++){
      var tid=idSet[tokens[k]];
      if(!tid) return 'Tratamento não reconhecido: '+tokens[k]+'. Use '+ids.join(', ')+'.';
      if(seen[tid]) return 'Tratamento repetido na repetição '+rep+': '+tid+'.';
      seen[tid]=1; out.push(tid);
    }
    for(var m=0;m<ids.length;m++){ if(!seen[ids[m]]) return 'Faltou '+ids[m]+' na repetição '+rep+'.'; }
    return out;
  }
  if(byLine.length===reps && byLine.every(function(a){return a.length>0;})){
    for(i=0;i<reps;i++){
      var lineOk=checkRep(byLine[i],i+1); if(typeof lineOk==='string') return {ok:false,msg:lineOk};
      lineOk.forEach(function(tid){ var tn=ids.indexOf(tid)+1; ordem.push({parcela:parcela++,tratId:tid,tratNum:tn,rep:i+1,repLabel:_repLetter(i+1),campo:_campoCode(tn,i+1)}); });
    }
  }else{
    var flat=[]; byLine.forEach(function(a){ flat=flat.concat(a); });
    if(flat.length!==total) return {ok:false,msg:'A randomização precisa ter '+total+' parcelas ('+ids.length+' tratamentos × '+reps+' repetições).'};
    for(i=0;i<reps;i++){
      var chunk=flat.slice(i*ids.length,(i+1)*ids.length), ok=checkRep(chunk,i+1); if(typeof ok==='string') return {ok:false,msg:ok};
      for(j=0;j<ok.length;j++){ var tn2=ids.indexOf(ok[j])+1; ordem.push({parcela:parcela++,tratId:ok[j],tratNum:tn2,rep:i+1,repLabel:_repLetter(i+1),campo:_campoCode(tn2,i+1)}); }
    }
  }
  return {ok:true,randomizacao:{key:_studyProtocolKey(s),ordem:ordem,geradaEm:todayISO(),manual:true,textoManual:String(text||'').trim()}};
}
function _rzLibCompat(study){
  var key=_studyProtocolKey(study);
  return normalizeRZLib(RZLIB).filter(function(x){return x.key===key;});
}
function _rzLibOptions(study){
  var arr=_rzLibCompat(study);
  if(!arr.length) return '<option value="">Nenhuma salva para este protocolo</option>';
  return arr.map(function(x){ return '<option value="'+esc(x.id)+'">'+esc(x.nome)+' · '+esc(x.key)+'</option>'; }).join('');
}
function _avRowKey(tratId,rep){ return String(tratId)+'R'+String(rep); }
function _avRowsForStudy(st,randomOrder){
  st=normalizeStudy(st);
  var ts=st.tratamentos||[], reps=Math.max(1,parseInt(st.numRepeticoes)||1), byId={}, out=[];
  ts.forEach(function(t){ byId[t.id]=t; });
  if(randomOrder && st.randomizado){
    ensureStudyRandomizacao(st).ordem.forEach(function(p){
      var t=byId[p.tratId]||{id:p.tratId};
      var tratNum=p.tratNum||ts.map(function(x){return x.id;}).indexOf(p.tratId)+1, rep=parseInt(p.rep)||1;
      out.push({key:_avRowKey(p.tratId,rep),tratId:p.tratId,tratNum:tratNum,rep:rep,repLabel:p.repLabel||_repLetter(rep),repDisplay:_repDisplay(rep),campo:p.campo||_campoCode(tratNum,rep),parcela:p.parcela,label:p.campo||_campoCode(tratNum,rep),produto:t.produto||''});
    });
    return out;
  }
  ts.forEach(function(t,i){
    for(var r=1;r<=reps;r++){
      out.push({key:_avRowKey(t.id,r),tratId:t.id,tratNum:i+1,rep:r,repLabel:_repLetter(r),repDisplay:_repDisplay(r),campo:_campoCode(i+1,r),parcela:'',label:t.id+_repDisplay(r),produto:t.produto||''});
    }
  });
  return out;
}
function _avNota(a,row,v){
  var notas=(a&&a.notas)||{}, rr=notas[row.key]||{}, val=rr[v];
  if((val===''||val==null) && row.rep===1 && notas[row.tratId]) val=notas[row.tratId][v]; /* compat. notas antigas por tratamento */
  return val==null?'':val;
}
function _avStudy(){ var q=data[curV]||{}; return (q.estudos||[]).find(function(s){return s.id===curSid;}); }

/* ============ EVENTOS DE UM ESTUDO (para agenda e timeline) ============ */
function _avTemNota(a){ /* avaliação foi REGISTRADA quando tem ao menos uma nota de parcela preenchida */
  if(!a||!a.notas) return false;
  for(var k in a.notas){ var r=a.notas[k]; if(r&&typeof r==='object'){ for(var v in r){ var x=r[v]; if(x!=null&&String(x).trim()!=='') return true; } } }
  return false;
}
function studyEventsV2(study){
  var out=[];
  /* Aplicações programadas (baseado em dataInicio + intervalo) */
  var start=pD(isoToBR(study.dataInicio))||pD(study.dataInicio);
  if(start&&!isNaN(start)){
    var n=Math.max(1,parseInt(study.numAplicacoes)||1);
    var iv=parseInt(study.intervaloDias)||0;
    for(var i=0;i<n;i++){
      var dt=(iv>0)?addDays(start,i*iv):new Date(start);
      /* Verifica se já foi realizada */
      var realizada=(study.aplicacoes||[]).find(function(a){
        var ad=pD(isoToBR(a.data))||pD(a.data);
        return ad&&Math.abs(daysBetween(dt,ad))<=2;
      });
      out.push({
        type:'apl',
        idx:i+1,
        total:n,
        date:dt,
        realizada:!!realizada
      });
    }
  }
  /* Avaliações programadas (as que ainda não foram feitas) */
  (study.avaliacoes||[]).forEach(function(a,i){
    var d=pD(isoToBR(a.data))||pD(a.data);
    if(d&&!isNaN(d)){
      out.push({
        type:'eval',
        idx:i+1,
        date:d,
        tipo:a.tipo||"",
        realizada:(!!a.realizada||_avTemNota(a))  /* registrada (tem nota) => sai do HOJE/agenda automaticamente */
      });
    }
  });
  return out.sort(function(a,b){return a.date-b.date});
}

function nextEventV2(study){
  var evs=studyEventsV2(study);
  var now=today0();
  for(var i=0;i<evs.length;i++){
    var diff=daysBetween(now,evs[i].date);
    if(diff>=-1&&!evs[i].realizada){
      return {ev:evs[i],diff:diff};
    }
  }
  return null;
}

/* ============ RENDER DO PAINEL DE ESTUDO (tela cheia) ============ */

/* ===================== CALCULADORA DE APLICAÇÃO (motor BioCalculo campo, embutida) =====================
   Reusa vendor/biocalc-campo-core.js (window.BioCalculoCampo). Pré-preenche dose/volume dos tratamentos
   do estudo; o usuário ajusta tamanho da parcela / frascos. Sem identidade externa — tela nativa do Agracta. */
var _calcSel=null; /* {qid,sid} estudo selecionado na calculadora */
function _calcNum(v){
  if(typeof v==='number') return isFinite(v)?v:0;
  /* normaliza separador de milhar PT-BR (ponto antes de 3 dígitos seguido de não-dígito/fim) ANTES
     de parsear — senão "1.500 g/ha" virava 1,5 (dose 1000× menor). Mesma regra do import (_protoNum). */
  var s=String(v==null?'':v).replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'');
  var BC=window.BioCalculoCampo;
  return BC?BC.parseNum(s):(parseFloat(s.replace(',','.'))||0);
}
function _calcVal(id){ var el=document.getElementById(id); return el?el.value:''; }
function _calcDoseUnit(raw){
  var u=String(raw||'').toLowerCase();
  if(/m\s*l/.test(u)) return 'mL/ha';            /* mL antes de L */
  if(/k\s*g/.test(u)) return 'kg/ha';            /* kg antes de g */
  if(/(^|[^k])g(\b|ramas|\s*\/)/.test(u)) return 'g/ha';
  return 'L/ha';
}
/* Unidade que o RÓTULO deve mostrar para esta dose, neste estudo.
   Ordem: o que o usuário escreveu na dose > o que o estudo declarou > L/ha.
   Estudo em ppm não tem unidade por área — a dose É a concentração. */
function doseUnidadeDe(study, raw){
  if(study && study.doseModo==='ppm') return 'ppm';
  if(/[a-zA-Z]/.test(String(raw||''))) return _calcDoseUnit(raw);   /* usuário escreveu a unidade */
  var d=study&&study.doseUnidade;
  return (['L/ha','mL/ha','g/ha','kg/ha'].indexOf(d)>=0)?d:'L/ha';
}
/* Dose pronta para impressão: "500 mL/ha". Dose que já vem com unidade sai como
   está. Mistura ("500 + 300") recebe a unidade em CADA componente — rotuloTratamento
   quebra o texto por " + " para casar com cada produto, e uma unidade solta no fim
   ficaria pendurada só no último. */
function doseTextoDe(study, raw){
  var s=String(raw==null?'':raw).trim();
  if(!s) return '';
  var u=doseUnidadeDe(study, s);
  return s.split(/\s\+\s/).map(function(p){
    p=p.trim();
    if(!p || /[a-zA-Z]/.test(p)) return p;
    return p+' '+u;
  }).join(' + ');
}
/* ===== ENSAIO EM FAIXAS: amarrar cada tratamento a uma quadra ===============
   Redesenha a lista sempre que o desenho muda ou um tratamento entra/sai, para
   nunca sobrar faixa apontando para tratamento que não existe mais. */
function _seFaixasRender(){
  var wrap=document.getElementById('seFaixasLista'); if(!wrap) return;
  var s=workingStudy||{}; var trats=(s.tratamentos||[]).filter(function(t){ return t&&t.id; });
  if(!trats.length){ wrap.innerHTML='<div style="font-size:12px;color:#9a8">Cadastre os tratamentos primeiro — cada um vai receber uma faixa.</div>'; return; }
  var porTrat={}; (s.faixas||[]).forEach(function(f){ if(f&&f.tratId) porTrat[f.tratId]=f; });
  var opts=window._seQuadraOpts||[];
  var h='<div style="display:flex;flex-direction:column;gap:6px">';
  trats.forEach(function(t){
    var f=porTrat[t.id]||{};
    h+='<div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">'+
       '<span style="min-width:34px;font-weight:800;font-size:12px">'+esc(t.id)+'</span>'+
       '<span style="flex:1 1 130px;font-size:11px;color:#9fb1a5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(t.produto||'—')+'</span>'+
       '<select data-faixa-q="'+esc(t.id)+'" style="flex:1 1 130px"><option value="">— quadra —</option>'+
         opts.map(function(o){ return '<option value="'+esc(o.id)+'"'+(f.qid===o.id?' selected':'')+'>'+esc(o.nome)+'</option>'; }).join('')+
       '</select>'+
       '<input type="text" data-faixa-a="'+esc(t.id)+'" inputmode="decimal" placeholder="ha" value="'+esc(f.areaHa!=null?String(f.areaHa):'')+'" style="width:74px">'+
       '</div>';
  });
  h+='</div>';
  wrap.innerHTML=h;
}
function _seFaixasLer(){
  if(!workingStudy) return;
  if(workingStudy.desenho!=='faixas'){ workingStudy.faixas=[]; return; }
  var out=[];
  (workingStudy.tratamentos||[]).forEach(function(t){
    if(!t||!t.id) return;
    var sq=document.querySelector('[data-faixa-q="'+t.id+'"]');
    var sa=document.querySelector('[data-faixa-a="'+t.id+'"]');
    var qid=sq?sq.value:'', a=sa?String(sa.value||'').trim():'';
    if(qid || a) out.push({tratId:t.id, qid:qid, areaHa:(a?_numBR(a,null):null)});
  });
  workingStudy.faixas=out;
}
function _seDesenhoSync(){
  var sel=document.getElementById('seDesenho'); if(!sel) return;
  var faixas=(sel.value==='faixas');
  if(workingStudy) workingStudy.desenho=faixas?'faixas':'dbc';
  var w=document.getElementById('seFaixasWrap'); if(w) w.style.display=faixas?'':'none';
  var l=document.getElementById('seRepsLbl');
  if(l) l.textContent=faixas?'Treços por faixa (blocos)':'Repetições por tratamento';
  if(faixas) _seFaixasRender();
}
/* Mostra/esconde a unidade quando o estudo é declarado em ppm. */
function _seDoseModoSync(){
  var m=document.getElementById('seDoseModo'), w=document.getElementById('seDoseUnidWrap');
  if(w) w.style.display=(m && m.value==='ppm')?'none':'';
}
function _calcAllStudies(){
  var out=[]; try{ ensureLocais(); }catch(e){}
  Object.keys(data||{}).forEach(function(qid){
    if(qid==='__config') return;
    ((data[qid]&&data[qid].estudos)||[]).forEach(function(s){
      out.push({qid:qid, sid:s.id, label:quadraNome(qid)+' · '+(s.codigo||s.nome||s.id)+' ('+(((s.tratamentos)||[]).length)+'t)'});
    });
  });
  return out;
}
function _calcCss(){
  if(document.getElementById('calcCss')) return;
  var s=document.createElement('style'); s.id='calcCss';
  s.textContent='.calc-ovl{position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,.6);display:none;align-items:flex-start;justify-content:center;padding:20px 12px;overflow:auto;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}'+
  '.calc-box{width:100%;max-width:560px;background:var(--surface,#101613);border:1px solid var(--border,#26322b);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);padding:16px;color:var(--text,#e8efe9);font-family:var(--font,system-ui)}'+
  '.calc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.calc-title{font-size:16px;font-weight:900}.calc-x{background:none;border:none;color:#9fb1a5;font-size:24px;cursor:pointer;line-height:1}'+
  '.calc-sub{font-size:11px;color:var(--text-2,#9fb1a5);margin:-4px 0 10px}'+
  '.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.calc-f{display:flex;flex-direction:column;gap:3px}.calc-f.full{grid-column:1 / -1}'+
  '.calc-lab{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--text-3,#7c8a80);font-weight:800}'+
  '.calc-inp,.calc-sel{background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);border-radius:9px;color:var(--text,#e8efe9);padding:9px;font-size:14px;outline:none;width:100%;box-sizing:border-box}'+
  '.calc-inp:focus{border-color:#2e7d3e}'+
  '.calc-t{font-size:11px;border-collapse:collapse;width:100%;margin-top:4px}.calc-t th,.calc-t td{padding:6px 5px;border-bottom:1px solid var(--border,#26322b);text-align:right}.calc-t th:first-child,.calc-t td:first-child{text-align:left}.calc-t th{color:var(--text-3,#7c8a80);font-size:10px;text-transform:uppercase;letter-spacing:.4px}'+
  '.calc-tname{color:#9fe0b6;font-weight:700}.calc-terr{color:#ff9a8a;font-size:10px}.calc-empty{color:#8aa88a;font-size:12px;padding:10px 0;text-align:center}'+
  '.calc-card{background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);border-radius:11px;padding:9px 11px;margin-bottom:8px}.calc-cardh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}.calc-kv{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;font-size:11px}.calc-kv span{color:var(--text-2,#9fb1a5)}.calc-kv b{color:var(--text,#e8efe9);font-weight:700}'+
  '.calc-warn{color:#dccd8c;font-size:10px;margin-top:4px}'+
  '.calc-actions{display:flex;gap:8px;margin-top:10px}.calc-actions button{flex:1;border:none;border-radius:10px;padding:10px;font-weight:800;cursor:pointer}.calc-copy{background:#1f5a2a;color:#eafaea}.calc-close{background:#222;color:#bbb}';
  document.head.appendChild(s);
}
function openCalcAplicacao(qid,sid){
  if(!window.BioCalculoCampo){ alert('O motor de cálculo (BioCalculo) não carregou. Recarregue o app.'); return; }
  if(typeof closeMainMenu==='function') closeMainMenu();
  if(qid&&sid) _calcSel={qid:qid,sid:sid};
  else if(typeof curV!=='undefined'&&curV&&typeof curSid!=='undefined'&&curSid) _calcSel={qid:curV,sid:curSid};
  else { var all=_calcAllStudies(); _calcSel=all.length?{qid:all[0].qid,sid:all[0].sid}:null; }
  _calcCss();
  var ov=document.getElementById('calcOvl');
  if(!ov){ ov=document.createElement('div'); ov.id='calcOvl'; ov.className='calc-ovl'; ov.onclick=function(e){ if(e.target===ov) closeCalc(); }; document.body.appendChild(ov); }
  ov.style.display='flex';
  _calcRenderShell();
}
function closeCalc(){ var ov=document.getElementById('calcOvl'); if(ov) ov.style.display='none'; }

/* ========================= NEMATOLOGIA — FILA DE AMOSTRAS =========================
   Aqui não há tratamento nem repetição: o registro é o caminho da amostra dentro
   do laboratório. Um número de estudo traz várias amostras (matriz x momento:
   "solo 15 DAA", "raiz 15 DAA", "solo 30 DAA"...), e cada uma anda por quatro
   marcos, cada um com data:

       entrada  ->  extração  ->  leitura  ->  entrega

   O status NÃO é um campo — é derivado das datas preenchidas. Assim é impossível
   uma amostra estar "entregue" sem data de entrega, que é o erro clássico de
   planilha de fila. Mora em estudo.amostras e sincroniza de graça: _rowEstudo
   joga toda chave desconhecida em `extras`. */
var NEM_ETAPAS=[
  {k:'entrada',  rot:'Entrada',  cor:'#8a948e'},
  {k:'extracao', rot:'Extração', cor:'#2f85c9'},
  {k:'leitura',  rot:'Leitura',  cor:'#c77f1a'},
  {k:'entrega',  rot:'Entrega',  cor:'#1f7a44'}
];
var NEM_MATRIZES=['Solo','Raiz'];
function nemAmostras(est){ if(!est) return []; if(!Array.isArray(est.amostras)) est.amostras=[]; return est.amostras; }
/* Status derivado: a etapa mais avançada que tem data. */
function nemStatus(a){
  a=a||{};
  if(a.entrega)  return {k:'entregue',   rot:'Entregue',        cor:'#1f7a44'};
  if(a.leitura)  return {k:'lida',       rot:'Aguarda entrega', cor:'#c77f1a'};
  if(a.extracao) return {k:'extraida',   rot:'Aguarda leitura', cor:'#2f85c9'};
  if(a.entrada)  return {k:'fila',       rot:'Na fila',         cor:'#8a948e'};
  return {k:'sem-entrada', rot:'Sem entrada', cor:'#d84b43'};
}
function nemResumo(est){
  var c={fila:0,extraida:0,lida:0,entregue:0,'sem-entrada':0};
  nemAmostras(est).forEach(function(a){ c[nemStatus(a).k]++; });
  return c;
}
/* Painel na tela do laboratório: uma linha por estudo, com a barra de progresso
   das amostras. É a resposta para "qual estudo já foi, qual está em andamento". */
function nemPainel(qid){
  var ests=(data[qid]&&data[qid].estudos)||[];
  var h='<div class="nem-wrap"><div class="nem-head"><span class="nem-title">FILA DE AMOSTRAS</span></div>';
  if(!ests.length){
    return h+'<div class="nem-vazio">Nenhum estudo ainda. Crie um estudo abaixo e registre as amostras que chegaram.</div></div>';
  }
  ests.forEach(function(s){
    var am=nemAmostras(s), r=nemResumo(s), tot=am.length;
    var pronto=r.entregue, andando=tot-pronto-r['sem-entrada'];
    var pct=tot?Math.round(100*pronto/tot):0;
    var sit=!tot?'sem amostras':(pronto===tot?'concluído':(andando?'em andamento':'na fila'));
    h+='<div class="nem-est" onclick="openNemAmostras(\''+qid+'\',\''+s.id+'\')">'+
       '<div class="nem-est-top"><span class="nem-est-cod">'+esc(s.codigo||s.nome||s.id)+'</span>'+
       '<span class="nem-est-sit nem-'+(pronto===tot&&tot?'ok':(andando?'go':'wait'))+'">'+sit+'</span></div>'+
       '<div class="nem-bar"><div class="nem-bar-fill" style="width:'+pct+'%"></div></div>'+
       '<div class="nem-est-sub">'+tot+' amostra'+(tot===1?'':'s')+
         (r['sem-entrada']?' · '+r['sem-entrada']+' sem entrada':'')+
         (r.fila?' · '+r.fila+' na fila':'')+
         (r.extraida?' · '+r.extraida+' extraída'+(r.extraida===1?'':'s'):'')+
         (r.lida?' · '+r.lida+' lida'+(r.lida===1?'':'s'):'')+
         (r.entregue?' · '+r.entregue+' entregue'+(r.entregue===1?'':'s'):'')+
       '</div></div>';
  });
  return h+'</div>';
}

var _nemSel=null;
function openNemAmostras(qid,sid){
  _nemSel={qid:qid,sid:sid};
  _calcCss();
  var ov=document.getElementById('nemOvl');
  if(!ov){
    ov=document.createElement('div'); ov.id='nemOvl'; ov.className='calc-ovl';
    ov.onclick=function(e){ if(e.target===ov) closeNemAmostras(); };
    document.body.appendChild(ov);
  }
  ov.style.display='flex';
  _nemRender();
}
function closeNemAmostras(){ var o=document.getElementById('nemOvl'); if(o) o.style.display='none'; }
function _nemEstudo(){
  if(!_nemSel) return null;
  var q=data[_nemSel.qid]||{};
  return (q.estudos||[]).find(function(x){ return x.id===_nemSel.sid; })||null;
}
function _nemSalvar(){
  var est=_nemEstudo(); if(!est) return;
  est._ts=Date.now();
  save();
  try{ if(typeof dbUpsertEstudo==='function') dbUpsertEstudo(_nemSel.qid,est); }catch(e){}
  if(typeof render==='function') render();
}
function _nemRender(){
  var ov=document.getElementById('nemOvl'); if(!ov) return;
  var est=_nemEstudo();
  if(!est){ ov.innerHTML='<div class="calc-box"><div class="calc-top"><div class="calc-title">Amostras</div><button class="calc-x" onclick="closeNemAmostras()">×</button></div><div class="calc-empty">Estudo não encontrado.</div></div>'; return; }
  var am=nemAmostras(est), r=nemResumo(est);
  var h='<div class="calc-box" style="max-width:840px">'+
    '<div class="calc-top"><div class="calc-title">🧫 Amostras · '+esc(est.codigo||est.nome||est.id)+'</div>'+
    '<button class="calc-x" onclick="closeNemAmostras()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">'+am.length+' amostra'+(am.length===1?'':'s')+' · '+
      r.entregue+' entregue'+(r.entregue===1?'':'s')+' · '+(am.length-r.entregue-r['sem-entrada'])+' em andamento</div>';

  h+='<div class="nem-gerar">'+
     '<span class="calc-lab">Registrar chegada</span>'+
     '<div class="nem-gerar-row">'+
       NEM_MATRIZES.map(function(m){ return '<label class="nem-chk"><input type="checkbox" id="nemM'+m+'" checked> '+m+'</label>'; }).join('')+
       '<input id="nemDAA" class="calc-inp" style="flex:1;min-width:140px" placeholder="Momentos em DAA: 15; 30; 45">'+
       '<input id="nemData" type="date" class="calc-inp" style="width:150px" value="'+esc(new Date().toISOString().slice(0,10))+'">'+
       '<button class="nem-add" onclick="nemGerar()">+ Adicionar</button>'+
     '</div>'+
     '<div class="calclab-src">Cruza as matrizes marcadas com os momentos: Solo+Raiz e “15; 30” geram 4 amostras, todas com a data de entrada acima.</div>'+
     '</div>';

  if(!am.length){
    h+='<div class="calc-empty">Nenhuma amostra registrada ainda.</div>';
  }else{
    h+='<div class="nem-tab-wrap"><table class="nem-tab"><thead><tr><th>Amostra</th>'+
       NEM_ETAPAS.map(function(e){ return '<th>'+e.rot+'</th>'; }).join('')+
       '<th>Situação</th><th></th></tr></thead><tbody>';
    am.forEach(function(a,i){
      var st=nemStatus(a);
      h+='<tr><td class="nem-nome"><b>'+esc(a.matriz||'—')+'</b>'+(a.daa!=null&&a.daa!==''?' <span class="nem-daa">'+esc(String(a.daa))+' DAA</span>':'')+'</td>'+
         NEM_ETAPAS.map(function(e){
           return '<td><input type="date" class="nem-dt'+(a[e.k]?' ok':'')+'" value="'+esc(a[e.k]||'')+'" onchange="nemSetData('+i+',\''+e.k+'\',this.value)"></td>';
         }).join('')+
         '<td><span class="nem-chip" style="background:'+st.cor+'1a;border:1px solid '+st.cor+'66;color:'+st.cor+'">'+st.rot+'</span></td>'+
         '<td><button class="nem-del" title="Remover esta amostra" onclick="nemRemover('+i+')">🗑</button></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='<div class="calc-actions"><button class="calc-copy" onclick="nemCopiar()">Copiar lista</button><button class="calc-close" onclick="closeNemAmostras()">Fechar</button></div></div>';
  ov.innerHTML=h;
}
function nemGerar(){
  var est=_nemEstudo(); if(!est) return;
  var matrizes=NEM_MATRIZES.filter(function(m){ var c=document.getElementById('nemM'+m); return c&&c.checked; });
  if(!matrizes.length){ alert('Marque ao menos uma matriz (Solo ou Raiz).'); return; }
  var bruto=String((document.getElementById('nemDAA')||{}).value||'').trim();
  var momentos=bruto?bruto.split(/[;,]/).map(function(x){ return x.trim(); }).filter(function(x){ return x!==''; }):[''];
  var dataEntrada=(document.getElementById('nemData')||{}).value||'';
  var am=nemAmostras(est), criadas=0, repetidas=0;
  matrizes.forEach(function(m){
    momentos.forEach(function(d){
      /* não duplica: mesma matriz + mesmo momento já existente é ignorada */
      var ja=am.some(function(a){ return a.matriz===m && String(a.daa||'')===String(d); });
      if(ja){ repetidas++; return; }
      am.push({id:'am_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
               matriz:m, daa:d, entrada:dataEntrada, extracao:'', leitura:'', entrega:''});
      criadas++;
    });
  });
  _nemSalvar(); _nemRender();
  if(repetidas) alert(criadas+' amostra(s) adicionada(s). '+repetidas+' já existia(m) e ficaram como estavam.');
}
function nemSetData(i,etapa,valor){
  var est=_nemEstudo(); if(!est) return;
  var am=nemAmostras(est), a=am[i]; if(!a) return;
  a[etapa]=valor||'';
  _nemSalvar(); _nemRender();
}
function nemRemover(i){
  var est=_nemEstudo(); if(!est) return;
  var am=nemAmostras(est), a=am[i]; if(!a) return;
  if(!confirm('Remover a amostra '+(a.matriz||'')+' '+(a.daa||'')+' DAA?')) return;
  am.splice(i,1);
  _nemSalvar(); _nemRender();
}
function nemCopiar(){
  var est=_nemEstudo(); if(!est) return;
  var L=[(est.codigo||est.nome||est.id)];
  L.push(['Matriz','DAA'].concat(NEM_ETAPAS.map(function(e){return e.rot;})).concat(['Situação']).join('\t'));
  nemAmostras(est).forEach(function(a){
    L.push([a.matriz||'',a.daa||''].concat(NEM_ETAPAS.map(function(e){ return isoToBR(a[e.k])||''; })).concat([nemStatus(a).rot]).join('\t'));
  });
  try{ navigator.clipboard.writeText(L.join('\n')); }catch(e){}
  var b=document.querySelector('#nemOvl .calc-copy'); if(b){ var o=b.textContent; b.textContent='Copiado'; setTimeout(function(){ b.textContent=o; },1400); }
}

/* ===================== CALCULADORA DE LABORATÓRIO (motor BioCalculo lab) =====================
   Abre no lugar da calculadora de aplicação quando a quadra é do tipo 'lab'.
   Reusa vendor/biocalc-lab-core.js e o CSS .calc-* / .calclab-* — tela nativa
   do Agracta, sem identidade externa. As quatro abas do BioCalculo Laboratório:
     • Do campo  — a dose de campo do tratamento vira a receita do pote (o caminho normal daqui)
     • PPM       — concentração alvo direta, quando o ensaio é definido em ppm
     • Ajuste    — diluir um formulado concentrado (C1V1 = C2V2)
     • Série     — curva de doses, uma linha por concentração
   Os padrões vêm do cadastro do estudo (Preparo no laboratório) e continuam
   editáveis aqui, sem gravar de volta — igual à calculadora de campo. */
var _labSel=null, _labTab='campo';
function _labVal(id){ var el=document.getElementById(id); return el?el.value:''; }
function _labStudy(){
  var sel=_labSel; if(!sel) return null;
  var q=data[sel.qid]||{}; var s=(q.estudos||[]).find(function(x){return x.id===sel.sid;});
  return s?normalizeStudy(s):null;
}
function _labStudies(){
  var out=[]; try{ ensureLocais(); }catch(e){}
  Object.keys(data||{}).forEach(function(qid){
    if(qid==='__config'||!isQuadraLab(qid)) return;
    ((data[qid]&&data[qid].estudos)||[]).forEach(function(s){
      out.push({qid:qid, sid:s.id, label:quadraNome(qid)+' · '+(s.codigo||s.nome||s.id)+' ('+(((s.tratamentos)||[]).length)+'t)'});
    });
  });
  return out;
}
function openCalcLab(qid,sid){
  if(!window.BioCalculoLab){ alert('O motor de cálculo do laboratório não carregou. Recarregue o app.'); return; }
  if(typeof closeMainMenu==='function') closeMainMenu();
  if(qid&&sid) _labSel={qid:qid,sid:sid};
  else if(typeof curV!=='undefined'&&curV&&typeof curSid!=='undefined'&&curSid) _labSel={qid:curV,sid:curSid};
  else { var all=_labStudies(); _labSel=all.length?{qid:all[0].qid,sid:all[0].sid}:null; }
  _calcCss();
  var ov=document.getElementById('calcLabOvl');
  if(!ov){
    ov=document.createElement('div'); ov.id='calcLabOvl'; ov.className='calc-ovl';
    ov.onclick=function(e){ if(e.target===ov) closeCalcLab(); };
    document.body.appendChild(ov);
  }
  ov.style.display='flex';
  _labRenderShell();
}
function closeCalcLab(){ var ov=document.getElementById('calcLabOvl'); if(ov) ov.style.display='none'; }
function _labPick(v){ var p=String(v||'').split('|'); if(p.length===2){ _labSel={qid:p[0],sid:p[1]}; _labRenderShell(); } }
function _labSetTab(t){ _labTab=t; _labRenderShell(); }

/* Padrões do cadastro do estudo (seção "Preparo no laboratório") */
function _labDefs(){
  var s=_labStudy();
  return {
    vol:   s?(_numBR(s.labVolumeMl,50)||50):50,
    fonte: s?(s.labFonteTipo||'gL'):'gL',
    valor: s?(s.labFonteValor||''):'',
    pureza:s?(s.labPureza||''):'',
    dens:  s?(s.labDensidade||''):''
  };
}
function _labFonteSel(id,sel){
  var F=window.BioCalculoLab.FONTES;
  return '<select id="'+id+'" class="calc-sel" onchange="_labCompute()">'+
    ['gL','gkg','mae','puro'].map(function(k){
      return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+esc(F[k].rotulo)+'</option>';
    }).join('')+'</select>';
}
function _labRenderShell(){
  var ov=document.getElementById('calcLabOvl'); if(!ov) return;
  var all=_labStudies(), d=_labDefs(), s=_labStudy();
  var selHtml='';
  if(all.length>1){
    selHtml='<div class="calc-f full"><span class="calc-lab">Estudo</span><select id="labStudy" class="calc-sel" onchange="_labPick(this.value)">'+
      all.map(function(o){ return '<option value="'+esc(o.qid+'|'+o.sid)+'"'+((_labSel&&_labSel.qid===o.qid&&_labSel.sid===o.sid)?' selected':'')+'>'+esc(o.label)+'</option>'; }).join('')+'</select></div>';
  }
  /* A receita do ensaio é UMA, e quem decide qual é o cadastro do estudo (dose de
     campo ou ppm) — não um menu que precisa ser acertado toda vez. "Série" saiu:
     os tratamentos do estudo já SÃO a curva de doses, e a aba fazia o usuário
     redigitar à mão o que já estava cadastrado. Sobra o ajuste de i.a., que é
     outra coisa: preparo de tanque, não tem a ver com os tratamentos deste estudo. */
  var _modo=(s&&s.doseModo==='ppm')?'ppm':'campo';
  if(_labTab!=='ia') _labTab=_modo;
  var T=[[_modo, _modo==='ppm'?'Receita do ensaio (ppm)':'Receita do ensaio (dose de campo)'],
         ['ia','Ajuste de i.a.']];
  var tabs='<div class="calclab-tabs">'+T.map(function(t){
    return '<button class="calclab-tab'+(_labTab===t[0]?' on':'')+'" onclick="_labSetTab(\''+t[0]+'\')">'+t[1]+'</button>';
  }).join('')+'</div>';

  var campos='';
  if(_labTab==='campo'){
    campos='<div class="calclab-src">Cada tratamento do estudo vira a receita do pote. A dose e a vazão vêm do cadastro; ajuste aqui se precisar.</div>'+
      '<div class="calc-grid">'+
      '<div class="calc-f"><span class="calc-lab">Volume do pote (mL)</span><input id="labVol" class="calc-inp" inputmode="decimal" value="'+esc(String(d.vol))+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Vazão padrão (L/ha)</span><input id="labVazao" class="calc-inp" inputmode="decimal" value="'+esc(String(_labVazaoDefault()))+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Pureza (%)</span><input id="labPureza" class="calc-inp" inputmode="decimal" placeholder="100" value="'+esc(d.pureza)+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Densidade (g/mL)</span><input id="labDens" class="calc-inp" inputmode="decimal" placeholder="1,00" value="'+esc(d.dens)+'" oninput="_labCompute()"></div>'+
      '</div>';
  } else if(_labTab==='ppm'){
    campos='<div class="calclab-src">Cada tratamento do estudo vira a receita do pote — a dose cadastrada É a concentração alvo em ppm. Os tratamentos já são a curva de doses.</div>'+
      '<div class="calc-grid">'+
      '<div class="calc-f"><span class="calc-lab">Volume do pote (mL)</span><input id="labPpmVol" class="calc-inp" inputmode="decimal" value="'+esc(String(d.vol))+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f full"><span class="calc-lab">Fonte do produto</span>'+_labFonteSel('labPpmFonte',d.fonte)+'</div>'+
      '<div class="calc-f"><span class="calc-lab">Valor da fonte</span><input id="labPpmValor" class="calc-inp" inputmode="decimal" placeholder="340" value="'+esc(d.valor)+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Pureza (%)</span><input id="labPpmPureza" class="calc-inp" inputmode="decimal" placeholder="100" value="'+esc(d.pureza)+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Densidade (g/mL)</span><input id="labPpmDens" class="calc-inp" inputmode="decimal" placeholder="1,00" value="'+esc(d.dens)+'" oninput="_labCompute()"></div>'+
      '</div>';
  } else if(_labTab==='ia'){
    campos='<div class="calclab-src">Diluir um formulado concentrado até uma concentração menor (C1·V1 = C2·V2).</div>'+
      '<div class="calc-grid">'+
      '<div class="calc-f"><span class="calc-lab">Conc. atual</span><input id="labIaOrig" class="calc-inp" inputmode="decimal" value="650" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Unidade</span>'+_labUnidSel('labIaOrigU','g/L')+'</div>'+
      '<div class="calc-f"><span class="calc-lab">Conc. desejada</span><input id="labIaAlvo" class="calc-inp" inputmode="decimal" value="400" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Unidade</span>'+_labUnidSel('labIaAlvoU','g/L')+'</div>'+
      '<div class="calc-f"><span class="calc-lab">Volume final</span><input id="labIaVol" class="calc-inp" inputmode="decimal" value="'+esc(String(d.vol))+'" oninput="_labCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Unidade</span><select id="labIaVolU" class="calc-sel" onchange="_labCompute()"><option>mL</option><option>L</option></select></div>'+
      '<div class="calc-f full"><span class="calc-lab">Densidade (g/mL) — obrigatória para g/kg</span><input id="labIaDens" class="calc-inp" inputmode="decimal" placeholder="1,00" value="'+esc(d.dens)+'" oninput="_labCompute()"></div>'+
      '</div>';
  }

  ov.innerHTML='<div class="calc-box">'+
    '<div class="calc-top"><div class="calc-title">🧪 Calculadora de laboratório</div><button class="calc-x" onclick="closeCalcLab()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">'+esc(s?((s.codigo||s.nome||s.id)+(s.tipoEstudo?' · '+s.tipoEstudo:'')):'Nenhum estudo de laboratório cadastrado')+'</div>'+
    (selHtml?'<div class="calc-grid">'+selHtml+'</div>':'')+
    tabs+campos+
    '<div id="labOut" class="calclab-out">—</div>'+
    '<div class="calc-actions"><button class="calc-copy" onclick="_labCopiar()">Copiar</button><button class="calc-close" onclick="closeCalcLab()">Fechar</button></div>'+
    '</div>';
  _labCompute();
}
function _labUnidSel(id,sel){
  return '<select id="'+id+'" class="calc-sel" onchange="_labCompute()">'+
    ['g/L','mg/mL','g/kg','%','ppm'].map(function(u){ return '<option'+(u===sel?' selected':'')+'>'+u+'</option>'; }).join('')+'</select>';
}
/* Vazão padrão: a do protocolo; senão a do 1º tratamento que tenha uma. */
function _labVazaoDefault(){
  var s=_labStudy(); if(!s) return 100;
  var pv=_calcNum((s.protocolo||{}).volumeCalda); if(pv>0) return pv;
  var t=(s.tratamentos||[]).map(function(x){return _calcNum(x.volume);}).filter(function(n){return n>0;});
  return t.length?t[0]:100;
}
/* Texto do último cálculo, para o botão Copiar */
var _labTexto='';
function _labCopiar(){
  if(!_labTexto) return;
  try{ navigator.clipboard.writeText(_labTexto); }catch(e){}
  var b=document.querySelector('#calcLabOvl .calc-copy'); if(b){ var o=b.textContent; b.textContent='Copiado'; setTimeout(function(){ b.textContent=o; },1400); }
}
function _labAvisosHtml(r){
  var h='';
  (r.avisos||[]).forEach(function(a){ h+='<div class="calclab-av '+esc(a.nivel)+'">'+esc(a.msg)+'</div>'; });
  if(r.sugestaoMae) h+='<div class="calclab-av saida">'+esc(r.sugestaoMae.msg)+'</div>';
  return h;
}
function _labCompute(){
  var box=document.getElementById('labOut'); if(!box) return;
  var LB=window.BioCalculoLab, s=_labStudy();
  var F=function(v){ return LB.fmtVivo(v); };
  _labTexto='';
  try{
    /* Receita do ensaio: um cartão por tratamento, em dose de campo ou em ppm.
       É o mesmo laço nos dois casos — só muda a função do núcleo e o que o
       cabeçalho do cartão anuncia. */
    if(_labTab==='campo' || _labTab==='ppm'){
      if(!s||!(s.tratamentos||[]).length){ box.innerHTML='<span style="color:#8aa88a">Estudo sem tratamentos cadastrados.</span>'; return; }
      var _ppm=(_labTab==='ppm');
      var vol=_calcNum(_labVal(_ppm?'labPpmVol':'labVol'));
      var vazaoDef=_ppm?0:_calcNum(_labVal('labVazao'));
      var pur=_labVal(_ppm?'labPpmPureza':'labPureza'), den=_labVal(_ppm?'labPpmDens':'labDens');
      var fTipo=_ppm?_labVal('labPpmFonte'):'', fValor=_ppm?_labVal('labPpmValor'):'';
      var html='', txt=[];
      (s.tratamentos||[]).forEach(function(t){
        var dose=_calcNum(t.dose);
        var vazao=_ppm?0:(_calcNum(t.volume)||vazaoDef);
        var sub=_ppm ? ((t.dose||'—')+' ppm') : ((t.dose||'—')+' · '+F(vazao)+' L/ha');
        var head='<div class="calc-cardh"><span class="calc-tname">'+esc(t.id)+(t.produto?' · '+esc(t.produto):'')+(t.testemunha?' <span style="color:#dccd8c">(test.)</span>':'')+'</span>'+
                 '<span style="font-size:10px;color:#9fb1a5">'+esc(sub)+'</span></div>';
        if(t.testemunha||!(dose>0)){
          html+='<div class="calc-card">'+head+'<div class="calc-kv"><span>Preparo</span><b>só solvente — '+F(vol)+' mL</b></div></div>';
          txt.push(t.id+': só solvente, '+F(vol)+' mL'); return;
        }
        var r=null, err='';
        try{
          r=_ppm
            ? LB.calcPPM({alvoPpm:dose, volumeMl:vol, fonteTipo:fTipo, fonteValor:fValor, pureza:pur, densidade:den})
            : LB.calcCampo({dose:dose, unidade:_calcDoseUnit(t.dose), vazao:vazao, volumeMl:vol, pureza:pur, densidade:den});
        }
        catch(e){ err=e.message||String(e); }
        if(err){ html+='<div class="calc-card">'+head+'<div class="calc-terr">⚠ '+esc(err)+'</div></div>'; return; }
        var passo=(r.acao==='pesar')
          ? '<div class="calc-kv"><span>Pesar</span><b>'+F(r.massaMg)+' mg</b><span>Completar até</span><b>'+F(r.volumeMl||vol)+' mL</b></div>'
          : '<div class="calc-kv"><span>Pipetar</span><b>'+F(r.produtoUl)+' µL</b><span>Solvente</span><b>'+F(r.solventeMl)+' mL</b></div>';
        var conc=_ppm
          ? '<div class="calc-kv" style="margin-top:3px"><span>Alvo</span><b>'+F(r.alvoPpm)+' ppm</b><span>Fonte</span><b>'+esc(r.fonteRotulo||'')+'</b></div>'
          : '<div class="calc-kv" style="margin-top:3px"><span>Concentração</span><b>'+F(r.concentracaoPct)+' % '+r.concentracaoBase+'</b><span>≈ ppm</span><b>'+F(r.concentracaoPpm)+'</b></div>';
        html+='<div class="calc-card">'+head+passo+conc+_labAvisosHtml(r)+'</div>';
        txt.push(LB.formatar(r,{titulo:t.id+(t.produto?' · '+t.produto:'')}));
      });
      box.innerHTML=html; _labTexto=txt.join('\n\n');
      return;
    }
    /* Ajuste de i.a.: ferramenta avulsa (preparo de tanque). Não olha os
       tratamentos do estudo — por isso ficou separada da receita. */
    var r2=LB.calcAjusteIA({origemValor:_labVal('labIaOrig'), origemUnid:_labVal('labIaOrigU'),
      alvoValor:_labVal('labIaAlvo'), alvoUnid:_labVal('labIaAlvoU'),
      volumeFinal:_labVal('labIaVol'), volumeUnid:_labVal('labIaVolU'), densidade:_labVal('labIaDens')});
    _labTexto=LB.formatar(r2,{titulo:s?(s.codigo||s.nome||s.id):''});
    box.innerHTML='<div style="white-space:pre-wrap">'+esc(_labTexto)+'</div>'+_labAvisosHtml(r2);
  }catch(e){
    box.innerHTML='<span style="color:#ff9a8a">⚠ '+esc(e.message||String(e))+'</span>';
  }
}
function _calcStudy(){
  var sel=_calcSel; if(!sel) return null;
  var q=data[sel.qid]||{}; var s=(q.estudos||[]).find(function(x){return x.id===sel.sid;});
  return s?normalizeStudy(s):null;
}
/* Tamanho de parcela da calculadora: preferência salva pelo usuário (padrão 10×5 m). */
function _calcParcelaDefault(){
  var p=null; try{ p=_parseParcelaDim(localStorage.getItem('iracema-calc-parcela')); }catch(e){}
  return p || {comprimento:5, largura:3}; /* padrão 3×5 m (15 m²) — o mais usado; protocolo e valor salvo sobrepõem */
}
function _calcSalvarParcela(){
  try{ var l=_calcNum(_calcVal('calcLen')), w=_calcNum(_calcVal('calcWid')); if(l>0&&w>0) localStorage.setItem('iracema-calc-parcela', l+'x'+w); }catch(e){}
}
function _calcRenderShell(){
  var ov=document.getElementById('calcOvl'); if(!ov) return;
  var all=_calcAllStudies();
  var study=_calcStudy();
  /* parcela: PREFERE o tamanho do protocolo do estudo (modelo.xls); senão o salvo pelo usuário
     (padrão 10×5). O campo continua editável e o que ficar é salvo p/ a próxima. */
  var protoParc=study?_parseParcelaDim((study.protocolo||{}).tamanhoParcela):null;
  var dims=protoParc||_calcParcelaDefault();
  var fromProto=!!protoParc;
  var defLen=dims.comprimento, defWid=dims.largura;
  var defReps=study?Math.max(1,parseInt(study.numRepeticoes)||1):4;
  /* volume padrão: 1º do tratamento; senão do volume de calda do protocolo */
  var defVol='', volsVariam=false; if(study){
    /* volume PADRÃO (fallback): nível do protocolo; senão, só se TODOS os tratamentos tiverem o
       mesmo volume. Se variam (ex.: 10/50/150 no mesmo protocolo), deixa em branco — cada
       tratamento já usa o SEU próprio volume no cálculo (_calcCompute lê t.volume). */
    var pv=_calcNum((study.protocolo||{}).volumeCalda);
    var tvs=(study.tratamentos||[]).map(function(t){return _calcNum(t.volume);}).filter(function(n){return n>0;});
    var uniforme=tvs.length>0 && tvs.every(function(n){return n===tvs[0];});
    volsVariam = tvs.length>1 && !uniforme;
    defVol = (pv>0)?pv : (uniforme?tvs[0]:'');
  }
  /* preparo de calda: vem do cadastro do estudo (editável aqui, sem gravar de volta) */
  var defDead=study?Math.max(0,_numBR(study.volumeMorto,0)):0;
  var defBottles=study?Math.max(1,Math.round(_numBR(study.numFrascos,1))||1):1;
  var defCap=study?Math.max(0,_numBR(study.capacidadeFrasco,0)):0;
  var selHtml='';
  if(all.length>1){
    selHtml='<div class="calc-f full"><span class="calc-lab">Estudo</span><select id="calcStudy" class="calc-sel" onchange="_calcPick(this.value)">'+
      all.map(function(o){ return '<option value="'+esc(o.qid+'|'+o.sid)+'"'+((_calcSel&&_calcSel.qid===o.qid&&_calcSel.sid===o.sid)?' selected':'')+'>'+esc(o.label)+'</option>'; }).join('')+'</select></div>';
  }
  var refTxt = fromProto ? ('✓ Parcela do protocolo: '+dims.comprimento+'×'+dims.largura+' m'+(defVol?(' · volume '+defVol+' L/ha'):'')+' — confira e ajuste se preciso')
    : (dims? ('Parcela salva ~'+Math.round(dims.comprimento)+'×'+Math.round(dims.largura)+' m — ajuste para o tamanho da PARCELA') : 'Informe o tamanho da parcela');
  if(volsVariam) refTxt += ' · ⚠ volumes diferentes por tratamento — cada um usa o SEU (o campo padrão é só p/ quem não tiver)';
  if(defDead>0||defBottles>1||defCap>0) refTxt += ' · preparo de calda vindo do cadastro do estudo';
  ov.innerHTML='<div class="calc-box">'+
    '<div class="calc-top"><div class="calc-title">🧪 Calculadora de aplicação</div><button class="calc-x" onclick="closeCalc()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">'+(study?esc((study.codigo||study.nome||study.id)+' · '+(_calcSel?quadraNome(_calcSel.qid):'')):'Nenhum estudo com tratamentos')+'</div>'+
    '<div class="calc-grid">'+
      selHtml+
      '<div class="calc-f"><span class="calc-lab">Comprimento da parcela (m)</span><input id="calcLen" class="calc-inp" type="number" step="0.1" value="'+defLen+'" oninput="_calcCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Largura da parcela (m)</span><input id="calcWid" class="calc-inp" type="number" step="0.1" value="'+defWid+'" oninput="_calcCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Nº de parcelas / tratamento</span><input id="calcPlots" class="calc-inp" type="number" step="1" value="'+defReps+'" oninput="_calcCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Volume de calda padrão (L/ha)</span><input id="calcVol" class="calc-inp" type="number" step="1" value="'+defVol+'" placeholder="se o trat. não tiver" oninput="_calcCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Volume morto (mL)</span><input id="calcDead" class="calc-inp" type="number" step="1" value="'+defDead+'" oninput="_calcCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Nº de frascos / preparo</span><input id="calcBottles" class="calc-inp" type="number" step="1" value="'+defBottles+'" oninput="_calcCompute()"></div>'+
      '<div class="calc-f"><span class="calc-lab">Capacidade do frasco (L)</span><input id="calcCap" class="calc-inp" type="number" step="0.1" value="'+defCap+'" placeholder="0 = ignorar" oninput="_calcCompute()"></div>'+
    '</div>'+
    '<div class="calc-sub">'+esc(refTxt)+'</div>'+
    '<div id="calcResults"></div>'+
    '<div class="calc-actions"><button class="calc-copy" onclick="_calcCopy()">📋 Copiar</button><button class="calc-close" onclick="closeCalc()">Fechar</button></div>'+
  '</div>';
  _calcCompute();
}
function _calcPick(v){ var p=String(v||'').split('|'); if(p.length===2){ _calcSel={qid:p[0],sid:p[1]}; _calcRenderShell(); } }
function _calcCompute(){
  var box=document.getElementById('calcResults'); if(!box) return;
  var study=_calcStudy();
  if(!study||!(study.tratamentos||[]).length){ box.innerHTML='<div class="calc-empty">Estudo sem tratamentos cadastrados.</div>'; return; }
  var BC=window.BioCalculoCampo;
  var len=_calcNum(_calcVal('calcLen')), wid=_calcNum(_calcVal('calcWid'));
  _calcSalvarParcela(); /* persiste o tamanho de parcela que o usuário deixar */
  var plots=Math.max(1,Math.round(_calcNum(_calcVal('calcPlots')))||1);
  var volDef=_calcNum(_calcVal('calcVol'));
  var dead=_calcNum(_calcVal('calcDead'));
  var bottles=Math.max(1,Math.round(_calcNum(_calcVal('calcBottles')))||1);
  var cap=_calcNum(_calcVal('calcCap'));
  function f(v,p){ return BC.formatBR(v,p==null?2:p); }
  var html='';
  (study.tratamentos||[]).forEach(function(t){
    var dunit=_calcDoseUnit(t.dose), dval=_calcNum(t.dose);
    var vol=t.volume?_calcNum(t.volume):volDef;
    var head='<div class="calc-cardh"><span class="calc-tname">'+esc(t.id)+(t.produto?' · '+esc(t.produto):'')+(t.testemunha?' <span style="color:#dccd8c">(test.)</span>':'')+'</span><span style="font-size:10px;color:#9fb1a5">'+esc((t.dose||'—')+(vol?(' · '+f(vol,0)+' L/ha'):''))+'</span></div>';
    var res=null, err='';
    try{ res=BC.calculateTreatment({doseHa:dval, doseUnit:dunit, sprayVolume:vol, plotLength:len, plotWidth:wid, numPlots:plots, numBottles:bottles, deadVolumeMl:dead, bottleCapacity:cap}); }
    catch(e){ err=e.message||String(e); }
    html+='<div class="calc-card">'+head;
    if(err){ html+='<div class="calc-terr">⚠ '+esc(err)+'</div></div>'; return; }
    html+='<div class="calc-kv">'+
      '<span>Produto / parcela</span><b>'+f(res.productPerPlot)+' '+res.productUnit+'</b>'+
      '<span>Calda / parcela</span><b>'+f(res.sprayPerPlotMl/1000)+' L</b>'+
      '<span>Produto total</span><b>'+f(res.productTotal)+' '+res.productUnit+'</b>'+
      '<span>Calda total</span><b>'+f(res.sprayTotalMl/1000)+' L</b>'+
      '<span>Concentração</span><b>'+f(res.concentration)+' '+res.concentrationUnit+'</b>'+
      '<span>Produto / frasco</span><b>'+f(res.productPerBottle)+' '+res.productUnit+'</b>'+
    '</div>';
    if(cap>0 && !res.bottleCapacityOk) html+='<div class="calc-warn">⚠ Calda total não cabe em '+bottles+' frasco(s) de '+f(cap,1)+' L — mínimo '+res.minBottles+'.</div>';
    html+='</div>';
  });
  box.innerHTML=html||'<div class="calc-empty">—</div>';
}
function _calcCopy(){
  var study=_calcStudy(); if(!study) return;
  var BC=window.BioCalculoCampo;
  var len=_calcNum(_calcVal('calcLen')), wid=_calcNum(_calcVal('calcWid')), plots=Math.max(1,Math.round(_calcNum(_calcVal('calcPlots')))||1);
  var volDef=_calcNum(_calcVal('calcVol')), dead=_calcNum(_calcVal('calcDead')), bottles=Math.max(1,Math.round(_calcNum(_calcVal('calcBottles')))||1), cap=_calcNum(_calcVal('calcCap'));
  function f(v,p){ return BC.formatBR(v,p==null?2:p); }
  var L=['CALCULADORA DE APLICAÇÃO — '+(study.codigo||study.nome||study.id),
    'Parcela '+f(len,1)+'×'+f(wid,1)+' m · '+plots+' parcela(s)/trat · vol. morto '+f(dead,0)+' mL'+(cap>0?(' · frasco '+f(cap,1)+' L'):''),
    'Trat\tProduto\tDose\tProd/parc\tCalda/parc(L)\tProd total\tCalda total(L)'];
  (study.tratamentos||[]).forEach(function(t){
    var dunit=_calcDoseUnit(t.dose), dval=_calcNum(t.dose), vol=t.volume?_calcNum(t.volume):volDef, r;
    try{ r=BC.calculateTreatment({doseHa:dval,doseUnit:dunit,sprayVolume:vol,plotLength:len,plotWidth:wid,numPlots:plots,numBottles:bottles,deadVolumeMl:dead,bottleCapacity:cap}); }catch(e){ L.push((t.id||'')+'\t'+(t.produto||'')+'\t'+(t.dose||'')+'\t(erro)'); return; }
    L.push((t.id||'')+'\t'+(t.produto||'')+'\t'+(t.dose||'')+'\t'+f(r.productPerPlot)+' '+r.productUnit+'\t'+f(r.sprayPerPlotMl/1000)+'\t'+f(r.productTotal)+' '+r.productUnit+'\t'+f(r.sprayTotalMl/1000));
  });
  var txt=L.join('\n');
  if(typeof _stxCopy==='function'){ _stxCopy(txt).then(function(ok){ if(typeof _stxToast==='function') _stxToast(ok?'✓ Copiado':'Não consegui copiar'); }); }
  else { try{ navigator.clipboard.writeText(txt); alert('Copiado.'); }catch(e){ alert(txt); } }
}

/* ===================== ANÁLISE ESTATÍSTICA (BioEstat embutido em estatistica/) =====================
   Monta a matriz longa (Tratamento/Repeticao/Variavel/Valor + contexto) da avaliação do estudo,
   passa via localStorage e abre o BioEstat num iframe. Modo 'analise' (Geral) ou 'forense'. */
function _bioestatAoa(qid, study){
  var q=data[qid]||{};
  var loc=(typeof LOCAIS!=='undefined' && typeof QLOCAL!=='undefined' && LOCAIS[QLOCAL[qid]])||{};
  var locNome=loc.nome||'';
  var qn=(typeof quadraNome==='function')?quadraNome(qid):qid;
  var reps=Math.max(1,parseInt(study.numRepeticoes)||1);
  var trats=study.tratamentos||[];
  var header=['Local','Quadra','Cultura','Estudo','Data_avaliacao','Tipo','BBCH','Tratamento','Repeticao','Produto','Variavel','Valor'];
  var rows=[header];
  (study.avaliacoes||[]).forEach(function(a){
    (a.variaveis||[]).forEach(function(v){
      trats.forEach(function(t){
        for(var r=1;r<=reps;r++){
          var val=_avNota(a,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},v);
          if(val==null||String(val).trim()==='') continue;
          rows.push([locNome, qn, (q.cultura||''), (study.codigo||study.nome||study.id), (isoToBR(a.data)||a.data||''), (a.tipo||''), (a.bbch||''), t.id, r, (t.produto||''), v, val]);
        }
      });
    });
  });
  return rows;
}
function openBioestat(qid, sid, modo){
  var q=data[qid]||{}, s=(q.estudos||[]).find(function(x){return x.id===sid;});
  if(!s){ alert('Estudo não encontrado.'); return; }
  s=(typeof normalizeStudy==='function')?normalizeStudy(s):s;
  var aoa=_bioestatAoa(qid, s);
  if(aoa.length<2){ alert('Esta avaliação ainda não tem valores preenchidos para analisar.'); return; }
  var resp=''; try{ resp=(typeof _currentUserName==='function'?_currentUserName():'')||(typeof _authUser!=='undefined'&&_authUser&&_authUser.email)||''; }catch(e){}
  var tipo=''; (s.avaliacoes||[]).some(function(a){ if(a.tipo){ tipo=a.tipo; return true; } return false; });
  var doseUnit=''; try{ var t0=(s.tratamentos||[]).find(function(t){return t.dose;}); if(t0 && typeof _calcDoseUnit==='function') doseUnit=_calcDoseUnit(t0.dose); }catch(e){}
  var loc=(typeof LOCAIS!=='undefined'&&typeof QLOCAL!=='undefined'&&LOCAIS[QLOCAL[qid]])||{};
  var payload={ aoa:aoa, modo:(modo||'analise'), titulo:(s.codigo||s.nome||s.id),
    responsavel:resp, tipo:tipo, doseUnit:doseUnit, local:(loc.nome||''),
    quadra:(typeof quadraNome==='function'?quadraNome(qid):qid) };
  try{ localStorage.setItem('agracta-bioestat-handoff', JSON.stringify(payload)); }
  catch(e){ alert('Não consegui preparar os dados para a análise.'); return; }
  _openBioestatFrame(modo);
}
/* =================== GRÁFICOS DO ESTUDO — prancha de resultados ===================
   Monta a folha de figuras a partir das avaliações reais. Com duas ou mais
   avaliações a análise sai sobre a AACPD; com uma só não há área sob a curva e
   ela recai sobre a severidade daquela data. Exige a grade completa (todo
   tratamento x bloco x avaliação preenchido). Quando falta
   algo, diz o que falta em vez de desenhar um gráfico pela metade. */
/* Variáveis (alvos) que têm ao menos UMA nota lançada — variável declarada e vazia
   só enche o menu e sempre falhou na hora de montar a folha. */
function _pranchaVariaveis(s){
  var c={};
  (s.avaliacoes||[]).forEach(function(a){
    var notas=a.notas||{};
    (a.variaveis||[]).forEach(function(v){
      var tem=false;
      for(var k in notas){ var r=notas[k]; if(r&&r[v]!=null&&String(r[v]).trim()!==''){ tem=true; break; } }
      if(tem) c[v]=(c[v]||0)+1;
    });
  });
  return Object.keys(c).sort(function(x,y){ return c[y]-c[x]; });
}
/* Data-base do DAA. Antes exigia aplicação registrada ou início programado e, sem
   isso, a prancha inteira morria — mesmo com avaliações datadas. Agora cai para a
   1ª avaliação e diz de onde veio, pra o rótulo não mentir "dias após a aplicação". */
function _pranchaBase(s){
  var base=null;
  (s.aplicacoes||[]).forEach(function(a){ var d=pD(isoToBR(a.data))||pD(a.data); if(d && (!base || d<base)) base=d; });
  if(base) return {data:base, fonte:'aplicacao'};
  base=pD(isoToBR(s.dataInicio))||pD(s.dataInicio);
  if(base) return {data:base, fonte:'inicio'};
  (s.avaliacoes||[]).forEach(function(a){ var d=pD(isoToBR(a.data))||pD(a.data); if(d && (!base || d<base)) base=d; });
  return base?{data:base, fonte:'avaliacao'}:{data:null, fonte:''};
}
/* Datas utilizáveis de uma variável.
   Duas teimosias antigas viravam "não dá pra gerar":
     - avaliação no dia da aplicação (DAA 0) era descartada junto com a pré-aplicação;
     - UMA célula vazia em UMA data bloqueava a folha inteira.
   Agora a pré-aplicação (DAA<0) continua fora (é linha de base, não resultado), o DAA 0
   entra quando não há nada depois, e a data incompleta é DESCARTADA com aviso — só falha
   quando não sobra nenhuma data com a grade cheia. */
function _pranchaDatas(s, variavel, trats, reps, base){
  var todas=[];
  (s.avaliacoes||[]).forEach(function(a){
    var d=pD(isoToBR(a.data))||pD(a.data); if(!d||isNaN(d)) return;
    if((a.variaveis||[]).indexOf(variavel)<0) return;
    var daa=(base?daysBetween(base,d):0);
    todas.push({ av:a, daa:daa, data:d, mom:avMomento(a, daa) });
  });
  /* Ordena pelo MOMENTO, não pela data: quatro leituras do mesmo dia (1, 2, 4 e
     24 HAT) têm a mesma data e só o momento as separa. */
  todas.sort(function(x,y){ return (x.mom.dias-y.mom.dias) || (x.data-y.data); });
  var pos=todas.filter(function(x){ return x.mom.dias>0; });
  var usadas = pos.length ? pos : todas.filter(function(x){ return x.mom.dias>=0; });
  if(!usadas.length) usadas=todas;
  /* Deduplica pela CHAVE do momento. Antes era pelo DAA inteiro, e uma sequência
     de knockdown 1h/2h/4h/24h caía toda em DAA 0: as três primeiras sumiam da
     folha em silêncio. Com HAT declarado cada uma tem chave própria; sem HAT
     declarado a chave continua sendo o DAA, exatamente como era. */
  var vistos={}, unicas=[];
  usadas.forEach(function(x){ if(!vistos[x.mom.chave]){ vistos[x.mom.chave]=1; unicas.push(x); } });
  var completas=[], parciais=[];
  unicas.forEach(function(x){
    var faltam=0;
    trats.forEach(function(t){ for(var r=1;r<=reps;r++){
      var raw=_avNota(x.av,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},variavel);
      if(isNaN(parseFloat(String(raw==null?'':raw).replace(',','.')))) faltam++;
    } });
    x.faltam=faltam;
    (faltam?parciais:completas).push(x);
  });
  /* Dado degenerado: doença que não ocorreu (tudo zero) ou nota igual em todo mundo. A ANOVA
     divide por zero (QMerro=0 -> F e CV viram NaN), o Abbott divide pela testemunha zerada e
     as barras saem sem escala — a folha abria EM BRANCO. Melhor não oferecer e dizer por quê. */
  var vals=[];
  completas.forEach(function(x){ trats.forEach(function(t){ for(var r=1;r<=reps;r++){
    var vv=parseFloat(String(_avNota(x.av,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},variavel)||'').replace(',','.'));
    if(isFinite(vv)) vals.push(vv);
  } }); });
  var mx=vals.length?Math.max.apply(null,vals):0, mn=vals.length?Math.min.apply(null,vals):0;
  var degenerado = completas.length ? (mx===mn ? (mx===0?'zero':'iguais') : '') : '';
  return {usadas:completas, parciais:parciais, candidatas:unicas.length, comData:todas.length,
          descartadasPreAplicacao:(pos.length?todas.length-pos.length:0), degenerado:degenerado};
}
/* Situação de cada variável (alvo) do estudo: o que dá pra gerar e, quando não dá, por quê. */
function _pranchaDiag(qid, sid){
  var q=data[qid]||{}, s=(q.estudos||[]).find(function(x){ return x && x.id===sid; });
  if(!s) return [];
  s=normalizeStudy(s);
  var trats=(s.tratamentos||[]).filter(function(t){ return t && t.id; });
  var reps=Math.max(1, parseInt(s.numRepeticoes)||1);
  var base=_pranchaBase(s);
  return _pranchaVariaveis(s).map(function(v){
    var o={variavel:v, datas:0, parciais:0, ok:false, motivo:''};
    if(trats.length<2){ o.motivo='precisa de ao menos 2 tratamentos'; return o; }
    if(reps<2){ o.motivo='precisa de ao menos 2 repetições'; return o; }
    var dd=_pranchaDatas(s, v, trats, reps, base.data);
    o.datas=dd.usadas.length; o.parciais=dd.parciais.length;
    if(!dd.usadas.length){
      o.motivo = dd.parciais.length
        ? ('grade incompleta em '+dd.parciais.length+' data(s) — faltam '+dd.parciais.map(function(x){return x.faltam;}).reduce(function(a,b){return a+b;},0)+' notas')
        : 'sem avaliação com data utilizável';
      return o;
    }
    if(dd.degenerado){
      o.motivo = (dd.degenerado==='zero')
        ? 'sem ocorrência — todas as notas são zero, não há o que plotar'
        : 'sem variação — a nota é igual em todas as parcelas';
      return o;
    }
    o.ok=true;
    return o;
  });
}
function _pranchaPayload(qid, sid, variavel){
  var q=data[qid]||{}, s=(q.estudos||[]).find(function(x){ return x && x.id===sid; });
  if(!s) return { erro:'Estudo não encontrado.' };
  s=(typeof normalizeStudy==='function')?normalizeStudy(s):s;

  var trats=(s.tratamentos||[]).filter(function(t){ return t && t.id; });
  var reps=Math.max(1, parseInt(s.numRepeticoes)||1);
  if(trats.length<2) return { erro:'A prancha precisa de ao menos 2 tratamentos.' };
  if(reps<2) return { erro:'A prancha precisa de ao menos 2 repetições.' };

  if(!variavel){ var vs=_pranchaVariaveis(s); if(!vs.length) return { erro:'Nenhuma variável com nota lançada neste estudo.' }; variavel=vs[0]; }

  var base=_pranchaBase(s);
  var dts=_pranchaDatas(s, variavel, trats, reps, base.data);
  if(!dts.comData) return { erro:'Nenhuma avaliação datada com a variável "'+variavel+'".' };
  if(!dts.usadas.length){
    if(!dts.parciais.length) return { erro:'Nenhuma avaliação com data utilizável para "'+variavel+'".' };
    return { erro:'Nenhuma data de "'+variavel+'" está com a grade cheia (todo tratamento × bloco), que é o mínimo para a ANOVA:\n\n• '+
      dts.parciais.map(function(x){ return (isoToBR(x.av.data)||'')+' — faltam '+x.faltam+' de '+(trats.length*reps)+' notas'; }).join('\n• ')+
      '\n\nComplete uma das datas ou remova os tratamentos que não foram avaliados.' };
  }
  if(dts.degenerado) return { erro:(dts.degenerado==='zero')
    ? ('Não há o que plotar para "'+variavel+'": todas as notas são zero (a ocorrência não aconteceu).')
    : ('Não há o que plotar para "'+variavel+'": a nota é igual em todas as parcelas, então não há variação para analisar.') };
  var avs=dts.usadas;
  /* avisos: a folha sai, mas o usuário precisa saber o que ficou de fora */
  var avisos=[];
  if(dts.parciais.length) avisos.push(dts.parciais.length+' avaliação(ões) fora da folha por grade incompleta: '+
    dts.parciais.map(function(x){ return (isoToBR(x.av.data)||'')+' (faltam '+x.faltam+')'; }).join(', '));
  if(dts.descartadasPreAplicacao) avisos.push(dts.descartadasPreAplicacao+' avaliação(ões) anterior(es) à aplicação ficaram de fora (linha de base).');
  if(base.fonte==='avaliacao') avisos.push('Sem aplicação ou início registrados: os dias são contados a partir da 1ª avaliação.');
  else if(base.fonte==='inicio') avisos.push('Sem aplicação registrada: os dias são contados a partir do início programado do estudo.');

  /* cubo [trat][bloco][avaliação] — só datas completas chegam aqui */
  var sev=[];
  trats.forEach(function(t){
    var porBloco=[];
    for(var r=1;r<=reps;r++){
      var serie=[];
      avs.forEach(function(x){
        var raw=_avNota(x.av,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},variavel);
        serie.push(parseFloat(String(raw==null?'':raw).replace(',','.')));
      });
      porBloco.push(serie);
    }
    sev.push(porBloco);
  });

  var iTest=trats.findIndex(function(t){ return !!t.testemunha; });
  if(iTest<0) iTest=0;

  var loc=(typeof LOCAIS!=='undefined' && typeof QLOCAL!=='undefined' && LOCAIS[QLOCAL[qid]])||{};
  var dd=function(n){ return (n<10?'0':'')+n; };
  var hoje=new Date();
  var autor=''; try{ autor=(typeof _currentUserName==='function'?_currentUserName():'')||''; }catch(e){}
  var titulo=s.nome||s.codigo||s.id;
  /* config da variável vem da avaliação mais recente que a define */
  var avRef=(_avCfgDoEstudo(s,variavel)||avs[avs.length-1].av);
  var _vc=_avCfg(avRef,variavel);
  var escalaTxt=(_vc.tipo==='escala')?(_vc.escalaNome||('Escala de notas 0–'+_vc.escalaMax)):'';

  return {
    estudo:{
      codigo:(s.codigo||s.nome||s.id), autor:autor,
      data:{ pt:dd(hoje.getDate())+'/'+dd(hoje.getMonth()+1)+'/'+hoje.getFullYear(),
             en:hoje.getFullYear()+'-'+dd(hoje.getMonth()+1)+'-'+dd(hoje.getDate()) },
      delineamento:{ blocos:reps, parcelaM2:null, parcela:'', caldaLha:null },
      /* alvo = a variável avaliada (Mancha angular, Cercospora...): a prancha já sabe
         usar em todas as legendas, e sem isso toda folha saía sem dizer o alvo.
         escala = a escala diagramática, quando a variável for do tipo escala. */
      alvo:variavel, tipoEstudo:(s.tipoEstudo||''),
      variavel:{ nome:variavel, tipo:_avTipo(avRef,variavel), sentido:_avSentido(avRef,variavel) },
      refDAA:base.fonte,
      pt:{ titulo:titulo, local:(loc.nome||''), cultura:(q.cultura||''), safra:'', escala:escalaTxt },
      en:{ titulo:titulo, local:(loc.nome||''), cultura:(q.cultura||''), safra:'', escala:escalaTxt }
    },
    tratamentos: trats.map(function(t,i){
      return { id:t.id, pt:(t.produto||t.id), en:(t.produto||t.id),
               ia:(t.ia||'—'), dose:(parseFloat(String(t.dose||'').replace(',','.'))||0),
               doseTxt:doseTextoDe(s, t.dose),   /* já com unidade; preserva mistura "500 + 300" */
               doseUnid:doseUnidadeDe(s, t.dose),
               gia:(t.gia||''), testemunha:(i===iTest) };
    }),
    /* Eixo do tempo em DIAS (HAT vira fração) — a AACPD integra por trapézio
       sobre ele. `momentos` é só o rótulo: "2 HAT", "7 DAA". */
    daa: avs.map(function(x){ return x.mom?x.mom.dias:x.daa; }),
    momentos: avs.map(function(x){ return x.mom?x.mom.rotulo:(x.daa+' DAA'); }),
    blocos: Array.from({length:reps},function(_,i){ return i+1; }),
    sev: sev,
    avaliacoes: avs.map(function(x){
      return { daa:x.daa, data:{ pt:(isoToBR(x.av.data)||''), en:(x.av.data||'') } };
    }),
    aplicacoes: (s.aplicacoes||[]).map(function(a,i){
      return { n:i+1, data:{ pt:(isoToBR(a.data)||''), en:(a.data||'') },
               estadio:(a.bbch||''), vol:(a.volume||null), temp:(a.tempIni||null),
               ur:(a.urIni||null), vento:(a.ventoIni||null), bico:(a.bico||'') };
    }),
    variavel: variavel,
    avisos: avisos
  };
}
function openPranchaEstudo(qid, sid, variavel){
  var p;
  try{ p=_pranchaPayload(qid, sid, variavel); }
  catch(e){ alert('Não consegui montar a prancha: '+e.message); return; }
  if(p && p.erro){ alert(p.erro); return; }
  /* a folha sai, mas o que ficou de fora precisa ser dito ANTES — senão o gráfico
     parece completo e não é (o que vale relatório em BPL) */
  if(p && p.avisos && p.avisos.length && typeof _stxToast==='function') _stxToast('⚠ '+p.avisos.join(' · '));
  try{ localStorage.setItem('agracta-prancha-handoff', JSON.stringify(p)); }
  catch(e){ alert('Não consegui preparar os dados da prancha.'); return; }
  _openPranchaFrame('prancha.html', 'Gráficos — '+(p.estudo.codigo||''));
}

/* ======================= CROQUI — prancha de figura do mapa =======================
   Monta a folha vetorial das quadras para o relatório. A geometria sai do QGEO
   (lat/lng); a projeção para metro acontece dentro do croqui.html. Cada quadra
   é pintada pelo estudo que abriga — ou pela cultura, quando não há estudo. */
function _croquiPayload(){
  try{ if(typeof ensureLocais==='function') ensureLocais(); }catch(e){}
  var geo = (typeof QGEO!=='undefined' && QGEO) ? QGEO : (window.DEFAULT_QGEO||{});
  var ids = Object.keys(geo).filter(function(id){
    return Array.isArray(geo[id]) && geo[id].length>=3 && !(typeof _delQuadras!=='undefined' && _delQuadras && _delQuadras[id]);
  }).sort();
  if(!ids.length) return null;

  var quadras = ids.map(function(id){
    var q = data[id]||{};
    var est = (q.estudos||[]).find(function(s){ return s && (s.codigo||s.nome); });
    var rot = est ? (est.codigo||est.nome) : (q.cultura||'');
    /* Quadra sem lugar resolvido pertence a onde se está trabalhando — inventar
       um "Sem lugar" fazia a folha exibir uma segunda localidade que não existe.
       Com um único lugar cadastrado, nunca há o que separar. */
    var locId = (typeof QLOCAL!=='undefined' && QLOCAL && QLOCAL[id]) || null;
    if(!locId || !(typeof LOCAIS!=='undefined' && LOCAIS && LOCAIS[locId])) locId = localAtivo;
    var _umSo = (typeof LOCAIS!=='undefined' && LOCAIS && Object.keys(LOCAIS).length <= 1);
    if(_umSo) locId = localAtivo;
    var locNome = (typeof LOCAIS!=='undefined' && LOCAIS && LOCAIS[locId] && LOCAIS[locId].nome) || '';
    return { key: id,                       /* id bruto: único. É a chave. */
             id: quadraNome(id) || id,       /* nome de exibição: PODE repetir entre lugares */
             latlng: geo[id],
             trat: rot || null,
             local: locNome,
             localAtivo: (locId === localAtivo),
             ndvi: (typeof ndviMeans!=='undefined' && ndviMeans && ndviMeans[id]!=null) ? ndviMeans[id] : null };
  });

  /* metadados do cabeçalho: o primeiro estudo encontrado dá o tom da folha */
  var estudo=null, qEst=null;
  ids.some(function(id){
    var e=((data[id]||{}).estudos||[]).find(function(s){ return s && (s.codigo||s.nome); });
    if(e){ estudo=e; qEst=id; return true; } return false;
  });
  var loc = (typeof LOCAIS!=='undefined' && typeof QLOCAL!=='undefined' && LOCAIS[QLOCAL[qEst||ids[0]]]) || {};
  var hoje = new Date();
  var dd = function(n){ return (n<10?'0':'')+n; };
  var iso = hoje.getFullYear()+'-'+dd(hoje.getMonth()+1)+'-'+dd(hoje.getDate());
  var br  = dd(hoje.getDate())+'/'+dd(hoje.getMonth()+1)+'/'+hoje.getFullYear();
  var autor=''; try{ autor=(typeof _currentUserName==='function'?_currentUserName():'')||''; }catch(e){}
  var titulo = estudo ? (estudo.nome||estudo.codigo||'') : 'Croqui das quadras';
  /* Cultura só entra no subtítulo quando a folha INTEIRA é de uma cultura só.
     Antes saía a cultura de q0 — a primeira quadra com estudo —, então nomear
     a A1 com uma cultura carimbava aquela cultura por cima de uma folha com
     trinta quadras de culturas diferentes. Quadra de laboratório não conta:
     não tem planta plantada, e um lab no meio da seleção zerava o subtítulo. */
  var _culturas = {};
  ids.forEach(function(id){
    if(typeof isQuadraLab==='function' && isQuadraLab(id)) return;
    var c = String((data[id]||{}).cultura||'').trim();
    if(c) _culturas[c]=1;
  });
  var _cKeys = Object.keys(_culturas);
  var cultura = (_cKeys.length===1) ? _cKeys[0] : '';
  var localNome = loc.nome||'';

  /* Camadas que existem no app e podem entrar na folha:
     - NDVI: é um imageOverlay com caixa lat/lng, então embute direto
     - base aérea: mapa-base.jpg com 4 cantos georreferenciados (o alinhamento
       que o usuário fez). Os tiles do Google NÃO entram: são externos e
       licenciados, assar isso num SVG que vai pro relatório não se faz. */
  var camadaNdvi=null;
  try{
    if(typeof ndviOverlay!=='undefined' && ndviOverlay && ndviOverlay._url){
      var b=ndviOverlay.getBounds();
      camadaNdvi={ url:ndviOverlay._url,
                   sul:b.getSouth(), oeste:b.getWest(), norte:b.getNorth(), leste:b.getEast(),
                   indice:(typeof ndviIndex!=='undefined'?ndviIndex:null),
                   data:(typeof ndviDate!=='undefined'?ndviDate:null) };
    }
  }catch(e){ camadaNdvi=null; }
  var camadaBase=null;
  try{
    if(typeof _geo!=='undefined' && _geo && _geo.corners && _geo.corners.length===4)
      camadaBase={ url:'mapa-base.jpg', cantos:_geo.corners };
  }catch(e){ camadaBase=null; }
  /* Satélite DE VERDADE: só a FONTE dos tiles (Esri World Imagery, que serve com CORS e por
     isso pode ir ao canvas). A caixa NÃO vem daqui: o croqui troca de local e de seleção, e
     uma bbox cravada aqui traria a imagem de um lugar por cima das quadras de outro. Quem
     monta o mosaico é o croqui, a partir das quadras que estiverem selecionadas lá. */
  var camadaSat={ url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                  atrib:'Esri, Maxar' };

  return {
    camadaNdvi: camadaNdvi,
    camadaBase: camadaBase,
    camadaSat: camadaSat,
    estudo: {
      codigo: estudo ? (estudo.codigo||estudo.nome||'') : (localNome||'AGRACTA'),
      autor: autor, datum: 'SIRGAS 2000 (WGS 84)',
      data: { pt: br, en: iso },
      dataNdvi: { pt: (typeof ndviDate!=='undefined'&&ndviDate)?(isoToBR(ndviDate)||ndviDate):br,
                  en: (typeof ndviDate!=='undefined'&&ndviDate)?ndviDate:iso },
      pt: { titulo: titulo, local: localNome, cultura: cultura, safra: '' },
      en: { titulo: titulo, local: localNome, cultura: cultura, safra: '' }
    },
    quadras: quadras
  };
}
function openCroqui(){
  var p=null;
  try{ p=_croquiPayload(); }catch(e){ p=null; }
  if(!p){ alert('Não há quadras desenhadas para montar o croqui.'); return; }
  try{ localStorage.setItem('agracta-croqui-handoff', JSON.stringify(p)); }
  catch(e){ alert('Não consegui preparar os dados do croqui.'); return; }
  _openPranchaFrame('croqui.html', 'Croqui das quadras');
}
/* Overlay das pranchas — mesmo padrão do BioEstat, folha própria. */
function _openPranchaFrame(src, titulo){
  var ov=document.getElementById('prOvl');
  if(!ov){ ov=document.createElement('div'); ov.id='prOvl'; ov.style.cssText='position:fixed;inset:0;z-index:4000;background:#f2f3f1;display:flex;flex-direction:column'; document.body.appendChild(ov); }
  ov.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#101613;border-bottom:1px solid #26322b;color:#e8efe9;font:700 13px system-ui;flex:0 0 auto">'+
    '<span>'+esc(titulo)+'</span>'+
    '<button onclick="closePrancha()" style="background:#222;color:#ccc;border:none;border-radius:8px;padding:7px 12px;font-weight:800;cursor:pointer">Fechar</button>'+
  '</div>'+
  '<iframe id="prFrame" title="'+esc(titulo)+'" src="'+src+'?t='+Date.now()+'" style="flex:1 1 auto;width:100%;border:0;background:#f2f3f1"></iframe>';
  ov.style.display='flex';
}
function closePrancha(){ var ov=document.getElementById('prOvl'); if(ov){ var f=document.getElementById('prFrame'); if(f) f.src='about:blank'; ov.style.display='none'; } }

function _openBioestatFrame(modo){
  var ov=document.getElementById('bioOvl');
  if(!ov){ ov=document.createElement('div'); ov.id='bioOvl'; ov.style.cssText='position:fixed;inset:0;z-index:4000;background:#0a110a;display:flex;flex-direction:column'; document.body.appendChild(ov); }
  ov.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#101613;border-bottom:1px solid #26322b;color:#e8efe9;font:700 13px system-ui;flex:0 0 auto">'+
    '<span>'+(modo==='forense'?'🔎 Triagem forense':'📊 Análise estatística')+'</span>'+
    '<button onclick="closeBioestat()" style="background:#222;color:#ccc;border:none;border-radius:8px;padding:7px 12px;font-weight:800;cursor:pointer">Fechar</button>'+
  '</div>'+
  '<iframe id="bioFrame" title="Estatística" src="estatistica/index.html'+(modo==='forense'?'#forense':'')+'" style="flex:1 1 auto;width:100%;border:0;background:#0a110a"></iframe>';
  ov.style.display='flex';
}
function closeBioestat(){ var ov=document.getElementById('bioOvl'); if(ov){ var f=document.getElementById('bioFrame'); if(f) f.src='about:blank'; ov.style.display='none'; } }
var _bioAutoCache={}, _bioAutoQueue=[], _bioAutoPending={}, _bioAutoBusy=null, _bioEngineReady=false, _bioAutoWd=null;
function _bioestatJobAoa(qid,study,av,v){
  var q=data[qid]||{}, loc=(typeof LOCAIS!=='undefined'&&typeof QLOCAL!=='undefined'&&LOCAIS[QLOCAL[qid]])||{};
  var header=['Local','Quadra','Cultura','Estudo','Data_avaliacao','Tipo','BBCH','Tratamento','Repeticao','Produto','Variavel','Valor'], rows=[header];
  var reps=Math.max(1,parseInt(study.numRepeticoes)||1);
  (study.tratamentos||[]).forEach(function(t){ for(var r=1;r<=reps;r++){
    var raw=_avNota(av,{key:_avRowKey(t.id,r),tratId:t.id,rep:r},v);
    if(raw==null||String(raw).trim()===''||isNaN(parseFloat(String(raw).replace(',','.'))))continue;
    rows.push([loc.nome||'',quadraNome(qid),q.cultura||'',study.codigo||study.id,isoToBR(av.data)||av.data||'',av.tipo||v,av.bbch||'',t.id,r,t.produto||'',v,raw]);
  }});
  return rows;
}
function _bioestatJobs(qid,study){
  var jobs=[];
  (study.avaliacoes||[]).forEach(function(av){ (av.variaveis||[]).forEach(function(v){
    var aoa=_bioestatJobAoa(qid,study,av,v), groups={};
    aoa.slice(1).forEach(function(r){groups[r[7]]=(groups[r[7]]||0)+1;});
    if(Object.keys(groups).filter(function(k){return groups[k]>=2;}).length<2)return;
    jobs.push({jobKey:(av.id||av.data)+'|'+v,avId:av.id,date:av.data,variavel:v,tipo:av.tipo||v,aoa:aoa});
  }); });
  return jobs;
}
function _bioestatSignature(study){
  var slim={r:study.numRepeticoes,t:(study.tratamentos||[]).map(function(t){return [t.id,t.produto,t.dose,t.testemunha];}),
    a:(study.avaliacoes||[]).map(function(a){return [a.id,a.data,a.tipo,a.variaveis,a.notas];})};
  return String(_hashSeed(JSON.stringify(slim)));
}
function _bioestatEnsureFrame(){
  var f=document.getElementById('bioEngineFrame');
  if(f)return f;
  f=document.createElement('iframe'); f.id='bioEngineFrame'; f.title='Motor estatístico Agracta';
  f.style.cssText='position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none';
  f.onload=function(){_bioEngineReady=true;_bioestatPump();};
  f.src='estatistica/index.html?agracta_engine=1';
  document.body.appendChild(f);
  return f;
}
function _bioestatEnsureStudy(qid,sid){
  var q=data[qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===sid;}); if(!study)return;
  study=normalizeStudy(study);
  var key=qid+'|'+sid, sig=_bioestatSignature(study), jobs=_bioestatJobs(qid,study), c=_bioAutoCache[key];
  if(c&&c.sig===sig&&(c.status==='loading'||c.status==='ready'))return;
  var total=jobs.length*2; /* por avaliação/variável: análise + triagem forense */
  c=_bioAutoCache[key]={sig:sig,status:total?'loading':'empty',done:0,total:total,results:{},qid:qid,sid:sid};
  if(!jobs.length)return;
  var resp=''; try{resp=_currentUserName();}catch(e){}
  var doseUnit=''; try{var t0=(study.tratamentos||[]).find(function(t){return t.dose;});if(t0)doseUnit=_calcDoseUnit(t0.dose);}catch(e){}
  function _ftipo(j){ var t=String(j.tipo||j.variavel||'').toLowerCase(); return /sever|incid|fitotox|efic|propor|%|altura|produ|peso|di[âa]m|massa|cont[íi]nu/.test(t)?'cont':'count'; }
  var loc=((LOCAIS[QLOCAL[qid]]||{}).nome||''), qn=quadraNome(qid), tit=study.codigo||study.id;
  jobs.forEach(function(j,i){
    [['analise',j.jobKey,''],['forense',j.jobKey+'|F',_ftipo(j)]].forEach(function(m,mi){
      var fjob={jobKey:m[1],avId:j.avId,date:j.date,variavel:j.variavel,tipo:j.tipo};
      var req=key+'|'+sig+'|'+i+'-'+mi+'|'+Date.now();
      var item={requestId:req,key:key,sig:sig,job:fjob,payload:{requestId:req,aoa:j.aoa,modo:m[0],titulo:tit,
        responsavel:resp,tipo:j.tipo,doseUnit:doseUnit,forenseTipo:m[2],local:loc,quadra:qn}};
      _bioAutoQueue.push(item);_bioAutoPending[req]=item;
    });
  });
  _bioestatEnsureFrame(); _bioestatPump();
}
function _bioestatPump(){
  if(!_bioEngineReady||_bioAutoBusy||!_bioAutoQueue.length)return;
  var f=document.getElementById('bioEngineFrame'), item=_bioAutoQueue.shift(); if(!f||!f.contentWindow)return;
  _bioAutoBusy=item.requestId;
  clearTimeout(_bioAutoWd);
  _bioAutoWd=setTimeout(function(){ /* job travou: marca erro e segue (não trava a fila) */
    if(_bioAutoBusy!==item.requestId)return;
    var c=_bioAutoCache[item.key]; if(c&&c.sig===item.sig&&!c.results[item.job.jobKey]){ c.results[item.job.jobKey]={ok:false,erro:'tempo esgotado'}; c.done++; if(c.done>=c.total)c.status='ready'; }
    delete _bioAutoPending[item.requestId]; _bioAutoBusy=null; _bioestatPump(); _bioestatRefreshOpen(c);
  },70000);
  f.contentWindow.postMessage({type:'agracta:bioestat-run',payload:item.payload},window.location.origin);
}
function _bioestatP(rel){
  var tab=rel&&rel.analise&&rel.analise.tabela_anova||[];
  for(var i=0;i<tab.length;i++)if(tab[i].p!=null&&/f1|trat/i.test(String(tab[i].fonte||'')))return tab[i].p;
  return null;
}
function _bioestatResumoCard(job,rel){
  if(!rel||!rel.ok)return '<div style="padding:10px;border:1px solid #edc8c8;background:#fff7f7;border-radius:9px;margin-top:7px"><b style="color:#a33">'+esc(job.variavel)+' · '+esc(isoToBR(job.date)||job.date)+'</b><div style="font-size:11px;color:#8a4a4a;margin-top:3px">'+esc((rel&&rel.erro)||'Não foi possível analisar.')+'</div></div>';
  var a=rel.analise||{}, cm=rel.comparacao_medias||{}, cmp=cm.scott_knott||cm.tukey||cm.dunn||null;
  var nf=function(x,d){ return (x==null||isNaN(x))?'—':Number(x).toLocaleString('pt-BR',{maximumFractionDigits:(d==null?1:d)}); };
  var pf=function(x){ return x==null?'—':(x<0.001?'<0,001':Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3})); };
  var ok=function(b){ return b?'<span style="color:#1f6f43">✓</span>':'<span style="color:#b07d18">✗</span>'; };
  var metodoCmp=cm.scott_knott?'Scott-Knott':(cm.tukey?'Tukey':(cm.dunn?'Dunn · Kruskal-Wallis':'—'));
  var descArr=rel.descritiva||[], desc={}; descArr.forEach(function(d){desc[d.tratamento]=d;});
  var letras=(cmp&&cmp.letras)||a.letras||{};
  var valsObj=(cmp&&(cmp.medias_exibicao||cmp.medias||cmp.medianas))||a.medias_estimadas||a.proporcoes_estimadas||null;
  var order=(cmp&&cmp.ordem)||a.ordem||descArr.map(function(d){return d.tratamento;});
  var labelMedia=cm.dunn?'Mediana':'Média', p=_bioestatP(rel);
  /* CV% do ensaio = raiz(QM resíduo) / média geral × 100 */
  var mg=null, cv=null, sm=0, nn=0; descArr.forEach(function(d){ if(d.media!=null){sm+=d.media;nn++;} }); if(nn){ mg=sm/nn; if(a.mse!=null&&mg) cv=Math.sqrt(a.mse)/Math.abs(mg)*100; }
  /* classificação do CV p/ experimentos de campo (Pimentel-Gomes) */
  var cvCls = cv==null?'' : (cv<=10?'baixo · ótima precisão':(cv<=20?'médio · boa':(cv<=30?'alto · regular':'muito alto · baixa precisão')));
  var rows=''; order.forEach(function(t){ var d=desc[t]||{}, val=(valsObj&&valsObj[t]!=null)?valsObj[t]:d.media;
    rows+='<tr><td class="av-tname">'+esc(t)+'</td><td>'+nf(val,1)+'</td><td style="color:#7a877f">'+(d.dp!=null?('±'+nf(d.dp,1)):'—')+'</td><td><b style="color:#1f6f43">'+esc(letras[t]||'—')+'</b></td></tr>'; });
  var nr=a.normalidade||{}, hm=a.homogeneidade||{}, kr=a.kruskal||{};
  var anova=(a.tabela_anova||[]).map(function(r){ return '<tr><td class="av-tname">'+esc(r.fonte)+'</td><td>'+(r.gl!=null?r.gl:'—')+'</td><td>'+nf(r.sq,2)+'</td><td>'+nf(r.qm,3)+'</td><td>'+(r.F!=null?nf(r.F,1):'—')+'</td><td>'+pf(r.p)+'</td></tr>'; }).join('');
  var statTxt=p==null?'modelo calculado':('p='+pf(p)+(p<.05?' · significativo':' · ns'));
  var transf=a.transformacao? (typeof a.transformacao==='string'?a.transformacao:(a.transformacao.nome||a.transformacao.tipo||'aplicada')) : null;
  return '<div style="padding:10px;border:1px solid #d9e5dc;background:#fbfdfb;border-radius:9px;margin-top:7px">'+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b style="color:#26352c">'+esc(job.variavel)+' · '+esc(isoToBR(job.date)||job.date)+'</b><span style="font-size:9px;padding:3px 6px;border-radius:999px;background:'+(p!=null&&p<.05?'#e1f3e8':'#edf0ee')+';color:#486053;white-space:nowrap">'+esc(statTxt)+'</span></div>'+
    '<div style="font-size:10px;color:#5f6f66;margin-top:5px;line-height:1.5"><b>'+esc(a.tipo_analise||'Análise')+'</b>'+(cv!=null?' · CV '+nf(cv,1)+'% <span style="color:#8a948e">('+cvCls+')</span>':'')+' · comparação <b>'+esc(metodoCmp)+'</b>'+(transf?' · transf. '+esc(transf):'')+'</div>'+
    '<div style="font-size:10px;color:#728078;margin-top:1px">Pressupostos: normalidade '+ok(nr.normal)+' <span style="color:#9aa69e">('+esc(nr.teste||'?')+' p'+pf(nr.p)+')</span> · homogeneidade '+ok(hm.homogenea)+' <span style="color:#9aa69e">('+esc(hm.teste||'?')+' p'+pf(hm.p)+')</span>'+(a.pressupostos_ok===false?' <span style="color:#b07d18">→ não-paramétrico</span>':'')+'</div>'+
    '<div class="av-scroll" style="margin-top:7px"><table class="av-table"><thead><tr><th>Trat.</th><th>'+labelMedia+'</th><th>±DP</th><th>Grupo</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    (anova?'<details style="margin-top:6px"><summary style="font-size:10px;color:#486053;cursor:pointer;user-select:none">Tabela ANOVA'+(kr.H!=null?' · Kruskal-Wallis H='+nf(kr.H,1)+' (p'+pf(kr.p)+')':'')+'</summary><div class="av-scroll" style="margin-top:5px"><table class="av-table"><thead><tr><th>Fonte</th><th>GL</th><th>SQ</th><th>QM</th><th>F</th><th>p</th></tr></thead><tbody>'+anova+'</tbody></table></div></details>':'')+
  '</div>';
}
function _bioestatForenseCard(job,rel){
  if(!rel||!rel.ok) return '';
  var v=rel.veredito||{}, flags=v.flags||0, watches=v.watches||0;
  var achados=(rel.achados||[]).filter(function(a){ return a.severidade && a.severidade!=='clear' && a.severidade!=='ok'; });
  var cor=flags?'#a33':(watches?'#8a6d12':'#1f6f43'), bd=flags?'#edc8c8':(watches?'#ece2b8':'#d9e5dc'), bg=flags?'#fff7f7':(watches?'#fffdf3':'#f7fbf8'), chipbg=flags?'#f3dede':(watches?'#f1ead0':'#e1f3e8');
  var rot=flags?(flags+' sinal(is) forte(s)'):(watches?(watches+' atenção'):'sem anomalias');
  var lis=achados.slice(0,5).map(function(a){ return '<li style="margin:2px 0"><b>'+esc(a.nome)+'</b>'+(a.leitura?' — '+esc(a.leitura):(a.estatistica?' — '+esc(a.estatistica):''))+'</li>'; }).join('');
  return '<div style="padding:9px 11px;border:1px solid '+bd+';background:'+bg+';border-radius:9px;margin-top:7px">'+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b style="color:'+cor+'">'+esc(job.variavel)+' · '+esc(isoToBR(job.date)||job.date)+'</b>'+
    '<span style="font-size:9px;padding:3px 6px;border-radius:999px;background:'+chipbg+';color:'+cor+';white-space:nowrap">'+esc(rot)+'</span></div>'+
    (v.resumo?'<div style="font-size:11px;color:#6a766f;margin-top:3px">'+esc(v.resumo)+'</div>':'')+
    (lis?'<ul style="margin:6px 0 0;padding-left:18px;font-size:11px;color:#5a655e">'+lis+'</ul>':'')+
  '</div>';
}
function _bioestatIntegratedHtml(qid,sid,study){
  var jobs=_bioestatJobs(qid,study); if(!jobs.length)return '';
  var key=qid+'|'+sid, sig=_bioestatSignature(study), c=_bioAutoCache[key];
  setTimeout(function(){_bioestatEnsureStudy(qid,sid);},0);
  var tot=(c&&c.total)||jobs.length*2, body='', fbody='';
  if(!c||c.sig!==sig){ body='<div id="bioAutoStatus" style="padding:11px;border:1px solid #dce5df;background:#f8faf8;border-radius:9px;color:#64736a;font-size:11px">Calculando automaticamente no aparelho… '+((c&&c.done)||0)+' de '+tot+'</div>'; }
  else if(c.status==='empty'){ body='<div style="font-size:11px;color:#7c8a80">Ainda não há repetições suficientes para análise automática.</div>'; }
  else {
    /* Renderização PROGRESSIVA: mostra a análise de cada avaliação assim que o job dela termina,
       sem esperar a triagem forense (que no Pyodide frio pode demorar ~1 min). */
    var res=(c&&c.results)||{}, faltamAnalise=0, faltamForense=0;
    jobs.forEach(function(j){
      if(res[j.jobKey]) body+=_bioestatResumoCard(j,res[j.jobKey]); else faltamAnalise++;
      if(res[j.jobKey+'|F']) fbody+=_bioestatForenseCard(j,res[j.jobKey+'|F']); else faltamForense++;
    });
    if(faltamAnalise>0) body+='<div id="bioAutoStatus" style="padding:9px 11px;border:1px solid #dce5df;background:#f8faf8;border-radius:9px;color:#64736a;font-size:11px;margin-top:'+(body?'7px':'0')+'">Calculando análise… '+(jobs.length-faltamAnalise)+' de '+jobs.length+'</div>';
    if(faltamForense>0) fbody+='<div style="padding:9px 11px;border:1px solid #dce5df;background:#f8faf8;border-radius:9px;color:#64736a;font-size:11px;margin-top:'+(fbody?'7px':'0')+'">Triagem forense em segundo plano… '+(jobs.length-faltamForense)+' de '+jobs.length+'</div>';
  }
  /* UMA folha por ALVO. Antes era um botão só, cravado na variável mais frequente —
     estudo com alvos diferentes (Mancha angular + Cercospora) só gerava a primeira. */
  var _diag=[]; try{ _diag=_pranchaDiag(qid,sid); }catch(e){}
  var _btnPrancha='';
  if(_diag.length){
    var _linhas=_diag.map(function(d){
      var det=d.ok
        ? (d.datas+' data'+(d.datas>1?'s':'')+(d.datas>1?' · curva + AACPD':' · uma data')+(d.parciais?(' · '+d.parciais+' incompleta(s) de fora'):''))
        : d.motivo;
      if(!d.ok) return '<div style="padding:8px 10px;border:1px dashed #d8dfd9;border-radius:8px;margin-top:5px;color:#8a948e;font-size:11px">'+
        '<b style="color:#6d7a72">'+esc(d.variavel)+'</b> — '+esc(det)+'</div>';
      return '<button onclick="openPranchaEstudo(\''+qid+'\',\''+sid+'\','+esc(JSON.stringify(d.variavel))+')" '+
        'style="width:100%;text-align:left;padding:9px 11px;border:1px solid #bfd3c6;background:#f4f9f6;color:#1f5136;border-radius:9px;font:700 12px system-ui;cursor:pointer;margin-top:5px">'+
        '&#128200; '+esc(d.variavel)+'<div style="font-weight:400;font-size:10.5px;color:#6d8579;margin-top:2px">'+esc(det)+'</div></button>';
    }).join('');
    _btnPrancha='<div style="margin:8px 0 2px"><div style="font-size:11px;color:#728078;margin-bottom:2px">Folha de gráficos para o relatório — uma por alvo avaliado. Baixa em SVG ou PNG.</div>'+_linhas+'</div>';
  }
  var sec='<div class="sd-section"><div class="sd-section-title">Análise estatística automática <span style="font-weight:400;color:#8a948e">· motor Agracta</span></div>'+
    '<div style="font-size:11px;color:#728078;margin:-2px 0 7px">O motor escolhe a rota, verifica pressupostos e compara os tratamentos sem abrir outra tela.</div>'+body+_btnPrancha+'</div>';
  if(fbody) sec+='<div class="sd-section"><div class="sd-section-title">Triagem forense <span style="font-weight:400;color:#8a948e">· integridade dos dados</span></div>'+
    '<div style="font-size:11px;color:#728078;margin:-2px 0 7px">Sinaliza padrões atípicos (dígitos, arredondamento, duplicatas, dispersão) p/ conferência — não é prova de fraude.</div>'+fbody+'</div>';
  return sec;
}
/* Re-renderiza o detalhe do estudo quando a análise fica pronta — usado tanto pelo handler de
   mensagem quanto pelo watchdog (antes só o handler atualizava, então um job que estourava o
   tempo deixava o spinner preso na tela mesmo com o cache 'ready'). Tolerante: dispara também se
   o spinner ainda estiver na tela, mesmo que a checagem do overlay falhe. */
var _bioRefreshT=null;
function _bioestatRefreshOpen(c){
  /* re-renderiza o estudo aberto quando CHEGA um resultado (não só no ready), pra a análise
     aparecer assim que o job dela termina — sem esperar o forense. Debounce coalesce rajadas. */
  if(!c||curV!==c.qid||curSid!==c.sid)return;
  var ov=document.getElementById('sdOvl');
  var open=(ov&&ov.classList.contains('open'))||!!document.getElementById('bioAutoStatus');
  if(!open)return;
  clearTimeout(_bioRefreshT);
  _bioRefreshT=setTimeout(function(){ if(curV===c.qid&&curSid===c.sid) openStudyDetail(c.qid,c.sid); },120);
}
window.addEventListener('message',function(ev){
  if(ev.origin!==window.location.origin||!ev.data||ev.data.type!=='agracta:bioestat-result')return;
  var item=_bioAutoPending[ev.data.requestId]; if(!item)return;
  var c=_bioAutoCache[item.key]; if(c&&c.sig===item.sig){c.results[item.job.jobKey]=ev.data.resultado||{};c.done++;if(c.done>=c.total)c.status='ready';} /* ignora job órfão de cálculo substituído */
  delete _bioAutoPending[ev.data.requestId]; _bioAutoBusy=null; clearTimeout(_bioAutoWd);
  var st=document.getElementById('bioAutoStatus'); if(st&&c)st.textContent='Calculando automaticamente no aparelho… '+c.done+' de '+c.total;
  _bioestatPump();
  /* re-renderiza quando termina uma ANÁLISE (não a cada forense) ou quando tudo fica pronto */
  if(c && (c.status==='ready' || !/\|F$/.test((item.job&&item.job.jobKey)||''))) _bioestatRefreshOpen(c);
});

/* ===================== IMPORTAR PROTOCOLO DA PLANILHA (modelo.xls) → ESTUDO =====================
   A planilha é a FONTE do protocolo. Lê por RÓTULO (robusto a deslocamento de linhas) — colar (TSV)
   ou arquivo (.xls/.xlsx via XLSX). Cria um estudo novo na quadra escolhida; o resto vai manual. */
function _impNorm(s){ return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').replace(/[:：]\s*$/,'').trim(); }
function _impAoaFromText(txt){ return (typeof _clipToAoa==='function')?_clipToAoa(txt):String(txt||'').replace(/\r/g,'').split('\n').map(function(l){ return l.split('\t'); }); }
function _impFindVal(aoa, labels){
  for(var r=0;r<aoa.length;r++){ var row=aoa[r]||[];
    for(var c=0;c<row.length;c++){ var cell=_impNorm(row[c]); if(!cell) continue;
      for(var li=0;li<labels.length;li++){ var lab=labels[li];
        if(cell===lab || cell.indexOf(lab)===0){
          for(var k=c+1;k<Math.min(row.length,c+6);k++){ var v=row[k]; if(v!=null && String(v).trim()!=='') return String(v).trim(); }
          return '';
        }
      }
    }
  }
  return '';
}
function _impDateISO(v){
  v=String(v==null?'':v).trim(); if(!v) return '';
  var m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if(m){ var d=m[1].padStart(2,'0'), mo=m[2].padStart(2,'0'), y=m[3]; if(y.length===2) y='20'+y; return y+'-'+mo+'-'+d; }
  if(/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
  if(/^\d+(\.\d+)?$/.test(v)){ var n=parseFloat(v); if(n>20000&&n<80000){ var dt=new Date(Date.UTC(1899,11,30)+n*864e5); return dt.toISOString().slice(0,10); } }
  return '';
}
function _impTratamentos(aoa){
  var hr=-1, cols={};
  for(var r=0;r<aoa.length;r++){ var row=(aoa[r]||[]).map(_impNorm);
    if(row.indexOf('tratamentos')>=0 && row.some(function(x){return x.indexOf('dose')===0;})){
      hr=r;
      row.forEach(function(t,c){
        if(t==='tratamentos') cols.produto=c;
        else if(t.indexOf('concentracao de g')===0) cols.concIa=c;
        else if(t.indexOf('ingrediente ativo')===0) cols.ia=c;
        else if(t.indexOf('concentracao')===0) cols.conc=c;
        else if(t.indexOf('dose')===0) cols.dose=c;
        else if(t.indexOf('intervalo')===0) cols.intervalo=c;
        else if(t.indexOf('volume de calda')===0) cols.volume=c;
        else if(t.indexOf('adjuvante')===0) cols.adj=c;
        else if(t.indexOf('aplica')>=0) cols.numApl=c;
        else if(t==='n'||t==='no'||t==='n°'||t==='nº'||t==='n o') cols.num=c;
      });
      break;
    }
  }
  if(hr<0) return {rows:[], header:false};
  var numCol=(cols.num!=null?cols.num:0), out=[];
  for(var r2=hr+1;r2<aoa.length;r2++){ var row2=aoa[r2]||[];
    var ns=String(row2[numCol]==null?'':row2[numCol]).trim();
    if(!/^\d+$/.test(ns)){ if(out.length) break; else continue; }
    function g(c){ return c!=null?String(row2[c]==null?'':row2[c]).trim():''; }
    var prod=g(cols.produto), dose=g(cols.dose), vol=g(cols.volume);
    out.push({ id:'T'+ns, produto:prod, dose:dose, volume:vol,
      ia:g(cols.ia), conc:g(cols.conc), concIa:g(cols.concIa), adj:g(cols.adj),
      _numApl:g(cols.numApl), _intervalo:g(cols.intervalo) });
  }
  return {rows:out, header:true};
}
function _importParse(aoa){
  var f={
    codigo:_impFindVal(aoa,['numero de estudo','no de estudo','n de estudo','codigo do estudo']),
    objetivo:_impFindVal(aoa,['objetivo do estudo','objetivo']),
    cultura:_impFindVal(aoa,['cultura']),
    cultivar:_impFindVal(aoa,['cultivar']),
    plantio:_impFindVal(aoa,['data de planito','data de plantio']),
    dataInicio:_impFindVal(aoa,['data de inicio']),
    dataTermino:_impFindVal(aoa,['data de termino']),
    numRepeticoes:_impFindVal(aoa,['numero de repeticoes','n de repeticoes','no de repeticoes']),
    numTratamentos:_impFindVal(aoa,['numero de tratamentos','n de tratamentos','no de tratamentos']),
    delineamento:_impFindVal(aoa,['deliniamento estatistico','delineamento estatistico','delineamento']),
    volume:_impFindVal(aoa,['volume de calda']),
    parcela:_impFindVal(aoa,['tamanho da parcela']),
    alvo:_impFindVal(aoa,['alvo']),
    espacamento:_impFindVal(aoa,['espacamento de plantio','espacamento']),
    populacao:_impFindVal(aoa,['populacao']),
    adjuvante:_impFindVal(aoa,['adjuvante utilizado','adjuvante']),
    municipio:_impFindVal(aoa,['municipio']),
    uf:_impFindVal(aoa,['uf']),
    quadra:_impFindVal(aoa,['quadra']),
    tecnico:_impFindVal(aoa,['tecnico de campo']),
    diretor:_impFindVal(aoa,['diretor de estudo']),
    estacao:_impFindVal(aoa,['estacao experimental']),
    equipamento:_impFindVal(aoa,['equipamento']),
    pressao:_impFindVal(aoa,['pressao de trabalho']),
    ponta:_impFindVal(aoa,['ponta de pulverizacao']),
    proposta:_impFindVal(aoa,['proposta comercial']),
    ret:_impFindVal(aoa,['ret ou dispensa','ret']),
    emergencia:_impFindVal(aoa,['data de emergencia']),
    distancia:_impFindVal(aoa,['distancia entre o bico','distancia bico']),
    classeSolo:_impFindVal(aoa,['classe de solo']),
    endereco:_impFindVal(aoa,['endereco']),
    bicos:_impFindVal(aoa,['n de bicos','no de bicos','numero de bicos','bicos']),
    altitude:_impFindVal(aoa,['altitude']),
    latitude:_impFindVal(aoa,['latitude']),
    longitude:_impFindVal(aoa,['longitude'])
  };
  var tr=_impTratamentos(aoa);
  var trats=tr.rows.filter(function(t){ return t.produto || t.dose; });
  if(!trats.length && tr.rows.length) trats=tr.rows; /* template em branco: mantém os numerados */
  var warnings=[];
  if(!tr.header) warnings.push('Não achei a tabela "DESCRIÇÃO DOS TRATAMENTOS" (preciso de uma linha com "Tratamentos" e "Dose").');
  var nt=parseInt(f.numTratamentos)||0;
  if(nt && trats.length && nt!==trats.length) warnings.push('Planilha diz '+nt+' tratamentos, mas li '+trats.length+'.');
  if(!f.codigo) warnings.push('Não achei o "Número de Estudo".');
  return { fields:f, tratamentos:trats, warnings:warnings };
}
var _impParsed=null;
function openImportProtocolo(){
  if(typeof closeMainMenu==='function') closeMainMenu();
  _impParsed=null; _calcCss();
  var ov=document.getElementById('impOvl');
  if(!ov){ ov=document.createElement('div'); ov.id='impOvl'; ov.className='calc-ovl'; ov.onclick=function(e){ if(e.target===ov) closeImport(); }; document.body.appendChild(ov); }
  ov.style.display='flex';
  ov.innerHTML='<div class="calc-box">'+
    '<div class="calc-top"><div class="calc-title">📥 Importar protocolo (planilha)</div><button class="calc-x" onclick="closeImport()" aria-label="Fechar">×</button></div>'+
    '<div class="calc-sub">Cole as células copiadas do Excel <b>ou</b> escolha o arquivo. Leio o que der; o resto você ajusta. A planilha é a fonte do protocolo.</div>'+
    '<input type="file" id="impFile" accept=".xls,.xlsx,.csv" class="calc-inp" style="padding:7px" onchange="_impFromFile(this)">'+
    '<textarea id="impText" class="calc-inp" rows="5" placeholder="…ou cole aqui as células copiadas da planilha (Ctrl+V)" style="margin-top:8px;font:12px ui-monospace,Menlo,monospace" oninput="_impTextChanged()"></textarea>'+
    '<div class="calc-actions" style="margin-top:8px"><button class="calc-copy" onclick="_impAnalyze()">🔎 Analisar planilha</button></div>'+
    '<div id="impPreview"></div>'+
  '</div>';
}
function closeImport(){ var ov=document.getElementById('impOvl'); if(ov) ov.style.display='none'; }
function _impTextChanged(){ /* placeholder p/ futura pré-análise ao vivo */ }
function _impFromFile(input){
  var file=input&&input.files&&input.files[0]; if(!file) return;
  if(typeof XLSX==='undefined'){ alert('Leitor de planilha não carregou.'); return; }
  var fr=new FileReader();
  fr.onload=function(e){
    try{
      var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var aoa=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false,defval:''});
      _impRun(aoa);
    }catch(err){ alert('Não consegui ler o arquivo: '+(err.message||err)); }
  };
  fr.readAsArrayBuffer(file);
}
function _impAnalyze(){
  var txt=(document.getElementById('impText')||{}).value||'';
  if(!txt.trim()){ alert('Cole as células da planilha ou escolha um arquivo.'); return; }
  _impRun(_impAoaFromText(txt));
}
var _impRawAoa=null;
function _impRun(aoa){
  _impRawAoa=aoa;
  _impParsed=_importParse(aoa);
  var box=document.getElementById('impPreview'); if(!box) return;
  var f=_impParsed.fields, tr=_impParsed.tratamentos;
  var qopts=_calcAllStudies?'' :''; /* placeholder */
  var quadrasHtml=Object.keys(data||{}).filter(function(q){return q!=='__config';}).map(function(q){ return '<option value="'+esc(q)+'">'+esc(quadraNome(q))+'</option>'; }).join('');
  var rowf=function(k,v){ return '<div class="calc-kv" style="grid-template-columns:130px 1fr"><span>'+k+'</span><b>'+esc(v||'—')+'</b></div>'; };
  var h='<div style="margin-top:10px;border-top:1px solid var(--border,#26322b);padding-top:10px">';
  if(_impParsed.warnings.length) h+='<div class="calc-warn" style="margin-bottom:8px">⚠ '+_impParsed.warnings.map(esc).join('<br>⚠ ')+'</div>';
  h+=rowf('Código', f.codigo)+rowf('Objetivo', f.objetivo)+rowf('Cultura', f.cultura+(f.cultivar?(' · '+f.cultivar):''))+
     rowf('Data início', f.dataInicio)+rowf('Repetições', f.numRepeticoes)+rowf('Delineamento', f.delineamento)+
     rowf('Volume calda', f.volume)+rowf('Tamanho parcela', f.parcela)+rowf('Alvo', f.alvo)+rowf('Município/UF', [f.municipio,f.uf].filter(Boolean).join('/'));
  h+='<div class="calc-sub" style="margin-top:8px"><b>'+tr.length+' tratamento(s):</b> '+esc(tr.slice(0,8).map(function(t){return t.id+(t.produto?(' '+t.produto):'')+(t.dose?(' '+t.dose):'');}).join(' | ')||'—')+'</div>';
  h+='<div class="calc-grid" style="margin-top:10px"><div class="calc-f full"><span class="calc-lab">Quadra de destino</span><select id="impQuadra" class="calc-sel"><option value="">— nova quadra (digito o nome) —</option>'+quadrasHtml+'</select></div>'+
     '<div class="calc-f full"><span class="calc-lab">Nome da nova quadra (se não escolheu acima)</span><input id="impNovaQuadra" class="calc-inp" placeholder="ex.: '+esc(f.quadra||'A1')+'" value="'+esc(f.quadra||'')+'"></div></div>';
  h+='<div class="calc-actions"><button class="calc-copy" onclick="_impCriar()">✓ Criar estudo</button><button class="calc-close" onclick="closeImport()">Cancelar</button></div>';
  h+='</div>';
  box.innerHTML=h;
}
function _impCriar(){
  if(!_impParsed){ alert('Analise a planilha primeiro.'); return; }
  var f=_impParsed.fields, tr=_impParsed.tratamentos;
  var qsel=(document.getElementById('impQuadra')||{}).value||'';
  var novo=((document.getElementById('impNovaQuadra')||{}).value||'').trim();
  var qid;
  if(qsel){ qid=qsel; }
  else {
    if(!novo){ alert('Escolha uma quadra ou digite o nome de uma nova.'); return; }
    try{ ensureLocais(); }catch(e){}
    qid=(typeof uid==='function')?uid():('q'+Date.now());
    data[qid]={ cultura:f.cultura||'', cultivar:f.cultivar||'', plantio:_impDateISO(f.plantio)||'', area:null, culturas:(f.cultura?[{cultura:f.cultura,cultivar:f.cultivar||'',plantio:_impDateISO(f.plantio)||''}]:[]), estudos:[], _ts:Date.now() };
    QNOME[qid]=novo; try{ _touchQNome&&_touchQNome(qid); }catch(e){}
    QLOCAL[qid]=(typeof HOME_LOCAL!=='undefined'?HOME_LOCAL:Object.keys(LOCAIS||{})[0])||'iracemapolis'; try{ _touchQLocal&&_touchQLocal(qid); }catch(e){}
    try{ saveQNome(); saveQLocal(); }catch(e){}
  }
  if(!data[qid]) data[qid]={cultura:f.cultura||'',cultivar:f.cultivar||'',plantio:'',area:null,estudos:[]};
  if(!Array.isArray(data[qid].estudos)) data[qid].estudos=[];
  /* monta o estudo */
  var s=(typeof newStudy==='function')?newStudy():{id:(uid?uid():'s'+Date.now()),tratamentos:[],avaliacoes:[],aplicacoes:[],numRepeticoes:4};
  s.codigo=f.codigo||s.codigo||'';
  s.descricao=f.objetivo||'';
  s.dataInicio=_impDateISO(f.dataInicio)||'';
  var nr=parseInt(f.numRepeticoes); if(nr>0) s.numRepeticoes=nr;
  s.delineamento=f.delineamento||'DBC';
  if(f.alvo) s.alvo=f.alvo;
  s.tratamentos=tr.map(function(t,i){ return { id:'T'+(i+1), produto:t.produto||'', dose:t.dose||'', volume:t.volume||f.volume||'',
    ingredienteAtivo:t.ia||'', concentracao:t.conc||'', concentracaoAtivo:t.concIa||'', adjuvante:t.adj||'',
    obs:'', testemunha:/test/i.test(t.produto||'') }; });
  var na=tr.map(function(t){return parseInt(t._numApl);}).filter(function(x){return x>0;}); if(na.length) s.numAplicacoes=Math.max.apply(null,na);
  var iv=tr.map(function(t){return parseInt(t._intervalo);}).filter(function(x){return x>0;}); if(iv.length) s.intervaloDias=iv[0];
  /* GRADE DE AVALIAÇÕES (a/b/c/d) + PROGRAMAÇÃO + CLIMA: reaproveita o conteúdo colado/arquivo
     com o parser canônico, pra o estudo novo já nascer com a planilha inteira (não só cabeçalho+tratamentos). */
  try{
    if(_impRawAoa){
      var rich=parseStudyProtocolRows(_impRawAoa, (f.codigo?('protocolo '+f.codigo):'planilha modelo'));
      if(rich){
        if(rich.avaliacoes&&rich.avaliacoes.length) s.avaliacoes=_mergeProtocolAvaliacoes(s.avaliacoes||[],rich.avaliacoes);
        if(rich.clima&&rich.clima.length) s.aplicacoes=_mergeProtocolClima(s.aplicacoes||[],rich.clima);
        if(rich.numAplicacoes && !(s.numAplicacoes>0)) s.numAplicacoes=rich.numAplicacoes;
        if(rich.intervaloDias!=null && !(s.intervaloDias>0)) s.intervaloDias=rich.intervaloDias;
      }
    }
  }catch(e){ console.warn('Enriquecimento do protocolo (grade/clima) falhou:', e); }
  /* PROTOCOLO COMPLETO (round-trip: a planilha é o início e o fim) — nomes que o downloadStudyWorkbook lê */
  var _pi=function(v){ return _impDateISO(v)||v||''; };
  s.protocolo={ proposta:f.proposta||'', ret:f.ret||'', cultivar:f.cultivar||'', equipamento:f.equipamento||'',
    diretor:f.diretor||'', plantio:_pi(f.plantio), pressao:f.pressao||'', municipio:f.municipio||'', tecnico:f.tecnico||'',
    emergencia:_pi(f.emergencia), volumeCalda:f.volume||'', uf:f.uf||'', cultura:f.cultura||'', espacamento:f.espacamento||'',
    ponta:f.ponta||'', latitude:f.latitude||'', alvo:f.alvo||'', tamanhoParcela:f.parcela||'', bicos:f.bicos||'',
    longitude:f.longitude||'', populacao:f.populacao||'', distanciaBico:f.distancia||'', altitude:f.altitude||'',
    termino:_pi(f.dataTermino), quadra:f.quadra||'', delineamento:f.delineamento||'', estacao:f.estacao||'',
    adjuvante:f.adjuvante||'', endereco:f.endereco||'', classeSolo:f.classeSolo||'' };
  try{ s.protocoloOrigem={ arquivo:'modelo-protocolo', importadoEm:new Date().toISOString(), campos:JSON.parse(JSON.stringify(f)) }; }catch(e){}
  try{ if(typeof logStudyAuditInObject==='function') logStudyAuditInObject(s, 'Protocolo importado da planilha', (s.codigo||'(sem código)')+' · '+s.tratamentos.length+' tratamento(s)', {origem:'planilha-modelo'}); }catch(e){}
  s._ts=Date.now();
  data[qid].estudos.push(s);
  /* cultura na quadra, se vazia */
  if(f.cultura && !data[qid].cultura){ data[qid].cultura=f.cultura; if(f.cultivar) data[qid].cultivar=f.cultivar; }
  save();
  try{ if(typeof dbUpsertQuadra==='function') dbUpsertQuadra(qid); }catch(e){}
  try{ render&&render(); renderLeg&&renderLeg(); updateAgendaBadge&&updateAgendaBadge(); }catch(e){}
  closeImport();
  if(typeof openStudyDetail==='function') openStudyDetail(qid, s.id);
  setTimeout(function(){ alert('Estudo "'+(s.codigo||s.id)+'" criado com '+s.tratamentos.length+' tratamento(s). Ajuste o que faltar (geometria da quadra, datas de avaliação) por aqui.'); }, 120);
}

function openStudyDetail(qid,sid){
  curV=qid;curSid=sid;
  var q=data[qid]||{};
  var study=(q.estudos||[]).find(function(s){return s.id===sid});
  if(!study)return;
  study=normalizeStudy(study);

  var bbchList=getBBCHList(q.cultura);
  var ne=nextEventV2(study);

  /* Estudo finalizado é somente-leitura: o que escreve some da tela, e o que
     sobrou de escrita ainda passa por _bloqueadoPorFinalizacao antes de gravar. */
  var _fin=estudoFinalizado(study), _finEm='', _finQuem='', _finN=0, _finFuso='';
  if(_fin){
    try{ _finEm=new Date(study.finalizacao.em).toLocaleString('pt-BR'); }catch(e){ _finEm=study.finalizacao.em||''; }
    _finQuem=study.finalizacao.nome||study.finalizacao.por||'';
    _finN=study.finalizacao.nResultados||((study.estatisticaFinal||{}).itens||[]).length;
    _finFuso=study.finalizacao.fuso||'';
  }

  var h="";
  if(_fin){
    h+='<div style="margin:0 0 10px;padding:9px 12px;border-radius:10px;background:#102218;border:1px solid #245a36;color:#9fe0b6;font-size:12px;line-height:1.5">'+
       '🔒 <b>Estudo finalizado</b> em '+esc(_finEm)+(_finQuem?(' por '+esc(_finQuem)):'')+
       '. Somente leitura — a estatística está congelada. Para editar, use <b>Reabrir estudo</b> lá embaixo.</div>';
  }
  h+='<div class="sd-header">';
  /* quadraNome, não o qid: o id interno carrega o sufixo anti-colisão (~a3f2) que
     novoQuadraId() cria, e ele aparecia cru no topo da tela do estudo. */
  h+='<button class="sd-back" onclick="backToQuadra()">‹ '+esc(quadraNome(qid))+'</button>';
  h+='<div class="sd-codigo">'+esc(study.codigo||"(sem código)")+'</div>';
  h+='<div class="sd-actions">';
  h+='<button class="btn-sm" onclick="downloadStudyWorkbook(\''+qid+'\',\''+sid+'\')" title="Baixar o modelo.xls preenchido com protocolo, aplicações, avaliações e grupos estatísticos">'+ic('sheet',15)+' Planilha</button>';
  h+='<button class="btn-sm" onclick="studyExport(\''+qid+'\',\''+sid+'\')" title="Copiar dados do ensaio + NDVI do período">'+ic('copy',15)+' Copiar</button>';
  h+=isQuadraLab(qid)
    ? '<button class="btn-sm" onclick="openCalcLab(\''+qid+'\',\''+sid+'\')" title="Calculadora de laboratório: a receita de cada tratamento deste estudo, mais o ajuste de i.a.">🧪 Calc lab</button>'
    : '<button class="btn-sm" onclick="openCalcAplicacao(\''+qid+'\',\''+sid+'\')" title="Calculadora de aplicação (calda/dose) com os tratamentos deste estudo">🧪 Calc</button>';
  h+='<button class="btn-sm" onclick="navStartQuadra(\''+qid+'\')" title="Navegar (GPS) até a quadra deste estudo">'+ic('pin',15)+' Ir até</button>';
  /* Finalizado: some tudo que escreve. Ler, copiar e baixar continuam valendo. */
  if(!_fin){
    h+='<button class="btn-sm'+(study.randomizado?' active':'')+'" onclick="toggleStudyRandomizado(\''+qid+'\',\''+sid+'\')" title="Usar ordem randomizada no modo automático de avaliação">'+(study.randomizado?'Randomizado':'Ativar random.')+'</button>';
    if(study.randomizado) h+='<button class="btn-sm" onclick="openRandomizacaoModal(\''+qid+'\',\''+sid+'\')" title="Colar ou editar a ordem de parcelas randomizadas">Ordem</button>';
    h+='<button class="btn-sm" onclick="openStudyEditV2(\''+qid+'\',\''+sid+'\')">EDITAR</button>';
  }
  h+='</div>';
  h+='</div>';

  /* Meta info */
  h+='<div class="sd-meta">';
  /* Laboratório não tem planta plantada: mostra a especialidade no lugar da cultura. */
  h+= isQuadraLab(qid)
    ? '<div class="sd-meta-item"><span class="sd-meta-lbl">Laboratório</span><span>'+esc(quadraLabTipo(qid)||"—")+'</span></div>'
    : '<div class="sd-meta-item"><span class="sd-meta-lbl">Cultura</span><span>'+esc(q.cultura||"—")+(q.cultivar?" · "+esc(q.cultivar):"")+'</span></div>';
  if(study.dataInicio){
    h+='<div class="sd-meta-item"><span class="sd-meta-lbl">1ª aplicação</span><span>'+esc(isoToBR(study.dataInicio))+'</span></div>';
  }
  h+='<div class="sd-meta-item"><span class="sd-meta-lbl">Delineamento</span><span>'+study.tratamentos.length+' trat. × '+study.numRepeticoes+' rep. = '+(study.tratamentos.length*study.numRepeticoes)+' parcelas'+(study.randomizado?' · randomizado':'')+'</span></div>';
  if(study.numAplicacoes>1){
    h+='<div class="sd-meta-item"><span class="sd-meta-lbl">Aplicações</span><span>'+study.numAplicacoes+' (intervalo '+study.intervaloDias+'d)</span></div>';
  }
  var _pc=[], _br=function(n){ return String(n).replace('.',','); }; /* preparo: só mostra o que foi preenchido */
  if(isQuadraLab(qid)){
    var _fr={gL:'rótulo g/L',gkg:'rótulo g/kg',mae:'solução-mãe ppm',puro:'reagente puro'}[study.labFonteTipo||'gL'];
    if(study.labVolumeMl>0) _pc.push('pote '+_br(study.labVolumeMl)+' mL');
    _pc.push(_fr+((study.labFonteTipo!=='puro'&&study.labFonteValor)?' '+study.labFonteValor:''));
    if(study.labPureza) _pc.push('pureza '+study.labPureza+'%');
    if(study.labDensidade) _pc.push('d '+study.labDensidade+' g/mL');
    h+='<div class="sd-meta-item"><span class="sd-meta-lbl">Preparo no laboratório</span><span>'+esc(_pc.join(' · '))+'</span></div>';
  }else{
    if(study.volumeMorto>0) _pc.push('vol. morto '+_br(study.volumeMorto)+' mL');
    if(study.numFrascos>1) _pc.push(study.numFrascos+' frascos/preparo');
    if(study.capacidadeFrasco>0) _pc.push('frasco '+_br(study.capacidadeFrasco)+' L');
    if(_pc.length) h+='<div class="sd-meta-item"><span class="sd-meta-lbl">Preparo de calda</span><span>'+esc(_pc.join(' · '))+'</span></div>';
  }
  h+='</div>';

  /* Descrição */
  if(study.descricao){
    h+='<div class="sd-section"><div class="sd-section-title">Descrição</div><div class="sd-descricao">'+esc(study.descricao)+'</div></div>';
  }
  if(study.protocoloOrigem){
    var pm=study.protocolo||{};
    h+='<div class="sd-section"><div class="sd-section-title">Protocolo de origem</div><div style="padding:10px 12px;border:1px solid #dce5df;background:#fbfdfb;border-radius:9px;font-size:11px;color:#53635a;line-height:1.55"><b style="color:#26352c">'+esc(study.protocoloOrigem.nome||'Planilha importada')+'</b>'+
      (pm.cultura?' · Cultura: '+esc(pm.cultura):'')+(pm.cultivar?' · '+esc(pm.cultivar):'')+(pm.alvo?' · Alvo: '+esc(pm.alvo):'')+
      '<br>Os campos reconhecidos foram incorporados ao estudo; a planilha completa pode ser baixada novamente pelo botão <b>Planilha</b>.</div></div>';
  }

  /* Próximo evento — estudo finalizado não tem próximo: ele acabou. */
  if(ne && !_fin){
    var cls=ne.diff<=0?"urgent":(ne.diff<=3?"soon":"normal");
    var lbl=ne.diff===0?"HOJE":(ne.diff<0?"ATRASADO "+Math.abs(ne.diff)+"d":"em "+ne.diff+"d");
    var tipo=ne.ev.type==='apl'?("Aplicação "+ne.ev.idx+"/"+ne.ev.total):("Avaliação"+(ne.ev.tipo?" — "+ne.ev.tipo:""));
    h+='<div class="sd-next '+cls+'">';
    h+='<div class="sd-next-lbl">PRÓXIMO</div>';
    h+='<div class="sd-next-evt">'+esc(tipo)+'</div>';
    h+='<div class="sd-next-date">'+fD(ne.ev.date)+' · <strong>'+lbl+'</strong></div>';
    h+='</div>';
  }

  /* Tratamentos */
  h+='<div class="sd-section"><div class="sd-section-title">Tratamentos & Protocolo</div>';
  if(study.tratamentos.length===0){
    h+='<div class="sd-empty">Nenhum tratamento cadastrado. Toque em EDITAR para adicionar.</div>';
  }else{
    h+='<div class="trat-table">';
    h+='<div class="trat-head"><span>#</span><span>Produto</span><span>Dose</span><span>V. Calda</span></div>';
    study.tratamentos.forEach(function(t){
      h+='<div class="trat-row">';
      h+='<span class="trat-id">'+esc(t.id)+'</span>';
      h+='<span>'+esc(t.produto||"—")+'</span>';
      h+='<span>'+esc(t.dose||"—")+'</span>';
      h+='<span>'+esc(t.volume||"—")+'</span>';
      if(t.obs)h+='<span class="trat-obs">📝 '+esc(t.obs)+'</span>';
      h+='</div>';
    });
    h+='</div>';
  }
  h+='</div>';

  /* Aplicações realizadas */
  h+='<div class="sd-section"><div class="sd-section-title">Aplicações'+(_fin?'':' <button class="sd-add" onclick="quickAddAplicacao()">+ Registrar</button>')+'</div>';
  if(study.aplicacoes.length===0){
    h+='<div class="sd-empty">Nenhuma aplicação registrada ainda.</div>';
  }else{
    h+='<div class="eventos-list">';
    study.aplicacoes.sort(function(a,b){return (a.data||"").localeCompare(b.data||"")});
    study.aplicacoes.forEach(function(a,i){
      h+='<div class="evento-item">';
      h+='<div class="evento-head"><span class="evento-tipo apl">APL '+(i+1)+'</span><span class="evento-data">'+esc(isoToBR(a.data))+'</span>';
      h+='<button class="evento-del" onclick="removeAplicacao(\''+a.id+'\')" title="Excluir aplicação" aria-label="Excluir aplicação APL '+(i+1)+'">×</button></div>';
      if(a.bbch){
        var info=getBBCHInfo(q.cultura,a.bbch);
        h+='<div class="evento-bbch">BBCH '+esc(a.bbch)+(info?' · '+esc(info.fase):'')+'</div>';
      }
      if(a.obs)h+='<div class="evento-obs">'+esc(a.obs)+'</div>';
      h+=carimboHtml(a.carimbo);
      h+='</div>';
    });
    h+='</div>';
  }
  h+='</div>';

  /* Avaliações */
  h+='<div class="sd-section"><div class="sd-section-title">Avaliações'+(_fin?'':' <button class="sd-add" onclick="quickAddAvaliacao()">+ Nova</button>')+'</div>';
  if(study.avaliacoes.length===0){
    h+='<div class="sd-empty">Nenhuma avaliação programada ou registrada.</div>';
  }else{
    h+='<div class="eventos-list">';
    var sortAvs=study.avaliacoes.slice().sort(function(a,b){return (a.data||"").localeCompare(b.data||"")});
    sortAvs.forEach(function(a,i){
      h+='<div class="evento-item">';
      h+='<div class="evento-head"><span class="evento-tipo eval">AV '+(i+1)+'</span><span class="evento-data">'+esc(isoToBR(a.data))+'</span>'+((a.carimbo&&a.carimbo.rubrica)?'<span title="Avaliação rubricada" style="margin-left:6px;font-size:12px">✍️</span>':'');
      h+='<button class="evento-del" style="color:#9ac49a" onclick="openStudyEditAvaliacao(\''+a.id+'\')" title="Editar avaliação" aria-label="Editar avaliação AV '+(i+1)+'">✎</button>';
      h+='<button class="evento-del" onclick="removeAvaliacaoV2(\''+a.id+'\')" title="Excluir avaliação" aria-label="Excluir avaliação AV '+(i+1)+'">×</button></div>';
      if(a.tipo)h+='<div class="evento-subtipo">'+esc(a.tipo)+'</div>';
      if(a.bbch){
        var infoE=getBBCHInfo(q.cultura,a.bbch);
        h+='<div class="evento-bbch">BBCH '+esc(a.bbch)+(infoE?' · '+esc(infoE.fase):'')+'</div>';
      }
      if(a.obs)h+='<div class="evento-obs">'+esc(a.obs)+'</div>';
      h+=avGridHtml(a);
      h+=avResultHtml(study,a);
      h+=carimboHtml(a.carimbo);
      h+='</div>';
    });
    h+='</div>';
  }
  h+='</div>';
  h+=studyAudpcHtml(study);
  h+=studyChartsHtml(study);
  h+=_bioestatIntegratedHtml(qid,sid,study);
  h+=studyAuditHtml(study);

  /* Finalizar / reabrir — o fecho BPL do estudo */
  h+='<div class="sd-section" style="margin-top:14px">';
  if(_fin){
    h+='<div class="sd-section-title">Finalização</div>'+
       '<div style="padding:11px 13px;border:1px solid #245a36;background:#0f2016;border-radius:10px;font-size:12px;line-height:1.6;color:#9fe0b6">'+
       '<b>🔒 Estudo finalizado</b> em '+esc(_finEm)+(_finQuem?(' por '+esc(_finQuem)):'')+'.<br>'+
       esc(String(_finN))+' resultado(s) de estatística congelados — o relatório usa este retrato, não um recálculo.'+
       (_finFuso?('<br><span style="opacity:.75">Fuso do carimbo: '+esc(_finFuso)+'</span>'):'')+
       (study.finalizacao.rubrica?('<div style="margin-top:8px"><img src="'+esc(study.finalizacao.rubrica)+'" alt="Rubrica de quem finalizou" style="max-height:56px;background:#fff;border-radius:6px;padding:3px"></div>'):'')+
       '</div>'+
       '<button class="btn-sm" style="margin-top:9px" onclick="reabrirEstudo(\''+qid+'\',\''+sid+'\')">🔓 Reabrir estudo</button>';
  }else{
    h+='<div class="sd-section-title">Finalização</div>'+
       '<div style="font-size:11px;color:#9a8;line-height:1.55;margin-bottom:8px">Fecha o estudo: pede senha e rubrica, carimba data e hora, e <b>congela a estatística</b> — hoje ela é recalculada no aparelho toda vez que a folha abre. Depois de finalizado o estudo fica somente-leitura e sai da agenda.</div>'+
       '<button class="btn-sm" onclick="finalizarEstudo(\''+qid+'\',\''+sid+'\')">✅ Finalizar estudo</button>';
  }
  h+='</div>';

  /* Botão excluir estudo */
  h+='<div class="sd-danger-zone"><button class="btn-danger" onclick="confirmDeleteStudy(\''+qid+'\',\''+sid+'\')">Excluir estudo</button></div>';

  document.getElementById("sdPnl").innerHTML=h;
  document.getElementById("sdOvl").classList.add("open");
}

function backToQuadra(){
  document.getElementById("sdOvl").classList.remove("open");
  if(curV)showD(curV);
}

function closeStudyDetail(){
  document.getElementById("sdOvl").classList.remove("open");
  curSid=null;
}
function toggleStudyRandomizado(qid,sid){
  if(_bloqueadoPorFinalizacao(qid,sid)) return;
  var q=data[qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===sid});
  if(!study)return;
  study=normalizeStudy(study);
  study.randomizado=!study.randomizado;
  if(study.randomizado) ensureStudyRandomizacao(study);
  save();
  openStudyDetail(qid,sid);
}
var _rzCtx=null;
function openRandomizacaoModal(qid,sid){
  var q=data[qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===sid});
  if(!study)return;
  study=normalizeStudy(study); study.randomizado=true; ensureStudyRandomizacao(study);
  _rzCtx={qid:qid,sid:sid};
  var m=document.getElementById('rzModal');
  if(!m){ m=document.createElement('div'); m.id='rzModal'; m.onclick=function(e){ if(e.target===m) closeRandomizacaoModal(); }; document.body.appendChild(m); }
  var ids=(study.tratamentos||[]).map(function(t){return t.id;}).join(', ');
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:flex-start;justify-content:center;z-index:3300;overflow:auto;padding:18px 10px';
  m.innerHTML='<div style="background:#0d150d;border:1px solid #2a3a2a;border-radius:12px;width:520px;max-width:96vw;color:#d0d8d0;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.6)">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-size:16px;font-weight:800;color:#afa">Randomização</div><div style="font-size:11px;color:#8aa88a;margin-top:2px">'+esc(study.tratamentos.length+' tratamentos × '+study.numRepeticoes+' repetições')+'</div></div><button onclick="closeRandomizacaoModal()" style="background:none;border:none;color:#aaa;font-size:24px;cursor:pointer">×</button></div>'+
    '<div style="font-size:12px;color:#9a8;line-height:1.5;margin-bottom:8px">Cole uma repetição por linha, na ordem das parcelas. Pode usar <b>T1 T3 T2</b> ou só <b>1 3 2</b>. Tratamentos esperados: '+esc(ids)+'.</div>'+
    '<textarea id="rzText" rows="9" style="width:100%;box-sizing:border-box;background:#050805;border:1px solid #2a3a2a;color:#eaf3ed;border-radius:8px;padding:10px;font:14px ui-monospace,Menlo,monospace;line-height:1.45">'+esc(randomizacaoToText(study))+'</textarea>'+
    '<div id="rzErr" style="min-height:18px;color:#ff9a8a;font-size:12px;margin-top:7px"></div>'+
    '<div style="border-top:1px solid #1a2a1a;margin-top:10px;padding-top:10px">'+
      '<div style="font-size:12px;font-weight:800;color:#9ac49a;margin-bottom:6px">Biblioteca de randomizações ('+RZLIB.length+'/20)</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><input id="rzLibName" value="'+esc(study.codigo||'Randomização')+'" placeholder="Nome para salvar" style="flex:1;min-width:170px;background:#050805;border:1px solid #2a3a2a;color:#eaf3ed;border-radius:8px;padding:9px;font-size:13px"><button onclick="saveRandomizacaoLibrary()" style="background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:9px 11px;font-weight:800;cursor:pointer">Salvar na biblioteca</button></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><select id="rzLibSelect" style="flex:1;min-width:190px;background:#050805;border:1px solid #2a3a2a;color:#eaf3ed;border-radius:8px;padding:9px;font-size:13px">'+_rzLibOptions(study)+'</select><button onclick="applyRandomizacaoLibrary()" style="background:#18251b;color:#9ac49a;border:1px solid #2a3a2a;border-radius:8px;padding:9px 11px;font-weight:800;cursor:pointer">Usar salva</button><button onclick="deleteRandomizacaoLibrary()" style="background:#3a1a1a;color:#f8a0a0;border:1px solid #5a2a2a;border-radius:8px;padding:9px 11px;font-weight:800;cursor:pointer">Excluir</button></div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;margin-top:12px"><button onclick="saveRandomizacaoModal()" style="flex:1;background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:11px;font-weight:800;cursor:pointer">Salvar ordem</button><button onclick="resetRandomizacaoAuto()" style="background:#18251b;color:#9ac49a;border:1px solid #2a3a2a;border-radius:8px;padding:11px;font-weight:800;cursor:pointer">Gerar automática</button><button onclick="closeRandomizacaoModal()" style="background:#222;color:#bbb;border:none;border-radius:8px;padding:11px;font-weight:800;cursor:pointer">Cancelar</button></div>'+
  '</div>';
  setTimeout(function(){ var t=document.getElementById('rzText'); if(t)t.focus(); },60);
}
function closeRandomizacaoModal(){ var m=document.getElementById('rzModal'); if(m)m.style.display='none'; _rzCtx=null; }
function saveRandomizacaoModal(){
  if(!_rzCtx)return;
  var q=data[_rzCtx.qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===_rzCtx.sid});
  if(!study)return;
  study=normalizeStudy(study);
  var txt=document.getElementById('rzText').value, parsed=parseRandomizacaoText(study,txt), err=document.getElementById('rzErr');
  if(!parsed.ok){ if(err)err.textContent=parsed.msg; return; }
  study.randomizado=true; study.randomizacao=parsed.randomizacao;
  var qid=_rzCtx.qid, sid=_rzCtx.sid;
  save(); closeRandomizacaoModal(); openStudyDetail(qid,sid);
}
function saveRandomizacaoLibrary(){
  if(!_rzCtx)return;
  var q=data[_rzCtx.qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===_rzCtx.sid});
  if(!study)return;
  study=normalizeStudy(study);
  var txt=document.getElementById('rzText').value, parsed=parseRandomizacaoText(study,txt), err=document.getElementById('rzErr');
  if(!parsed.ok){ if(err)err.textContent=parsed.msg; return; }
  var name=(document.getElementById('rzLibName').value||'Randomização').trim()||'Randomização';
  var key=_studyProtocolKey(study), existing=RZLIB.find(function(x){return x.key===key && x.nome.toLowerCase()===name.toLowerCase();});
  var item=existing||{id:'rz'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)};
  item.nome=name; item.key=key; item.texto=String(txt||'').trim(); item.randomizacao=parsed.randomizacao; item.updatedAt=Date.now();
  RZLIB=RZLIB.filter(function(x){return x.id!==item.id;});
  RZLIB.unshift(item);
  saveRZLib();
  if(err)err.style.color='#9ac49a',err.textContent='Randomização salva na biblioteca ('+RZLIB.length+'/20).';
  var qid=_rzCtx.qid, sid=_rzCtx.sid;
  setTimeout(function(){ if(_rzCtx) openRandomizacaoModal(qid,sid); },300);
}
function applyRandomizacaoLibrary(){
  if(!_rzCtx)return;
  var sel=document.getElementById('rzLibSelect'), id=sel&&sel.value, item=RZLIB.find(function(x){return x.id===id;});
  if(!item){ var err=document.getElementById('rzErr'); if(err)err.textContent='Escolha uma randomização salva.'; return; }
  var q=data[_rzCtx.qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===_rzCtx.sid});
  if(!study)return;
  study=normalizeStudy(study);
  var parsed=parseRandomizacaoText(study,item.texto), err=document.getElementById('rzErr');
  if(!parsed.ok){ if(err)err.textContent=parsed.msg; return; }
  study.randomizado=true; study.randomizacao=parsed.randomizacao;
  var qid=_rzCtx.qid, sid=_rzCtx.sid;
  save(); closeRandomizacaoModal(); openStudyDetail(qid,sid);
}
function deleteRandomizacaoLibrary(){
  var sel=document.getElementById('rzLibSelect'), id=sel&&sel.value, item=RZLIB.find(function(x){return x.id===id;});
  if(!item)return;
  requireDeletePassword('Excluir a randomização salva "'+item.nome+'".', function(){
    RZLIB=RZLIB.filter(function(x){return x.id!==id;}); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('randomizacoes',id); }catch(e){} /* Etapa 3 */
    saveRZLib();
    if(_rzCtx) openRandomizacaoModal(_rzCtx.qid,_rzCtx.sid);
  });
}
function resetRandomizacaoAuto(){
  if(!_rzCtx)return;
  var q=data[_rzCtx.qid]||{}, study=(q.estudos||[]).find(function(s){return s.id===_rzCtx.sid});
  if(!study)return;
  study=normalizeStudy(study); study.randomizado=true; study.randomizacao=buildRandomizacao(study);
  var qid=_rzCtx.qid, sid=_rzCtx.sid;
  save(); closeRandomizacaoModal(); openStudyDetail(qid,sid);
}

/* ============ AÇÕES RÁPIDAS ============ */
function quickAddAplicacao(){
  if(_bloqueadoPorFinalizacao(curV,curSid)) return;
  var q=data[curV],study=(q.estudos||[]).find(function(s){return s.id===curSid});
  if(!study)return;
  normalizeStudy(study);
  openStudyEditAplicacao("__new__");
}

function quickAddAvaliacao(){
  if(_bloqueadoPorFinalizacao(curV,curSid)) return;
  var q=data[curV],study=(q.estudos||[]).find(function(s){return s.id===curSid});
  if(!study)return;
  normalizeStudy(study);
  openStudyEditAvaliacao("__new__");
}

function removeAplicacao(id){
  var qid=curV, sid=curSid;
  if(_bloqueadoPorFinalizacao(qid,sid)) return;
  requireDeletePassword('Remover esta aplicação registrada.', function(){
    safetyBackup('antes de excluir aplicação');
    var q=data[qid],study=(q.estudos||[]).find(function(s){return s.id===sid});
    var ap=study.aplicacoes.find(function(a){return a.id===id});
    var details = ap ? ('Data: ' + ap.data + (ap.bbch ? ' (BBCH ' + ap.bbch + ')' : '')) : 'ID: ' + id;
    _markDeleted(study,'_deletedAplicacoes',id); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('aplicacoes',id); }catch(e){} /* Etapa 3 */
    study.aplicacoes=study.aplicacoes.filter(function(a){return a.id!==id});
    logStudyAuditInObject(study, 'Remoção de Aplicação', details);
    save();
    openStudyDetail(qid,sid);
  });
}

function removeAvaliacaoV2(id){
  var qid=curV, sid=curSid;
  if(_bloqueadoPorFinalizacao(qid,sid)) return;
  requireDeletePassword('Remover esta avaliação e os resultados preenchidos nela.', function(){
    safetyBackup('antes de excluir avaliação');
    var q=data[qid],study=(q.estudos||[]).find(function(s){return s.id===sid});
    var av=study.avaliacoes.find(function(a){return a.id===id});
    var details = av ? ('Data: ' + av.data + (av.tipo ? ' (' + av.tipo + ')' : '')) : 'ID: ' + id;
    _markDeleted(study,'_deletedAvaliacoes',id); try{ if(typeof dbSoftDeleteAval==='function') dbSoftDeleteAval(sid,id); }catch(e){} /* Etapa 3 */
    study.avaliacoes=study.avaliacoes.filter(function(a){return a.id!==id});
    logStudyAuditInObject(study, 'Remoção de Avaliação', details);
    save();
    openStudyDetail(qid,sid);
  });
}

function confirmDeleteStudy(qid,sid){
  requireDeletePassword('Excluir este estudo e seus resultados.', function(){
    safetyBackup('antes de excluir estudo');
    var q=data[qid];
    _markDeleted(q,'_deletedStudies',sid); try{ if(typeof dbSoftDelete==='function') dbSoftDelete('estudos',sid); }catch(e){} /* Etapa 3 */
    q.estudos=(q.estudos||[]).filter(function(s){return s.id!==sid});
    save();
    closeStudyDetail();
    showD(qid);
  });
}

/* ============ EDIT MODAL PRINCIPAL DO ESTUDO ============ */
var workingStudy=null;

function openStudyEditV2(qid,sid){
  if(_bloqueadoPorFinalizacao(qid,sid)) return;
  curV=qid;curSid=sid;
  var q=data[qid];
  var existing=(q.estudos||[]).find(function(s){return s.id===sid});
  if(existing){
    workingStudy=JSON.parse(JSON.stringify(normalizeStudy(existing)));
  }else{
    workingStudy=newStudy();
    curSid=workingStudy.id;
  }
  renderStudyEditModal();
  document.getElementById("seOvl").classList.add("open");
}

function openNewStudy(qid){
  curV=qid;
  workingStudy=newStudy();
  curSid=workingStudy.id;
  renderStudyEditModal();
  document.getElementById("seOvl").classList.add("open");
}

/* ===== Protocolo inteligente: modelo.xls -> estudo Agracta =====
   Aceita arquivo .xls/.xlsx ou a grade copiada do Excel/Sheets. O parser lê
   rótulos, tratamentos, programação e também avaliações já preenchidas. */
function _protoNorm(v){
  return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
}
function _protoEmpty(v){ return v==null || String(v).trim()===''; }
function _protoNum(v){
  if(typeof v==='number' && isFinite(v)) return v;
  var s=String(v==null?'':v).trim().replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
  var n=parseFloat(s.replace(/[^\d.+-]/g,'')); return isFinite(n)?n:null;
}
function _protoIso(v){
  if(v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
  if(typeof v==='number' && v>20000 && v<90000){ var d0=new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000); return d0.toISOString().slice(0,10); }
  var s=String(v==null?'':v).trim(), m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if(m){ var y=+m[3]; if(y<100)y+=2000; return String(y).padStart(4,'0')+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0'); }
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return '';
}
function _protoAddDays(iso,n){ if(!iso)return ''; var d=new Date(iso+'T12:00:00'); if(isNaN(d))return ''; d.setDate(d.getDate()+(parseInt(n)||0)); return d.toISOString().slice(0,10); }
/* Parser de área-de-transferência (Excel/Sheets): respeita campos entre aspas com TAB e
   QUEBRA DE LINHA internos (cabeçalhos multilinha tipo "Concentração\n(g/kg)"). Um split('\n')
   ingênuo quebrava esses campos em duas linhas e desalinhava a tabela inteira. */
function _clipToAoa(text){
  text=String(text==null?'':text).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  var rows=[], row=[], field='', inQ=false, started=false, i=0, n=text.length;
  function endField(){ row.push(field); field=''; started=false; }
  function endRow(){ endField(); rows.push(row); row=[]; }
  while(i<n){ var ch=text[i];
    if(inQ){
      if(ch==='"'){ if(text[i+1]==='"'){ field+='"'; i+=2; continue; } inQ=false; i++; continue; }
      field+=ch; i++; continue;
    }
    if(ch==='"' && !started){ inQ=true; started=true; i++; continue; }
    if(ch==='\t'){ endField(); i++; continue; }
    if(ch==='\n'){ endRow(); i++; continue; }
    field+=ch; started=true; i++;
  }
  if(started||field!==''||row.length){ endRow(); }
  return rows;
}
function _protoRowsText(text){ return _clipToAoa(text); }
function _protoValue(rows,labels){
  labels=labels.map(_protoNorm);
  for(var r=0;r<rows.length;r++) for(var c=0;c<(rows[r]||[]).length;c++){
    var n=_protoNorm(rows[r][c]);
    if(!n)continue;
    for(var i=0;i<labels.length;i++) if(n===labels[i] || n.indexOf(labels[i])===0){
      for(var j=c+1;j<Math.min((rows[r]||[]).length,c+4);j++) if(!_protoEmpty(rows[r][j])) return rows[r][j];
      return '';
    }
  }
  return '';
}
function _protoSchedule(rows,start,intervalo){
  var txt='', limit=Math.min(rows.length,80);
  for(var r=0;r<limit;r++) for(var c=0;c<(rows[r]||[]).length;c++){
    var s=String(rows[r][c]||''); if(/\b\d+\s*DA[A-Z]\b/i.test(s)) txt+=' '+s;
  }
  var out=[], seen={}, re=/\b(\d+)\s*DA([A-Z])\b/gi, m;
  while((m=re.exec(txt))){
    var app=Math.max(0,m[2].toUpperCase().charCodeAt(0)-65), d=_protoAddDays(start,app*(parseInt(intervalo)||0)+parseInt(m[1]));
    if(d&&!seen[d]){seen[d]=1;out.push(d);}
  }
  return out.sort();
}
function _protoVariableTitle(title,idx){
  var s=String(title||'').replace(/AVALIA[CÇ][AÃ]O/ig,'').replace(/[—–]/g,'-').replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,'').replace(/\b\d+\s*DA[A-Z](?:\s*-\s*[A-Za-z0-9]+)?\b/ig,'').replace(/m[eé]todo de avalia[cç][aã]o/ig,'').replace(/[\/·:]+/g,' ').replace(/\s*-\s*-\s*/g,' ').replace(/\s+/g,' ').trim().replace(/^[-\s]+|[-\s]+$/g,'');
  if(!s || /^x$/i.test(s) || /-\s*x/i.test(s)) return 'Avaliação '+(idx+1);
  return s.replace(/^[-\s]+|[-\s]+$/g,'') || ('Avaliação '+(idx+1));
}
function _protoDateTitle(title,start,intervalo,fallback){
  var s=String(title||''), d=_protoIso((s.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/)||[])[0]||'');
  if(d)return d;
  var m=s.match(/\b(\d+)\s*DA([A-Z])\b/i);
  if(m) return _protoAddDays(start,(m[2].toUpperCase().charCodeAt(0)-65)*(parseInt(intervalo)||0)+parseInt(m[1]));
  return fallback||'';
}
function _protoClima(rows){
  /* Bloco "Dados climáticos relativos à aplicação": rótulos numa coluna (onde está "Aplicação"),
     uma coluna por aplicação (1..8) à direita. Devolve registros na MESMA forma da aplicação
     do estudo (inicio/fim.clima.temp/umidade/vento, hora, bbch) — fecha o round-trip com o export. */
  var hr=-1, labCol=-1;
  for(var r=0;r<Math.min(rows.length,40)&&hr<0;r++){ var row=rows[r]||[];
    for(var c=10;c<row.length;c++){ if(_protoNorm(row[c])==='aplicacao'){ hr=r; labCol=c; break; } } }
  if(hr<0) return [];
  var appCols=[], hrow=rows[hr]||[];
  for(var c2=labCol+1;c2<hrow.length;c2++){ var n=_protoNum(hrow[c2]); if(n!=null&&n>0&&n<=20) appCols.push({n:Math.round(n),c:c2}); }
  if(!appCols.length) return [];
  function lus(v){ return _protoNorm(v).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
  function findRow(labels){
    var L=labels.map(lus);
    for(var rr=hr;rr<Math.min(rows.length,hr+40);rr++){ var v=lus((rows[rr]||[])[labCol]);
      if(!v)continue; for(var i=0;i<L.length;i++) if(v===L[i]||v.indexOf(L[i])===0) return rr; }
    return -1;
  }
  var R={ data:findRow(['data da aplicacao','data de aplicacao']), hIni:findRow(['horario inicial']), hFim:findRow(['horario final']),
    tIni:findRow(['t c inicial','temperatura inicial']), tFim:findRow(['t c final','temperatura final']),
    urIni:findRow(['ur inicial','umidade inicial']), urFim:findRow(['ur final','umidade final']),
    vIni:findRow(['vento km h inicial','vento inicial']), vFim:findRow(['vento km h final','vento final']),
    neb:findRow(['nebulosidade']), bbch:findRow(['estadio fenologico','estadio']) };
  function cell(ri,col){ if(ri<0)return ''; var v=(rows[ri]||[])[col]; return _protoEmpty(v)?'':v; }
  var out=[];
  appCols.forEach(function(ac){
    var rec={ aplicacao:ac.n, data:_protoIso(cell(R.data,ac.c))||'', bbch:String(cell(R.bbch,ac.c)||'').trim(),
      inicio:{ hora:String(cell(R.hIni,ac.c)||'').trim(), clima:{ temp:_protoNum(cell(R.tIni,ac.c)), umidade:_protoNum(cell(R.urIni,ac.c)), vento:_protoNum(cell(R.vIni,ac.c)) } },
      fim:{ hora:String(cell(R.hFim,ac.c)||'').trim(), clima:{ temp:_protoNum(cell(R.tFim,ac.c)), umidade:_protoNum(cell(R.urFim,ac.c)), vento:_protoNum(cell(R.vFim,ac.c)) } },
      nebulosidade:_protoNum(cell(R.neb,ac.c)) };
    var temNum=[rec.inicio.clima.temp,rec.inicio.clima.umidade,rec.inicio.clima.vento,rec.fim.clima.temp,rec.fim.clima.umidade,rec.fim.clima.vento,rec.nebulosidade].some(function(x){return x!=null;});
    if(rec.data||rec.bbch||rec.inicio.hora||rec.fim.hora||temNum) out.push(rec);
  });
  return out;
}
function parseStudyProtocolRows(rows,nomeArquivo){
  rows=(rows||[]).map(function(r){return Array.isArray(r)?r:[];});
  var meta={
    status:_protoValue(rows,['status do estudo']), objetivo:_protoValue(rows,['objetivo do estudo']),
    proposta:_protoValue(rows,['proposta comercial']), ret:_protoValue(rows,['ret ou dispensa']),
    cultivar:_protoValue(rows,['cultivar']), equipamento:_protoValue(rows,['equipamento']),
    codigo:_protoValue(rows,['numero de estudo','número de estudo']), diretor:_protoValue(rows,['diretor de estudo']),
    plantio:_protoIso(_protoValue(rows,['data de plantio','data de planito'])), pressao:_protoValue(rows,['pressao de trabalho']),
    municipio:_protoValue(rows,['municipio']), tecnico:_protoValue(rows,['tecnico de campo']),
    emergencia:_protoIso(_protoValue(rows,['data de emergencia'])), volumeCalda:_protoValue(rows,['volume de calda']),
    uf:_protoValue(rows,['uf']), cultura:_protoValue(rows,['cultura']), espacamento:_protoValue(rows,['espacamento de plantio']),
    ponta:_protoValue(rows,['ponta de pulverizacao']), latitude:_protoValue(rows,['latitude']), alvo:_protoValue(rows,['alvo']),
    tamanhoParcela:_protoValue(rows,['tamanho da parcela']), bicos:_protoValue(rows,['n° de bicos','n de bicos']),
    longitude:_protoValue(rows,['longitude']), inicio:_protoIso(_protoValue(rows,['data de inicio (1a aplicacao)','data de início (1ª aplicação)'])),
    populacao:_protoValue(rows,['populacao']), distanciaBico:_protoValue(rows,['distancia entre o bico','distancia bico-cultura']),
    altitude:_protoValue(rows,['altitude']), termino:_protoIso(_protoValue(rows,['data de termino'])),
    quadra:_protoValue(rows,['quadra']), delineamento:_protoValue(rows,['delineamento estatistico','deliniamento estatistico']),
    estacao:_protoValue(rows,['estacao experimental']), numTrat:_protoNum(_protoValue(rows,['numero de tratamentos'])),
    adjuvante:_protoValue(rows,['adjuvante utilizado']), endereco:_protoValue(rows,['endereco']),
    repeticoes:_protoNum(_protoValue(rows,['numero de repeticoes'])), classeSolo:_protoValue(rows,['classe de solo'])
  };
  var hrow=-1;
  for(var r=0;r<rows.length;r++){
    var nr=(rows[r]||[]).slice(0,12).map(_protoNorm);
    if(nr.some(function(x){return x==='tratamentos';}) && nr.some(function(x){return x.indexOf('dose')===0;})){hrow=r;break;}
  }
  var trats=[], maxTrat=Math.max(0,parseInt(meta.numTrat)||0), numAp=null, intAp=null;
  if(hrow>=0){
    for(var rr=hrow+1;rr<Math.min(rows.length,hrow+80);rr++){
      var row=rows[rr]||[], n=parseInt(_protoNum(row[0]));
      if(!(n>0))break;
      var tem=row.slice(1,10).some(function(v){return !_protoEmpty(v);});
      if(!tem && (!maxTrat || n>maxTrat))continue;
      var prod=String(row[1]||'').trim(), testemunha=/testemunha|controle|check/i.test(prod);
      trats.push({id:'T'+n,produto:prod.replace(/\s*\((testemunha|controle|check)\)\s*/ig,'').trim(),
        ingredienteAtivo:String(row[2]||'').trim(),concentracao:String(row[3]||'').trim(),dose:String(row[4]||'').trim(),
        concentracaoAtivo:String(row[5]||'').trim(),volume:String(row[8]||'').trim(),adjuvante:String(row[9]||'').trim(),
        testemunha:testemunha,obs:''});
      var _na=_protoNum(row[6]); if(_na!=null&&_na>0&&(numAp==null||_na>numAp))numAp=_na; /* máx. de aplicações entre tratamentos: testemunha (0) não define o estudo */
      var _ia=_protoNum(row[7]); if(_ia!=null&&_ia>0&&intAp==null)intAp=_ia;
    }
  }
  if(!trats.length && maxTrat) for(var ti=1;ti<=maxTrat;ti++)trats.push(newTratamento(ti));
  var numAplicacoes=Math.max(1,parseInt(numAp)||1), intervalo=Math.max(0,parseInt(intAp)||0);
  var schedule=_protoSchedule(rows,meta.inicio,intervalo), avals=[], byDate={};
  schedule.forEach(function(d){ var a={id:'auto_'+d,data:d,tipo:'',bbch:'',obs:'',variaveis:[],tipos:{},notas:{},auto:true,_ts:Date.now()}; avals.push(a);byDate[d]=a; }); /* _ts: lápide de exclusão antiga não engole a avaliação importada agora */
  var erow=-1;
  for(var er=0;er<Math.min(rows.length,80);er++){
    var hits=0; for(var ec=11;ec<(rows[er]||[]).length;ec++)if(_protoNorm(rows[er][ec]).indexOf('avaliacao')===0)hits++;
    if(hits>=1){erow=er;break;}
  }
  if(erow>=0){
    for(var b=0;b<21;b++){
      var c0=11+b*8, title=(rows[erow]||[])[c0], vals=[], hasNonZero=false, hasAny=false;
      for(var tix=0;tix<trats.length;tix++) for(var rp=1;rp<=4;rp++){
        var raw=(rows[erow+2+tix]||[])[c0+rp]; vals.push(raw);
        if(!_protoEmpty(raw)){hasAny=true;var nn=_protoNum(raw);if(nn!=null&&Math.abs(nn)>1e-12)hasNonZero=true;}
      }
      var customTitle=title && !/x daa-x|m[eé]todo de avalia[cç][aã]o\s*-\s*x/i.test(String(title));
      if(!hasAny || (!hasNonZero&&!customTitle))continue;
      var date=_protoDateTitle(title,meta.inicio,intervalo,schedule[b]||''), variable=_protoVariableTitle(title,b);
      if(!date)date=_protoAddDays(meta.inicio,b*7);
      var av=byDate[date]; if(!av){av={id:'xls_'+date,data:date,tipo:variable,bbch:'',obs:'',variaveis:[],tipos:{},notas:{},auto:false};byDate[date]=av;avals.push(av);}
      if(av.variaveis.indexOf(variable)<0)av.variaveis.push(variable);
      for(var tj=0;tj<trats.length;tj++) for(var rep=1;rep<=4;rep++){
        var rawv=(rows[erow+2+tj]||[])[c0+rep]; if(_protoEmpty(rawv))continue;
        var key=trats[tj].id+'R'+rep; (av.notas[key]=av.notas[key]||{})[variable]=rawv;
      }
    }
  }
  avals.sort(function(a,b){return (a.data||'').localeCompare(b.data||'');});
  return {meta:meta,tratamentos:trats,numAplicacoes:numAplicacoes,intervaloDias:intervalo,
    numRepeticoes:Math.max(1,parseInt(meta.repeticoes)||4),avaliacoes:avals,clima:_protoClima(rows),
    origem:{nome:nomeArquivo||'conteúdo colado',importadoEm:new Date().toISOString(),formato:'modelo.xls Agracta'}};
}
function _mergeProtocolAvaliacoes(existing,incoming){
  var out=(existing||[]).map(function(a){return JSON.parse(JSON.stringify(a));}), by={}; out.forEach(function(a){if(a.data)by[a.data]=a;});
  (incoming||[]).forEach(function(a){ if(a.data&&by[a.data])_fundeAval(by[a.data],a); else{out.push(a);if(a.data)by[a.data]=a;} });
  return out.sort(function(a,b){return (a.data||'').localeCompare(b.data||'');});
}
function _mergeProtocolClima(existing,clima){
  /* Mescla clima do protocolo nas aplicações do estudo sem clobberar dados já registrados em campo:
     casa por data; se não houver, casa por nº de aplicação importada antes; senão cria registro novo. */
  var out=(existing||[]).map(function(a){return JSON.parse(JSON.stringify(a));});
  function fillClima(dst,src){ dst.clima=dst.clima||{}; ['temp','umidade','vento'].forEach(function(k){ if((dst.clima[k]==null||dst.clima[k]==='')&&src.clima&&src.clima[k]!=null)dst.clima[k]=src.clima[k]; }); if(!dst.hora&&src.hora)dst.hora=src.hora; }
  (clima||[]).forEach(function(c){
    var m=null;
    if(c.data) m=out.find(function(a){return a.data===c.data;});
    if(!m) m=out.find(function(a){return a._fromProtocolo&&a.aplicacao===c.aplicacao;});
    if(m){
      if(!m.data&&c.data)m.data=c.data; if(!m.bbch&&c.bbch)m.bbch=c.bbch;
      m.inicio=m.inicio||{}; fillClima(m.inicio,c.inicio);
      m.fim=m.fim||{}; fillClima(m.fim,c.fim);
      if(m.nebulosidade==null&&c.nebulosidade!=null)m.nebulosidade=c.nebulosidade;
    } else {
      out.push({ id:(typeof uid==='function'?uid():'apl_'+c.aplicacao+'_'+Date.now()), data:c.data||'', bbch:c.bbch||'',
        aplicacao:c.aplicacao, inicio:c.inicio, fim:c.fim, nebulosidade:c.nebulosidade, _fromProtocolo:true });
    }
  });
  return out.sort(function(a,b){return (a.data||'').localeCompare(b.data||'');});
}
function applyStudyProtocol(parsed){
  if(!workingStudy||!parsed)return;
  var m=parsed.meta||{};
  if(m.codigo)workingStudy.codigo=String(m.codigo);
  if(m.objetivo)workingStudy.descricao=String(m.objetivo);
  if(m.inicio)workingStudy.dataInicio=m.inicio;
  workingStudy.numAplicacoes=parsed.numAplicacoes||workingStudy.numAplicacoes||1;
  workingStudy.intervaloDias=parsed.intervaloDias!=null?parsed.intervaloDias:workingStudy.intervaloDias;
  workingStudy.numRepeticoes=parsed.numRepeticoes||workingStudy.numRepeticoes||4;
  if(parsed.tratamentos&&parsed.tratamentos.length)workingStudy.tratamentos=parsed.tratamentos;
  if(parsed.avaliacoes&&parsed.avaliacoes.length)workingStudy.avaliacoes=_mergeProtocolAvaliacoes(workingStudy.avaliacoes,parsed.avaliacoes);
  if(parsed.clima&&parsed.clima.length)workingStudy.aplicacoes=_mergeProtocolClima(workingStudy.aplicacoes,parsed.clima);
  workingStudy.objetivo=m.objetivo||workingStudy.objetivo||'';
  workingStudy.alvo=m.alvo||workingStudy.alvo||'';
  workingStudy.delineamento=m.delineamento||workingStudy.delineamento||'';
  if(/dbc|blocos/i.test(workingStudy.delineamento||''))workingStudy.randomizado=true;
  workingStudy.protocolo=m; workingStudy.protocoloOrigem=parsed.origem;
  var ft=(workingStudy.tratamentos||[]).find(function(t){return t.testemunha;}); if(ft)workingStudy.testemunha=ft.id;
  renderStudyEditModal();
  _stxToast('✓ Protocolo lido: '+workingStudy.tratamentos.length+' tratamentos e '+workingStudy.avaliacoes.length+' avaliações');
}
function importStudyProtocolPaste(){
  var ta=document.getElementById('protoPaste'), text=ta?ta.value:'';
  if(!text.trim()){_stxToast('Cole a planilha começando em A1.');return;}
  try{applyStudyProtocol(parseStudyProtocolRows(_protoRowsText(text),'conteúdo colado'));}catch(e){console.error(e);alert('Não consegui reconhecer este protocolo: '+e.message);}
}
function importStudyProtocolFile(inp){
  var file=inp&&inp.files&&inp.files[0]; if(!file)return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      if(!window.XLSX)throw new Error('Leitor de Excel indisponível.');
      var wb=XLSX.read(rd.result,{type:'array',cellDates:true,cellFormula:true});
      var ws=wb.Sheets[wb.SheetNames[0]], rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
      applyStudyProtocol(parseStudyProtocolRows(rows,file.name));
    }catch(e){console.error(e);alert('Não consegui ler a planilha: '+e.message);}
    inp.value='';
  };
  rd.readAsArrayBuffer(file);
}

function renderStudyEditModal(){
  var s=workingStudy;
  var q=data[curV]||{};
  var bbchList=getBBCHList(q.cultura);

  var h='<div class="se-head"><h3>'+((data[curV].estudos||[]).find(function(x){return x.id===s.id})?'Editar estudo':'Novo estudo')+'</h3><button class="se-x" onclick="closeStudyEditV2()">×</button></div>';

  /* NEMATOLOGIA: o registro é só o NÚMERO DO ESTUDO. Matriz (solo/raiz) e o dia
     em DAA são da AMOSTRA, e moram na fila — não aqui. Tratamento, aplicação,
     repetição e programação de avaliação não existem nesse fluxo, então a tela
     não pede nada disso. */
  var _ehNema=(quadraLabTipo(curV)==='Nematologia');
  if(_ehNema){
    h+='<div class="se-field"><label>Número do estudo <span class="req">*</span></label>';
    h+='<input type="text" id="seCodigo" value="'+esc(s.codigo)+'" placeholder="NEM-2026-014" class="se-codigo-input"></div>';
    h+='<div class="se-field"><label>Descrição / objetivo <span style="opacity:.6">opcional</span></label>';
    h+='<textarea id="seDescricao" placeholder="Ex.: levantamento populacional em soja, Fazenda X" rows="2">'+esc(s.descricao)+'</textarea></div>';
    h+='<div class="se-nema-nota">Só o número do estudo é obrigatório aqui.<br>'+
       'As amostras — <b>solo ou raiz</b> e o <b>dia em DAA</b> — você registra na '+
       '<b>fila de amostras</b>, na tela do laboratório, conforme forem chegando.</div>';
    h+='<div class="se-actions"><button class="btn-save" onclick="saveStudyV2()">SALVAR</button><button class="btn-cancel" onclick="closeStudyEditV2()">Cancelar</button></div>';
    document.getElementById("sePnl").innerHTML=h;
    return;
  }

  var po=s.protocoloOrigem||{}, pm=s.protocolo||{};
  h+='<div style="margin:0 0 14px;padding:14px;border:1px solid rgba(52,209,120,.25);border-radius:14px;background:var(--gp-s1,#141816)">'+
    '<div style="font-size:13px;font-weight:850;color:var(--gp-green,#34d178)">Protocolo da planilha</div>'+
    '<div style="font-size:10px;color:var(--gp-text-3,#727c75);line-height:1.45;margin:3px 0 9px">Abra uma cópia do modelo ou copie a planilha inteira e cole abaixo. O Agracta preenche o que reconhecer; o restante continua manual.</div>'+
    '<div style="display:flex;gap:7px;flex-wrap:wrap"><button type="button" onclick="document.getElementById(\'protoFile\').click()" style="background:var(--gp-green-deep,#1d7a44);color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:9px 14px;font-weight:750;cursor:pointer">Abrir .xls/.xlsx</button>'+
    '<input id="protoFile" type="file" accept=".xls,.xlsx,.xlsm" onchange="importStudyProtocolFile(this)" style="display:none">'+
    '<button type="button" onclick="var x=document.getElementById(\'protoPasteBox\');x.style.display=x.style.display===\'none\'?\'block\':\'none\'" style="background:var(--gp-s2,#1a1f1c);color:var(--gp-text-2,#a7b0aa);border:1px solid var(--gp-line-2,rgba(255,255,255,.16));border-radius:10px;padding:9px 14px;font-weight:750;cursor:pointer">Copiar e colar</button></div>'+
    '<div id="protoPasteBox" style="display:none;margin-top:9px"><textarea id="protoPaste" rows="5" placeholder="No Excel/Sheets: selecione tudo a partir de A1, copie e cole aqui." style="width:100%;box-sizing:border-box;background:var(--gp-s2,#0f1211);color:var(--gp-text,#e9ede9);border:1px solid var(--gp-line-2,rgba(255,255,255,.16));border-radius:11px;padding:8px;font:11px/1.4 ui-monospace,Menlo,monospace"></textarea><button type="button" onclick="importStudyProtocolPaste()" style="width:100%;margin-top:6px;background:var(--gp-green-deep,#1d7a44);color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:10px;font-weight:800;cursor:pointer">Ler e preencher o estudo</button></div>'+
    (po.nome?'<div style="margin-top:9px;padding-top:8px;border-top:1px solid var(--gp-line,rgba(255,255,255,.09));font-size:10px;color:var(--gp-text-3,#727c75)"><b style="color:var(--gp-text,#e9ede9)">'+esc(po.nome)+'</b> · '+(pm.cultura?esc(pm.cultura):'cultura não informada')+(pm.cultivar?' · '+esc(pm.cultivar):'')+' · '+s.tratamentos.length+' tratamentos · '+s.avaliacoes.length+' avaliações<br><span style="color:var(--gp-text-3,#727c75)">A quadra e o mapa não são alterados pela importação.</span></div>':'')+
    '</div>';

  h+='<div class="se-field"><label>Código do estudo <span class="req">*</span></label>';
  h+='<input type="text" id="seCodigo" value="'+esc(s.codigo)+'" placeholder="EST-2026-0847" class="se-codigo-input"></div>';


  h+='<div class="se-field"><label>Tipo de estudo</label><select id="seTipoEstudo"><option value="">—</option>';
  /* numa quadra de lab, oferece só os tipos daquela especialidade (mais o que já
     estiver gravado, para não sumir com o valor de um estudo antigo) */
  var _lt=quadraLabTipo(curV), _tipos=(_lt&&TIPOS_POR_LAB[_lt])?TIPOS_POR_LAB[_lt].slice():TIPOS_ESTUDO.slice();
  if(s.tipoEstudo && _tipos.indexOf(s.tipoEstudo)<0) _tipos.push(s.tipoEstudo);
  _tipos.forEach(function(t){ h+='<option value="'+esc(t)+'"'+(t===s.tipoEstudo?' selected':'')+'>'+esc(t)+'</option>'; });
  h+='</select><div class="e-hint">Define o catálogo de variáveis sugerido ao criar as colunas da avaliação (nome, tipo, sub-amostras e N padrão já certos).</div></div>';

  h+='<div class="se-field"><label>Descrição / objetivo</label>';
  h+='<textarea id="seDescricao" placeholder="Ex: Avaliação de eficácia de fungicidas sistêmicos no controle de ferrugem asiática" rows="3">'+esc(s.descricao)+'</textarea></div>';

  h+='<div class="se-row">';
  h+='<div class="se-field"><label>1ª aplicação</label><input type="date" id="seDataInicio" value="'+esc(s.dataInicio)+'"></div>';
  h+='<div class="se-field"><label>Nº aplicações</label><input type="number" id="seNumAp" value="'+s.numAplicacoes+'" min="1" max="20"></div>';
  h+='<div class="se-field"><label>Intervalo (dias)</label><input type="number" id="seIntervalo" value="'+s.intervaloDias+'" min="0" max="90"></div>';
  h+='</div>';

  /* Quadra de laboratório troca "Preparo de calda" por "Preparo no laboratório":
     os mesmos valores que a calculadora de diluição vai precisar. Em quadra de
     campo nada muda. */
  if(isQuadraLab(curV)){
    var _fo=s.labFonteTipo||'gL';
    h+='<div class="se-section-title">Preparo no laboratório</div>';
    h+='<div class="se-row">';
    h+='<div class="se-field"><label>Volume do pote (mL)</label><input type="number" id="seLabVol" value="'+(s.labVolumeMl||50)+'" min="0" step="1"></div>';
    h+='<div class="se-field"><label>Fonte do produto</label><select id="seLabFonte">'+
      ['gL','gkg','mae','puro'].map(function(k){
        var rot={gL:'Rótulo (g/L)',gkg:'Rótulo (g/kg)',mae:'Solução-mãe (ppm)',puro:'Reagente puro (100%)'}[k];
        return '<option value="'+k+'"'+(k===_fo?' selected':'')+'>'+rot+'</option>';
      }).join('')+'</select></div>';
    h+='<div class="se-field"><label>Valor da fonte</label><input type="text" id="seLabFonteValor" value="'+esc(s.labFonteValor==null?'':String(s.labFonteValor))+'" placeholder="ex.: 340" inputmode="decimal"'+(_fo==='puro'?' disabled':'')+'></div>';
    h+='</div>';
    h+='<div class="se-row">';
    h+='<div class="se-field"><label>Pureza (%) <span style="opacity:.6">opcional</span></label><input type="text" id="seLabPureza" value="'+esc(s.labPureza==null?'':String(s.labPureza))+'" placeholder="100" inputmode="decimal"></div>';
    h+='<div class="se-field"><label>Densidade (g/mL) <span style="opacity:.6">opcional</span></label><input type="text" id="seLabDens" value="'+esc(s.labDensidade==null?'':String(s.labDensidade))+'" placeholder="1,00" inputmode="decimal"></div>';
    h+='</div>';
    h+='<div style="font-size:11px;color:#9a8;margin:-2px 0 8px">Já vêm prontos na 🧪 calculadora de laboratório deste estudo. O volume do pote costuma ser o do falcon (50 mL). Densidade é obrigatória quando a fonte é g/kg.</div>';
  }else{
    h+='<div class="se-section-title">Preparo de calda</div>';
    h+='<div class="se-row">';
    h+='<div class="se-field"><label>Volume morto (mL)</label><input type="number" id="seVolMorto" value="'+(s.volumeMorto||0)+'" min="0" step="1"></div>';
    h+='<div class="se-field"><label>Nº de frascos / preparo</label><input type="number" id="seNumFrascos" value="'+(s.numFrascos||1)+'" min="1" step="1"></div>';
    h+='<div class="se-field"><label>Capacidade do frasco (L)</label><input type="number" id="seCapFrasco" value="'+(s.capacidadeFrasco||0)+'" min="0" step="0.1"></div>';
    h+='</div>';
    h+='<div style="font-size:11px;color:#9a8;margin:-2px 0 8px">Já vêm prontos na 🧪 calculadora de aplicação deste estudo. Volume morto = calda que sobra no equipamento. Capacidade 0 = não conferir se a calda cabe nos frascos.</div>';
  }

  h+='<div class="se-section-title">Avaliações (programação)</div>';
  h+='<div class="se-row">';
  h+='<div class="se-field"><label>1ª avaliação</label><input type="date" id="seAvalInicio" value="'+esc(s.avalInicio||'')+'"></div>';
  h+='<div class="se-field"><label>A cada (dias)</label><input type="number" id="seAvalInt" value="'+(s.avalIntervalo||7)+'" min="1" max="120"></div>';
  h+='<div class="se-field"><label>Nº avaliações</label><input type="number" id="seAvalNum" value="'+(s.avalNum||0)+'" min="0" max="40"></div>';
  h+='</div>';
  h+='<div style="font-size:11px;color:#9a8;margin:-2px 0 8px">Ex.: de 7 em 7, 6 avaliações → o app cria as datas (aparecem na agenda e no estudo). Nº = 0 não gera. Cada data fica editável depois. Se em branco, usa a data da 1ª aplicação.</div>';

  /* Como a dose é definida. Só o laboratório pode ser em ppm — ensaio de campo
     é sempre dose por área. A unidade escolhida é o padrão de quem não escrever
     a unidade na dose, e é ela que sai impressa no rótulo do gráfico e da tabela. */
  var _dm=(s.doseModo==='ppm')?'ppm':'campo';
  if(!isQuadraLab(curV)) _dm='campo';
  h+='<div class="se-section-title">Dose dos tratamentos</div>';
  h+='<div class="se-row">';
  if(isQuadraLab(curV)){
    h+='<div class="se-field"><label>Como a dose é definida</label><select id="seDoseModo" onchange="_seDoseModoSync()">'+
      '<option value="campo"'+(_dm==='campo'?' selected':'')+'>Dose de campo (por área)</option>'+
      '<option value="ppm"'+(_dm==='ppm'?' selected':'')+'>Concentração (ppm)</option>'+
      '</select></div>';
  }
  h+='<div class="se-field" id="seDoseUnidWrap"'+(_dm==='ppm'?' style="display:none"':'')+'><label>Unidade da dose</label><select id="seDoseUnid">'+
    ['L/ha','mL/ha','g/ha','kg/ha'].map(function(u){
      return '<option value="'+u+'"'+(u===s.doseUnidade?' selected':'')+'>'+u+'</option>';
    }).join('')+'</select></div>';
  h+='</div>';
  h+='<div style="font-size:11px;color:#9a8;margin:-2px 0 8px">Sai impressa no rótulo dos tratamentos, no gráfico e na tabela. Tratamento que já traz a unidade escrita na dose (ex.: "500 mL/ha") continua mandando nela — isto aqui só resolve quem escreveu só o número.</div>';

  /* Desenho experimental. Em faixas cada tratamento ocupa uma área própria,
     possivelmente em outra quadra — e aí a "repetição" passa a ser o treço. */
  var _des=(s.desenho==='faixas')?'faixas':'dbc';
  h+='<div class="se-section-title">Desenho do ensaio</div>';
  h+='<div class="se-field"><label>Como os tratamentos estão no campo</label><select id="seDesenho" onchange="_seDesenhoSync()">'+
     '<option value="dbc"'+(_des==='dbc'?' selected':'')+'>Blocos ao acaso, tudo nesta quadra</option>'+
     '<option value="faixas"'+(_des==='faixas'?' selected':'')+'>Faixas — cada tratamento numa área/quadra</option>'+
     '</select></div>';
  h+='<div id="seFaixasWrap"'+(_des==='faixas'?'':' style="display:none"')+'>';
  h+='<div style="font-size:11px;color:#9a8;line-height:1.55;margin:2px 0 8px;padding:8px 10px;border-radius:9px;background:#2a210c;border:1px solid #6b531b;color:#ffd98a">'+
     '<b>Em faixas, cada tratamento aparece uma vez só.</b> Medir vinte pontos dentro da mesma faixa não cria vinte repetições — cria vinte medidas do mesmo pedaço de terra, e a diferença entre faixas carrega solo, declive e bordadura junto com o produto.<br><br>'+
     'Para haver estatística, divida as faixas em <b>treços transversais</b> e amostre os <b>mesmos treços em todas</b>. Cada treço vira um bloco e absorve o gradiente do terreno. É o campo "Treços por faixa" abaixo.<br><br>'+
     'Com 1 treço só, o app entrega médias e diferenças, mas <b>não</b> p-valor — e escreve na folha por quê.</div>';
  var _qOpts=Object.keys(data||{}).filter(function(q){ return q!=='__config' && !isQuadraLab(q); })
    .map(function(q){ return {id:q, nome:quadraNome(q)}; })
    .sort(function(a,b){ return a.nome.localeCompare(b.nome); });
  h+='<div id="seFaixasLista"></div>';
  h+='<div style="font-size:11px;color:#9a8;margin:4px 0 8px">A quadra de cada tratamento é onde ele foi aplicado. A área serve para o relatório — não entra na estatística de severidade e mortalidade, que são proporções.</div>';
  h+='</div>';
  window._seQuadraOpts=_qOpts;

  h+='<div class="se-section-title">Tratamentos</div>';
  var _lblRep=(_des==='faixas')?'Treços por faixa (blocos)':'Repetições por tratamento';
  h+='<div class="se-field"><label id="seRepsLbl">'+_lblRep+'</label><input type="number" id="seReps" value="'+s.numRepeticoes+'" min="1" max="10" style="width:80px"></div>';
  h+='<div class="se-field"><label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;color:#c8d8c8;font-size:13px"><input type="checkbox" id="seRandomizado" '+(s.randomizado?'checked':'')+' style="width:auto"> Estudo randomizado</label><div class="e-hint">Usa automaticamente a ordem randomizada de parcelas para o número de tratamentos e repetições deste protocolo.</div></div>';

  h+='<div class="e-hint" style="margin:2px 0 9px">Marque <b>Testemunha</b> nos tratamentos-controle abaixo (pode mais de uma: ex. testemunha + padrão). A <b>1ª marcada</b> é a base do % de controle e da AUDPC — use a sem aplicação.</div>';
  h+='<div id="seTratList">';
  if(s.tratamentos.length===0){
    h+='<div class="se-empty">Nenhum tratamento. Clique em + para adicionar.</div>';
  }else{
    s.tratamentos.forEach(function(t,i){
      h+='<div class="se-trat" data-idx="'+i+'">';
      h+='<div class="se-trat-head"><span class="se-trat-id">'+esc(t.id)+'</span><button class="se-trat-del" onclick="removeTrat('+i+')">×</button></div>';
      h+='<input type="text" placeholder="Produto" data-f="produto" value="'+esc(t.produto)+'">';
      h+='<div style="display:flex;gap:6px"><input type="text" placeholder="Dose" data-f="dose" value="'+esc(t.dose)+'" style="flex:1"><input type="text" placeholder="V. Calda" data-f="volume" value="'+esc(t.volume)+'" style="flex:1"></div>';
      h+='<input type="text" placeholder="Observações (opcional)" data-f="obs" value="'+esc(t.obs)+'">';
      h+='<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#a8c4b0;text-transform:none;letter-spacing:0;margin-top:3px;cursor:pointer"><input type="checkbox" data-f="testemunha" '+(t.testemunha?'checked':'')+' style="width:auto"> Testemunha / check</label>';
      h+='</div>';
    });
  }
  h+='</div>';
  h+='<button class="se-add-trat" onclick="addTrat()">+ Adicionar tratamento</button>';

  h+='<div class="se-actions"><button class="btn-save" onclick="saveStudyV2()">SALVAR</button><button class="btn-cancel" onclick="closeStudyEditV2()">Cancelar</button></div>';

  document.getElementById("sePnl").innerHTML=h;
  /* A lista de faixas é montada DEPOIS do innerHTML porque depende dos
     tratamentos já renderizados. addTrat/removeTrat redesenham o modal inteiro,
     então ela se refaz sozinha quando um tratamento entra ou sai. */
  try{ if((workingStudy||{}).desenho==='faixas') _seFaixasRender(); }catch(e){}
}

function addTrat(){
  syncStudyInputs();
  var n=workingStudy.tratamentos.length+1;
  workingStudy.tratamentos.push(newTratamento(n));
  renderStudyEditModal();
}

function removeTrat(idx){
  syncStudyInputs();
  workingStudy.tratamentos.splice(idx,1);
  /* Renumera */
  workingStudy.tratamentos.forEach(function(t,i){t.id="T"+(i+1)});
  renderStudyEditModal();
}

function syncStudyInputs(){
  if(!workingStudy)return;
  function el(id){ return document.getElementById(id); }
  function intVal(id,fallback){ var x=el(id), n=x?parseInt(x.value):NaN; return isNaN(n)?fallback:n; }
  var x;
  x=el("seCodigo"); if(x) workingStudy.codigo=x.value.trim();
  x=el("seDescricao"); if(x) workingStudy.descricao=x.value.trim();
  x=el("seTipoEstudo"); if(x) workingStudy.tipoEstudo=x.value;
  x=el("seDataInicio"); if(x) workingStudy.dataInicio=x.value;
  workingStudy.numAplicacoes=intVal("seNumAp",workingStudy.numAplicacoes||1);
  workingStudy.intervaloDias=intVal("seIntervalo",workingStudy.intervaloDias||0);
  workingStudy.numRepeticoes=intVal("seReps",workingStudy.numRepeticoes||4);
  x=el("seVolMorto"); if(x) workingStudy.volumeMorto=Math.max(0,_numBR(x.value,0));
  x=el("seNumFrascos"); if(x) workingStudy.numFrascos=Math.max(1,Math.round(_numBR(x.value,1))||1);
  x=el("seCapFrasco"); if(x) workingStudy.capacidadeFrasco=Math.max(0,_numBR(x.value,0));
  x=el("seLabVol"); if(x) workingStudy.labVolumeMl=Math.max(0,_numBR(x.value,50))||50;
  x=el("seLabFonte"); if(x) workingStudy.labFonteTipo=x.value;
  x=el("seLabFonteValor"); if(x) workingStudy.labFonteValor=x.value.trim();
  x=el("seLabPureza"); if(x) workingStudy.labPureza=x.value.trim();
  x=el("seLabDens"); if(x) workingStudy.labDensidade=x.value.trim();
  x=el("seDesenho"); if(x) workingStudy.desenho=(x.value==='faixas')?'faixas':'dbc';
  _seFaixasLer();
  x=el("seDoseModo"); if(x) workingStudy.doseModo=(x.value==='ppm')?'ppm':'campo';
  x=el("seDoseUnid"); if(x && ['L/ha','mL/ha','g/ha','kg/ha'].indexOf(x.value)>=0) workingStudy.doseUnidade=x.value;
  x=el("seRandomizado"); if(x) workingStudy.randomizado=!!x.checked;
  /* testemunha agora vem dos checkboxes por tratamento (studyTestemunha deriva a referência) */
  x=el("seAvalInicio"); if(x) workingStudy.avalInicio=x.value;
  workingStudy.avalIntervalo=intVal("seAvalInt",workingStudy.avalIntervalo||7);
  workingStudy.avalNum=intVal("seAvalNum",workingStudy.avalNum||0);
  syncTratInputs();
  var _ft=(workingStudy.tratamentos||[]).find(function(t){return t&&t.testemunha;}); workingStudy.testemunha=_ft?_ft.id:''; /* legado s.testemunha reflete os checkboxes (não ressuscita T1) */
}

function syncTratInputs(){
  /* Lê os valores atuais dos inputs para não perder dados ao renderizar */
  var trats=document.querySelectorAll("#seTratList .se-trat");
  trats.forEach(function(el){
    var idx=parseInt(el.getAttribute("data-idx"));
    if(isNaN(idx)||!workingStudy.tratamentos[idx])return;
    var t=workingStudy.tratamentos[idx];
    el.querySelectorAll("input").forEach(function(inp){
      var f=inp.getAttribute("data-f");
      if(f)t[f]=(inp.type==='checkbox')?inp.checked:inp.value;
    });
  });
}

/* Gera datas de avaliação a partir do protocolo (1ª data + a cada X dias + N vezes).
   Aditivo por data; reprograma só os placeholders auto AINDA vazios (não apaga avaliação com dados). */
function gerarAvaliacoesAuto(s){
  if(!s) return 0;
  var start=s.avalInicio||s.dataInicio, iv=parseInt(s.avalIntervalo)||0, n=parseInt(s.avalNum)||0;
  if(!start||n<=0) return 0;
  if(!Array.isArray(s.avaliacoes)) s.avaliacoes=[];
  s.avaliacoes=s.avaliacoes.filter(function(a){
    var vazio=(!a.variaveis||!a.variaveis.length)&&!a.obs&&!a.tipo&&!a.bbch;
    return !(a.auto && vazio);
  });
  var temData={}; s.avaliacoes.forEach(function(a){ if(a.data) temData[a.data]=true; });
  var add=0;
  for(var i=0;i<n;i++){
    var d=(iv>0)?_isoShift(start,i*iv):start;
    if(temData[d]) continue;
    var _avid='auto_'+d;
    /* o id é determinístico por data, então ele SEMPRE colide com uma exclusão anterior da
       mesma data. Limpa a lápide local e carimba _ts para o merge saber que esta é nova. */
    if(s._deletedAvaliacoes) delete s._deletedAvaliacoes[_avid];
    s.avaliacoes.push({id:_avid,data:d,tipo:'',bbch:'',obs:'',variaveis:[],tipos:{},notas:{},auto:true,_ts:Date.now()}); /* id determinístico por data: 2 aparelhos geram o MESMO id -> o merge não duplica */
    temData[d]=true; add++;
  }
  return add;
}
function saveStudyV2(){
  if(_bloqueadoPorFinalizacao(curV,curSid)) return;
  syncStudyInputs();
  var s=workingStudy;

  if(!s.codigo){alert("O código do estudo é obrigatório.");return;}

  gerarAvaliacoesAuto(s);
  if(s.randomizado) ensureStudyRandomizacao(s);
  else s.randomizacao=null;

  var q=data[curV];
  if(!q.estudos)q.estudos=[];
  var idx=q.estudos.findIndex(function(x){return x.id===s.id});

  var action = '';
  var details = '';
  if(idx>=0) {
    action = 'Alteração do Estudo';
    var old = q.estudos[idx];
    var changes = [];
    if(old.codigo !== s.codigo) changes.push('Código: "' + old.codigo + '" -> "' + s.codigo + '"');
    if(old.descricao !== s.descricao) changes.push('Descrição alterada');
    if((old.tipoEstudo||'') !== s.tipoEstudo) changes.push('Tipo de estudo: "' + (old.tipoEstudo||'—') + '" -> "' + (s.tipoEstudo||'—') + '"');
    if(old.dataInicio !== s.dataInicio) changes.push('Início: ' + old.dataInicio + ' -> ' + s.dataInicio);
    if(old.numAplicacoes !== s.numAplicacoes) changes.push('Nº Apls: ' + old.numAplicacoes + ' -> ' + s.numAplicacoes);
    if(old.intervaloDias !== s.intervaloDias) changes.push('Intervalo: ' + old.intervaloDias + ' -> ' + s.intervaloDias);
    if(old.numRepeticoes !== s.numRepeticoes) changes.push('Repetições: ' + old.numRepeticoes + ' -> ' + s.numRepeticoes);
    if(_numBR(old.volumeMorto,0) !== s.volumeMorto) changes.push('Volume morto (mL): ' + _numBR(old.volumeMorto,0) + ' -> ' + s.volumeMorto);
    if(_numBR(old.numFrascos,1) !== s.numFrascos) changes.push('Frascos/preparo: ' + _numBR(old.numFrascos,1) + ' -> ' + s.numFrascos);
    if(_numBR(old.capacidadeFrasco,0) !== s.capacidadeFrasco) changes.push('Capacidade do frasco (L): ' + _numBR(old.capacidadeFrasco,0) + ' -> ' + s.capacidadeFrasco);
    /* preparo no laboratório entra na mesma trilha de auditoria BPL */
    if(_numBR(old.labVolumeMl,50) !== s.labVolumeMl) changes.push('Volume do pote (mL): ' + _numBR(old.labVolumeMl,50) + ' -> ' + s.labVolumeMl);
    if((old.labFonteTipo||'gL') !== s.labFonteTipo) changes.push('Fonte do produto (lab): "' + (old.labFonteTipo||'gL') + '" -> "' + s.labFonteTipo + '"');
    if(String(old.labFonteValor||'') !== String(s.labFonteValor||'')) changes.push('Valor da fonte (lab): "' + (old.labFonteValor||'—') + '" -> "' + (s.labFonteValor||'—') + '"');
    if(String(old.labPureza||'') !== String(s.labPureza||'')) changes.push('Pureza (lab): "' + (old.labPureza||'—') + '" -> "' + (s.labPureza||'—') + '"');
    if(String(old.labDensidade||'') !== String(s.labDensidade||'')) changes.push('Densidade (lab): "' + (old.labDensidade||'—') + '" -> "' + (s.labDensidade||'—') + '"');
    if((old.doseModo||'campo') !== s.doseModo) changes.push('Definição da dose: "' + (old.doseModo||'campo') + '" -> "' + s.doseModo + '"');
    if((old.doseUnidade||'L/ha') !== s.doseUnidade) changes.push('Unidade da dose: "' + (old.doseUnidade||'L/ha') + '" -> "' + s.doseUnidade + '"');
    if(JSON.stringify(old.tratamentos) !== JSON.stringify(s.tratamentos)) changes.push('Tratamentos/Protocolo modificados');
    details = changes.length ? changes.join(', ') : 'Nenhuma alteração nos campos principais';
  } else {
    action = 'Criação do Estudo';
    details = 'Código: "' + s.codigo + '", ' + s.tratamentos.length + ' tratamentos, ' + s.numRepeticoes + ' repetições.';
  }
  logStudyAuditInObject(s, action, details);
  s._ts=Date.now(); /* carimbo: no merge, a edição mais nova vence */

  if(idx>=0)q.estudos[idx]=s;
  else q.estudos.push(s);

  save();
  try{ if(typeof dbUpsertEstudo==='function') dbUpsertEstudo(curV, s); }catch(e){} /* Etapa 3 Fase B */
  _stxToast('✓ Estudo salvo!');
  closeStudyEditV2();
  openStudyDetail(curV,s.id);
}

function closeStudyEditV2(){
  document.getElementById("seOvl").classList.remove("open");
  workingStudy=null;
}

/* ============ EDIT APLICAÇÃO INDIVIDUAL ============ */
var editingAplId=null;
var editingAvId=null;
var draftAp=null; /* aplicação nova pendente, não salva ainda */
var draftAv=null; /* avaliação nova pendente, não salva ainda */

function _nextAplData(study){ /* data padrão da nova aplicação = próxima aplicação PROGRAMADA ainda não registrada (em vez de "hoje") */
  try{ var evs=(typeof studyEventsV2==='function')?studyEventsV2(study):[];
    for(var i=0;i<evs.length;i++){ var e=evs[i];
      if(e.type==='apl' && !e.realizada && e.date && e.date.getFullYear){
        var d=e.date, m=d.getMonth()+1, day=d.getDate();
        return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day;
      }
    }
  }catch(e){}
  return todayISO();
}
/* ===== Janela da aplicação: clima inicial/final + tempo (BPL / modelo) ===== */
function _aplAtual(){
  try{ var q=data[curV], st=(q&&q.estudos||[]).find(function(s){return s.id===curSid;}); if(!st) return null;
    if(editingAplId==='__new__') return draftAp;
    return (st.aplicacoes||[]).find(function(a){return a.id===editingAplId;})||null;
  }catch(e){ return null; }
}
function _aplDur(ap){ try{ if(ap&&ap.inicio&&ap.fim&&ap.inicio.ts&&ap.fim.ts){ var ms=ap.fim.ts-ap.inicio.ts; if(ms>=0){ var min=Math.round(ms/60000); return min>=60?(Math.floor(min/60)+'h'+(min%60?(' '+(min%60)+'min'):'')):(min+'min'); } } }catch(e){} return ''; }
function _aplRenderClimaBox(){
  var box=document.getElementById('aplClimaBox'); if(!box) return; var ap=_aplAtual();
  function ln(rot,o){ if(!o) return '<div style="color:var(--text-3,#8aa88a)">'+rot+': — <span style="font-size:11px">(toque no botão na hora)</span></div>'; var cl=o.clima||{}; return '<div><b style="color:var(--accent,#37d684)">'+rot+'</b> '+esc(o.hora||'')+(cl.temp!=null?' · '+cl.temp+'°C':'')+(cl.umidade!=null?' · '+Math.round(cl.umidade)+'%UR':'')+(cl.vento!=null?' · vento '+cl.vento+'km/h':'')+(cl.clima_falhou?' <span style="color:#dccd8c;font-size:11px">(sem clima — só horário)</span>':'')+'</div>'; }
  var dur=_aplDur(ap);
  box.innerHTML=ln('Início',ap&&ap.inicio)+ln('Fim',ap&&ap.fim)+(dur?('<div style="margin-top:4px;color:var(--accent,#37d684)">⏱ Tempo de aplicação: <b>'+dur+'</b></div>'):'');
}
function aplMarcarClima(qual){
  var ap=_aplAtual(); if(!ap){ if(typeof _stxToast==='function')_stxToast('Abra a aplicação primeiro'); return; }
  if(qual==='fim' && !ap.inicio){ if(typeof _stxToast==='function')_stxToast('Marque o Início primeiro'); return; }
  var now=new Date(), hora=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  var btn=document.getElementById(qual==='inicio'?'aplIniBtn':'aplFimBtn'); if(btn){ btn.disabled=true; var _t=btn.textContent; btn.textContent='Clima…'; btn._txt=_t; }
  function done(cl){
    ap[qual]={ ts:now.getTime(), hora:hora, clima: cl?{fonte:cl.fonte, temp:cl.temp, umidade:cl.umidade, vento:cl.vento, vpd:cl.vpd, chuva:cl.chuva}:{clima_falhou:true} };
    if(btn){ btn.disabled=false; if(btn._txt)btn.textContent=btn._txt; }
    _aplRenderClimaBox();
    /* salva já (o horário/clima é dado de campo no momento — não pode depender de lembrar de Salvar) */
    try{ if(typeof save==='function') save(); if(typeof setUnsavedChanges==='function')setUnsavedChanges(true); if(typeof cloudSaveSoon==='function')cloudSaveSoon(); if(typeof dbUpsertAplicacao==='function'&&editingAplId!=='__new__')dbUpsertAplicacao(curV,curSid,ap); }catch(e){}
    if(typeof _stxToast==='function')_stxToast((qual==='inicio'?'Início':'Fim')+' registrado · '+hora+(cl&&cl.temp!=null?(' · '+cl.temp+'°C'):''));
  }
  try{ _carimboClima(curV, function(cl){ done(cl); }); }catch(e){ done(null); }
}
function openStudyEditAplicacao(aid){
  editingAplId=aid;editingAvId=null;draftAv=null;
  var q=data[curV],study=(q.estudos||[]).find(function(s){return s.id===curSid});
  if(!study){draftAp=null;return;}
  var ap;
  if(aid==="__new__"){
    ap=draftAp||{id:uid(),data:_nextAplData(study),bbch:"",obs:""};
    draftAp=ap;
  }else{
    draftAp=null;
    ap=study.aplicacoes.find(function(a){return a.id===aid});
  }
  if(!ap)return;
  var bbchList=getBBCHList(q.cultura);

  var h='<div class="se-head"><h3>Aplicação'+(aid==="__new__"?' (nova)':'')+'</h3><button class="se-x" onclick="closeEventEdit()">×</button></div>';
  /* Data E hora. Sem a hora, uma aplicação de ontem só podia receber a MÉDIA do
     dia — que mistura a madrugada com a tarde e não é a condição em que se
     aplicou. Com a hora, o carimbo busca a leitura daquele instante na estação. */
  h+='<div class="se-row">';
  h+='<div class="se-field"><label>Data</label><input type="date" id="aeData" value="'+esc(ap.data)+'"></div>';
  h+='<div class="se-field"><label>Hora <span style="opacity:.6">da aplicação</span></label><input type="time" id="aeHora" value="'+esc(ap.hora||'')+'"></div>';
  h+='</div>';
  h+='<div style="font-size:11px;color:#9a8;margin:-2px 0 8px">Preencha a hora quando registrar uma aplicação de outro dia: o clima carimbado passa a ser o da estação NAQUELE horário, não a média do dia.</div>';
  if(bbchList){
    h+='<div class="se-field"><label>Estádio BBCH no momento</label><select id="aeBBCH"><option value="">—</option>';
    bbchList.forEach(function(b){
      h+='<option value="'+esc(b.code)+'"'+(b.code===ap.bbch?' selected':'')+'>'+esc(b.label)+(b.equiv?' ('+esc(b.equiv)+')':'')+'</option>';
    });
    h+='</select></div>';
  }
  var weatherHtml = '<div id="aeWeatherAlert" style="margin-bottom:12px;padding:10px;border-radius:10px;background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);font-size:12px;line-height:1.45">' +
    'Obtendo condições meteorológicas atuais para janela BPL…' +
    '</div>';
  h+=weatherHtml;
  /* Janela da aplicação: clima INICIAL e FINAL (BPL / preenche o modelo) + tempo de aplicação */
  h+='<div class="se-field"><label>Janela da aplicação — clima INICIAL e FINAL</label>'+
    '<div style="display:flex;gap:8px;margin-bottom:7px"><button type="button" id="aplIniBtn" class="btn-sm" style="flex:1" onclick="aplMarcarClima(\'inicio\')">▶ Iniciar</button><button type="button" id="aplFimBtn" class="btn-sm" style="flex:1" onclick="aplMarcarClima(\'fim\')">⏹ Terminar</button></div>'+
    '<div id="aplClimaBox" style="font-size:12px;line-height:1.7;background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);border-radius:9px;padding:8px 10px"></div></div>';
  h+='<div class="se-field"><label>Observações</label><textarea id="aeObs" rows="4" placeholder="Condições climáticas, produtos, ocorrências...">'+esc(ap.obs||"")+'</textarea></div>';
  h+='<div class="se-actions"><button class="btn-save" onclick="saveAplicacao()">SALVAR</button><button class="btn-cancel" onclick="closeEventEdit()">Cancelar</button></div>';

  document.getElementById("eePnl").innerHTML=h;
  _aplRenderClimaBox();
  window._avEditing=true; document.getElementById("eeOvl").classList.add("open");
  
  _carimboClima(curV, function(cl){
    var el = document.getElementById('aeWeatherAlert');
    if(!el) return;
    if(!cl){
      el.innerHTML = '<span class="bpl-warn">⚠️ Não foi possível obter o clima atual para avaliar a janela de pulverização.</span>';
      return;
    }
    var temp = cl.temp;
    var rh = cl.umidade;
    var wind = cl.vento;
    
    var tempOk = (temp != null && temp < 30);
    var rhOk = (rh != null && rh > 50);
    var windOk = (wind != null && wind < 10);
    var allOk = tempOk && rhOk && windOk;
    
    var html = '';
    if(allOk){
      html += '<div class="bpl-ok" style="display:flex;align-items:center;gap:8px;font-weight:700">';
      html += '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#37d684;box-shadow:0 0 8px #37d684"></span>';
      html += 'Janela de Pulverização Ideal (BPL)';
      html += '</div>';
    } else {
      html += '<div class="bpl-bad" style="display:flex;align-items:center;gap:8px;font-weight:700">';
      html += '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff6b6b;box-shadow:0 0 8px #ff6b6b"></span>';
      html += 'Fora da Janela de Pulverização BPL';
      html += '</div>';
    }
    
    html += '<div class="bpl-vals" style="margin-top:5px;font-size:11px;display:flex;flex-wrap:wrap;gap:8px">';
    html += '<span>Temp: <strong'+(tempOk?'':' class="bpl-bad"')+'>'+(temp != null ? temp.toFixed(1)+'°C' : '—')+'</strong></span>';
    html += '<span>UR: <strong'+(rhOk?'':' class="bpl-bad"')+'>'+(rh != null ? Math.round(rh)+'%' : '—')+'</strong></span>';
    html += '<span>Vento: <strong'+(windOk?'':' class="bpl-bad"')+'>'+(wind != null ? wind.toFixed(1)+' km/h' : '—')+'</strong></span>';
    html += '</div>';
    
    el.innerHTML = html;
  });
}

/* ===================== AUTO-CARIMBO (data/hora + GPS + clima + NDVI no registro) ===================== */
var APP_VER='matriz', _lastGps=null;
function _carimboFind(qid,sid,recId,kind){
  var sts=(data[qid]&&data[qid].estudos)||[];
  for(var i=0;i<sts.length;i++){ if(sts[i].id===sid){
    var arr=(kind==='apl')?(sts[i].aplicacoes||[]):(sts[i].avaliacoes||[]);
    for(var j=0;j<arr.length;j++){ if(arr[j].id===recId) return arr[j]; }
  } }
  return null;
}
function _carimboSet(qid,sid,recId,kind,field,val){
  var r=_carimboFind(qid,sid,recId,kind); if(!r) return;
  if(!r.carimbo) r.carimbo={};
  r.carimbo[field]=val; try{ save(); }catch(e){}
  try{ if(curV===qid && curSid===sid && document.getElementById('sdOvl') && document.getElementById('sdOvl').classList.contains('open')) openStudyDetail(qid,sid); }catch(e){}
}
function _carimboLoc(cb){
  if(!navigator.geolocation){ cb(null); return; }
  gpsBest({target:10, maxWait:8000, maxAcc:120}, null, function(b){
    if(b){ _lastGps={lat:b.lat,lng:b.lng,acc:b.acc,ts:Date.now()}; cb({lat:b.lat,lng:b.lng,acc:b.acc}); }
    else cb(_lastGps?{lat:_lastGps.lat,lng:_lastGps.lng,acc:_lastGps.acc,cache:true}:null);
  });
}
function _stationMacForQuadra(qid){
  if(!_climaStations||!_climaStations.length) return null;
  var loc=(typeof QLOCAL==='object'&&QLOCAL&&QLOCAL[qid])||(typeof HOME_LOCAL!=='undefined'?HOME_LOCAL:null);
  var nm=_climaNorm((typeof LOCAIS==='object'&&LOCAIS&&loc&&LOCAIS[loc]&&LOCAIS[loc].nome)||''); if(!nm) return null;
  var i,k;
  for(i=0;i<_climaStations.length;i++){ var sn=_climaNorm(_climaStations[i].name); if(sn&&(sn.indexOf(nm)>=0||nm.indexOf(sn)>=0)) return _climaStations[i].mac; }
  var toks=nm.match(/[a-z]{4,}/g)||[];
  for(i=0;i<_climaStations.length;i++){ var s2=_climaNorm(_climaStations[i].name); for(k=0;k<toks.length;k++){ if(s2.indexOf(toks[k])>=0) return _climaStations[i].mac; } }
  return null;
}
function _carimboClima(qid, dateStr, horaStr, cb){
  /* dateStr = data DO EVENTO (YYYY-MM-DD), horaStr = hora dele (HH:MM, opcional).
     Dia passado busca o histórico; COM hora, a leitura daquele instante na estação
     (fallback Open-Meteo hourly). Sem hora, o resumo do dia, como sempre foi.
     Hoje = tempo real. */
  if(typeof dateStr==='function'){ cb=dateStr; dateStr=null; horaStr=null; }   /* compat: só callback */
  else if(typeof horaStr==='function'){ cb=horaStr; horaStr=null; }            /* compat: (qid,data,cb) */
  var ctr=quadraCenter(qid);
  var hoje=(typeof todayISO==='function')?todayISO():null;
  var isPast = !!(dateStr && hoje && dateStr < hoje);
  function _p(a){ return (a&&a.length)?a[0]:null; }
  function openMeteo(){
    if(!ctr){ cb(null); return; }
    if(isPast){
      /* Com hora conhecida, pega a HORA no arquivo horário — a média diária
         misturaria a madrugada com a tarde e não descreve o momento da aplicação. */
      if(horaStr){
        var ah='https://archive-api.open-meteo.com/v1/archive?latitude='+ctr[0].toFixed(4)+'&longitude='+ctr[1].toFixed(4)+
          '&start_date='+dateStr+'&end_date='+dateStr+
          '&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,wind_speed_10m,shortwave_radiation&timezone=America%2FSao_Paulo';
        fetch(ah).then(function(r){return r.json();}).then(function(j){
          var hh=j&&j.hourly; if(!hh||!hh.time||!hh.time.length){ cb(null); return; }
          var alvo=dateStr+'T'+String(horaStr).slice(0,5);
          var iBest=0, dBest=Infinity;
          for(var i=0;i<hh.time.length;i++){
            var d=Math.abs(new Date(hh.time[i]) - new Date(alvo));
            if(d<dBest){ dBest=d; iBest=i; }
          }
          var g=function(a){ return (a&&a[iBest]!=null)?a[iBest]:null; };
          cb({fonte:'openmeteo-hora',data:dateStr,hora:(hh.time[iBest]||'').slice(11,16),histor:true,instante:true,
              temp:g(hh.temperature_2m),umidade:g(hh.relative_humidity_2m),orvalho:g(hh.dew_point_2m),
              vento:g(hh.wind_speed_10m),chuva:g(hh.precipitation),solar:g(hh.shortwave_radiation)});
        }).catch(function(){ cb(null); });
        return;
      }
      var au='https://archive-api.open-meteo.com/v1/archive?latitude='+ctr[0].toFixed(4)+'&longitude='+ctr[1].toFixed(4)+
        '&start_date='+dateStr+'&end_date='+dateStr+
        '&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max,shortwave_radiation_sum&timezone=America%2FSao_Paulo';
      fetch(au).then(function(r){return r.json();}).then(function(j){ var dd=j&&j.daily; if(!dd||!dd.time||!dd.time.length){cb(null);return;}
        cb({fonte:'openmeteo-hist',data:dateStr,histor:true,temp:_p(dd.temperature_2m_mean),temp_min:_p(dd.temperature_2m_min),temp_max:_p(dd.temperature_2m_max),umidade:_p(dd.relative_humidity_2m_mean),vento:_p(dd.wind_speed_10m_max),chuva:_p(dd.precipitation_sum),solar:_p(dd.shortwave_radiation_sum)}); }).catch(function(){ cb(null); });
      return;
    }
    var url='https://api.open-meteo.com/v1/forecast?latitude='+ctr[0].toFixed(4)+'&longitude='+ctr[1].toFixed(4)+'&current=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,vapour_pressure_deficit,shortwave_radiation&timezone=America%2FSao_Paulo';
    fetch(url).then(function(r){return r.json();}).then(function(j){ var c=j&&j.current; if(!c){cb(null);return;}
      cb({fonte:'openmeteo',data:dateStr||hoje,hora:c.time,temp:c.temperature_2m,umidade:c.relative_humidity_2m,orvalho:c.dew_point_2m,vpd:c.vapour_pressure_deficit,pressao:c.surface_pressure,vento:c.wind_speed_10m,rajada:c.wind_gusts_10m,vento_dir:c.wind_direction_10m,chuva:c.precipitation,solar:c.shortwave_radiation}); }).catch(function(){ cb(null); });
  }
  function station(){
    var mac=_stationMacForQuadra(qid); if(!mac){ openMeteo(); return; }
    var ep = isPast ? (NDVI_PROXY+'/clima/historico?mac='+encodeURIComponent(mac)+'&date='+encodeURIComponent(dateStr)
                       + (horaStr?('&hora='+encodeURIComponent(String(horaStr).slice(0,5))):''))
                    : (NDVI_PROXY+'/clima?mac='+encodeURIComponent(mac));
    fetch(ep).then(function(r){return r.json();}).then(function(d){
      if(!d||d.error){ openMeteo(); return; }
      function v(n){ return (n&&n.value!=null)?n.value:null; }
      /* sem_amostra = a estação não tinha leitura perto do horário pedido; melhor
         cair no satélite do que carimbar um valor de duas horas depois. */
      if(d.sem_amostra){ openMeteo(); return; }
      cb({fonte:(isPast?(d.instante?'estacao-hora':'estacao-hist'):'estacao'),data:(d.date||dateStr||hoje),
          histor:!!isPast,instante:!!d.instante,defasagem_s:(d.defasagem_s!=null?d.defasagem_s:null),
          dia:(d.dia||null),mac:mac,hora:(d.hora||d.time),temp:v(d.temp),temp_min:v(d.temp_min),temp_max:v(d.temp_max),umidade:v(d.humidity),orvalho:v(d.dew_point),vpd:v(d.vpd),pressao:v(d.pressure),vento:v(d.wind_speed),rajada:v(d.wind_gust),vento_dir:v(d.wind_dir),chuva:v(d.rain_day),solar:v(d.solar)});
    }).catch(function(){ openMeteo(); });
  }
  if(_climaStations){ station(); }
  else { fetch(NDVI_PROXY+'/clima/estacoes').then(function(r){return r.json();}).then(function(arr){ if(Array.isArray(arr))_climaStations=arr; station(); }).catch(openMeteo); }
}
function _carimboNdvi(qid, cb){
  var ctr=quadraCenter(qid); if(!ctr){ cb(null); return; }
  fetch(NDVI_PROXY+'/point?lat='+ctr[0].toFixed(6)+'&lng='+ctr[1].toFixed(6)+'&date='+todayISO()).then(function(r){return r.json();}).then(function(d){
    if(!d||d.error){ cb(null); return; }
    cb({fonte:'sentinel2',ndvi:d.ndvi,ndre:d.ndre,gndvi:d.gndvi,data:d.date});
  }).catch(function(){ cb(null); });
}
function carimbar(qid,sid,recId,kind,recDate,recHora){
  var rec=_carimboFind(qid,sid,recId,kind); if(!rec) return;
  var now=new Date();
  /* recDate = data DO EVENTO (YYYY-MM-DD, do campo data da aplicação/avaliação).
     'data' do carimbo = quando foi REGISTRADO (rastreabilidade BPL/ISO27001 — imutável).
     'dataEvento' = o dia do ensaio que o usuário informou; é dele que vem o clima. */
  rec.carimbo={ ts:now.getTime(), data:now.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}), dataEvento:(recDate||null), horaEvento:(recHora||null), centro:quadraCenter(qid), app:APP_VER, gps:null, clima:null, ndvi:null };
  try{ save(); }catch(e){}
  _carimboLoc(function(loc){ if(loc) _carimboSet(qid,sid,recId,kind,'gps',loc); });
  _carimboClima(qid,recDate,recHora,function(cl){ if(cl) _carimboSet(qid,sid,recId,kind,'clima',cl); });
  _carimboNdvi(qid,function(nd){ if(nd) _carimboSet(qid,sid,recId,kind,'ndvi',nd); });
}
function _carimboTSV(c){
  if(!c) return '';
  var p=[]; if(c.data)p.push('Registrado '+c.data);
  if(c.clima){ var cl=c.clima; p.push('Clima('+(cl.fonte==='estacao'?'estacao':'previsao')+') '+(cl.temp!=null?cl.temp+'C':'')+(cl.umidade!=null?' '+cl.umidade+'%UR':'')+(cl.vpd!=null?' VPD'+cl.vpd:'')+(cl.vento!=null?' vento'+cl.vento+'km/h':'')+(cl.chuva!=null?' chuva'+cl.chuva+'mm':'')); }
  if(c.ndvi&&c.ndvi.ndvi!=null) p.push('NDVI '+c.ndvi.ndvi+(c.ndvi.ndre!=null?' NDRE '+c.ndvi.ndre:'')+(c.ndvi.data?' ('+c.ndvi.data+')':''));
  var ll=c.gps?(c.gps.lat+','+c.gps.lng):(c.centro&&c.centro.length===2?(c.centro[0]+','+c.centro[1]):'');
  if(ll) p.push('GPS '+ll);
  return p.length?('  carimbo\t'+p.join('\t')):'';
}
function carimboHtml(c){
  if(!c) return '';
  var p=[];
  if(c.data) p.push(ic('calendar',12)+' '+esc(c.data));
  if(c.clima){ var cl=c.clima, s=ic('thermo',12)+' '+(cl.temp!=null?(Math.round(cl.temp*10)/10)+'°C':'—');
    if(cl.umidade!=null)s+=' · '+ic('droplet',12)+Math.round(cl.umidade)+'%';
    if(cl.vpd!=null)s+=' · '+ic('gauge',12)+'VPD '+(Math.round(cl.vpd*100)/100);
    if(cl.vento!=null)s+=' · '+ic('wind',12)+(Math.round(cl.vento*10)/10)+'km/h';
    if(cl.chuva!=null)s+=' · '+ic('rain',12)+(Math.round(cl.chuva*10)/10)+'mm';
    
    var tempOk = (cl.temp != null && cl.temp < 30);
    var rhOk = (cl.umidade != null && cl.umidade > 50);
    var windOk = (cl.vento != null && cl.vento < 10);
    var bplBadge = (cl.temp != null && cl.umidade != null && cl.vento != null)
      ? (tempOk && rhOk && windOk ? ' <span class="bpl-ok" style="font-weight:700">🟢 Janela Ideal BPL</span>' : ' <span class="bpl-bad" style="font-weight:700">🔴 Fora da Janela</span>')
      : '';
      
    var _src=(cl.fonte&&cl.fonte.indexOf('estacao')===0)?'estação':'previsão';
    /* BPL/ISO27001: deixa explícito quando o clima é o RESUMO HISTÓRICO do dia do evento
       (data passada) e não uma leitura ao vivo — evidência honesta, sem induzir a erro. */
    /* Diz o que o número É. "Histórico do dia" é a MÉDIA de 24 h; leitura do
       instante é outra coisa e não pode ser apresentada como se fosse a mesma
       evidência. Quando a amostra não caiu exatamente na hora pedida, a
       defasagem sai escrita — é ela que um auditor vai querer ver. */
    var _dataTxt=cl.data?(' '+esc((typeof isoToBR==='function'?isoToBR(cl.data):cl.data))):'';
    var _diaTxt='';
    if(cl.histor && cl.instante){
      var _def=(cl.defasagem_s!=null && cl.defasagem_s>120)?(' ±'+Math.round(cl.defasagem_s/60)+' min'):'';
      _diaTxt=' · leitura de'+_dataTxt+(cl.hora?(' às '+esc(cl.hora)):'')+_def;
    }else if(cl.histor){
      _diaTxt=' · média do dia'+_dataTxt;
    }
    p.push(s+' ('+_src+')'+_diaTxt+bplBadge); }
  if(c.ndvi&&c.ndvi.ndvi!=null) p.push(ic('sat',12)+' NDVI '+(Math.round(c.ndvi.ndvi*100)/100)+(c.ndvi.ndre!=null?' · NDRE '+(Math.round(c.ndvi.ndre*100)/100):'')+(c.ndvi.data?' ('+esc(c.ndvi.data)+')':''));
  if(c.gps) p.push(ic('pin',12)+' '+c.gps.lat.toFixed(5)+', '+c.gps.lng.toFixed(5)+(c.gps.acc?' ±'+Math.round(c.gps.acc)+'m':''));
  else if(c.centro&&c.centro.length===2) p.push(ic('pin',12)+' '+c.centro[0].toFixed(5)+', '+c.centro[1].toFixed(5)+' (centro)');
  if(!p.length) return '';
  return '<div style="font-size:11px;color:#5a6b61;margin-top:6px;line-height:1.8;border-top:1px dashed #d2dcd5;padding-top:6px">'+p.join(' · ')+'</div>';
}

function saveAplicacao(){
  if(_bloqueadoPorFinalizacao(curV,curSid)) return;
  var q=data[curV],study=(q.estudos||[]).find(function(s){return s.id===curSid});
  if(!study)return;
  study=normalizeStudy(study);
  var isNew=(editingAplId==="__new__");
  var ap=isNew?draftAp:study.aplicacoes.find(function(a){return a.id===editingAplId});
  if(!ap)return;
  var oldData = ap.data;
  var oldBBCH = ap.bbch;
  var oldObs = ap.obs;
  ap.data=document.getElementById("aeData").value;
  var _ah=document.getElementById("aeHora");
  if(_ah && _ah.value) ap.hora=_ah.value; else delete ap.hora;
  var bbchEl=document.getElementById("aeBBCH");
  ap.bbch=bbchEl?bbchEl.value:"";
  ap.obs=document.getElementById("aeObs").value.trim();
  
  var action = isNew ? 'Registro de Aplicação' : 'Edição de Aplicação';
  var details = '';
  if(isNew) {
    details = 'APL registrada para a data ' + ap.data + (ap.bbch ? ' (BBCH ' + ap.bbch + ')' : '');
  } else {
    var changes = [];
    if(oldData !== ap.data) changes.push('Data: ' + oldData + ' -> ' + ap.data);
    if(oldBBCH !== ap.bbch) changes.push('BBCH: ' + oldBBCH + ' -> ' + ap.bbch);
    if(oldObs !== ap.obs) changes.push('Obs alteradas');
    details = changes.length ? changes.join(', ') : 'Nenhuma alteração de conteúdo';
  }
  
  if(isNew){
    study.aplicacoes.push(ap);
    draftAp=null;
  }
  if(!ap.carimbo) carimbar(curV,curSid,ap.id,'apl',ap.data,ap.hora);
  ap._ts=Date.now(); /* carimbo: no merge, a edição mais nova vence */
  logStudyAuditInObject(study, action, details);
  save();
  try{ if(typeof dbUpsertAplicacao==='function') dbUpsertAplicacao(curV,curSid,ap); }catch(e){} /* Etapa 3 Fase B */
  _stxToast('✓ Aplicação salva!');
  if(typeof updateTodayBadge==='function') updateTodayBadge();
  if(typeof updateAgendaBadge==='function') updateAgendaBadge();
  closeEventEdit();
  openStudyDetail(curV,curSid);
}

/* ===================== TIPOS DE VARIÁVEL DE AVALIAÇÃO =====================
   pct      — % ou número digitado (severidade)                    [legado]
   contagem — inteiro, botões − / + (insetos, plantas)             [legado]
   razao    — n afetados / N avaliados → % derivado (mortalidade, incidência)
   escala   — nota de classe 0..máx → índice de McKinney derivado (%)

   Qualquer variável pode ter SUB-AMOSTRAS por parcela (ex.: 10 frutos). O dado
   BRUTO fica em av.bruto[parcela][variável] ({sub:[...]} ou {n,N}) e notas[][]
   continua guardando o número DERIVADO — que é o que a estatística, a AACPD, a
   prancha e o % de controle já consomem. Sub-amostra NÃO é repetição: entrar com
   10 frutos como 10 blocos é pseudorreplicação e infla o grau de liberdade, então
   a ANOVA recebe a média da parcela. */
var AV_TIPOS={pct:1,contagem:1,razao:1,escala:1};
var AV_TIPO_LABEL={pct:'% / número',contagem:'contagem',razao:'razão n/N',escala:'escala'};
/* src = uma avaliação (av) ou o rascunho _avGrid — ambos têm .tipos e .varcfg */
function _avTipo(src,v){ var t=(src&&src.tipos&&src.tipos[v])||'pct'; return AV_TIPOS[t]?t:'pct'; }
function _avCfg(src,v){
  var c=(src&&src.varcfg&&src.varcfg[v])||{};
  return {
    tipo:_avTipo(src,v),
    sub:Math.max(1,Math.round(_numBR(c.sub,1))||1),
    N:Math.max(0,Math.round(_numBR(c.N,0))),
    escalaMax:Math.max(1,_numBR(c.escalaMax,4)),
    escalaNome:c.escalaNome||''
  };
}
/* Só as variáveis novas (razão/escala) e as com sub-amostra guardam bruto — pct e
   contagem simples continuam exatamente como antes, direto em notas[][]. */
function _avUsaBruto(cfg){ return cfg.tipo==='razao'||cfg.tipo==='escala'||cfg.sub>1; }
function _avCel(src,key,v,cria){
  if(!src) return null;
  if(!src.bruto||typeof src.bruto!=='object'){ if(!cria) return null; src.bruto={}; }
  if(!src.bruto[key]){ if(!cria) return null; src.bruto[key]={}; }
  var c=src.bruto[key][v];
  if(!c||typeof c!=='object'){ if(!cria) return null; c=src.bruto[key][v]={}; }
  return c;
}
function _avSubList(cel,n){
  var a=(cel&&Array.isArray(cel.sub))?cel.sub.slice():[];
  while(a.length<n) a.push('');
  return a.slice(0,Math.max(n,a.length));
}
function _avSubCheias(cel){
  return ((cel&&cel.sub)||[]).filter(function(x){ return x!=null&&String(x).trim()!==''; }).length;
}
/* Número derivado de uma célula a partir do bruto. '' quando ainda não dá para derivar. */
function _avDerivar(cfg,cel){
  if(!cel||!cfg) return '';
  if(cfg.tipo==='razao'){
    var n=_numBR(cel.n,NaN), N=_numBR(cel.N,NaN);
    if(!isFinite(n)||!isFinite(N)||!(N>0)) return '';
    if(n<0) n=0; if(n>N) n=N;
    return String(Math.round(n/N*1e4)/100);
  }
  var vals=((cel.sub)||[]).map(function(x){ return _numBR(x,NaN); }).filter(function(x){ return isFinite(x); });
  if(!vals.length) return '';
  var soma=vals.reduce(function(a,b){ return a+b; },0);
  if(cfg.tipo==='escala'){
    /* índice de McKinney (índice de doença): Σ(nota) / (nº avaliado × nota máxima) × 100 */
    var mx=cfg.escalaMax;
    if(!(mx>0)) return '';
    return String(Math.round(soma/(vals.length*mx)*1e4)/100);
  }
  return String(Math.round(soma/vals.length*100)/100);
}
/* Recalcula notas[key][v] a partir do bruto (no rascunho _avGrid). */
function _avRecalc(key,v){
  var cfg=_avCfg(_avGrid,v);
  if(!_avUsaBruto(cfg)) return null;
  var val=_avDerivar(cfg,(_avGrid.bruto[key]||{})[v]);
  if(!_avGrid.notas[key]) _avGrid.notas[key]={};
  if(String(_avGrid.notas[key][v]==null?'':_avGrid.notas[key][v])!==String(val)){
    _avGrid.notas[key][v]=val;
    _avTouchCell(key,v);
  }
  return val;
}
/* Texto do bruto p/ leitura e export (ex.: "3/20" ou "2; 3; 1; …") */
function _avBrutoTxt(src,key,v){
  var cfg=_avCfg(src,v); if(!_avUsaBruto(cfg)) return '';
  var cel=(src&&src.bruto&&src.bruto[key])?src.bruto[key][v]:null; if(!cel) return '';
  if(cfg.tipo==='razao'){
    var n=(cel.n==null||cel.n==='')?'':cel.n, N=(cel.N==null||cel.N==='')?'':cel.N;
    return (n===''&&N==='')?'':(n+'/'+N);
  }
  return ((cel.sub)||[]).filter(function(x){ return x!=null&&String(x).trim()!==''; }).join('; ');
}

/* ===== Catálogo de variáveis por tipo de estudo =====
   Sem isso a variável é texto livre e vira "Mortalidade" / "mortalidade" / "Mort."
   em avaliações diferentes — e aí a série da AACPD e da prancha não fecha. */
var TIPOS_ESTUDO=['Eficácia','Mortalidade','Fungo in vitro','Fungo in vivo','Seletividade/Fitotoxicidade','Produtividade','Outro'];
/* Tipos que fazem sentido em cada laboratório — o cadastro do estudo numa quadra
   de lab oferece só esses, na ordem. Nematologia não usa: lá o registro é a fila
   de amostras, não avaliação com tratamentos. */
var TIPOS_POR_LAB={
  Entomologia:['Mortalidade','Eficácia','Seletividade/Fitotoxicidade','Outro'],
  Fitopatologia:['Fungo in vitro','Fungo in vivo','Eficácia','Outro'],
  Nematologia:['Outro']
};
var CATALOGO_AVAL={
  'Eficácia':[
    {nome:'Severidade',tipo:'pct',sub:10},
    {nome:'Incidência',tipo:'razao',N:20},
    {nome:'Nota de escala',tipo:'escala',escalaMax:4,sub:10},
    {nome:'Nº de lesões',tipo:'contagem',sub:10}
  ],
  'Mortalidade':[
    /* sentido 'maior': aqui a testemunha e a MENOR — o % de controle sai pela
       mortalidade corrigida de Abbott, nao pela reducao */
    {nome:'Mortalidade',tipo:'razao',N:20,sentido:'maior'},
    {nome:'Insetos vivos',tipo:'contagem'},
    {nome:'Insetos mortos',tipo:'contagem'}
  ],
  'Seletividade/Fitotoxicidade':[
    {nome:'Fitotoxicidade',tipo:'pct'},
    {nome:'Nota EWRC',tipo:'escala',escalaMax:9},
    {nome:'Stand de plantas',tipo:'contagem'}
  ],
  /* FITOPATOLOGIA in vitro: mede-se a colônia em dois eixos perpendiculares e a
     média entra como diâmetro. A % de inibição do crescimento micelial sai contra
     a testemunha (fórmula de Abbott, que o estatistica.js já traz auditado) —
     por isso 'sentido:maior' NÃO se aplica: colônia menor = melhor controle. */
  'Fungo in vitro':[
    {nome:'Diâmetro da colônia (mm)',tipo:'contagem',sub:2},
    {nome:'Crescimento micelial (mm/dia)',tipo:'contagem'},
    {nome:'Esporulação (conídios/mL)',tipo:'contagem'}
  ],
  'Fungo in vivo':[
    {nome:'Severidade',tipo:'pct',sub:10},
    {nome:'Incidência',tipo:'razao',N:20},
    {nome:'Nº de lesões',tipo:'contagem',sub:10},
    {nome:'Nota de escala',tipo:'escala',escalaMax:4,sub:10}
  ],
  'Produtividade':[
    {nome:'Peso da parcela (g)',tipo:'contagem'},
    {nome:'Nº de frutos',tipo:'contagem',sub:10},
    {nome:'Peso de 100 grãos (g)',tipo:'contagem'}
  ]
};
function _avCatalogo(){
  var st=_avStudy(), t=(st&&st.tipoEstudo)||'';
  if(CATALOGO_AVAL[t]) return {tipo:t, itens:CATALOGO_AVAL[t]};
  var todas=[]; Object.keys(CATALOGO_AVAL).forEach(function(k){ todas=todas.concat(CATALOGO_AVAL[k]); });
  return {tipo:'', itens:todas};
}

/* ===== Grade de avaliação: tratamentos (linhas) × variáveis avaliadas (colunas dinâmicas) ===== */
var _avGrid={variaveis:[],notas:{},tipos:{},meta:{},varcfg:{},bruto:{}};
var _avAuto={on:false,pos:0};
function _avGridUser(){
  var email = _authUser && _authUser.email;
  if(!email) return 'local';
  ensureConfig();
  var allowed = (data && data.__config && data.__config.allowedUsers || []);
  var user = allowed.find(function(u){
    return u && typeof u.email === 'string' && u.email.toLowerCase().trim() === email.toLowerCase().trim();
  });
  if(user) return user.nome;
  var admEmail = (data && data.__config && data.__config.adminEmail || '').toLowerCase().trim();
  if(admEmail && email.toLowerCase().trim() === admEmail) return 'Administrador';
  return email;
}
function _avTouchCell(row,v){
  if(!_avGrid.meta||typeof _avGrid.meta!=='object') _avGrid.meta={};
  if(!_avGrid.meta[row]) _avGrid.meta[row]={};
  _avGrid.meta[row][v]={ts:Date.now(),user:_avGridUser()};
}
function _avCss(){ if(document.getElementById('avCss'))return; var s=document.createElement('style'); s.id='avCss';
  s.textContent='.av-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:4px;padding-bottom:4px;position:relative}'+
  '.av-table{border-collapse:separate;border-spacing:0;font-size:12px;min-width:max-content}'+
  '.av-table th,.av-table td{border:1px solid var(--border,#2a3a2a);padding:4px 6px;text-align:center;white-space:nowrap}'+
  '.av-table th{background:var(--surface-2,#11210f);color:var(--text-2,#9ab39a);font-weight:700}'+
  '.av-table th:first-child,.av-table td:first-child{position:sticky;left:0;z-index:2;min-width:58px;max-width:70px;box-shadow:6px 0 10px rgba(0,0,0,.18)}'+
  '.av-table th:first-child{z-index:3}'+
  '.av-tname{font-weight:800;color:var(--accent,#37d684);background:var(--surface-2,#11210f);font-size:11px;line-height:1.05}'+
  '.av-cellwrap{display:flex;align-items:center;gap:3px}'+
  '.av-step{flex:none;width:30px;height:32px;border:1px solid var(--border,#2a3a2a);background:rgba(127,170,127,.14);color:#9ac49a;border-radius:7px;font-size:18px;font-weight:700;line-height:1;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation}'+
  '.av-step:active{background:rgba(127,170,127,.3)}'+
  '.av-cell{width:48px;box-sizing:border-box;background:var(--surface,#0a110a);border:1px solid var(--border,#2a3a2a);color:var(--text,#eaf3ed);border-radius:6px;padding:5px 3px;font-size:13px;text-align:center}'+
  '.av-cell-num{width:60px}'+
  '.av-addcol{background:rgba(127,170,127,.15);border:1px solid #2a3a2a;color:#9ac49a;border-radius:7px;padding:4px 9px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}'+
  '.av-delcol{background:none;border:none;color:#a77;cursor:pointer;font-size:13px;margin-left:5px;padding:0}.av-delcol:hover{color:#ff8a80}'+
  '.av-hint{font-size:11px;color:#9a8;font-style:italic;margin:4px 0}.av-gridbtns{margin-top:6px}'+
  /* razão n/N, escala e sub-amostras */
  '.av-cell-sm{width:38px}.av-sep{color:#7c8a80;font-weight:800;padding:0 1px}'+
  '.av-der{font-size:10px;color:#9fe0b6;font-weight:700;margin-top:2px;letter-spacing:.2px}'+
  '.av-der.vazio{color:#7c8a80;font-weight:400}'+
  '.av-subbtn{min-width:62px;background:var(--surface,#0a110a);border:1px solid var(--border,#2a3a2a);color:var(--text,#eaf3ed);border-radius:7px;padding:5px 6px;font-size:13px;font-weight:700;cursor:pointer;line-height:1.15}'+
  '.av-subbtn small{display:block;font-size:9px;font-weight:600;color:#9a8;letter-spacing:.3px}'+
  '.av-subbtn.cheia{border-color:rgba(55,214,132,.55)}.av-subbtn.cheia small{color:#9fe0b6}'+
  '.av-sub-ovl{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3400;display:none;align-items:center;justify-content:center;padding:16px}'+
  '.av-sub-box{background:var(--surface,#0e150e);border:1px solid var(--border,#2a3a2a);border-radius:14px;max-width:400px;width:100%;padding:15px;box-sizing:border-box;color:var(--text,#eaf3ed);box-shadow:0 12px 40px rgba(0,0,0,.5)}'+
  '.av-sub-title{font-size:15px;font-weight:800;color:var(--accent,#37d684)}'+
  '.av-sub-sub{font-size:11px;color:#9a8;margin:2px 0 10px}'+
  '.av-sub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:7px}'+
  '.av-sub-f{display:flex;flex-direction:column;gap:2px}.av-sub-f label{font-size:9px;color:#7c8a80;font-weight:700;text-transform:uppercase;letter-spacing:.4px}'+
  '.av-sub-inp{width:100%;box-sizing:border-box;background:var(--surface-2,#0a110a);border:1px solid var(--border,#2a3a2a);color:var(--text,#eaf3ed);border-radius:8px;padding:9px 4px;font-size:16px;text-align:center;font-weight:700}'+
  '.av-sub-inp:focus{border-color:#37d684;outline:none}'+
  '.av-sub-res{display:flex;justify-content:space-between;align-items:baseline;margin-top:11px;padding-top:9px;border-top:1px solid var(--border,#2a3a2a);font-size:12px;color:#9a8}'+
  '.av-sub-res b{font-size:18px;color:var(--text,#eafaea)}'+ /* var(--text): a caixa segue o tema, texto fixo claro sumia no tema claro */
  '.av-sub-warn{font-size:10px;color:#dccd8c;margin-top:5px}'+
  '.av-sub-btns{display:flex;gap:8px;margin-top:12px}.av-sub-btns button{flex:1;border:none;border-radius:9px;padding:11px;font-weight:800;cursor:pointer}'+
  '.av-sub-ok{background:#1f5a2a;color:#eafaea}.av-sub-clr{flex:none!important;background:#222;color:#bbb;padding:11px 13px!important}'+
  '.av-auto-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 8px}'+
  '.av-auto-toggle{background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:8px 12px;font-weight:800;cursor:pointer}'+
  '.av-auto-toggle.off{background:#18251b;color:#9ac49a;border:1px solid #2a3a2a}'+
  '.av-auto-note{font-size:11px;color:#9a8}'+
  '.av-auto-box{background:rgba(31,90,42,.13);border:1px solid #2a4a2a;border-radius:10px;padding:10px;margin:4px 0 10px}'+
  '.av-auto-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;font-size:12px;color:#9ac49a;font-weight:700}'+
  '.av-auto-card{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}'+
  '.av-auto-main{font-size:24px;font-weight:900;color:#eafaea;line-height:1.05}'+
  '.av-auto-sub{font-size:12px;color:#9a8;margin-top:4px}'+
  '.av-auto-input{width:112px;background:#050805;border:1px solid #37d684;color:#fff;border-radius:10px;padding:10px;font-size:28px;font-weight:900;text-align:center}'+
  '.av-auto-count{display:flex;gap:6px;align-items:center}.av-auto-count button{width:46px;height:48px;border-radius:10px;border:1px solid #2a4a2a;background:#1f5a2a;color:#eafaea;font-size:26px;font-weight:900}'+
  '.av-auto-nav{display:flex;gap:8px;margin-top:10px}.av-auto-nav button{flex:1;background:#18251b;color:#9ac49a;border:1px solid #2a3a2a;border-radius:8px;padding:11px;font-weight:800;cursor:pointer;font-size:14px}'+
  '.av-auto-prog{height:7px;background:#18251b;border-radius:6px;overflow:hidden;margin-bottom:3px}.av-auto-prog-fill{height:100%;background:#37d684;transition:width .15s}'+
  '.av-auto-progtxt{font-size:10px;color:#9a8;text-align:right;margin-bottom:8px}'+
  '.av-auto-presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}'+
  '.av-auto-preset{flex:1 1 18%;min-width:56px;background:#22262c;color:#eafaea;border:1px solid rgba(55,214,132,.35);border-radius:10px;padding:13px 4px;font-size:19px;font-weight:800;cursor:pointer}.av-auto-preset.on{background:#1f5a2a;border-color:#37d684}.av-auto-preset:active{transform:scale(.96)}'+
  '.avcol-ovl{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3200;display:none;align-items:center;justify-content:center;padding:16px}'+
  '.avcol-box{background:var(--surface,#0e150e);border:1px solid var(--border,#2a3a2a);border-radius:14px;max-width:380px;width:100%;padding:16px;box-sizing:border-box;font:13px system-ui,sans-serif;color:var(--text,#eaf3ed);box-shadow:0 12px 40px rgba(0,0,0,.5)}'+
  '.avcol-title{font-size:15px;font-weight:700;color:var(--accent,#37d684);margin-bottom:6px}'+
  '.avcol-lab{display:block;font-size:11px;color:var(--text-3,#8aa88a);font-weight:600;letter-spacing:.3px;margin:10px 0 4px}'+
  '.avcol-inp{width:100%;box-sizing:border-box;background:var(--surface-2,#0a110a);border:1px solid var(--border,#2a3a2a);color:var(--text,#eaf3ed);border-radius:8px;padding:10px;font-size:15px}'+
  '.avcol-types{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px}'+
  '.avcol-chips{display:flex;flex-wrap:wrap;gap:6px}'+
  '.avcol-chip{background:var(--surface-2,#0a110a);border:1px solid var(--border,#2a3a2a);color:var(--text-2,#9ab39a);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer}'+
  '.avcol-chip:active,.avcol-chip:hover{border-color:var(--accent,#37d684);color:var(--accent,#37d684)}'+
  '.avcol-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px}'+
  '.avcol-note{font-size:10px;color:var(--text-3,#8aa88a);line-height:1.4;margin-top:7px}'+
  '.avcol-type{flex:1;display:flex;flex-direction:column;gap:2px;background:var(--surface-2,#0a110a);border:1px solid var(--border,#2a3a2a);color:var(--text,#eaf3ed);border-radius:9px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;text-align:center}'+
  '.avcol-type small{font-weight:400;font-size:10px;color:var(--text-3,#8aa88a)}'+
  '.avcol-type.on{border-color:var(--accent,#37d684);background:rgba(55,214,132,.12);color:var(--accent,#37d684)}'+
  '.avcol-btns{display:flex;gap:8px;margin-top:14px}'+
  '.avcol-ok{flex:1;background:#1f5a2a;color:#eafaea;border:none;border-radius:9px;padding:11px;font-weight:700;font-size:14px;cursor:pointer}'+
  '.avcol-cancel{background:#222;color:#bbb;border:none;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer}';
  document.head.appendChild(s);
}
function _avTrats(){ var q=data[curV]||{}, st=(q.estudos||[]).find(function(s){return s.id===curSid;}); return (st&&st.tratamentos)||[]; }

/* Grava um campo do BRUTO (n, N ou sub-amostra sN) e recalcula o derivado da célula.
   Devolve o valor já normalizado para devolver ao input. */
function _avWriteBruto(key,v,campo,val){
  var cfg=_avCfg(_avGrid,v), cel=_avCel(_avGrid,key,v,true);
  var s=String(val==null?'':val).trim().replace(',','.');
  var num=(s==='')?'':parseFloat(s);
  if(s!=='' && isNaN(num)) num='';
  if(num!==''){
    if(num<0) num=0;
    if(cfg.tipo==='escala' && num>cfg.escalaMax) num=cfg.escalaMax;
    if(cfg.tipo==='pct' && num>100) num=100;
    if(cfg.tipo==='contagem'||cfg.tipo==='razao') num=Math.floor(num);
  }
  var out=(num==='')?'':String(num);
  if(campo==='n'||campo==='N') cel[campo]=out;
  else {
    var i=parseInt(String(campo).slice(1))||0;
    if(!Array.isArray(cel.sub)) cel.sub=[];
    while(cel.sub.length<=i) cel.sub.push('');
    cel.sub[i]=out;
  }
  _avRecalc(key,v);
  return out;
}
/* Atualiza só os rótulos derivados da grade (sem re-renderizar: não rouba o foco). */
function _avRefreshDer(){
  var w=document.getElementById('avGridWrap'); if(!w) return;
  Array.prototype.forEach.call(w.querySelectorAll('.av-der'), function(el){
    var k=el.getAttribute('data-dt'), v=el.getAttribute('data-dv'); if(!k||!v) return;
    var val=(_avGrid.notas[k]&&_avGrid.notas[k][v]!=null)?String(_avGrid.notas[k][v]):'';
    el.textContent=(val===''?'—':val+'%');
    el.classList.toggle('vazio', val==='');
  });
  Array.prototype.forEach.call(w.querySelectorAll('.av-subbtn'), function(el){
    var k=el.getAttribute('data-dt'), v=el.getAttribute('data-dv'); if(!k||!v) return;
    var cfg=_avCfg(_avGrid,v), val=(_avGrid.notas[k]&&_avGrid.notas[k][v]!=null)?String(_avGrid.notas[k][v]):'';
    var ch=_avSubCheias((_avGrid.bruto[k]||{})[v]);
    el.innerHTML=(val===''?'—':esc(val))+'<small>'+ch+'/'+cfg.sub+'</small>';
    el.classList.toggle('cheia', ch>=cfg.sub);
  });
}
function avValidateCell(inp){
  var v=inp.getAttribute('data-v'), t=inp.getAttribute('data-t'), b=inp.getAttribute('data-b');
  if(!v) {
    var a= (typeof _avAutoState === 'function') ? _avAutoState() : null;
    if(a){ v=a.v; t=a.row.key; if(!b && a.campo) b=a.campo; }
  }
  if(!v) return;
  if(b && t){ /* célula com dado bruto (razão n/N, escala, sub-amostra) */
    inp.value=_avWriteBruto(t,v,b,inp.value);
    _avRefreshDer();
    _avPersistNow();
    return;
  }
  var tp=(_avGrid.tipos&&_avGrid.tipos[v]==='contagem')?'contagem':'pct';
  var val=inp.value.trim();
  if(val==='') return;
  var num=parseFloat(val.replace(',','.'));
  if(isNaN(num)){
    inp.value='';
    _stxToast('Valor inválido. Digite um número.');
    return;
  }
  if(tp==='pct'){
    if(num<0){
      num=0;
      _stxToast('Valor menor que 0% ajustado para 0%.');
    } else if(num>100){
      num=100;
      _stxToast('Valor maior que 100% ajustado para 100%.');
    }
    inp.value=String(num);
  } else {
    if(num<0){
      num=0;
      _stxToast('Valor negativo ajustado para 0.');
    }
    inp.value=String(Math.floor(num));
  }
  _avPersistNow(); /* autosave da grade manual no blur */
}

function renderAvGrid(){
  _avCss(); var w=document.getElementById('avGridWrap'); if(!w) return;
  var st=_avStudy(), rows=_avRowsForStudy(st,false), ts=(st&&st.tratamentos)||[];
  if(!ts.length){ w.innerHTML='<div class="av-hint">Cadastre os tratamentos do estudo (botão EDITAR) para lançar notas por tratamento.</div>'; return; }
  var vs=_avGrid.variaveis;
  var html='';
  if(st&&st.randomizado){
    ensureStudyRandomizacao(st);
    var rz=st.randomizacao||{}, rzNome=(rz.modelo==='planilha'?((rz.nome||('T'+ts.length))+' · reps '+(rz.reps||('A-'+_repLetter(st.numRepeticoes)))):((rz.key)||_studyProtocolKey(st)));
    html+='<div class="av-auto-bar"><button type="button" class="av-auto-toggle '+(_avAuto.on?'':'off')+'" onclick="avAutoToggle()">'+(_avAuto.on?'Modo automático ligado':'Modo automático')+'</button><span class="av-auto-note">Ordem randomizada: '+esc(rzNome)+'</span></div>';
    if(_avAuto.on) html+=renderAvAutoBox();
  }else if(st){
    var mi=_studyRandomModeloInfo(st);
    if(mi.ok){
      html+='<div class="av-auto-bar"><button type="button" class="av-auto-toggle off" onclick="avEnableStudyRandomizado()">Ativar automático randomizado</button><span class="av-auto-note">Modelo disponível: '+esc(mi.nome+' · '+mi.reps+' rep.')+'</span></div>';
    }
  }
  html+='<div class="av-scroll"><table class="av-table"><thead><tr><th>Parc.</th>';
  vs.forEach(function(v){
    var cfg=_avCfg(_avGrid,v), suf='';
    if(cfg.tipo==='pct') suf=' <small style="opacity:.6">%</small>';
    else if(cfg.tipo==='razao') suf=' <small style="opacity:.6">n/N</small>';
    else if(cfg.tipo==='escala') suf=' <small style="opacity:.6">0–'+cfg.escalaMax+'</small>';
    if(cfg.sub>1) suf+=' <small style="opacity:.6">×'+cfg.sub+'</small>';
    html+='<th>'+esc(v)+suf+'<button type="button" class="av-delcol" title="Remover coluna" onclick="avDelCol(\''+esc(v).replace(/\\/g,"\\\\").replace(/'/g,"\\'")+'\')">×</button></th>';
  });
  html+='<th><button type="button" class="av-addcol" onclick="avAddCol()">+ coluna</button></th></tr></thead><tbody>';
  rows.forEach(function(rw){
    var row=_avGrid.notas[rw.key]||{}, old=(rw.rep===1&&_avGrid.notas[rw.tratId])?_avGrid.notas[rw.tratId]:{};
    html+='<tr><td class="av-tname" title="'+esc((rw.produto||'')+(rw.parcela?' · parcela '+rw.parcela:''))+'">'+esc(rw.label)+'</td>';
    vs.forEach(function(v){
      var val=(row[v]!=null&&row[v]!=='')?row[v]:((old&&old[v]!=null)?old[v]:'');
      var cfg=_avCfg(_avGrid,v), k=esc(rw.key), ev=esc(v);
      if(cfg.tipo==='razao'){
        var cel=(_avGrid.bruto[rw.key]||{})[v]||{};
        var nv=(cel.n==null?'':cel.n), Nv=(cel.N==null||cel.N===''?(cfg.N||''):cel.N);
        html+='<td><div class="av-cellwrap">'+
          '<input class="av-cell av-cell-sm" data-t="'+k+'" data-v="'+ev+'" data-b="n" value="'+esc(nv)+'" inputmode="numeric" onblur="avValidateCell(this)">'+
          '<span class="av-sep">/</span>'+
          '<input class="av-cell av-cell-sm" data-t="'+k+'" data-v="'+ev+'" data-b="N" value="'+esc(Nv)+'" inputmode="numeric" onblur="avValidateCell(this)">'+
          '</div><div class="av-der'+(val===''?' vazio':'')+'" data-dt="'+k+'" data-dv="'+ev+'">'+(val===''?'—':esc(val)+'%')+'</div></td>';
      } else if(cfg.sub>1){
        var celS=(_avGrid.bruto[rw.key]||{})[v]||{}, ch=_avSubCheias(celS);
        html+='<td><button type="button" class="av-subbtn'+(ch>=cfg.sub?' cheia':'')+'" data-dt="'+k+'" data-dv="'+ev+'" onclick="avOpenSub(\''+k+'\',\''+ev.replace(/\\/g,"\\\\").replace(/'/g,"\\'")+'\')">'+
          (val===''?'—':esc(val))+'<small>'+ch+'/'+cfg.sub+'</small></button></td>';
      } else if(cfg.tipo==='escala'){
        var celE=(_avGrid.bruto[rw.key]||{})[v]||{}, e0=((celE.sub||[])[0]);
        html+='<td><input class="av-cell" data-t="'+k+'" data-v="'+ev+'" data-b="s0" value="'+esc(e0==null?'':e0)+'" inputmode="numeric" placeholder="0–'+cfg.escalaMax+'" onblur="avValidateCell(this)">'+
          '<div class="av-der'+(val===''?' vazio':'')+'" data-dt="'+k+'" data-dv="'+ev+'">'+(val===''?'—':esc(val)+'%')+'</div></td>';
      } else if(cfg.tipo==='contagem'){
        html+='<td><div class="av-cellwrap"><button type="button" class="av-step" onclick="avBump(this,-1)">−</button><input class="av-cell" data-t="'+k+'" data-v="'+ev+'" value="'+esc(val)+'" inputmode="numeric" onblur="avValidateCell(this)"><button type="button" class="av-step" onclick="avBump(this,1)">+</button></div></td>';
      } else {
        html+='<td><input class="av-cell av-cell-num" data-t="'+k+'" data-v="'+ev+'" value="'+esc(val)+'" inputmode="decimal" placeholder="%" onblur="avValidateCell(this)"></td>';
      }
    });
    html+='<td></td></tr>';
  });
  html+='</tbody></table></div>';
  if(!vs.length) html+='<div class="av-gridbtns"><button type="button" class="av-addcol" onclick="avAddCol()">+ coluna (ex.: Puccinia)</button></div>';
  w.innerHTML=html;
}

function _avSyncInputs(){
  var w=document.getElementById('avGridWrap'); if(!w) return;
  Array.prototype.forEach.call(w.querySelectorAll('.av-cell'), function(inp){
    var t=inp.getAttribute('data-t'), v=inp.getAttribute('data-v'), b=inp.getAttribute('data-b');
    if(b && t && v){ inp.value=_avWriteBruto(t,v,b,inp.value); return; } /* razão / escala / sub-amostra */
    if(!_avGrid.notas[t]) _avGrid.notas[t]={};

    var val = inp.value.trim();
    if(val !== '') {
      var tp=(_avGrid.tipos&&_avGrid.tipos[v]==='contagem')?'contagem':'pct';
      var num = parseFloat(val.replace(',', '.'));
      if(isNaN(num)) {
        val = '';
        inp.value = '';
      } else {
        if(tp==='pct'){
          if(num<0) num=0;
          if(num>100) num=100;
        } else {
          if(num<0) num=0;
          num = Math.floor(num);
        }
        val = String(num);
        inp.value = val;
      }
    }
    
    var old=(_avGrid.notas[t][v]==null?'':String(_avGrid.notas[t][v]));
    if(old!==String(val)){
      _avGrid.notas[t][v]=val;
      _avTouchCell(t,v);
    }
  });
}

function avBump(el,delta){
  var inp=el.parentNode.querySelector('.av-cell'); if(!inp) return;
  var n=parseFloat(inp.value); if(isNaN(n)) n=0; n+=delta; if(n<0) n=0;
  inp.value=(n%1===0)?String(n):n.toFixed(1);
  avValidateCell(inp);
}

function _avAutoRows(){ return _avRowsForStudy(_avStudy(),true); }

/* ===== Sub-amostras de uma parcela (ex.: 10 frutos) ===== */
var _avSubCtx=null;
function _avSubOutlier(vals){
  /* pega erro de digitação AINDA no campo: um fruto muito fora da mão dos outros */
  var xs=[], idx=[];
  (vals||[]).forEach(function(x,i){ var n=_numBR(x,NaN); if(isFinite(n)){ xs.push(n); idx.push(i); } });
  if(xs.length<4) return '';
  var m=xs.reduce(function(a,b){return a+b;},0)/xs.length;
  var sd=Math.sqrt(xs.reduce(function(a,b){return a+(b-m)*(b-m);},0)/(xs.length-1));
  if(!(sd>0)) return '';
  for(var i=0;i<xs.length;i++){
    if(Math.abs(xs[i]-m)>2.5*sd) return '⚠ amostra '+(idx[i]+1)+' ('+xs[i]+') destoa das outras (média '+(Math.round(m*100)/100)+') — confira antes de sair da parcela.';
  }
  return '';
}
function avOpenSub(key,v){
  _avSyncInputs(); _avCss();
  var cfg=_avCfg(_avGrid,v); if(!_avUsaBruto(cfg)) return;
  _avSubCtx={key:key,v:v};
  var m=document.getElementById('avSubModal');
  if(!m){ m=document.createElement('div'); m.id='avSubModal'; m.className='av-sub-ovl';
    m.onclick=function(e){ if(e.target===m) avCloseSub(); }; document.body.appendChild(m); }
  m.style.display='flex';
  _avSubRender();
  setTimeout(function(){ var i=m.querySelector('.av-sub-inp'); if(i){ i.focus(); if(i.select)i.select(); } },60);
}
function _avSubRender(){
  var m=document.getElementById('avSubModal'); if(!m||!_avSubCtx) return;
  var key=_avSubCtx.key, v=_avSubCtx.v, cfg=_avCfg(_avGrid,v);
  var rows=_avRowsForStudy(_avStudy(),false), rw=null;
  rows.forEach(function(r){ if(r.key===key) rw=r; });
  if(!rw) rw={label:key,produto:''};
  var cel=_avCel(_avGrid,key,v,true), vals=_avSubList(cel,cfg.sub);
  var der=(_avGrid.notas[key]&&_avGrid.notas[key][v])||'';
  var h='<div class="av-sub-box"><div class="av-sub-title">'+esc(v)+'</div>'+
    '<div class="av-sub-sub">'+esc(rw.label||key)+(rw.produto?' · '+esc(rw.produto):'')+' — '+cfg.sub+' amostras'+(cfg.tipo==='escala'?(' · escala 0–'+cfg.escalaMax):'')+'</div>'+
    '<div class="av-sub-grid">';
  vals.slice(0,cfg.sub).forEach(function(x,i){
    h+='<div class="av-sub-f"><label>'+(i+1)+'</label><input class="av-sub-inp" data-i="'+i+'" value="'+esc(x==null?'':x)+'" inputmode="'+(cfg.tipo==='pct'?'decimal':'numeric')+'" oninput="avSubWrite(this)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();avSubNext(this);}"></div>';
  });
  h+='</div>';
  h+='<div class="av-sub-res"><span>'+(cfg.tipo==='escala'?'Índice de McKinney':'Média da parcela')+'</span><b>'+(der===''?'—':esc(der)+(cfg.tipo==='escala'?'%':''))+'</b></div>';
  var al=_avSubOutlier(vals); h+='<div class="av-sub-warn"'+(al?'':' style="display:none"')+'>'+esc(al)+'</div>';
  h+='<div class="av-sub-btns"><button type="button" class="av-sub-clr" onclick="avSubLimpar()">Limpar</button><button type="button" class="av-sub-ok" onclick="avCloseSub()">Pronto</button></div></div>';
  m.innerHTML=h;
}
function _avSubResumo(){
  var m=document.getElementById('avSubModal'); if(!m||!_avSubCtx) return;
  var cfg=_avCfg(_avGrid,_avSubCtx.v);
  var der=(_avGrid.notas[_avSubCtx.key]&&_avGrid.notas[_avSubCtx.key][_avSubCtx.v])||'';
  var b=m.querySelector('.av-sub-res b'); if(b) b.textContent=(der===''?'—':der+(cfg.tipo==='escala'?'%':''));
  var w=m.querySelector('.av-sub-warn');
  if(w){ var txt=_avSubOutlier(_avSubList(_avCel(_avGrid,_avSubCtx.key,_avSubCtx.v,true),cfg.sub)); w.textContent=txt; w.style.display=txt?'':'none'; }
}
function avSubWrite(inp){
  if(!_avSubCtx) return;
  _avWriteBruto(_avSubCtx.key,_avSubCtx.v,'s'+(inp.getAttribute('data-i')||0),inp.value);
  _avSubResumo(); _avPersistNow();
}
function avSubNext(inp){
  var m=document.getElementById('avSubModal'); if(!m) return;
  var all=Array.prototype.slice.call(m.querySelectorAll('.av-sub-inp'));
  var i=all.indexOf(inp);
  if(i>=0 && i<all.length-1){ all[i+1].focus(); if(all[i+1].select)all[i+1].select(); }
  else avCloseSub();
}
function avSubLimpar(){
  if(!_avSubCtx) return;
  var cel=_avCel(_avGrid,_avSubCtx.key,_avSubCtx.v,true);
  cel.sub=[];
  _avRecalc(_avSubCtx.key,_avSubCtx.v);
  _avPersistNow(); _avSubRender();
}
function avCloseSub(){
  var m=document.getElementById('avSubModal'); if(m) m.style.display='none';
  _avSubCtx=null; _avRefreshDer(); _avPersistNow();
}

/* Passos do modo automático: uma parada por parcela × variável × sub-amostra.
   Sem sub-amostra o passo é a célula inteira (comportamento antigo). */
function _avAutoSteps(){
  var rows=_avAutoRows(), vars=_avGrid.variaveis||[], steps=[];
  rows.forEach(function(rw,ri){
    vars.forEach(function(v,vi){
      var cfg=_avCfg(_avGrid,v);
      if(cfg.tipo==='razao') steps.push({row:rw,ri:ri,v:v,vi:vi,cfg:cfg,si:-1,campo:'n'});
      else if(_avUsaBruto(cfg)){ for(var i=0;i<cfg.sub;i++) steps.push({row:rw,ri:ri,v:v,vi:vi,cfg:cfg,si:i,campo:'s'+i}); }
      else steps.push({row:rw,ri:ri,v:v,vi:vi,cfg:cfg,si:-1,campo:null});
    });
  });
  return steps;
}
function _avStepVal(s){
  if(s.campo){
    var cel=(_avGrid.bruto[s.row.key]||{})[s.v]||{};
    if(s.campo==='n') return (cel.n==null)?'':cel.n;
    if(s.campo==='N') return (cel.N==null||cel.N==='')?'':cel.N;
    var i=parseInt(String(s.campo).slice(1))||0;
    var x=(cel.sub||[])[i];
    return (x==null)?'':x;
  }
  var n=_avGrid.notas[s.row.key];
  return (n&&n[s.v]!=null)?n[s.v]:'';
}
function _avAutoState(){
  var steps=_avAutoSteps(), total=steps.length;
  if(total<=0) return null;
  if(_avAuto.pos<0)_avAuto.pos=0;
  if(_avAuto.pos>=total)_avAuto.pos=total-1;
  var s=steps[_avAuto.pos];
  return {steps:steps,total:total,rows:_avAutoRows(),vars:(_avGrid.variaveis||[]),
    ri:s.ri,vi:s.vi,row:s.row,v:s.v,cfg:s.cfg,si:s.si,campo:s.campo,tipo:s.cfg.tipo};
}

/* AUTOSAVE da avaliação: comita o rascunho (_avGrid) na avaliação real + grava JÁ no localStorage
   (e nuvem, debounce) a cada célula — não perde se fechar/cair/acabar a bateria antes do SALVAR. */
var _avCloudTimer=null;
function _avCloudSoon(){ /* nuvem com FOLGA: no máximo 1 gravação a cada ~15s durante a edição (poupa bateria/dados) */
  if(_avCloudTimer) return;
  _avCloudTimer=setTimeout(function(){ _avCloudTimer=null; try{ if(typeof cloudSave==='function') cloudSave(); }catch(e){} }, 15000);
}
function _avPersistNow(){
  try{
    var q=data[curV]; if(!q) return;
    var study=(q.estudos||[]).find(function(s){return s.id===curSid;}); if(!study) return;
    var av;
    if(editingAvId==='__new__'){
      av=draftAv; if(!av) return;
      if(study.avaliacoes.indexOf(av)<0){ study.avaliacoes.push(av); editingAvId=av.id; } /* a partir daqui é uma avaliação real (não some) */
    } else {
      av=study.avaliacoes.find(function(a){return a.id===editingAvId;}); if(!av) return;
    }
    var vd=document.getElementById('vData'); if(vd&&vd.value) av.data=vd.value;
    var vt=document.getElementById('vTipo'); if(vt) av.tipo=vt.value;
    var vb=document.getElementById('vBBCH'); if(vb) av.bbch=vb.value;
    var vo=document.getElementById('vObs'); if(vo) av.obs=vo.value.trim();
    if(typeof _avSyncInputs==='function') _avSyncInputs();
    av.variaveis=(_avGrid.variaveis||[]).slice(); av.notas=_avGrid.notas; av.tipos=_avGrid.tipos; av.notasMeta=_avGrid.meta||{};
    av.varcfg=_avGrid.varcfg||{}; av.bruto=_avGrid.bruto||{}; /* config e dado bruto das sub-amostras/razão */
    av._ts=Date.now(); /* carimbo: no merge, a edição mais nova vence */
    try{ localStorage.setItem("iracema-v7", JSON.stringify(data)); }catch(e){} /* durável no aparelho NA HORA, sem rede */
    if(typeof setUnsavedChanges==='function') setUnsavedChanges(true);
    /* nuvem NÃO grava a cada célula (poupa bateria): sobe ao FECHAR a avaliação, no SALVAR, ou no botão "salvar na nuvem". O selo fica "pendente" até lá. */
  }catch(e){}
}
function _avSetCell(key,v,val){
  if(val !== '' && val != null) {
    var tp=(_avGrid.tipos&&_avGrid.tipos[v]==='contagem')?'contagem':'pct';
    var num = parseFloat(String(val).replace(',', '.'));
    if(isNaN(num)) {
      val = '';
    } else {
      if(tp==='pct'){
        if(num<0) num=0;
        if(num>100) num=100;
      } else {
        if(num<0) num=0;
        num = Math.floor(num);
      }
      val = String(num);
    }
  }

  if(!_avGrid.notas[key]) _avGrid.notas[key]={};
  var old=(_avGrid.notas[key][v]==null?'':String(_avGrid.notas[key][v]));
  if(old!==String(val)){
    _avGrid.notas[key][v]=val;
    _avTouchCell(key,v);
  }
  var w=document.getElementById('avGridWrap');
  if(w) Array.prototype.forEach.call(w.querySelectorAll('.av-cell'), function(inp){
    if(inp.getAttribute('data-t')===key && inp.getAttribute('data-v')===v) inp.value=val;
  });
  _avPersistNow(); /* autosave a cada célula */
}

function renderAvAutoBox(){
  var st=_avStudy(), rows=_avAutoRows(), vars=_avGrid.variaveis||[];
  if(!vars.length) return '<div class="av-auto-box"><div class="av-hint">Adicione pelo menos uma coluna de avaliação para usar o modo automático.</div></div>';
  if(!rows.length) return '<div class="av-auto-box"><div class="av-hint">Cadastre tratamentos e repetições para usar o modo automático.</div></div>';
  var a=_avAutoState(); if(!a)return '';
  var val=_avStepVal(a);
  var prod=a.row.produto?(' · '+a.row.produto):'';
  var locLabel=(a.row.parcela?('Parcela '+a.row.parcela):(a.row.campo||a.row.label||a.row.tratId+_repDisplay(a.row.rep)));
  var rowInfo=a.row.tratId+' · rep '+(a.row.repDisplay||_repDisplay(a.row.rep));
  var enterK='onkeydown="if(event.key===\'Enter\'){event.preventDefault();avAutoStep(1);}"';
  var conta=(a.tipo==='contagem'||a.tipo==='escala'||a.tipo==='razao');
  var input=conta
    ? '<div class="av-auto-count"><button type="button" onclick="avAutoBump(-1)">−</button><input id="avAutoInput" class="av-auto-input" value="'+esc(val)+'" inputmode="numeric" oninput="avAutoWrite(this.value)" '+enterK+' onblur="avValidateCell(this)"><button type="button" onclick="avAutoBump(1)">+</button></div>'
    : '<input id="avAutoInput" class="av-auto-input" value="'+esc(val)+'" inputmode="decimal" oninput="avAutoWrite(this.value)" '+enterK+' onblur="avValidateCell(this)" placeholder="%">';
  /* razão: o passo é o "n"; o N fica ao lado, já preenchido com o padrão do estudo */
  if(a.tipo==='razao'){
    var celR=(_avGrid.bruto[a.row.key]||{})[a.v]||{};
    var Nv=(celR.N==null||celR.N==='')?(a.cfg.N||''):celR.N;
    input+='<div class="av-auto-sub" style="margin-top:6px;text-align:right">de <input class="av-cell av-cell-sm" data-t="'+esc(a.row.key)+'" data-v="'+esc(a.v)+'" data-b="N" value="'+esc(Nv)+'" inputmode="numeric" onblur="avValidateCell(this)" style="width:52px"> avaliados</div>';
  }
  /* progresso: passos (parcela × variável × sub-amostra) já preenchidos */
  var filled=0; a.steps.forEach(function(s){ var x=_avStepVal(s); if(x!=null&&String(x).trim()!=='') filled++; });
  var pctDone=a.total?Math.round(filled/a.total*100):0;
  /* atalhos de valor comum: tocar SALVA e já avança (um toque por amostra) */
  var presets;
  if(a.tipo==='escala'){ presets=[]; for(var pi=0;pi<=a.cfg.escalaMax&&presets.length<10;pi++) presets.push(String(pi)); }
  else if(a.tipo==='razao'||a.tipo==='contagem') presets=['0','1','2','5','10'];
  else presets=['0','1','5','10','20','40','60','80','100'];
  var presetHtml=presets.map(function(pv){ return '<button type="button" class="av-auto-preset'+(String(val)===pv?' on':'')+'" onclick="avAutoPreset(\''+pv+'\')">'+pv+'</button>'; }).join('');
  /* rótulo do passo: mostra a sub-amostra e o derivado parcial da parcela */
  var passo=esc(a.v), der='';
  if(a.si>=0 && a.cfg.sub>1) passo+=' <small style="font-size:13px;opacity:.75">· amostra '+(a.si+1)+'/'+a.cfg.sub+'</small>';
  if(_avUsaBruto(a.cfg)){
    var d=(_avGrid.notas[a.row.key]&&_avGrid.notas[a.row.key][a.v])||'';
    var rot=(a.tipo==='escala')?'Índice':((a.tipo==='razao')?'Resultado':'Média da parcela');
    var suf=(a.tipo==='escala'||a.tipo==='razao')?'%':'';
    if(d!=='') der='<div class="av-auto-sub">'+rot+': <b style="color:#9fe0b6">'+esc(d)+suf+'</b></div>';
  }
  return '<div class="av-auto-box">'+
    '<div class="av-auto-top"><span>'+esc(locLabel)+'</span><span>parc '+(a.ri+1)+'/'+rows.length+' · var '+(a.vi+1)+'/'+vars.length+'</span></div>'+
    '<div class="av-auto-prog"><div class="av-auto-prog-fill" style="width:'+pctDone+'%"></div></div>'+
    '<div class="av-auto-progtxt">'+filled+' de '+a.total+' preenchidas'+(filled>=a.total?' ✓':'')+'</div>'+
    '<div class="av-auto-card"><div><div class="av-auto-main">'+passo+'</div><div class="av-auto-sub">'+esc((st&&st.codigo?st.codigo+' · ':'')+rowInfo+prod)+'</div>'+der+'</div>'+input+'</div>'+
    '<div class="av-auto-presets">'+presetHtml+'</div>'+
    '<div class="av-auto-nav"><button type="button" onclick="avAutoStep(-1)">‹ Anterior</button><button type="button" onclick="avAutoStep(1)">Salvar e próximo ›</button></div>'+
  '</div>';
}
function avAutoToggle(){
  _avSyncInputs();
  _avAuto.on=!_avAuto.on; _avAuto.pos=0;
  renderAvGrid();
  setTimeout(function(){ var i=document.getElementById('avAutoInput'); if(i)i.focus(); },60);
}
function avEnableStudyRandomizado(){
  var st=_avStudy(); if(!st)return;
  _avSyncInputs();
  st.randomizado=true;
  st.randomizacao=buildRandomizacao(st);
  _avAuto={on:true,pos:0};
  try{ save(); }catch(e){}
  renderAvGrid();
  setTimeout(function(){ var i=document.getElementById('avAutoInput'); if(i)i.focus(); },60);
}
function avAutoWrite(val){
  var a=_avAutoState(); if(!a)return;
  if(a.campo){ _avWriteBruto(a.row.key,a.v,a.campo,val); _avPersistNow(); }
  else _avSetCell(a.row.key,a.v,val);
}
function avAutoBump(delta){
  var a=_avAutoState(); if(!a)return;
  var cur=document.getElementById('avAutoInput'), n=parseFloat(cur&&cur.value); if(isNaN(n)) n=0;
  n+=delta; if(n<0)n=0;
  if(a.tipo==='escala'&&n>a.cfg.escalaMax) n=a.cfg.escalaMax;
  var val=(n%1===0)?String(n):n.toFixed(1);
  if(cur)cur.value=val;
  avAutoWrite(val);
}
function avAutoPreset(val){
  /* atalho de campo: toca no valor comum → SALVA e já avança pro próximo passo (1 toque) */
  var a=_avAutoState(); if(!a)return;
  avAutoWrite(val);
  if(_avAuto.pos<a.total-1) _avAuto.pos+=1; /* fica no último quando termina */
  renderAvGrid();
  setTimeout(function(){ var i=document.getElementById('avAutoInput'); if(i){ i.focus(); i.select&&i.select(); } },60);
}
function avAutoStep(delta){
  var cur=document.getElementById('avAutoInput'); if(cur) avAutoWrite(cur.value);
  var a=_avAutoState(); if(!a)return;
  _avAuto.pos+=delta;
  if(_avAuto.pos<0)_avAuto.pos=0;
  if(_avAuto.pos>=a.total)_avAuto.pos=a.total-1;
  renderAvGrid();
  setTimeout(function(){ var i=document.getElementById('avAutoInput'); if(i){ i.focus(); i.select&&i.select(); } },60);
}
function avAddCol(){
  _avSyncInputs(); _avCss();
  var m=document.getElementById('avColModal');
  if(!m){ m=document.createElement('div'); m.id='avColModal'; m.className='avcol-ovl';
    m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  var cat=_avCatalogo(); window._avColItens=cat.itens;
  var chips=cat.itens.map(function(it,i){ return '<button type="button" class="avcol-chip" onclick="avColPreset('+i+')">'+esc(it.nome)+'</button>'; }).join('');
  m.innerHTML='<div class="avcol-box">'+
    '<div class="avcol-title">Nova coluna de avaliação</div>'+
    (chips?('<label class="avcol-lab">Catálogo'+(cat.tipo?(' · '+esc(cat.tipo)):' (todos os tipos de estudo)')+'</label><div class="avcol-chips">'+chips+'</div>'):'')+
    '<label class="avcol-lab">Nome da variável</label>'+
    '<input id="avColNome" class="avcol-inp" placeholder="ex.: Fitoplasma, Severidade, Stand" autocomplete="off" onkeydown="if(event.key===\'Enter\')avColConfirm()">'+
    '<label class="avcol-lab">Como você vai lançar?</label>'+
    '<div class="avcol-types">'+
      '<button type="button" class="avcol-type on" data-t="pct" onclick="_avColType(\'pct\')">% / número<small>digita (severidade)</small></button>'+
      '<button type="button" class="avcol-type" data-t="contagem" onclick="_avColType(\'contagem\')">Contagem<small>botões − / +</small></button>'+
      '<button type="button" class="avcol-type" data-t="razao" onclick="_avColType(\'razao\')">Razão n/N<small>mortalidade, incidência</small></button>'+
      '<button type="button" class="avcol-type" data-t="escala" onclick="_avColType(\'escala\')">Escala<small>nota de classe → índice</small></button>'+
    '</div>'+
    '<div id="avColOpts"></div>'+
    '<div class="avcol-btns"><button type="button" class="avcol-ok" onclick="avColConfirm()">Adicionar</button>'+
      '<button type="button" class="avcol-cancel" onclick="document.getElementById(\'avColModal\').style.display=\'none\'">Cancelar</button></div>'+
  '</div>';
  m.style.display='flex'; window._avColTipo='pct'; window._avColOpts={sub:1,N:20,escalaMax:4,sentido:'menor'};
  _avColOptsRender();
  setTimeout(function(){ var i=document.getElementById('avColNome'); if(i) i.focus(); },60);
}
function _avColLerOpts(){
  var o=window._avColOpts||{sub:1,N:20,escalaMax:4};
  var s=document.getElementById('avColSub'); if(s) o.sub=Math.max(1,Math.round(_numBR(s.value,1))||1);
  var n=document.getElementById('avColN'); if(n) o.N=Math.max(0,Math.round(_numBR(n.value,0)));
  var e=document.getElementById('avColEsc'); if(e) o.escalaMax=Math.max(1,_numBR(e.value,4));
  var sd=document.getElementById('avColSentido'); if(sd) o.sentido=(sd.value==='maior')?'maior':'menor';
  window._avColOpts=o; return o;
}
function _avColOptsRender(){
  var box=document.getElementById('avColOpts'); if(!box) return;
  var t=window._avColTipo||'pct', o=window._avColOpts||{sub:1,N:20,escalaMax:4,sentido:'menor'}, h='<div class="avcol-opts">';
  if(t==='razao') h+='<div><label class="avcol-lab">N avaliados (padrão)</label><input id="avColN" class="avcol-inp" type="number" min="0" step="1" value="'+o.N+'"></div>';
  else h+='<div><label class="avcol-lab">Sub-amostras / parcela</label><input id="avColSub" class="avcol-inp" type="number" min="1" step="1" value="'+o.sub+'"></div>';
  if(t==='escala') h+='<div><label class="avcol-lab">Nota máxima da escala</label><input id="avColEsc" class="avcol-inp" type="number" min="1" step="1" value="'+o.escalaMax+'"></div>';
  h+='</div>';
  h+='<label class="avcol-lab">No % de controle, o melhor resultado é</label>'+
     '<select id="avColSentido" class="avcol-inp" onchange="_avColLerOpts();_avColOptsRender();">'+
       '<option value="menor"'+(o.sentido!=='maior'?' selected':'')+'>o MENOR valor — dano, severidade, incidência</option>'+
       '<option value="maior"'+(o.sentido==='maior'?' selected':'')+'>o MAIOR valor — mortalidade, eficácia</option>'+
     '</select>';
  if(o.sentido==='maior') h+='<div class="avcol-note">A testemunha é a <b>menor</b>: o % de controle sai pela <b>mortalidade corrigida de Abbott</b> — (tratado − testemunha) / (100 − testemunha).</div>';
  if(t==='razao') h+='<div class="avcol-note">Lança <b>n</b> (mortos/afetados) e <b>N</b> (avaliados) — o % sai sozinho. O N padrão já vem preenchido em toda parcela; só mude onde tiver fugido.</div>';
  else if(t==='escala') h+='<div class="avcol-note">Lança a <b>classe</b> (0–'+o.escalaMax+'). O derivado é o <b>índice de McKinney</b> em %, que é o que a estatística analisa.</div>';
  else h+='<div class="avcol-note">Com 2 ou mais sub-amostras o bruto de cada uma fica guardado e a parcela entra na análise pela <b>média</b> — sub-amostra não é repetição.</div>';
  box.innerHTML=h;
}
function avColPreset(i){
  var it=(window._avColItens||[])[i]; if(!it) return;
  var nome=document.getElementById('avColNome'); if(nome) nome.value=it.nome;
  window._avColOpts={sub:Math.max(1,parseInt(it.sub)||1), N:(it.N!=null?it.N:20), escalaMax:(it.escalaMax!=null?it.escalaMax:4), sentido:(it.sentido==='maior'?'maior':'menor')};
  _avColType(it.tipo||'pct');
}
function _avColType(t){ if(document.getElementById('avColOpts')) _avColLerOpts();
  window._avColTipo=AV_TIPOS[t]?t:'pct';
  Array.prototype.forEach.call(document.querySelectorAll('#avColModal .avcol-type'), function(b){ b.classList.toggle('on', b.getAttribute('data-t')===window._avColTipo); });
  _avColOptsRender();
}
function avColConfirm(){
  var i=document.getElementById('avColNome'); var name=(i?i.value:'').trim();
  if(!name){ if(i){ i.focus(); i.style.borderColor='#d84b43'; } return; }
  var t=window._avColTipo||'pct', o=_avColLerOpts();
  if(_avGrid.variaveis.indexOf(name)<0) _avGrid.variaveis.push(name);
  _avGrid.tipos[name]=t;
  if(!_avGrid.varcfg) _avGrid.varcfg={};
  var cfg={};
  if(t==='razao'){ if(o.N>0) cfg.N=o.N; }
  else if(o.sub>1) cfg.sub=o.sub;
  if(t==='escala') cfg.escalaMax=o.escalaMax;
  if(o.sentido==='maior') cfg.sentido='maior';
  _avGrid.varcfg[name]=cfg;
  var m=document.getElementById('avColModal'); if(m) m.style.display='none';
  renderAvGrid();
}
function avDelCol(name){
  _avSyncInputs();
  _avGrid.variaveis=_avGrid.variaveis.filter(function(v){return v!==name;});
  if(_avGrid.tipos) delete _avGrid.tipos[name];
  if(_avGrid.varcfg) delete _avGrid.varcfg[name];
  Object.keys(_avGrid.notas).forEach(function(t){ if(_avGrid.notas[t]) delete _avGrid.notas[t][name]; });
  Object.keys(_avGrid.meta||{}).forEach(function(t){ if(_avGrid.meta[t]) delete _avGrid.meta[t][name]; });
  Object.keys(_avGrid.bruto||{}).forEach(function(t){ if(_avGrid.bruto[t]) delete _avGrid.bruto[t][name]; });
  renderAvGrid();
}
/* Grade read-only (no detalhe do estudo e no export) */
function avGridHtml(a){
  if(!a.variaveis||!a.variaveis.length) return '';
  var st=_avStudy(), rows=_avRowsForStudy(st,false); if(!rows.length) return '';
  _avCss();
  var h='<div class="av-scroll"><table class="av-table"><thead><tr><th>Parc.</th>';
  a.variaveis.forEach(function(v){
    var cfg=_avCfg(a,v), suf='';
    if(cfg.tipo==='razao') suf=' <small style="opacity:.6">%</small>';
    else if(cfg.tipo==='escala') suf=' <small style="opacity:.6">índice</small>';
    if(cfg.sub>1) suf+=' <small style="opacity:.6">×'+cfg.sub+'</small>';
    h+='<th>'+esc(v)+suf+'</th>';
  });
  h+='</tr></thead><tbody>';
  rows.forEach(function(rw){ h+='<tr><td class="av-tname" title="'+esc(rw.produto||'')+'">'+esc(rw.label)+'</td>';
    a.variaveis.forEach(function(v){
      var val=_avNota(a,rw,v), cfg=_avCfg(a,v), br=_avBrutoTxt(a,rw.key,v), sub='';
      if(br){ sub=(cfg.tipo==='razao')?br:(_avSubCheias((a.bruto&&a.bruto[rw.key])?a.bruto[rw.key][v]:null)+' amostras'); }
      h+='<td'+(br?' title="'+esc(br)+'"':'')+'>'+esc(val||'—')+(sub?'<small style="display:block;font-size:9px;color:#7c8a80;font-weight:400">'+esc(sub)+'</small>':'')+'</td>';
    }); h+='</tr>'; });
  h+='</tbody></table></div>';
  return h;
}
/* ===== Análise: testemunha selecionável, % de controle e AUDPC ===== */
function studyTestemunha(s){ /* base do % de controle: 1ª testemunha marcada (preserva a antiga se ainda marcada). */
  var ts=(s.tratamentos||[]), ids=ts.map(function(t){return t.id;});
  if(s.testemunha && ids.indexOf(s.testemunha)>=0){ var pt=ts.find(function(t){return t.id===s.testemunha;}); if(pt&&pt.testemunha) return s.testemunha; }
  for(var i=0;i<ts.length;i++){ if(ts[i]&&ts[i].testemunha) return ts[i].id; }
  return (s.testemunha&&ids.indexOf(s.testemunha)>=0)?s.testemunha:(ids[0]||'');
}
/* Conjunto de testemunhas/checks = referência primária (% controle) + as marcadas por tratamento */
function studyTestemunhas(s){ var set={}, ref=studyTestemunha(s); if(ref)set[ref]=true; (s.tratamentos||[]).forEach(function(t){ if(t&&t.testemunha)set[t.id]=true; }); return Object.keys(set); }
function isTestemunha(s,id){ return studyTestemunhas(s).indexOf(id)>=0; }
function _avMeans(study, av){
  var rows=_avRowsForStudy(study,false), vars=(av.variaveis||[]), sum={}, cnt={};
  rows.forEach(function(rw){ vars.forEach(function(v){ var n=parseFloat(String(_avNota(av,rw,v)).replace(',','.')); if(!isNaN(n)){ var k=rw.tratId; (sum[k]=sum[k]||{}); (cnt[k]=cnt[k]||{}); sum[k][v]=(sum[k][v]||0)+n; cnt[k][v]=(cnt[k][v]||0)+1; } }); });
  var m={}; Object.keys(sum).forEach(function(k){ m[k]={}; vars.forEach(function(v){ if(cnt[k]&&cnt[k][v]) m[k][v]=sum[k][v]/cnt[k][v]; }); }); return m;
}
function _r1(x){ return Math.round(x*10)/10; }
function _pctCtrl(ref, val, sentido){
  /* % de controle vs testemunha, em duas famílias:

     sentido 'menor' (padrão — dano, severidade, incidência: a testemunha é a MAIOR)
       redução de Abbott: (test − tratado) / test × 100.
       Devolve null (→ "—") fora da faixa válida: testemunha ≤ 0 (divisão instável) ou
       resultado < -100%, o que evita valores absurdos tipo -10000%.

     sentido 'maior' (mortalidade e afins: a testemunha é a MENOR)
       mortalidade corrigida de Abbott: (tratado − test) / (100 − test) × 100.
       Só faz sentido em variável limitada a 100% (razão n/N e escala já são). */
  if(ref==null || val==null) return null;
  if(sentido==='maior'){
    if(!(ref<100) || ref<0) return null;
    var mc=(val-ref)/(100-ref)*100;
    if(!isFinite(mc) || mc < -100) return null;
    return mc;
  }
  if(!(ref>0)) return null;
  var e=(ref-val)/ref*100;
  if(!isFinite(e) || e < -100) return null;
  return e;
}
/* Sentido da variável: 'maior' = quanto maior, melhor (mortalidade). Padrão 'menor'. */
function _avSentido(src,v){ var c=(src&&src.varcfg&&src.varcfg[v])||{}; return c.sentido==='maior'?'maior':'menor'; }
/* Última avaliação do estudo que define a variável — de onde sai a config dela nos resumos. */
function _avCfgDoEstudo(study,v){
  var out=null;
  ((study&&study.avaliacoes)||[]).forEach(function(a){ if((a.variaveis||[]).indexOf(v)>=0 && a.varcfg && a.varcfg[v]) out=a; });
  return out;
}
function avResultHtml(study, av){
  var vars=(av.variaveis||[]); if(!vars.length) return '';
  var means=_avMeans(study,av); if(!Object.keys(means).length) return '';
  _avCss(); var test=studyTestemunha(study), ts=(study.tratamentos||[]), h='';
  vars.forEach(function(v){
    var tm=(means[test]&&means[test][v]);
    h+='<div class="res-title">'+esc(v)+' · média &amp; % controle</div><div class="av-scroll"><table class="av-table"><thead><tr><th>Trat.</th><th>Média</th><th>% ctrl</th></tr></thead><tbody>';
    ts.forEach(function(t){ var mv=means[t.id]&&means[t.id][v], ctrl;
      if(t.id===test) ctrl='<b>test.</b>';
      else { var _c=_pctCtrl(tm,mv,_avSentido(av,v)); ctrl=(_c!=null)?(_r1(_c)+'%'):'—'; }
      h+='<tr><td class="av-tname">'+esc(t.id)+(t.id===test?' ●':'')+'</td><td>'+(mv!=null?_r1(mv):'—')+'</td><td>'+ctrl+'</td></tr>'; });
    h+='</tbody></table></div>';
  });
  return h;
}
function studyAudpcHtml(study){
  var avs=study.avaliacoes.slice().filter(function(a){return a.data && a.variaveis && a.variaveis.length;}).sort(function(a,b){return (a.data||'').localeCompare(b.data||'');});
  if(avs.length<2) return '';
  var byVar={}; avs.forEach(function(av){ var m=_avMeans(study,av); (av.variaveis||[]).forEach(function(v){ (byVar[v]=byVar[v]||[]).push({date:av.data,m:m}); }); });
  var test=studyTestemunha(study), ts=(study.tratamentos||[]), h='';
  Object.keys(byVar).forEach(function(v){
    var pts=byVar[v]; if(pts.length<2) return;
    var t0=new Date(pts[0].date), days=pts.map(function(p){ return Math.max(0,Math.round((new Date(p.date)-t0)/864e5)); });
    function audpc(tr){ var s=0,prev=null,pt=null; for(var i=0;i<pts.length;i++){ var y=pts[i].m[tr]&&pts[i].m[tr][v]; if(y==null) return null; if(prev!=null) s+=(prev+y)/2*(days[i]-pt); prev=y; pt=days[i]; } return s; }
    var ta=audpc(test);
    h+='<div class="res-title">'+esc(v)+' · '+pts.length+' datas, '+days[days.length-1]+'d</div><div class="av-scroll"><table class="av-table"><thead><tr><th>Trat.</th><th>AUDPC</th><th>% ctrl</th></tr></thead><tbody>';
    ts.forEach(function(t){ var a=audpc(t.id), ctrl; if(t.id===test)ctrl='<b>test.</b>'; else { var _c=_pctCtrl(ta,a); ctrl=(_c!=null)?(_r1(_c)+'%'):'—'; }
      h+='<tr><td class="av-tname">'+esc(t.id)+(t.id===test?' ●':'')+'</td><td>'+(a!=null?Math.round(a):'—')+'</td><td>'+ctrl+'</td></tr>'; });
    h+='</tbody></table></div>';
  });
  if(!h) return '';
  return '<div class="sd-section"><div class="sd-section-title">AUDPC / progresso da doença <span style="font-weight:400;color:#8a948e">(● testemunha)</span></div>'+h+'</div>';
}
function _chartPal(i){ var p=['#1f8a52','#2f85c9','#d69431','#9b59b6','#e0566b','#16a085','#c0392b','#2c3e50','#f39c12','#27ae60','#8e44ad','#d35400']; return p[i%p.length]; }
function _barsSvg(bars){
  var W=320,rowH=24,pad=6,n=bars.length,Hh=n*rowH+pad*2,lblW=34,barX=lblW+4,barW=W-barX-46;
  var h='<svg width="100%" viewBox="0 0 '+W+' '+Hh+'" preserveAspectRatio="xMinYMin meet" style="background:#fff;border:1px solid #e2e8e3;border-radius:8px;max-width:360px;margin-top:2px">';
  bars.forEach(function(b,i){ var y=pad+i*rowH, v=(b.val==null?0:Math.max(0,Math.min(100,b.val))), w=barW*v/100;
    h+='<text x="'+lblW+'" y="'+(y+rowH/2+4)+'" text-anchor="end" font-size="11" font-weight="700" fill="#26312b">'+esc(b.label)+'</text>';
    h+='<rect x="'+barX+'" y="'+(y+4)+'" width="'+barW+'" height="'+(rowH-9)+'" rx="3" fill="#eef2ee"/>';
    h+='<rect x="'+barX+'" y="'+(y+4)+'" width="'+w.toFixed(1)+'" height="'+(rowH-9)+'" rx="3" fill="#1f8a52"/>';
    h+='<text x="'+(barX+barW+4)+'" y="'+(y+rowH/2+4)+'" font-size="11" fill="#26312b">'+(b.val==null?'—':(Math.round(b.val*10)/10)+'%')+'</text>'; });
  return h+'</svg>';
}
function _progressSvg(study,v,avs,test,ts){
  var W=520,Hh=200,pad=34, t0=new Date(avs[0].data), days=avs.map(function(a){return Math.max(0,Math.round((new Date(a.data)-t0)/864e5));}), maxD=Math.max(1,days[days.length-1]);
  var means=avs.map(function(a){return _avMeans(study,a);}), allv=[];
  ts.forEach(function(t){ means.forEach(function(m){ var y=m[t.id]&&m[t.id][v]; if(y!=null)allv.push(y); }); });
  var mx=allv.length?Math.max.apply(null,allv):1; if(mx<=0)mx=1;
  function X(d){ return pad+(W-2*pad)*(d/maxD); } function Y(y){ return Hh-pad-(Hh-2*pad)*(y/mx); }
  var h='<svg width="100%" viewBox="0 0 '+W+' '+Hh+'" style="background:#fff;border:1px solid #e2e8e3;border-radius:8px;margin-top:2px">';
  h+='<line x1="'+pad+'" y1="'+(Hh-pad)+'" x2="'+(W-pad)+'" y2="'+(Hh-pad)+'" stroke="#cdd6cf"/><line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(Hh-pad)+'" stroke="#cdd6cf"/>';
  h+='<text x="4" y="'+(pad+4)+'" font-size="9" fill="#8a948e">'+Math.round(mx)+'</text><text x="8" y="'+(Hh-pad)+'" font-size="9" fill="#8a948e">0</text>';
  h+='<text x="'+pad+'" y="'+(Hh-6)+'" font-size="9" fill="#8a948e">'+days[0]+'d</text><text x="'+(W-pad)+'" y="'+(Hh-6)+'" font-size="9" fill="#8a948e" text-anchor="end">'+maxD+'d</text>';
  var leg='';
  ts.forEach(function(t,ti){ var col=(t.id===test)?'#222':_chartPal(ti), pp=[]; avs.forEach(function(a,i){ var y=means[i][t.id]&&means[i][t.id][v]; if(y!=null)pp.push([X(days[i]),Y(y)]); });
    if(!pp.length)return; var d=pp.map(function(p,k){return (k?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' ');
    h+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(t.id===test?2.6:1.8)+'"'+(t.id===test?' stroke-dasharray="5 3"':'')+'/>';
    pp.forEach(function(p){ h+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.4" fill="'+col+'"/>'; });
    leg+='<span style="display:inline-flex;align-items:center;gap:4px;margin:0 8px 2px 0;font-size:10px;color:#26312b"><span style="width:12px;height:3px;background:'+col+';display:inline-block;border-radius:2px"></span>'+esc(t.id)+(t.id===test?' (test.)':'')+'</span>'; });
  return h+'</svg><div style="margin:4px 0 2px;line-height:1.8">'+leg+'</div>';
}
function studyChartsHtml(study){
  var avsR=study.avaliacoes.slice().filter(function(a){return a.data&&a.variaveis&&a.variaveis.length;}).sort(function(a,b){return (a.data||'').localeCompare(b.data||'');});
  if(!avsR.length) return '';
  var vars={}; avsR.forEach(function(a){ (a.variaveis||[]).forEach(function(v){ vars[v]=1; }); });
  var test=studyTestemunha(study), ts=study.tratamentos||[], H='';
  Object.keys(vars).forEach(function(v){
    var lastAv=null,i; for(i=avsR.length-1;i>=0;i--){ if((avsR[i].variaveis||[]).indexOf(v)>=0){ lastAv=avsR[i]; break; } }
    if(lastAv){ var m=_avMeans(study,lastAv), tm=m[test]&&m[test][v], bars=[];
      ts.forEach(function(t){ if(t.id===test)return; var mv=m[t.id]&&m[t.id][v]; bars.push({label:t.id, val:_pctCtrl(tm,mv,_avSentido(lastAv,v))}); });
      if(bars.length) H+='<div class="res-title">'+esc(v)+' · % de controle ('+esc(isoToBR(lastAv.data))+')</div>'+_barsSvg(bars);
    }
    var pts=avsR.filter(function(a){return (a.variaveis||[]).indexOf(v)>=0;});
    if(pts.length>=2) H+='<div class="res-title">'+esc(v)+' · progresso (severidade × tempo)</div>'+_progressSvg(study,v,pts,test,ts);
  });
  if(!H) return '';
  return '<div class="sd-section"><div class="sd-section-title">Gráficos</div>'+H+'</div>';
}

function openStudyEditAvaliacao(aid,tipoSugerido,forceUnlock){
  editingAvId=aid;editingAplId=null;draftAp=null;
  var q=data[curV],study=(q.estudos||[]).find(function(s){return s.id===curSid});
  if(!study){draftAv=null;return;}
  var av;
  if(aid==="__new__"){
    av=draftAv||{id:uid(),data:todayISO(),tipo:tipoSugerido||"",bbch:"",obs:""};
    draftAv=av;
  }else{
    draftAv=null;
    av=study.avaliacoes.find(function(a){return a.id===aid});
  }
  if(!av)return;
  _avGrid={
    variaveis:(av.variaveis||[]).slice(),
    notas:JSON.parse(JSON.stringify(av.notas||{})),
    tipos:JSON.parse(JSON.stringify(av.tipos||{})),
    meta:JSON.parse(JSON.stringify(av.notasMeta||{})),
    varcfg:JSON.parse(JSON.stringify(av.varcfg||{})),
    bruto:JSON.parse(JSON.stringify(av.bruto||{}))
  };
  if(study.randomizado) ensureStudyRandomizacao(study);
  _avAuto={on:!!study.randomizado,pos:0};
  var bbchList=getBBCHList(q.cultura);

  var signed=!!(av.carimbo && av.carimbo.rubrica);
  var reopened=!!(_avReopen && _avReopen.avid===av.id);
  var locked=signed && !forceUnlock && !reopened;
  var assinEm=''; try{ if(av.carimbo&&av.carimbo.rubricaEm){ var _dd=new Date(av.carimbo.rubricaEm); assinEm=isNaN(_dd)?'':_dd.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); } }catch(e){}
  var assinPor=(av.carimbo&&(av.carimbo.rubricaNome||av.carimbo.rubricaPor))||'';

  var h='<div class="se-head"><h3>Avaliação'+(aid==="__new__"?' (nova)':'')+'</h3><button class="se-x" onclick="closeEventEdit()">×</button></div>';
  if(signed){ h+='<div style="margin:0 0 10px;padding:9px 11px;border-radius:10px;font-size:12px;line-height:1.45;'+(locked?'background:#102218;border:1px solid #245a36;color:#9fe0b6':'background:#2a210c;border:1px solid #6b531b;color:#ffd98a')+'">'+(locked?'🔒 ':'✏️ ')+'<b>Assinada</b>'+(assinEm?(' em '+esc(assinEm)):'')+(assinPor?(' por '+esc(assinPor)):'')+'.'+(locked?' Somente leitura — toque em “Reabrir para editar”.':' Reaberta — a alteração será registrada na trilha e exigirá nova assinatura.')+'</div>'; }
  if(reopened){ h+='<div style="margin:0 0 10px;padding:7px 10px;border-radius:9px;background:#241a2a;border:1px solid #5a3a6b;color:#d8b6e6;font-size:11px">Motivo desta edição: <b>'+esc(_avReopen.motivo)+'</b></div>'; }
  h+='<fieldset id="avFs"'+(locked?' disabled':'')+' style="border:0;padding:0;margin:0;min-width:0">';
  h+='<div class="se-field"><label>Data</label><input type="date" id="vData" value="'+esc(av.data)+'"></div>';
  /* Momento explícito — OPCIONAL. Em branco, o app segue derivando o DAA da data,
     como sempre fez. Preenchido, é ele que identifica a avaliação: é o que permite
     1, 2, 4 e 24 HAT no mesmo dia sem uma engolir a outra. */
  var _mm=(av.momento&&(av.momento.unidade==='HAT'||av.momento.unidade==='DAT'))?av.momento:null;
  h+='<div class="se-row">';
  h+='<div class="se-field"><label>Momento <span style="opacity:.6">opcional</span></label>'+
     '<input type="text" id="vMomVal" inputmode="decimal" placeholder="em branco = pela data" value="'+esc(_mm?String(_mm.valor).replace('.',','):'')+'"></div>';
  h+='<div class="se-field"><label>Unidade</label><select id="vMomUn">'+
     '<option value="">—</option>'+
     '<option value="HAT"'+(_mm&&_mm.unidade==='HAT'?' selected':'')+'>HAT (horas)</option>'+
     '<option value="DAT"'+(_mm&&_mm.unidade==='DAT'?' selected':'')+'>DAT (dias)</option>'+
     '</select></div>';
  h+='<div class="se-field"><label>Hora <span style="opacity:.6">opcional</span></label><input type="time" id="vHora" value="'+esc(av.hora||'')+'"></div>';
  h+='</div>';
  h+='<div style="font-size:11px;color:#9a8;margin:-2px 0 8px">Deixe em branco e o momento sai da data, como sempre. Preencha quando houver mais de uma leitura no MESMO dia (ex.: knockdown a 1, 2, 4 e 24 HAT) — sem isto o app guarda só a primeira.</div>';
  h+='<div class="se-field"><label>Tipo de avaliação</label><select id="vTipo"><option value="">—</option>';
  TIPOS_AVALIACAO.forEach(function(t){
    h+='<option value="'+esc(t)+'"'+(t===av.tipo?' selected':'')+'>'+esc(t)+'</option>';
  });
  h+='</select></div>';
  if(bbchList){
    h+='<div class="se-field"><label>Estádio BBCH no momento</label><select id="vBBCH"><option value="">—</option>';
    bbchList.forEach(function(b){
      h+='<option value="'+esc(b.code)+'"'+(b.code===av.bbch?' selected':'')+'>'+esc(b.label)+(b.equiv?' ('+esc(b.equiv)+')':'')+'</option>';
    });
    h+='</select></div>';
  }
  /* Ensaio em faixas: avisa AQUI, que é quando a informação serve — na hora de
     digitar. Dizer depois, na folha, é tarde: o campo já foi embora. */
  if(study.desenho==='faixas'){
    var _fx=null; try{ _fx=estudoTemReplicacao(study, av, (av.variaveis||[])[0]||''); }catch(e){}
    var _okFx=!!(_fx&&_fx.ok);
    h+='<div style="margin:0 0 10px;padding:9px 11px;border-radius:10px;font-size:12px;line-height:1.5;'+
       (_okFx?'background:#102218;border:1px solid #245a36;color:#9fe0b6':'background:#2a210c;border:1px solid #6b531b;color:#ffd98a')+'">'+
       (_okFx?'✓ ':'⚠ ')+'<b>Ensaio em faixas.</b> Cada linha da grade é um <b>treço</b> da faixa, não uma repetição solta. '+
       (_okFx
         ? ('Com '+_fx.blocos+' treços preenchidos em todos os tratamentos, esta avaliação gera estatística (blocos por posição).')
         : ('Enquanto houver treço preenchido em apenas um ponto, a folha sai <b>sem p-valor</b>: medir mais pontos dentro da MESMA faixa não cria repetição. Preencha os mesmos treços em todas as faixas.'))+
       '</div>';
  }
  h+='<div class="se-field"><label>Notas por tratamento</label><div id="avGridWrap"></div></div>';
  h+='<div class="se-field"><label>Observações / Resultados</label><textarea id="vObs" rows="4" placeholder="Dados coletados, notas de campo...">'+esc(av.obs||"")+'</textarea></div>';
  h+='</fieldset>';
  if(locked){ h+='<div class="se-actions"><button class="btn-save" onclick="reabrirAvaliacao(\''+av.id+'\')">🔓 Reabrir para editar</button><button class="btn-cancel" onclick="closeEventEdit()">Fechar</button></div>'; }
  else { h+='<div class="se-actions"><button class="btn-save" onclick="saveAvaliacao()">SALVAR</button><button class="btn-cancel" onclick="closeEventEdit()">Cancelar</button></div>'; }

  document.getElementById("eePnl").innerHTML=h;
  renderAvGrid();
  window._avEditing=true; document.getElementById("eeOvl").classList.add("open");
}

/* ===== FINALIZAÇÃO DO ESTUDO (BPL) =========================================
   Fecha o estudo: senha (reautenticação de verdade no Firebase, o mesmo caminho
   da exclusão), rubrica por toque, carimbo de quem e quando — e a ESTATÍSTICA
   CONGELADA junto do estudo.

   Congelar a estatística é o ponto: até aqui ela era recalculada no aparelho
   toda vez que alguém abria a folha, então o número do relatório dependia da
   versão do app que rodou por último. Em BPL o resultado é do dia em que foi
   assinado — a partir da finalização é o retrato salvo que vale, não o recálculo.

   Depois de finalizado o estudo fica somente-leitura e some da agenda. Reabrir
   exige senha de novo, pede o motivo e fica na trilha de auditoria. */
function estudoFinalizado(s){ return !!(s && s.finalizacao && s.finalizacao.em); }
function _estudoDe(qid,sid){
  var q=data[qid]||{}; return (q.estudos||[]).find(function(x){ return x && x.id===sid; });
}
/* Retrato da estatística: ANOVA-DBC + Tukey de cada (avaliação × variável).
   Guarda também o que NÃO deu para calcular e por quê — silêncio aqui viraria
   "esta avaliação não tinha estatística", que é diferente de "faltava dado". */
function _statSnapshot(s){
  var out={ gerado:new Date().toISOString(), motor:'statDBC/Tukey 0,05', itens:[], semAnalise:[] };
  var base=(typeof _pranchaBase==='function')?_pranchaBase(s):null;
  (s.avaliacoes||[]).forEach(function(av){
    var daa=null;
    try{ var dt=pD(isoToBR(av.data))||pD(av.data); if(base&&base.data&&dt&&!isNaN(dt)) daa=daysBetween(base.data,dt); }catch(e){}
    var mom=avMomento(av,daa);
    (av.variaveis||[]).forEach(function(v){
      var r=null; try{ r=statDBC(s,av,v); }catch(e){ r=null; }
      var rep=null; try{ rep=estudoTemReplicacao(s,av,v); }catch(e){}
      if(r) out.itens.push({ avId:av.id, data:av.data, momento:mom.rotulo, variavel:v, stat:r,
                             desenho:(rep&&rep.rotulo)||'' });
      else {
        /* O MOTIVO vai gravado. "Sem análise" e "sem análise porque o ensaio em
           faixas não tem treços" são coisas diferentes para quem audita depois. */
        out.semAnalise.push({ avId:av.id, data:av.data, momento:mom.rotulo, variavel:v,
                              porque:(rep && rep.motivo) ? rep.motivo
                                   : 'grade incompleta ou menos de 2 tratamentos/repetições' });
      }
    });
  });
  return out;
}
function finalizarEstudo(qid,sid){
  var s=_estudoDe(qid,sid); if(!s) return;
  s=normalizeStudy(s);
  if(estudoFinalizado(s)){ alert('Este estudo já está finalizado.'); return; }
  var nAv=(s.avaliacoes||[]).length;
  if(!nAv && !confirm('Este estudo não tem nenhuma avaliação registrada.\n\nFinalizar assim mesmo?')) return;
  var prev=_statSnapshot(s);
  var resumo='Serão congelados '+prev.itens.length+' resultado(s) de estatística'+
             (prev.semAnalise.length?(' — '+prev.semAnalise.length+' avaliação(ões) ficam sem análise por falta de dado'):'')+
             '.\n\nDepois disso o estudo fica somente-leitura e sai da agenda.';
  requireDeletePassword(resumo, function(){
    openRubrica(function(url){
      if(!url){ alert('Sem a rubrica o estudo não é finalizado.'); return; }
      var st=_estudoDe(qid,sid); if(!st) return;
      st.estatisticaFinal=_statSnapshot(st);   /* recalcula na hora do aceite, não a prévia */
      st.finalizacao={
        em:new Date().toISOString(),
        por:(typeof _authUser!=='undefined'&&_authUser&&_authUser.email)||'',
        nome:_currentUserName(),
        rubrica:url,
        significado:'Estudo finalizado — dados conferidos e estatística congelada',
        fuso:(function(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||''; }catch(e){ return ''; } })(),
        nAvaliacoes:(st.avaliacoes||[]).length,
        nResultados:(st.estatisticaFinal.itens||[]).length
      };
      logStudyAuditInObject(st,'Finalização do Estudo',
        'Estudo finalizado e travado. '+st.finalizacao.nResultados+' resultado(s) de estatística congelados.',
        {rubrica:1});
      st._ts=Date.now();
      save();
      try{ if(typeof dbUpsertEstudo==='function') dbUpsertEstudo(qid,st); }catch(e){}
      alert('Estudo finalizado.\n\n'+st.finalizacao.nResultados+' resultado(s) de estatística congelados em '+
            new Date(st.finalizacao.em).toLocaleString('pt-BR')+'.\n\nEle saiu da agenda e dos lembretes de hoje.');
      try{ renderAgenda(); }catch(e){}
      openStudyDetail(qid,sid);
    }, 'Rubrique para finalizar o estudo '+(s.codigo||s.id));
  }, {title:'Finalizar estudo '+(s.codigo||s.id), ok:'Finalizar'});
}
function reabrirEstudo(qid,sid){
  var s=_estudoDe(qid,sid); if(!s||!estudoFinalizado(s)) return;
  var motivo=prompt('Por que este estudo está sendo reaberto?\n\nO motivo fica na trilha de auditoria.');
  if(motivo===null) return;
  motivo=String(motivo).trim();
  if(!motivo){ alert('Reabrir um estudo finalizado exige um motivo registrado.'); return; }
  requireDeletePassword('Reabrir o estudo '+(s.codigo||s.id)+' para edição.\nMotivo: '+motivo, function(){
    var st=_estudoDe(qid,sid); if(!st) return;
    var fin=st.finalizacao||{};
    /* A estatística congelada NÃO é apagada: vira histórico. Um estudo reaberto
       precisa poder mostrar o que estava assinado antes da alteração. */
    if(!Array.isArray(st.finalizacoesAnteriores)) st.finalizacoesAnteriores=[];
    st.finalizacoesAnteriores.push({ finalizacao:fin, estatistica:st.estatisticaFinal||null,
                                     reabertoEm:new Date().toISOString(),
                                     reabertoPor:(typeof _authUser!=='undefined'&&_authUser&&_authUser.email)||'',
                                     motivo:motivo });
    delete st.finalizacao; delete st.estatisticaFinal;
    logStudyAuditInObject(st,'Reabertura do Estudo',
      'Reaberto para edição. Motivo: "'+motivo+'". A finalização de '+
      (fin.em?new Date(fin.em).toLocaleString('pt-BR'):'—')+' foi arquivada.');
    st._ts=Date.now();
    save();
    try{ if(typeof dbUpsertEstudo==='function') dbUpsertEstudo(qid,st); }catch(e){}
    try{ renderAgenda(); }catch(e){}
    openStudyDetail(qid,sid);
  }, {title:'Reabrir estudo', ok:'Reabrir'});
}
/* Porta única de escrita: qualquer edição do estudo passa por aqui antes de gravar. */
function _bloqueadoPorFinalizacao(qid,sid){
  var s=_estudoDe(qid,sid);
  if(!estudoFinalizado(s)) return false;
  alert('Estudo finalizado em '+new Date(s.finalizacao.em).toLocaleString('pt-BR')+
        (s.finalizacao.nome?(' por '+s.finalizacao.nome):'')+'.\n\n'+
        'Ele está somente-leitura. Use "Reabrir estudo" — pede senha e registra o motivo na trilha.');
  return true;
}

/* ===== RUBRICA (assinatura por toque) — módulo isolado, aditivo ===== */
var _rubricaCb=null,_rubricaCtx=null,_rubricaDrawing=false,_rubricaDirty=false;
function _rubricaPos(cv,e){ var r=cv.getBoundingClientRect(); var t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0])||e; return {x:t.clientX-r.left,y:t.clientY-r.top}; }
function _rubricaBind(cv){
  if(cv._rbBound) return; cv._rbBound=true;
  function start(e){ if(e.cancelable)e.preventDefault(); _rubricaDrawing=true; if(!_rubricaCtx)return; var p=_rubricaPos(cv,e); _rubricaCtx.beginPath(); _rubricaCtx.moveTo(p.x,p.y); _rubricaCtx.lineTo(p.x+0.1,p.y+0.1); _rubricaCtx.stroke(); _rubricaDirty=true; }
  function move(e){ if(!_rubricaDrawing||!_rubricaCtx)return; if(e.cancelable)e.preventDefault(); var p=_rubricaPos(cv,e); _rubricaCtx.lineTo(p.x,p.y); _rubricaCtx.stroke(); _rubricaDirty=true; }
  function end(){ _rubricaDrawing=false; }
  cv.addEventListener('touchstart',start,{passive:false}); cv.addEventListener('touchmove',move,{passive:false}); cv.addEventListener('touchend',end); cv.addEventListener('touchcancel',end);
  cv.addEventListener('mousedown',start); cv.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
}
function openRubrica(onDone,info){
  var ovl=document.getElementById('rubricaOvl'), cv=document.getElementById('rubricaCanvas');
  if(!ovl||!cv){ if(onDone)onDone(null); return; }
  _rubricaCb=onDone||null; _rubricaDirty=false;
  ovl.style.display='flex';
  var inf=document.getElementById('rubricaInfo'); if(inf) inf.textContent=info||'';
  setTimeout(function(){
    var r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
    var w=Math.round(r.width)||(cv.parentElement?cv.parentElement.clientWidth:0)||window.innerWidth;
    var h=Math.round(r.height)||(cv.parentElement?cv.parentElement.clientHeight:0)||(window.innerHeight-130);
    cv.width=Math.max(1,Math.round(w*dpr)); cv.height=Math.max(1,Math.round(h*dpr));
    _rubricaCtx=cv.getContext('2d'); _rubricaCtx.setTransform(dpr,0,0,dpr,0,0);
    _rubricaCtx.lineWidth=2.6; _rubricaCtx.lineCap='round'; _rubricaCtx.lineJoin='round'; _rubricaCtx.strokeStyle='#13202b';
    _rubricaCtx.clearRect(0,0,w,h);
    _rubricaBind(cv);
  },60);
}
function rubricaClear(){ var cv=document.getElementById('rubricaCanvas'); if(_rubricaCtx&&cv){ var r=cv.getBoundingClientRect(); _rubricaCtx.clearRect(0,0,r.width,r.height); } _rubricaDirty=false; }
function _rubricaClose(){ var ovl=document.getElementById('rubricaOvl'); if(ovl) ovl.style.display='none'; }
function rubricaSkip(){ _rubricaClose(); var cb=_rubricaCb; _rubricaCb=null; if(cb)cb(null); }
function rubricaConfirm(){ var cv=document.getElementById('rubricaCanvas'),url=null; try{ if(_rubricaDirty&&cv) url=cv.toDataURL('image/png'); }catch(e){} _rubricaClose(); var cb=_rubricaCb; _rubricaCb=null; if(cb)cb(url); }
/* ===== DIÁRIO DE AVALIAÇÕES (rede de segurança no aparelho) =====================
   Caixa-preta append-only em IndexedDB (independente do blob/localStorage): toda
   avaliação salva fica registrada localmente, p/ recuperar mesmo se a sincronização
   falhar ou o aparelho nunca subir. Best-effort: NUNCA atrapalha o salvamento. */
var _AVJ_DB='agracta-journal', _AVJ_STORE='avals', _AVJ_MAX=3000;
function _avjOpen(){
  return new Promise(function(res,rej){
    try{
      if(!window.indexedDB){ rej('sem indexedDB'); return; }
      var rq=indexedDB.open(_AVJ_DB,1);
      rq.onupgradeneeded=function(e){ var db=e.target.result; if(!db.objectStoreNames.contains(_AVJ_STORE)){ var os=db.createObjectStore(_AVJ_STORE,{keyPath:'k',autoIncrement:true}); os.createIndex('ts','ts'); } };
      rq.onsuccess=function(){ res(rq.result); };
      rq.onerror=function(){ rej(rq.error); };
    }catch(e){ rej(e); }
  });
}
function journalAval(rec){
  try{
    _avjOpen().then(function(db){
      try{
        var tx=db.transaction(_AVJ_STORE,'readwrite'), os=tx.objectStore(_AVJ_STORE);
        os.add(rec);
        var cq=os.count(); cq.onsuccess=function(){ var n=cq.result; if(n>_AVJ_MAX){ var toDel=n-_AVJ_MAX; var cur=os.openCursor(); cur.onsuccess=function(e){ var c=e.target.result; if(c&&toDel>0){ c.delete(); toDel--; c.continue(); } }; } };
        tx.oncomplete=function(){ try{db.close();}catch(_){} };
        tx.onerror=function(){ try{db.close();}catch(_){} };
      }catch(_){ try{db.close();}catch(__){} }
    }, function(){});
  }catch(e){}
}
function journalGetAll(){
  return _avjOpen().then(function(db){
    return new Promise(function(res){
      var out=[];
      try{ var tx=db.transaction(_AVJ_STORE,'readonly'), cur=tx.objectStore(_AVJ_STORE).openCursor();
        cur.onsuccess=function(e){ var c=e.target.result; if(c){ out.push(c.value); c.continue(); } else { try{db.close();}catch(_){} res(out); } };
        cur.onerror=function(){ try{db.close();}catch(_){} res(out); };
      }catch(_){ try{db.close();}catch(__){} res(out); }
    });
  }, function(){ return []; });
}
function _avjCells(r){ var n=0,t=r&&r.notas||{}; for(var tr in t){ for(var v in t[tr]){ if(t[tr][v]!=='' && t[tr][v]!=null) n++; } } return n; }
function exportAvalJournal(){
  journalGetAll().then(function(arr){
    try{
      var blob=new Blob([JSON.stringify({_agracta_diario_avaliacoes:true, exportadoEm:new Date().toISOString(), aparelho:navigator.userAgent, total:arr.length, registros:arr},null,1)],{type:'application/json'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='agracta-diario-avaliacoes-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(_){} },3000);
      if(typeof _stxToast==='function') _stxToast('Diário exportado ('+arr.length+' registros)');
    }catch(e){ if(typeof _stxToast==='function')_stxToast('Falha ao exportar: '+e.message); }
  });
}
function openAvalRecovery(){
  var m=document.getElementById('avalRecModal');
  if(!m){ m=document.createElement('div'); m.id='avalRecModal'; m.style.cssText='position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,.66);display:flex;align-items:flex-start;justify-content:center;padding:18px 12px;overflow-y:auto;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  m.style.display='flex';
  m.innerHTML='<div style="background:#0e150e;border:1px solid #2a3a2a;border-radius:16px;max-width:520px;width:100%;padding:18px;box-sizing:border-box;color:#eaf3ed;font:13px system-ui,sans-serif;margin:12px auto;box-shadow:0 20px 60px rgba(0,0,0,.7)">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#37d684;font-size:15px">Recuperação de avaliações</b><button onclick="document.getElementById(\'avalRecModal\').style.display=\'none\'" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer">✕</button></div>'+
    '<div style="font-size:11px;color:#8aa88a;margin-top:4px;line-height:1.5">Diário local deste aparelho (caixa-preta, independente da nuvem). Toda avaliação salva aqui fica registrada para recuperação.</div>'+
    '<div id="avalRecList" style="max-height:46vh;overflow-y:auto;margin-top:10px;border:1px solid #2a3a2a;border-radius:10px;padding:8px;background:#090f0a">Carregando…</div>'+
    '<button onclick="exportAvalJournal()" style="width:100%;background:#1f5a2a;color:#eafaea;border:none;border-radius:9px;padding:11px;font-weight:800;margin-top:12px;cursor:pointer">Exportar diário (JSON)</button>'+
  '</div>';
  journalGetAll().then(function(arr){
    var box=document.getElementById('avalRecList'); if(!box) return;
    if(!arr.length){ box.innerHTML='<div style="color:#8aa88a;font-size:12px;text-align:center;padding:10px">Nenhuma avaliação registrada neste aparelho ainda.</div>'; return; }
    arr=arr.slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    box.innerHTML='<div style="font-size:11px;color:#8aa88a;margin-bottom:6px">'+arr.length+' registro(s) — mais recente primeiro</div>'+arr.slice(0,300).map(function(r){
      var d=new Date(r.ts||0), dt=isNaN(d)?'':(d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR').slice(0,5));
      return '<div style="border-bottom:1px solid #1f2c22;padding:7px 0;font-size:12px">'+
        '<div style="color:#cfe0d4;font-weight:700">'+esc(r.quadra||r.qid||'—')+' · '+esc(r.data||'')+(r.tipo?' · '+esc(r.tipo):'')+'</div>'+
        '<div style="color:#8aa88a;font-size:11px">'+_avjCells(r)+' valor(es) · '+esc(r.who||'—')+' · '+dt+'</div>'+
      '</div>';
    }).join('');
  });
}
function saveAvaliacao(){
  if(_bloqueadoPorFinalizacao(curV,curSid)) return;
  var q=data[curV],study=(q.estudos||[]).find(function(s){return s.id===curSid});
  if(!study)return;
  study=normalizeStudy(study);
  var isNew=(editingAvId==="__new__");
  var av=isNew?draftAv:study.avaliacoes.find(function(a){return a.id===editingAvId});
  if(!av)return;
  
  var oldData=av.data;
  var oldTipo=av.tipo;
  var oldBBCH=av.bbch;
  var oldObs=av.obs;
  var oldNotas = JSON.parse(JSON.stringify(av.notas || {}));
  var oldMom=av.momento?(av.momento.valor+' '+av.momento.unidade):'';

  av.data=document.getElementById("vData").value;
  /* Momento explícito: só grava se valor E unidade vierem juntos. Qualquer um dos
     dois vazio significa "derivar da data" e o campo some do registro. */
  var _mv=document.getElementById("vMomVal"), _mu=document.getElementById("vMomUn");
  var _mvn=_mv?parseFloat(String(_mv.value||'').replace(',','.')):NaN;
  var _mun=_mu?_mu.value:'';
  if(isFinite(_mvn) && (_mun==='HAT'||_mun==='DAT')) av.momento={valor:_mvn, unidade:_mun};
  else delete av.momento;
  var _hr=document.getElementById("vHora");
  if(_hr && _hr.value) av.hora=_hr.value; else delete av.hora;
  av.tipo=document.getElementById("vTipo").value;
  var bbchEl=document.getElementById("vBBCH");
  av.bbch=bbchEl?bbchEl.value:"";
  av.obs=document.getElementById("vObs").value.trim();
  var autoInp=document.getElementById('avAutoInput'); if(autoInp) avAutoWrite(autoInp.value);
  _avSyncInputs(); av.variaveis=_avGrid.variaveis.slice(); av.notas=_avGrid.notas; av.tipos=_avGrid.tipos; av.notasMeta=_avGrid.meta||{};
  av.varcfg=_avGrid.varcfg||{}; av.bruto=_avGrid.bruto||{}; /* config e dado bruto das sub-amostras/razão */
  
  var action = isNew ? 'Registro de Avaliação' : 'Edição de Avaliação';
  var details = '';
  if(isNew) {
    details = 'AV registrada para a data ' + av.data + (av.tipo ? ' (' + av.tipo + ')' : '') + (av.bbch ? ' [BBCH ' + av.bbch + ']' : '');
  } else {
    var changes = [];
    if(oldData !== av.data) changes.push('Data: ' + oldData + ' -> ' + av.data);
    var _nm=av.momento?(av.momento.valor+' '+av.momento.unidade):'';
    if(oldMom !== _nm) changes.push('Momento: ' + (oldMom||'(pela data)') + ' -> ' + (_nm||'(pela data)'));
    if(oldTipo !== av.tipo) changes.push('Tipo: ' + oldTipo + ' -> ' + av.tipo);
    if(oldBBCH !== av.bbch) changes.push('BBCH: ' + oldBBCH + ' -> ' + av.bbch);
    if(oldObs !== av.obs) changes.push('Obs alteradas');
    
    var notesChanged = false;
    var keys = Object.keys(Object.assign({}, oldNotas, av.notas));
    for(var k=0; k<keys.length; k++){
      var key = keys[k];
      var oRow = oldNotas[key] || {};
      var nRow = av.notas[key] || {};
      var vkeys = Object.keys(Object.assign({}, oRow, nRow));
      for(var v=0; v<vkeys.length; v++){
        var vk = vkeys[v];
        if(String(oRow[vk]||'') !== String(nRow[vk]||'')) {
          notesChanged = true;
          break;
        }
      }
      if(notesChanged) break;
    }
    if(notesChanged) changes.push('Notas das parcelas atualizadas');
    details = changes.length ? changes.join(', ') : 'Nenhuma alteração de conteúdo';
  }
  
  if(isNew){
    study.avaliacoes.push(av);
    draftAv=null;
  }
  if(!av.carimbo) carimbar(curV,curSid,av.id,'aval',av.data,av.hora);
  av._ts=Date.now(); /* carimbo: no merge, a edição mais nova vence */
  /* Trilha BPL: de→por célula + motivo (quando reabertura de avaliação assinada) */
  var _mud = isNew ? null : _avDiffCells(oldNotas, av.notas);
  var _reab = (_avReopen && _avReopen.avid===av.id) ? _avReopen : null;
  var _motivo = _reab ? _reab.motivo : null;
  /* editar avaliação ASSINADA invalida a assinatura → exige NOVA (exigência BPL) */
  if(_reab && av.carimbo && av.carimbo.rubrica){ av.carimbo.rubrica=null; av.carimbo.rubricaEm=null; av.carimbo.rubricaPor=null; av.carimbo.rubricaNome=null; av.carimbo.rubricaSignificado=null; }
  logStudyAuditInObject(study, action, details, { mudancas:(_mud&&_mud.length?_mud.slice(0,80):null), total_mudancas:(_mud?_mud.length:null), motivo:_motivo });
  save();
  /* rede de segurança no aparelho: registra a avaliação no diário (IndexedDB). Best-effort, nunca quebra o salvar. */
  try{ journalAval({ ts:Date.now(), who:(typeof _authUser!=='undefined'&&_authUser&&_authUser.email)||'', qid:curV, quadra:(typeof quadraNome==='function'?quadraNome(curV):curV), sid:curSid, avid:av.id, data:av.data, tipo:av.tipo, bbch:av.bbch, variaveis:(av.variaveis||[]).slice(), notas:JSON.parse(JSON.stringify(av.notas||{})), notasMeta:JSON.parse(JSON.stringify(av.notasMeta||{})), motivo:_motivo, mudancas:(_mud&&_mud.length?_mud:null) }); }catch(e){}
  /* Etapa 3 Fase B: escrita dupla nas tabelas por-linha (só com flag _dualWrite; nunca quebra o save do blob) */
  try{ if(typeof dbUpsertAvaliacao==='function') dbUpsertAvaliacao(curV,curSid,av); }catch(e){}
  _stxToast('✓ Avaliação salva!');
  _avReopen=null;
  if(typeof updateTodayBadge==='function') updateTodayBadge();
  if(typeof updateAgendaBadge==='function') updateAgendaBadge();
  closeEventEdit();
  openStudyDetail(curV,curSid);
  /* RUBRICA ao fim da avaliação (ADITIVO: o dado JÁ foi salvo acima; só pede assinatura se ainda não houver). */
  try{
    if(typeof openRubrica==='function' && !(av.carimbo&&av.carimbo.rubrica)){
      var _rqid=curV,_rsid=curSid,_raid=av.id,_rdata=av.data;
      openRubrica(function(url){ if(!url) return; try{
        var _q=data[_rqid], _st=_q&&(_q.estudos||[]).find(function(s){return s.id===_rsid;});
        var _a=_st&&(_st.avaliacoes||[]).find(function(x){return x.id===_raid;});
        if(_a){ if(!_a.carimbo)_a.carimbo={}; _a.carimbo.rubrica=url; _a.carimbo.rubricaEm=new Date().toISOString();
          _a.carimbo.rubricaPor=(typeof _authUser!=='undefined'&&_authUser&&_authUser.email)||''; _a.carimbo.rubricaNome=_currentUserName(); _a.carimbo.rubricaSignificado='Conferido e assinado';
          save(); if(typeof setUnsavedChanges==='function')setUnsavedChanges(true); if(typeof cloudSave==='function')cloudSave();
          if(typeof openStudyDetail==='function')openStudyDetail(_rqid,_rsid); }
      }catch(e){} }, 'Avaliação '+(isoToBR(_rdata)||_rdata||''));
    }
  }catch(e){}
}

function closeEventEdit(){
  document.getElementById("eeOvl").classList.remove("open");
  try{ if(_avCloudTimer){ clearTimeout(_avCloudTimer); _avCloudTimer=null; } if(_unsavedChanges && typeof cloudSave==='function') cloudSave(); }catch(e){} /* ao fechar a avaliação, descarrega o autosave pra nuvem (checkpoint) */
  editingAplId=null;editingAvId=null;
  draftAp=null;draftAv=null;
  window._avEditing=false;
  try{ if(typeof cloudApplyPending==='function') cloudApplyPending(); }catch(e){}
  try{ if(typeof cloudReadRowsApplyPending==='function') cloudReadRowsApplyPending(); }catch(e){}
}


/* ============ EXPORT / IMPORT JSON ============ */
/* ===================== BACKUPS LOCAIS (rede de segurança: snapshot antes de ações destrutivas) ===================== */
function safetySnap(){
  try{ if(typeof ensureLocais==='function') ensureLocais(); }catch(e){}
  try{ if(typeof ensureCfgTS==='function') ensureCfgTS(); }catch(e){}
  return { ts:Date.now(),
    data:(typeof data!=='undefined'?data:{}),
    qgeo:(typeof QGEO!=='undefined'?QGEO:null),
    qgeots:(typeof QGEO_TS!=='undefined'?QGEO_TS:null),
    georef:(typeof _geo!=='undefined'?_geo:null),
    locais:(typeof LOCAIS!=='undefined'?LOCAIS:null),
    qlocal:(typeof QLOCAL!=='undefined'?QLOCAL:null),
    qnome:(typeof QNOME!=='undefined'?QNOME:null),
    qnomets:(typeof QNOME_TS!=='undefined'?QNOME_TS:null),
    qlocalts:(typeof QLOCAL_TS!=='undefined'?QLOCAL_TS:null),
    locaists:(typeof LOCAIS_TS!=='undefined'?LOCAIS_TS:null),
    randomizacoes:(typeof RZLIB!=='undefined'?RZLIB:[]) };
}
function _safetyCounts(s){ var d=s.data||{}, est=0,ap=0,av=0;
  Object.keys(d).forEach(function(k){ (d[k].estudos||[]).forEach(function(e){ est++; ap+=(e.aplicacoes||[]).length; av+=(e.avaliacoes||[]).length; }); });
  return { quadras:(s.qgeo?Object.keys(s.qgeo).length:Object.keys(d).length), locais:(s.locais?Object.keys(s.locais).length:0), estudos:est, aplic:ap, aval:av };
}
function safetyList(){ try{ return JSON.parse(localStorage.getItem('iracema-safety')||'[]'); }catch(e){ return []; } }
function safetyBackup(motivo){
  try{
    var arr=safetyList();
    var snap=JSON.parse(JSON.stringify(safetySnap()));
    snap.motivo=motivo||''; snap.counts=_safetyCounts(snap);
    arr.push(snap);
    while(arr.length>10) arr.shift();
    try{ localStorage.setItem('iracema-safety', JSON.stringify(arr)); }
    catch(e){ while(arr.length>2){ arr.shift(); try{ localStorage.setItem('iracema-safety', JSON.stringify(arr)); break; }catch(e2){} } }
  }catch(e){}
}
function safetyApply(snap){
  if(!snap) return;
  safetyBackup('antes de restaurar');
  try{
    if(snap.data){ data=snap.data; try{ localStorage.setItem('iracema-v7', JSON.stringify(data)); }catch(e){} }
    if(snap.qgeo){ QGEO=snap.qgeo; if(typeof saveQGEO==='function') saveQGEO(); }
    if(snap.georef){ _geo=snap.georef; if(typeof saveGeoref==='function') saveGeoref(_geo); }
    if(snap.locais){ LOCAIS=snap.locais; if(typeof saveLocais==='function') saveLocais(); }
    if(snap.qlocal){ QLOCAL=snap.qlocal; if(typeof saveQLocal==='function') saveQLocal(); }
    if(snap.qnome){ QNOME=snap.qnome; if(typeof saveQNome==='function') saveQNome(); }
    if(snap.qgeots && typeof snap.qgeots==='object'){ QGEO_TS=snap.qgeots; if(typeof saveQGEOTS==='function') saveQGEOTS(); }
    if(typeof ensureCfgTS==='function') ensureCfgTS();
    if(snap.qnomets && typeof snap.qnomets==='object'){ QNOME_TS=snap.qnomets; }
    if(snap.qlocalts && typeof snap.qlocalts==='object'){ QLOCAL_TS=snap.qlocalts; }
    if(snap.locaists && typeof snap.locaists==='object'){ LOCAIS_TS=snap.locaists; }
    if(typeof saveCfgTS==='function') saveCfgTS();
    if(Array.isArray(snap.randomizacoes)){ RZLIB=normalizeRZLib(snap.randomizacoes); saveRZLib(); }
    if(typeof ensureLocais==='function'){ ensureLocais(); if(typeof buildLocalChip==='function') buildLocalChip(); }
    _cloudReplace=true; /* restauração substitui o estado (grava sem merge) */
    save(); render(); if(typeof updateAgendaBadge==='function') updateAgendaBadge();
  }catch(e){ alert('Erro ao restaurar: '+e.message); }
}
/* ===================== HISTÓRICO DA NUVEM (restaurar versões) ===================== */
function _chShell(inner){
  return '<div style="background:#0e150e;border:1px solid #2a3a2a;border-radius:14px;max-width:480px;width:100%;padding:16px;box-sizing:border-box;color:#eaf3ed;max-height:85vh;overflow:auto;font:13px system-ui,sans-serif">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#37d684;font-size:15px">Histórico da nuvem</b><button onclick="document.getElementById(\'chModal\').style.display=\'none\'" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer">✕</button></div>'+
    '<div style="font-size:11px;color:#8aa88a;margin-top:4px">Cada gravação guarda a versão anterior na nuvem. Restaurar guarda o estado atual antes — nada se perde.</div>'+
    inner+
    '<div style="margin-top:12px"><button onclick="document.getElementById(\'chModal\').style.display=\'none\'" style="width:100%;background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:9px;padding:10px;font-weight:700;cursor:pointer">Fechar</button></div>'+
  '</div>';
}
function openCloudHistory(){
  var m=document.getElementById('chModal');
  if(!m){ m=document.createElement('div'); m.id='chModal'; m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3300;display:flex;align-items:center;justify-content:center;padding:16px'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  m.style.display='flex';
  m.innerHTML=_chShell('<div style="color:#8aa88a;font-size:12px;margin:16px 0;text-align:center">Carregando…</div>');
  if(!cloudInit()){ m.innerHTML=_chShell('<div style="color:#dccd8c;font-size:13px;margin-top:12px">Sem conexão com a nuvem agora — tente de novo com internet.</div>'); return; }
  try{
    SB.rpc('app_state_history_list', { n: 60 }).then(function(res){
      if(res && res.error){ m.innerHTML=_chShell('<div style="border:1px solid #5a4d1f;border-radius:9px;padding:11px;margin-top:10px;color:#dccd8c;font-size:12px">O histórico precisa de um passo único no Supabase (rodar um SQL curto, uma vez). Me peça o SQL.<br><span style="color:#8aa88a">'+esc(res.error.message||'')+'</span></div>'); return; }
      var rows=(res && res.data) || [];
      if(!rows.length){ m.innerHTML=_chShell('<div style="color:#8aa88a;font-size:13px;margin-top:12px">Nenhuma versão guardada ainda.</div>'); return; }
      var html=rows.map(function(r){ var dt=new Date(r.saved_at);
        return '<div style="border:1px solid #2a3a2a;border-radius:9px;padding:9px 11px;margin-top:7px;display:flex;justify-content:space-between;align-items:center;gap:10px">'+
          '<div style="min-width:0"><div style="font-size:13px;color:#eaf3ed;font-weight:600">'+(isNaN(dt.getTime())?'?':dt.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}))+' <span style="color:#8aa88a;font-weight:400">· v'+(r.rev!=null?r.rev:'?')+'</span></div>'+
          '<div style="font-size:11px;color:#8aa88a">'+(r.quadras||0)+' quadras · '+(r.locais||0)+' locais · '+(r.estudos||0)+' estudos</div></div>'+
          '<button onclick="cloudHistoryRestore('+(+r.hid)+')" style="flex:none;background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer">Restaurar</button></div>';
      }).join('');
      m.innerHTML=_chShell(html);
    }, function(){ m.innerHTML=_chShell('<div style="color:#dccd8c;font-size:13px;margin-top:12px">Não consegui ler o histórico (rede).</div>'); });
  }catch(e){ m.innerHTML=_chShell('<div style="color:#dccd8c">Erro: '+esc(e.message)+'</div>'); }
}
function cloudHistoryRestore(hid){
  requireDeletePassword('Restaurar a versão selecionada por cima do estado atual. O estado atual é guardado antes (dá pra voltar).', function(){
    if(!cloudInit()){ alert('Sem conexão com a nuvem.'); return; }
    SB.rpc('app_state_history_get', { h: hid }).then(function(res){
      if(res && res.error){ alert('Erro ao ler a versão: '+res.error.message); return; }
      var st=res && res.data;
      if(typeof st==='string'){ try{ st=JSON.parse(st); }catch(e){} }
      if(!st || !st.data){ alert('Versão vazia ou inválida.'); return; }
      safetyApply(st);
      var m=document.getElementById('chModal'); if(m) m.style.display='none';
      alert('✓ Versão restaurada e enviada para a nuvem.');
    }, function(){ alert('Não consegui ler a versão (rede).'); });
  }, {title:'Confirmar restauração', ok:'Restaurar'});
}
/* ===================== VERIFICADOR DE INTEGRIDADE ===================== */
function integridadeScan(){
  var out=[];
  try{
    try{ ensureLocais(); }catch(e){}
    var locIds={}; Object.keys(LOCAIS||{}).forEach(function(l){ locIds[l]=1; });
    Object.keys(QLOCAL||{}).forEach(function(qid){ var l=QLOCAL[qid]; if(l && !locIds[l] && (data[qid]||(QGEO&&QGEO[qid]))) out.push({sev:'media',msg:'Quadra “'+quadraNome(qid)+'” aponta para um local que não existe mais.'}); });
    Object.keys(data||{}).forEach(function(qid){
      var q=data[qid]; if(!q) return;
      /* quadra de laboratório não tem polígono POR DEFINIÇÃO — o aviso só vale para campo */
      if(QGEO && !QGEO[qid] && !isQuadraLab(qid) && q.estudos && q.estudos.length) out.push({sev:'baixa',msg:'Quadra “'+quadraNome(qid)+'” tem estudo mas não tem polígono no mapa.'});
      (q.estudos||[]).forEach(function(s){
        if(!s) return; var cod=s.codigo||'(sem código)', loc=quadraNome(qid);
        var tids={}; (s.tratamentos||[]).forEach(function(t){ if(t&&t.id) tids[t.id]=1; });
        var nTrat=(s.tratamentos||[]).length, nAval=(s.avaliacoes||[]).length;
        if(!nTrat && nAval) out.push({sev:'alta',msg:'Estudo “'+cod+'” ('+loc+') tem avaliação mas nenhum tratamento cadastrado.'});
        if(s.testemunha && nTrat && !tids[s.testemunha]) out.push({sev:'media',msg:'Estudo “'+cod+'” ('+loc+'): a testemunha definida (“'+s.testemunha+'”) não está entre os tratamentos.'});
        var orf={};
        (s.avaliacoes||[]).forEach(function(a){
          if(!a) return;
          if(a.data && isNaN(new Date(a.data).getTime())) out.push({sev:'media',msg:'Estudo “'+cod+'” ('+loc+'): avaliação com data inválida.'});
          if(nTrat) Object.keys(a.notas||{}).forEach(function(k){ var tid=String(k).replace(/R\d+$/,''); if(tid && !tids[tid] && !orf[tid]){ orf[tid]=1; out.push({sev:'media',msg:'Estudo “'+cod+'” ('+loc+'): há notas de um tratamento (“'+tid+'”) que não está mais na lista — o dado pode ficar invisível.'}); } });
        });
      });
    });
  }catch(e){ out.push({sev:'baixa',msg:'A verificação não pôde ser concluída: '+(e&&e.message||e)}); }
  return out;
}
function _integToast(){ try{ var ig=integridadeScan(); if(ig.length){ var alta=ig.filter(function(x){return x.sev==='alta';}).length; _stxToast((alta?'⚠ ':'')+ig.length+' aviso'+(ig.length>1?'s':'')+' de integridade — veja no menu'); } }catch(e){} }
function openIntegridade(){
  var ig=integridadeScan();
  var sevcor={alta:'#ffb3a8',media:'#dccd8c',baixa:'#9ac49a'}, sevlab={alta:'CRÍTICO',media:'ATENÇÃO',baixa:'INFO'};
  var m=document.getElementById('integModal');
  if(!m){ m=document.createElement('div'); m.id='integModal'; m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3300;display:flex;align-items:center;justify-content:center;padding:16px'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  var body = ig.length ? ig.map(function(x){ return '<div style="border:1px solid #2a3a2a;border-left:3px solid '+(sevcor[x.sev]||'#888')+';border-radius:8px;padding:9px 11px;margin-top:7px"><div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:'+(sevcor[x.sev]||'#888')+'">'+(sevlab[x.sev]||'')+'</div><div style="font-size:13px;color:#eaf3ed;margin-top:2px">'+esc(x.msg)+'</div></div>'; }).join('')
    : '<div style="text-align:center;color:#9ac49a;font-size:14px;margin:18px 0"><div style="font-size:30px;line-height:1">✓</div>Tudo certo — nenhuma inconsistência encontrada.</div>';
  m.innerHTML='<div style="background:#0e150e;border:1px solid #2a3a2a;border-radius:14px;max-width:480px;width:100%;padding:16px;box-sizing:border-box;color:#eaf3ed;max-height:85vh;overflow:auto;font:13px system-ui,sans-serif">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#37d684;font-size:15px">Verificação de integridade</b><button onclick="document.getElementById(\'integModal\').style.display=\'none\'" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer">✕</button></div>'+
    '<div style="font-size:11px;color:#8aa88a;margin-top:4px">Confere estudos, tratamentos, testemunha e vínculos. Não altera nada — só aponta o que revisar.'+(ig.length?(' <b style="color:#dccd8c">'+ig.length+' aviso(s).</b>'):'')+'</div>'+
    body+
    '<div style="margin-top:12px"><button onclick="document.getElementById(\'integModal\').style.display=\'none\'" style="width:100%;background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:9px;padding:10px;font-weight:700;cursor:pointer">Fechar</button></div>'+
  '</div>';
  m.style.display='flex';
}
function openBackups(){
  var m=document.getElementById('bkpModal');
  if(!m){ m=document.createElement('div'); m.id='bkpModal'; m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3300;display:flex;align-items:center;justify-content:center;padding:16px'; m.onclick=function(e){ if(e.target===m) m.style.display='none'; }; document.body.appendChild(m); }
  var arr=safetyList().slice().reverse();
  var rows=arr.length? arr.map(function(s,i){
    var c=s.counts||_safetyCounts(s), dt=new Date(s.ts);
    return '<div style="border:1px solid #2a3a2a;border-radius:9px;padding:9px 11px;margin-top:7px;display:flex;justify-content:space-between;align-items:center;gap:10px">'+
      '<div style="min-width:0"><div style="font-size:13px;color:#eaf3ed;font-weight:600">'+dt.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' <span style="color:#8aa88a;font-weight:400">· '+esc(s.motivo||'')+'</span></div>'+
      '<div style="font-size:11px;color:#8aa88a">'+c.quadras+' quadras · '+c.estudos+' estudos · '+c.aplic+' aplic · '+c.aval+' aval</div></div>'+
      '<button onclick="if(confirm(\'Restaurar este backup? O estado atual será guardado antes.\')){safetyApply(safetyList().slice().reverse()['+i+']);document.getElementById(\'bkpModal\').style.display=\'none\';alert(\'✓ Restaurado.\');}" style="flex:none;background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer">Restaurar</button></div>';
  }).join('') : '<div style="color:#8aa88a;font-size:12px;margin-top:8px">Nenhum backup local ainda. São criados automaticamente antes de excluir/importar.</div>';
  m.innerHTML='<div style="background:#0e150e;border:1px solid #2a3a2a;border-radius:14px;max-width:470px;width:100%;padding:16px;box-sizing:border-box;color:#eaf3ed;max-height:85vh;overflow:auto;font:13px system-ui,sans-serif">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#37d684;font-size:15px">🗂️ Backups locais</b><button onclick="document.getElementById(\'bkpModal\').style.display=\'none\'" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer">✕</button></div>'+
    '<div style="font-size:11px;color:#8aa88a;margin-top:4px">Snapshots automáticos antes de excluir/importar (só neste aparelho). Restaurar guarda o estado atual antes — nada é perdido.</div>'+
    rows+
    '<div style="margin-top:12px"><button onclick="exportData()" style="width:100%;background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:9px;padding:10px;font-weight:700;cursor:pointer">💾 Exportar tudo agora (arquivo)</button></div>'+
  '</div>';
  m.style.display='flex';
}
function exportData(){
  try{
    if(typeof ensureLocais==='function') ensureLocais();
    if(typeof ensureQGEO==='function') ensureQGEO();
    if(typeof ensureNotas==='function') ensureNotas();
    if(typeof ensureCfgTS==='function') ensureCfgTS();
    var payload={
      _iracema:true, version:5, exported:todayISO(),
      data:data,
      qgeo:(typeof QGEO!=='undefined'?QGEO:null),
      qgeots:(typeof QGEO_TS!=='undefined'?QGEO_TS:null),
      georef:(typeof _geo!=='undefined'?_geo:null),
      georefts:(typeof GEOREF_TS!=='undefined'?GEOREF_TS:0),
      locais:(typeof LOCAIS!=='undefined'?LOCAIS:null),
      qlocal:(typeof QLOCAL!=='undefined'?QLOCAL:null),
      qnome:(typeof QNOME!=='undefined'?QNOME:null),
      qnomets:(typeof QNOME_TS!=='undefined'?QNOME_TS:null),
      qlocalts:(typeof QLOCAL_TS!=='undefined'?QLOCAL_TS:null),
      locaists:(typeof LOCAIS_TS!=='undefined'?LOCAIS_TS:null),
      notas_campo:(typeof NOTAS_CAMPO!=='undefined'?NOTAS_CAMPO:[]),
      _deletedQuadras:(typeof _delQuadras!=='undefined'?_delQuadras:{}),
      _deletedLocais:(typeof _delLocais!=='undefined'?_delLocais:{}),
      _deletedNotas:(typeof _delNotas!=='undefined'?_delNotas:{}),
      randomizacoes:(typeof RZLIB!=='undefined'?RZLIB:[])
    };
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='iracemapolis-'+todayISO()+'.json';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(e){alert('Erro ao exportar: '+e.message)}
}
/* ===================== EXPORTAR PLANILHA EXCEL (.xlsx) ===================== */
function _loadSheetJS(cb){
  if(window.XLSX){ cb(); return; }
  function add(src,onerr){ var s=document.createElement('script'); s.src=src; s.onload=function(){ cb(window.XLSX?null:new Error('Biblioteca não carregou.')); }; s.onerror=onerr; document.head.appendChild(s); }
  /* offline-first: usa a cópia vendorizada (cacheada pelo Service Worker); cai no CDN se faltar */
  add('./vendor/xlsx.full.min.js', function(){ add('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', function(){ cb(new Error('Não consegui carregar a biblioteca da planilha.')); }); });
}
function _locNome(qid){ try{ ensureLocais(); }catch(e){} var l=(QLOCAL&&QLOCAL[qid])||HOME_LOCAL; return (LOCAIS&&LOCAIS[l]&&LOCAIS[l].nome)||(LOCAIS&&LOCAIS[HOME_LOCAL]&&LOCAIS[HOME_LOCAL].nome)||''; }
function exportXlsx(soDoLocal){
  _loadSheetJS(function(err){
    if(err){ alert(err.message); return; }
    try{ _buildXlsx(soDoLocal); }catch(e){ alert('Erro ao gerar planilha: '+e.message); }
  });
}
function _buildXlsx(soDoLocal){
  var XLSX=window.XLSX;
  function num(x){ return (x==null||x==='')?'':x; }
  function toNum(x){ if(x==null||x==='') return ''; if(typeof x==='number') return isFinite(x)?x:''; var s=String(x).trim().replace(',','.'); if(s==='') return ''; var n=Number(s); return isFinite(n)?n:String(x); }
  function dap(pl,when){ try{ if(!pl||!when) return ''; var p=new Date(pl), w=new Date(when); if(isNaN(p)||isNaN(w)) return ''; return Math.round((w-p)/864e5); }catch(e){ return ''; } }
  var tidyH=['Local','Quadra','Cultura','Cultivar','Plantio','Estudo','Descricao','Data_avaliacao','DAP_dias','Tipo','BBCH','Parcela','Tratamento','Repeticao','Produto','Dose','Volume_calda','Variavel','Tipo_variavel','Valor','Sub_amostras','n_afetados','N_avaliados','Obs_avaliacao','Registrado_em','Clima_fonte','Temp_C','UR_pct','VPD_kPa','Vento_kmh','Chuva_mm','NDVI','NDRE','Lat','Lng'];
  var aplH=['Local','Quadra','Cultura','Estudo','Data_aplicacao','BBCH','Obs','Registrado_em','Temp_C','UR_pct','VPD_kPa','Vento_kmh','Chuva_mm','NDVI'];
  var estH=['Local','Quadra','Cultura','Cultivar','Plantio','Estudo','Descricao','Inicio','N_aplicacoes','Intervalo_dias','Repeticoes','N_tratamentos','N_parcelas','Testemunha','N_avaliacoes','Area_ha','Comprimento_m','Largura_m','Lat','Lng'];
  var eficH=['Local','Quadra','Estudo','Variavel','Data_avaliacao','Tratamento','Produto','Testemunha','Media','%_controle'];
  var audH=['Local','Quadra','Estudo','Variavel','Tratamento','Produto','Testemunha','N_datas','Dias','AUDPC','%_controle'];
  var tratH=['Local','Quadra','Estudo','Tratamento','Produto','Dose','Volume_calda','Obs','Testemunha'];
  var tidy=[tidyH], apl=[aplH], est=[estH], trat=[tratH], efic=[eficH], aud=[audH];
  Object.keys(data).forEach(function(qid){
    var q=data[qid]; if(!q||!Array.isArray(q.estudos)||!q.estudos.length) return;
    if(soDoLocal && ((QLOCAL&&QLOCAL[qid])||HOME_LOCAL)!==localAtivo) return;
    var locNome=_locNome(qid), aHa=quadraAreaHa(qid), dim=quadraDims(qid), ctr=quadraCenter(qid), qn=quadraNome(qid);
    var plant=q.plantio||'', plantBR=isoToBR(plant)||'';
    q.estudos.forEach(function(s){
      s=normalizeStudy(s);
      est.push([locNome,qn,q.cultura||'',q.cultivar||'',plantBR,s.codigo||'',s.descricao||'',isoToBR(s.dataInicio)||'',s.numAplicacoes,s.intervaloDias,s.numRepeticoes,s.tratamentos.length,s.tratamentos.length*s.numRepeticoes,studyTestemunha(s),(s.avaliacoes||[]).length,aHa!=null?+aHa.toFixed(3):'',dim?Math.round(dim.comprimento):'',dim?Math.round(dim.largura):'',ctr?+ctr[0].toFixed(6):'',ctr?+ctr[1].toFixed(6):'']);
      var prod={},dose={},vol={}, _tst=studyTestemunha(s); s.tratamentos.forEach(function(t){ prod[t.id]=t.produto||''; dose[t.id]=t.dose||''; vol[t.id]=t.volume||''; trat.push([locNome,qn,s.codigo||'',t.id,t.produto||'',t.dose||'',t.volume||'',t.obs||'',(t.id===_tst?'sim':'')]); });
      s.aplicacoes.forEach(function(a){ var c=a.carimbo||{}, cl=c.clima||{};
        apl.push([locNome,qn,q.cultura||'',s.codigo||'',isoToBR(a.data)||'',a.bbch||'',a.obs||'',c.data||'',toNum(cl.temp),toNum(cl.umidade),toNum(cl.vpd),toNum(cl.vento),toNum(cl.chuva),(c.ndvi&&c.ndvi.ndvi!=null)?toNum(c.ndvi.ndvi):'']); });
      s.avaliacoes.forEach(function(a){ var c=a.carimbo||{}, cl=c.clima||{}, vars=a.variaveis||[];
        var lat=(c.gps&&c.gps.lat!=null)?+c.gps.lat.toFixed(6):(c.centro&&c.centro.length===2?+c.centro[0].toFixed(6):''), lng=(c.gps&&c.gps.lng!=null)?+c.gps.lng.toFixed(6):(c.centro&&c.centro.length===2?+c.centro[1].toFixed(6):'');
        var ndvi=(c.ndvi&&c.ndvi.ndvi!=null)?c.ndvi.ndvi:'', ndre=(c.ndvi&&c.ndvi.ndre!=null)?c.ndvi.ndre:'', dapv=dap(plant,a.data);
        if(vars.length && s.tratamentos.length){
          _avRowsForStudy(s,false).forEach(function(rw){
            vars.forEach(function(v){
              var _tv=_avTipo(a,v), _cf=_avCfg(a,v), _cel=(a.bruto&&a.bruto[rw.key])?a.bruto[rw.key][v]:null;
              /* BPL: o derivado vai em Valor e o BRUTO sai junto — sub-amostras e n/N */
              var _subs=(_cf.tipo!=='razao'&&_cel&&_cel.sub)?_cel.sub.filter(function(x){return x!=null&&String(x).trim()!=='';}).join('; '):'';
              var _n=(_cf.tipo==='razao'&&_cel)?toNum(_cel.n):'', _N=(_cf.tipo==='razao'&&_cel)?toNum(_cel.N):'';
              tidy.push([locNome,qn,q.cultura||'',q.cultivar||'',plantBR,s.codigo||'',s.descricao||'',isoToBR(a.data)||'',dapv,a.tipo||'',a.bbch||'',rw.campo||'',rw.tratId,rw.repDisplay||_repDisplay(rw.rep),prod[rw.tratId]||'',dose[rw.tratId]||'',vol[rw.tratId]||'',v,(_tv==='pct'?'numero/%':_tv),toNum(_avNota(a,rw,v)),_subs,_n,_N,a.obs||'',c.data||'',cl.fonte||'',toNum(cl.temp),toNum(cl.umidade),toNum(cl.vpd),toNum(cl.vento),toNum(cl.chuva),toNum(ndvi),toNum(ndre),lat,lng]); });
          });
        } else {
          tidy.push([locNome,qn,q.cultura||'',q.cultivar||'',plantBR,s.codigo||'',s.descricao||'',isoToBR(a.data)||'',dapv,a.tipo||'',a.bbch||'','','','','','','','','','','','','',a.obs||'',c.data||'',cl.fonte||'',toNum(cl.temp),toNum(cl.umidade),toNum(cl.vpd),toNum(cl.vento),toNum(cl.chuva),toNum(ndvi),toNum(ndre),lat,lng]);
        }
      });
      (function(){ var _t=studyTestemunha(s), _av=s.avaliacoes.slice().sort(function(a,b){return (a.data||'').localeCompare(b.data||'');}).filter(function(a){return a.variaveis&&a.variaveis.length;});
        _av.forEach(function(a){ var m=_avMeans(s,a); (a.variaveis||[]).forEach(function(v){ var tm=m[_t]&&m[_t][v]; s.tratamentos.forEach(function(t){ var mv=m[t.id]&&m[t.id][v]; var _ce=(t.id===_t)?null:_pctCtrl(tm,mv,_avSentido(a,v)); var ctrl=(t.id===_t)?'':(_ce!=null?Math.round(_ce*10)/10:''); efic.push([locNome,qn,s.codigo||'',v,isoToBR(a.data)||'',t.id,prod[t.id]||'',(t.id===_t?'sim':''),(mv!=null?Math.round(mv*100)/100:''),ctrl]); }); }); });
        var bv={}; _av.forEach(function(a){ if(!a.data)return; var m=_avMeans(s,a); (a.variaveis||[]).forEach(function(v){ (bv[v]=bv[v]||[]).push({date:a.data,m:m}); }); });
        Object.keys(bv).forEach(function(v){ var pts=bv[v]; if(pts.length<2)return; var t0=new Date(pts[0].date), dys=pts.map(function(p){return Math.max(0,Math.round((new Date(p.date)-t0)/864e5));}); function af(tr){ var sm=0,pv=null,pt=null; for(var i=0;i<pts.length;i++){ var y=pts[i].m[tr]&&pts[i].m[tr][v]; if(y==null)return null; if(pv!=null)sm+=(pv+y)/2*(dys[i]-pt); pv=y; pt=dys[i]; } return sm; } var ta=af(_t); s.tratamentos.forEach(function(t){ var a=af(t.id); var _ca=(t.id===_t)?null:_pctCtrl(ta,a); var ctrl=(t.id===_t)?'':(_ca!=null?Math.round(_ca*10)/10:''); aud.push([locNome,qn,s.codigo||'',v,t.id,prod[t.id]||'',(t.id===_t?'sim':''),pts.length,dys[dys.length-1],(a!=null?Math.round(a):''),ctrl]); }); });
      })();
    });
  });
  if(tidy.length<=1 && est.length<=1){ alert('Não há estudos para exportar'+(soDoLocal?' neste local.':'.')); return; }
  function widths(h){ return h.map(function(x){ return { wch: Math.min(Math.max(String(x).length+2, 9), 30) }; }); }
  var wb=XLSX.utils.book_new();
  function addSheet(name,arr,H){ if(arr.length<=1) return; var ws=XLSX.utils.aoa_to_sheet(arr); ws['!cols']=widths(H); ws['!autofilter']={ref:'A1:'+XLSX.utils.encode_col(H.length-1)+arr.length}; XLSX.utils.book_append_sheet(wb, ws, name); }
  addSheet('Dados', tidy, tidyH);
  addSheet('Tratamentos', trat, tratH);
  addSheet('Aplicacoes', apl, aplH);
  addSheet('Estudos', est, estH);
  addSheet('Eficacia', efic, eficH);
  addSheet('AUDPC', aud, audH);
  XLSX.writeFile(wb, 'ensaios-'+todayISO()+'.xlsx');
}
function importData(ev){
  var f=ev.target.files[0];
  if(!f)return;
  if(!confirm('Importar esse backup vai substituir os dados atuais (e o alinhamento/formato das quadras, se o backup tiver). Continuar?')){ev.target.value='';return}
  safetyBackup('antes de importar backup');
  var r=new FileReader();
  r.onload=function(e){
    try{
      var imported=JSON.parse(e.target.result);
      var dd, qq=null, gg=null, ll=null, ql=null, qn=null, rz=null;
      if(imported && imported._iracema){ dd=imported.data||{}; qq=imported.qgeo||null; gg=imported.georef||null; ll=imported.locais||null; ql=imported.qlocal||null; qn=imported.qnome||null; rz=imported.randomizacoes||null; }
      else { dd=imported; } /* formato antigo: só os dados */
      Object.keys(dd).forEach(function(k){
        data[k]=dd[k];
        if(!data[k].estudos || !Array.isArray(data[k].estudos))data[k].estudos=[];
      });
      if(gg){ _geo=gg; if(typeof saveGeoref==='function') saveGeoref(_geo); }
      if(qq){ QGEO=qq; if(typeof saveQGEO==='function') saveQGEO(); }
      if(ll){ LOCAIS=ll; if(typeof saveLocais==='function') saveLocais(); }
      if(ql){ QLOCAL=ql; if(typeof saveQLocal==='function') saveQLocal(); }
      if(qn){ QNOME=qn; if(typeof saveQNome==='function') saveQNome(); }
      if(Array.isArray(rz)){ RZLIB=normalizeRZLib(rz); saveRZLib(); }
      /* backup v5: carimbos, notas de campo e lápides (compat: v2-v4 simplesmente não os têm) */
      if(imported && imported._iracema){
        if(imported.qgeots && typeof imported.qgeots==='object'){ QGEO_TS=imported.qgeots; if(typeof saveQGEOTS==='function') saveQGEOTS(); }
        if(imported.georefts!=null){ GEOREF_TS=imported.georefts; if(typeof saveGeorefTS==='function') saveGeorefTS(); }
        if(typeof ensureCfgTS==='function') ensureCfgTS();
        if(imported.qnomets && typeof imported.qnomets==='object'){ QNOME_TS=imported.qnomets; }
        if(imported.qlocalts && typeof imported.qlocalts==='object'){ QLOCAL_TS=imported.qlocalts; }
        if(imported.locaists && typeof imported.locaists==='object'){ LOCAIS_TS=imported.locaists; }
        if(typeof saveCfgTS==='function') saveCfgTS();
        if(Array.isArray(imported.notas_campo)){ NOTAS_CAMPO=imported.notas_campo; if(typeof saveNotas==='function') saveNotas(); }
        if(imported._deletedQuadras && typeof imported._deletedQuadras==='object'){ _delQuadras=imported._deletedQuadras; }
        if(imported._deletedLocais && typeof imported._deletedLocais==='object'){ _delLocais=imported._deletedLocais; }
        if(typeof saveDelTombs==='function') saveDelTombs();
        if(imported._deletedNotas && typeof imported._deletedNotas==='object'){ _delNotas=imported._deletedNotas; try{ localStorage.setItem(DELN_KEY, JSON.stringify(_delNotas)); }catch(_e){} }
      }
      if(typeof ensureLocais==='function'){ ensureLocais(); if(typeof buildLocalChip==='function') buildLocalChip(); }
      _cloudReplace=true; /* importar backup SUBSTITUI o estado (como o aviso promete) — sem merge com a nuvem */
      save();
      try{ if(_map && _geo && typeof geoBounds==='function') _map.fitBounds(geoBounds(_geo)); }catch(_e){}
      render();updateAgendaBadge();
      alert('Backup importado com sucesso'+((qq||gg)?' (incluindo alinhamento e quadras).':' (apenas dados).'));
    }catch(err){alert('Arquivo inválido: '+err.message)}
    ev.target.value='';
  };
  r.readAsText(f);
}

/* ============ OVERRIDE DO renderStudyCard PARA USAR NOVO PAINEL ============ */
var _origRenderStudyCard=renderStudyCard;
renderStudyCard=function(qid,study){
  study=normalizeStudy(study);
  var ne=nextEventV2(study);
  var nextHtml='',cls='normal';
  if(ne){
    var diff=ne.diff;
    var label=diff===0?'HOJE':(diff<0?'atrasado '+Math.abs(diff)+'d':'em '+diff+'d');
    cls=diff<=0?'urgent':(diff<=3?'soon':'normal');
    var tname=ne.ev.type==='apl'?('Aplicação '+ne.ev.idx+'/'+ne.ev.total):('Avaliação'+(ne.ev.tipo?' — '+ne.ev.tipo:''));
    nextHtml='<div class="study-card-v2-next '+cls+'"><span>'+esc(tname)+'</span><span>'+label+'</span></div>';
  }
  var code=study.codigo||study.nome||'(sem código)';
  var h='<div class="study-card-v2" onclick="openStudyDetail(\''+qid+'\',\''+study.id+'\')">';
  h+='<button onclick="event.stopPropagation();studyExport(\''+qid+'\',\''+study.id+'\')" title="Copiar dados do estudo + NDVI p/ planilha" aria-label="Copiar estudo '+esc(code)+'" style="float:right;background:rgba(31,36,42,.05);border:1px solid #d7dbe0;color:#3a4149;border-radius:7px;padding:3px 9px;font-size:14px;cursor:pointer;margin:-2px -2px 0 6px">📄</button>';
  h+='<div class="study-card-v2-codigo">'+esc(code)+'</div>';
  if(study.descricao)h+='<div class="study-card-v2-desc">'+esc(study.descricao.slice(0,100))+(study.descricao.length>100?'…':'')+'</div>';
  h+='<div class="study-card-v2-meta">';
  h+='<span>'+study.tratamentos.length+' trat. × '+study.numRepeticoes+' rep.</span>';
  if(study.dataInicio)h+='<span>início '+esc(isoToBR(study.dataInicio))+'</span>';
  h+='<span>'+study.aplicacoes.length+' apl. feita(s)</span>';
  var _avFt=(study.avaliacoes||[]).filter(function(a){return _avTemNota(a);}).length, _avTt=(study.avaliacoes||[]).length;
  h+='<span>'+(_avTt>_avFt?(_avFt+' de '+_avTt+' aval.'):(_avTt+' aval.'))+'</span>';
  h+='</div>';
  h+=nextHtml;
  h+='</div>';
  return h;
};

/* Override para abrir painel novo quando clica em "+ ADICIONAR" */
function openStudyEdit(qid,sid){
  if(sid)openStudyEditV2(qid,sid);
  else openNewStudy(qid);
}

/* Override do load para normalizar estudos antigos */
var _origLoad=load;
load=function(){
  _origLoad();
  Object.keys(data).forEach(function(k){
    if(data[k].estudos&&Array.isArray(data[k].estudos)){
      data[k].estudos=data[k].estudos.map(normalizeStudy);
    }
  });
};

/* Override quadraHasAlert para usar v2 */
var _origQuadraHasAlert=quadraHasAlert;
quadraHasAlert=function(qid){
  var q=data[qid]||{};
  if(!Array.isArray(q.estudos))return false;
  for(var i=0;i<q.estudos.length;i++){
    var s=normalizeStudy(q.estudos[i]);
    var ne=nextEventV2(s);
    if(ne&&ne.diff<=2)return true;
  }
  return false;
};



/* ============ PAINEL "HOJE" ============ */

function openToday(){
  renderToday();
  document.getElementById("todayOvl").classList.add("open");
}

function closeToday(){
  document.getElementById("todayOvl").classList.remove("open");
}

function collectTodayEvents(windowDays, incluirDispensados){
  /* Retorna todos os eventos que estão hoje, atrasados ou dentro da janela */
  var out=[];
  var now=today0();
  var limit=windowDays||1;
  Object.keys(data).forEach(function(qid){
    var q=data[qid];
    if(!q||!Array.isArray(q.estudos))return;
    q.estudos.forEach(function(study){
      study=normalizeStudy(study);
      var evs=studyEventsV2(study);
      evs.forEach(function(ev){
        if(ev.realizada)return;
        var _disp=_agEstaDispensado(study,ev);
        if(_disp && !incluirDispensados) return;
        var diff=daysBetween(now,ev.date);
        if(diff<=limit){
          out.push({qid:qid,study:study,ev:ev,diff:diff,dispensado:_disp});
        }
      });
    });
  });
  /* Ordena: atrasados primeiro, depois hoje, depois próximos */
  out.sort(function(a,b){return a.diff-b.diff});
  return out;
}

function renderToday(){
  var events=collectTodayEvents(1, agVerDispensados);
  var tomorrowEvs=collectTodayEvents(3, agVerDispensados).filter(function(e){return e.diff>1});

  var h='<div class="today-head" style="position:relative">';
  h+='<button class="panel-x-tr" onclick="closeToday()" aria-label="Fechar" title="Fechar">✕</button>';
  h+='<div class="today-title">HOJE</div>';
  h+='<div class="today-date">'+new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})+'</div>';
  h+='</div>';

  /* Resumo numérico */
  var atrasados=events.filter(function(e){return e.diff<0}).length;
  var hoje=events.filter(function(e){return e.diff===0}).length;
  var amanha=events.filter(function(e){return e.diff===1}).length;

  h+='<div class="today-summary">';
  h+='<div class="today-sum-item '+(atrasados>0?"urgent":"")+'"><div class="today-sum-n">'+atrasados+'</div><div class="today-sum-l">atrasado'+(atrasados!==1?'s':'')+'</div></div>';
  h+='<div class="today-sum-item '+(hoje>0?"today":"")+'"><div class="today-sum-n">'+hoje+'</div><div class="today-sum-l">hoje</div></div>';
  h+='<div class="today-sum-item '+(amanha>0?"soon":"")+'"><div class="today-sum-n">'+amanha+'</div><div class="today-sum-l">amanhã</div></div>';
  h+='</div>';

  var _nD=_agTotalDispensados();
  h+='<div class="ag-acoes" style="margin:2px 0 12px">';
  h+='<button class="ag-acao" onclick="agLimparHoje()">Limpar lembretes</button>';
  if(_nD) h+='<button class="ag-acao ag-acao-alt" onclick="agToggleDispensados()">'+(agVerDispensados?'Ocultar':'Ver')+' dispensados ('+_nD+')</button>';
  h+='</div>';

  if(events.length===0){
    h+='<div class="today-empty"><div style="font-size:48px;margin-bottom:10px">✓</div><div>'+(_nD&&!agVerDispensados?'Nenhum lembrete ativo.':'Nada para hoje.')+'</div><div class="today-empty-sub">'+(_nD&&!agVerDispensados?'Há '+_nD+' dispensado'+(_nD>1?'s':'')+' — use o botão acima para ver.':'Bom dia de trabalho.')+'</div></div>';
  }else{
    h+='<div class="today-list">';
    events.forEach(function(e){
      h+=renderTodayCard(e);
    });
    h+='</div>';
  }

  /* Próximos dias */
  if(tomorrowEvs.length>0){
    h+='<div class="today-section-title">Próximos 3 dias</div>';
    h+='<div class="today-list">';
    tomorrowEvs.forEach(function(e){
      h+=renderTodayCard(e);
    });
    h+='</div>';
  }

  document.getElementById("todayPnl").innerHTML=h;
}

function renderTodayCard(e){
  var q=data[e.qid]||{};
  var cls='normal';
  var lbl='';
  if(e.diff<0){cls='urgent';lbl='Atrasado '+Math.abs(e.diff)+'d'}
  else if(e.diff===0){cls='today';lbl='HOJE'}
  else if(e.diff===1){cls='soon';lbl='Amanhã'}
  else{cls='normal';lbl='em '+e.diff+'d'}

  var typeName=e.ev.type==='apl'?
    ('Aplicação '+e.ev.idx+'/'+e.ev.total):
    ('Avaliação'+(e.ev.tipo?' — '+esc(e.ev.tipo):''));
  var iconCls=e.ev.type==='apl'?'apl':'eval';

  var _k=_agEvKey(e.ev), _sid=e.study.id;
  var _btn = e.dispensado
    ? '<button class="ag-x ag-x-volta" title="Trazer o lembrete de volta" onclick="event.stopPropagation();agRestaurar(\''+e.qid+'\',\''+_sid+'\',\''+_k+'\')">&#8630;</button>'
    : '<button class="ag-x" title="Dispensar o lembrete (o evento segue pendente)" onclick="event.stopPropagation();agDispensar(\''+e.qid+'\',\''+_sid+'\',\''+_k+'\',\''+esc(typeName)+'\')">&times;</button>';
  var h='<div class="today-card '+cls+(e.dispensado?' ag-dispensado':'')+'">';
  h+='<div class="today-card-head">';
  h+='<span class="today-card-badge '+iconCls+'">'+(e.ev.type==='apl'?'APL':'AV')+'</span>';
  h+='<span class="today-card-lbl">'+esc(lbl)+'</span>';
  h+=_btn;
  h+='</div>';
  h+='<div class="today-card-body" onclick="goToStudy(\''+e.qid+'\',\''+e.study.id+'\')">';
  h+='<div class="today-card-quadra">'+esc(quadraNome(e.qid))+' · '+esc(q.cultura||"—")+'</div>';
  h+='<div class="today-card-estudo">'+esc(e.study.codigo||"(sem código)")+'</div>';
  h+='<div class="today-card-evt">'+esc(typeName)+'</div>';
  h+='</div>';
  h+='<div class="today-card-actions">';
  if(e.ev.type==='apl'){
    h+='<button class="today-card-quick" onclick="quickRegisterAplicacao(\''+e.qid+'\',\''+e.study.id+'\')">Registrar aplicação</button>';
  }else{
    h+='<button class="today-card-quick" onclick="quickRegisterAvaliacao(\''+e.qid+'\',\''+e.study.id+'\',\''+esc(e.ev.tipo||"")+'\')">Registrar avaliação</button>';
  }
  h+='</div>';
  h+='</div>';
  return h;
}

function goToStudy(qid,sid){
  closeToday();
  openStudyDetail(qid,sid);
}

/* ============ ATALHO RÁPIDO DE REGISTRO (2 toques) ============ */
/* Direto do painel Hoje: clica no botão, abre modal pré-preenchido com data de hoje */

function quickRegisterAplicacao(qid,sid){
  curV=qid;curSid=sid;
  var q=data[qid],study=(q.estudos||[]).find(function(s){return s.id===sid});
  if(!study)return;
  normalizeStudy(study);
  closeToday();
  openStudyEditAplicacao("__new__");
}

function quickRegisterAvaliacao(qid,sid,tipoSugerido){
  curV=qid;curSid=sid;
  var q=data[qid],study=(q.estudos||[]).find(function(s){return s.id===sid});
  if(!study)return;
  normalizeStudy(study);
  closeToday();
  openStudyEditAvaliacao("__new__",tipoSugerido);
}

/* ============ BUSCA ============ */

function openSearch(){
  document.getElementById("searchOvl").classList.add("open");
  setTimeout(function(){
    var inp=document.getElementById("searchInput");
    if(inp)inp.focus();
  },100);
  renderSearchResults("");
}

function closeSearch(){
  document.getElementById("searchOvl").classList.remove("open");
}

var _searchTimer=null;
function onSearchInput(){
  clearTimeout(_searchTimer);
  _searchTimer=setTimeout(function(){
    var v=document.getElementById("searchInput").value;
    renderSearchResults(v);
  },150);
}

function renderSearchResults(query){
  var q=normStr((query||"").trim());
  var results=[];
  Object.keys(data).sort().forEach(function(qid){
    var d=data[qid]||{};
    var score=0;
    var matches=[];
    if(!q) score=1;
    if(q&&normStr(quadraNome(qid)).indexOf(q)>=0){score+=10;matches.push("quadra")}
    if(q&&normStr(getCulturas(d).map(function(c){return c.cultura;}).join(" ")).indexOf(q)>=0){score+=5;matches.push("cultura")}
    if(q&&normStr(getCulturas(d).map(function(c){return c.cultivar;}).join(" ")).indexOf(q)>=0){score+=3;matches.push("cultivar")}
    if(score>0) results.push({qid:qid,d:d,matches:matches,score:score,type:"quadra"});
    (d.estudos||[]).forEach(function(s){
      s=normalizeStudy(s);
      var trat=(s.tratamentos||[]).map(function(t){return [t.id,t.produto,t.dose,t.volume,t.obs].join(' ');}).join(' ');
      var stxt=[s.codigo,s.nome,s.descricao,s.tipo,quadraNome(qid),trat].join(' ');
      var hit=!q || normStr(stxt).indexOf(q)>=0 || score>0;
      if(hit){
        results.push({qid:qid,d:d,s:s,matches:["estudo"],score:score+(q&&normStr(stxt).indexOf(q)>=0?8:0),type:"estudo"});
      }
    });
  });
  if(q) results.sort(function(a,b){ return (b.score||0)-(a.score||0) || String(a.qid).localeCompare(String(b.qid)); });

  var h='';
  if(results.length===0){
    h='<div class="search-empty">Nenhum resultado para "'+esc(query)+'"</div>';
  }else{
    h='<div class="search-count">'+results.length+' resultado'+(results.length!==1?'s':'')+'</div><div class="search-list">';
    results.forEach(function(r){
      if(r.type==="quadra"){
        h+='<div class="search-item" onclick="jumpToQuadra(\''+esc(r.qid)+'\')">';
        h+='<div class="search-item-head">';
        h+='<span class="search-item-id">'+esc(quadraNome(r.qid))+'</span>';
        h+='<span class="search-item-tag">'+esc(r.d.cultura||"—")+'</span>';
        h+='</div>';
        if(r.d.cultivar)h+='<div class="search-item-sub">'+esc(r.d.cultivar)+'</div>';
        var nEst=(r.d.estudos||[]).length;
        if(nEst>0)h+='<div class="search-item-meta">'+nEst+' estudo'+(nEst!==1?'s':'')+'</div>';
        h+='</div>';
      }else{
        h+='<div class="search-item estudo" onclick="jumpToStudy(\''+esc(r.qid)+'\',\''+esc(r.s.id)+'\')">';
        h+='<div class="search-item-head">';
        h+='<span class="search-item-id">'+esc(r.s.codigo||"(sem código)")+'</span>';
        h+='<span class="search-item-tag">'+esc(r.qid)+'</span>';
        h+='</div>';
        if(r.s.descricao)h+='<div class="search-item-sub">'+esc(r.s.descricao.slice(0,60))+(r.s.descricao.length>60?'…':'')+'</div>';
        h+='</div>';
      }
    });
    h+='</div>';
  }

  document.getElementById("searchResults").innerHTML=h;
}

function jumpToQuadra(qid){
  closeSearch();
  showD(qid);
}

function jumpToStudy(qid,sid){
  closeSearch();
  openStudyDetail(qid,sid);
}

/* ============ BADGE DE STATUS NO POLÍGONO (override do render) ============ */
/* Substitui a cor da bolinha do contador de estudos pela cor do próximo evento */

function getQuadraUrgency(qid){
  var q=data[qid]||{};
  if(!Array.isArray(q.estudos))return null;
  var best=null;
  q.estudos.forEach(function(s){
    s=normalizeStudy(s);
    var ne=nextEventV2(s);
    if(!ne)return;
    if(best===null||ne.diff<best.diff)best=ne;
  });
  return best;
}

function urgencyColor(diff){
  if(diff===null||diff===undefined)return null;
  if(diff<=0)return "#ff5252";   /* vermelho: hoje/atrasado */
  if(diff<=2)return "#ff9800";   /* laranja: 1-2 dias */
  if(diff<=7)return "#4a8dd0";   /* azul: dentro de uma semana */
  return "#5a8a5a";               /* verde escuro: normal */
}

/* ============ OVERRIDE DO render PARA PINTAR BADGES POR URGÊNCIA ============ */
var _origRender=render;
render=function(){
  _origRender();
  /* Após render original, repinta os badges das quadras que têm estudos */
  var svg=document.getElementById("svgO");
  if(!svg)return;
  /* O _origRender já desenhou os badges. Aqui a gente repinta pela urgência. */
  /* Mais simples: vamos redesenhar tudo sobrepondo nas bolinhas existentes */
  var ids=Object.keys(P);
  ids.forEach(function(id){
    var d=data[id]||{},lb=QPOS[id];
    var nEst=(d.estudos||[]).length;
    if(nEst===0)return;
    var urg=getQuadraUrgency(id);
    if(!urg)return;
    var color=urgencyColor(urg.diff);
    /* Procura o circle do badge e repinta */
    var circles=svg.querySelectorAll("circle");
    for(var i=0;i<circles.length;i++){
      var c=circles[i];
      var cx=parseFloat(c.getAttribute("cx"));
      var cy=parseFloat(c.getAttribute("cy"));
      var r=parseFloat(c.getAttribute("r"));
      if(Math.abs(cx-(lb[0]+14))<1&&Math.abs(cy-(lb[1]-18))<1&&r===7){
        c.style.fill=color;
        c.style.stroke="#fff";
        c.style.strokeWidth="1.5";
        break;
      }
    }
  });
};

/* ============ BOTÃO "HOJE" E BUSCA NO TOPO ============ */
/* Injeta os botões dentro da top-bar-right existente */
function injectTopbarButtons(){
  var tbr=document.querySelector(".top-bar-right");
  if(!tbr||tbr.querySelector(".btn-today"))return;
  var btnHoje=document.createElement("button");
  btnHoje.className="btn-sm btn-today";
  btnHoje.innerHTML='HOJE <span id="todayBadge" class="today-badge">0</span>';
  btnHoje.onclick=openToday;
  var btnBusca=document.createElement("button");
  btnBusca.className="btn-sm btn-search";
  btnBusca.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="vertical-align:-2px" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  btnBusca.setAttribute("aria-label","Buscar");
  btnBusca.onclick=openSearch;
  /* Insere antes do botão AGENDA */
  var btnAgenda=document.getElementById("btnAgenda");
  if(btnAgenda){
    tbr.insertBefore(btnHoje,btnAgenda);
    tbr.insertBefore(btnBusca,btnHoje);
  }else{
    tbr.appendChild(btnBusca);
    tbr.appendChild(btnHoje);
  }
}

function updateTodayBadge(){
  var el=document.getElementById("todayBadge");
  if(!el)return;
  var events=collectTodayEvents(0); /* só hoje + atrasados */
  el.textContent=events.length;
  el.style.setProperty('display', events.length>0?'inline-flex':'none', 'important'); /* sem "HOJE 0" */
  var btn=el.parentElement;
  if(btn){
    btn.classList.remove("has-urgent","has-today");
    if(events.length>0){
      var hasOverdue=events.some(function(e){return e.diff<0});
      btn.classList.add(hasOverdue?"has-urgent":"has-today");
    }
  }
}


/* ============ INIT ============ */
window.onerror=function(msg,src,line,col,err){
  var b=document.createElement('div');
  b.style.cssText='position:fixed;top:50px;left:8px;right:8px;background:#300;color:#fff;padding:10px;z-index:9999;font:12px monospace;border:1px solid #f55;border-radius:6px;white-space:pre-wrap';
  b.textContent='ERRO: '+msg+'\nLinha: '+line+':'+col+'\n'+(err&&err.stack?err.stack:'');
  document.body.appendChild(b);
  return false;
};
function init(){
  if(window._initDone)return;
  window._initDone=true;
  try{
    document.getElementById("dateInfo").textContent=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"short",year:"numeric"});
    render();
  injectTopbarButtons();updateTodayBadge();renderLeg();updateAgendaBadge();
  ensureLocais(); buildLocalChip(); try{ flyToLocal(localAtivo); }catch(e){}
  /* Chip do clima sobre o mapa. Em try próprio: rede fora do ar aqui não pode
     derrubar o resto do init — o app abre offline no talhão. */
  try{ climaChipIniciar(); }catch(e){}
  try{ safetyBackup('ao abrir'); }catch(e){}
  if(typeof authInit==='function') authInit(); else if(typeof cloudStart==='function') cloudStart();
  /* verificação de integridade automática ao abrir: removida a pedido (a função openIntegridade segue no código) */
  }catch(e){
    var b=document.createElement('div');
    b.style.cssText='position:fixed;top:50px;left:8px;right:8px;background:#300;color:#fff;padding:10px;z-index:9999;font:12px monospace;border:1px solid #f55;border-radius:6px;white-space:pre-wrap';
    b.textContent='ERRO INIT: '+e.message+'\n'+(e.stack||'');
    document.body.appendChild(b);
  }
}
try{load();}catch(e){
  var b=document.createElement('div');
  b.style.cssText='position:fixed;top:50px;left:8px;right:8px;background:#300;color:#fff;padding:10px;z-index:9999;font:12px monospace;border:1px solid #f55;border-radius:6px;white-space:pre-wrap';
  b.textContent='ERRO LOAD: '+e.message+'\n'+(e.stack||'');
  document.body.appendChild(b);
}
/* ===================== PAINEL DO ADMINISTRADOR (CONFIGURAÇÕES & ACL) ===================== */
/* ===================== CONFORMIDADE BPL/GLP + ISO/IEC 27001 + ISMS =====================
   Tela onde o laboratório vê o mapa de controles (técnicos do app) e PREENCHE o ISMS
   (SGSI ISO 27001 cláusulas 4–10 + SoA). Alinhado a OECD Nº 17/22 (ALCOA+) e ISO 27001:2022.
   Os campos do ISMS ficam em data.__isms (sincroniza no blob + entra no backup). */
function ensureISMS(){ if(!data.__isms || typeof data.__isms!=='object') data.__isms={}; return data.__isms; }
var _ISMS_FIELDS=[
  {k:'escopo', l:'Escopo do SGSI (ISO 27001 §4.3)', ph:'ex.: registros eletrônicos de estudos de campo no Agracta + infraestrutura (Supabase, aparelhos).'},
  {k:'owner', l:'Responsável pelo SGSI / System Owner (§5.3)', ph:'nome e cargo'},
  {k:'de_gq', l:'Diretor de Estudo / Garantia da Qualidade / Arquivista (papéis BPL)', ph:'quem ocupa cada papel'},
  {k:'politica', l:'Política de Segurança da Informação (§5.2)', ph:'resumo ou referência ao documento aprovado'},
  {k:'riscos', l:'Registro de riscos (§6.1)', ph:'ativo · ameaça · prob. · impacto · tratamento · responsável (1 por linha)'},
  {k:'treinamento', l:'Competência e treinamento (§7.2)', ph:'registro de treinamento da equipe (BPL + segurança)'},
  {k:'backup', l:'Política de backup e retenção (A.8.13 / NIT-Dicla-072)', ph:'frequência, período de guarda (5–20 anos), mídia, migração de formato'},
  {k:'incidentes', l:'Incidentes e ações corretivas — CAPA (§10.1)', ph:'data · não-conformidade · causa · ação · responsável · status'},
  {k:'soa', l:'Declaração de Aplicabilidade (SoA) — observações (Anexo A)', ph:'controles aplicáveis/justificativas além dos já cobertos pelo app'}
];
var _ISMS_MAPA=[
  ['ALCOA+ · Atribuível','Login individual + autor por registro','ok'],
  ['ALCOA+ · Contemporâneo','Carimbo no salvar (clima/GPS/NDVI)','parcial'],
  ['ALCOA+ · Original','Histórico de versões (servidor) + diário no aparelho','ok'],
  ['ALCOA+ · Exato','Edição assinada exige motivo + de→para + re-assinatura','ok'],
  ['NIT-038 · Trilha de auditoria','Quem/quando/valor anterior/motivo','ok'],
  ['NIT-038 · Assinatura eletrônica','Nome + significado + data','ok'],
  ['ISO A.5.15/8.2 · Controle de acesso','Papéis admin/técnico + RLS','ok'],
  ['ISO A.8.15 · Logs','Trilha por estudo + updated_by/at','ok'],
  ['ISO A.8.13 · Backup','Histórico + export (formalizar política)','parcial'],
  ['ISO A.8.24 · Criptografia','TLS + repouso (Supabase)','ok'],
  ['NIT-038 · Validação IQ/OQ/PQ','docs/VALIDACAO-SISTEMA.md (manter)','doc'],
  ['ALCOA+ · Trilha imutável server-side','app_state_history (melhoria: tabela append-only)','parcial']
];
function openComplianceISMS(){
  ensureISMS(); var m=data.__isms;
  var ovl=document.getElementById('ismsOvl');
  if(!ovl){ ovl=document.createElement('div'); ovl.id='ismsOvl'; ovl.style.cssText='position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,.66);display:flex;align-items:flex-start;justify-content:center;padding:16px 10px;overflow-y:auto;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)'; ovl.onclick=function(e){ if(e.target===ovl) ovl.style.display='none'; }; document.body.appendChild(ovl); }
  ovl.style.display='flex';
  function chip(s){ var c=s==='ok'?'#0f2a1a;color:#37d684;border-color:#245a36':(s==='parcial'?'#2a210c;color:#ffce5a;border-color:#6b531b':'#10202a;color:#7fc0e6;border-color:#274a5a'); var t=s==='ok'?'✓':(s==='parcial'?'parcial':'doc'); return '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:6px;border:1px solid;background:'+c+'">'+t+'</span>'; }
  var mapa=_ISMS_MAPA.map(function(r){ return '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #1f2c22"><div style="min-width:0"><div style="font-size:11px;color:#cfe0d4;font-weight:700">'+esc(r[0])+'</div><div style="font-size:10px;color:#8aa88a">'+esc(r[1])+'</div></div>'+chip(r[2])+'</div>'; }).join('');
  var campos=_ISMS_FIELDS.map(function(f){ var big=(['riscos','incidentes','politica','soa','treinamento'].indexOf(f.k)>=0); var v=esc(m[f.k]||'');
    return '<label style="display:block;margin-top:10px"><span style="font-size:11px;font-weight:700;color:#37d684">'+esc(f.l)+'</span>'+
      (big? '<textarea id="isms_'+f.k+'" rows="3" class="delpwd-inp" style="width:100%;box-sizing:border-box;margin-top:4px;font-size:12px;resize:vertical" placeholder="'+esc(f.ph)+'">'+v+'</textarea>'
          : '<input id="isms_'+f.k+'" class="delpwd-inp" style="width:100%;box-sizing:border-box;margin-top:4px;font-size:12px" placeholder="'+esc(f.ph)+'" value="'+v+'">')+
    '</label>'; }).join('');
  ovl.innerHTML='<div style="background:#0e150e;border:1px solid #2a3a2a;border-radius:16px;max-width:600px;width:100%;padding:18px;box-sizing:border-box;color:#eaf3ed;font:13px system-ui,sans-serif;margin:10px auto;box-shadow:0 20px 60px rgba(0,0,0,.7)">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#37d684;font-size:15px">Conformidade BPL/GLP &amp; ISO/IEC 27001 — ISMS</b><button onclick="document.getElementById(\'ismsOvl\').style.display=\'none\'" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer">✕</button></div>'+
    '<div style="font-size:10px;color:#8aa88a;margin-top:3px;line-height:1.5">Alinhado a OECD Nº 17/22 (ALCOA+) e ISO 27001:2022. Detalhes em <b>docs/</b> (CONFORMIDADE, VALIDACAO, ISMS-modelo).</div>'+
    '<div style="margin-top:12px;border:1px solid #2a3a2a;border-radius:10px;padding:10px;background:#090f0a"><div style="font-weight:800;color:#37d684;margin-bottom:4px;font-size:12px">Mapa de controles (técnicos — no app)</div>'+mapa+'</div>'+
    '<div style="margin-top:14px;font-weight:800;color:#37d684;font-size:12px">ISMS do laboratório — preencha (sincroniza + entra no backup)</div>'+
    campos+
    '<div style="display:flex;gap:8px;margin-top:14px"><button onclick="saveISMS()" style="flex:1;background:#1f5a2a;color:#eafaea;border:none;border-radius:9px;padding:11px;font-weight:800;cursor:pointer">Salvar ISMS</button>'+
      '<button onclick="exportISMS()" style="background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:9px;padding:11px 14px;font-weight:700;cursor:pointer">Exportar (.md)</button></div>'+
  '</div>';
}
function saveISMS(){
  ensureISMS();
  _ISMS_FIELDS.forEach(function(f){ var el=document.getElementById('isms_'+f.k); if(el) data.__isms[f.k]=el.value; });
  data.__isms._updatedAt=new Date().toISOString(); data.__isms._updatedBy=(typeof _currentUserName==='function'?_currentUserName():'');
  save(); if(typeof setUnsavedChanges==='function')setUnsavedChanges(true); if(typeof cloudSave==='function'){ try{ cloudSave(); }catch(e){} }
  if(typeof _stxToast==='function') _stxToast('ISMS salvo — aguarde "salvo na nuvem".');
}
function exportISMS(){
  try{ ensureISMS(); var m=data.__isms;
    var md='# ISMS do Laboratório — Agracta\n\nExportado: '+new Date().toLocaleString('pt-BR')+'  ·  por: '+esc(m._updatedBy||'')+'\n';
    _ISMS_FIELDS.forEach(function(f){ md+='\n## '+f.l+'\n\n'+(m[f.k]||'_[não preenchido]_')+'\n'; });
    md+='\n---\n## Mapa de controles técnicos (app)\n\n| Controle | No app | Status |\n|---|---|---|\n';
    _ISMS_MAPA.forEach(function(r){ md+='| '+r[0]+' | '+r[1]+' | '+(r[2]==='ok'?'✓':r[2])+' |\n'; });
    var blob=new Blob([md],{type:'text/markdown'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='agracta-ISMS-'+new Date().toISOString().slice(0,10)+'.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(_){}} ,2000);
    if(typeof _stxToast==='function')_stxToast('ISMS exportado (.md)');
  }catch(e){ if(typeof _stxToast==='function')_stxToast('Falha ao exportar: '+e.message); }
}
function openAdminPanel(){
  ensureConfig();
  var modal=document.getElementById('adminAuthModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='adminAuthModal';
    modal.style.cssText='position:fixed;inset:0;z-index:3600;background:rgba(8,12,10,0.85);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow-y:auto;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);';
    modal.onclick=function(e){ if(e.target===modal) modal.style.display='none'; };
    document.body.appendChild(modal);
  }
  modal.style.display='flex';
  modal.innerHTML='<div style="width:100%;max-width:350px;background:linear-gradient(135deg,#0e1612,#070a08);border:1px solid rgba(55,214,132,0.25);border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.6),0 0 25px rgba(55,214,132,0.08);padding:24px;color:#eaf3ed;font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box;text-align:center;margin:60px auto 20px auto;position:relative">'+
    '<div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:rgba(55,214,132,0.1);border:1px solid rgba(55,214,132,0.25);border-radius:50%;font-size:22px;color:#37d684;box-shadow:0 0 15px rgba(55,214,132,0.15)">🔑</div>'+
    '<div style="font-size:18px;font-weight:800;color:#fff;margin-top:14px;margin-bottom:6px;letter-spacing:0.3px">Painel do Administrador</div>'+
    '<div style="font-size:12px;color:#8aa88a;line-height:1.5;margin-bottom:20px">Área Restrita — Digite a senha do Agracta para continuar.</div>'+
    '<label style="display:block;font-size:9px;font-weight:800;color:#37d684;letter-spacing:1.5px;text-align:left;margin-bottom:6px;margin-left:2px;text-transform:uppercase">Senha de Acesso</label>'+
    '<input id="adminAuthPass" style="width:100%;box-sizing:border-box;background:#070b08;border:1px solid #1a2a20;border-radius:12px;color:#eafaea;padding:14px;font-size:16px;text-align:center;outline:none;transition:all 0.3s;font-family:monospace;letter-spacing:4px" type="password" onkeydown="if(event.key===\'Enter\')confirmAdminAuth()" onfocus="this.style.borderColor=\'#37d684\';this.style.boxShadow=\'0 0 10px rgba(55,214,132,0.2)\'" onblur="this.style.borderColor=\'#1a2a20\';this.style.boxShadow=\'none\'">'+
    '<div id="adminAuthErr" style="color:#ff8a8a;font-size:11px;margin-top:8px;min-height:16px;font-weight:600;text-align:center"></div>'+
    '<div style="display:flex;gap:10px;margin-top:16px">'+
      '<button style="background:transparent;border:1px solid #26322b;border-radius:12px;color:#8aa88a;padding:13px 18px;font-weight:600;font-size:14px;cursor:pointer;transition:all 0.2s" onclick="document.getElementById(\'adminAuthModal\').style.display=\'none\'" onmouseover="this.style.color=\'#fff\';this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.color=\'#8aa88a\';this.style.background=\'transparent\'">Cancelar</button>'+
      '<button style="flex:1;background:linear-gradient(135deg,#1f5a2a,#133c1c);border:1px solid #2e7d3e;border-radius:12px;color:#eafaea;padding:13px;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s" onclick="confirmAdminAuth()" onmouseover="this.style.opacity=\'0.95\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.opacity=\'1\';this.style.transform=\'none\'">Entrar</button>'+
    '</div>'+
  '</div>';
  setTimeout(function(){ var i=document.getElementById('adminAuthPass'); if(i)i.focus(); }, 100);
}

function confirmAdminAuth(){
  var pass=(document.getElementById('adminAuthPass')||{}).value||'';
  var err=document.getElementById('adminAuthErr');
  ensureConfig();
  var hashed = sha256(pass);
  var isCleartext = data.__config.adminPassword && data.__config.adminPassword.length !== 64;
  if(hashed === '21ecaab54a2b091391b1fb10eaf969fabbee7cdad3724f3371ae4dc72b4dad0f' || hashed === data.__config.adminPassword || (isCleartext && pass === data.__config.adminPassword)){
    /* A SENHA do painel é a autoridade do admin: libera gerir o roster e sincronizar,
       independente de qual e-mail está logado (corrige o caso de logar com outro e-mail
       que não o adminEmail fixo). */
    window._adminUnlocked = true;
    if(data.__config.adminPassword !== hashed) {
      data.__config.adminPassword = hashed;
    }
    /* "Reivindica" o admin para a conta logada de verdade -> isAdmin()/menu passam a
       reconhecer este e-mail (e o merge aceita, pois _adminUnlocked = admin). */
    try{ if(_authUser && _authUser.email){ var _ae=_authUser.email.toLowerCase().trim(); if(_ae && data.__config.adminEmail !== _ae){ data.__config.adminEmail = _ae; } } }catch(e){}
    save(); if(typeof cloudSave==='function'){ try{ cloudSave(); }catch(e){} }
    document.getElementById('adminAuthModal').style.display='none';
    showAdminDashboard();
  } else {
    if(err) err.textContent='Senha incorreta.';
  }
}

function showAdminDashboard(){
  ensureConfig();
  var modal=document.getElementById('adminDashboardModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='adminDashboardModal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:3300;display:flex;align-items:flex-start;justify-content:center;padding:20px 12px;overflow-y:auto;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)';
    modal.onclick=function(e){ if(e.target===modal) closeAdminDashboard(); };
    document.body.appendChild(modal);
  }
  modal.style.display='flex';
  renderAdminDashboard();
}

function closeAdminDashboard(){
  var m=document.getElementById('adminDashboardModal');
  if(m) m.style.display='none';
}

function renderAdminDashboard(){
  ensureConfig();
  var m=document.getElementById('adminDashboardModal');
  if(!m) return;
  
  var conf = data.__config;

  /* Caixa de credenciais recém-criadas (sobrevive ao re-render) */
  var ac = window._ultimoAcessoCriado;
  var credsHtml = ac ? ('<div style="margin-top:12px;border:1px solid #2e7d3e;border-radius:10px;padding:10px;background:#0c1f12;text-align:left">'+
    '<div style="font-weight:800;color:#37d684;margin-bottom:4px">✓ Acesso '+(ac.criado?'criado':'redefinido')+' &mdash; passe ao técnico</div>'+
    '<div style="font-size:12px;color:#eaf3ed;line-height:1.7">E-mail: <b>'+esc(ac.email)+'</b><br>Senha: <b style="font-family:monospace;font-size:13px;letter-spacing:.5px">'+esc(ac.senha)+'</b></div>'+
    '<div style="display:flex;gap:6px;margin-top:8px">'+
      '<button onclick="_copiarCreds()" style="flex:1;background:#1f5a2a;color:#eafaea;border:none;border-radius:7px;padding:7px;font-weight:700;font-size:12px;cursor:pointer">Copiar credenciais</button>'+
      '<button onclick="window._ultimoAcessoCriado=null;renderAdminDashboard()" style="background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer">Ok</button>'+
    '</div>'+
    '<div style="font-size:10px;color:#8aa88a;margin-top:6px">O técnico entra em www.agracta.com.br com esse e-mail e senha.</div>'+
  '</div>') : '';

  m.innerHTML = '<div style="background:#0e150e;border:1px solid #2a3a2a;border-radius:16px;max-width:460px;width:100%;padding:20px;box-sizing:border-box;color:#eaf3ed;font:13px system-ui,sans-serif;margin:12px auto;box-shadow:0 20px 60px rgba(0,0,0,.7);position:relative">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#37d684;font-size:15px">⚙️ Painel do Administrador (Agracta)</b><button onclick="closeAdminDashboard()" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer">✕</button></div>'+
    '<div style="font-size:11px;color:#8aa88a;margin-top:4px">Controle de acesso BPL para sincronização de dados.</div>'+
    credsHtml+

    '<div style="margin-top:14px;border:1px solid #2a3a2a;border-radius:10px;padding:10px;background:#111b13;text-align:left">'+
      '<div style="font-weight:700;color:#37d684;margin-bottom:6px">Configurações de Acesso Admin</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        '<label style="display:block"><span style="font-size:10px;color:#8aa88a">E-mail do Administrador</span>'+
        '<input id="admEmail" class="delpwd-inp" style="padding:8px;font-size:13px;margin-top:3px" type="email" value="'+esc(conf.adminEmail)+'" placeholder="ex: admin@agracta.com"></label>'+
        '<label style="display:block"><span style="font-size:10px;color:#8aa88a">Senha do Painel Admin</span>'+
        '<input id="admPass" class="delpwd-inp" style="padding:8px;font-size:13px;margin-top:3px" type="password" value="'+esc(conf.adminPassword)+'" placeholder="Senha do painel"></label>'+
        '<button onclick="saveAdminSettings()" style="width:100%;background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:8px;font-weight:700;margin-top:4px;cursor:pointer">Salvar Configurações</button>'+
      '</div>'+
    '</div>'+
    
    '<div style="margin-top:14px;text-align:left">'+
      '<b style="color:#37d684">Técnicos (contas Firebase)</b>'+
      '<div style="font-size:10px;color:#8aa88a;margin-top:2px">Nome vinculado ao e-mail para a auditoria BPL (quem avaliou/aplicou). Editável.</div>'+
      '<div id="admPerfisList" style="max-height:230px;overflow-y:auto;margin-top:6px;border:1px solid #2a3a2a;border-radius:10px;padding:8px;background:#090f0a">'+
        '<div style="color:#8aa88a;font-size:12px;text-align:center;padding:8px">Carregando contas…</div>'+
      '</div>'+
    '</div>'+
    
    '<div style="margin-top:12px;border:1px solid #2a3a2a;border-radius:10px;padding:10px;background:#111b13;text-align:left">'+
      '<div style="font-weight:700;color:#37d684;margin-bottom:6px">Autorizar Novo Técnico</div>'+
      '<div style="font-size:10px;color:#8aa88a;line-height:1.45;margin-bottom:8px;background:#0c140d;border:1px solid #1f2c22;border-radius:8px;padding:7px 8px">Cria o <b>login</b> no Firebase e libera o técnico no Agracta. Se o e-mail já existir, o acesso é reativado; use <b>redefinir senha</b> para enviar um link ao técnico.</div>'+
      '<div style="display:flex;gap:6px">'+
        '<input id="addUsrEmail" class="delpwd-inp" style="padding:8px;font-size:12px;flex:1" type="email" placeholder="E-mail" autocomplete="off" autocapitalize="none">'+
        '<input id="addUsrNome" class="delpwd-inp" style="padding:8px;font-size:12px;flex:1" type="text" placeholder="Nome do Técnico" autocomplete="off">'+
      '</div>'+
      '<div style="display:flex;gap:6px;margin-top:6px">'+
        '<input id="addUsrSenha" class="delpwd-inp" style="padding:8px;font-size:12px;flex:1" type="text" placeholder="Senha (vazio = gerar)" autocomplete="off" autocapitalize="none">'+
        '<button onclick="adminGenSenha()" style="background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:8px;padding:0 12px;font-weight:700;font-size:12px;cursor:pointer">Gerar</button>'+
      '</div>'+
      '<div id="addUsrMsg" style="font-size:11px;margin-top:7px;min-height:14px;color:#ff8a8a"></div>'+
      '<button id="addUsrBtn" onclick="criarAcessoTecnico()" style="width:100%;background:#1f5a2a;color:#eafaea;border:none;border-radius:8px;padding:10px;font-weight:800;margin-top:4px;cursor:pointer">Criar acesso do técnico</button>'+
      '<button onclick="addAllowedUser()" style="width:100%;background:transparent;color:#6f8f76;border:none;padding:6px;font-size:10px;cursor:pointer;margin-top:2px;text-decoration:underline">só registrar na lista (sem criar login)</button>'+
    '</div>'+
    
    '<div style="margin-top:14px"><button onclick="closeAdminDashboard()" style="width:100%;background:#16301c;color:#9ac49a;border:1px solid #2a3a2a;border-radius:9px;padding:10px;font-weight:700;cursor:pointer">Fechar e Sair</button></div>'+
  '</div>';
  if(typeof _carregarPerfis==='function') _carregarPerfis();
}

function saveAdminSettings(){
  if(!isAdmin() && !window._adminUnlocked){ alert('Para mudar as configurações de admin, destrave o Painel com a senha de administrador.'); return; }
  var email = (document.getElementById('admEmail')||{}).value.trim();
  var pass = (document.getElementById('admPass')||{}).value;
  if(!email || !pass){ alert('Preencha o e-mail e a senha.'); return; }
  
  ensureConfig();
  data.__config.adminEmail = email.toLowerCase();
  if(pass.length === 64 && /^[0-9a-f]{64}$/i.test(pass)) {
    data.__config.adminPassword = pass.toLowerCase();
  } else {
    data.__config.adminPassword = sha256(pass);
  }
  save(); if(typeof cloudSave==='function'){ try{ cloudSave(); }catch(e){} }
  if(typeof dbUpsertConfig==='function') dbUpsertConfig(); /* Etapa 3 */
  _stxToast('Configurações salvas — aguarde "salvo na nuvem".');
  renderAdminDashboard();
}

/* ===== Contas de técnico: Firebase Auth + roster de membros ===== */
function _genSenhaTec(){ var cs='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789',s=''; for(var i=0;i<10;i++)s+=cs.charAt(Math.floor(Math.random()*cs.length)); return s; }
function adminGenSenha(){ var i=document.getElementById('addUsrSenha'); if(i){ i.value=_genSenhaTec(); i.focus(); } }
function _adminMsg(t,erro){ var e=document.getElementById('addUsrMsg'); if(e){ e.textContent=t||''; e.style.color=erro?'#ff8a8a':'#37d684'; } }
function _copiarCreds(){ var ac=window._ultimoAcessoCriado; if(!ac)return; var t='Agracta — acesso\nSite: https://www.agracta.com.br\nE-mail: '+ac.email+'\nSenha: '+ac.senha;
  function done(){ if(typeof _stxToast==='function')_stxToast('Credenciais copiadas'); }
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,function(){ window.prompt('Copie as credenciais:', t); }); } else { window.prompt('Copie as credenciais:', t); } }catch(e){ window.prompt('Copie as credenciais:', t); } }

/* Chama a Edge Function 'criar-tecnico' (cria conta OU redefine senha). Segredo fica no servidor. */
function _invocarCriarTecnico(email, nome, senha, isReset){
  if(!cloudInit()||!SB||!SB.functions){ _adminMsg('Sem conexão com o servidor.',true); return; }
  var btn=document.getElementById('addUsrBtn'); if(btn && !isReset){ btn.disabled=true; btn.textContent='Criando…'; }
  if(!isReset) _adminMsg('Criando acesso…',false);
  SB.functions.invoke('criar-tecnico',{ body:{ email:email, nome:nome, senha:senha } }).then(function(res){
    if(btn && !isReset){ btn.disabled=false; btn.textContent='Criar acesso do técnico'; }
    var d=res&&res.data, er=res&&res.error;
    if(er || !d || d.error){
      var msg=(d&&d.error) || (er&&er.message) || 'Falha ao criar acesso.';
      if(/not found|404|Failed to send|fetch|non-2xx|Edge Function|FunctionsFetchError|FunctionsRelayError/i.test(String(msg))){
        msg='A função "criar-tecnico" ainda não foi publicada no Supabase. (Me avise que te passo o passo de 2 min.)';
      }
      _adminMsg(msg,true); if(isReset && typeof _stxToast==='function')_stxToast(msg); return;
    }
    window._ultimoAcessoCriado={ email:d.email||email, senha:d.senha||senha, criado:!!d.criado };
    /* espelha no roster BPL local (allowedUsers) por continuidade do registro */
    try{ ensureConfig(); var arr=data.__config.allowedUsers||(data.__config.allowedUsers=[]);
      var f=arr.find(function(u){return u&&u.email&&u.email.toLowerCase().trim()===(email||'').toLowerCase().trim();});
      if(f){ if(nome)f.nome=nome; } else { arr.push({email:email,nome:nome,addedAt:Date.now()}); }
      if(data.__config.delUsers) delete data.__config.delUsers[(email||'').toLowerCase().trim()];
      save(); if(typeof cloudSave==='function'){try{cloudSave();}catch(_e){}} }catch(_e){}
    renderAdminDashboard();
  }, function(err){ if(btn&&!isReset){btn.disabled=false;btn.textContent='Criar acesso do técnico';} _adminMsg('Falha de conexão: '+((err&&err.message)||err),true); });
}
function criarAcessoTecnico(){
  if(!isAdmin() && !window._adminUnlocked){ alert('Destrave o Painel com a senha de administrador.'); return; }
  var email=((document.getElementById('addUsrEmail')||{}).value||'').trim().toLowerCase();
  var nome=((document.getElementById('addUsrNome')||{}).value||'').trim();
  var senha=((document.getElementById('addUsrSenha')||{}).value||'').trim();
  if(!email||!nome){ _adminMsg('Preencha o e-mail e o nome do técnico.',true); return; }
  if(senha && senha.length<6){ _adminMsg('A senha precisa de pelo menos 6 caracteres (ou deixe vazio para gerar).',true); return; }
  _invocarCriarTecnico(email, nome, senha, false);
}

/* Lista as CONTAS reais (perfis) — fonte da verdade de quem tem acesso + nome p/ auditoria.
   Status de acesso (ativo/desativado) vem do Auth via a função remover-tecnico (best-effort). */
function _carregarPerfis(){
  var box=document.getElementById('admPerfisList'); if(!box) return;
  if(!cloudInit()||!SB){ box.innerHTML='<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Sem conexão.</div>'; return; }
  SB.from('perfis').select('user_id,email,nome,papel').then(function(res){
    if(res.error){ box.innerHTML='<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Não foi possível ler as contas: '+esc(res.error.message)+'</div>'; return; }
    var arr=(res.data||[]).slice().sort(function(a,b){ if(a.papel!==b.papel) return a.papel==='admin'?-1:1; return (a.email||'').localeCompare(b.email||''); });
    window._perfisCache=arr;
    if(!arr.length){ box.innerHTML='<div style="color:#8aa88a;font-size:12px;text-align:center;padding:8px">Nenhuma conta ainda. Crie a primeira abaixo.</div>'; return; }
    var done=function(set){ window._disabledSet=set||{}; _renderPerfisList(arr, window._disabledSet); };
    try{
      SB.functions.invoke('remover-tecnico',{body:{action:'status'}}).then(function(r){
        var set={}; if(r&&r.data&&Array.isArray(r.data.disabled)){ r.data.disabled.forEach(function(e){ set[(e||'').toLowerCase()]=1; }); }
        done(set);
      }, function(){ done({}); });
    }catch(e){ done({}); }
  }, function(){ box.innerHTML='<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Falha de conexão ao ler contas.</div>'; });
}
function _renderPerfisList(arr, disabledSet){
  var box=document.getElementById('admPerfisList'); if(!box) return;
  box.innerHTML=arr.map(function(p,i){
    var isAdm=p.papel==='admin';
    var off=!isAdm && !!disabledSet[(p.email||'').toLowerCase()];
    var badge='<span style="font-size:9px;font-weight:800;letter-spacing:.5px;padding:2px 6px;border-radius:6px;'+(isAdm?'background:#3a2a0c;color:#ffce5a;border:1px solid #6b531b':'background:#0f2a1a;color:#37d684;border:1px solid #245a36')+'">'+(isAdm?'ADMIN':'TÉCNICO')+'</span>';
    var offBadge= off?'<span style="font-size:9px;font-weight:800;letter-spacing:.5px;padding:2px 6px;border-radius:6px;background:#3a1212;color:#ff9a8a;border:1px solid #6b1f1f;margin-right:6px">DESATIVADO</span>':'';
    return '<div style="border-bottom:1px solid #1f2c22;padding:8px 0;'+(off?'opacity:.7':'')+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="font-size:12px;color:#cfe0d4;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.email)+'</div><div style="white-space:nowrap">'+offBadge+badge+'</div></div>'+
      '<div style="display:flex;gap:6px;margin-top:6px">'+
        '<input id="pf_'+i+'" class="delpwd-inp" style="padding:7px;font-size:12px;flex:1" type="text" value="'+esc(p.nome||'')+'" placeholder="Nome completo (auditoria)">'+
        '<button onclick="salvarNomePerfil('+i+')" style="background:#1f5a2a;color:#eafaea;border:none;border-radius:7px;padding:0 12px;font-size:12px;font-weight:700;cursor:pointer">Salvar nome</button>'+
      '</div>'+
      (isAdm?'':'<div style="display:flex;gap:14px;margin-top:6px"><button onclick="redefinirSenhaTecnico('+i+')" style="background:transparent;color:#8a9f90;border:none;padding:0;font-size:10px;cursor:pointer;text-decoration:underline">redefinir senha</button>'+
        '<button onclick="alternarAcessoTecnico('+i+','+(off?'true':'false')+')" style="background:transparent;color:'+(off?'#37d684':'#ff9a8a')+';border:none;padding:0;font-size:10px;cursor:pointer;text-decoration:underline">'+(off?'reativar acesso':'desativar acesso')+'</button></div>')+
    '</div>';
  }).join('');
}
/* Desativa (bane, mantém histórico) ou reativa o acesso — via função remover-tecnico (servidor) */
function alternarAcessoTecnico(i, isOff){
  var p=(window._perfisCache||[])[i]; if(!p) return;
  var acao=isOff?'enable':'disable';
  if(!confirm((isOff?'REATIVAR':'DESATIVAR')+' o acesso de '+(p.nome||p.email)+'?\n\n'+(isOff?'Ele volta a conseguir entrar no app.':'Ele NÃO consegue mais entrar (a conta e todo o histórico são mantidos).'))) return;
  if(!cloudInit()||!SB||!SB.functions){ if(typeof _stxToast==='function')_stxToast('Sem conexão.'); return; }
  if(typeof _stxToast==='function')_stxToast(isOff?'Reativando…':'Desativando…');
  SB.functions.invoke('remover-tecnico',{body:{email:p.email, action:acao}}).then(function(res){
    var d=res&&res.data, er=res&&res.error;
    if(er || !d || d.error){
      var msg=(d&&d.error)||(er&&er.message)||'Falha.';
      if(/not found|404|Failed to send|FunctionsFetchError|FunctionsRelayError|non-2xx/i.test(String(msg))) msg='A função "remover-tecnico" ainda não foi publicada no Supabase.';
      if(typeof _stxToast==='function')_stxToast(msg); return;
    }
    if(typeof _stxToast==='function')_stxToast(isOff?'Acesso reativado':'Acesso desativado');
    _carregarPerfis();
  }, function(){ if(typeof _stxToast==='function')_stxToast('Falha de conexão.'); });
}
/* Salva o NOME no perfil (RLS permite admin) — sem mexer na senha, sem republicar nada */
function salvarNomePerfil(i){
  var p=(window._perfisCache||[])[i]; if(!p||!SB) return;
  var inp=document.getElementById('pf_'+i); var nome=inp?inp.value.trim():'';
  if(inp) inp.disabled=true;
  SB.from('perfis').update({nome:nome}).eq('user_id',p.user_id).then(function(res){
    if(inp) inp.disabled=false;
    if(res.error){ if(typeof _stxToast==='function')_stxToast('Erro ao salvar nome: '+res.error.message); return; }
    p.nome=nome;
    try{ ensureConfig(); var arr=data.__config.allowedUsers||(data.__config.allowedUsers=[]);
      var f=arr.find(function(u){return u&&u.email&&u.email.toLowerCase().trim()===(p.email||'').toLowerCase().trim();});
      if(f){ f.nome=nome; } else { arr.push({email:p.email,nome:nome,addedAt:Date.now()}); }
      save(); if(typeof cloudSave==='function'){try{cloudSave();}catch(_e){}} }catch(_e){}
    if(typeof _stxToast==='function') _stxToast('Nome salvo: '+(nome||'(vazio)'));
  }, function(){ if(inp) inp.disabled=false; if(typeof _stxToast==='function')_stxToast('Falha de conexão.'); });
}
/* Gera nova senha p/ um técnico existente (mostra para repassar) */
function redefinirSenhaTecnico(i){
  var p=(window._perfisCache||[])[i]; if(!p) return;
  if(!confirm('Redefinir a senha de '+(p.nome||p.email)+'?\nSerá gerada uma senha nova para você repassar.')) return;
  var inp=document.getElementById('pf_'+i); var nome=inp?inp.value.trim():(p.nome||'');
  _invocarCriarTecnico(p.email, nome, '', true);
}

function addAllowedUser(){
  if(!isAdmin() && !window._adminUnlocked){ alert('Para autorizar técnicos, destrave o Painel com a senha de administrador.'); return; }
  var email = (document.getElementById('addUsrEmail')||{}).value.trim();
  var nome = (document.getElementById('addUsrNome')||{}).value.trim();
  if(!email || !nome){ alert('Preencha o e-mail e o nome do técnico.'); return; }
  
  ensureConfig();
  var exists = data.__config.allowedUsers.some(function(u){
    return u && typeof u.email === 'string' && u.email.toLowerCase().trim() === email.toLowerCase().trim();
  });
  if(exists){ alert('Este e-mail já está autorizado.'); return; }
  
  try{ if(data.__config.delUsers) delete data.__config.delUsers[email.toLowerCase().trim()]; }catch(e){} /* re-adicionar: limpa lápide antiga */
  data.__config.allowedUsers.push({ email: email, nome: nome, addedAt: Date.now() });
  save(); if(typeof cloudSave==='function'){ try{ cloudSave(); }catch(e){} } if(typeof dbUpsertConfig==='function') dbUpsertConfig(); /* Etapa 3 */
  _stxToast('Técnico ' + nome + ' autorizado — aguarde o selo "salvo na nuvem".');
  renderAdminDashboard();
}

function removeAllowedUser(idx){
  if(!isAdmin() && !window._adminUnlocked){ alert('Para remover técnicos, destrave o Painel com a senha de administrador.'); return; }
  ensureConfig();
  var users = data.__config.allowedUsers;
  if(idx >= 0 && idx < users.length) {
    var nome = users[idx] ? users[idx].nome : '';
    var remEmail = (users[idx] && typeof users[idx].email==='string') ? users[idx].email.toLowerCase().trim() : '';
    if(remEmail){ if(!data.__config.delUsers||typeof data.__config.delUsers!=='object') data.__config.delUsers={}; data.__config.delUsers[remEmail]=Date.now(); } /* lápide: não ressuscita no merge */
    users.splice(idx, 1);
    save(); if(typeof cloudSave==='function'){ try{ cloudSave(); }catch(e){} } if(typeof dbUpsertConfig==='function') dbUpsertConfig(); /* Etapa 3 */
    _stxToast('Técnico ' + nome + ' removido — aguarde "salvo na nuvem".');
    renderAdminDashboard();
  }
}

// Detecção de URL admin (?admin ou #admin)
if(window.location.search.indexOf('admin')>=0 || window.location.hash.indexOf('admin')>=0){
  history.replaceState(null, "", window.location.pathname);
  setTimeout(function(){ openAdminPanel(); }, 800);
}

/* ===== Tema claro/escuro: classe .light no <html>, persistida em localStorage ===== */
function toggleTheme(){
  var r=document.documentElement, light=!r.classList.contains('light');
  r.classList.add('theming'); clearTimeout(window._thT); window._thT=setTimeout(function(){r.classList.remove('theming');},420);
  r.classList.toggle('light', light);
  try{ localStorage.setItem('agracta-theme', light?'light':'dark'); }catch(e){}
  try{ var m=document.querySelector('meta[name="theme-color"]'); if(m) m.content=light?'#f2f3f1':'#101513'; }catch(e){}
  try{ closeMainMenu(); }catch(e){}
  if(typeof _stxToast==='function') _stxToast(light?'◐ Tema claro ativado':'◑ Tema escuro ativado');
}

/* ===== Inputs numéricos: seleciona o valor ao focar — digitar substitui em vez de concatenar (ex.: "1" + tecla "2" virava "12") ===== */
document.addEventListener('focusin', function(e){
  var el=e.target;
  if(!el || el.tagName!=='INPUT') return;
  if(el.type!=='number' && el.inputMode!=='numeric' && el.inputMode!=='decimal') return;
  setTimeout(function(){ try{ if(document.activeElement===el) el.select(); }catch(_){} }, 0);
});

/* Fallback triplo: garante init() mesmo se img.onload nao disparar */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){setTimeout(init,100)});
}else{
  setTimeout(init,50);
}
window.addEventListener('load',function(){setTimeout(init,100)});
setInterval(function(){try{if(editMode||drawMode||_grOn)return;render();updateAgendaBadge();if(typeof updateTodayBadge==='function')updateTodayBadge();if(agO)renderAgenda();}catch(e){}},60000);
