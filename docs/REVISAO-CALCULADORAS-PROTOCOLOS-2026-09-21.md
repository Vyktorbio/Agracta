# Revisão das calculadoras para protocolos — 21/09/2026

Base inspecionada: `e04718a8f821201d3c3850bb910985713362ed97` (`main`).
Esta revisão cobre o código das calculadoras e sua integração com os protocolos.
Não houve acesso aos ensaios privados nem alteração de registros operacionais.

## Resultado da revisão

O campo já tinha proteções importantes que não eram compartilhadas pela bancada.
A prioridade foi tornar a receita de laboratório consistente entre tela, cópia e
memória de cálculo, sem perder as correções existentes de CO₂ e drone.

| Problema confirmado | Efeito | Correção |
|---|---|---|
| Laboratório lia `0.033` como `33` | Erro de 1.000 vezes em entradas pequenas | Leitura integral, decimal com zero inicial e notação científica preservados |
| Memória de bancada considerava só o primeiro número da mistura | Adjuvante ou outro componente desaparecia do registro | Tela e texto copiado passam a consumir a mesma memória, com todos os componentes |
| Dose sem unidade era presumida como L/ha | Um tratamento em g/ha podia virar volume | Usa a unidade declarada; ausência ou unidade incompatível gera pendência |
| Dose ilegível ou primeiro tratamento eram tratados como testemunha | Receita podia virar somente solvente | Só a marcação explícita de testemunha sem dose dispensa preparo; controle positivo com dose é calculado |
| Memória ignorava o volume de calda do tratamento | Receita gravada podia divergir da tela | Volume do tratamento precede o geral; texto ambíguo é recusado |
| g/kg recorria a densidade presumida | Receita podia mandar pipetar um pó | Preparo por concentração em g/kg calcula massa a pesar |
| Zero em pureza/densidade recebia valor padrão | Entrada inválida passava como 100% ou 1 g/mL | Padrão só para campo vazio; pureza limitada a 0–100%, excluindo zero |
| Dose de formulado recebia correção adicional de pureza | Quantidade podia ser aumentada duas vezes | Pureza corrige reagente puro; teor de rótulo já determina o ingrediente ativo |
| Ajuste em g/kg usava a mesma densidade na origem e no alvo | Conversão entre massa e volume podia estar errada | Densidade do produto e da solução final são entradas separadas |
| Contagem de parcelas/frascos era arredondada ou substituída por 1 | Entrada incorreta gerava receita aparentemente válida | Zero, negativos e frações de contagem são recusados |
| Cópia de receita de mistura não continha quantidades de bancada | Operador precisava recalcular | Texto traz cada quantidade em mg ou µL e um único volume final |
| Troca de aba apagava ajustes locais do laboratório | Operador podia copiar valores diferentes dos conferidos | Entradas preservadas por estudo e aba durante a sessão |

`% v/v` continua baseado no volume final. `ppm`, como identificador legado deste
módulo de laboratório, representa **mg/L de ingrediente ativo**. A concentração
volumétrica de produto é identificada separadamente; não se presume que µL/L seja
mg/L. `%` no ajuste de concentração passa a aparecer explicitamente como `% m/v`.

As receitas dizem **completar até o volume final**. Para sólidos não se afirma que
o volume inteiro de solvente deva ser adicionado. Avisos de micropipetagem e
pesagem acompanham cada componente. Uma diluição intermediária sugerida não é
oferecida quando o volume a transferir ultrapassa o volume final.

## Casos conferidos

| Situação | Resultado esperado |
|---|---|
| 0,033% v/v em 50 mL | 16,5 µL de adjuvante; completar até 50 mL |
| 100 mg/L de i.a., 50 mL, produto a 500 g/kg | 10 mg de produto; completar até 50 mL |
| 100 mg/L, 50 mL, reagente com 80% de pureza | 6,25 mg; completar até 50 mL |
| 1,5 L/ha + 0,033% v/v, 300 L/ha, pote de 50 mL | 250 µL de produto + 16,5 µL de adjuvante; completar até 50 mL |
| Origem 500 g/kg a 1,2 g/mL; alvo 100 g/kg a 1,05 g/mL; 100 mL finais | 17,5 mL da origem; completar até 100 mL |
| Drone: 4 parcelas de 20 × 11 m, 3 L/ha, residual técnico 300 mL e mínimo inicial 1.700 mL | 264 mL aplicados; preparar 1.700 mL; residual total previsto 1.436 mL |
| Mesmo drone; produto a 1,5 L/ha e adjuvante a 0,033% | 850 mL de produto e 0,561 mL de adjuvante nos 1.700 mL preparados |

