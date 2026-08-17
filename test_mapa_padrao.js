/* O mapa principal deve abrir no Google híbrido (satélite + nomes), sem
 * retirar as alternativas do seletor de camadas.
 *
 * Rodar: node test_mapa_padrao.js
 */
var fs=require('fs');
var src=fs.readFileSync('app.js','utf8');
var f=0,p=0;
function ck(c,n){ if(c){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);} }

ck(src.indexOf("'H\\u00edbrido (Google)':  LF.tileLayer('https://{s}.google.com/vt/lyrs=y")>=0,
  'camada híbrida usa imagens Google com rótulos');
ck(src.indexOf("_baseSat=_bases['H\\u00edbrido (Google)']; _baseSat.addTo(_map);")>=0,
  'Google híbrido é a camada adicionada ao abrir');
ck(src.indexOf("'Sat\\u00e9lite (Google)': LF.tileLayer")>=0 && src.indexOf("'Sat\\u00e9lite (Esri)':   LF.tileLayer")>=0,
  'camadas alternativas continuam disponíveis');
ck(src.indexOf('function autoLocateOnOpen()')>=0 && src.indexOf('locateMe({automatic:true})')>=0,
  'abertura solicita a posição GPS em modo automático');
ck(src.indexOf('try{ autoLocateOnOpen(); }catch(e){}')>=0,
  'GPS assume o centro depois do Local usado como reserva');
ck(src.indexOf("if(!b){ if(!automatic) alert('Não consegui o GPS.")>=0,
  'falha do GPS automático mantém o Local sem alerta intrusivo');

console.log('\n'+(f?f+' FALHA(S)':p+' verificações, nenhuma falha.'));
process.exit(f?1:0);
