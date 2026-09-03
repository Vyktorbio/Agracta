/* ============================================================================
   AtivosEN — nome do ingrediente ativo em inglês, para a folha de gráficos
   ----------------------------------------------------------------------------
   A prancha já tem o botão PT/EN, e ele traduzia rótulos de variável. O nome do
   produto continuava em português: uma figura em inglês para o patrocinador saía
   com "tebuconazol" no eixo, quando o mundo inteiro escreve "tebuconazole".

   POR QUE DICIONÁRIO E NÃO REGRA

   As terminações parecem regulares — -ol vira -ole, -ina vira -in, -ato vira
   -ate — e é justamente por isso que a regra é perigosa: ela acerta muito e erra
   calada. "cipermetrina" não é "cipermetrin", é "cypermethrin": muda o c, o f e
   o t no meio da palavra. "mancozebe" não é "mancozebe", é "mancozeb".
   "clorotalonil" é "chlorothalonil". Um nome de ativo errado num relatório que
   vai para o registrante é erro caro, e erro que ninguém revisa porque parece
   plausível.

   Então: TABELA. O que não está nela sai como está, em português, e quem chama
   sabe disso pelo campo `traduzido`. Nome não traduzido é visivelmente
   português; nome inventado passa por inglês.

   NOMES CIENTÍFICOS NÃO SE TRADUZEM. Os dois ativos mais frequentes do catálogo
   brasileiro são Metarhizium anisopliae e Beauveria bassiana — binômios latinos,
   iguais nas duas línguas. Traduzi-los seria estragá-los.

   Fonte dos nomes: ISO common names (a mesma norma que o MAPA usa em português).
   ============================================================================ */
