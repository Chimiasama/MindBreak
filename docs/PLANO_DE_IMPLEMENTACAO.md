# Plano técnico de implantação — MIND//BREAK

Data inicial: 13/11/2026. Documento de trabalho: atualizar os estados e registrar evidências em cada entrega. O diagnóstico anterior, `DOCUMENTO_TECNICO.md`, descreve a base anterior às implementações deste plano.

## 0. Contrato, sequência e acompanhamento

### 0.1 Requisitos definidos

- **0.1.0.1 — Jogabilidade primeiro:** estabilizar física, colisão, movimentação, combate e exploração; depois áudio; depois arte e acabamento. Antecipar o pacote Android de testes para validar a jogabilidade no aparelho antes de produzir toda a arte.
- **0.1.0.2 — Troca de herói:** manter a troca livre funcionando somente como ferramenta de teste. Na experiência final, depois da escolha inicial, a troca só acontece no continue. Nunca trocar automaticamente na transição entre subfases. Assistências continuam existindo e não são troca de personagem.
- **0.1.0.3 — Campanha:** manter oito fases principais, com **26 subfases como alvo inicial**, dentro da faixa aceita de 24–28. Elas precisam ter geometria, encontros e objetivos próprios; renomear os oito mapas não satisfaz o requisito.
- **0.1.0.4 — Exploração:** inimigos comuns podem reaparecer depois de afastamento substancial e retorno. Sair um pouco da tela não deve causar respawn imediato. Chefes, recompensas únicas e emboscadas concluídas seguem regras separadas.
- **0.1.0.5 — Android:** preservar React/Canvas/Web Audio e empacotar inicialmente com Capacitor. Isso executa o jogo em Android WebView, não converte o motor para Kotlin, Godot ou Unity.
- **0.1.0.6 — Controle:** testar toque simultâneo e DualShock 4 conectado ao Android por Bluetooth e, quando disponível, USB. Mapeamento padrão da Gamepad API não substitui teste em aparelho real.
- **0.1.0.7 — Actions e APK:** todos os workflows devem ter somente `workflow_dispatch`, sem push, pull_request, schedule, workflow_run ou gatilhos automáticos. Só gerar APK quando o usuário pedir expressamente. Alterações no código não autorizam uma geração de APK.
- **0.1.0.8 — Futuro:** multiplayer e eventual migração de engine ficam previstos, fora do escopo ativo.

- **0.1.0.9 — Persistência recompensada:** o usuário aceita farm de vidas e prefere progressão inspirada em roguelites. Reaparição não deve zerar imediatamente a recompensa. Regra inicial adotada: 1.000 → 500 → 50 → 0 por derrota confirmada do mesmo spawn, sem teto adicional de vidas por fase.
- **0.1.0.10 — Progressão oculta:** não mostrar pontos nem o limiar da próxima vida no HUD ou nas telas de conclusão; manter cálculo e concessão de vidas internos. A descoberta das regras pelo jogador é intencional.
- **0.1.0.11 — Alternativas futuras:** limite separado por origem de vida (pontos, item encontrado, drop ocasional) foi sugerido como alternativa, não como obrigação. Não adicionar teto ou loteria sem balanceamento próprio; a implementação atual usa apenas a recompensa decrescente.

### 0.2 Forma de implantar cada incremento

- **0.2.0.1:** manter mudanças pequenas por sistema, com testes do comportamento afetado; não misturar novos mapas, física e arte numa única entrega sem validação intermediária.
- **0.2.0.2:** executar `npm test`, `npm run lint`, `npm run build` e smoke de navegador. Registrar o que foi testado em aparelho separadamente do que foi simulado.
- **0.2.0.3:** manter compatibilidade dos oito mapas até migrar os dados; usar adaptadores/flags em vez de quebrar toda a campanha de uma vez.
- **0.2.0.4:** marcar itens como IMPLEMENTADO, PARCIAL ou PENDENTE com evidência. Código escrito não equivale a APK distribuído, workflow executado ou teste físico concluído.
- **0.2.0.5:** versionar mudanças antes de acionar CI remota; não publicar releases nem gerar APK sem pedido expresso. O usuário autorizou o envio das alterações de código e documentação ao GitHub.

### 0.3 Estado e incrementos

**Primeiro incremento implementado:** passo fixo, entradas por dispositivo, suspensão/limpeza de entrada, bloqueio de ações fora do jogo, cancelamento de transições antigas, pausa na derrota do chefe, colisão varrida do jogador, transporte por plataforma móvel, proteção inicial do impulso de wall-kick, troca de teste identificada e regra de build final documentada. Há testes de regressão versionados.

No incremento 1 não havia respawn. O incremento 2 acrescenta ações por tick, buffer/coyote, teclado por tecla física, colisão varrida de tiros/corpos, recuperação de sobreposição/esmagamento, regra de impacto por alvo, ajuste de PSY/armor e respawn exploratório nos oito mapas atuais. Também inclui pausa por gamepad e CI exclusivamente manual. Naquele marco, continuavam pendentes 26 mapas, salvamento, novo sistema musical, novos sprites e APK; não são apresentados como prontos.

