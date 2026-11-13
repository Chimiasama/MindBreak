# Arte dos chefes — incremento 22

## 1. Entrega

Primeira passagem de sprites para os oito encontros de chefe, substituindo retângulos e o círculo genérico da Entidade Zero. Cada chefe possui duas variantes de fase e quatro poses ligadas à IA. Castor/Pólux têm desenhos e paletas separados, preservando duas áreas atingíveis e uma vida compartilhada.

A fonte é raster procedural local em `src/game/bossArtwork.ts`, sem imagens externas ou dependências novas. Não é arte final aprovada no celular nem uma mudança de comportamento dos chefes.

| Chefe | Identidade | Leitura da fase 2 |
|---|---|---|
| Cipher-01 | Traje psíquico, gola e núcleo; adagas orbitais existentes por cima | Máscara de energia e núcleo exposto/aceso |
| Valkyrie-7 | Armadura leve e duas turbinas laterais | Fins de energia e emissões reforçadas |
| Goliath-IV | Mecha largo, visor mecânico, punhos pesados e reator | Placas/reator e circuitos das pernas acesos |
| Arisawa / Cyber-T-Rex | Cientista sobre corpo robótico com cabeça dentada e cauda | Espinhos, faixa energética e olho reforçado |
| Castor/Pólux | Casacos, assimetria no cabelo e energia nas mãos; principal vinho, secundário azul | Colar/peito energizados; os dois preservam identidade |
| Kusanagi | Armadura segmentada, visor e katana ciano | Hastes e visor energizados |
| Vane | Armadura de comando, quepe e canhões laterais | Canhões, ombreiras e circuitos em overload |
| Oswald / Entidade Zero | Diretor de casaco e manipulação de orbes | Corpo oval cósmico com um grande olho central |

## 2. Contrato técnico

### 2.1 Dimensões e desenhos

- Quadro-fonte **48 × 64**, paleta discreta, transparência e pixels inteiros. Poses: `ready`, `windup`, `active`, `recover`.
- Duas fases × quatro poses × oito chefes, mais oito poses de Pólux: **72 posições gráficas**. Algumas partes são compartilhadas. Não são 72 ilustrações independentes, ciclos completos de locomoção ou uma pose específica para cada projétil.
- `drawBossSprite` ajusta a fonte a `b.w/h`, no centro da caixa do corpo, e espelha pelo `b.facing`. Pólux usa exclusivamente `twinX/twinY`, sem alocar ou desenhar corpo fantasma quando faltam coordenadas. A orientação continua a mesma usada pelo combate.
- Não muda `BossRuntime`, `bossBodies`, dimensões dos mapas, hurtboxes, alcance, velocidade, dano, HP, IA, timers, regras dos gêmeos ou saves. O tamanho renderizado continua variando pelos dados de cada chefe.
- A Entidade Zero agora cabe na caixa de desenho do corpo; o antigo círculo se estendia além dela. Isso é ajuste visual, sem aumento/redução da colisão física. Não há hitbox do olho isolada.
- Cache sob demanda por chefe/fase/pose/variante; uma vez criado, o canvas é reaproveitado. Máximo das combinações usadas: **864 KiB RGBA** (72 × 48 × 64 × quatro bytes), além de overhead canvas/GPU. Não são criados canvases a cada frame. Profiling no Android permanece pendente.
- Atlas documental **192 × 1152**, quatro colunas e 18 linhas. JSON informa chefe, fase, variante, Y da linha e X de cada pose. Imagens/documentação não entram no bundle: a fonte procedural é empacotada.
- Nearest-neighbor na fonte e desenho. O ajuste ao tamanho físico existente e a escala da câmera não garantem pixel final inteiro em todo aparelho.

### 2.2 Estado e sincronização

`bossVisualFrame` lê `mind.state`, sem usar relógio independente ou alterar IA. Se o estado ainda não existe, `telegraph` seleciona preparação ou repouso. A fase gráfica lê `b.phase` imediatamente, inclusive durante os 45 ticks de recuperação da transformação. O desenho não dispara dano, tiro, som, hitstop ou transformação adicional.

As poses ficam mantidas até a mudança real de estado; pausa, cut-in e hitstop não fazem a arte avançar sozinha. Não foram inventadas novas janelas de ataque para acomodar os desenhos. O golpe ativo continua podendo durar um único tick: nesses ataques a pose pode ser breve; preparação e recuperação dão a leitura principal.

`bossWarnings` continua sendo desenhado antes do corpo, com alvos/zonas comprometidos. Adagas orbitais e escudo de Cipher continuam overlays dinâmicos e condicionais ao estado físico. Portais, tiros e demais efeitos permanecem no renderer existente. O escudo não está pintado no atlas e pode desaparecer na quebra/fase 2. Os gêmeos preservam posição independente, HP compartilhado e deduplicação de dano/recompensa.

## 3. Inspeção e reprodução

- [Folha das duas fases e quatro estados](arte/chefes-sheet.png).
- [Atlas PNG](arte/chefes-atlas.png).
- [Metadados JSON](arte/chefes-atlas.json).

O estúdio `/tools/art-studio.html` inclui a galeria de chefes, com os dois gêmeos. `scripts/export-art-previews.mjs` reproduz atlas, JSON e folha junto dos heróis/inimigos. Usar o servidor Vite e as variáveis de Playwright/Chromium descritas em [ARTE_E_ANIMACAO.md](ARTE_E_ANIMACAO.md#3-inspeção-e-reprodução). Exportação exclusivamente manual, sem Action ou APK.

Ao revisar, conferir silhueta sem cores, fase 1/2, leitura em tamanho físico real, poses de preparação e alcance visual das armas. Alterar uma lâmina no desenho não altera o alcance; qualquer mudança de alcance exige alteração e testes próprios no combate. Retratos/cut-ins continuam o próximo lote (7.2.0.3), sem anunciar sua conclusão aqui.

## 4. Evidências e pendências

**400 testes aprovados.** Novos testes cobrem oito silhuetas distintas sem cor, fonte das duas fases e Pólux, dimensões/paletas, poses de ataque/recuperação, mapeamento de estado sem mutação e ausência de segundo corpo sem coordenadas. Regressões existentes continuam cobrindo os padrões/duas fases, telegraph, colisões, dois corpos/vida compartilhada, escudo, tiros e conclusão de chefes.

Chromium horizontal com touch renderizou **64 combinações** (oito chefes × duas fases × quatro estados), alternando orientação, verificando cache e ausência de mutação do estado por desenho. As oito passagens para fase 2 foram acionadas pelo método real de dano; o secundário dos gêmeos foi conferido por pixels na região de seu corpo. Sem erros JavaScript. Folha de contato inspecionada visualmente; cenário e estados foram preparados, sem campanha inteira vencida manualmente.

TypeScript, build web, build de assets Android e Capacitor sync aprovados. Não houve Action ou APK. Permanecem teste físico Android/DualShock 4, aprovação artística, contraste sob efeitos e refinamento de poses/locomoção; a fase 7 não está concluída. Música, estrutura exploratória, recompensas e regras de distribuição foram preservadas.
