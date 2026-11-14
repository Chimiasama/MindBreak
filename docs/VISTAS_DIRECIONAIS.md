# Vistas direcionais — incremento 27

## 1. Regra de identidade

Ren e Maya agora têm imagens próprias para olhar/mover-se à esquerda e à direita. A direção escolhe **outro atlas e outros recortes**, sem `scale(-1,1)` no desenho pintado. Virar não deve duplicar ombreiras, emblemas, bolsos, coldres ou equipamentos no lado oposto do corpo.

Direita/esquerda de um acessório significa o lado **anatômico do personagem**, não o lado da tela. Nas novas vistas à esquerda, vemos principalmente o flanco direito: Ren mostra manga escura simples em vez da ombreira segmentada próxima da câmera; Maya mostra a manga verde simples em vez do painel dourado da outra vista. Tiras, sobreposição da roupa e equipamento da perna têm desenho próprio. Cachecol, cabelo e abas podem mudar com o movimento; a posição anatômica de seus pontos de fixação deve permanecer coerente.

**Regra para a continuidade da produção:** Leon, inimigos e chefes deverão receber pares autorais na sua revisão visual. Eles ainda usam o renderer anterior com espelhamento; esta entrega migra Ren e Maya. O fallback procedural também permanece espelhado se uma imagem não carregar, para evitar personagens invisíveis. Isso não é o acabamento aprovado para novos recursos.

## 2. Arte integrada e prévias

| Recurso | Ren | Maya |
|---|---|---|
| Pinturas novas à esquerda | 21 | 24 |
| Corrida à esquerda | 6 chaves | 6 chaves |
| Demais ações | repouso, salto/queda, parede/escalada, hang/vault, dash/slide, três golpes, dano, especial e morte | mesmas ações, stun próprio e duas chaves de voo |
| Clipes / posições lógicas por direção | 18 / 55 | 18 / 55 |
| Atlas à esquerda | 2560 × 960, WebP alpha | 2560 × 960, WebP alpha |
| Arquivo adicional | 466.326 bytes | 600.566 bytes |

Os atlas existentes à direita foram conservados. Ren mantém três pinturas de corrida reutilizadas nos seis tempos à direita; a nova corrida à esquerda tem seis pinturas. Holds, recuperações e escalada reutilizam fontes explicitamente. Não são 55 desenhos exclusivos por direção.

- [Ren — comparação dos seis tempos de corrida, repouso, salto e queda](arte/ren/direcoes.png).
- [Maya — comparação dos seis tempos de corrida, repouso, salto e queda](arte/maya/direcoes.png).
- [Ren — repouso, corrida, golpe e recuperação](arte/ren/orientacao.png).
- [Maya — repouso, corrida, golpe e recuperação](arte/maya/orientacao.png).
- [Ren — manifesto à esquerda](arte/ren/manifesto-esquerda.json).
- [Maya — manifesto à esquerda](arte/maya/manifesto-esquerda.json).

As fontes novas foram produzidas por geração de imagens com as pinturas anteriores como referência e revisadas para retirar detalhes indevidamente repetidos no lado próximo. São as folhas `05-esquerda-locomocao.png` e `06-esquerda-acoes.png` em `docs/arte/<heroi>/fontes`. Os originais de autoria ficam fora do aplicativo; os WebP em `src/assets` entram nos builds web e Android.

## 3. Contrato técnico

### 3.1 Seleção e carregamento