**Marco dos incrementos 7–8:** save local versão 1 e retomada por checkpoint implementados; campanha com 13 mapas (1A–1D, 2A–2C e seis adaptadores), contra a meta de 26. Android horizontal/imersivo e construção de APK manual já implementados nos incrementos 5–6. Música, arte nova, expansão dos demais capítulos e os itens de física marcados como pendentes continuam no plano.

**Incrementos 9–10:** perfis de aceleração/frenagem versão 1 e varredura dos inimigos terrestres implementados; envelope de salto em corrida preservado e documentado em `MOVIMENTACAO_E_TERRENO.md`. O canteiro ganhou 3A–3C com subida de mil unidades, ida/volta verificada e Goliath-IV apenas no heliponto. Campanha nesse marco: 15 mapas; meta: 26. Continuavam pendentes ensaio físico, acabamento/chefes/IA completa e expansão das fases 4–8.

**Marco dos incrementos 11–12:** IA dos onze inimigos comuns com estados explícitos, ataques preparados/recuperação, proteção contra stun encadeado e colisão de projéteis com terreno. Fábrica e financeiro expandidos em 4A–4C/5A–5C. Campanha com 19 mapas: 16 próprios e três adaptadores. Naquele marco, chefes/padrões finais e expansão das fases 6–8 estavam pendentes; música/arte vêm após a base de gameplay.

**Estado atual após incrementos 13–14:** oito chefes com sequências próprias em duas fases, preparação/recuperação e gêmeos com dois corpos/vida compartilhada. Catálogo completo com **26 mapas próprios**, 130 inimigos iniciais, 77 checkpoints e 78 objetos. Rotas geométricas e retorno verificados para os três heróis; vitória/save verificados em integração. Balanceamento integral e físico, combos/especiais, áudio, arte e acessibilidade permanecem pendentes; catálogo completo não é release final.

## Fase 1 — Base de física, colisão e movimentação

### 1.1 Tempo de simulação — IMPLEMENTADO

- **1.1.0.1 — Implementação:** `src/game/simulation.ts` fornece acumulador com passo de 1000/60 ms. `GameEngine.start()` atualiza a simulação zero ou mais vezes por renderização. Manter os valores existentes por tick para preservar o ajuste original a 60 Hz.
- **1.1.0.2 — Interrupções:** limitar recuperação a 100 ms/seis passos; limpar relógio ao pausar, carregar e parar. Não simular segundos de dano ao retornar de uma interrupção.
- **1.1.0.3 — Aceite automatizado:** um segundo sintético em 30/60/120/144 Hz executa 60 passos; pausa no meio do catch-up encerra a atualização. O descarte de tempo em travamentos longos é intencional.
- **1.1.0.4 — Evolução pendente:** medir frame pacing e acrescentar interpolação visual de câmera/personagens se os testes de 120 Hz mostrarem necessidade. A simulação fixa não torna o render automaticamente interpolado.

### 1.2 Estados e ciclo de vida — IMPLEMENTADO no primeiro incremento; unificação estrutural PENDENTE

- **1.2.0.1:** sincronizar pausa com estado de tela no App, parar gameplay na derrota do chefe e bloquear ações durante pausa/fim de partida.
- **1.2.0.2:** guardar os temporizadores de transição e cancelá-los em `loadStage()` e `stop()`; impedir callback de uma partida antiga de completar outra.
- **1.2.0.3:** limpar comandos ao pausar/carregar/continuar; pausar quando perder foco ou ocultar a página. Não retomar automaticamente ao voltar ao app.
- **1.2.0.4:** posteriormente substituir os booleanos dispersos por máquina de estados única com transições explícitas: menu, introdução, jogo, pausa, morte, continue, conclusão e vitória. Adicionar evento de background/foreground do Capacitor na fase Android.
- **1.2.0.5 — Aceite:** morte não dispara continue duplicado; chefe gera uma conclusão; reiniciar/voltar ao menu cancela eventos antigos; overlay nunca recebe dano de gameplay.

### 1.3 Entrada e responsividade — IMPLEMENTADO no incremento 2; ensaio físico Android PENDENTE

- **1.3.0.1 — Implementado:** `src/game/input.ts` agrega teclado, toque e gamepad sem que controle ocioso apague as outras entradas. Desconexão limpa apenas a fonte gamepad; pulo touch captura ponteiro e limpa o estado ao perder captura.
- **1.3.0.2 — Implementado:** centralizar ações discretas numa fila consumida no tick, com detecção de borda, prevenção de duplicação, identificador do ponteiro e tratamento de duas teclas equivalentes pressionadas simultaneamente.
- **1.3.0.3 — Implementado:** adicionar coyote time inicial de 6 ticks e buffer de pulo de 6 ticks, configuráveis. Prioridade: vault, wall-kick, pulo no chão/coyote e salto aéreo. Buffer deve disparar uma vez, sem consumir salto duplo involuntário.
- **1.3.0.4 — Aceite:** segurar movimento e pulo com dois dedos, arrastar para fora, cancelar toque, desconectar controle e perder foco não deixam comandos presos. Teclado, toque e gamepad devem produzir a mesma ação de gameplay.

