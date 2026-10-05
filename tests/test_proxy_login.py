# -*- coding: utf-8 -*-
"""Login no proxy NDVI/clima/solo: só membro ativo do Agracta gasta a cota do Sentinel
   e as chaves da Ecowitt. Antes bastava saber o endereço.
   Rodar: python3 tests/test_proxy_login.py"""
import sys, os, io, json, time, base64, hashlib, shutil, subprocess, tempfile, threading
import importlib.util, urllib.request, urllib.error
RAIZ=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec=importlib.util.spec_from_file_location('proxy_login', os.path.join(RAIZ,'ndvi-proxy.py'))
m=importlib.util.module_from_spec(spec)
sys.modules['proxy_login']=m
spec.loader.exec_module(m)

falhas=[0]; passes=[0]
def eq(a,b,nome):
    ok=(a==b)
    if ok: passes[0]+=1; print('  ok    '+nome)
    else:  falhas[0]+=1; print('  FALHA '+nome+'  (obtido %r, esperado %r)'%(a,b))
def check(c,nome): eq(bool(c),True,nome)
def motivo(f):
    try: f(); return 'passou'
    except m.LoginRecusado as e: return e.motivo

# Chave RSA de teste (1024 bits), só para este teste assinar tokens.
N=0x8c2de533cf47dd445f0e25c194051780b14663d33c36a3227d4ac08e7c8e973170d7620f43d735ae3e9f5efaef91bc7799b1fd2fc08e2f7541d6f51e08b77547d36f0ac3ac1bac003f81cf61a10dbf905af9e0f1ad98bf66a5d661c3c78fcfb441ef73429c1346d37bdc69979dab8c9216f4122f619a9e4f4421ff12b45ee333
D=0x7baa2181cb6342b886831c9be1d17c227441fcdee547ee330705634a50681ac9eb1a97cf8fb1d4119bfd4cf56353d6484cb6d0fdc789a82471a909252ddb6b02587e3bfbdb10aa9365fb8dec659a6b09f89bc89a6395ae44276aa0a24bfda10db3d76903c718e08a114a2ac4527ba07e6bed12b89551069986da443988345101
E=65537
CHAVES={'k1':(N,E)}
PROJ=m.FIREBASE_PROJECT_ID
AGORA=1790000000

def b64(b):
    if isinstance(b,str): b=b.encode()
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def assinar(msg, d=D, n=N):
    k=(n.bit_length()+7)//8
    t=bytes.fromhex('3031300d060960864801650304020105000420')+hashlib.sha256(msg).digest()
    em=b'\x00\x01'+b'\xff'*(k-len(t)-3)+b'\x00'+t
    return pow(int.from_bytes(em,'big'),d,n).to_bytes(k,'big')
def token(extra=None, cab=None, tirar=()):
    c={'alg':'RS256','kid':'k1','typ':'JWT'}; c.update(cab or {})
    p={'iss':'https://securetoken.google.com/'+PROJ,'aud':PROJ,'sub':'uid123',
       'email':'tecnico@lab.com','email_verified':True,
       'iat':AGORA-60,'exp':AGORA+3000,'auth_time':AGORA-600}
    p.update(extra or {})
    for k in tirar: p.pop(k,None)
    a=b64(json.dumps(c))+'.'+b64(json.dumps(p))
    return a+'.'+b64(assinar(a.encode()))

