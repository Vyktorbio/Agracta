# Análise planejada — setembro de 2026

Na ficha do estudo, **Configurar análise** abre a estatística completa. A abertura
carrega uma única avaliação; anteriormente esse caminho podia agrupar datas.
Para análise longitudinal, escolha **Todas as datas — mesmas parcelas** e use os
dados. A identidade da parcela combina local, quadra, estudo, tratamento e repetição.
A testemunha marcada no cadastro é oferecida no seletor; não é presumida como T1.

## Comparações contra testemunha

A pergunta “Cada um contra a testemunha” define a família de comparações.

- ANOVA: Dunnett bilateral, calculado com médias ajustadas, covariância e graus
  de liberdade residuais do mesmo modelo, inclusive quando há blocos.
- Alternativa não paramétrica de uma via: Dunn, com Holm apenas para os contrastes
  planejados contra o controle.
- GLMs: contrastes na escala de ligação com correção Holm.
- Modelos mistos: contrastes t com graus de liberdade de Satterthwaite e Holm.

Dunnett integra a distribuição t multivariada pelo SciPy, com semente fixa e
100.000 pontos de integração. Os intervalos são simultâneos. Nos modelos mistos,
os intervalos simultâneos usam Bonferroni; p-valores usam Holm. O método de cada
saída fica identificado. Não se atribuem letras a comparações apenas contra
controle, porque os demais tratamentos não foram testados entre si.

## Tamanho do efeito — quanto, e não só se

O p diz se a diferença se distingue do acaso; a recomendação precisa saber **de
quanto** ela é, com a incerteza junto. Desde outubro de 2026 o motor devolve, ao
lado de cada p:

- **ω² parcial** de cada termo da ANOVA (Olejnik e Algina, 2003):
  ω²ₚ = gl·(F − 1) / (gl·(F − 1) + N), truncado em zero. É a fração da variação
  que o termo explica já descontado o acaso — sem o viés para cima do η², que
  também sai no relatório. Bloco é delineamento e fica de fora.
- **CV% do ensaio** = 100·√QME / média geral, só na escala original, lido pela
  tabela de Pimentel-Gomes (2009): < 10% baixo, 10–20% médio, 20–30% alto,
  > 30% muito alto.
- **% contra a testemunha** = (média do tratamento ÷ média da testemunha − 1)
  × 100, com **IC de Fieller** (1954) — a razão é assimétrica, e o método delta
  erra justamente quando a testemunha é pequena. O IC usa o **mesmo valor
  crítico** da família que a tela mostra, e por isso o % exclui zero exatamente
  quando o IC da diferença exclui zero:

| Comparação | Valor crítico do IC do % |
|---|---|
| Cada um contra a testemunha (ANOVA) | Dunnett simultâneo |
| Todos entre si, balanceado | Tukey, q/√2 — o % e as letras contam a mesma história |
| Todos entre si, desbalanceado | Bonferroni sobre todos os pares (limite conservador de Holm) |
| Contagem (GLM, ligação log) | razão de taxas exp(diferença), IC de Bonferroni |
| Modelo misto | Bonferroni, o mesmo do IC simultâneo de cada par |

Em "todos entre si" o teste continua sendo o de todos os pares; a testemunha
marcada no cadastro só dá a base do % (os cartões automáticos do estudo já a
mandam). Sem base, o número não é inventado e o motivo vai junto: testemunha
indistinguível de zero (intervalo sem limite), escala transformada (a razão na
escala log não é % da variável) e x de n (a diferença em logit é razão de
chances, não % da testemunha).

## Interação tratamento × local

No modelo misto de vários locais, o componente tratamento × local já entrava no
ajuste, mas só como um número na tabela de variâncias. Agora ele ganha leitura:

- **Teste**: razão de verossimilhança REML contra o modelo sem o componente
  (mesmos efeitos fixos). Como a variância não pode ser negativa, o p vem da
  mistura 50:50 de χ²₀ e χ²₁ — metade do p usual (Self e Liang, 1987).
- **Tamanho**: o desvio-padrão da interação, na unidade da variável.
- **Faixa num local novo** para cada diferença: d ± t·√(EP² + 2σ²ₜₗ), o intervalo
  de predição (Higgins, Thompson e Spiegelhalter, 2009), com o mesmo t do IC
  simultâneo ao lado. É mais largo que o IC da média, e é ele que diz se a
  vantagem tende a se repetir fora dos locais ensaiados. Com a interação
  estimada em zero não há faixa: as comparações valem para os locais ensaiados.
- **Leitura local a local**: médias de cada tratamento em cada local, o melhor
  de cada local, a diferença contra a testemunha em cada local e os locais em
  que o sinal se inverteu — a interação que muda a recomendação, e não só o
  tamanho do efeito.
