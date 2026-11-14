# Leon pintado, voo da Maya e revisão de continuidade — incremento 28

## 1. Comando de salto e voo

Maya faz um salto normal ao apertar PULO. **Manter esse primeiro toque não ativa voo.** Para voar, soltar PULO, apertar novamente no ar e manter pressionado; o direcional controla o deslocamento. Soltar o segundo toque encerra o voo. Um segundo toque rápido, já solto ao atualizar a simulação, mantém o salto aéreo anterior.

`requestJump()` distingue um novo pedido aéreo do botão apenas mantido; `flightRequested` é uma intenção transitória, separada de `jumpHeld`. O primeiro salto, o coyote jump, wall-kick e vault não armam voo. A checagem de voo continua exigindo Maya, energia, ausência de chão/parede/cano e ausência de stun. A intenção é descartada ao soltar, pousar, encostar na parede, sofrer dano válido, esgotar energia, pausar, recarregar área ou trocar personagem. Energia regenerada não reativa voo sozinha. Não é um estado persistido em save.

Teclado usa um novo pressionamento de Espaço, toque usa novo pointerdown e controle usa uma nova borda do botão 0 (✕ no DualShock 4). Manter o botão não enfileira novas ações. A descrição da Maya na seleção explica o comando atualizado. Altura/gravidade do salto normal, velocidade, capacidade de voo e consumo por tick foram preservados.

A rota física da ilha de voo da fábrica agora executa salto, soltura e novo toque antes de voar; continua alcançável com orçamento finito de foco. Ren e Leon mantêm seus saltos comuns/duplos.

## 2. Próximo protagonista: Leon

Leon recebeu **42 pinturas-fonte**, 21 por direção, em quatro folhas. Duas vistas independentes com seis chaves de corrida por lado, repouso, salto/queda, parede/escalada, hang/vault, dash/slide, três golpes, dano, especial e morte. Stun reutiliza dano e o clipe compartilhado de voo reutiliza queda; Leon não ganhou voo.

Anatomia humana musculosa, rosto/cabelo castanho, colete vermelho sem mangas, calça escura, manoplas laranja, botas pesadas e joelheiras. Ataques mostram punho, uppercut e golpe pesado. A arte não altera dano, superarmadura, quebra de escudo/parede, alcance ou timing.

Atlas de **2560 × 960 por direção**, WebP com alpha; holds compartilham células. Cada lado ocupa 9,375 MiB RGBA, ambos cerca de 18,75 MiB, antes de overhead/GPU. Os três protagonistas com todos os lados carregados usam cerca de 81,25 MiB nesses canvases; NPCs, chefes e outras superfícies são adicionais. Teste de memória no aparelho segue pendente.

- [Leon — prévia ampliada](arte/leon/previa.png).
- [Leon — corrida nas duas direções](arte/leon/direcoes.png).
- [Leon — revisão de todos os estados](arte/leon/continuidade.png).
- [Leon — captura no aplicativo](arte/leon/jogo.png).
- [Manifesto à direita](arte/leon/manifesto.json) e [à esquerda](arte/leon/manifesto-esquerda.json).

## 3. Correção de continuidade solicitada durante a revisão

O usuário apontou joelheiras que desapareciam do Leon, bolsas/tiras que sumiam ao virar Ren/Maya, pontas de faixas apagadas e um braço extra na corrida 4/6 do Ren. Criada a diretriz obrigatória [CONTINUIDADE_VISUAL.md](CONTINUIDADE_VISUAL.md), também referenciada em [AGENTS.md](../AGENTS.md).

Revisadas **15 folhas de fontes dos três protagonistas**, cobrindo 129 pinturas/vistas únicas. A correção foi feita nas fontes, seguida da reconstrução dos seis atlas usados no jogo, não apenas numa prancha de conceito. Bolsas na coxa direita anatômica de Ren/Maya, tiras circundantes e seus trechos de trás; pontas magenta do Ren; duas joelheiras do Leon, com bordas e fixações em passadas/poses diferentes. A corrida 4/6 à esquerda do Ren foi redesenhada com dois braços em movimento normal. Demais poses foram inspecionadas quanto a articulações, membros e resíduos entre células.

O repouso do Ren foi redesenhado olhando à direita. O bake deixou de inverter aquela fonte; virar a imagem apagaria a distinção anatômica recém-corrigida. Repouso e recuperação continuam na direção do comando.

A revisão não transforma o PNG em modelo 3D nem prova consistência semântica por testes. Oclusões, mudanças de perspectiva e anatomia são objeto de inspeção visual; refinamento e aceite do usuário continuam necessários. NPCs/chefes ainda usam a arte anterior e deverão seguir a mesma diretriz nos seus próximos lotes, sem tratar deformações acidentais como característica do design.

## 4. Produção reproduzível

O montador passou a usar os limites alpha das fontes e a referência fixa `tools/painted-layout.json` para os seis atlas. A referência conserva alturas/baselines anteriores por pose, sem ler o próprio arquivo de saída para determinar o próximo bake. Pés ancoram horizontalmente a pose, margens evitam cortes e nenhum canvas novo é criado por quadro no runtime.

Manifestos incluem nomes/hashes das fontes, recortes efetivos, layout fixo e referência à diretriz de continuidade. Fontes ficam em `docs/arte/<heroi>/fontes`; WebP em `src/assets/<heroi>`. O estúdio mantém escolha de direção. A [galeria de revisão com zoom](REVISAO_VISUAL.html) reúne movimento e todos os estados lado a lado.

Com Vite aberto e as variáveis Playwright/Chromium dos scripts de arte:

```bash
node scripts/build-painted-artwork.mjs ren right
node scripts/build-painted-artwork.mjs ren left
node scripts/build-painted-artwork.mjs maya right
node scripts/build-painted-artwork.mjs maya left
node scripts/build-painted-artwork.mjs leon right
node scripts/build-painted-artwork.mjs leon left
node scripts/review-directional-artwork.mjs
node scripts/review-painted-artwork.mjs
node scripts/review-maya-flight.mjs
```

## 5. Validação

A suíte geral final concluiu **445 testes sem falhas**, depois da revisão das imagens. Inclui salto/voo, polling do controle, liberação/interrupções, rota física da fábrica, extração de figuras e regressões de campanha/combate/arte.

Chromium horizontal 915 × 412 verificou os três heróis em **330 combinações de quadro/direção**, atlas distintos, recortes preenchidos e seleção sem espelhamento. Fontes e pranchas do runtime inspecionadas visualmente. Isso não equivale a detecção automática de joelheiras ou contagem semântica de braços.

Ensaio adicional usou os handlers reais do aplicativo: toque mantido do primeiro salto voltou ao chão com foco 100 e nenhum tick de voo; soltar/apertar novamente ativou voo e consumiu foco; soltar cancelou. Sequência equivalente aprovada pelo teclado. Controle testado por polling simulado nos testes, não por DualShock físico. Evidências em [validacao-direcional.json](arte/validacao-direcional.json) e [validacao-voo-maya.json](arte/validacao-voo-maya.json).

TypeScript, builds web/assets Android e Capacitor sync verificados. Sem geração de APK ou execução de Actions. Não alterados mapas, música, recompensas ou política de troca no continue.
