/* Gera o JSON importável usando o mesmo contrato exercitado nos testes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'), contract=require('../integrations/n8n/calendar-contract.cjs');
const core=fs.readFileSync(path.join(root,'vendor/agenda-google-core.js'),'utf8');
const library='const C = (() => { const module = {exports:{}}; const window = undefined;\n'+core+'\nreturn module.exports; })();\n';
function code(name,fn,call,x,y){return {id:crypto.randomUUID(),name:name,type:'n8n-nodes-base.code',typeVersion:2,position:[x,y],parameters:{jsCode:library+'const run = '+fn.toString()+';\nreturn [{json: run('+call+')}];'}};}
const response={response:{fullResponse:true,neverError:true,responseFormat:'json'}};
const workflow={name:'Agracta → Agenda Google',active:false,
  nodes:[
    {id:crypto.randomUUID(),name:'Como configurar',type:'n8n-nodes-base.stickyNote',typeVersion:1,position:[-60,-340],parameters:{height:260,width:760,content:'## Agracta → Agenda Google\n1. Configure o ID da agenda no nó **Agenda de destino**.\n2. No webhook, selecione uma credencial **Header Auth**: nome `Authorization`, valor `Bearer SUA_CHAVE`.\n3. Selecione sua credencial Google Calendar OAuth2 nos dois nós HTTP.\n4. Publique o fluxo e copie a URL de produção para o Agracta → Agenda → Agenda Google.\n5. Configure os lembretes padrão da agenda Google. Sem participantes ou convites; apenas compromissos desta integração são alterados.'}},
    {id:crypto.randomUUID(),name:'Receber agenda',type:'n8n-nodes-base.webhook',typeVersion:2,position:[0,0],webhookId:crypto.randomUUID(),parameters:{httpMethod:'POST',path:'agracta-google-agenda',authentication:'headerAuth',responseMode:'lastNode',responseData:'firstEntryJson',options:{allowedOrigins:'https://agracta.com.br,https://www.agracta.com.br,https://vyktorbio.github.io'}}},
    {id:crypto.randomUUID(),name:'Agenda de destino',type:'n8n-nodes-base.set',typeVersion:3.4,position:[220,0],parameters:{assignments:{assignments:[{id:crypto.randomUUID(),name:'calendarId',value:'CONFIGURE_O_ID_DA_AGENDA',type:'string'}]},includeOtherFields:true,options:{}}},
    code('Preparar evento',contract.prepare,'$json.body, $json.calendarId',440,0),
    {id:crypto.randomUUID(),name:'Consultar compromisso',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[660,0],parameters:{url:'={{ $json.url }}',authentication:'predefinedCredentialType',nodeCredentialType:'googleCalendarOAuth2Api',options:{response:response,timeout:20000}}},
    code('Planejar gravação',contract.plan,"$('Preparar evento').first().json, $input.first().json",880,0),
    {id:crypto.randomUUID(),name:'Precisa gravar?',type:'n8n-nodes-base.if',typeVersion:2.2,position:[1100,0],parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:crypto.randomUUID(),leftValue:'={{ $json.skip }}',rightValue:'',operator:{type:'boolean',operation:'false',singleValue:true}}],combinator:'and'},options:{}}},
    {id:crypto.randomUUID(),name:'Gravar compromisso',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[1320,-80],parameters:{method:'={{ $json.method }}',url:'={{ $json.url }}',authentication:'predefinedCredentialType',nodeCredentialType:'googleCalendarOAuth2Api',sendHeaders:true,specifyHeaders:'json',jsonHeaders:'={{ $json.headers }}',sendBody:true,specifyBody:'json',jsonBody:'={{ $json.googleBody }}',options:{response:response,timeout:20000}}},
    code('Confirmar envio',contract.confirm,"$('Preparar evento').first().json, $('Planejar gravação').first().json, $input.first().json",1540,0)
  ],
  connections:{
    'Receber agenda':{main:[[{node:'Agenda de destino',type:'main',index:0}]]},
    'Agenda de destino':{main:[[{node:'Preparar evento',type:'main',index:0}]]},
    'Preparar evento':{main:[[{node:'Consultar compromisso',type:'main',index:0}]]},
    'Consultar compromisso':{main:[[{node:'Planejar gravação',type:'main',index:0}]]},
    'Planejar gravação':{main:[[{node:'Precisa gravar?',type:'main',index:0}]]},
    'Precisa gravar?':{main:[[{node:'Gravar compromisso',type:'main',index:0}],[{node:'Confirmar envio',type:'main',index:0}]]},
    'Gravar compromisso':{main:[[{node:'Confirmar envio',type:'main',index:0}]]}
  },settings:{executionOrder:'v1',timezone:'America/Sao_Paulo',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false},pinData:{},tags:[]};
fs.writeFileSync(path.join(root,'integrations/n8n/agracta-google-agenda.json'),JSON.stringify(workflow,null,2)+'\n');
console.log('Workflow gerado: integrations/n8n/agracta-google-agenda.json');