(function(raiz){
  'use strict';
  var VERSION='1.0.0';

  /* pt -> en, nome comum ISO. Chave em minúsculas e sem acento (ver `chave`). */
  var PT_EN={
    /* ---- fungicidas ---- */
    'mancozebe':'mancozeb','azoxistrobina':'azoxystrobin','clorotalonil':'chlorothalonil',
    'tebuconazol':'tebuconazole','protioconazol':'prothioconazole','ciproconazol':'cyproconazole',
    'trifloxistrobina':'trifloxystrobin','difenoconazol':'difenoconazole',
    'piraclostrobina':'pyraclostrobin','epoxiconazol':'epoxiconazole','fluxapiroxade':'fluxapyroxad',
    'bixafem':'bixafen','benzovindiflupir':'benzovindiflupyr','carbendazim':'carbendazim',
    'tiofanato-metilico':'thiophanate-methyl','metalaxil-m':'metalaxyl-M','metalaxil':'metalaxyl',
    'oxicloreto de cobre':'copper oxychloride','hidroxido de cobre':'copper hydroxide',
    'oxido cuproso':'cuprous oxide','sulfato de cobre':'copper sulfate','enxofre':'sulfur',
    'captana':'captan','iprodiona':'iprodione','procimidona':'procymidone','boscalida':'boscalid',
    'fluazinam':'fluazinam','mandipropamida':'mandipropamid','ciazofamida':'cyazofamid',
    'famoxadona':'famoxadone','cimoxanil':'cymoxanil','metconazol':'metconazole',
    'flutriafol':'flutriafol','picoxistrobina':'picoxystrobin','fenpropimorfe':'fenpropimorph',
    'propiconazol':'propiconazole','tetraconazol':'tetraconazole','miclobutanil':'myclobutanil',
    'triadimenol':'triadimenol','fluopiram':'fluopyram','pidiflumetofem':'pydiflumetofen',
    'isoflucipram':'isoflucypram','mefentrifluconazol':'mefentrifluconazole',
    'tiram':'thiram','fludioxonil':'fludioxonil','clorotalonila':'chlorothalonil',
    'azoxistrobin':'azoxystrobin','oxatiapiprolina':'oxathiapiprolin','ametoctradina':'ametoctradin',
    'dimetomorfe':'dimethomorph','folpete':'folpet','pirimetanil':'pyrimethanil',
    'ciprodinil':'cyprodinil','fenamidona':'fenamidone','propamocarbe':'propamocarb',
    'triflumizol':'triflumizole','tiabendazol':'thiabendazole','carboxina':'carboxin',
    /* ---- herbicidas ---- */
    'glifosato':'glyphosate','atrazina':'atrazine','2,4-d':'2,4-D','picloram':'picloram',
    'diurom':'diuron','flumioxazina':'flumioxazin','sulfentrazona':'sulfentrazone',
    'cletodim':'clethodim','fluroxipir-meptilico':'fluroxypyr-meptyl','fluroxipir':'fluroxypyr',
    'glufosinato':'glufosinate','paraquate':'paraquat','ametrina':'ametryn',
    'clomazona':'clomazone','imazetapir':'imazethapyr','imazapique':'imazapic','imazapir':'imazapyr',
    'nicossulfurom':'nicosulfuron','mesotriona':'mesotrione','tembotriona':'tembotrione',
    's-metolacloro':'S-metolachlor','metolacloro':'metolachlor','acetocloro':'acetochlor',
    'trifluralina':'trifluralin','haloxifope-p-metilico':'haloxyfop-P-methyl',
    'setoxidim':'sethoxydim','fomesafem':'fomesafen','lactofem':'lactofen','bentazona':'bentazone',
    'diclosulam':'diclosulam','clorimurom-etilico':'chlorimuron-ethyl',
    'metsulfurom-metilico':'metsulfuron-methyl','saflufenacil':'saflufenacil','diquate':'diquat',
    'msma':'MSMA','2,4-db':'2,4-DB','quizalofope-p-etilico':'quizalofop-P-ethyl',
    'tepraloxidim':'tepraloxydim','hexazinona':'hexazinone','tebutiurom':'tebuthiuron',
    'isoxaflutol':'isoxaflutole','indaziflam':'indaziflam','carfentrazona-etilica':'carfentrazone-ethyl',
    'oxifluorfem':'oxyfluorfen','pendimetalina':'pendimethalin','linurom':'linuron',
    'simazina':'simazine','terbutilazina':'terbuthylazine','flumetsulam':'flumetsulam',
    'triclopir':'triclopyr','dicamba':'dicamba','glifosato-sal de isopropilamina':'glyphosate-isopropylammonium',
    'glifosato-sal de amonio':'glyphosate-ammonium','glufosinato - sal de amonio':'glufosinate-ammonium',
    'glufosinato-sal de amonio':'glufosinate-ammonium','amicarbazona':'amicarbazone',
    'sulfometurom-metilico':'sulfometuron-methyl','iodossulfurom-metilico':'iodosulfuron-methyl',
    'imazaquim':'imazaquin','cloransulam-metilico':'cloransulam-methyl','propanil':'propanil',
    'clefoxidim':'clefoxydim','profoxidim':'profoxydim','penoxsulam':'penoxsulam',
    'bispiribaque-sodico':'bispyribac-sodium','piroxsulam':'pyroxsulam','halauxifem':'halauxifen',
    /* ---- inseticidas e acaricidas ---- */
    'acetamiprido':'acetamiprid','fipronil':'fipronil','imidacloprido':'imidacloprid',
    'bifentrina':'bifenthrin','acefato':'acephate','tiametoxam':'thiamethoxam',
    'clorantraniliprole':'chlorantraniliprole','lambda-cialotrina':'lambda-cyhalothrin',
    'gama-cialotrina':'gamma-cyhalothrin','deltametrina':'deltamethrin','cipermetrina':'cypermethrin',
    'zeta-cipermetrina':'zeta-cypermethrin','alfa-cipermetrina':'alpha-cypermethrin',
    'clorpirifos':'chlorpyrifos','abamectina':'abamectin','espinosade':'spinosad',
    'espinetoram':'spinetoram','tiodicarbe':'thiodicarb','metomil':'methomyl',
    'carbofurano':'carbofuran','terbufos':'terbufos','malationa':'malathion',
    'dimetoato':'dimethoate','teflubenzurom':'teflubenzuron','lufenurom':'lufenuron',
    'novalurom':'novaluron','indoxacarbe':'indoxacarb','flubendiamida':'flubendiamide',
    'ciantraniliprole':'cyantraniliprole','sulfoxaflor':'sulfoxaflor','etiprole':'ethiprole',
    'piriproxifem':'pyriproxyfen','buprofezina':'buprofezin','espiromesifeno':'spiromesifen',
    'azadiractina':'azadirachtin','profenofos':'profenofos','permetrina':'permethrin',
    'beta-ciflutrina':'beta-cyfluthrin','esfenvalerato':'esfenvalerate',
    'fenpropatrina':'fenpropathrin','piridabem':'pyridaben','espirodiclofeno':'spirodiclofen',
    'etoxazol':'etoxazole','clofentezina':'clofentezine','propargito':'propargite',
    'clorfenapir':'chlorfenapyr','emamectina':'emamectin','benzoato de emamectina':'emamectin benzoate',
    'metoxifenozida':'methoxyfenozide','tebufenozida':'tebufenozide','triflumurom':'triflumuron',
    'diafentiurom':'diafenthiuron','ciflumetofem':'cyflumetofen','ciromazina':'cyromazine',
    'imidacloprido + tiodicarbe':'imidacloprid + thiodicarb','tiacloprido':'thiacloprid',
    'dinotefurano':'dinotefuran','flupiradifurona':'flupyradifurone','broflanilida':'broflanilide',
    'ciclaniliprole':'cyclaniliprole','tetraniliprole':'tetraniliprole',
    /* ---- nematicidas ---- */
    'fluensulfona':'fluensulfone','fluazaindolizina':'fluazaindolizine','cadusafos':'cadusafos',
    /* ---- reguladores de crescimento e afins ---- */
    'etefom':'ethephon','mepiquate':'mepiquat','cloreto de mepiquate':'mepiquat chloride',
    'cloreto de clormequate':'chlormequat chloride','tidiazurom':'thidiazuron',
    'acido giberelico':'gibberellic acid','paclobutrazol':'paclobutrazol',
    'trinexapaque-etilico':'trinexapac-ethyl','cloreto de colina':'choline chloride',
    'acido indolbutirico':'indole butyric acid','acido naftalenoacetico':'naphthaleneacetic acid',
    'acido indolacetico':'indole acetic acid','metilciclopropeno':'1-methylcyclopropene',
    /* ---- lacunas vistas rodando a tabela contra o catálogo inteiro ---- */
    'dibrometo de diquate':'diquat dibromide','triclopir-butotilico':'triclopyr-butotyl',
    '2,4-d-dimetilamina':'2,4-D-dimethylammonium','2,4-d-trietanolamina':'2,4-D-triethanolamine',
    'picloram-trietanolamina':'picloram-triethanolamine','diflubenzurom':'diflubenzuron',
    'aminopiralide':'aminopyralid','metribuzim':'metribuzin','fosfeto de aluminio':'aluminium phosphide',
    'fosfeto de magnesio':'magnesium phosphide','ciclobutrifluram':'cyclobutrifluram',
    'clotianidina':'clothianidin','pirimicarbe':'pirimicarb','oxamil':'oxamyl',
    'espiroxamina':'spiroxamine','ciproconazol + tiametoxam':'cyproconazole + thiamethoxam',
    'fenoxaprope-p-etilico':'fenoxaprop-P-ethyl','cletodim + fenoxaprope-p-etilico':'clethodim + fenoxaprop-P-ethyl',
    'sulfluramida':'sulfluramid','hidrametilnona':'hydramethylnon','bacillus thuringiensis':'Bacillus thuringiensis'
  };

  var EN_SET=null;
  function chave(s){
    s=String(s==null?'':s);
    return (s.normalize?s.normalize('NFD').replace(/[̀-ͯ]/g,''):s)
      .toLowerCase().replace(/\s+/g,' ').trim();
  }

  /* Binômio latino: Gênero (maiúscula) + epíteto (minúscula). Igual nas duas
     línguas — devolver "traduzido" aqui seria mentira, e traduzir seria pior. */
  function ehCientifico(nome){
    return /^[A-Z][a-z]+ [a-z]{3,}/.test(String(nome==null?'':nome).trim());
  }

  /* Sufixos de sal e éster que o MAPA escreve por extenso. Traduzir só a base e
     recolar o sufixo evita ter uma entrada por combinação — e evita o oposto,
     que é deixar o produto inteiro sem tradução por causa do sufixo. */
  var SUFIXOS=[
    [/\s*-?\s*sal de amonio$/,'-ammonium'],
    [/\s*-?\s*sal de isopropilamina$/,'-isopropylammonium'],
    [/\s*-?\s*sal de potassio$/,'-potassium'],
    [/\s*-?\s*sal de sodio$/,'-sodium'],
    [/\s*-?\s*sal de dimetilamina$/,'-dimethylammonium'],
    [/\s*-?\s*sal de colina$/,'-choline'],
    [/\s*-?\s*sal de trolamina$/,'-trolamine']
  ];

  /* Devolve {nome, traduzido, motivo}. NUNCA inventa: sem entrada na tabela, o
     nome volta em português e `traduzido` é falso, para quem chama poder marcar
     a folha em vez de apresentar português como se fosse inglês. */
  function emIngles(nome){
    var orig=String(nome==null?'':nome).trim();
    if(!orig) return {nome:'', traduzido:false, motivo:'vazio'};
    if(ehCientifico(orig)) return {nome:orig, traduzido:true, cientifico:true,
                                   motivo:'nome científico — igual nas duas línguas'};
    var k=chave(orig);
    if(PT_EN[k]) return {nome:PT_EN[k], traduzido:true, motivo:''};
    /* O arquivo do MAPA às vezes já traz o nome em inglês (Benzovindiflupyr,
       Pidiflumetofen). Devolvê-lo como "sem tradução" faria a folha avisar de um
       problema que não existe. */
    if(!EN_SET) { EN_SET={}; Object.keys(PT_EN).forEach(function(x){ EN_SET[chave(PT_EN[x])]=PT_EN[x]; }); }
    if(EN_SET[k]) return {nome:EN_SET[k], traduzido:true, jaIngles:true, motivo:'o registro já traz o nome em inglês'};
    for(var i=0;i<SUFIXOS.length;i++){
      if(SUFIXOS[i][0].test(k)){
        var base=k.replace(SUFIXOS[i][0],'');
        if(PT_EN[base]) return {nome:PT_EN[base]+SUFIXOS[i][1], traduzido:true, motivo:''};
      }
    }
    return {nome:orig, traduzido:false, motivo:'não está na tabela de nomes ISO'};
  }

  /* Texto com vários ativos ("A (grupo) (400 g/L) + B (grupo) (100 g/L)"):
     traduz cada nome e devolve também o que ficou sem tradução, para a folha
     poder avisar em vez de calar. Depende de DoseCore.ativosDe para separar. */
  function textoEmIngles(texto, DoseCore){
    var out={texto:String(texto==null?'':texto), traduzidos:[], semTraducao:[]};
    if(!texto || !DoseCore || !DoseCore.ativosDe) return out;
    var ativos=[];
    try{ ativos=DoseCore.ativosDe(texto)||[]; }catch(e){ return out; }
    var t=out.texto;
    ativos.forEach(function(a){
      var r=emIngles(a.ia);
      if(r.traduzido && r.nome!==a.ia){
        t=t.split(a.ia).join(r.nome);
        out.traduzidos.push({pt:a.ia, en:r.nome});
      } else if(!r.traduzido){
        out.semTraducao.push(a.ia);
      }
    });
    out.texto=t;
    return out;
  }

  var API={VERSION:VERSION, chave:chave, ehCientifico:ehCientifico,
           emIngles:emIngles, textoEmIngles:textoEmIngles, TABELA:PT_EN};
  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.AtivosEN=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
