# Plano único de execução — MIND//BREAK

Revisão consolidada: 20/11/2026. Este é o único roteiro ativo do projeto. Unifica o plano original, a transição 2.5D e os incrementos 29–33. O histórico e as evidências ficam em EXECUCAO.md; documentos de sistemas são contratos técnicos, não planos concorrentes. A análise inicial DOCUMENTO_TECNICO.md é histórica.

## 0. Requisitos permanentes e prioridades

1. Jogabilidade dos três protagonistas e exploração são critérios de aceite de toda entrega. Arte não modifica alcance, colisão, dano, velocidade ou consumo para acomodar o desenho.
2. Oito capítulos, 26 setores. Exploração com caminhos altos, médios e baixos, retornos, mecanismos, bloqueios persistentes, segredos e atalhos dentro do capítulo. Sem voltar do capítulo 6 para o 2. O trem é a exceção linear, com ação e obstáculos.
3. A rota obrigatória deve funcionar com qualquer protagonista, inclusive Leon com salto único e sem pickup de salto ou plataforma móvel obrigatória. Rotas de Ren, Maya e Leon são vantagens opcionais, não chaves para completar a campanha.
4. Troca livre continua como teste. Na versão final, após a escolha inicial, troca apenas no continue. Não trocar ao atravessar portas.
5. Respawn após afastamento significativo; persistência recompensada com pontuação decrescente por spawn (1.000 → 500 → 50 → 0), sem pontuação no HUD. Não remover farm de vidas nem impor teto novo sem decisão de balanceamento.
6. Android com Capacitor/WebView, paisagem, modo imersivo, safe areas, voltar com confirmação, toque e DualShock 4. Workflows exclusivamente workflow_dispatch. Não executar Actions nem gerar APK/AAB sem pedido expresso. Publicar código e recursos concluídos no GitHub.
7. Saves devem funcionar na versão atual. Compatibilidade com versões anteriores não é prioridade nesta fase.
8. Apresentação 2.5D em Three.js, simulação 2D a 60 Hz, entrada e colisão independentes do renderer. Multiplayer e migração para outra engine permanecem futuros.
9. Arte cel shading/cartunesca/anime, proporções humanas e silhueta legível no jogo. Não confundir modelo intermediário com arte final aprovada.
10. Continuidade obrigatória: mesmo inventário e lado anatômico em todas as poses; bolsas na coxa direita de Ren/Maya, joelheiras nas duas pernas do Leon, fixações e verso reais. Em 3D, girar o volume; não usar escala negativa para inverter acessórios. Anatomia sem membros extras, fundidos ou fragmentos. Deformidade somente intencional no design.

## 1. Base atual e limites do aceite

| Sistema | Estado consolidado |
|---|---|
| Física, relógio, entradas e colisão varrida | Implementados; continuar regressões por protagonista |
| Combate, IA, torretas e oito chefes em duas fases | Base implementada; balanceamento integral pendente |
| 26 setores e exploração confinada ao capítulo | Implementados; ritmo, orientação e combate em campanha integral pendentes |
| Save local e checkpoints | Implementados; validar versão atual |
| Web Audio, temas e efeitos | Implementados; mixagem e escuta física pendentes |
| Android e workflow manual | Preparados; ensaios físicos continuam separados |
| Renderizador 2.5D e rigs procedurais | Implementados; modelos autorais e profiling pendentes |
| Controles configuráveis e acessibilidade visual | Incremento 30 implementado; manter regressões |
| Pinturas 2D anteriores | Referência e fallback; produção de novas folhas de sprites deixa de ser o fluxo principal |

Geometria validada não equivale a campanha vencida, arte aprovada ou 60 fps comprovados no Android. Animação interpolada não garante desempenho de 60 fps.

## 2. Etapa ativa — incremento 31: Ren autoral e contrato de modelos

### 2.1 Consolidação — executar primeiro

- **31.1.1:** manter este documento como única fila; atualizar estados aqui e evidências em EXECUCAO.md. Não acrescentar outro roteiro por adendo.
- **31.1.2:** preservar referências históricas de arte e registrar inventário anatômico. Reintroduzir diretrizes permanentes no AGENTS.md.
- **31.1.3:** conferir commit remoto e preservar trabalho local anterior sem integrar a antiga revisão de sprites do Cipher por acidente.