### 1.4 Colisão do jogador — PARCIAL

- **1.4.0.1 — Implementado:** extrair `moveAgainstSolids()` para `collision.ts`, escolher a face sólida mais próxima cruzada em X/Y e bloquear atravessamento de plataforma fina. Limitar velocidade de queda a 22 unidades/tick neste ajuste inicial.
- **1.4.0.2 — Implementado:** acompanhar plataforma móvel de apoio e transportar o jogador pelo deslocamento dela. Preservar impulso externo do wall-kick por seis ticks antes de aceitar novamente o controle horizontal normal.
- **1.4.0.3 — Implementado com testes; ajuste de esmagamento em aparelho PENDENTE:** tratar sobreposição inicial e esmagamento entre plataforma móvel/teto, verificar deslocamento de esteira contra paredes e revalidar checkpoint quando o piso seguro deixar de existir. Definir explicitamente dano/resgate em esmagamento; não teletransportar silenciosamente para dentro de sólidos.
- **1.4.0.4 — Implementado para projéteis/corpos contra alvos e terreno dos inimigos:** aplicar varredura aos projéteis e corpos lançados, com colisão por segmento/tempo de impacto. A primeira versão alterou apenas sólidos contra o jogador; o incremento 2 adiciona varredura de projéteis/corpos contra alvos. O incremento 9 acrescenta varredura dos inimigos terrestres contra sólidos, incluindo stun, esteiras e apoio móvel.
- **1.4.0.5 — Aceite:** queda rápida, dash contra parede, teto baixo, cantos, retorno de abismo, parede alternada, plataforma ascendente/descendente e esteiras não atravessam sólidos nem deixam o jogador preso. Rodar nas oito fases e três personagens.

### 1.5 Ajuste de movimento e câmera — PARCIAL: perfis/aceleração/câmera implementados; acabamento e ensaio físico pendentes

- **1.5.0.1 — Implementado no incremento 9:** reunir gravidade, aceleração, velocidade terminal, arrasto, controle aéreo e impulsos em perfis versionados, com unidades documentadas e referências ao passo de 60 Hz.
- **1.5.0.2 — Implementado e medido no incremento 9:** definir aceleração/desaceleração em vez de atribuição instantânea de velocidade; conservar a agilidade arcade. Medir altura/distância de salto para Ren/Maya/Leon antes e depois.
- **1.5.0.3 — Normalização implementada; rotas e ajuste de foco pendentes:** normalizar voo diagonal de Maya, revisar consumo/recarga de foco e garantir que cada rota principal continue acessível aos personagens sem voo.
- **1.5.0.4 — Área de overdrive e viewport com altura lógica implementadas; ensaio físico pendente:** usar altura lógica de 540 unidades (aproximada no incremento 6, antes 900): a mesma proporção de tela mostra a mesma área do mundo em resoluções diferentes. No navegador, retrato mantém altura lógica e vê menos largura; Android fica bloqueado em horizontal; não comprimir um cenário inteiro em sprites minúsculos. A área do overdrive é independente da resolução. DPR e escala inteira ainda exigem acabamento visual.
- **1.5.0.5 — Antecipação, limites e zona morta implementados; ajustes de shake/opções pendentes:** implementar look-ahead com limites por sala, antecipação vertical, zona morta e opção de intensidade do shake. Ajustar HUD/controles sem cobrir pontos de pouso.
- **1.5.0.6 — Saída da fase:** suíte de regressão, trajetórias comparáveis entre taxas de render, todas as rotas críticas acessíveis e ensaio em Android antes de congelar números de balanceamento.

## Fase 2 — Combate, vida e regras de personagem

### 2.1 Troca e continue — PARCIAL

- **2.1.0.1 — Implementado:** manter função de troca durante gameplay de teste, rotular botão/instrução e retirar o piso de 10 HP que curava ao trocar. Usar conversão conservadora por proporção, com mínimo de 1 para personagem vivo.
- **2.1.0.2 — Implementado:** flag `VITE_TEST_CHARACTER_SWITCH=false` desabilita troca livre no botão, atalho e método do motor. Por padrão permanece habilitada nesta versão de testes, inclusive em build normal; portanto build normal ainda não é configuração final.
- **2.1.0.3 — Pendente:** criar perfis explícitos de build `test` e `release`. Na release a flag deve ser false e o seletor inicial só escolhe quem começa; o personagem permanece em todas as subfases e só muda no continue.
- **2.1.0.4 — Aceite:** testes de build final sem botão/Tab/troca direta; continue ainda permite os três heróis e assistências continuam disponíveis. Testar transição de fase, morte e reinício sem troca indevida.

### 2.2 Impactos e recursos — PARCIAL

