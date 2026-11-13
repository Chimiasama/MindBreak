# Arte dos inimigos — incremento 21

> **Atualização no incremento 23:** a construção em blocos, resolução, paletas e orçamento abaixo registram a V1. O renderer atual e as imagens vinculadas usam a [direção visual V2](DIRECAO_VISUAL_V2.md), com anatomia articulada, fontes maiores e sombreamento. Consultar esse contrato para os valores atuais.

## 1. Entrega e direção visual

Primeira passagem de pixel art dos **12 arquétipos**, com silhuetas distintas mesmo sem cores. Substitui o agente genérico usado por oito tipos. Fonte autoral procedural em `src/game/enemyArtwork.ts`, sem imagens ou dependências externas novas. `pixelSprites.ts`, agora sem consumidores, foi removido junto com os sprites estáticos antigos dos heróis.

| Tipo | Elementos de identificação |
|---|---|
| mib_gunner | Terno, gravata e arma curta avançada |
| mib_shield | Capacete/visor, colete e bastão; escudo frontal separado |
| cyber_hound | Quadrúpede baixo, cauda, focinho e mandíbula de ataque |
| jetpack | Tanque traseiro, capacete e chama no próprio raster |
| drone | Corpo suspenso, rotores laterais e lente central |
| mutant | Tronco largo, braços longos, garras e braço erguido na ação |
| sniper | Capuz/capa e rifle longo com mira |
| suit_martial | Punhos elevados, guarda assimétrica e postura de luta |
| samurai | Kabuto com hastes, placas de armadura e lâmina vertical |
| turret_engineer | Capacete, mochila de instalação, colete e ferramenta abaixada ao preparar |
| turret | Carcaça com placas, parafusos e núcleo; canos e suporte orientados pelo motor |
| heavy_trooper | Ombreiras largas, capacete, placas de peito e manopla; escudo frontal separado |

É arte inicial integrada, ainda sujeita a revisão de leitura e acabamento no celular. Não são novos inimigos nem mudanças de dificuldade.

## 2. Contrato de renderização

### 2.1 Fonte e dimensões

- Raster nativo **24 × 32**, paleta por tipo, transparência e coordenadas inteiras; nenhum baking em escalas fracionárias.
- Quatro posições por tipo: 0 repouso, 1 apoio A, 2 apoio B e 3 preparação/ação. Algumas posições compartilham o mesmo desenho, especialmente torretas: mira e canos são dinâmicos. Não se promete quatro desenhos exclusivos por tipo ou ciclos completos de todos os ataques.
- Render preserva `en.x/y/w/h` do mapa/runtime. A arte é ajustada à caixa de desenho existente e espelhada pelo `facing`; não redefine colisões, velocidade ou alcance. As dimensões físicas variam por tipo/mapa.
- `enemySourceRect` recorta áreas transparentes dos não humanoides antes de ajustar a imagem: cão `(0,10,24,22)`, drone `(0,8,24,24)`, carcaça da torreta `(0,4,24,25)`. Humanoides usam o quadro completo. Os testes asseguram que o recorte não elimina pixels visíveis.
- Atlas documental de **96 × 384**, quatro colunas e 12 linhas. JSON informa a linha, os quatro X e o recorte local de cada tipo. O atlas/folha documentais não entram no bundle: o jogo gera e guarda canvases nativos sob demanda.
- Limite interno do lote: 12 tipos × quatro quadros × 24 × 32 × quatro bytes = **144 KiB RGBA**, além do overhead de canvas/GPU. A torreta usa somente o quadro 0 no motor. Sem canvases novos por draw depois do cache aquecido. Medição de GPU no Android pendente.
- Nearest-neighbor na geração e no desenho. O tamanho final depende das caixas existentes e da câmera; isso não garante escala inteira em todo aparelho.

### 2.2 Estado e tempo

`enemyVisualFrame` lê o inimigo sem escrever nele, sem RNG, eventos ou efeitos de combate. Stun/morte mantêm pose neutra; preparação (`telegraph`) e estado `attack` selecionam ação; movimento horizontal acima de 0,2 alterna apoios a cada seis ticks visuais. Repouso seleciona quadro 0. O relógio visual compartilhado congela em hitstop/cut-in; a pausa impede updates no loop. Voadores parados não ganham artificialmente movimento ou impulso para animar.

Alertas, exclamações, estrelas, barra de instalação e barra de vida permanecem camadas do motor. Escudos são desenhados somente enquanto `!shieldBroken`. Não foram pintados permanentemente na fonte, portanto a quebra continua legível.

Torretas conservam extensão de canos pelo estado de alerta, mira da IA e suportes chão/teto/parede esquerda/direita. Instaladas pelo engenheiro recebem faixa âmbar. A ferramenta do engenheiro abaixa durante preparação de instalação; matar o instalador antes de concluir continua impedindo a torreta, segundo a mesma lógica anterior. A chama do jetpack foi incorporada ao raster e o retângulo antigo duplicado removido.

## 3. Prévia e autoria

- [Folha de fonte e quatro posições](arte/inimigos-sheet.png).
- [Renderizador real: estados, orientação e suportes](arte/inimigos-motor.png).
- [Atlas PNG](arte/inimigos-atlas.png) e [metadados JSON](arte/inimigos-atlas.json).

O estúdio `/tools/art-studio.html`, aberto no servidor Vite, inclui a galeria dos inimigos. A folha mostra a fonte antes de escudos, mira e demais overlays. `scripts/export-art-previews.mjs` exporta heróis e inimigos de forma manual; instruções e variáveis de ambiente em [ARTE_E_ANIMACAO.md](ARTE_E_ANIMACAO.md#3-inspeção-e-reprodução). A imagem `inimigos-motor.png` registra o ensaio instrumentado do renderizador, com estados preparados; não é um mapa jogável nem uma fase da campanha.

Para alterar arte, editar `enemyRows`/paletas, exportar, conferir fonte e desenho nas dimensões reais. Para adicionar um arquétipo, expandir `EnemyType`, catálogo gráfico, IA/mapas e testes como alterações próprias; uma entrada visual não cria comportamento.

## 4. Evidências e limites

**395 testes aprovados**, incluindo máscaras de silhueta distintas sem cor, paletas/limites de todos os quadros, recortes sem perda, escolha de estado sem mutação e variação de apoios/instalação. Regressões existentes incluem instalação interrompida por morte, torretas montadas, mira, projéteis e obstáculos.

Chromium em viewport horizontal com touch chamou o renderizador real para 48 combinações de tipo/estado/orientação, verificou ausência de mutação do inimigo e reaproveitamento do cache, desenhou os quatro suportes de torreta e comparou pixels antes/depois de quebrar escudo. Sem exceções JavaScript. Fontes e imagem do motor inspecionadas visualmente. É ensaio com estado preparado, sem campanha manual completa ou certificação Android/DualShock 4.

TypeScript, build web, build de assets Android e Capacitor sync aprovados. Bundle JS de produção: 462,74 kB / 142,59 kB gzip, cerca de +3,22 / +1,38 kB sobre o incremento 20. Não houve APK, Action, alteração de save, IA, dano, colisão, pontuação, respawn, música ou estrutura das fases.

Atualização no incremento 22: primeira passagem dos oito chefes/duas fases integrada; ver [ARTE_DOS_CHEFES.md](ARTE_DOS_CHEFES.md). Próximos blocos: cut-ins/retratos (7.2.0.3) e ambientes (7.3). Permanecem pendentes ensaio físico e refinamento dos ciclos/silhuetas; não marcar a fase 7 inteira como concluída.