### 2.2 Primeiro modelo — Ren intermediário cel shading

- **31.2.1:** partir do Ren pintado, não redesenhar sua identidade a partir do rig geométrico atual. Cabelo escuro em mechas moldadas, viseira ciano, cachecol magenta com pontas, jaqueta tática em camadas, harness, bolsa direita com duas tiras circundantes, luvas, calça e botas detalhadas.
- **31.2.2:** construir fonte editável Blender e GLB com geometria própria, articulação e materiais nomeados. Corpo e roupa devem ter contornos moldados e proporções coerentes; detalhes não se limitam a caixas/cilindros sobrepostos.
- **31.2.3:** cel shading aplicado no app com bandas de luz e contorno compatível com deformação; materiais Blender são fonte, não garantia de shader toon portátil no GLB.
- **31.2.4:** fixar unidades, orientação, nomes dos ossos, baseline, pontos de arma e materiais. Reutilizar estados/tempos existentes; manter a engine responsável pelo deslocamento físico e pelos eventos de dano.
- **31.2.5:** integrar carregamento assíncrono com fallback procedural, erro seguro e descarte de instâncias. Usar o mesmo modelo no menu e na partida. Não copiar recursos GPU sem controle de propriedade.
- **31.2.6:** inspecionar frente, verso, ambas as direções e poses: repouso, corrida, salto, queda, parede, escalada, hang, vault, dash, slide, três golpes, dano, stun, especial, voo/fallback e morte. Modelo utilizável não implica que todos os clipes já tenham animação autoral final.
- **31.2.7:** medir triângulos, materiais, chamadas de desenho e tamanho. Capturar prévias reproduzíveis do GLB efetivamente carregado, não usar uma pintura como evidência de modelo 3D.

### 2.3 Estado do primeiro lote — incremento 31A

Plano único consolidado; Ren .blend/.glb e carregamento no menu/partida implementados. 333 testes direcionados e builds/sync aprovados; evidências e limitações em [REN_3D.md](REN_3D.md) e EXECUCAO.md. Aceite artístico do usuário e desempenho no aparelho pendentes. O incremento 31 completo continua parcial; demais heróis, chefes e biomas não foram antecipados.

### 2.4 Critério de saída deste lote

Plano unificado; Ren em arquivo real .blend/.glb; carregamento no app e menu; continuidade revisada; nenhuma alteração involuntária de física; testes pertinentes, TypeScript, build web, assets Android e sync quando aplicável. Registrar desempenho medido no navegador separadamente de Android real. Nunca declarar modelo final aprovado pelo usuário sem seu aceite.

## 3. Jogabilidade e exploração — trabalho contínuo antes de ampliar elenco/biomas

### 3.1 Contrato dos protagonistas

| Herói | Identidade atual | Aceite obrigatório |
|---|---|---|
| Ren | Mais ágil, wall-jump direcional e pulo psy | Alternância de paredes legível, sem impulso fantasma ou dano através de terreno |
| Maya | Salto no primeiro toque; segundo toque aéreo mantido ativa voo direcional; pulo psy | Soltar/interromper cancela voo; energia não o reativa sozinha; diagonais normalizadas |
| Leon | Salto único, superarmadura, quebra de escudos/paredes e fogo | Percurso principal completo sem depender de habilidades alheias, pickup ou troca de teste |

- **J.1:** testar mobilidade real por teclado, toque e gamepad; registrar custo, alcance, janelas e dificuldade separadamente do visual.
- **J.2:** revisar salto, coyote, buffer, wall-jump, voo, plataformas, teto/cano, dash e rasteira depois de alterar geometria ou controles.
- **J.3:** preservar combate por estado, preparação e recuperação, cobertura por terreno, reflexão e exceções explícitas de projéteis.

### 3.2 Aceite exploratório por capítulo