- **2.2.0.1 — Implementado para rasteira e corpo lançado:** dar identificador único a cada ataque e registrar alvos atingidos; rasteira e corpo lançado não podem aplicar dano a cada frame salvo se classificados como dano periódico com intervalo definido.
- **2.2.0.2:** definir sequência de combo, janelas de ligação, launcher e recuperação por golpe. Animar e colidir pela mesma linha do tempo; não depender de comentários ambíguos sobre “terceiro golpe”.
- **2.2.0.3 — Custo/seleção de alvo corrigidos; especiais distintos pendentes:** padronizar PSY: custo mínimo correspondente à ação; diferenciar especiais dos heróis; fazer reflexão escolher atirador, chefe ou inimigo mais próximo conforme regra explícita.
- **2.2.0.4 — Cooldown da armor corrigido; balanceamento geral pendente:** documentar HP, invulnerabilidade, armor e stun. Conferir Leon sem recuo mas com proteção adequada contra múltiplos projéteis simultâneos.
- **2.2.0.5 — Aceite:** um ataque normal conta uma vez por alvo; WAV perfura mas não reaplica no mesmo alvo; telecinese não concede recompensa duplicada; combo e foco obedecem aos valores definidos.

### 2.3 Inimigos e chefes — PARCIAL: estados e padrões implementados; balanceamento/aceite completo pendentes

- **2.3.0.1 — Implementado nos incrementos 9/11:** separar IA em estados patrulha/alerta/ataque/recuperação/stun/morte; introduzir limites de perseguição e verificação de piso para não acumular inimigos em abismos.
- **2.3.0.2 — Cooperação/telegrafia e proteção contra stun implementadas no incremento 11; balanceamento pendente:** conservar cooperação guarda/cão/atirador, com sinais legíveis e limites para stun encadeado.
- **2.3.0.3 — Sequências próprias e gêmeos atingíveis implementados no incremento 13; balanceamento pendente:** individualizar os oito chefes com padrões, telegrafia e contra-ataques próprios; gêmeos devem ter regra clara de dois corpos/vida compartilhada. Arisawa e Vane deixam de usar somente especial genérico.
- **2.3.0.4 — Aceite:** derrotar cada chefe com todos os personagens sem depender de bugs; fase 2 modifica o padrão com clareza; combates não geram softlock.

## Fase 3 — Exploração e repopulação de inimigos

### 3.1 Modelo de spawns — IMPLEMENTADO para os oito mapas atuais; namespaces e estado por subfase IMPLEMENTADOS no distrito

- **3.1.0.1:** substituir vínculo entre inimigo vivo e array estático por `SpawnDefinition`: id estável, subfase/sala, posição de origem, tipo, perfil, grupo, política de respawn e recompensa.
- **3.1.0.2:** manter `SpawnRuntime` separado: entidade ativa, contador de aparições, último instante de morte, afastamento acumulado e elegibilidade. IDs de entidade devem ser novos a cada aparição; spawnId permanece estável.
- **3.1.0.3:** adaptar os inimigos existentes para spawns sem mudar inicialmente posições/atributos. Validar duplicidade de IDs e spawn dentro de paredes na carga.

### 3.2 Política de afastamento — IMPLEMENTADO nos oito mapas; ajuste por grafo de salas PENDENTE

- **3.2.0.1:** ponto inicial de ajuste: raio mínimo de preparação de 900 unidades, ampliado para cobrir a viewport; armar respawn somente após afastamento de pelo menos 1.800 unidades da origem por 5 segundos simulados e mínimo de 15 segundos desde a morte. Esses valores são protótipo, não balanceamento aprovado.
- **3.2.0.2:** em mapas verticais usar distância 2D e/ou grafo de salas; em subfases menores usar mudança para uma sala distante, nunca um limiar inalcançável maior que o próprio mapa.
- **3.2.0.3:** durante a exploração de um setor exibido, reaparecer apenas fora da área visível acrescida de margem de 240 unidades e fora do raio de segurança de 320 do jogador. Se não houver ponto seguro, adiar; não surgir sobre a cabeça do jogador.
- **3.2.0.4:** não apagar nem duplicar inimigo ainda vivo ao sair da câmera. Aplicar teto inicial de 24 inimigos comuns ativos por subfase, com prioridade aos encontros obrigatórios e orçamento de atualização por distância.
- **3.2.0.5 — Implementado na sessão:** guardar estado por subfase durante a sessão; atravessar uma porta de ida e volta não deve rearmar imediatamente tudo. Após ausência elegível, preparar o retorno antes de revelar o setor, sempre mantendo segurança, cooldown e população máxima.

### 3.3 Exceções, recompensas e testes — IMPLEMENTADO; estado incluído no save persistente no incremento 7

- **3.3.0.1:** chefes e inimigos de emboscada obrigatória não reaparecem após conclusão; inimigos ordinários podem reaparecer. Uma arena concluída não deve voltar a trancar o jogador.
- **3.3.0.2:** baús secretos, cura garantida e objetos únicos persistem coletados. Derrotas confirmadas por origem dão inicialmente 1.000, 500, 50 e depois zero pontos. Acertos comuns/guard crush sem derrota não pontuam nem consomem a curva. Captura telecinética conta como uma derrota. Desaparecer sem derrota atribuída não consome recompensa. Não há teto de vidas por fase; pontos continuam concedendo 1-UP internamente, sem expor valores ao jogador. Itens únicos continuam protegidos contra duplicação. Esta regra substitui a política anterior de zero pontos para toda reaparição.
- **3.3.0.3 — Aceite:** afastamento curto não repõe inimigo; afastamento grande/tempo suficiente e retorno repõem; pausa não conta tempo; mapa vertical funciona; nenhum respawn visível, duplicado, em parede ou em arena concluída.

