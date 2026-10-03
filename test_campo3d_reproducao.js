'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body><div id="host"></div>',{runScripts:'outside-only'}),w=dom.window;let frames=[],draws=0;
w.requestAnimationFrame=fn=>frames.push(fn);w.Path2D=class{moveTo(){}lineTo(){}closePath(){}};
const gradient={addColorStop(){}};const ctx=new Proxy({clearRect(){draws++;},measureText:()=>({width:25}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:(()=>{})});
w.HTMLCanvasElement.prototype.getContext=()=>ctx;
w.eval(fs.readFileSync('campo-3d.js','utf8'));
const st={dataInicio:'2026-09-23',numRepeticoes:1,tratamentos:[{id:'T1'}],avaliacoes:[{data:'2026-09-24',variaveis:['v'],notas:{T1R1:{v:2}}},{data:'2026-09-30',variaveis:['v'],notas:{T1R1:{v:90}}}]};
function step(t){const callbacks=frames;frames=[];callbacks.forEach(fn=>fn(t));}
for(const embedded of [true,false]){
 w.abrirCampo3D({codigo:'S'},st,embedded?{hospedeiro:w.document.getElementById('host')}:{});
 const root=embedded?w.document.getElementById('host'):w.document.getElementById('campo3dOvl'),slider=root.querySelector('[data-c3="tempo"]'),button=root.querySelector('[data-c3="rodar"]');
 step(100);step(200);assert.equal(+slider.value,7,'opens stopped');button.click();step(300);step(800);assert.ok(+slider.value>0&&+slider.value<7,'Rodar advances slider');assert.match(root.querySelector('.c3-daa').textContent,/DAA/);assert.ok(draws>0);
 button.click();const paused=slider.value;step(900);step(1200);assert.equal(slider.value,paused,'pause stops advancement');assert.equal(frames.length,1,'one loop even after switching host');
}
console.log('Rodar: modal e embutido avançam, abrem parados, pausam e não duplicam o laço OK');
dom.window.close();
