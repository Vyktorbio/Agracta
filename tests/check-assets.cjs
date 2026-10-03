/* Fora do heredoc: também funciona no Bash 3.2 distribuído com macOS. */
var fs=require("fs"), falta=[];
function confere(base,lista){ lista.forEach(function(u){
  var p=String(u).replace(/^\.\//,"").replace(/[?#].*$/,"");
  if(!p || /^(https?:)?\/\//.test(p) || /^data:/.test(p)) return;
  var alvo=base?base+"/"+p:p;
  if(!fs.existsSync(alvo) && falta.indexOf(alvo)<0) falta.push(alvo);
}); }
function ler(arq){ return fs.existsSync(arq)?fs.readFileSync(arq,"utf8"):""; }
[ {base:"",           sw:"sw.js",             lista:/var ASSETS\s*=\s*\[([\s\S]*?)\]/,   html:"index.html"},
  {base:"estatistica",sw:"estatistica/sw.js", lista:/const SHELL\s*=\s*\[([\s\S]*?)\]/, html:"estatistica/index.html"}
].forEach(function(c){
  var m=ler(c.sw).match(c.lista);
  if(m) confere(c.base,(m[1].match(/["'][^"']+["']/g)||[]).map(function(s){return s.slice(1,-1);}));
  var html=ler(c.html), r=/(?:src|href)="([^"]+)"/g, x;
  while((x=r.exec(html))) confere(c.base,[x[1]]);
});
console.log(falta.join("\n"));
