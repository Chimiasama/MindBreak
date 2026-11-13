# Arte e animação — incremento 20

## 1. Escopo entregue

Primeira passagem de pixel art procedural dos três heróis, substituindo a imagem estática e as rotações/inversões usadas para slide e hang. São **18 clipes e 55 posições de quadro por herói**; quadros podem repetir componentes ou poses para sustentar uma ação. Isso não significa 55 desenhos exclusivos nem arte final aprovada no aparelho.

Fontes editáveis: `src/game/heroArtwork.ts` (raster e paletas) e `src/game/heroAnimation.ts` (contrato, estados e tempos). Integração: `src/game/engine.ts`. Produção local por código, sem imagens, modelos, samples ou dependências externas adicionadas; as prévias são exportações dessa fonte.

Ren usa roupa azul-escura, faixa/cachecol magenta e visor ciano; Maya tem cabelo e roupa verde-petróleo, guarnições douradas e pernas claras; Leon tem tronco/ombros mais largos, armadura vermelha e manoplas laranja. Contorno escuro e áreas claras ajudam a separar cabeça, braços e pernas. O cachecol físico e os efeitos existentes permanecem independentes do atlas.

## 2. Contrato técnico

1. Quadros de **24 × 32 pixels**, orientação original à direita; espelhar apenas no eixo X para a orientação real. Escalada/parede olham para a parede.
2. Pivot no centro dos pés, `(12,32)`. Escala de desenho 2: sprite de 48 × 64 unidades de mundo, centrado na caixa física de 32 × 56. Margem gráfica de oito unidades em cada lado e acima; não usar a borda da imagem como colisão.
3. Metadado `hurtbox: {x:4,y:4,w:16,h:28}` é referência da caixa de pé, em pixels da fonte. Colisões e exceções físicas, inclusive a caixa de slide, continuam calculadas pelo motor. Alcance dos golpes continua em `combat.ts`/motor, sem hitboxes de dano derivadas da arte.
4. Oito colunas; atlas de **192 × 224**, transparência RGBA, nearest-neighbor, coordenadas inteiras. Fonte sem rotação de poses. A câmera ainda pode aplicar sua escala: não se promete escala inteira final em todo celular.
5. `HERO_ATLAS` contém versão, dimensões, pivot, referência física e clipes com retângulos/durações. PNG/JSON usam nomes `<hero>-atlas.*`; `<hero>-sheet.png` é a folha de contato com duração e índice.
6. Tempo em ticks de 60 Hz. Relógio visual avança somente em updates efetivos, após hitstop e cut-in; o loop não chama update durante pausa. Amostrar a imagem repetidamente não avança o clipe.
7. Prioridade: morte → stun → dano → especial → slide → combo → dash → hang → vault → voo → parede/escalada → salto/queda → corrida/idle. Dano, vault e especial têm temporizadores exclusivamente visuais. Entrada em área, resgate e troca de teste reiniciam os estados visuais.
8. Os três combos usam `SWINGS`: dois cortes de 11 ticks, finalizador de 16; primeiro quadro de impacto de um tick, segundo até terminar a janela ativa, terceiro durante recuperação. A amostra usa `slashTimer`, inclusive ao encadear. O evento documental `impact` não dispara dano/som: o comando de combate já faz isso, uma única vez.
9. Atlas são gerados uma vez por herói sob demanda e mantidos em cache; draw recorta um quadro. Cada atlas ocupa aproximadamente 168 KiB RGBA, três cerca de **504 KiB**, fora overhead de canvas/GPU. Limite inicial deste lote: três atlas de até 256 × 256, sem alocação de canvas por frame. Medição real de GPU/Android ainda pendente.

| Clipe | Quadros | Ticks por quadro | Repetição |
|---|---:|---|---|
| idle | 4 | 12,12,12,12 | sim |
| run | 6 | 5,5,5,5,5,5 | sim |
| jump / fall | 2 cada | 6,8 / 8,8 | segura último / sim |
| wall / climb | 2 / 4 | 10,10 / 5,5,5,5 | sim |
| hang / vault | 2 / 3 | 12,12 / 3,3,4 | sim / segura último |
| dash / slide | 3 / 2 | 3,3,4 / 6,6 | segura último / sim |
| attack1 / attack2 | 3 cada | 1,5,5 | segura último |
| attack3 | 3 | 1,7,8 | segura último |
| hurt / stun | 2 cada | 5,7 / 7,7 | segura último / sim |
| special / flight | 4 cada | 5,5,5,5 / 7,7,7,7 | segura último / sim |
| death | 4 | 5,5,6,8 | segura último |

**Limite do fluxo de morte:** o jogo pausa imediatamente ao entrar em continue/game over. O atlas contém a sequência, mas o fluxo atual mantém a primeira pose de morte; este lote não adia o continue para reproduzir todos os quadros. Quadros de voo existem no pipeline compartilhado; a habilidade continua exclusiva de Maya.

## 3. Inspeção e reprodução

Com `npm run dev`, abrir `/tools/art-studio.html`. Escolher herói/pose, animar ou arrastar quadro, mostrar a caixa física de referência e baixar PNG/JSON. A caixa é só ferramenta de autoria, nunca aparece para o jogador.

Exportação manual com servidor aberto, Playwright e Chromium disponíveis:

```bash
PREVIEW_URL=http://localhost:3000 \
PLAYWRIGHT_MODULE=/caminho/playwright/index.mjs \
CHROMIUM_PATH=/usr/bin/chromium \
node scripts/export-art-previews.mjs
```

As variáveis de browser são opcionais quando essas ferramentas estão instaladas no ambiente padrão. Não há download automático, Action ou geração de APK. `docs/arte` e o estúdio não são entradas do build de produção; o jogo usa a fonte raster empacotada.

- [Ren: quadros](arte/ren-sheet.png), [atlas](arte/ren-atlas.png), [JSON](arte/ren-atlas.json).
- [Maya: quadros](arte/maya-sheet.png), [atlas](arte/maya-atlas.png), [JSON](arte/maya-atlas.json).
- [Leon: quadros](arte/leon-sheet.png), [atlas](arte/leon-atlas.png), [JSON](arte/leon-atlas.json).

## 4. Validação e próximos lotes

390 testes aprovados, incluindo prioridade de estados, loop/retenção, sincronização com janelas do combo, ausência de avanço por render, congelamento no hitstop/cut-in, paletas, dimensões e limites de todos os quadros. TypeScript, build web, build de assets Android e Capacitor sync aprovados.

Chromium em viewport horizontal com touch: renderização real de corrida/salto/primeiro golpe dos três heróis, congelamento em hitstop e pausa pela interface, sem exceções JavaScript. Estado e cenário foram preparados para isolar o ensaio; não representa campanha manual completa. Folhas de contato foram inspecionadas visualmente. Não houve APK nem ensaio físico Android/DualShock 4.

Próximos lotes: diferenciar os **12** arquétipos inimigos por silhueta/arma/postura (torretas já têm desenho montado próprio), depois chefes/transformações, retratos/cut-ins e ambientes. Revisar leitura e ciclos em aparelho antes de tratar esses sprites como acabamento final. Direção de tiles e orçamento de cenário continuam pendentes. Tipografia e controles configuráveis seguem na fase 8. Não modificar novamente exploração, sons ou regras de recompensa neste lote.
