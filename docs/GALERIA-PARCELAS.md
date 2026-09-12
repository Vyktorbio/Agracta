# Galeria local de parcelas

Disponível em Conhecimento → Estudos → abrir estudo → Fotos locais.

## Uso

Escolha tratamento, repetição e data antes de fotografar ou importar. A identificação da parcela é opcional. Selecione e ordene as fotos, confira a prévia e baixe o PowerPoint de 4, 6 ou 8 imagens por slide. O último slide pode ter menos imagens. O ZIP conserva os originais e inclui as legendas em JSON.

As fotos permanecem neste navegador, neste aparelho e nesta conta. Limpar os dados do navegador, usar uma janela temporária ou perder o aparelho pode apagar a galeria. O download não remove os registros; a exclusão exige uma ação explícita.

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
