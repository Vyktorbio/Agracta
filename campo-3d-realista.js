/* campo-3d-realista.js — o Campo Vivo da exportação com cara de campo de verdade.
 *
 * Carregado SÓ quando a exportação pede o estilo realista (campo-3d-exportar.js),
 * junto com vendor/three-agracta.min.js (WebGL). Sem WebGL, quem chama cai no
 * desenho esquemático de sempre.
 *
 * O que é DADO e o que é CENÁRIO — a mesma separação da tela:
 *   - a POSIÇÃO de cada parcela é a da grade do estudo (mesmos SX/SY/PW/PL);
 *   - a COR da folhagem é a faixa da escala da variável (corDe(fracaoRuim)),
 *     no instante pedido, pelo mesmo valorEm() da tela;
 *   - a ALTURA do bloco é o VALOR, na régua da tela (AgCampo3D.alturaDe:
 *     ampliada ou inteira), e o quadro desenha essa régua ao lado;
 *   - parcela SEM AVALIAÇÃO fica sem planta nenhuma: solo nu e contorno
 *     tracejado. Não é zero, é vazio.
 * Todo o resto — formato das folhas, solo, gramado, luz — é ilustração, e a
 * legenda do quadro diz isso.
 *
 * A ALTURA JÁ FOI IGUAL PARA TODOS, e de propósito: num campo de verdade a
 * doença muda a cor da folha, não faz a planta crescer. Quem usa pediu o
 * contrário ("só muda a cor, o retângulo da parcela não cresce para cima"):
 * no vídeo a diferença entre tratamentos sumia, e a tela do Agracta, onde a
 * coluna cresce, contava uma história que o vídeo não contava. O bloco agora
 * é a coluna da tela vestida de folhagem — a mesma conta, a mesma régua.
 *
 * Tudo é determinístico: a mesma parcela tem as mesmas plantas em todo quadro.
 */