print('\nRS256 conferido na mão (RFC 8017)')
msg=b'cabecalho.corpo'
check(m.rs256_confere(N,E,msg,assinar(msg)),'assinatura certa confere')
check(not m.rs256_confere(N,E,b'cabecalho.corpO',assinar(msg)),'uma letra trocada na mensagem não confere')
check(not m.rs256_confere(N,E,msg,assinar(msg)[1:]),'assinatura com tamanho errado não confere')
check(not m.rs256_confere(N,E,msg,(N+1).to_bytes(128,'big')),'assinatura maior que o módulo não confere')
openssl=shutil.which('openssl')
if openssl:
    # Conferência independente: a assinatura sai do OpenSSL, não do assinar() acima.
    tmp=tempfile.mkdtemp()
    try:
        chave=os.path.join(tmp,'k.pem'); dado=os.path.join(tmp,'m.txt'); sig=os.path.join(tmp,'s.bin')
        io.open(dado,'wb').write(b'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0')
        subprocess.check_call([openssl,'genrsa','-out',chave,'2048'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.check_call([openssl,'dgst','-sha256','-sign',chave,'-out',sig,dado])
        mod=subprocess.check_output([openssl,'rsa','-in',chave,'-noout','-modulus'],stderr=subprocess.DEVNULL).decode().strip()
        n2=int(mod.split('=',1)[1],16)
        s2=io.open(sig,'rb').read()
        check(m.rs256_confere(n2,65537,io.open(dado,'rb').read(),s2),'assinatura feita pelo OpenSSL confere (2048 bits)')
        check(not m.rs256_confere(n2,65537,b'outra coisa',s2),'e não confere para outra mensagem')
    finally:
        shutil.rmtree(tmp,ignore_errors=True)
else:
    print('  (sem openssl neste computador: conferência independente pulada)')

print('\nToken do Firebase: tudo o que a documentação manda conferir')
dec=m.verificar_token(token(),AGORA,CHAVES)
eq(dec['email'],'tecnico@lab.com','token bom devolve o e-mail')
eq(motivo(lambda: m.verificar_token(token({'exp':AGORA-500}),AGORA,CHAVES)),'token_invalido','token vencido é recusado')
eq(motivo(lambda: m.verificar_token(token({'exp':AGORA-60}),AGORA,CHAVES)),'passou','vencido há 1 min passa (folga de relógio)')
eq(motivo(lambda: m.verificar_token(token({'aud':'outro-projeto'}),AGORA,CHAVES)),'token_invalido','token de outro projeto Firebase é recusado')
eq(motivo(lambda: m.verificar_token(token({'iss':'https://securetoken.google.com/outro'}),AGORA,CHAVES)),'token_invalido','emissor errado é recusado')
eq(motivo(lambda: m.verificar_token(token({'iat':AGORA+3600}),AGORA,CHAVES)),'token_invalido','emitido no futuro é recusado')
eq(motivo(lambda: m.verificar_token(token({'auth_time':AGORA+3600}),AGORA,CHAVES)),'token_invalido','login no futuro é recusado')
eq(motivo(lambda: m.verificar_token(token({'sub':''}),AGORA,CHAVES)),'token_invalido','sem usuário (sub) é recusado')
eq(motivo(lambda: m.verificar_token(token(tirar=('email',)),AGORA,CHAVES)),'nao_membro','sem e-mail não há como achar o cadastro')
eq(motivo(lambda: m.verificar_token(token(cab={'kid':'k9'}),AGORA,CHAVES)),'token_invalido','chave desconhecida é recusada')
eq(motivo(lambda: m.verificar_token(token(cab={'alg':'none'}),AGORA,CHAVES)),'token_invalido','alg "none" é recusado')
eq(motivo(lambda: m.verificar_token(token(cab={'alg':'HS256'}),AGORA,CHAVES)),'token_invalido','alg HS256 (chave pública como segredo) é recusado')
bom=token(); cab,corpo,sig=bom.split('.')
falso=json.loads(base64.urlsafe_b64decode(corpo+'='*(-len(corpo)%4))); falso['email']='admin@x.com'
eq(motivo(lambda: m.verificar_token(cab+'.'+b64(json.dumps(falso))+'.'+sig,AGORA,CHAVES)),'token_invalido','trocar o e-mail sem reassinar é recusado')
eq(motivo(lambda: m.verificar_token('abc',AGORA,CHAVES)),'token_invalido','lixo é recusado sem explodir')
eq(motivo(lambda: m.verificar_token('a.b.c',AGORA,CHAVES)),'token_invalido','três pedaços ilegíveis também')

print('\nCadastro: membro ativo, administrador e cache')
lidos=[]
def ler_ativo(email,tk): lidos.append(email); return {'fields':{'active':{'booleanValue':True}}}
def ler_inativo(email,tk): lidos.append(email); return {'fields':{'active':{'booleanValue':False}}}
def ler_nada(email,tk): lidos.append(email); return None
def ler_quebra(email,tk): lidos.append(email); raise OSError('Google fora do ar')
m._membros.clear()
check(m.membro_ativo('a@lab.com','t',AGORA,ler_ativo),'active: true é membro')
check(not m.membro_ativo('b@lab.com','t',AGORA,ler_inativo),'active: false não é')
check(not m.membro_ativo('c@lab.com','t',AGORA,ler_nada),'sem cadastro (403/404) não é')
check(m.membro_ativo('Vyktorbio@gmail.com','t',AGORA,ler_quebra),'administrador passa sem ler cadastro')
eq(lidos,['a@lab.com','b@lab.com','c@lab.com'],'administrador nem consulta o Firestore')
del lidos[:]
check(m.membro_ativo('a@lab.com','t',AGORA+300,ler_quebra),'sim guardado por 10 min: não relê')
eq(lidos,[],'dentro dos 10 min, nenhuma leitura')
check(m.membro_ativo('a@lab.com','t',AGORA+700,ler_quebra),'Google fora do ar depois: vale o sim recente')
eq(motivo(lambda: m.membro_ativo('d@lab.com','t',AGORA,ler_quebra)),'indisponivel','sem sim anterior e Google fora: indisponível (não libera)')
check(not m.membro_ativo('b@lab.com','t',AGORA+30,ler_ativo),'não guardado por 1 min')
check(m.membro_ativo('b@lab.com','t',AGORA+90,ler_ativo),'depois de 1 min, reativação vale')

print('\nModo: transição, exigido, livre')
os.environ.pop('EXIGIR_LOGIN',None)
host0=m.HOST
m.HOST='0.0.0.0'
antes=int(time.mktime(time.strptime('2026-10-01','%Y-%m-%d')))
depois=int(time.mktime(time.strptime('2026-10-06','%Y-%m-%d')))
eq(m.modo_login(antes),'transicao','na nuvem, até a data de corte: transição')
eq(m.modo_login(depois),'exigir','depois da data: exigido sem ninguém mexer no Render')
os.environ['EXIGIR_LOGIN']='1'; eq(m.modo_login(antes),'exigir','EXIGIR_LOGIN=1 exige já')
os.environ['EXIGIR_LOGIN']='0'; eq(m.modo_login(depois),'livre','EXIGIR_LOGIN=0 libera (emergência)')
os.environ.pop('EXIGIR_LOGIN',None)
m.HOST='127.0.0.1'; eq(m.modo_login(depois),'livre','proxy no próprio computador: livre')
m.HOST='0.0.0.0'

print('\nautorizar(): o que cada pedido recebe')
m.chaves_google=lambda kid=None,agora=None: CHAVES
m._ler_membro=lambda email,tk: {'fields':{'active':{'booleanValue':email=='tecnico@lab.com'}}}
m._membros.clear()
os.environ['EXIGIR_LOGIN']='1'
eq(m.autorizar(None,'/dates',AGORA),(401,'sem_token'),'sem login: 401')
eq(m.autorizar('Bearer '+token(),'/dates',AGORA),None,'membro ativo: segue')
eq(m.autorizar('bearer '+token(),'/dates',AGORA),None,'"bearer" minúsculo também')
eq(m.autorizar('Bearer '+token({'email':'intruso@x.com'}),'/clima',AGORA),(403,'nao_membro'),'login de fora do Agracta: 403')
eq(m.autorizar('Bearer '+token({'exp':AGORA-900}),'/stats',AGORA),(401,'token_invalido'),'token vencido: 401 (o app renova e tenta de novo)')
eq(m.autorizar(None,'/health',AGORA),None,'/health é aberto (acordar o servidor)')
eq(m.autorizar(None,'/solo/legenda',AGORA),None,'/solo/legenda é aberta (imagem pública da Embrapa)')
velho=m.chaves_google
def sem_google(kid=None,agora=None): raise OSError('sem rede')
m.chaves_google=sem_google
eq(m.autorizar('Bearer '+token(),'/dates',AGORA),(503,'indisponivel'),'sem as chaves do Google: 503, nunca libera')
m.chaves_google=velho
def explode(*a): raise TypeError('defeito')
v2=m.verificar_token; m.verificar_token=explode
eq(m.autorizar('Bearer '+token(),'/dates',AGORA),(503,'indisponivel'),'defeito na conferência não vira porta aberta')
m.verificar_token=v2
os.environ.pop('EXIGIR_LOGIN',None)
antes_c=dict(m._contagem)
eq(m.autorizar(None,'/dates',antes),None,'na transição, sem login ainda passa')
eq(m._contagem['sem_token'],antes_c['sem_token']+1,'mas é contado para o /health')

print('\nServidor de verdade: cabeçalhos e respostas')
os.environ['EXIGIR_LOGIN']='1'
srv=m.ThreadingHTTPServer(('127.0.0.1',0),m.H)
porta=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
base='http://127.0.0.1:%d'%porta
def pedir(caminho,metodo='GET',cab=None):
    req=urllib.request.Request(base+caminho,method=metodo,headers=cab or {})
    try:
        with urllib.request.urlopen(req,timeout=10) as r:
            return r.status,dict(r.headers),r.read()
    except urllib.error.HTTPError as e:
        return e.code,dict(e.headers),e.read()
try:
    st,h,corpo=pedir('/dates?bbox=1,2,3,4&from=2026-01-01&to=2026-02-01',cab={'Origin':'https://www.agracta.com.br'})
    eq(st,401,'GET sem login: 401')
    j=json.loads(corpo)
    eq(j.get('login'),'sem_token','resposta diz o motivo (o app mostra a mensagem)')
    check('Entre no Agracta' in j.get('error',''),'mensagem em português para a tela')
    eq(h.get('Access-Control-Allow-Origin'),'https://www.agracta.com.br','o 401 também leva CORS (senão o app só vê "falha de rede")')
    st,h,_=pedir('/dates',metodo='OPTIONS',cab={'Origin':'https://www.agracta.com.br',
        'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'})
    eq(st,204,'preflight (OPTIONS) não pede login')
    permitidos=[x.strip().lower() for x in (h.get('Access-Control-Allow-Headers') or '').split(',')]
    check('authorization' in permitidos,'preflight libera o cabeçalho Authorization pelo nome ("*" não cobre)')
    check(int(h.get('Access-Control-Max-Age') or 0)>=600,'preflight guardado pelo navegador (menos idas ao servidor)')
    st,h,corpo=pedir('/stats',cab={'Authorization':'Bearer '+token({'iat':int(time.time())-60,'exp':int(time.time())+3000,'auth_time':int(time.time())-600})})
    eq(st,400,'com login de membro, o pedido chega à rota (aqui falta parâmetro: 400, não 401)')
    check('geom' in json.loads(corpo).get('error',''),'e a rota responde normalmente')
    st,h,corpo=pedir('/health')
    eq(st,200,'/health responde sem login')
    lg=json.loads(corpo).get('login') or {}
    eq(lg.get('modo'),'exigir','/health mostra o modo de login')
    check(isinstance(lg.get('contagem'),dict) and lg['contagem'].get('sem_token',0)>=1,'e quantos pedidos chegaram sem login')
    st,h,corpo=pedir('/index',metodo='POST',cab={'Content-Type':'application/json'})
    eq(st,401,'POST também exige login')
finally:
    srv.shutdown()
    os.environ.pop('EXIGIR_LOGIN',None)
    m.HOST=host0

print('\n%d ok, %d falha(s)'%(passes[0],falhas[0]))
sys.exit(1 if falhas[0] else 0)