São verificações aritméticas, não recomendações de dose, formulação ou aplicação.
O ajuste de densidade pressupõe valores medidos ou conhecidos; solubilidade e
compatibilidade da formulação não são inferidas dessas contas.

## O que falta para atender mais tipos de protocolo

| Uso | Estado observado | Próxima integração necessária |
|---|---|---|
| Pulverização por área: CO₂, sider, drone e misturas | Integrada; revisão mantém as contas de área, preparo, capacidade e mínimo inicial | Planejar cargas e sobras por operação, distinguindo residual por equipamento de residual por troca de tratamento |
| Dose por vaso, planta, placa ou kg/100 kg de sementes | Há bases no motor universal e no catálogo de unidades; calculadora principal continua centrada em área | Expor a base do protocolo, quantidade de alvos e volume por alvo sem converter automaticamente para hectares |
| Torre de Potter | Motor contém geometria e coleta de deposição; tela de bancada mostra principalmente o preparo do pote | Integrar alvo circular/retangular, área, µL depositados, volume carregado e calibração medida |
| Diferentes produtos ou fontes em um estudo em mg/L | Fonte de laboratório ainda configurada no nível do estudo | Informar teor, fonte, pureza e lote por produto/tratamento; impedir uso inadvertido de uma fonte comum para produtos diferentes |
| Série de concentrações | Motor permite preparos independentes e série geométrica; protocolo fornece tratamentos | Integrar planejamento de estoque, consumo total, perdas e volume disponível após transferências de diluição seriada |
| Controle de solvente e adjuvante | Testemunha sem aplicação e controle positivo com dose são tratados distintamente | Criar controle explícito de veículo e manter sua concentração constante entre tratamentos |
| Fungos, nematoides e outros inóculos | Não há fluxo integrado de preparo por concentração biológica nesta calculadora | Conídios, UFC, indivíduos/ovos por mL, viabilidade, volume por unidade e total necessário |
| Reagentes e soluções analíticas | Preparo por massa/concentração está disponível | Molaridade, massa molar, diluição de estoque por produto e limites dos instrumentos cadastrados |
| Planejamento de materiais | Repetições entram no campo; bancada usa volume final por preparo | Totalizar unidades experimentais, subamostras, tempos destrutivos, placas, potes e volume de solução necessário |

Não se deve rotular o conjunto como universal enquanto essas integrações não
estiverem disponíveis e verificadas. A prioridade funcional seguinte é escolher
a **base da dose** no protocolo (área, concentração ou unidade-alvo), com a receita
derivada dessa escolha e uma fonte identificada por produto.

## Validação

- `bash conferir.sh --pull-request`: 145 arquivos de teste passaram, sem testes
  pulados. Inclui CO₂, drone, campo, laboratório e memória de cálculo.
- `test_calculadoras_protocolos.js`: casos adicionais de entrada, conservação de
  massa, misturas, controles, leitura de unidades e interação dos formulários.
- Testes focados de laboratório repetidos após o ajuste final de limites numéricos.
- Versões do motor e do cache atualizadas; registros históricos não são recalculados.
- A prévia visual local foi bloqueada pela política de navegação do ambiente.
  Testes de DOM executados; não se afirma uma inspeção visual em navegador.
- O verificador não conseguiu consultar o cache publicado. A versão proposta
  sobe de `agracta-app-v277` para `agracta-app-v278` em relação à base inspecionada.

Referência conceitual: [IUPAC — concentração mássica](https://goldbook.iupac.org/terms/view/M03713):
massa de um constituinte por volume da mistura. A distinção fundamenta o uso de
mg/L e a necessidade de densidade na conversão de g/kg para uma base volumétrica.
