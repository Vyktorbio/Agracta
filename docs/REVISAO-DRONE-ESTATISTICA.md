# Revisão de preparo, estatística e interface — setembro de 2026

Esta revisão corrige cálculos e decisões de análise existentes. Não constitui
validação de equivalência ou superioridade ao ARM.

## Drone e preparo

A calculadora usada no aplicativo passa a usar a carga mínima inicial informada:

- Volume aplicado = área das parcelas × taxa de aplicação.
- Volume preparado = máximo entre (aplicado + volume morto) e carga mínima inicial.
- Residual previsto = preparado − aplicado.
- Cada produto por hectare e cada adjuvante em % v/v é dimensionado para o volume
  preparado, preservando a concentração, inclusive no excedente.

Exemplo de regressão: quatro parcelas de 20 × 11 m, 3 L/ha, 300 mL de volume morto
e carga mínima de 1.700 mL resultam em 264 mL aplicados e 1.436 mL residuais.
Produto a 1,5 L/ha: 850 mL; adjuvante a 0,033% v/v: 0,561 mL.

A vazão requerida é taxa (L/ha) × velocidade (km/h) × espaçamento entre rotas (m)
/ 600. A tela confronta vazão medida, limites informados e capacidade do tanque.
Uma largura que não se ajusta à parcela gera aviso de área excedente. Velocidade,
altura ou faixa alteradas invalidam a confirmação de deposição.

Não há limite de fabricante presumido. A confirmação usa os dados informados e
não substitui ensaio de deposição ou calibração física. Configurações de voo são
mantidas durante a sessão; “Gravar cálculo” inclui entradas e resultado na memória.
Tratamentos com outro método não herdam a carga mínima do drone.

## Estatística

- Tukey usa a covariância e o erro residual do mesmo modelo da ANOVA, preservando
  os blocos. São mostradas médias ajustadas, erro-padrão e diferenças com intervalos.
- Grades incompletas usam contrastes das médias ajustadas com correção de Holm.
  Scott-Knott permanece alternativa para dados equilibrados.
- GLMs de contagem e binomial preservam blocos. A dispersão NB2 é estimada;
  sua inferência é condicional à estimativa. Se não convergir, há alternativa
  quase-Poisson identificada no resultado.
- Uma contagem explicitamente declarada não é convertida em resposta contínua
  por apresentar pouca variância. Entradas inválidas são recusadas.
- Modelos saturados, efeitos confundidos e ausência de erro residual não geram
  p-valores ou letras. Falhas de pressupostos não apagam blocos para aplicar Kruskal.
- Pontos ou treços dentro de uma faixa única são subamostras: os dados e suas
  descrições permanecem, mas não geram ANOVA, letras ou prancha inferencial.
- Médias ajustadas são acompanhadas de erro-padrão do modelo. Não se mistura o
  erro de uma transformação com a média original para calcular CV.

O objetivo de superar o ARM requer comparação de resultados e tarefas, além de
uma lista de métodos. Próximas lacunas úteis: modelos mistos para locais/safras e
medidas repetidas, contrastes planejados contra controle (Dunnett), curvas de
dose contínua com EC50 e planejamento pela diferença agronomicamente relevante.
Esses recursos não foram implementados nesta revisão. O ARM 2026 já anuncia
modelos mistos e exportação de scripts R; isso integra a referência de comparação.

## Interface e validação

A abertura no mapa permanece. A navegação agrupa recuperação e preferências;
tipografia, espaçamento, controles e cores foram refinados. A calculadora preserva
valores editados ao trocar de tratamento ou estudo e destaca o volume de preparo.

`test_drone.js` verifica fórmulas e limites; `test_drone_fluxo.js` exercita a tela
via DOM e sua memória. `test_motor_python.js` executa os arquivos Python publicados
no mesmo Pyodide e nas mesmas bibliotecas WASM do aparelho, com oráculo algébrico
DBC, faltantes, modelos degenerados, GLMs e dispersão NB2. `test_faixas.js` cobre
também a finalização e o bloqueio da prancha. A bateria geral é `npm test`.
Não houve revisão visual em navegador nesta etapa.

## Referências

- [GDM — ARM](https://gdmdata.com/).
- [Hurlbert, 1984 — Pseudoreplication and the Design of Ecological Field Experiments](https://sciences.ucf.edu/biology/d4lab/wp-content/uploads/sites/23/2018/08/Hurlbert-1984.pdf).
- [SciPy — distribuição da amplitude studentizada](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.studentized_range.html).
- [statsmodels — Tukey de uma via](https://www.statsmodels.org/v0.14.3/generated/statsmodels.stats.multicomp.pairwise_tukeyhsd.html).