## Fase 4 — Oito fases, 26 subfases

Estado após o incremento 14: 26 mapas próprios, na distribuição 4+3+3+3+3+3+3+4. Não há adaptadores no catálogo de campanha. Os oito mapas originais ficam como ferramentas de teste. Ver `CAMPANHA_E_SUBFASES.md` para os contratos executáveis, regras de portas e limites da retomada em memória. O incremento 7 acrescenta save local versionado e restauração no checkpoint; detalhes em `SALVAMENTO.md`.

### 4.1 Contratos de campanha — IMPLEMENTADO para os oito capítulos

- **4.1.0.1:** criar `CampaignStage` (fase principal), `SubstageDefinition` (mapa jogável), `ExitDefinition` (ligação/condição), `CheckpointDefinition` e `CampaignProgress`. Usar identificadores como `1A`, não índices frágeis de array.
- **4.1.0.2:** distinguir fim de sala/subfase de derrota de chefe/fim de fase. `loadSubstage()` recebe herói, HP, vidas, foco, pontos, buffs e estado persistente; reiniciar/checkpoint/continue têm contratos separados.
- **4.1.0.3:** criar adaptador temporário dos oito `StageDefinition`; os mapas antigos continuam executáveis enquanto novas subfases são construídas. Não multiplicar artificialmente oito mapas iguais.
- **4.1.0.4:** construir grafo com ida/volta onde fizer sentido, portas, requisitos e saídas explícitas; completar fase principal somente no objetivo final. Retorno de exploração não refaz chefe nem história final.

### 4.2 Distribuição editorial inicial — 26 MAPAS IMPLEMENTADOS; acabamento e playtest integral pendentes

Os nomes são propostas de produção e podem ser refinados sem alterar o total. São 26 mapas distintos: 4+3+3+3+3+3+3+4.

| Fase principal | Subfases previstas | Total | Encontro final |
| --- | --- | ---: | --- |
| 1 — Distrito | 1A Fuga do laboratório; 1B Telhados; 1C Esgotos; 1D Avenida bloqueada | 4 | Cipher-01 |
| 2 — Monotrilho | 2A Vagões e embarque; 2B Cabos e manutenção; 2C Teto e pórticos | 3 | Valkyrie-7 |
| 3 — Canteiro | 3A Fundação; 3B Guindastes e vigas; 3C Heliponto na tormenta | 3 | Goliath-IV |
| 4 — Fábrica | 4A Tanques; 4B Esteiras; 4C Núcleo de descarte | 3 | Arisawa / Cyber-T-Rex |
| 5 — Financeiro | 5A Boulevard; 5B Garagens e serviços; 5C Suíte executiva | 3 | Castor & Pólux |
| 6 — Museu | 6A Galerias; 6B Jardins digitais; 6C Acervo restrito | 3 | Kusanagi |
| 7 — Blacksite | 7A Docas; 7B Blocos de contenção; 7C Centro de comando | 3 | Comandante Vane |
| 8 — Torre | 8A Base da torre; 8B Núcleo Zero; 8C Elevador orbital; 8D Estratosfera | 4 | Oswald / Entidade Zero |

- **4.2.0.1 — Implementado como lote jogável inicial; acabamento/playtest de dificuldade pendentes:** desenvolver primeiro 1A–1D como amostra completa: deslocamento, exploração opcional, respawn, checkpoint e chefe. Validar com os três heróis antes de replicar padrões.
- **4.2.0.2 — Fases 1–8 implementadas em lotes, concluído no incremento 14:** produzir fases 2/3; depois 4/5; depois 6/7; por fim 8. Cada lote entrega mapas com começo, retorno, segredo, checkpoint e objetivo, não apenas cenário vazio.
- **4.2.0.3 — Rotas principais verificadas nos 26 setores; segredos ainda exigem playtest:** mapear requisitos de salto/alcance por trecho; nenhuma rota obrigatória pode exigir voo exclusivo de Maya. Habilidades podem facilitar segredos, mas não bloquear campanha com outro herói.
- **4.2.0.4 — Intro no primeiro setor/fecho no último implementados; revisão editorial pendente:** elaborar diálogos por entrada e evento, evitando repetir texto a cada retorno; reservar chefes para a última subfase e encontros intermediários onde contribuírem para ritmo.
- **4.2.0.5 — Contagem/grafo/rotas geométricas verificados; campanha integral de combate pendente:** 26 IDs únicos alcançáveis; todos os caminhos principais sem softlock; conclusão da campanha validada com Ren/Maya/Leon; contagem 24–28 verificada por ferramenta de validação de dados.

