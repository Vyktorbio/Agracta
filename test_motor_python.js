/* Roda o Python publicado, com as mesmas versões WASM usadas no aparelho. */
const fs=require('fs'),path=require('path');
const {loadPyodide}=require('./estatistica/pyodide/pyodide.js');
(async()=>{
  const py=await loadPyodide({indexURL:path.resolve('estatistica/pyodide')});
  await py.loadPackage(['numpy','scipy','pandas','statsmodels']);
  py.FS.mkdirTree('/home/pyodide/bioengine');
  for(const name of fs.readdirSync('estatistica/bioengine').filter(n=>n.endsWith('.py'))){
    py.FS.writeFile('/home/pyodide/bioengine/'+name,fs.readFileSync('estatistica/bioengine/'+name,'utf8'));
  }
  await py.runPythonAsync(fs.readFileSync('tests/motor_blocos.py','utf8'));
  await py.runPythonAsync(fs.readFileSync('tests/motor_mistos.py','utf8'));
  await py.runPythonAsync(fs.readFileSync('tests/motor_entradas.py','utf8'));
  await py.runPythonAsync(fs.readFileSync('tests/motor_poder.py','utf8'));
  await py.runPythonAsync(fs.readFileSync('tests/motor_equivalencia.py','utf8'));
  await py.runPythonAsync(fs.readFileSync('tests/motor_dosecontinua.py','utf8'));
  await py.runPythonAsync(fs.readFileSync('tests/motor_rotas_novas.py','utf8'));
  console.log('Motor Python: cálculos, blocos, faltantes, modelos, poder, equivalência e curva de dose verificados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