- **Interação estimada em zero**: antes, um componente na fronteira suspendia
  toda a inferência, e o otimizador às vezes nem convergia. Agora a decisão é da
  derivada da verossimilhança REML no ajuste sem o componente,
  ½·[(Py)'A(Py) − tr(PA)]: ≤ 0, o máximo está em σ²ₜₗ = 0 e o modelo é reajustado
  sem ele (as comparações passam a valer para estes locais); > 0, existe ajuste
  melhor, e o otimizador recomeça do ajuste reduzido.

Com poucos locais o teste tem pouco poder: "não detectada" não demonstra efeito
igual em toda parte, e o aviso diz isso. A análise conjunta é de **um** arquivo
com a coluna de local (a aba "Entre estudos" continua não combinando estudos).

## Modelos mistos gaussianos

São ajustados por REML, usando o statsmodels já distribuído com o aplicativo.
Há uma coluna de tratamento categórico. As entradas adicionais definem:

| Estrutura | Efeitos fixos | Efeitos aleatórios |
|---|---|---|
| Uma avaliação em blocos | Tratamento | Bloco |
| Vários locais | Tratamento | Local, bloco dentro do local, tratamento × local |
| Mesmas parcelas em várias datas | Tratamento, data e interação; local, se informado | Parcela e bloco, quando informado |

Em medidas repetidas, a correlação dentro da parcela decorre de um intercepto
aleatório: simetria composta positiva. Datas entram como categorias, sem impor
uma tendência linear. A comparação média entre tratamentos dá peso igual às
datas; o resultado mostra também tratamento × tempo e as trajetórias ajustadas.
As unidades independentes e as observações são contadas separadamente.

Uma unidade não pode mudar de tratamento. Duplicatas parcela/data são recusadas.
Identificadores ausentes, efeitos confundidos, modelo sem resíduo ou sem
convergência não liberam testes. Respostas ausentes podem ser excluídas, com aviso;
texto inválido não é tratado como ausência. Componentes aleatórios na fronteira
ou curvatura insuficiente suspendem testes e intervalos. Poucos níveis aleatórios
geram aviso. O ajuste no aparelho admite até 600 observações por variável.

### Inferência

Para V = soma de θᵢAᵢ, C = (X'V⁻¹X)⁻¹ e
P = V⁻¹ − V⁻¹XCX'V⁻¹, a informação esperada REML é
Iᵢⱼ = tr(PAᵢPAⱼ)/2. A variância v de um contraste c é c'Cc;
seu gradiente g é obtido analiticamente. Os graus de liberdade aproximados são
2v²/(g'I⁻¹g). Testes com vários graus de liberdade combinam contrastes ortogonais
pelo ajuste de momentos de Satterthwaite/Fai–Cornelius.

Essa implementação usa **informação esperada**, não reproduz exatamente a variante
com Hessiana observada do lmerTest, e não inclui Kenward–Roger. Modelo gaussiano,
variância residual comum e estrutura de correlação escolhida precisam ser
adequados ao experimento. Os testes não demonstram igualdade ou equivalência.

## Validação e limites

O teste executa o Python e as bibliotecas WASM que são entregues ao aparelho:

- Dunnett confrontado com a função pública independente `scipy.stats.dunnett`.
- Preservação dos contrastes após acrescentar efeitos de bloco.
- REML e Satterthwaite comparados com uma decomposição DBC algébrica.
- Medidas repetidas comparadas com uma decomposição de erro entre e dentro de
  parcelas: 12 parcelas, 36 observações, GL 6 e 18, respectivamente.
- Dados incompletos, modelo entre locais e recusas de delineamento.
- Fluxo de seleção de datas, identidade das parcelas e controle explícito.
- Tamanho do efeito e tratamento × local (`tests/motor_efeito_ambiente.py`):
  ω² parcial e CV% por fórmula fechada; Fieller pelas raízes da quadrática; no
  ensaio em rede balanceado, REML igual aos estimadores por quadrados médios
  esperados, EP da diferença √(2·QM(T×L)/(r·l)), GL de Satterthwaite (t−1)(l−1),
  razão de verossimilhança em forma fechada
  ν₁·ln(s²/QM_TL) + ν₂·ln(s²/QM_E) e derivada na fronteira
  (r·ν₁/2s²)·(QM_TL/s² − 1); % contra a testemunha com o crítico de Tukey e a
  razão de taxas confrontada com um GLM Poisson independente.
- Telas: `tests/test_estatistica_efeito.js` desenha relatórios reais do motor;
  `tests/test_estatistica_render.js` confere o cartão do estudo.

Não há comparação de equivalência de produto com ARM nesta revisão. Permanecem
fora desta implementação: GLMM para respostas não gaussianas, AR(1), covariância
não estruturada, inclinações aleatórias, Kenward–Roger, curvas contínuas EC50 e
planejamento de poder. Não houve revisão visual em navegador nesta etapa.

## Referências

- [statsmodels: modelos mistos](https://www.statsmodels.org/stable/mixed_linear.html).
- [statsmodels: componentes de variância e efeitos cruzados](https://www.statsmodels.org/stable/examples/notebooks/generated/variance_components.html).
- [SciPy 1.12: Dunnett](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.dunnett.html).
- [SciPy 1.12: distribuição t multivariada](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.multivariate_t.html).
- [Kuznetsova, Brockhoff e Christensen (2017): lmerTest](https://www.jstatsoft.org/article/view/v082i13).
- Fieller, E. C. (1954). Some problems in interval estimation. *JRSS B*, 16, 175–185.
- Olejnik, S.; Algina, J. (2003). Generalized eta and omega squared statistics. *Psychological Methods*, 8, 434–447.
- Self, S. G.; Liang, K.-Y. (1987). Asymptotic properties of maximum likelihood estimators and likelihood ratio tests under nonstandard conditions. *JASA*, 82, 605–610.
- Higgins, J. P. T.; Thompson, S. G.; Spiegelhalter, D. J. (2009). A re-evaluation of random-effects meta-analysis. *JRSS A*, 172, 137–159.
- Pimentel-Gomes, F. (2009). *Curso de estatística experimental*. 15. ed. Piracicaba: FEALQ.