### 4.3 Persistência e continuidade — IMPLEMENTADO no incremento 7; ensaio físico Android pendente

- **4.3.0.1 — Implementado:** gravar progresso local versionado: campanha, subfase, herói, checkpoint, vidas, score, flags únicas e preferências. Salvar só em pontos consistentes, nunca no meio de uma resolução de colisão.
- **4.3.0.2 — Implementado; migrações de versões futuras pendentes:** validar dados na leitura, oferecer recuperação de save incompatível e migrações futuras. APK e navegador podem ter armazenamentos separados; não prometer sincronização entre eles.
- **4.3.0.3 — Validado em testes e Chromium; Android físico pendente:** fechar/reabrir restaura checkpoint válido; continue mantém regra de personagem; dados inválidos não derrubam o app; atualizações compatíveis preservam progresso.

## Fase 5 — Android de testes e GitHub Actions

Estado do incremento 5: Capacitor 8.6.2, projeto nativo e wrapper versionados; APK debug compilado e assinatura verificada localmente. A Action existente agora valida e gera APK somente por solicitação manual, com Ubuntu 26.04, Actions Node 24 e Java 21 explícitos. Detalhes em [ANDROID_APK.md](ANDROID_APK.md). Os itens de comportamento no aparelho de 5.1.0.3, assinatura estável definitiva e o aceite de 5.2.0.6 continuam pendentes. A troca livre de personagem permanece habilitada apenas como ferramenta de testes.

### 5.1 Preparar pacote Android — PARCIAL: APK local validado; ensaio físico pendente

- **5.1.0.1:** instalar versões compatíveis e fixadas de `@capacitor/core`, CLI e Android; criar configuração com `webDir: 'dist'` e appId provisório documentado antes da release. Verificar versões mínimas exigidas de Node/JDK/SDK na implementação, sem escolher combinações incompatíveis por suposição.
- **5.1.0.2:** gerar projeto Android, versionar código nativo e wrapper Gradle, executar build web e `cap sync android`. Não apontar webDir para a raiz do repositório.
- **5.1.0.3:** validar assets locais, inicialização do áudio após gesto, back Android, status/navigation bars, safe areas, rotação, background e restauração. No empacotamento, evitar service worker desatualizado substituindo assets internos.
- **5.1.0.4:** produzir APK debug instalável. Para updates sem reinstalar, reutilizar a keystore debug pelo cache do GitHub (implementado); adotar keystore própria em secrets para estabilidade garantida posteriormente; keystore de produção nunca entra no Git.

### 5.2 Pipeline de APK — IMPLEMENTADO; execução remota e instalação pendentes

- **5.2.0.1:** adaptar `.github/workflows/manual-checks.yml` com `workflow_dispatch` como único gatilho. Não executar por push, pull request ou outro evento. Só acionar a geração após pedido expresso do usuário; nunca disponibilizar secrets a código não confiável.
- **5.2.0.2:** sequência: checkout → Node/Bun fixados → instalação com lockfile congelado → testes → TypeScript → build web → sync Capacitor → Java/SDK compatíveis → `./gradlew assembleDebug` na pasta android → upload do APK e relatório.
- **5.2.0.3:** criar artifact `MindBreak-APK-debug-<execução>` com `MindBreak-debug.apk`, SHA-256 e identificação do commit. Falha em teste ou Gradle deve falhar o job; upload deve exigir arquivo existente.
- **5.2.0.4:** usar cache de pacotes/Gradle com chaves dos lockfiles e retenção inicialmente de 14 dias. Fixar versões das actions e dependências de build; ao consolidar CI, fixar actions por SHA revisado.
- **5.2.0.5:** build de testes mantém troca livre sinalizada; futuro workflow release define `VITE_TEST_CHARACTER_SWITCH=false`. Acrescentar verificação automatizada de que release não expõe a ferramenta.
- **5.2.0.6 — Aceite:** execução real no GitHub concluída, artifact baixado e APK instalado no aparelho. Workflow escrito/localmente validado não satisfaz sozinho esse aceite.

### 5.3 Como baixar e instalar no celular

- **5.3.0.1:** no navegador com acesso ao repositório: GitHub → Actions → execução concluída → Artifacts → baixar ZIP → extrair APK → abrir no Android → permitir instalação por aquela origem, se solicitado → instalar → abrir.
- **5.3.0.2:** artifacts podem exigir login e expiram conforme retenção. Para download direto mais simples, uma etapa futura pode anexar APK a uma prerelease via `gh release upload`, com permissão `contents: write` e publicação deliberada. Não criar uma release pública automaticamente nesta etapa.
- **5.3.0.3:** GitHub Actions na nuvem **não instala nem abre sozinho o jogo no celular pessoal**. Isso só é automatizável com dispositivo conectado/autorizado a um runner próprio e ADB, ou infraestrutura de device lab. Download e instalação manual atendem ao teste inicial sem essa complexidade.
- **5.3.0.4:** mudança de assinatura pode exigir desinstalação e perder saves. Registrar versão e assinatura no guia de testes; builds release exigem assinatura e fluxo próprios.

