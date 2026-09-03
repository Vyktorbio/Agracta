/* Geometria operacional não pode ser publicada como dado padrão do site.
 * Rodar: node test_privacidade_geometria.js
 */
var fs=require('fs');
var vendor=fs.readFileSync('vendor/quadras-default.js','utf8');
var app=fs.readFileSync('app.js','utf8');
var index=fs.readFileSync('index.html','utf8');
var croqui=fs.readFileSync('croqui.html','utf8');
var sw=fs.readFileSync('sw.js','utf8');
var f=0,p=0;
function ck(ok,n){if(ok){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);}}

ck(/window\.DEFAULT_QGEO\s*=\s*\{\s*\}/.test(vendor),'instalação nova não traz polígonos reais');
ck(/window\.DEFAULT_GEOREF\s*=\s*null/.test(vendor),'nem alinhamento com coordenadas reais');
ck(!/-\d{2}\.\d{5,}/.test(vendor),'o arquivo público não contém latitude/longitude de operação');
ck(/ESTACAO_CENTER=\[-14\.235,-51\.9253\], ESTACAO_ZOOM=4/.test(app),'instalação vazia abre numa reserva geográfica neutra');
ck(!fs.existsSync('mapa-base.jpg'),'a imagem aérea identificada das quadras não é mais publicada');
ck(index.indexOf('mapa-base.jpg')<0 && sw.indexOf('mapa-base.jpg')<0,'HTML e cache não pedem a imagem removida');
ck(app.indexOf('var q=loadQGEO();')>=0 && app.indexOf('if(q) QGEO=q;')>=0,'ambiente existente continua carregando a geometria local');
ck(/quadras-default\.js\?v=2/.test(index),'HTML pede a versão sem coordenadas');
ck(/quadras-default\.js\?v=2/.test(croqui),'o gerador de croqui também evita a versão antiga em cache');
ck(/quadras-default\.js\?v=2/.test(sw),'e o cofre offline usa a mesma versão');

console.log('\nResultado: '+p+' passaram; '+f+' falharam.');
if(f)process.exitCode=1;
