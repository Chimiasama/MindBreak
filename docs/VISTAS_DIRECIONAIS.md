# Vistas direcionais — incrementos 27–28

## 1. Regra atual

**Ren, Maya e Leon têm pinturas independentes para esquerda/direita.** O renderer seleciona o atlas/recorte da direção, sem refletir a pintura com `scale(-1,1)`.

O usuário reforçou que isso não basta: objetos conservam lado anatômico, volume e fixações, incluindo o verso. Bolsas de Ren/Maya pertencem à coxa direita; tiras continuam ao redor da mesma perna. Leon conserva duas joelheiras e suas fixações. Faixas do Ren mantêm as pontas expostas quando vistas pelo lado oposto. A corrida 4/6 dele foi redesenhada com dois braços.

A diretriz obrigatória de [continuidade visual e anatomia](CONTINUIDADE_VISUAL.md) tem prioridade sobre as simplificações de autoria anteriores. Está também em [AGENTS.md](../AGENTS.md). Não interpretar direita/esquerda como lado da tela nem apagar um acessório simplesmente por estar do outro lado. Oclusão deve ser fisicamente plausível. Corpos humanos não admitem membros extras/deformidades acidentais; exceções exigem design explícito, como uma criatura ou zumbi.

NPCs e chefes ainda usam a arte anterior. Seus próximos lotes devem adotar as mesmas regras, incluindo vistas próprias. O fallback procedural permanece disponível para evitar personagens invisíveis se uma imagem falhar; ele não é a referência de acabamento para novos sprites.

## 2. Cobertura e prévias

| Recurso | Ren | Maya | Leon |
|---|---|---|---|
| Fontes à direita / esquerda | 18 / 21 | 24 / 24 | 21 / 21 |
| Corrida direita / esquerda | 3 pinturas em 6 tempos / 6 pinturas | 6 / 6 | 6 / 6 |
| Clipes / posições lógicas por lado | 18 / 55 | 18 / 55 | 18 / 55 |
| Atlas à direita | 2560 × 2240 | 2560 × 2240 | 2560 × 960 |
| Atlas à esquerda | 2560 × 960 | 2560 × 960 | 2560 × 960 |

São 129 pinturas/vistas únicas em 15 folhas de fontes, com holds e recuperações reutilizados explicitamente. Não são 330 desenhos exclusivos. Leon não ganhou voo: seu clipe compartilhado correspondente reutiliza queda.

- [Galeria de revisão com zoom e todos os estados](REVISAO_VISUAL.html).
- [Ren — movimento](arte/ren/direcoes.png) e [continuidade completa](arte/ren/continuidade.png).
- [Maya — movimento](arte/maya/direcoes.png) e [continuidade completa](arte/maya/continuidade.png).
- [Leon — movimento](arte/leon/direcoes.png) e [continuidade completa](arte/leon/continuidade.png).
- [Entrega 28: Leon pintado e comando de voo](LEON_PINTADO_E_VOO_DA_MAYA.md).

As fontes foram editadas por geração de imagem, usando as pinturas existentes e o inventário de continuidade. Os seis atlas foram reconstruídos. Fontes e pranchas ficam em `docs/arte`; só os WebP em `src/assets` entram no jogo. Os manifestos de cada herói registram hashes, recortes e referências efetivas.

## 3. Contrato técnico

### 3.1 Seleção e carregamento

`heroDirections.ts` define chaves à esquerda, as duas fontes compactas de Leon e reutilizações. `leftAtlasMetadata()` mantém tempos, loops, eventos documentais e 55 posições lógicas, compartilhando células repetidas. Leon usa esse layout compacto nos dois lados.

`createDirectionalPaintedAtlasLoader()` valida dimensões e disponibiliza o par apenas quando ambos os lados estiverem prontos. Em falha, o herói inteiro usa fallback. Promessas e canvases ficam em cache; não há novo carregamento por quadro. Handlers da imagem temporária são removidos antes de limpar `src`, evitando erro tardio depois de uma carga bem-sucedida.

`getHeroAtlas(hero,facing)` e `getHeroMetadata(hero,facing)` escolhem os recursos correspondentes. `drawHeroFrame()` aplica escala horizontal positiva às pinturas. Parede/escalada continuam olhando para a parede indicada pelo motor.

### 3.2 Extração e alinhamento

Quadro 320 × 320, escala 0,25, pivot `(160,288)` e referência física 32 × 56 preservados. Timings, colisões e alcance/dano não são derivados das novas imagens.

O montador mede a figura na célula e usa o layout **fixo** `tools/painted-layout.json` para conservar altura/baseline. Não usa seu próprio arquivo de saída como referência para o próximo bake. A região dos pés orienta a ancoragem horizontal.

A extração identifica o retângulo do componente principal conectado, excluindo do recorte pequenos fragmentos de células vizinhas. Não altera pixels nem remove membros presos ao corpo; o braço extra do Ren foi corrigido na fonte, não por esse mecanismo. Fontes e recortes exigem inspeção visual para não confundir detalhe legítimo com resíduo.

### 3.3 Memória

Um canvas 2560 × 960 ocupa aproximadamente 9,375 MiB RGBA; 2560 × 2240, 21,875 MiB. Cada par de Ren/Maya totaliza 31,25 MiB e o de Leon, 18,75 MiB. Os três pares carregados somam cerca de **81,25 MiB**, antes de overhead/GPU e sem contar NPCs, chefes ou outras superfícies. Continua necessário medir no aparelho; tamanho comprimido dos WebP não equivale à memória decodificada.

## 4. Inspeção e reprodução

O estúdio `/tools/art-studio.html` oferece herói, direção, pose e quadro. A galeria documental reúne as pranchas com zoom.

Com Vite aberto e Playwright/Chromium configurados, executar `node scripts/build-painted-artwork.mjs <ren|maya|leon> <right|left>`. Depois, `review-directional-artwork.mjs` produz movimento/todos os estados e verifica a seleção real; `review-painted-artwork.mjs` exporta prévias, atlas e quadros. `ART_HERO=leon` pode limitar este último a um personagem.

Não há execução automática de workflows nem APK nesses comandos.

## 5. Aceite

Verificação no Chromium horizontal 915 × 412: **330 combinações de quadro/direção**, presença de pixels, seleção de atlas e ausência de reflexão. Entradas no motor real movem cada herói para os lados correspondentes. A bateria de testes verifica geometria/timing, fontes/hashes, alpha/dimensões, extração de figura e falha/carga atômica.

Anatomia, continuidade de bolsas/tiras/joelheiras/faixas e ausência de membros extras são revisadas visualmente nas fontes e no renderer; testes de pixels não comprovam esses significados. Pranchas atuais foram inspecionadas, mas o aceite artístico do usuário e o teste físico Android/DualShock 4 continuam pendentes. Evidência técnica em [validacao-direcional.json](arte/validacao-direcional.json).