1. `heroDirections.ts` define a origem de cada pose à esquerda, os seis tempos da corrida e os recortes das fontes. Dois recortes do Ren excluem uma extremidade vizinha que invadia a margem vazia da célula.
2. `leftAtlasMetadata()` mantém durações, loop, eventos documentais e 55 posições lógicas. Poses iguais compartilham uma célula, resultando em 21/24 células reais.
3. `createDirectionalPaintedAtlasLoader()` carrega e valida dimensões dos dois arquivos. Só disponibiliza o par quando ambos estiverem prontos; falha em um lado usa o fallback do herói inteiro. As promessas ficam em cache, sem novos carregamentos por frame.
4. Ao liberar a imagem temporária depois de copiá-la ao canvas, seus handlers são removidos antes de limpar `src`. Isso evita um evento de erro tardio transformar uma carga bem-sucedida em falha.
5. `getHeroAtlas(hero, facing)` e `getHeroMetadata(hero, facing)` selecionam pixels e retângulos correspondentes. `drawHeroFrame()` desenha pinturas com escala horizontal positiva nos dois sentidos. Parede/escalada continuam usando o lado da parede indicado pelo motor.

### 3.2 Alinhamento e gameplay

Quadro de 320 × 320, escala de mundo 0,25, pivot `(160,288)` e referência física 32 × 56 preservados. O montador mede a silhueta alpha da fonte e a ajusta à altura/baseline da pose anterior, usando a região dos pés para ancoragem horizontal e margem para não cortar a figura. Mudanças na extensão do cachecol/casaco não reposicionam a colisão.

Sem mudança em aceleração, salto, voo, alcance/dano, janelas de combo, exploração, itens ou áudio. As imagens não disparam eventos de combate. A morte continua sujeita à pausa do fluxo de continue já documentada.

### 3.3 Memória

Cada canvas adicional de 2560 × 960 ocupa aproximadamente **9,375 MiB RGBA**, antes de overhead/GPU. Sem compactar as poses repetidas seriam 21,875 MiB. Cada par direita/esquerda ocupa cerca de 31,25 MiB; os dois heróis carregados totalizam 62,5 MiB nesses canvases, sem contar Leon, inimigos, chefes ou outras superfícies. Carregamento por herói sob demanda e ausência de alocação de canvas por quadro foram mantidos. Profiling no Android físico continua necessário.

Os dois arquivos novos somam aproximadamente 1,02 MiB comprimidos. Não confundir tamanho WebP com memória decodificada.

## 4. Inspeção e exportação manual

O estúdio `/tools/art-studio.html` tem seleção de direção para inspecionar, animar e exportar o atlas correspondente. A orientação faz parte da escolha do recurso, não muda os estados do jogo.

Com Vite aberto e Playwright/Chromium disponíveis, usar as mesmas variáveis de browser já documentadas para os scripts anteriores:

```bash
node scripts/build-painted-artwork.mjs ren left
node scripts/build-painted-artwork.mjs maya left
node scripts/review-directional-artwork.mjs
node scripts/review-painted-artwork.mjs
```

`right` continua disponível para reproduzir o bake anterior. Os manifestos registram hashes das fontes e do WebP, dimensões e recortes. Nenhum desses comandos cria APK ou executa Actions.

## 5. Validação e próximos aceites

**22 testes direcionados aprovados**, cobrindo os dois heróis, animação, horários de impacto, referência física, cobertura de fontes, hashes/alpha/dimensões, compactação e carga atômica/falha/limpeza da imagem. TypeScript e builds web/assets Android com Capacitor sync aprovados.

Chromium horizontal 915 × 412 com suporte a touch verificou **220 combinações de quadro/direção**: pixels presentes, atlas selecionado, ausência de reflexão e bordas dos novos recortes. Comparações de pixels confirmam que as novas poses não são apenas o reflexo das anteriores. O motor real foi atualizado com entradas esquerda/direita pela fonte de toque e selecionou os respectivos atlas durante a movimentação. Não foi um teste manual de campanha nem toque físico no aparelho. Sem erros JavaScript; evidência em [validacao-direcional.json](arte/validacao-direcional.json).

Pranchas de movimento e combate inspecionadas visualmente. Intermediários de animação, uniformidade fina de anatomia/acessórios entre todas as pinturas e leitura/custo em celular continuam sujeitos a refinamento e ao aceite do usuário. Nenhuma Action disparada ou APK gerado.