### 5.4 Matriz de teste Android / DualShock 4 — PENDENTE de aparelho

- **5.4.0.1:** medir modelo Android, versão do sistema/WebView, resolução/orientação, FPS e build/commit. Conferir pausa por background, áudio, instalação e atualização.
- **5.4.0.2:** parear DualShock 4 pelas configurações do Android; validar Gamepad API e `mapping`. Planejar cruz=pulo, quadrado=golpe, círculo=dash, triângulo=PSY, L1=assist e Options=pausa. Implementar fallback/remapeamento se o aparelho apresentar layout diferente.
- **5.4.0.3 — Implementado no navegador; validação física pendente:** implementar pausa/retomada de gamepad fora do loop de simulação pausado; o polling atual não pode retomar uma pausa se simplesmente parar de ler o controle.
- **5.4.0.4:** testar analógico/D-pad, diagonais, deadzone, botão mantido, reconexão e alternância toque/controle. Sem dispositivo conectado nesta máquina, não declarar DualShock 4 físico aprovado.

## Fase 6 — Música, efeitos e resposta sonora

### 6.1 Infraestrutura — PENDENTE

- **6.1.0.1:** separar buses master/music/SFX/voz, sliders e preferências salvas; ligar mute sem reiniciar estado indevidamente.
- **6.1.0.2:** substituir agendamento musical dependente de `setInterval` puro por scheduler com look-ahead no relógio de AudioContext; tratar suspend/resume/background.
- **6.1.0.3:** estabelecer formato de assets, licença/autoria, limites de memória e pré-carregamento. Começar com loops locais e síntese, sem exigir API externa para jogar.

### 6.2 Conteúdo musical — PENDENTE

- **6.2.0.1:** compor um tema por fase principal com variações por subfase, tensão e chefe; definir BPM, tonalidade, instrumentos, pontos de loop e transições. Reutilizar motivos dos personagens para unidade.
- **6.2.0.2:** produzir primeiro a trilha do distrito e um chefe; validar volume, repetição e loop no Android. Depois produzir os demais sete temas, vitórias, game over e menu.
- **6.2.0.3:** renovar passos, golpes, impactos, parry/reflexão, perigos, poderes e notificações; limitar vozes simultâneas e evitar clipping.
- **6.2.0.4 — Aceite:** loops sem estalo perceptível, sem drift sob carga normal, volumes independentes, interrupções corretas, origem dos recursos documentada e avaliação auditiva no aparelho. Dublagem/gravação profissional fica como produção própria, sem prometer ferramenta indisponível.

## Fase 7 — Arte, animação e cenários

### 7.1 Direção e pipeline — PENDENTE

- **7.1.0.1:** registrar paletas, resolução base dos sprites, proporções, pivôs, tamanho de tiles, nomenclatura e política de escala inteira. Priorizar silhueta e contraste, não só brilho neon.
- **7.1.0.2:** criar atlas/spritesheets com metadados de animação: frame, duração, pivot, hurtbox, hitbox e eventos de som. Trocar frame por estado real, sem alterar colisão arbitrariamente ao trocar imagem.
- **7.1.0.3:** arte gerada por imagem pode servir de conceito/recurso, mas será revisada quanto à consistência entre frames, transparência e tamanho. Manter arquivos fonte e exportações reproduzíveis.

### 7.2 Personagens, inimigos e chefes — PENDENTE

- **7.2.0.1:** produzir heróis com idle, corrida, salto, queda, parede, escalada, hang, vault, dash, slide, combo, dano, stun, especial e morte; Maya inclui voo. Integrar um herói antes de produzir todas as variantes.
- **7.2.0.2:** diferenciar onze arquétipos inimigos por silhueta/arma/postura, sem depender só de cor; depois desenhar os oito chefes e transformações.
- **7.2.0.3:** criar cut-ins e retratos com coerência visual; sincronizar efeitos de impacto com hitstop, som e janela de dano.

### 7.3 Ambientes — PENDENTE

- **7.3.0.1:** criar tiles e objetos para cada bioma principal, com variações de subfase; manter camada de colisão separada da decoração.
- **7.3.0.2:** enriquecer parallax e props sem esconder chão, inimigos e pickups. Marcar perigos, passagens exploráveis e planos de profundidade.
- **7.3.0.3 — Aceite:** fase 1 completa serve como padrão de arte; validar leitura no celular antes de completar 26 cenários. Fixar orçamento de atlas, partículas e tamanho de APK por lote.

## Fase 8 — Interface, escrita, acessibilidade e progressão

### 8.1 Interface e controles configuráveis — PENDENTE

- **8.1.0.1:** separar opções, campanha, seleção livre de teste e continue. Ocultar controles touch quando houver preferência de teclado/gamepad, sem impedir retorno ao toque.
- **8.1.0.2:** permitir tamanho, posição e opacidade dos botões; persistir layout e oferecer reset. Respeitar safe areas e testar retrato/paisagem.
- **8.1.0.3:** padronizar HUD, alertas e tutorial prático; mostrar custo/disponibilidade de ações sem termos técnicos de implementação.

