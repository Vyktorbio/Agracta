# Galeria local de parcelas

Disponível em Conhecimento → Estudos → abrir estudo → Fotos locais.

## Uso

Escolha tratamento, repetição e data antes de fotografar ou importar. A identificação da parcela é opcional. Selecione as fotos, confira a prévia e baixe o PowerPoint de 4, 6 ou 8 imagens por slide. O último slide pode ter menos imagens. O ZIP conserva os originais e inclui as legendas em JSON.

As fotos permanecem neste navegador, neste aparelho e nesta conta. Limpar os dados do navegador, usar uma janela temporária ou perder o aparelho pode apagar a galeria. O download não remove os registros; a exclusão exige uma ação explícita.

## Ordem dos slides

A escolha fica na tela dos slides (Montar apresentação → Ordem dos slides) e começa em **T1, T2, T3… (todas as repetições de cada)**, para qualquer foto: tirada em sequência, uma a uma ou importada. As fotos em sequência são tiradas andando pelo campo, na ordem sorteada das parcelas (101 = T3 R1, 102 = T1 R1…); os slides não seguem essa ordem, seguem a do protocolo, que é como quem lê o relatório compara.

1. Uma avaliação depois da outra (data; no mesmo dia, a ordem das avaliações do estudo: 1, 2, 4 e 24 HAT).
2. Dentro de cada avaliação, T1 com todas as repetições, depois T2, T3… na ordem do cadastro de tratamentos (T10 depois de T9).
3. Várias fotos da mesma parcela e data ficam juntas, na ordem em que foram guardadas. As setas trocam a ordem só entre elas (a vista geral antes do detalhe).

**Na ordem em que tirei** volta à ordem guardada, e as setas mudam qualquer foto de lugar. A escolha fica lembrada neste aparelho; o relatório Word/PDF usa sempre T1, T2, T3…

Tratamento apagado do cadastro vai para o fim da avaliação, sem sumir. A grade da galeria, a prévia, o PowerPoint e o ZIP de originais (001_, 002_…) seguem a ordem escolhida (FotosCore.ordemDosSlides, testada em tests/test_fotos_ordem_slides.js).

## Isolamento

- Banco IndexedDB separado: agracta-fotos-locais, escopo por usuário, quadra e estudo.
- A ponte galeria-fotos.js transmite somente metadados projetados e cegados ao iframe.
- O iframe não devolve fotos ou mensagens ao aplicativo.
- CSP da galeria bloqueia conexões de rede e envio de formulários. Imagens exibidas usam URLs locais de blobs.
- Nenhuma alteração no objeto de estudos, save(), outbox, Firebase ou Supabase.
- A galeria fecha quando a conta sai ou muda.
- Exportação no aparelho, com o escritor OOXML/ZIP derivado do modelo de prancha.html.
- PPTX mantém proporção das imagens, usa cópias JPEG de até 2048 pixels e legendas editáveis. O arquivo original fica intacto no banco e no ZIP.
- Até 100 fotos por estudo e 30 MB por imagem; falta de espaço produz erro sem marcar a foto como salva.

## Verificação

test_fotos_locais.js cobre persistência e separação de contas/estudos, originais, ordenação, falha de armazenamento e estrutura/legendas/proporções do PPTX.
test_fotos_fluxo.js cobre contexto externo recusado, captura simulada, prévia, exportação, exclusão e fechamento ao sair, com APIs de rede bloqueadas.
A renderização dos três layouts foi conferida com imagens sintéticas de teste. Câmera física Android e abertura no PowerPoint nativo não foram executadas nesta sessão.

## Fotos durante a avaliação

Na grade, use **Foto** na linha da parcela. No modo automático, use **Fotografar esta parcela**. A nota atual é persistida e a galeria abre com tratamento, repetição, avaliação, data e parcela preenchidos. Toque em **Tirar foto** para capturar. Ao fechar a galeria, a avaliação continua na mesma posição. O armazenamento das fotos permanece exclusivamente local.
