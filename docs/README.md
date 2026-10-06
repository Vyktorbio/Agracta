# Documentação do Agracta

O que está em cada documento desta pasta, agrupado pelo uso. O que mudou em cada
publicação não está aqui: fica no `LEIA-ME.txt`, na raiz. O mapa dos arquivos do
app está no `README.md` da raiz.

## Comece por aqui

| Documento | Para quê |
|---|---|
| [ARQUITETURA.md](ARQUITETURA.md) | A especificação-mãe: o que o Agracta deve ser e por quê. No fim, as decisões em aberto |
| [ROADMAP.md](ROADMAP.md) | Em que ordem construir e onde cada coisa mora na tela. Os blocos "Estado (data)" dizem o que já está pronto e onde |
| [PASSAGEM-AGRACTA.md](PASSAGEM-AGRACTA.md) | As regras da casa ("Como o app pensa") e as pendências B1–B4 e a Parte C |

## Como funciona, por área do app

| Documento | Área |
|---|---|
| [AVALIACOES-PROTOCOLO.md](AVALIACOES-PROTOCOLO.md) | Avaliações e controles no protocolo; o que a grade recusa e a leitura menor que a anterior |
| [CROQUI-NO-MAPA.md](CROQUI-NO-MAPA.md) | O croqui do ensaio no mapa, as parcelas livres e as ferramentas do mapa |
| [VER-NO-CAMPO.md](VER-NO-CAMPO.md) | A vista "Ver no campo": parcelas na grade e o tempo em DAA |
| [CAMPO-VIVO-EXPORTAR.md](CAMPO-VIVO-EXPORTAR.md) | Exportar o Campo Vivo em PNG e MP4 |
| [GALERIA-PARCELAS.md](GALERIA-PARCELAS.md) | A galeria de fotos das parcelas, guardada só no aparelho |
| [RELATORIO-E-R.md](RELATORIO-E-R.md) | O relatório do estudo e a exportação para o R |
| [INTEGRACOES.md](INTEGRACOES.md) | O Conhecimento experimental: resultados, aba Estudos, consulta do cliente e fontes externas |
| [OBSERVACAO-E-EVENTOS.md](OBSERVACAO-E-EVENTOS.md) | Observação canônica, eventos formais, tabela EPPO e a trilha formal na ficha do estudo |
| [RELEVO.md](RELEVO.md) | Como baixar o relevo do terreno (`tools/relevo-baixa.py`) |
| [PLANEJAMENTO-EQUIVALENCIA-DOSE.md](PLANEJAMENTO-EQUIVALENCIA-DOSE.md) | Estatística: quantas repetições, equivalência e curva de dose |
| [MODELOS-MISTOS-E-CONTROLE.md](MODELOS-MISTOS-E-CONTROLE.md) | Estatística: comparações contra a testemunha e modelos mistos |

## Revisões com data

Registro do que foi conferido num dia. Não são atualizados depois: o que mudou
desde então está no `LEIA-ME.txt` e no `ROADMAP.md`.

| Documento | Data |
|---|---|
| [AUDITORIA-LOGICA-2026-09-10.md](AUDITORIA-LOGICA-2026-09-10.md) | 10/09/2026 — revisão de lógica |
| [REVISAO-DRONE-ESTATISTICA.md](REVISAO-DRONE-ESTATISTICA.md) | setembro/2026 — preparo, estatística e interface |
| [REVISAO-CALCULADORAS-PROTOCOLOS-2026-09-21.md](REVISAO-CALCULADORAS-PROTOCOLOS-2026-09-21.md) | 21/09/2026 — calculadoras para protocolos |
| [BORDAS-DA-RECEITA-2026-09-21.md](BORDAS-DA-RECEITA-2026-09-21.md) | 21/09/2026 — o que sobrou da revisão das calculadoras |
| [REVISAO-ESTABILIDADE-2026-09-21.md](REVISAO-ESTABILIDADE-2026-09-21.md) | 21/09/2026 — estabilidade |

## Conformidade (BPL/GLP e ISO/IEC 27001)

Existem **dois conjuntos** com o mesmo assunto, de épocas diferentes, e os dois
ainda descrevem o Supabase. Reescrevê-los para o estado atual (Firebase) e
juntá-los num só é o item B3 da [PASSAGEM](PASSAGEM-AGRACTA.md).

- A pasta [conformidade/](conformidade/README.md): o pacote com
  [README](conformidade/README.md),
  [integridade de dados (ALCOA+)](conformidade/integridade-dados-ALCOA.md),
  [POP de acesso, assinatura e backup](conformidade/SOP-acesso-assinatura-backup.md),
  [validação do sistema](conformidade/validacao-sistema.md) e
  [ISMS](conformidade/ISMS-ISO27001.md).
- Nesta pasta: o [dossiê mestre](CONFORMIDADE-BPL-ISO-27001.md), a
  [validação do sistema (CSV)](VALIDACAO-SISTEMA.md) e o
  [modelo de ISMS do laboratório](ISMS-laboratorio-modelo.md).

A tela "Conformidade & ISMS" do app cita `docs/VALIDACAO-SISTEMA.md` pelo nome:
quem mover ou renomear esse arquivo precisa trocar a citação no `app.js`.

## Textos dos PRs automáticos

Não são para leitura: são o corpo dos PRs que os workflows abrem sozinhos.

| Documento | Usado por |
|---|---|
| [AGROFIT-PR.md](AGROFIT-PR.md) | `.github/workflows/atualizar-agrofit.yml` |
| [EPPO-PR.md](EPPO-PR.md) | `.github/workflows/atualizar-eppo.yml` |
