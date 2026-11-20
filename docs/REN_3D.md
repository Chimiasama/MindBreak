# Ren — primeiro modelo 3D cel shading

Entrega intermediária do incremento 31, em 20/11/2026. O roteiro ativo é exclusivamente [PLANO_DE_IMPLEMENTACAO.md](PLANO_DE_IMPLEMENTACAO.md); este documento descreve o recurso e suas evidências, não abre outro plano.

## Arquivos e autoria

- [Modelo GLB utilizável no app](../src/assets/models/ren-cel-v1.glb).
- [Fonte editável Blender](arte/ren3d/ren-cel-v1.blend).
- [Fonte reproduzível de construção/exportação](../tools/ren3d/build_ren.py).
- [Pintura de referência do Ren](arte/ren3d/referencia-ren.png), recuperada do histórico anterior à migração 2.5D.
- [Manifesto com inventário de peças, métricas e SHA-256](arte/ren3d/manifesto.json).

Geometria produzida no Blender 4.3.2, por superfícies moldadas com seções variáveis, painéis, curvas e mechas, com armature e grupos de vértices. Não é billboard nem imagem sobre um plano. O script salva o .blend e exporta GLB 2.0 com eixos e bind matrices explícitos, sem depender de conversões implícitas do exportador. O GLB contém skin; as animações são dirigidas pela engine, não são clipes independentes gravados no arquivo.

## Identidade e continuidade

Cabelo escuro com mechas curvas, viseira ciano com banda posterior, cachecol magenta com duas pontas, jaqueta tática com painéis/costuras, proteção no ombro direito, harness frontal e traseiro, cinto, luvas sem dedos, calça e botas com cadarços/solado. Bolsa única na coxa direita anatômica, presa por duas tiras circundantes, com fechos. O lado anatômico direito corresponde a -X no repouso olhando para +Z. Não há inversão por escala negativa.

Rosto tem maxilar, nariz, orelhas, olhos e boca em geometria; expressões/blendshapes e animação individual dos dedos não estão nesta versão. A interpretação intermediária não reproduz cada dobra da pintura nem representa aprovação artística final.

## Contrato técnico

- GLB: **541.112 bytes**, **12.946 triângulos**, **7.712 vértices**, 13 materiais e 13 juntas.
- Uma superfície lógica com 13 primitives agrupadas por material; Three.js carrega primitives como SkinnedMeshes.
- 13 materiais convertidos em MeshToonMaterial com bandas de luz no app. Materiais Blender/GLB genéricos não carregam automaticamente o shader cel do Three.js.
- Contorno por extrusão de normal antes da deformação esquelética; compartilha a skin, não amplia por escala global. Mais 13 desenhos de contorno: **26 chamadas / 25.892 triângulos por render isolado**, sem sombras/outros passes.
- Coordenadas +Y para cima, +Z para frente; referência de altura 1,75 unidades. As mesmas juntas nomeadas são dirigidas pelas poses/interpolação atuais. Fonte da física continua 32 × 56; o arquivo não altera hurtboxes, dano, alcance, velocidade ou mapas.
- GLB carregado de forma assíncrona em `renModel.ts`, com template único e instâncias de skeleton/material independentes. Geometrias são compartilhadas pelo template; materiais, skeleton e bone textures das instâncias são descartados. O template único permanece durante a sessão.
- Menu e partida usam a mesma fonte. Falha de carregamento conserva o rig procedural. Maya, Leon, inimigos e chefes continuam com seus rigs atuais.
- GLB incluído no precache PWA; build Android recebe o mesmo arquivo por Capacitor sync. Não houve APK.

## Reprodução e inspeção

```bash
blender -b -t 2 --python tools/ren3d/build_ren.py
npm run dev
# Em outro terminal, com Playwright/Chromium disponíveis:
PREVIEW_URL=http://localhost:3000 node scripts/review-ren-model.mjs
```

O script de revisão aceita PLAYWRIGHT_MODULE e CHROMIUM_PATH. Estúdio interativo: `/tools/ren-model-studio.html`, com giro e seletor de pose/vista.

- [Três quartos](arte/ren3d/three.png), [frente](arte/ren3d/front.png), [costas](arte/ren3d/back.png).
- [Lado esquerdo](arte/ren3d/left.png), [lado direito](arte/ren3d/right.png).
- [18 estados no renderer](arte/ren3d/poses.png), [cena preparada no motor](arte/ren3d/jogo.png).
- [Relatório do navegador e fallback](arte/ren3d/validacao.json).

## Validação e limites

333 testes direcionados aprovados, incluindo skin/pesos, integridade do GLB, esqueletos independentes, materiais toon e estados nas duas direções. TypeScript, build web, build de assets Android e Capacitor sync aprovados. GLB copiado para Android comparado por SHA-256 com a fonte. Chromium carregou o modelo na engine real, inspecionou 18 estados e verificou que render não modifica o estado do jogador; falha proposital do GLB preservou fallback. A cena preparada usou WebGL por software, portanto suas métricas não certificam FPS no aparelho.

A revisão visual cobre vistas e poses do modelo integrado. Queda, rasteira, golpes e morte reutilizam as poses existentes e ainda podem receber animação autoral mais refinada. A suíte exaustiva dos três arquivos exploration-routes-* não foi repetida neste lote: não foram alterados física, controles ou geometrias das fases. Acessibilidade completa, campanha manual, DualShock 4 e perfil de memória/GPU Android continuam pendentes no plano único.
