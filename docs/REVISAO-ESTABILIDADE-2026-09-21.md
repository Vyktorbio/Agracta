# Revisão de estabilidade — 21/09/2026

Prioridade solicitada: estabilizar as funções existentes antes de acrescentar recursos.
A revisão começou em `e04718a` e incorporou a publicação concorrente #112
(`29fa1d4`), que corrigiu as calculadoras. Essas correções foram preservadas.

## Correções adicionais

- A memória automática de bancada passa a aceitar receitas inteiramente em
  `% v/v`, sem exigir um volume de calda por hectare que não entra nessa conta.
- Tratamentos com volumes de calda próprios, inclusive diferentes entre si,
  passam a gerar memória sem exigir um valor geral artificial.
- Um tratamento com dose por área e volume ausente ou ambíguo continua pendente.
  O volume de outro tratamento não é adotado como padrão.
- A referência de origem da dose acompanha item e lote na memória de bancada.
- O teste de inicialização agora reprova exceções ao carregar scripts e erros
  em eventos. Antes, alguns erros eram impressos e a execução podia terminar
  com código de sucesso.

Registros históricos de aplicações permanecem como foram gravados. Não houve
alteração de ensaios operacionais nesta revisão.

## Evidência dos casos adicionais

O teste `test_bancada_memoria.js` reproduziu seis falhas na versão #112 antes da
correção. Depois, suas 57 verificações passaram. Entre os resultados conferidos:

| Caso | Resultado |
|---|---|
| 0,033% v/v em 100 mL, sem volume por hectare | 33 µL; memória automática presente |
| 1 L/ha a 200 L/ha, pote de 100 mL | 500 µL |
| Mesmo estudo, outro tratamento a 100 L/ha | 1.000 µL |
| Um tratamento sem volume, sem padrão no protocolo | Configuração pendente |
| Volume escrito como “100 ou 200 L/ha” | Configuração pendente |
| Receita estruturada percentual | Identidades de item, lote e dose conservadas |

## Abrangência e limite

Os testes do repositório exercitam calculadoras de campo, CO₂, drone e bancada;
protocolo, avaliações, agenda, mapa e croqui; estatística, Conhecimento, fotos,
relatórios, armazenamento local, sincronização e controles de acesso.

As regras do Firestore foram exercitadas no emulador, incluindo isolamento entre
clientes, seleção e revogação de estudos e escrita autorizada.

No navegador, a página publicada chegou à tela de login. Não havia uma sessão
autenticada para conferir as telas com os estudos reais. Aprovação dos testes
não equivale a certificação de todos os fluxos de produção.

Ainda falta a conferência autenticada de navegação entre mapa, estudo,
avaliação, Conhecimento e relatório, além do comportamento no aparelho usado
em campo. Nenhuma função nova faz parte desta alteração.