(function (w) {
  'use strict';

  /* Altura de um bloco CHEIO (o topo da régua), no tamanho da parcela: 1,2 ×
     o lado comprido. Mais alto, um bloco cheio na frente esconde o topo da
     fileira de trás nesta câmera (38°); mais baixo, a diferença volta a ser
     sutil, que foi a queixa. */
  function alturaCheia(g) { return Math.max(g.PW, g.PL) * 1.6; }
  /* A fração da régua (AgCampo3D.alturaDe, já com o piso) vira altura. */
  function alturaDoBloco(f, hr) { return Math.max(0.02, Math.max(0, Math.min(1, +f || 0)) * hr); }

  function semente(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function sorteio(seed) { var x = seed || 1; return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }

  /* ---------------------------------------------------------- texturas ---
     Geradas aqui, em canvas: nenhum arquivo de imagem a mais, nada da rede. */
  function canvasTex(T, larg, alt, pintar, repete) {
    var c = w.document.createElement('canvas'); c.width = larg; c.height = alt;
    pintar(c.getContext('2d'), larg, alt);
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    if (repete) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repete[0], repete[1]); }
    t.anisotropy = 4;
    return t;
  }
  /* Terra: manchas largas e de pouco contraste. Grão fino e contrastado
     cintilava no vídeo (aliasing): de um quadro para o outro o pixel caía ora
     no grão claro, ora no escuro. */
  function texSolo(T) {
    var t = canvasTex(T, 512, 512, function (g, L, A) {
      g.fillStyle = '#7d5c3e'; g.fillRect(0, 0, L, A);
      var r = sorteio(11);
      for (var i = 0; i < 1400; i++) {
        var k = r(), s = 6 + r() * 16;
        g.fillStyle = k < 0.5 ? 'rgba(96,68,44,' + (0.10 + r() * 0.12) + ')' : 'rgba(140,108,78,' + (0.08 + r() * 0.12) + ')';
        g.beginPath(); g.ellipse(r() * L, r() * A, s, s * (0.6 + r() * 0.4), r() * 3, 0, 6.3); g.fill();
      }
    }, [3, 3]);
    t.anisotropy = 8;
    return t;
  }
  function texGrama(T) {
    return canvasTex(T, 512, 512, function (g, L, A) {
      g.fillStyle = '#76a24c'; g.fillRect(0, 0, L, A);
      var r = sorteio(23);
      for (var i = 0; i < 5000; i++) {
        var x = r() * L, y = r() * A, h = 3 + r() * 7, v = r();
        g.strokeStyle = v < 0.5 ? 'rgba(84,118,48,0.7)' : (v < 0.85 ? 'rgba(128,160,72,0.6)' : 'rgba(170,176,96,0.5)');
        g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - h); g.stroke();
      }
    }, [220, 220]);
  }
  /* Folha trifoliolada da soja, em tons claros: a cor de verdade vem da
     instância (a faixa do dado), a textura só dá forma, nervura e brilho. */
  function texFolha(T) {
    return canvasTex(T, 256, 256, function (g, L, A) {
      g.clearRect(0, 0, L, A);
      function foliolo(cx, cy, ang, comp, larg) {
        g.save(); g.translate(cx, cy); g.rotate(ang);
        var gr = g.createLinearGradient(0, -larg, 0, larg);
        gr.addColorStop(0, '#d9d9d9'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#c4c4c4');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(comp * 0.25, -larg, comp * 0.75, -larg * 0.9, comp, 0);
        g.bezierCurveTo(comp * 0.75, larg * 0.9, comp * 0.25, larg, 0, 0);
        g.fill();
        g.strokeStyle = 'rgba(120,120,120,0.55)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(comp * 0.95, 0); g.stroke();
        g.lineWidth = 1;
        for (var i = 1; i < 5; i++) {
          var x = comp * i / 5.2;
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + comp * 0.12, -larg * 0.55); g.moveTo(x, 0); g.lineTo(x + comp * 0.12, larg * 0.55); g.stroke();
        }
        g.restore();
      }
      /* pecíolo na base (x=0, meio da altura): a folha cresce para +x */
      g.strokeStyle = '#bdbdbd'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, A / 2); g.lineTo(L * 0.38, A / 2); g.stroke();
      foliolo(L * 0.38, A / 2, 0, L * 0.6, A * 0.17);
      foliolo(L * 0.4, A / 2, -1.05, L * 0.42, A * 0.14);
      foliolo(L * 0.4, A / 2, 1.05, L * 0.42, A * 0.14);
    });
  }

  /* ------------------------------------------------------------ a cena --- */
  function criar(cena, LARG, ALT) {
    var T = w.AgTHREE, g = cena.g, m = cena.m;
    var cv = w.document.createElement('canvas'); cv.width = LARG; cv.height = ALT;
    var ren;
    try { ren = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true }); }
    catch (e) { cv.width = cv.height = 0; return null; }
    ren.setPixelRatio(1); ren.setSize(LARG, ALT, false);
    ren.setClearColor(0x000000, 0);
    ren.outputColorSpace = T.SRGBColorSpace;
    ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFShadowMap;

    var sc = new T.Scene();
    sc.fog = null;

    /* coordenadas: x da grade -> X; y da grade -> -Z (assim o giro da tela e o
       daqui concordam: o T1 fica do mesmo lado nas duas vistas) */
    var larg = m.trats.length * g.SX - (g.SX - g.PW), alt = m.reps * g.SY - (g.SY - g.PL);
    var cx = larg / 2, cy = alt / 2;
    function X(x) { return x - cx; } function Z(y) { return -(y - cy); }

    /* luz: céu e chão fortes (a cor é o dado: nada de sombra engolindo a
       folha), sol morno e baixo só para dar volume */
    sc.add(new T.HemisphereLight(0xffffff, 0x4a3c28, 0.95));
    var sol = new T.DirectionalLight(0xfff3e0, 2.3);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1536, 1536);
    var raio = Math.max(larg, alt) * 0.75 + 6;
    sol.shadow.camera.left = -raio; sol.shadow.camera.right = raio; sol.shadow.camera.top = raio; sol.shadow.camera.bottom = -raio;
    sol.shadow.camera.near = 1; sol.shadow.camera.far = 400; sol.shadow.bias = -0.0015; sol.shadow.normalBias = 0.06;
    sc.add(sol); sc.add(sol.target);

    /* gramado até o horizonte */
    var grama = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.MeshLambertMaterial({ map: texGrama(T) }));
    grama.rotation.x = -Math.PI / 2; grama.position.y = -0.25; grama.receiveShadow = true; sc.add(grama);
    /* área do ensaio: solo preparado, com a margem do bloco */
    var mg = 1.6;
    var solo = new T.Mesh(new T.PlaneGeometry(larg + 2 * mg, alt + 2 * mg), new T.MeshLambertMaterial({ map: texSolo(T) }));
    solo.rotation.x = -Math.PI / 2; solo.position.y = 0.0;
    solo.material.polygonOffset = true; solo.material.polygonOffsetFactor = 1; solo.material.polygonOffsetUnits = 1; solo.receiveShadow = true; sc.add(solo);

    /* ---- a parcela é um BLOCO DE FOLHAGEM: folhas cobrindo topo e laterais
       de um volume do tamanho da parcela, sobre um miolo escuro que fecha os
       vãos. A ALTURA do bloco é o valor: HR é a de um bloco cheio (o topo da
       régua), e cada folha guarda só a FRAÇÃO da altura em que mora — o topo
       em 1, as laterais de 0 a 1. Quando o valor muda, as folhas sobem ou
       descem junto com o bloco, sem folha nascendo nem sumindo: no vídeo o
       bloco cresce liso, sem pipocar. As laterais são semeadas para o bloco
       cheio; mais baixo, elas só ficam mais juntas. ---- */
    var HR = alturaCheia(g), ENC = 0.06, DENS = 70, DENS_LADO = 50, TAM = 0.34, INS = 0.12;
    var plotInfo = [], totalF = 0;
    var bw = g.PW - 2 * ENC, bd = g.PL - 2 * ENC;
    var faces = [ /* [área, densidade, normal, gerador(u,v) -> [x, fração da altura, z]] */
      { a: bw * bd, d: DENS, n: [0, 1, 0], p: function (u, v) { return [u * bw, 1, v * bd]; } },
      { a: bw * HR, d: DENS_LADO, n: [0, 0, -1], p: function (u, v) { return [u * bw, v, 0]; } },
      { a: bw * HR, d: DENS_LADO, n: [0, 0, 1], p: function (u, v) { return [u * bw, v, bd]; } },
      { a: bd * HR, d: DENS_LADO, n: [-1, 0, 0], p: function (u, v) { return [0, v, u * bd]; } },
      { a: bd * HR, d: DENS_LADO, n: [1, 0, 0], p: function (u, v) { return [bw, v, u * bd]; } }
    ];
    /* QUANTAS FOLHAS. Cada parcela é semeada só até a altura MAIS ALTA que
       ela atinge no estudo (nas avaliações; entre duas delas o valor só anda
       entre as pontas): a que nunca passa de um quarto da régua não precisa de
       folha para o bloco cheio. A lateral fica igualmente densa no ponto mais
       alto de cada parcela, e o quadro custa perto do que custava com a altura
       fixa — semeando todas para o bloco cheio, o vídeo saía duas vezes e meia
       mais lento.
       E há um ORÇAMENTO: um ensaio grande (12 × 6 = 72 parcelas) ainda passaria
       das centenas de milhares de folhas, memória que o celular não tem para
       dar. Acima dele, cada face recebe proporcionalmente menos folhas; num
       ensaio grande cada parcela também sai menor no quadro, e a cobertura que
       o olho vê fica parecida. */
    var ORCAMENTO = 160000, daas = cena.daas || [];
    function maisAlta(p) {
      var f = 0;
      daas.forEach(function (t) { f = Math.max(f, w.AgCampoExportar.colunaEm(cena, p, t).f || 0); });
      return Math.max(0.12, Math.min(1, f));
    }
    var bruto = 0;
    m.grade.forEach(function (p) {
      var fa = maisAlta(p), ks = faces.map(function (f, i) { return f.a * f.d * (i ? fa : 1); });
      plotInfo.push({ p: p, ks: ks }); ks.forEach(function (k) { bruto += k; });
    });
    var corte = Math.min(1, ORCAMENTO / Math.max(1, bruto));
    plotInfo.forEach(function (pi) {
      pi.ks = pi.ks.map(function (k) { return Math.max(8, Math.round(k * corte)); });
      pi.ks.forEach(function (k) { totalF += k; });
    });
    var folhaGeo = new T.PlaneGeometry(1, 1); folhaGeo.rotateX(-Math.PI / 2); folhaGeo.translate(0.5, 0, 0);
    var folhaMat = new T.MeshStandardMaterial({ map: texFolha(T), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.68, metalness: 0 });
    var hasteGeo = new T.BoxGeometry(1, 1, 1); hasteGeo.translate(0.5, 0.5, 0.5);
    var hasteMat = new T.MeshLambertMaterial({ color: 0xffffff });
    var folhas = new T.InstancedMesh(folhaGeo, folhaMat, totalF);
    var hastes = new T.InstancedMesh(hasteGeo, hasteMat, plotInfo.length);
    /* A folhagem PROJETA sombra (no solo e no gramado) mas não RECEBE. Com
       altura igual para todos isso não importava; com o bloco crescendo, um
       bloco alto deitava sombra no topo do vizinho baixo e escurecia a cor
       dele — e a cor é o dado: um verde à sombra vira oliva. O volume de cada
       bloco continua vindo da luz nas faces (a lateral contra o sol é mais
       escura). */
    folhas.castShadow = true; folhas.receiveShadow = false; hastes.castShadow = true; hastes.receiveShadow = false;
    /* O campo inteiro está sempre no quadro, e as alturas mudam a cada quadro:
       sem recorte por esfera envolvente (que teria de ser refeita toda vez). */
    folhas.frustumCulled = false; hastes.frustumCulled = false;
    var mFolhas = new Float32Array(totalF * 16), mHastes = new Float32Array(plotInfo.length * 16);
    var jitter = new Float32Array(totalF * 3);
    /* fração da altura de cada folha e o quanto ela afunda no topo */
    var yFrac = new Float32Array(totalF), yRec = new Float32Array(totalF);
    var iF = 0, iH = 0, q = new T.Quaternion(), q2 = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sv = new T.Vector3(), mx = new T.Matrix4();
    var cima = new T.Vector3(0, 1, 0), nv = new T.Vector3(), eixo = new T.Vector3();
    plotInfo.forEach(function (pi) {
      var r = sorteio(semente(pi.p.chave)), x0 = pi.p.ti * g.SX + ENC, y0 = (pi.p.rep - 1) * g.SY + ENC;
      pi.f0 = iF; pi.h0 = iH;
      /* miolo: um pouco menor que o bloco, para as folhas o cobrirem; a
         altura dele acompanha a do bloco (ver pousar) */
      pi.miolo = { x: X(x0 + INS), z: Z(y0 + bd - INS), w: bw - 2 * INS, d: bd - 2 * INS };
      v.set(pi.miolo.x, 0, pi.miolo.z); q.identity(); sv.set(pi.miolo.w, HR - INS, pi.miolo.d);
      mx.compose(v, q, sv); mx.toArray(mHastes, iH * 16); iH++;
      faces.forEach(function (f, fi) {
        nv.set(f.n[0], f.n[1], -f.n[2]);
        for (var k = 0; k < pi.ks[fi]; k++) {
          var lp = f.p(r(), r()), fundo = r() * 0.16;
          /* a altura (y) fica de fora da matriz-base: pousar() a escreve */
          v.set(X(x0 + lp[0] - f.n[0] * fundo), 0, Z(y0 + lp[2] - f.n[2] * fundo));
          yFrac[iF] = lp[1]; yRec[iF] = f.n[1] * fundo;
          /* folha voltada para fora (normal da face), girada e inclinada ao acaso */
          q.setFromUnitVectors(cima, nv);
          eixo.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
          q2.setFromAxisAngle(eixo, (r() - 0.5) * 1.3); q.premultiply(q2);
          e.set(0, r() * Math.PI * 2, 0); q2.setFromEuler(e); q.multiply(q2);
          var tam = TAM * (0.75 + r() * 0.5);
          sv.set(tam * 1.2, 1, tam);
          mx.compose(v, q, sv); mx.toArray(mFolhas, iF * 16);
          var kk = 0.8 + r() * 0.34;
          jitter[iF * 3] = kk * (0.96 + r() * 0.08); jitter[iF * 3 + 1] = kk; jitter[iF * 3 + 2] = kk * (0.94 + r() * 0.1);
          iF++;
        }
      });
      pi.f1 = iF; pi.h1 = iH;
    });
    folhas.instanceMatrix.array.set(mFolhas); hastes.instanceMatrix.array.set(mHastes);
    var cor0 = new T.Color(1, 1, 1);
    for (var i2 = 0; i2 < iF; i2++) folhas.setColorAt(i2, cor0);
    for (i2 = 0; i2 < iH; i2++) hastes.setColorAt(i2, cor0);
    sc.add(folhas); sc.add(hastes);

    /* contorno tracejado das parcelas sem avaliação: traços largos e claros
       no chão (linha WebGL tem 1 px e some no solo escuro). Só aparecem
       quando a parcela está vazia. */
    var traco = new T.MeshBasicMaterial({ color: 0xf4ead6 }), tracoGeo = new T.PlaneGeometry(1, 1); tracoGeo.rotateX(-Math.PI / 2);
    plotInfo.forEach(function (pi) {
      var x0 = pi.p.ti * g.SX, y0 = (pi.p.rep - 1) * g.SY, grupo = new T.Group();
      var lados = [[x0, y0, x0 + g.PW, y0], [x0 + g.PW, y0, x0 + g.PW, y0 + g.PL], [x0 + g.PW, y0 + g.PL, x0, y0 + g.PL], [x0, y0 + g.PL, x0, y0]];
      lados.forEach(function (l) {
        var comp = Math.hypot(l[2] - l[0], l[3] - l[1]), n = Math.max(2, Math.round(comp / 0.5));
        for (var k = 0; k < n; k++) {
          var a0 = k / n, a1 = (k + 0.6) / n;
          var mxp = l[0] + (l[2] - l[0]) * (a0 + a1) / 2, myp = l[1] + (l[3] - l[1]) * (a0 + a1) / 2;
          var d = new T.Mesh(tracoGeo, traco);
          var horiz = Math.abs(l[3] - l[1]) < 1e-9;
          d.scale.set(horiz ? comp * 0.6 / n : 0.09, 1, horiz ? 0.09 : comp * 0.6 / n);
          d.position.set(X(mxp), 0.06, Z(myp));
          grupo.add(d);
        }
      });
      grupo.visible = false; sc.add(grupo); pi.linha = grupo;
    });

    /* ---- câmera: mesma direção do giro da tela, mais baixa, com perspectiva ---- */
    var cam = new T.PerspectiveCamera(30, LARG / ALT, 0.5, 3000);
    var ELEV = 38 * Math.PI / 180;
    var alvo = new T.Vector3(0, 0.3, 0);
    function posicionar(rot, dist) {
      var si = Math.sin(rot), co = Math.cos(rot);
      /* a tela olha ao longo de (si, co) na grade -> (si, 0, -co) aqui */
      var fx = si, fz = -co;
      cam.position.set(alvo.x - fx * dist * Math.cos(ELEV), alvo.y + dist * Math.sin(ELEV), alvo.z - fz * dist * Math.cos(ELEV));
      cam.up.set(0, 1, 0); cam.lookAt(alvo); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    }
    /* Sol atrás e à esquerda de quem olha, alto o bastante para não apagar a
       cor. FIXO no vídeo inteiro: acompanhando o giro, o mapa de sombra mudava
       a cada quadro e o chão das parcelas piscava. */
    function fixarSol(rot) {
      var si = Math.sin(rot), co = Math.cos(rot);
      var sx = -co * 0.55 + si * 0.45, sz = -si * 0.55 - co * 0.45;
      sol.position.set(sx * 120, 95, -sz * 120); sol.target.position.set(0, 0, 0);
      sol.target.updateMatrixWorld();
    }
    /* cantos do ensaio (com margem e a altura de um bloco cheio, mais a folga
       do título da régua) para o enquadramento */
    var cantos = [];
    [[-mg - 1.8, -mg - 1.8], [larg + mg, -mg - 1.8], [larg + mg, alt + mg], [-mg - 1.8, alt + mg]].forEach(function (c) {
      [0, HR * 1.3].forEach(function (z) { cantos.push(new T.Vector3(X(c[0]), z, Z(c[1]))); });
    });
    var tmp = new T.Vector3();
    function caixa() {
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      cantos.forEach(function (c) { tmp.copy(c).project(cam); x0 = Math.min(x0, tmp.x); x1 = Math.max(x1, tmp.x); y0 = Math.min(y0, tmp.y); y1 = Math.max(y1, tmp.y); });
      return { x0: x0, x1: x1, y0: y0, y1: y1 };
    }
    var area = null, distFixa = null, desloc = { x: 0, y: 0 };
    /* Distância FIXA para o vídeo inteiro (calculada no pior giro): o giro
       lento não pode virar zoom. */
    function enquadrar(ar, rots) {
      area = ar; cam.clearViewOffset();
      var pior = 0;
      rots.forEach(function (rot) {
        var lo = 2, hi = 2000;
        for (var k = 0; k < 40; k++) {
          var mid = (lo + hi) / 2; posicionar(rot, mid);
          var b = caixa(), wPx = (b.x1 - b.x0) / 2 * LARG, hPx = (b.y1 - b.y0) / 2 * ALT;
          if (wPx > ar.w || hPx > ar.h) lo = mid; else hi = mid;
        }
        pior = Math.max(pior, hi);
      });
      distFixa = pior;
      /* sol no giro do meio; near/far justos na distância: precisão de profundidade */
      fixarSol(rots[Math.floor(rots.length / 2)]);
      cam.near = Math.max(0.5, distFixa * 0.25); cam.far = distFixa * 4 + 200; cam.updateProjectionMatrix();
    }
    function ajustarCentro() {
      cam.clearViewOffset();
      var b = caixa();
      var cxPx = ((b.x0 + b.x1) / 2 + 1) / 2 * LARG, cyPx = (1 - (b.y0 + b.y1) / 2) / 2 * ALT;
      desloc.x = cxPx - (area.x + area.w / 2); desloc.y = cyPx - (area.y + area.h / 2);
      cam.setViewOffset(LARG, ALT, desloc.x, desloc.y, LARG, ALT);
      cam.updateProjectionMatrix();
    }

    var corT = new T.Color(), corJ = new T.Color();
    var arrF = folhas.instanceMatrix.array, arrH = hastes.instanceMatrix.array;
    /* Vazio: escala zero nas instâncias (some sem refazer a malha). */
    function esconder(pi) {
      for (var j = pi.f0 * 16; j < pi.f1 * 16; j++) arrF[j] = 0;
      for (j = pi.h0 * 16; j < pi.h1 * 16; j++) arrH[j] = 0;
    }
    function mostrar(pi) {
      arrF.set(mFolhas.subarray(pi.f0 * 16, pi.f1 * 16), pi.f0 * 16);
      arrH.set(mHastes.subarray(pi.h0 * 16, pi.h1 * 16), pi.h0 * 16);
    }
    /* O bloco na altura h: cada folha no seu andar (fração × h; o topo afunda
       um pouco, para ter volume) e o miolo do mesmo tamanho. Só a altura
       muda — posição, giro e tamanho da folha ficam onde nasceram. */
    function pousar(pi, h) {
      for (var j = pi.f0; j < pi.f1; j++) arrF[j * 16 + 13] = Math.max(0.02, yFrac[j] * h - yRec[j]);
      v.set(pi.miolo.x, 0, pi.miolo.z); q.identity(); sv.set(pi.miolo.w, Math.max(0.01, h - INS), pi.miolo.d);
      mx.compose(v, q, sv); mx.toArray(arrH, pi.h0 * 16);
    }
    function atualizar(t) {
      var mudouCor = false, mudouMat = false;
      plotInfo.forEach(function (pi) {
        var col = w.AgCampoExportar.colunaEm(cena, pi.p, t), vazio = !col.cor;
        if (vazio !== pi.vazio) {
          pi.vazio = vazio; pi.linha.visible = vazio; pi.h = null; pi.cor = null;
          if (vazio) esconder(pi); else mostrar(pi);
          mudouMat = true;
        }
        if (vazio) return;
        /* a fração é a da régua da tela (alturaDe), aqui na altura do bloco cheio */
        var h = alturaDoBloco(col.f, HR);
        if (pi.h === null || Math.abs(pi.h - h) > 1e-4) { pousar(pi, h); pi.h = h; mudouMat = true; }
        if (pi.cor !== col.cor) {
          corT.setStyle(col.cor);
          corJ.setRGB(corT.r * 0.45, corT.g * 0.45, corT.b * 0.45); hastes.setColorAt(pi.h0, corJ);
          for (var k = pi.f0; k < pi.f1; k++) {
            corJ.setRGB(Math.min(1, corT.r * jitter[k * 3]), Math.min(1, corT.g * jitter[k * 3 + 1]), Math.min(1, corT.b * jitter[k * 3 + 2]));
            folhas.setColorAt(k, corJ);
          }
          pi.cor = col.cor; mudouCor = true;
        }
      });
      if (mudouMat) { folhas.instanceMatrix.needsUpdate = true; hastes.instanceMatrix.needsUpdate = true; }
      if (mudouCor) { folhas.instanceColor.needsUpdate = true; hastes.instanceColor.needsUpdate = true; }
    }

    return {
      canvas: cv,
      /* altura de um bloco cheio: o topo da régua desenhada no quadro */
      hmax: HR,
      enquadrar: function (ar, rots) { enquadrar(ar, rots); },
      /* desenha o instante t no giro rot e devolve o canvas WebGL */
      desenhar: function (t, rot) {
        posicionar(rot, distFixa); ajustarCentro();
        atualizar(t);
        ren.render(sc, cam);
        return cv;
      },
      /* altura do horizonte na tela, para o céu 2D encostar no gramado */
      horizonte: function () {
        var dir = new T.Vector3(); cam.getWorldDirection(dir); dir.y = 0; dir.normalize();
        tmp.copy(cam.position).addScaledVector(dir, 2800); tmp.y = 0; tmp.project(cam);
        return (1 - tmp.y) / 2 * ALT;
      },
      /* ponto da grade (x, y, altura) -> pixel do quadro, para os rótulos 2D */
      projetar: function (x, y, z) {
        tmp.set(X(x), z || 0, Z(y)).project(cam);
        return [(tmp.x + 1) / 2 * LARG, (1 - tmp.y) / 2 * ALT, tmp.z];
      },
      destruir: function () {
        sc.traverse(function (ob) {
          if (ob.geometry) ob.geometry.dispose();
          if (ob.material) { var ms = Array.isArray(ob.material) ? ob.material : [ob.material]; ms.forEach(function (mt) { if (mt.map) mt.map.dispose(); mt.dispose(); }); }
        });
        try { ren.dispose(); ren.forceContextLoss(); } catch (x) {}
        cv.width = cv.height = 0;
      }
    };
  }

  function suportado() {
    try {
      var c = w.document.createElement('canvas');
      var ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
      c.width = c.height = 0; return ok;
    } catch (e) { return false; }
  }

  w.AgCampoRealista = { criar: criar, suportado: suportado, alturaCheia: alturaCheia, alturaDoBloco: alturaDoBloco };
})(typeof window !== 'undefined' ? window : this);
