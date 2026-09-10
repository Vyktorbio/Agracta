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