### 8.2 Tipografia e conteúdo — PENDENTE

- **8.2.0.1:** hospedar fontes localmente com licenças, carregar pesos realmente usados e atualizar cache offline. Definir tokens tipográficos também para canvas.
- **8.2.0.2:** revisar português, tutorial, diálogos, descrição dos chefes/músicas e metadados; ajustar textos ao que está implementado. Definir `lang` coerente e corrigir rótulo de instalação por plataforma.
- **8.2.0.3:** adicionar redução de flashes/shake, tamanho de texto e contraste; revisar bloqueio de zoom. Não prometer acessibilidade integral do canvas sem alternativas de interação adequadas.
- **8.2.0.4 — Aceite:** preferências sobrevivem à atualização, textos cabem em telas pequenas, instalação e ações são compreensíveis e recursos funcionam offline após instalação validada.

## Fase 9 — Engenharia, desempenho e distribuição final

### 9.1 Modularização e testes — PARCIAL

- **9.1.0.1 — Iniciado:** extrair relógio, entrada e colisão em módulos testáveis; adicionar testes versionados e comando `npm test` sem nova dependência de teste.
- **9.1.0.2:** gradualmente separar combate, spawns/IA, câmera, render e áudio; preservar contratos e comportamento validado, sem reescrita integral de uma vez.
- **9.1.0.3 — Workflow manual de qualidade criado; execução remota e demais suítes pendentes:** CI de qualidade exclusivamente manual, validação do grafo de campanha, testes de save e smoke de produção. Manter testes sintéticos separados de ensaios físicos Android.
- **9.1.0.4:** remover dependências não usadas após confirmar build/instalação; fixar ferramenta no manifest; revisar licenças e vulnerabilidades sem alterar lockfile às cegas.

### 9.2 Desempenho e integridade — PENDENTE

- **9.2.0.1:** medir tempo de update/render, alocações, memória, Web Audio, carregamento e tamanho do APK em aparelho alvo. Meta inicial: 60 ticks/s com render estável em dispositivo de referência; documentar quando qualidade reduzida for necessária.
- **9.2.0.2:** implementar descarte de desenho fora da câmera, cache de cenário, teto/pool de partículas e budgets de spawn; só otimizar gargalos medidos.
- **9.2.0.3 — Implementado:** retirar histórico pessoal de `public/assets`, conferir lista completa do pacote e evitar inclusão de arquivos de desenvolvimento. Arquivar material pessoal fora da pasta pública sem descartá-lo sem preservação.
- **9.2.0.4:** validar service worker/atualização no web e assets internos no Android, fontes offline, saves, recuperação de erro e diferença entre build test/release.

### 9.3 Release — PENDENTE

- **9.3.0.1:** criar checklist de campanha 26/26, heróis 3/3, chefes 8/8, toque, DualShock 4, saves, som, acessibilidade e desempenho.
- **9.3.0.2:** definir appId definitivo, nome, ícone, versão, SDK alvo, assinatura, política de privacidade e canal de distribuição; gerar APK/AAB conforme destino.
- **9.3.0.3:** release desliga troca livre e seletor de debug; continue mantém escolha de herói. Publicação em GitHub Releases ou loja é uma ação própria, posterior à geração/verificação do pacote.

## Fase 10 — Itens futuros, fora do escopo ativo

### 10.1 Multiplayer

- **10.1.0.1:** avaliar cooperativo local e online separadamente, regras de câmera, ownership de entidades, determinismo, sincronização, servidor e latência. Não implementar rede junto com correção da física atual.
- **10.1.0.2:** decidir escopo após campanha solo estável; definir autoridade, antitrapaça e custos antes de ranking competitivo ou multiplayer online.

### 10.2 Migração de engine

- **10.2.0.1:** somente reavaliar após profiling e requisitos nativos demonstrarem limitação concreta. Comparar manutenção, performance, ferramentas de nível, assets, Android, custo de portar física e regressões.
- **10.2.0.2:** contratos de mapas/atlas/saves documentados facilitam eventual portabilidade, mas não justificam migrar agora. Capacitor não é essa migração.

## 11. Como retomar o plano

1. Ler este documento e o registro de execução.
2. Verificar `git status`, preservar mudanças existentes e rodar a suíte da base.
3. Não expandir novamente a contagem: 26 mapas e os padrões dos oito chefes estão implementados. Retomar os aceites de combate/balanceamento (2.2/2.3.0.4), rotas de segredos e ensaio físico. Em seguida avançar áudio (6.1: buses, preferências e scheduler; 6.2: primeiro tema do distrito/chefe), depois arte/interface. Consultar incrementos 13–14 em `EXECUCAO.md`, `CHEFES.md` e `CAMPANHA_E_SUBFASES.md`; não tratar catálogo completo como aprovação final.
4. Atualizar status somente com evidência. Antes de avançar para cada lote de subfases, validar o lote anterior.
5. Não confundir a publicação do ambiente de desenvolvimento com a publicação do jogo, commits remotos, GitHub Actions ou APK.