- **E.1:** percorrer rota obrigatória e retorno com cada herói; sem teleportar, abrir portões artificialmente ou usar troca de teste no percurso aceito.
- **E.2:** separar ensaio geométrico com combate isolado de playtest com inimigos, objetos móveis, recursos e checkpoints ativos.
- **E.3:** conferir que mecanismos exigem deslocamento e retorno, que cada portão sinaliza sua origem e que há orientação visual sem revelar todos os segredos.
- **E.4:** conferir recompensa/retorno dos atalhos de habilidade e ausência de softlock após morte, troca no continue, save/reload e retorno entre setores.
- **E.5:** individualizar redes por setor; a base modular compartilhada não substitui variedade de percursos. Não trocar exploração por um corredor ao enriquecer o cenário 3D.
- **E.6:** trem: ritmo de ação, obstáculos e leitura antecipada; não impor labirinto por consistência artificial.

## 4. Continuação do incremento 31 — elenco e cenários

Executar após validar o contrato do primeiro modelo e as regressões de jogabilidade.

- **31.3.1:** aplicar pipeline a Maya e Leon, com inventário próprio, sem copiar proporções/poses de Ren indiscriminadamente.
- **31.3.2:** individualizar 12 arquétipos inimigos por silhueta, equipamento e postura.
- **31.3.3:** revisar oito encontros de chefe e suas duas fases; conservar Goliath mecha, Arisawa/Cyber-T-Rex, gêmeos distintos e Entidade Zero cósmica. Modelos humanos genéricos são fallback, não identidade final desses chefes.
- **31.4.1:** biomas distintos para distrito, trem, canteiro, fábrica, financeiro, museu, blacksite e torre. Colisão separada da decoração, chão/perigos/itens legíveis e profundidade sem falsas plataformas.
- **31.4.2:** fazer um setor completo como referência e medir no aparelho antes de produzir 26 cenários definitivos.

## 5. Incremento 32 — combate, especiais e acabamento

- **32.1:** aprofundar especiais/overdrives próprios, consumo, telegraph e recuperação; preservar persistência recompensada.
- **32.2:** cut-ins 2.5D sincronizados com hitstop, som e eventos reais da engine.
- **32.3:** balancear capítulos com os três heróis; tempo de exploração, encontros obrigatórios, checkpoints, recompensas e vidas.
- **32.4:** finalizar retratos, transições, textos, tutorial prático e mixagem. Fontes locais/licenças, redução de flashes/shake, contraste e legibilidade no celular continuam no escopo.

## 6. Incremento 33 — desempenho, perfis e Android

Profiling começa no Ren do incremento 31; esta etapa fecha o aceite.

- **33.1:** medir CPU/GPU, chamadas de desenho, memória/texturas, carregamento, áudio, aquecimento e bateria no aparelho de referência. Alvo: simulação 60 Hz e render estável, com perfil de qualidade documentado.
- **33.2:** otimizar por evidência: culling, instancing/batching, materiais compartilhados, descarte de GLB/texturas, pools e limites de partículas/inimigos. Testar repetição menu → jogo → setor → menu e perda de contexto WebGL.
- **33.3:** perfis test/release; troca livre e mapas de teste desligados em release; continue mantém escolha de herói.
- **33.4:** validar offline/PWA e assets locais Android, paisagem/imersão/Voltar, pausa/background, save atual, toque simultâneo e DualShock 4 físico.
- **33.5:** checklist 26 setores, três heróis, oito chefes, som, controles e acessibilidade. Assinatura, APK/AAB, release e loja são ações próprias, somente quando solicitadas.

## 7. Validação e publicação de cada entrega

1. Conferir diff, fontes e recursos efetivamente carregados. Testes de pixels/ossos não comprovam qualidade artística.
2. Executar testes pertinentes, npm run lint, npm run build e smoke do navegador; ampliar para regressões de campanha conforme os sistemas alterados.
3. Verificar build:android e android:sync para entregas de assets destinadas ao Android, sem rodar Gradle/APK.
4. Identificar testes exaustivos não concluídos, limitações de ambiente e aceites físicos pendentes; não copiar contagens antigas como prova nova.
5. Atualizar este plano e EXECUCAO.md, publicar commit no GitHub e conferir SHA remoto. Workflows continuam exclusivamente manuais.

## 8. Fora do escopo ativo

Multiplayer, migração para outra engine e compatibilidade entre saves antigos. Reavaliar somente por requisito expresso ou evidência de limitação, sem desviar da campanha solo, dos três heróis e da exploração.
