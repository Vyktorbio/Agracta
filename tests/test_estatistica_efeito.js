/* O tamanho do efeito e a interação tratamento × local precisam CHEGAR à tela.
 *
 * Pergunta de uso: "o Agracta poderia estimar interação tratamento × ambiente
 * e tamanho de efeito, não somente p-valor?". O motor passou a devolver
 * ω² parcial, CV%, % contra a testemunha com IC de Fieller e, no modelo misto
 * de vários locais, o teste e a leitura da interação. Motor que calcula e tela
 * que não mostra é o defeito que este repositório já teve (ver
 * test_estatistica_render.js) — este teste desenha cada um.
 *
 * Os relatórios abaixo são SAÍDA REAL do motor (bioengine), gerados com os
 * mesmos cenários semeados de tests/motor_efeito_ambiente.py; a seção 12
 * daquele teste tranca as chaves que esta tela lê.
 *
 * Rodar: node tests/test_estatistica_efeito.js
 */
'use strict';
const fs = require('fs');
let JSDOM; try { ({JSDOM} = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

let falhas = 0, passou = 0;
function ck(ok, n) { if (ok) { passou++; console.log('  ok    ' + n); } else { falhas++; console.log('  FALHA ' + n); } }

const REL = {"anovaTodos":{"ok":true,"avisos":[],"descritiva":[{"tratamento":"T2","n":4,"media":32.5494,"dp":0.233599,"ep":0.116799,"mediana":32.4881,"min":32.3391,"max":32.8824,"cv":0.717675},{"tratamento":"T3","n":4,"media":26.0048,"dp":1.16607,"ep":0.583036,"mediana":26.2725,"min":24.3891,"max":27.0853,"cv":4.48406},{"tratamento":"T4","n":4,"media":39.8176,"dp":3.90948,"ep":1.95474,"mediana":41.1917,"min":34.0905,"max":42.7965,"cv":9.81846},{"tratamento":"Test","n":4,"media":42.1593,"dp":1.46401,"ep":0.732007,"mediana":42.0652,"min":40.7906,"max":43.7161,"cv":3.47258}],"decisao":"Resposta CONTÍNUA. Verificadas normalidade dos resíduos (Shapiro-Wilk) e homogeneidade de variância (Levene). Pressupostos atendidos → ANOVA paramétrica.","analise":{"tipo_analise":"ANOVA (uma via) em blocos","formula":"y ~ C(F1) + C(bloco)","transformacao":null,"escala_usada":"original","normalidade":{"n":16,"teste":"Shapiro-Wilk","estatistica":0.948454,"p":0.465606,"normal":true,"dagostino_p":0.138193,"assimetria":-0.799454,"curtose":0.533074},"homogeneidade":{"k_grupos":4,"teste":"Levene (mediana)","estatistica":1.32833,"p":0.311025,"homogenea":true,"bartlett_p":0.00291904},"pressupostos_ok":true,"tabela_anova":[{"fonte":"F1","gl":3.0,"sq":645.252,"qm":215.084,"F":49.7918,"p":6.27962e-06,"omega2_parcial":0.901463,"eta2_parcial":0.943173},{"fonte":"bloco","gl":3.0,"sq":17.648,"qm":5.88267,"F":1.36183,"p":0.315397,"omega2_parcial":null,"eta2_parcial":null},{"fonte":"Residual","gl":9.0,"sq":38.877,"qm":4.31967,"F":null,"p":null,"omega2_parcial":null,"eta2_parcial":null}],"fatores_significativos":{"F1":{"p":6.27962e-06,"significativo":true}},"mse":4.31967,"df_erro":9,"cv_percent":5.91578,"n_observacoes":16,"kruskal":null},"comparacao_medias":{"tukey":{"metodo":"Tukey HSD — erro do modelo","alfa":0.05,"medias":{"T2":32.5494,"T3":26.0048,"T4":39.8176,"Test":42.1593},"erros_padrao":{"T2":1.03919,"T3":1.03919,"T4":1.03919,"Test":1.03919},"ajustadas":true,"balanceado":true,"letras":{"T3":"a","T2":"b","T4":"c","Test":"c"},"ordem":["T3","T2","T4","Test"],"comparacoes":[{"g1":"T2","g2":"T3","diferenca":-6.54457,"ep_diferenca":1.46964,"p_bruto":0.00710868,"ic_inf":-11.1325,"ic_sup":-1.95666,"p":0.00710868,"significativo":true},{"g1":"T2","g2":"T4","diferenca":7.26823,"ep_diferenca":1.46964,"p_bruto":0.00361932,"ic_inf":2.68032,"ic_sup":11.8561,"p":0.00361932,"significativo":true},{"g1":"T2","g2":"Test","diferenca":9.60988,"ep_diferenca":1.46964,"p_bruto":0.000501746,"ic_inf":5.02197,"ic_sup":14.1978,"p":0.000501746,"significativo":true},{"g1":"T3","g2":"T4","diferenca":13.8128,"ep_diferenca":1.46964,"p_bruto":2.8896e-05,"ic_inf":9.22489,"ic_sup":18.4007,"p":2.8896e-05,"significativo":true},{"g1":"T3","g2":"Test","diferenca":16.1545,"ep_diferenca":1.46964,"p_bruto":7.87729e-06,"ic_inf":11.5665,"ic_sup":20.7424,"p":7.87729e-06,"significativo":true},{"g1":"T4","g2":"Test","diferenca":2.34165,"ep_diferenca":1.46964,"p_bruto":0.428234,"ic_inf":-2.24626,"ic_sup":6.92956,"p":0.428234,"significativo":false}],"df_erro":9.0,"mse":4.31967,"medias_exibicao":{"T2":32.5494,"T3":26.0048,"T4":39.8176,"Test":42.1593},"escala_teste":"original","efeito_testemunha":{"testemunha":"Test","metodo":"IC de Fieller no valor crítico de Tukey","nivel":0.95,"motivo":null,"tratamentos":{"T2":{"relativo_pct":-22.7942,"relativo_ic_inf":-32.0956,"relativo_ic_sup":-12.5731,"relativo_motivo":null},"T3":{"relativo_pct":-38.3177,"relativo_ic_inf":-47.0257,"relativo_ic_sup":-28.8748,"relativo_motivo":null},"T4":{"relativo_pct":-5.5543,"relativo_ic_inf":-15.6225,"relativo_ic_sup":5.63906,"relativo_motivo":null}}}},"scott_knott":{"metodo":"Scott-Knott","alfa":0.05,"medias":{"T3":26.0048,"T2":32.5494,"T4":39.8176,"Test":42.1593},"letras":{"T3":"a","T2":"a","T4":"b","Test":"b"},"n_grupos":2,"ordem":["T3","T2","T4","Test"],"medias_exibicao":{"T2":32.5494,"T3":26.0048,"T4":39.8176,"Test":42.1593},"escala_teste":"original"}}},"anovaControle":{"ok":true,"avisos":[],"descritiva":[{"tratamento":"T2","n":4,"media":32.5494,"dp":0.233599,"ep":0.116799,"mediana":32.4881,"min":32.3391,"max":32.8824,"cv":0.717675},{"tratamento":"T3","n":4,"media":26.0048,"dp":1.16607,"ep":0.583036,"mediana":26.2725,"min":24.3891,"max":27.0853,"cv":4.48406},{"tratamento":"T4","n":4,"media":39.8176,"dp":3.90948,"ep":1.95474,"mediana":41.1917,"min":34.0905,"max":42.7965,"cv":9.81846},{"tratamento":"Test","n":4,"media":42.1593,"dp":1.46401,"ep":0.732007,"mediana":42.0652,"min":40.7906,"max":43.7161,"cv":3.47258}],"decisao":"Resposta CONTÍNUA. Verificadas normalidade dos resíduos (Shapiro-Wilk) e homogeneidade de variância (Levene). Pressupostos atendidos → ANOVA paramétrica.","analise":{"tipo_analise":"ANOVA (uma via) em blocos","formula":"y ~ C(F1) + C(bloco)","transformacao":null,"escala_usada":"original","normalidade":{"n":16,"teste":"Shapiro-Wilk","estatistica":0.948454,"p":0.465606,"normal":true,"dagostino_p":0.138193,"assimetria":-0.799454,"curtose":0.533074},"homogeneidade":{"k_grupos":4,"teste":"Levene (mediana)","estatistica":1.32833,"p":0.311025,"homogenea":true,"bartlett_p":0.00291904},"pressupostos_ok":true,"tabela_anova":[{"fonte":"F1","gl":3.0,"sq":645.252,"qm":215.084,"F":49.7918,"p":6.27962e-06,"omega2_parcial":0.901463,"eta2_parcial":0.943173},{"fonte":"bloco","gl":3.0,"sq":17.648,"qm":5.88267,"F":1.36183,"p":0.315397,"omega2_parcial":null,"eta2_parcial":null},{"fonte":"Residual","gl":9.0,"sq":38.877,"qm":4.31967,"F":null,"p":null,"omega2_parcial":null,"eta2_parcial":null}],"fatores_significativos":{"F1":{"p":6.27962e-06,"significativo":true}},"mse":4.31967,"df_erro":9,"cv_percent":5.91578,"n_observacoes":16,"kruskal":null},"comparacao_medias":{"controle":{"metodo":"Dunnett — controle e erro do modelo","controle":"Test","contra_controle":true,"alfa":0.05,"df_erro":9.0,"medias":{"Test":42.1593,"T2":32.5494,"T3":26.0048,"T4":39.8176},"erros_padrao":{"Test":1.03919,"T2":1.03919,"T3":1.03919,"T4":1.03919},"ajustadas":true,"ordem":["Test","T2","T3","T4"],"letras":{},"comparacoes":[{"g1":"Test","g2":"T2","diferenca":-9.60988,"ep_diferenca":1.46964,"p":0.000281978,"ic_inf":-13.742,"ic_sup":-5.47781,"significativo":true,"relativo_pct":-22.7942,"relativo_ic_inf":-31.2062,"relativo_ic_sup":-13.637,"relativo_motivo":null},{"g1":"Test","g2":"T3","diferenca":-16.1545,"ep_diferenca":1.46964,"p":3.42465e-06,"ic_inf":-20.2865,"ic_sup":-12.0224,"significativo":true,"relativo_pct":-38.3177,"relativo_ic_inf":-46.1878,"relativo_ic_sup":-29.8521,"relativo_motivo":null},{"g1":"Test","g2":"T4","diferenca":-2.34165,"ep_diferenca":1.46964,"p":0.315058,"ic_inf":-6.47373,"ic_sup":1.79042,"significativo":false,"relativo_pct":-5.5543,"relativo_ic_inf":-14.6651,"relativo_ic_sup":4.46816,"relativo_motivo":null}],"nota":"ICs simultâneos para os contrastes com o controle; não testa os demais tratamentos entre si.","escala_teste":"original","medias_exibicao":{"Test":42.1593,"T2":32.5494,"T3":26.0048,"T4":39.8176}}}},"mistoInversao":{"ok":true,"decisao":"Modelo gaussiano misto por REML, com unidades e efeitos aleatórios declarados.","avisos":["Há interação tratamento × local (p < 0,001): a diferença entre tratamentos mudou de um local para outro — desvio-padrão da interação ≈ 1,99 na unidade da variável. A média geral não descreve sozinha cada local: veja o efeito em cada local e a faixa num local novo.","Em 1 de 6 locais (L6), a diferença de T2 contra C teve o sinal contrário ao da média geral."],"descritiva":[{"tratamento":"C","n":24,"media":29.4213,"dp":4.00602,"ep":null},{"tratamento":"T1","n":24,"media":21.2727,"dp":3.53614,"ep":null},{"tratamento":"T2","n":24,"media":26.6281,"dp":5.26086,"ep":null}],"comparacao_medias":{"misto":{"metodo":"Contrastes t — Satterthwaite / Holm","alfa":0.05,"ajustadas":true,"medias":{"C":29.4213,"T1":21.2727,"T2":26.6281},"erros_padrao":{"C":1.80902,"T1":1.80902,"T2":1.80902},"ordem":["T1","T2","C"],"letras":{},"comparacoes":[{"g1":"C","g2":"T1","diferenca":-8.14859,"ep_diferenca":1.19085,"gl":10.0,"p_bruto":4.4988e-05,"ic_inf":-11.285,"ic_sup":-5.01216,"relativo_pct":-27.6963,"relativo_ic_inf":-38.1089,"relativo_ic_sup":-17.6084,"relativo_motivo":null,"pred_inf":-16.206,"pred_sup":-0.0911927,"p":8.99759e-05,"significativo":true},{"g1":"C","g2":"T2","diferenca":-2.79319,"ep_diferenca":1.19085,"gl":10.0,"p_bruto":0.0409511,"ic_inf":-5.92962,"ic_sup":0.343239,"relativo_pct":-9.49378,"relativo_ic_inf":-19.566,"relativo_ic_sup":1.23407,"relativo_motivo":null,"pred_inf":-10.8506,"pred_sup":5.26421,"p":0.0409511,"significativo":true}],"contra_controle":true,"controle":"C","ic_metodo":"Bonferroni","nota":"p ajustados por Holm; ICs simultâneos por Bonferroni. Médias com pesos iguais por data/local, quando presentes."}},"analise":{"tipo_analise":"Modelo misto","modelo_misto":true,"formula":"y ~ C(trat)","reml":true,"convergiu":true,"inferencias":true,"estrutura_aleatoria":{"local":"0 + C(local)","tratamento_local":"0 + C(_trat_local)","bloco":"0 + C(_bloco)"},"componentes_variancia":{"residual":1.13561,"bloco":0.992259,"local":15.1329,"tratamento_local":3.9705},"n_observacoes":72,"n_unidades":72,"testes_efeitos":[{"efeito":"Tratamentos","F":24.1825,"gl_num":2,"gl_den":10.0,"p":0.000147652}],"serie":[],"interacao_local":{"variancia":3.9705,"desvio_padrao":1.99261,"lrt":37.2897,"p":5.09111e-10,"metodo":"Razão de verossimilhança REML; p pela mistura 50:50 de χ²₀ e χ²₁","na_fronteira":false,"reajustado_sem":false,"n_locais":6,"locais":["L1","L2","L3","L4","L5","L6"],"medias_por_local":{"C":{"L1":25.3605,"L2":23.5248,"L3":30.5113,"L4":31.2095,"L5":34.1154,"L6":31.8061},"T1":{"L1":18.4742,"L2":16.1164,"L3":23.0378,"L4":21.6839,"L5":26.0278,"L6":22.296},"T2":{"L1":21.198,"L2":20.62,"L3":26.2152,"L4":26.7348,"L5":29.7492,"L6":35.2512}},"melhor_por_local":{"L1":"T1","L2":"T1","L3":"T1","L4":"T1","L5":"T1","L6":"T1"},"alfa":0.05,"vencedores_distintos":1,"contra_controle_por_local":[{"tratamento":"T1","geral":-8.14859,"por_local":{"L1":-6.88628,"L2":-7.4084,"L3":-7.47347,"L4":-9.5256,"L5":-8.08768,"L6":-9.51014},"inversoes":[]},{"tratamento":"T2","geral":-2.79319,"por_local":{"L1":-4.16248,"L2":-2.90483,"L3":-4.29603,"L4":-4.47468,"L5":-4.36623,"L6":3.4451},"inversoes":["L6"]}],"controle":"C"},"normalidade":{"n":72,"teste":"Shapiro-Wilk","estatistica":0.992396,"p":0.945628,"normal":true,"dagostino_p":0.884451,"assimetria":-0.0780129,"curtose":0.0176891},"inferencia":"Satterthwaite aproximado com informação esperada REML; sem correção Kenward–Roger."}},"mistoZero":{"ok":true,"decisao":"Modelo gaussiano misto por REML, com unidades e efeitos aleatórios declarados.","avisos":["Interação tratamento × local estimada em zero (p = 0,500): o modelo foi reajustado sem ela, e as comparações passam a valer para estes locais. Com 6 locais o teste tem pouco poder — isso não demonstra que o efeito seja o mesmo em toda parte."],"descritiva":[{"tratamento":"C","n":24,"media":29.2326,"dp":5.98507,"ep":null},{"tratamento":"T1","n":24,"media":21.3617,"dp":6.32015,"ep":null},{"tratamento":"T2","n":24,"media":24.4919,"dp":5.10279,"ep":null}],"comparacao_medias":{"misto":{"metodo":"Contrastes t — Satterthwaite / Holm","alfa":0.05,"ajustadas":true,"medias":{"C":29.2326,"T1":21.3617,"T2":24.4919},"erros_padrao":{"C":2.42633,"T1":2.42633,"T2":2.42633},"ordem":["C","T2","T1"],"letras":{},"comparacoes":[{"g1":"C","g2":"T1","diferenca":-7.87086,"ep_diferenca":0.484646,"gl":46.0,"p_bruto":1.12635e-20,"ic_inf":-8.99385,"ic_sup":-6.74786,"relativo_pct":-26.925,"relativo_ic_inf":-34.204,"relativo_ic_sup":-21.5611,"relativo_motivo":null,"p":2.2527e-20,"significativo":true},{"g1":"C","g2":"T2","diferenca":-4.7407,"ep_diferenca":0.484646,"gl":46.0,"p_bruto":8.17159e-13,"ic_inf":-5.8637,"ic_sup":-3.6177,"relativo_pct":-16.2172,"relativo_ic_inf":-21.5842,"relativo_ic_sup":-11.9427,"relativo_motivo":null,"p":8.17159e-13,"significativo":true}],"contra_controle":true,"controle":"C","ic_metodo":"Bonferroni","nota":"p ajustados por Holm; ICs simultâneos por Bonferroni. Médias com pesos iguais por data/local, quando presentes."}},"analise":{"tipo_analise":"Modelo misto","modelo_misto":true,"formula":"y ~ C(trat)","reml":true,"convergiu":true,"inferencias":true,"estrutura_aleatoria":{"local":"0 + C(local)","bloco":"0 + C(_bloco)"},"componentes_variancia":{"residual":2.81858,"bloco":1.28175,"local":34.2973},"n_observacoes":72,"n_unidades":72,"testes_efeitos":[{"efeito":"Tratamentos","F":133.716,"gl_num":2,"gl_den":46.0,"p":6.79395e-20}],"serie":[],"interacao_local":{"variancia":0.0,"desvio_padrao":0.0,"lrt":0.0,"p":0.5,"metodo":"Razão de verossimilhança REML; p pela mistura 50:50 de χ²₀ e χ²₁","na_fronteira":true,"reajustado_sem":true,"n_locais":6,"locais":["L1","L2","L3","L4","L5","L6"],"medias_por_local":{"C":{"L1":38.886,"L2":20.0727,"L3":31.1503,"L4":27.5811,"L5":27.7668,"L6":29.9384},"T1":{"L1":31.2677,"L2":11.2664,"L3":23.2184,"L4":20.4045,"L5":20.1411,"L6":21.872},"T2":{"L1":32.8684,"L2":16.5107,"L3":25.6594,"L4":23.6289,"L5":24.1116,"L6":24.1722}},"melhor_por_local":{"L1":"C","L2":"C","L3":"C","L4":"C","L5":"C","L6":"C"},"alfa":0.05,"vencedores_distintos":1,"contra_controle_por_local":[{"tratamento":"T1","geral":-7.87086,"por_local":{"L1":-7.61834,"L2":-8.80633,"L3":-7.93186,"L4":-7.17661,"L5":-7.62562,"L6":-8.06639},"inversoes":[]},{"tratamento":"T2","geral":-4.7407,"por_local":{"L1":-6.01766,"L2":-3.56203,"L3":-5.49089,"L4":-3.9522,"L5":-3.65514,"L6":-5.76626},"inversoes":[]}],"controle":"C"},"normalidade":{"n":72,"teste":"Shapiro-Wilk","estatistica":0.961963,"p":0.0285382,"normal":false,"dagostino_p":0.1957,"assimetria":-0.471598,"curtose":-0.41649},"inferencia":"Satterthwaite aproximado com informação esperada REML; sem correção Kenward–Roger."}},"glmTodos":{"ok":true,"avisos":[],"decisao":"Resposta de CONTAGEM (inteiros ≥ 0). Escolhido GLM de Poisson; se houver sobredispersão, troca-se automaticamente por Binomial Negativa.","descritiva":[{"tratamento":"T2","n":5,"media":12.2,"dp":2.58844,"ep":1.15758,"mediana":12.0,"min":9.0,"max":16.0,"cv":21.2167},{"tratamento":"T3","n":5,"media":26.6,"dp":3.97492,"ep":1.77764,"mediana":28.0,"min":20.0,"max":30.0,"cv":14.9433},{"tratamento":"Test","n":5,"media":26.2,"dp":1.92354,"ep":0.860233,"mediana":26.0,"min":24.0,"max":29.0,"cv":7.34175}],"analise":{"tipo_analise":"GLM Poisson (contagem)","familia":"Poisson","nota_modelo":null,"sobredispersao":{"phi":0.466749,"gl":8,"pearson":3.734,"sobredisperso":false},"medias_estimadas":{"T2":12.1725,"T3":26.54,"Test":26.1409},"letras":{"T2":"a","Test":"b","T3":"b"},"comparacoes":[{"g1":"T2","g2":"T3","dif_link":-0.779475,"ep_link":0.154636,"z":-5.04072,"p":4.63791e-07,"p_ajustado":1.39137e-06,"significativo":true},{"g1":"T2","g2":"Test","dif_link":-0.764323,"ep_link":0.155007,"z":-4.93091,"p":8.18466e-07,"p_ajustado":1.63693e-06,"significativo":true},{"g1":"T3","g2":"Test","dif_link":0.0151518,"ep_link":0.123095,"z":0.12309,"p":0.902036,"p_ajustado":0.902036,"significativo":false}],"ordem":["T2","Test","T3"],"aic":90.567,"alfa":0.05,"formula":"y ~ C(F1) + C(bloco)","blocos":["B0","B1","B2","B3","B4"],"escala_medias":"Ligação inversa da média ajustada no preditor linear","efeito_testemunha":{"testemunha":"Test","metodo":"razão de taxas do GLM (ligação log), IC de Bonferroni sobre todos os pares","nivel":0.95,"motivo":null,"tratamentos":{"T2":{"relativo_pct":-53.4351,"relativo_ic_inf":-67.8708,"relativo_ic_sup":-32.5134,"relativo_motivo":null},"T3":{"relativo_pct":1.52672,"relativo_ic_inf":-24.3865,"relativo_ic_sup":36.3205,"relativo_motivo":null}}}}},"glmControle":{"ok":true,"avisos":[],"decisao":"Resposta de CONTAGEM (inteiros ≥ 0). Escolhido GLM de Poisson; se houver sobredispersão, troca-se automaticamente por Binomial Negativa.","descritiva":[{"tratamento":"T2","n":5,"media":12.2,"dp":2.58844,"ep":1.15758,"mediana":12.0,"min":9.0,"max":16.0,"cv":21.2167},{"tratamento":"T3","n":5,"media":26.6,"dp":3.97492,"ep":1.77764,"mediana":28.0,"min":20.0,"max":30.0,"cv":14.9433},{"tratamento":"Test","n":5,"media":26.2,"dp":1.92354,"ep":0.860233,"mediana":26.0,"min":24.0,"max":29.0,"cv":7.34175}],"analise":{"tipo_analise":"GLM Poisson (contagem)","familia":"Poisson","nota_modelo":null,"sobredispersao":{"phi":0.466749,"gl":8,"pearson":3.734,"sobredisperso":false},"medias_estimadas":{"T2":12.1725,"T3":26.54,"Test":26.1409},"letras":{},"comparacoes":[{"g1":"Test","g2":"T2","dif_link":-0.764323,"ep_link":0.155007,"z":-4.93091,"p":1.63693e-06,"p_ajustado":1.63693e-06,"significativo":true,"p_bruto":8.18466e-07,"diferenca":-0.764323,"relativo_pct":-53.4351,"relativo_ic_inf":-67.1019,"relativo_ic_sup":-34.0908,"relativo_motivo":null,"relativo_metodo":"razão de taxas do GLM (ligação log), IC de Bonferroni"},{"g1":"Test","g2":"T3","dif_link":0.0151518,"ep_link":0.123095,"z":0.12309,"p":0.902036,"p_ajustado":0.902036,"significativo":false,"p_bruto":0.902036,"diferenca":0.0151518,"relativo_pct":1.52672,"relativo_ic_inf":-22.9529,"relativo_ic_sup":33.7841,"relativo_motivo":null,"relativo_metodo":"razão de taxas do GLM (ligação log), IC de Bonferroni"}],"ordem":["T2","Test","T3"],"aic":90.567,"alfa":0.05,"formula":"y ~ C(F1) + C(bloco)","blocos":["B0","B1","B2","B3","B4"],"escala_medias":"Ligação inversa da média ajustada no preditor linear","controle":"Test","contra_controle":true,"nota":"Comparações apenas com o controle; p ajustados por Holm. Não testa os demais tratamentos entre si."}}};

function pagina() {
  const dom = new JSDOM(fs.readFileSync('estatistica/index.html', 'utf8'),
    {url: 'https://agracta.test/estatistica/index.html?agracta_engine=1', runScripts: 'dangerously', pretendToBeVisual: true});
  const w = dom.window;
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.alert = () => {};
  w.loadPyodide = () => new Promise(() => {}); w.fetch = () => new Promise(() => {});
  const s = w.document.createElement('script');
  s.textContent = fs.readFileSync('estatistica/app.js', 'utf8');
  w.document.body.appendChild(s);
  w.desenharBarras = () => {}; w.desenharLinhasTempo = () => {};   /* jsdom não tem canvas */
  return w;
}
const w = pagina();
function desenha(fn, rel) { const out = w.document.createElement('div'); fn(out, rel); return out; }
const texto = n => n.textContent.replace(/\s+/g, ' ');
const copia = o => JSON.parse(JSON.stringify(o));

/* ------------------------------------------------ 1. ANOVA: o tamanho ---- */
console.log('\nANOVA em blocos, todos entre si, com testemunha');
let o = desenha(w.renderAnova, REL.anovaTodos), t = texto(o), h = o.innerHTML;
const trat = REL.anovaTodos.analise.tabela_anova.find(l => l.fonte === 'F1');
ck(/ω² parcial/.test(h), 'a tabela da ANOVA ganha a coluna ω² parcial');
ck(t.includes(w.fmt(trat.omega2_parcial, 3)), 'com o valor do motor (' + w.fmt(trat.omega2_parcial, 3) + ')');
ck(/Olejnik/.test(t), 'e a leitura do número, com a referência');
ck(trat.p < 1e-4 && /< 0,0001 significativo/.test(t) && !/<td>0 significativo/.test(h), 'p minúsculo sai "< 0,0001", nunca "0"');
ck(new RegExp('CV do ensaio: ' + w.fmt(REL.anovaTodos.analise.cv_percent, 1).replace(',', ',') + '% \\(baixo').test(t), 'o CV do ensaio aparece classificado (Pimentel-Gomes)');
const tk = REL.anovaTodos.comparacao_medias.tukey, et = tk.efeito_testemunha;
ck(/<th>vs Test<\/th>/.test(h), 'a tabela de médias ganha a coluna "vs Test"');
const e2 = et.tratamentos.T2;
ck(t.includes(w.fmtPct(e2.relativo_pct)) && t.includes('(' + w.fmtPct(e2.relativo_ic_inf) + ' a ' + w.fmtPct(e2.relativo_ic_sup) + ')'),
   'T2: ' + w.fmtPct(e2.relativo_pct) + ' com o intervalo de Fieller');
ck(/referência/.test(t), 'a própria testemunha aparece como referência, não como 0%');
ck(/valor crítico de Tukey/.test(t) && /exclui 0% coincide com letra diferente/.test(t), 'a nota diz qual intervalo é e como ler junto das letras');
ck(w.fmtPct(-22.79) === '−22,8%' && w.fmtPct(3.04) === '+3%' && w.fmtPct(0) === '0%', 'o sinal vem escrito (− e +)');

/* testemunha que não existe: o motivo, sem coluna inventada */
const semT = copia(REL.anovaTodos);
semT.comparacao_medias.tukey.efeito_testemunha = {testemunha: 'X', tratamentos: {}, motivo: 'A testemunha indicada não está entre os tratamentos analisados.'};
o = desenha(w.renderAnova, semT); t = texto(o);
ck(!/<th>vs X<\/th>/.test(o.innerHTML) && /não está entre os tratamentos/.test(t), 'sem base: nenhuma coluna, e o motivo escrito');
/* relatório antigo (sem os campos novos) continua desenhando igual */
const antigo = copia(REL.anovaTodos);
antigo.analise.tabela_anova.forEach(l => { delete l.omega2_parcial; delete l.eta2_parcial; });
delete antigo.analise.cv_percent; delete antigo.comparacao_medias.tukey.efeito_testemunha;
o = desenha(w.renderAnova, antigo);
ck(!/ω²/.test(o.innerHTML) && !/vs Test/.test(o.innerHTML) && /Tukey/.test(texto(o)), 'relatório antigo, guardado no aparelho, não quebra');

/* ------------------------------------------- 2. Dunnett: % no par ---- */
console.log('\nCada um contra a testemunha (Dunnett)');
o = desenha(w.renderAnova, REL.anovaControle); t = texto(o); h = o.innerHTML;
const cD = REL.anovaControle.comparacao_medias.controle.comparacoes[0];
ck(/Em % da testemunha/.test(h), 'a tabela de pares ganha "Em % da testemunha"');
ck(t.includes(w.fmtPct(cD.relativo_pct)) && t.includes(w.fmtPct(cD.relativo_ic_inf)), 'com o % e o intervalo de Fieller');
ck(/mesmo nível simultâneo/.test(t), 'a nota diz que o intervalo é o simultâneo do Dunnett');
const trans = copia(REL.anovaControle);
trans.comparacao_medias.controle.comparacoes.forEach(c => Object.assign(c, {relativo_pct: null, relativo_ic_inf: null, relativo_ic_sup: null,
  relativo_motivo: 'O modelo está na escala log; o efeito relativo só é dado na escala original.'}));
o = desenha(w.renderAnova, trans); t = texto(o);
ck(/Efeito relativo: O modelo está na escala log/.test(t), 'escala transformada: o motivo no lugar do número');

/* ----------------------------- 3. Modelo misto: tratamento × local ---- */
console.log('\nVários locais: interação detectada, com inversão');
o = desenha(w.renderMisto, REL.mistoInversao); t = texto(o); h = o.innerHTML;
const it = REL.mistoInversao.analise.interacao_local;
ck(/Interação tratamento × local/.test(t), 'o quadro da interação aparece');
ck(/interação detectada \(p < 0,0001\)/.test(t) && /chip-alerta/.test(h), 'com o veredito em destaque (p minúsculo não vira "p=0")');
ck(t.includes('desvio-padrão da interação ≈ ' + w.fmt(it.desvio_padrao, 3)), 'e o TAMANHO da interação na unidade da variável');
ck(/Self &amp; Liang|Self & Liang/.test(h), 'o p da fronteira tem a referência');
ck(it.locais.every(l => new RegExp('<th>' + l + '</th>').test(h)), 'uma coluna por local');
ck(h.includes('<b>' + w.fmt(it.medias_por_local[it.melhor_por_local.L1].L1, 2) + '</b>'), 'o melhor de cada local em negrito');
const t2 = it.contra_controle_por_local.find(p => p.tratamento === 'T2');
ck(h.includes('chip-alerta">' + w.fmt(t2.por_local.L6, 2) + '<'), 'L6: o sinal invertido de T2 contra C vem destacado');
ck(/Tratamento − C/.test(t), 'a tabela de diferenças diz contra quem');
const cM = REL.mistoInversao.comparacao_medias.misto.comparacoes[0];
ck(/Num local novo/.test(h) && t.includes(w.fmt(cM.pred_inf, 3) + ' a ' + w.fmt(cM.pred_sup, 3)), 'a faixa num local novo aparece em cada par');
ck(/mais larga que o IC/.test(t) && /mesmo nível simultâneo do IC/.test(t), 'e a nota explica por que ela é mais larga');
ck(REL.mistoInversao.comparacao_medias.misto.comparacoes.every(c => c.pred_inf <= c.ic_inf && c.pred_sup >= c.ic_sup), 'no relatório do motor a faixa contém o IC');
ck(/Em % da testemunha/.test(h), 'o % contra a testemunha também no misto');
const outro = copia(REL.mistoInversao);
outro.analise.interacao_local.melhor_por_local.L6 = 'T2'; outro.analise.interacao_local.vencedores_distintos = 2;
ck(/2 tratamentos diferentes/.test(texto(desenha(w.renderMisto, outro))), 'quando o topo muda de local para local, a tela diz quantos');

console.log('\nVários locais: interação estimada em zero');
o = desenha(w.renderMisto, REL.mistoZero); t = texto(o);
ck(/estimada em zero/.test(t) && /saiu do modelo/.test(t), 'diz que a interação saiu do modelo, e o que isso significa');
ck(!/tratamento_local/.test(o.innerHTML), 'a variância da interação não aparece como componente ajustado');
ck(/p ajustado/.test(o.innerHTML), 'e as comparações seguem liberadas');
ck(!/Num local novo/.test(o.innerHTML), 'sem interação estimada, não há faixa num local novo para mostrar');

/* ------------------------------------------- 4. Contagem (GLM) ---- */
console.log('\nContagem: razão de taxas contra a testemunha');
o = desenha(w.renderGlm, REL.glmTodos.analise); t = texto(o); h = o.innerHTML;
const eg = REL.glmTodos.analise.efeito_testemunha.tratamentos.T2;
ck(/<th>vs Test<\/th>/.test(h) && t.includes(w.fmtPct(eg.relativo_pct)), 'todos entre si: coluna vs Test com a razão de taxas');
ck(/Bonferroni sobre todos os pares/.test(t), 'a nota diz que o intervalo é de Bonferroni na família das letras');
o = desenha(w.renderGlm, REL.glmControle.analise); t = texto(o); h = o.innerHTML;
ck(/Em % da testemunha/.test(h) && /razão de taxas/.test(t), 'contra a testemunha: % e explicação da razão de taxas');

/* -------------------- 5. A testemunha vai ao motor em "todos entre si" ---- */
console.log('\nO pedido ao motor');
const wP = pagina();
let pedido = null;
wP.rodarPython = (fn, papeis, opcoes) => { pedido = opcoes; return new Promise(() => {}); };
const aoa = [['Local','Quadra','Cultura','Estudo','Data_avaliacao','Tipo','BBCH','Tratamento','Repeticao','Produto','Variavel','Valor']];
['T0','T1','T2'].forEach((tr, i) => [1,2,3,4].forEach(r => aoa.push(['F','Q1','Soja','E1','01/09/2026','Severidade','','' + tr, String(r), '', 'Sev', String(30 - i * 7 + r)])));
wP.__agractaHandoff({aoa, modo: 'analise', titulo: 'E1', controle: 'T0', tipos: {Sev: 'continua'}});
(async () => {
  await new Promise(r => setTimeout(r, 700));
  if (!pedido) { const b = wP.document.getElementById('btn-analisar'); if (b) b.click(); await new Promise(r => setTimeout(r, 50)); }
  ck(pedido && pedido.comparacao === 'todos', 'o cartão automático continua comparando todos entre si');
  ck(pedido && pedido.testemunha === 'T0' && pedido.controle === undefined, 'e manda a testemunha só como base do % (não vira Dunnett)');
  console.log('\n' + passou + ' conferência(s) ok, ' + falhas + ' falha(s).');
  process.exit(falhas ? 1 : 0);
})();
