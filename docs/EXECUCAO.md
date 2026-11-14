# Registro de execução

## Incremento 1 — 13/11/2026

Referência: `PLANO_DE_IMPLEMENTACAO.md`, fases 1, 2.1 e 9.1.

### Implementado

- Relógio de simulação fixa 60 Hz com limite de recuperação, preservando parâmetros originais por tick.
- Estados de entrada separados entre teclado, toque e gamepad; limpeza ao pausar, carregar, parar ou perder foco.
- Pausa sincronizada com telas; ações bloqueadas durante pausa/conclusão; chefe congela gameplay ao morrer.
- Cancelamento de callbacks atrasados de conclusão/continue quando a partida é substituída.
- Colisão varrida por eixo para jogador contra sólidos; limite inicial de queda; plataforma móvel transporta seu ocupante.
- Impulso inicial de wall-kick preservado durante seis ticks.
- Troca livre mantida para teste e identificada no HUD/instruções. `VITE_TEST_CHARACTER_SWITCH=false` desliga troca livre no build final sem remover a escolha no continue.
- Conversão de HP ao trocar sem o ganho mínimo anterior de 10 HP.
- Testes versionados em `tests/gameplay.test.ts`; execução por `npm test`.

### Limites desta entrega

Não converteu a campanha em 26 mapas, não implementou respawn exploratório, não produziu APK, nova trilha nem sprites. Colisão varrida ainda não foi aplicada a inimigos/projéteis. Esmagamento por plataforma e sobreposição inicial precisam da próxima etapa. Movimento usa passo fixo mas desenho ainda não interpola entre ticks. Gamepad físico/DualShock 4 e aparelho Android não estão disponíveis para certificação nesta sessão.

O build padrão mantém troca de teste ligada. Para verificar a configuração final: `VITE_TEST_CHARACTER_SWITCH=false npm run build`. O APK release futuro deverá definir essa flag explicitamente.

### Evidências

- `npm test`: 20 testes passaram, nenhum falhou ou foi ignorado. Cobrem relógio em 30/60/120/144 Hz, interrupções/pausa, combinação de entradas, colisão em quatro direções, parede/plataforma fina, limpeza de entrada, troca de teste, wall-kick, plataforma móvel e callbacks de conclusão.
- `npm run lint`: passou.
- `npm run build`: passou, com geração de PWA. Persiste o aviso anterior sobre `__dirname` e futura configuração do Vite.
- `VITE_TEST_CHARACTER_SWITCH=false npm run build -- --outDir /tmp/mindbreak-release`: passou; verificado em preview separado, sem substituir o build padrão de testes.
- Chromium: perfil de teste permite troca, pausa ao perder foco, reinicia e permite escolher Leon no continue após jogar com Maya; perfil final não mostra botão de troca e Tab não troca personagem. Início, pausa e reinício passaram nos dois perfis, sem exceções JavaScript ou mensagens de recuperação do loop.
- Simulação/render de 240 atualizações em cada combinação de oito fases e três heróis: 24 combinações executadas sem coordenadas inválidas. Exercitou movimento, salto, dash e ataque; não representa conclusão das fases nem validação de todos os segredos.
- `git diff --check`: passou. Não houve push, commit, execução remota de Actions, publicação do ambiente ou geração de APK.

### Próximo incremento

Retomar 1.3.0.2–1.3.0.4 e 1.4.0.3: fila de ações por tick, buffer/coyote, entradas equivalentes e sobreposição/esmagamento. Só então fechar o ajuste de movimento/câmera e expandir combate, respawn e subfases.

## Incremento 2 — 13/11/2026

### Escopo entregue

- Fila limitada de ações discretas consumida no passo de simulação; pulo, ataque, dash, PSY e assist passam pelo mesmo relógio em teclado, touch e gamepad.
- Coyote time e buffer de pulo de seis ticks; teclas físicas equivalentes não se cancelam ao soltar apenas uma delas. Buffers são limpos em transições/pausa.
- Normalização de voo diagonal e parâmetros de movimento/respawn reunidos em `tuning.ts`.
- Resolução de sobreposição inicial, detecção limitada de esmagamento sem laço infinito e resgate em piso revalidado, sem atravessar paredes por empurrão de esteira. Se não existir posição segura, encerra a partida em vez de manter o jogador preso.
- Varredura de projéteis e corpos lançados contra alvos; projéteis não perfurantes atingem apenas o primeiro contato. Rasteiras e arremessos registram alvos já atingidos. Inimigos mortos deixam de agir/recompensar impactos adicionais.
- Correção do custo mínimo de PSY burst, fallback da reflexão para inimigo vivo próximo, cooldown de dano da armor de Leon e raio de overdrive independente da resolução.
- `SpawnManager` integrado aos oito mapas existentes: spawnId estável, IDs novos por aparição, distância 2D, cinco segundos de afastamento, cooldown mínimo de quinze segundos e retorno fora da câmera, longe do jogador, sem sobreposição com sólidos/inimigos. A distância de afastamento se adapta ao tamanho do mapa até 1.800 unidades. Nenhum inimigo vivo é duplicado; teto inicial de repopulação: 24 ativos.
- Inimigos das emboscadas obrigatórias não reaparecem. Chefes/baús não são restaurados por esse sistema. Reaparições não dão pontos e, portanto, não geram farm de 1-UP; acertos ainda podem recuperar foco e compor combos.
- Options/Start é lido mesmo com a simulação pausada; desconectar gamepad durante a partida pausa o jogo. Mapeamento padrão do DualShock 4 descrito na interface, ainda sem certificação em controle físico.
- Workflow `manual-checks.yml` criado com **apenas workflow_dispatch**. Faz testes, TypeScript e build web de teste/final. Não gera APK e não foi acionado no GitHub. Teste automatizado protege a regra de gatilho manual.
- Histórico de conversa retirado de `public/assets`, com cópia preservada e comparada fora do checkout. Isso remove o arquivo do pacote atual, não do histórico Git antigo.
- README e plano atualizados, incluindo a autorização de envio de código ao GitHub e a exigência de pedido expresso para gerar APK. Bun 1.4.4 identificado no manifest.

### Evidências desta entrega

- `bun install --frozen-lockfile`: passou, sem alteração do lockfile.
- `npm test`: **43 testes passaram**, nenhum falhou/foi ignorado; inclui respawn, distâncias curtas/longas/verticais, cooldown, visibilidade, bloqueio de spawn, identidade, arenas, comandos por tick, buffer/coyote, dano único, armor, overdrive, gamepad e regra de Actions manual.
- `npm run lint`: passou.
- Builds web padrão e com `VITE_TEST_CHARACTER_SWITCH=false`: passaram com geração dos recursos PWA. O aviso preexistente sobre `__dirname` permanece.
- Chromium: seleção, troca de teste, início, pausa por perda de foco, reinício e escolha de personagem no continue passaram. No perfil final, botão e Tab não fazem troca livre. Foram executadas/renderizadas 24 combinações de oito fases e três heróis, por 240 updates cada, sem exceções ou posições inválidas.
- Chromium mobile 390×844 com dois pontos de toque pelo protocolo do navegador: voo da Maya, direção simultânea e arraste/liberação fora do botão passaram; nenhuma tecla de pulo/direção ficou presa.
- Gamepad virtual no navegador: Options pausou e retomou através do App. É validação de integração, não teste físico de DualShock 4.
- Um roteiro de navegador inicialmente falhou porque HMR gerou instâncias distintas do módulo inspecionado. Confirmada a URL com timestamp, a verificação foi repetida em servidor novo sem HMR e passou. Não houve alteração de produto para contornar esse problema do roteiro.
- `git diff --check`: passou. As verificações foram locais; nenhuma Action remota foi acionada e nenhum APK foi gerado.

### Limites e continuação

A campanha ainda tem os oito mapas antigos. As 26 subfases estão detalhadas no plano, mas não foram criadas artificialmente por duplicação. Persistência entre subfases, viewport lógica, refinamento de chefes, trilhas, sprites e Android continuam pendentes. A resolução discreta de inimigos terrestres contra sólidos ainda não foi substituída por varredura. O balanceamento dos tempos/distâncias de respawn é inicial e precisa de playtest exploratório.

O próximo lote deve consolidar câmera/resolução lógica e o contrato de campanha/subfase, seguido da primeira fase principal expandida. Publicação de código no GitHub está autorizada; publicação de release e geração de APK continuam dependendo de pedido expresso.


## Incremento 3 — 13/11/2026

### Correção de direção: recompensar persistência

A orientação nova do usuário substitui a política anterior de zero pontos em reaparições. Farm de vidas não é tratado como problema por si só; persistência deve render progresso. Para limitar repetição apenas do mesmo inimigo sem impor teto global, a regra inicial adotada é **1.000 → 500 → 50 → 0** por derrota confirmada da mesma origem.

- O histórico é separado por spawnId, persiste nos retornos/continue da tentativa corrente e reinicia ao carregar uma nova tentativa da fase. Não é só o número de aparições: um desaparecimento sem derrota confirmada não consome recompensa.
- Inimigos comuns passam a recompensar a derrota, sem pontuar em cada golpe. Captura telecinética conta como uma derrota; a mesma entidade não paga duas vezes.
- Pontos ocultos continuam alimentando o sistema interno de vidas extras. **Não foi adicionado teto de vidas por fase.** Drops de vida, vidas encontradas e limites separados por categoria foram registrados como alternativas futuras, não implementados sem escolha/balanceamento.
- Pontos, limiar da próxima vida e totais numéricos foram retirados do HUD e das telas de conclusão/vitória. Vida conquistada continua tendo feedback visual/sonoro e o número de vidas permanece visível. Combo/rank continuam sendo informação de combate, não exposição do acumulador interno.
- Regras anteriores para recompensas de chefe, objetos e reflexão continuam funcionando. Não foi criado XP ou novo atributo de personagem.

### Continuação de jogabilidade: câmera

- Extraído `camera.ts` com viewport de altura lógica 900. Na proporção 16:9 a área é 1600×900 em 960×540, 1280×720, 1920×1080 e 2560×1440; aumentar resolução não aumenta visão do mundo.
- Retrato conserva altura lógica e enquadra largura menor, evitando comprimir um cenário inteiro e tornar o personagem minúsculo. Orientações/proporções diferentes ainda veem larguras diferentes por decisão de enquadramento.
- Câmera antecipa o lado para o qual o personagem olha, tem zona morta de oito unidades e segue com interpolação. Limites de mundo/arena e dimensões mínimas são tratados; rotação/redimensionamento reenquadram imediatamente.
- A área do overdrive permanece independente da câmera. Respawn usa a mesma área lógica do desenho para decidir visibilidade.

### Evidências

- `npm test`: **56 testes passaram**, nenhum falhou/foi ignorado. Incluem ciclos reais de reaparição e recompensa decrescente por origem, morte única, captura, vida extra a partir de pontos ocultos, ausência de pontuação renderizada e equivalência de câmera entre resoluções.
- `npm run lint`: passou.
- Build web padrão e build com troca de teste desligada: passaram; sem geração de APK.
- Chromium: recompensa de derrota elevou o acumulador interno de 14.900 para 15.900 e vidas de três para quatro, sem expor pontos no HUD. Conclusão de fase sem pontuação numérica validada. Área lógica idêntica em duas resoluções 16:9 confirmada em execução.
- Regressão de navegador nos perfis de teste/final passou: troca livre apenas no perfil de teste, início, pausa, reinício e escolha de personagem no continue. As 24 combinações de oito mapas/três heróis executaram e renderizaram sem exceções/posições inválidas.
- Toque simultâneo em tela mobile, voo e liberação fora do botão passaram novamente. Options virtual pausou e retomou pela interface. Isso não certifica Android/DualShock 4 físicos.
- Nenhuma Action remota acionada, nenhum APK gerado. A configuração de workflows permanece exclusivamente manual.

### Pendências preservadas

A regra de pontuação foi corrigida antes de avançar conteúdo. A campanha ainda tem oito mapas; contratos e produção das 26 subfases, salvamento, ajustes de aceleração/balanceamento, música, sprites e pacote Android continuam no plano. A câmera ganhou base lógica, mas DPR, escala inteira e opções de shake ainda exigem acabamento e ensaio em aparelho.

## Incremento 4 — 13/11/2026

### Campanha e conteúdo entregue

- Criados contratos executáveis de fase principal, subfase, porta, checkpoint, recursos carregados e progresso da sessão em `src/game/campaign/`.
- O distrito passa a ter **quatro mapas novos conectados**: 1A Fuga do Laboratório, 1B Telhados de Neon, 1C Esgotos de Manutenção e 1D Avenida Bloqueada. São 18 inimigos comuns iniciais, 11 pontos de apoio, seis portas e um encontro final com Cipher-01.
- As fases 2–8 preservam seus sete mapas originais via adaptadores. A campanha tem **11 mapas executáveis**, com meta editorial ainda em 26. O distrito original continua disponível pela API e pelo botão de teste, oculto no perfil final.
- A ação CIMA para portas usa a fila de simulação em teclado, toque e gamepad. Um toque curto não se perde; manter cima sem novo evento não atravessa automaticamente.
- Portas preservam herói, HP, foco, vidas, pontuação oculta, próximo limiar de vida, WAV e tempo restante dos buffs. Não curam nem trocam personagem.
- Estado de objetos/baús, pickups, inimigos vivos e HP, arenas e histórico de recompensas fica separado por subfase e é restaurado ao voltar. Spawns têm namespace de setor, evitando identidades ambíguas.
- Tempo simulado em outro setor conta para a ausência/cooldown. Retornos elegíveis são repovoados antes do primeiro desenho, sem surgir diante de uma câmera já mostrada; distância de segurança, ocupação e população máxima continuam valendo. Preparação offscreen durante exploração normal se adapta à largura/altura da viewport.
- Pontos de apoio são ativados por aproximação no chão e indicados no HUD/bandeiras. Morte com vida restante e continue voltam ao ponto ativado no setor corrente, com piso revalidado. O continue ainda pode mudar herói sem apagar exploração.
- Arenas ativas e chefe em combate bloqueiam portas. Cipher-01 aguarda a arena obrigatória do bloqueio; só o encontro de 1D conclui a fase 1. Avanço para fase 2 continua carregando o mesmo herói, vidas e progresso interno conforme o contrato anterior entre fases principais.
- O menu pode retomar a exploração da sessão atual. Isso preserva o estado vivo em memória; não há promessa de save após fechar/recarregar a página.
- Validação de dados na carga rejeita portas inválidas, checkpoints obstruídos, geometria inválida, IDs duplicados, filiação incorreta, áreas inalcançáveis e quantidade incorreta de encontros finais. O total planejado é verificado sem fingir que as subfases futuras já existem.

### Validação e correção de rota

- `npm test`: **87 testes passaram**, nenhum falhou/foi ignorado. Há cobertura de grafo, compatibilidade antiga, preservação de recursos/estado, recompensas no retorno, morte/continue, pontos de apoio, botão curto de interação, gamepad, bloqueios e conclusão única.
- As rotas principais das quatro subfases foram percorridas em simulação com os três heróis, sem voo, teletransporte durante a travessia, contato com perigos ou dependência de resgate/imunidade. Combate/arenas são isolados nesses testes de geometria e têm verificações próprias; isso não certifica o balanceamento de todos os confrontos/segredos.
- O teste de geometria foi reforçado para detectar tentativa de dano, mesmo com imunidade do fixture. Encontrou contato com ácido para Maya/Leon no canal inicial dos esgotos. Os dois vãos foram ajustados de 120 para 80 unidades, mantendo as rotas superiores/segredos, e todos os testes rigorosos passaram. A restrição do teste foi mantida.
- A limpeza dos testes de campanha/jogabilidade passou a parar o sequenciador de música após cada teste, inclusive quando uma asserção falha, evitando que uma execução isolada fique aberta por um intervalo do fixture.
- `npm run lint`: passou. Builds web padrão e com `VITE_TEST_CHARACTER_SWITCH=false`: passaram; o aviso preexistente de `__dirname` permanece.
- Chromium: ação real de Cima atravessou portas, retornou com HP/munição e baú aberto preservados e retomou a mesma sessão pelo menu. A sequência completa de setores, protocolo de derrota final e avanço para fase 2 passaram com a interface React.
- Todos os **11 mapas da campanha × três heróis = 33 combinações** executaram e renderizaram no navegador por 120 updates cada. As 24 combinações de oito mapas originais/três heróis também passaram na regressão de compatibilidade.
- Toque simultâneo, voo, liberação fora do botão e Options virtual passaram. Toque real no botão CIMA atravessou porta mesmo com gamepad virtual ocioso. Sem transbordamento horizontal a 390 px. Não é certificação de Android/DualShock 4 físico.
- Perfil final testado sem troca livre nem botão do distrito original. Pontos continuam ausentes do HUD/conclusão.
- `git diff --check`: passou. Nenhuma Action acionada e nenhum APK gerado; os workflows continuam exclusivamente manuais.

### Documentação e próximos itens

O contrato atual está em `CAMPANHA_E_SUBFASES.md`, e o plano marca 4.1 implementada, 4.2 parcial e 4.3 parcial. O próximo bloco é o save versionado com restauração de estado e validação de dados, seguido dos próximos lotes de subfases. Música/arte/Android permanecem nas etapas posteriores. A retomada em memória não deve ser apresentada como persistência após encerrar o navegador.

## Incremento 5 — APK de testes por Action manual

Atendendo ao pedido específico de corrigir a Action, o workflow existente foi convertido em **Construir APK Android (manual)**. Mantém apenas `workflow_dispatch`: valida antes de compilar, verifica assinatura e disponibiliza APK/checksum/commit como artifact por 14 dias. Não foi acionado remotamente nesta entrega.

Capacitor 8.6.2 e projeto Android foram adicionados com Gradle 8.14.3/checksum, AGP 8.13.0, JDK 21 e SDK 36. O alvo Android não inclui service worker; o web preserva PWA. Dependências têm lockfile atualizado. Removida a inclusão do módulo Cordova vazio que gerava aviso `flatDir`. A assinatura debug é reutilizada via cache, com limites documentados; nenhuma chave entra no Git.

Os avisos da execução antiga eram Node 20 das Actions e migração de ubuntu-latest, corrigidos com Actions Node 24 fixadas por SHA e Ubuntu 26.04 explícito. Java 21 foi fixado pela compatibilidade, não por um aviso de Java confirmado.

Validação: 91 testes passaram, TypeScript e build web passaram; APK real compilado localmente (~4,2 MB), assinatura verificada e identificação `com.chimiasama.mindbreak`, mínimo API 24/target 36 conferidos. Nenhuma validação física de celular/controle é declarada. Instruções completas e pendências em [ANDROID_APK.md](ANDROID_APK.md). Uma nova execução manual em main é necessária; repetir a execução antiga preserva o workflow antigo.

## Incremento 6 — horizontal, câmera próxima e botão Voltar

Android fixado em horizontal reversível (`sensorLandscape`), com barras de sistema ocultadas por modo imersivo e restabelecimento ao recuperar foco. Controles com margem mínima de 24 px e safe areas. A câmera agora mostra 540 unidades de altura em vez de 900, ampliando o personagem aproximadamente 67%, sem alterar física.

Voltar abre confirmação: retornar ao menu durante a sessão ou fechar estando no menu. Um callback Android encaminha ao React, que pausa simulação/entradas/contador durante o diálogo. Fechamento só ocorre pelo plugin nativo após confirmação; repetição de Voltar não encerra. A retomada em memória segue as regras existentes.

91 testes passaram, TypeScript e compilação Java Android passaram. Chromium horizontal validou confirmação nas duas telas, repetição, cancelamento, retorno e retomada sem erros; uma ponte nativa simulada só recebeu `exitApp` após confirmação. Não foi gerado novo APK nem acionada Action. Validação física de orientação/barras/gestos/fechamento ainda pendente. Guia atualizado em [ANDROID_APK.md](ANDROID_APK.md).

## Incremento 7 — save versionado e retomada persistente

Concluída a base da etapa 4.3: save local versão 1, validação completa antes da restauração, identificação do conteúdo por fase principal e cópia anterior de recuperação. Mantém os setores visitados, recursos, plataformas, objetos, itens, arenas concluídas, inimigos vivos e histórico de derrotas/recompensas. Restauração volta ao ponto de apoio, sem avançar relógios pelo tempo real fechado; chefes em andamento reiniciam o confronto. Continue, game over e fase concluída têm estados próprios, sem concessão indevida de vidas/bônus.

A interface permite carregar após recarga da página, pede confirmação para substituir/apagar o save, informa incompatibilidade/recuperação e segue jogável quando armazenamento falha. Apagar o save desativa novas gravações da sessão antiga até uma ação explícita de retomada/nova campanha. O mapa original de teste não substitui o progresso. Confirmações compartilham componente com foco e cancelamento por Escape; o tratamento Android de Voltar foi preservado.

Evidências: 106 testes passaram; TypeScript e build web passaram. Chromium horizontal validou save de outro setor com recursos próprios, recarga/carregamento, cancelamento de substituição, descarte, recuperação de backup, arquivo incompatível e quota esgotada, sem erros JavaScript. Ensaios de processo/atualização em Android físico continuam pendentes. Nenhuma Action acionada e nenhum APK gerado. Contrato completo em [SALVAMENTO.md](SALVAMENTO.md).

Próximo bloco: expansão do monotrilho em 2A/2B/2C, mantendo o grafo exploratório e verificando rotas com os três heróis antes de expandir outros capítulos.

## Incremento 8 — monotrilho em três setores

A fase 2 passou a ter três mapas próprios: **2A Vagões e Embarque**, **2B Cabos e Manutenção** e **2C Teto e Pórticos**, com 15 inimigos iniciais, nove checkpoints e nove objetos entre recursos/segredos. Há portas de ida/volta e posições de chegada separadas; recursos, objetos e histórico de respawn continuam preservados, inclusive no save. A arena obrigatória e Valkyrie-7 ficam apenas no último setor, com o chefe aguardando a escolta. O perigo de pórtico foi restrito a 2C; há teste de dano em pé e proteção por rasteira.

A campanha tem agora **13 mapas**: quatro do distrito, três do monotrilho e seis adaptadores das fases 3–8. O mapa original do monotrilho permanece como ferramenta de teste, sem substituir o save da campanha. A seleção do menu descreve a nova distribuição. Arte e trilha atuais foram reaproveitadas; não são apresentadas como produção nova.

Verificações: **128 testes passaram**, incluindo geometria de ida/volta do monotrilho com os três heróis, sem voo, dano, teletransporte durante percurso ou resgate. Os primeiros ensaios encontraram tetos interferindo em saltos; a geometria foi ajustada antes do aceite. Os testes de rota isolam combate e pórticos, que têm verificações separadas; não certificam o balanceamento integral dos confrontos. Acrescentado teste de compatibilidade do save: mudar outra fase não invalida a tentativa corrente, enquanto alterar a geometria da fase salva sinaliza incompatibilidade.

TypeScript, build web e build dos assets Android passaram. Chromium em 915×412 atravessou 2A → 2B → 2C pelo controle de toque e o build de produção carregou o save dos três setores, retornou ao menu e ofereceu retomada, sem overflow ou erros JavaScript. O fluxo Android de Voltar continuou passando nos testes de interface com ponte simulada. Nenhuma Action foi acionada e nenhum APK foi gerado.

Próximas pendências de jogabilidade: perfis de aceleração/frenagem e colisão terrestre dos inimigos, seguidas da expansão do canteiro em 3A/3B/3C. A meta continua em 26 subfases; música e arte seguem depois da base de gameplay. Multiplayer/migração de engine permanecem futuros.

## Incremento 9 — aceleração e terreno dos inimigos

Implementados os perfis de movimento versão 1: arranque/frenagem curtos por herói, controle aéreo ágil, aproximação sem ultrapassar a velocidade alvo e precedência preservada para dash/rasteira/wall-kick/stun. Fatores de impulso, canos, voo e escalada foram centralizados sem alterar os valores verticais. Medição real antes/depois confirmou o mesmo envelope dos saltos em corrida; dados em [MOVIMENTACAO_E_TERRENO.md](MOVIMENTACAO_E_TERRENO.md).

Inimigos terrestres usam varredura contra sólidos em X/Y, incluindo knockback/stun, transporte por plataforma e esteira com parede. A perseguição verifica piso/borda/perigo, respeita limite à origem e evita flanco sem aterrissagem segura. Queda causada por impulso continua possível; desaparecimento ambiental não passa a conceder recompensa. Navegação aérea, física dos chefes e a futura máquina de estados completa permanecem separadas.

144 testes passaram, incluindo as rotas anteriores e a nova cobertura de movimento/terreno. TypeScript, build web e smoke de navegador passaram. Sem Action remota ou APK. Próximo bloco: canteiro em 3A/3B/3C, usando a nova base e verificando percurso e retorno com os três heróis.

## Incremento 10 — fundação, subida e heliponto

A fase 3 foi expandida em **3A Fundação da Torre**, **3B Guindastes e Vigas** e **3C Heliponto na Tormenta**. São 16 inimigos iniciais, nove checkpoints e nove objetos de recurso/segredo. O núcleo sobe mil unidades em degraus, com patamar intermediário, guindastes móveis e andaimes opcionais. Goliath-IV está apenas no heliponto e espera a escolta obrigatória. O mapa original do canteiro continua acessível como teste, sem gravar por cima da campanha.

A campanha tem **15 mapas**: dez próprios nos capítulos 1–3 e cinco adaptadores dos capítulos 4–8. Continuam previstas 26 subfases. As mudanças na fase 3 alteram sua identificação de conteúdo; saves do antigo canteiro são mantidos como incompatíveis, sem migração silenciosa. A identificação das fases 1/2 permanece igual. Arte e trilha foram reaproveitadas, sem afirmar produção nova.

Também corrigida a medição da distância de ataque depois de deslocar um inimigo por impulso/plataforma: ele não pode acertar corpo a corpo usando uma posição antiga. Há teste de regressão próprio.

**166 testes passaram**, incluindo percurso e retorno dos novos setores para os três heróis sem voo, dano ou resgate, validação de spawns fora do terreno, checkpoint/restauração no meio da subida, acompanhamento vertical da câmera, escolta e conclusão única do chefe. Os ensaios de rota isolam combate e não certificam dificuldade integral ou todos os segredos. Os primeiros ensaios revelaram andaimes interferindo no arco de salto; a geometria foi ajustada antes do aceite.

TypeScript, build web e assets Android passaram. Chromium em 915×412 validou aceleração/frenagem pelo teclado, movimento+pulo com dois toques simultâneos via CDP, liberação dos comandos, portas 3A → 3B → 3C por CIMA, câmera na subida e carregamento de save no build de produção, sem overflow ou erros JavaScript. Fluxos de save e Voltar foram verificados novamente. Ensaio físico Android/DualShock 4 continua pendente; nenhuma Action acionada e nenhum APK gerado.

Próximas pendências: acabamento do comportamento/combate de inimigos e chefes, expansão da fábrica e do distrito financeiro (4A–4C/5A–5C), depois demais capítulos. Música e arte permanecem após a base de gameplay; multiplayer/migração de engine seguem futuros. As Actions continuam exclusivamente manuais.

## Incremento 11 — estados da IA, ataques legíveis e stun

Inimigos comuns agora usam patrulha, alerta, perseguição, preparação, ataque, recuperação, stun, voo/queda, retorno e morte explícitos. Preparação trava a mira/direção; ataque emite um evento; recuperação abre resposta. Visão respeita sólidos, e perda de alvo conserva apenas uma memória limitada da posição vista. Giro lento do guarda, flanco do cão e cobertura do gunner permanecem com regras explícitas, sem pular preparação/recuperação.

Corrigido stun do guarda por fora de dano bloqueado: dash/invulnerabilidade não são atordoados. Stun dura 24 ticks com graça de 90 contra repetição. Projéteis de ambos os lados passam a respeitar a primeira parede por varredura, com ordem de contato correta para WAV e alvos anteriores à parede.

Save versão 1 preserva os novos estados e aceita inimigos antigos sem IA. Ataques em andamento restauram em recuperação no checkpoint. Recompensas e identificação de conteúdo das fases existentes não foram alteradas.

177 testes passaram, incluindo os onze arquétipos e novas regressões. TypeScript, build e smoke de navegador de exploração/save passaram. Nenhuma Action ou APK. Chefes ainda usam lógica separada; o balanceamento completo continua pendente. Contrato em [IA_E_COMBATE.md](IA_E_COMBATE.md). Próximo lote: fábrica/financeiro, em 4A–4C e 5A–5C.

## Incremento 12 — fábrica e financeiro em seis setores

Implementadas **4A Tanques de Refrigeração**, **4B Linhas de Esteiras**, **4C Núcleo de Descarte**, **5A Boulevard de Mármore**, **5B Garagens e Serviços** e **5C Suíte Executiva**. São 30 inimigos iniciais, 18 checkpoints e 18 objetos de recurso/segredo. Tanques têm canais de resíduo, as esteiras seguem sentidos opostos e as garagens incluem duas barreiras laser e elevadores. Todos os capítulos possuem retorno entre setores; arenas e chefes ficam nos setores finais. Os mapas originais 4/5 continuam como testes sem substituir o save.

A campanha tem agora **19 mapas**: 16 próprios nas fases 1–5 e três adaptadores das fases 6–8. A meta continua em 26. Saves dos capítulos 1–3 mantêm sua identificação; saves das geometrias originais de 4/5 são retidos como incompatíveis. Arte, trilha e padrões de chefes existentes foram reaproveitados, sem afirmar que a individualização dos chefes foi concluída.

Refinamentos da IA: patrulha vira ao encontrar borda/parede, voo sem alvo retorna à altura original e recuperação readquire o alvo visível antes de preparar o próximo ataque. O teste antigo de parede foi ajustado para verificar aproximação e ausência de atravessamento durante todo o percurso, permitindo o afastamento esperado depois da inversão de patrulha.

**219 testes passaram**, incluindo ida/volta dos seis setores com os três heróis sem voo, dano ou resgate; lasers fazem parte dos trajetos testados. Também foram verificadas geometria/spawns, esteiras opostas, save/restauração, preservação de objetos e bloqueio dos chefes até a escolta. Os primeiros ensaios encontraram falta de espaço de salto/aterrissagem perto de um tanque e de uma barreira; foram ajustados os mapas antes do aceite. Percurso isolado não certifica dificuldade dos confrontos ou todos os segredos.

TypeScript, build web e assets Android passaram. Chromium horizontal validou seleção das fases 4/5, portas por CIMA via toque, carregamento dos saves com três setores no build de produção, retorno ao menu e retomada, sem overflow/erros JavaScript. Regressões de toque simultâneo, save e Voltar continuaram passando. Nenhuma Action acionada e nenhum APK gerado; teste físico Android/DualShock 4 permanece pendente.

Próximo bloco: individualização dos chefes/combate e expansão de museu, blacksite e torre (fases 6–8), para fechar a meta de 26. Música, arte e acabamento seguem após a base. Multiplayer/migração de engine continuam futuros, sem alterações nos gatilhos manuais das Actions.

## Incremento 13 — sequências dos oito chefes e dois corpos dos gêmeos

Chefes passam a usar preparação com alvo travado, ataque com duração finita e recuperação. Cada um tem sequência própria nas duas fases, incluindo leque/chuva ácida de Arisawa, rajada/bombardeio de Vane, saque de Kusanagi e órbitas/olho de Oswald. A transformação interrompe o padrão anterior com respiro de 45 ticks. Investidas/mergulhos usam varredura; projéteis têm descarte vertical e continuam respeitando paredes.

Castor/Pólux agora recebem dano nos dois corpos com uma vida/identidade de dano compartilhada. Golpe, especiais, reflexão, WAV e corpo lançado consultam ambos; sobreposição ou travessia dos dois não duplica dano por ataque nem conclusão/recompensa. Portal respeita sólidos/limites e distância do jogador. Arenas acompanham a identidade da escolta para que sair dos limites por impulso não libere uma arena com sobrevivente.

239 testes passaram; TypeScript e build passaram. Chromium confirmou golpe real no corpo secundário e preparação/marcador sem erro. Há simulação longa dos oito padrões, mas não certificação de vitória/dificuldade completa ou controle físico. O save mantém a regra de reiniciar chefe incompleto no checkpoint. Nenhuma Action/APK. Contrato em [CHEFES.md](CHEFES.md). Próximo bloco: setores das fases 6–8 para atingir 26 mapas próprios.

## Incremento 14 — 26 setores próprios, torre completa e fluxo final

Implementados **6A Galerias Holográficas**, **6B Jardins Digitais**, **6C Acervo Restrito**, **7A Docas de Blacksite**, **7B Blocos de Contenção**, **7C Centro de Comando**, **8A Base da Torre**, **8B Núcleo Zero**, **8C Elevador Orbital** e **8D Estratosfera**. São dez novos mapas, com 51 inimigos iniciais, 30 checkpoints e 30 objetos. A torre diminui a gravidade por setor e sobe 900 unidades no eixo orbital; plataformas móveis são opcionais, sem exigir voo para concluir.

A campanha atinge **26 mapas próprios**, sem adaptadores no catálogo: 4+3+3+3+3+3+3+4. Total atual: 130 inimigos iniciais, 77 checkpoints e 78 objetos. Os oito originais continuam como ferramentas de teste. Seleção atualizada para mostrar setores conectados, sem anunciar expansão já concluída. Os chefes estão apenas nos últimos setores; o HUD dos gêmeos informa vida compartilhada.

**307 testes passaram**. As rotas de ida dos 26 setores e retorno dos capítulos 2–8 foram verificadas com Ren/Maya/Leon sem voo, dano ou resgate; combate é isolado nesses ensaios. Cada setor também foi carregado em uma instância nova do motor, preservando recursos/cache de exploração. Há verificação de distribuição, geometria distinta, spawns/chefes fora do terreno, encontros únicos, checkpoint/câmera orbital e fim dos capítulos 6–8. Ajustada a aterrissagem antes do primeiro vão de 7A após o ensaio com Leon; os números de salto dos heróis não foram alterados.

TypeScript, builds web/assets Android e sync passaram. Chromium horizontal atravessou as portas dos capítulos 6–8 por toque, carregou os saves no build de produção, mostrou a fase 2 de Oswald, concluiu os diálogos e restaurou a vitória sem repetir a recompensa. A derrota foi disparada no ensaio para verificar o fluxo final, não houve certificação de uma campanha inteira vencida em tempo real. Regressões de save, Voltar e os dois corpos dos gêmeos passaram novamente. Nenhuma Action acionada e nenhum APK gerado; físico Android/DualShock 4 permanece pendente.

Os saves das fases 1–5 conservam a identificação de conteúdo. Os das geometrias originais 6–8 são retidos como incompatíveis, sem migração silenciosa. BossMind/projéteis continuam transientes, reiniciando chefe incompleto no checkpoint; formato do save continua versão 1.

A meta de contagem/grafo foi atingida. Próximos passos: aceites de combate/balanceamento, rotas de segredos e ensaio em aparelho, depois infraestrutura de áudio (buses, sliders/preferências, scheduler) e primeiro tema do distrito/chefe; arte e interface seguem após isso. Multiplayer/migração de engine continuam futuros. Nenhum gatilho automático foi acrescentado.

Na revisão do incremento 14, `setPaused(false)` passou a respeitar conclusão/continue/game over pendentes. Fechar um overlay não pode reativar a simulação nesse intervalo; carregar/reiniciar/confirmar continue faz a transição pelas regras próprias. Há teste de regressão para os três estados.

## Incremento 15 — Torretas industriais, instalador e regras de projéteis

Pedido do usuário priorizado antes do próximo bloco de áudio. Fixas de parede/teto em 4A/7A/7B, abertura e rajada de três tiros com mira travada. Instaladores em 4B/7B aproximam-se, preparam 90 ticks, deixam uma torreta de 180 HP e fogem; têm 55 HP e matar antes do evento impede a instalação. Fixas novas têm 90 HP. Fuga respeita terreno/perigos/leash; suportes não são lançados/puxados. Sprites procedurais distinguem instalador e torreta reforçada.

Origens filhas dormentes são ativadas pelo SpawnManager, com IDs/gerações e recompensas persistentes, sem duplicação. Torretas instaladas não reaparecem sozinhas; novo instalador pode repor uma derrotada, conservando a curva 1.000 → 500 → 50 → 0. Formato de save continua v1; só filhos previstos aceitam geração -1, e instalação/fuga sobrevivem ao carregamento. Rajadas antigas são canceladas no checkpoint. Saves anteriores das fases 4/7 são retidos como incompatíveis; demais identificações permanecem.

A varredura de tiros contra terreno já estava presente; não foi reproduzido atravessamento de sólidos por tiros comuns atuais. Separadas as políticas de perfurar atores, atravessar paredes e refletir. Todos os ataques atuais continuam bloqueados por terreno; somente opt-in explícito poderá criar exceção futura. O Olho Cósmico de Oswald não pode ser rebatido e recebe contorno branco, sem ganhar penetração de parede.

**320 testes passaram**, incluindo 13 novas regressões de implantação, morte/interrupção, fuga, reposição/recompensa, montagens, alto deslocamento, reflexão e codec. TypeScript e smoke Chromium horizontal passaram. Ensaio visual confirma os dois suportes de 4A e aproximação/instalação/fuga de 4B, com save restaurado sem duplicar filho e sem erros JavaScript. São posições/tempo preparados para o ensaio; não certificação de campanha vencida ou dificuldade no Android físico. Contrato em [TORRETAS_E_PROJETEIS.md](TORRETAS_E_PROJETEIS.md). Builds web/assets Android e sync verificados; nenhuma Action/APK. Próximos: balanceamento/segredos e ensaio físico, depois áudio conforme plano.

## Orientação após o incremento 15 — saves de desenvolvimento

O usuário esclareceu que é o único instalador e sempre testa com instalação limpa. Compatibilidade/preservação de saves antigos deixa de ser requisito até pedido expresso. Atualizados contrato 0.1.0.13, item 4.3.0.2 e SALVAMENTO.md; nenhum comportamento de gameplay ou armazenamento foi alterado nesta anotação. Próximos incrementos podem mudar o formato sem migrações ou esforço de preservar versões anteriores.

## Incremento 16 — Combo de três golpes e mixer/scheduler de áudio

Retomados 2.2.0.2 e 6.1.0.1–2. O combo começava na etapa errada e lançava no segundo golpe: agora cortes 0/1 e finalizador 2, com expiração, recuperação maior no finalizador e um comando antecipado no fim da recuperação. Impactos e sons acontecem no início aceito, uma vez por alvo; o arco termina antes da recuperação. Dano/stun/resgate interrompem a cadeia; pausa limpa buffer. Cobertura sólida protege inimigos/chefes/props/reflexão. Sem mudança na quantidade de fases ou novas migrações de save.

Áudio passa por canais separados de música/efeitos/voz e master, com quatro sliders no menu/pausa, persistência global, mute sem reinício e suavização/limitação de picos. Notas são agendadas no relógio do AudioContext com look-ahead; pausa preserva a sequência, background cancela fontes/suspende contexto e retomada por gesto reativa. Limite de 48 fontes; sequências de efeitos usam offsets de áudio em vez de timeouts. Os oito protótipos musicais permanecem, sem anunciar novos temas como compostos.

**332 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal confirmou preferências após reload, sliders na pausa, mute com fase avançando, suspend/resume de contexto real e sequência 0/1/2, sem erros JavaScript. Ensaio instrumentado, sem certificação auditiva Android/DualShock 4. Contrato, números e pendências em [COMBOS_E_AUDIO.md](COMBOS_E_AUDIO.md). Nenhuma Action/APK. Próximo bloco: composição do distrito e chefe, seguida dos demais temas; especiais, balanceamento/segredos, arte e aceites físicos continuam previstos.

## Incremento 17 — Distrito e Cipher: composição, transições e prévias

Retomados 6.2.0.1–2: `music.ts` contém Circuitos de Fuga (120 BPM/Mi menor/16 compassos/32 s) e Protocolo Cipher (136 BPM/Mi frígio com dominante de Si/oito compassos/14,12 s). Arranjos por setor, arena e fase 2 preservam motivos/harmonia; transições entram no compasso. Motor publica contexto real e seleciona o chefe somente após o gatilho. Pausa guarda passo/contexto pendente sem duplicar scheduler; capítulos 2–8 continuam com protótipos. Envelopes suavizados e buffers de ruído reaproveitados.

Prévia do distrito e das duas fases de Cipher em `docs/audio`, fora do bundle/APK. `tools/music-studio.html` renderiza OfflineAudioContext e exporta WAV a partir da partitura; não há sample/API externa. Autoria, BPM, instrumentação, memória, origem, medições e reprodução em [TRILHA_DISTRITO_E_CIPHER.md](TRILHA_DISTRITO_E_CIPHER.md).

**338 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal confirmou distrito → gatilho de Cipher → fase 2 via dano do motor, pausa/background/retomada e ferramenta de audição, sem erro JavaScript. Três ciclos renderizados com samples finitos, sinal presente e sem clipping; métricas na documentação. Ensaio instrumentado, não certificação de mixagem/repetição/latência em aparelho. Nenhuma Action/APK nem migração de saves. Próximo: demais sete fases/chefes e músicas de fluxo, mantendo aceites físicos e balanceamento pendentes.

## Incremento 18 — Correção das rotas que permitiam passar reto

O usuário interrompeu a sequência musical para priorizar exploração. O catálogo tinha caminhos elevados opcionais, mas saídas no corredor inferior e ensaios que premiavam ir à direita. Definido [PADRAO_DE_FASES.md](PADRAO_DE_FASES.md): ala elevada protegida, inspeção, retorno a outra ala e passagem persistente. Aplicado nos 23 setores fora do trem; mantidos 26 setores/oito fases e os três do trem como exceção mais linear.

Tabela autoral por setor, apoios/salas cobertas, controles e guardas próprios não repetíveis, 23 portões e verificação de saída/chefe independente de saltar/voar por cima. Seis depósitos laterais com baús existentes, sem exigir o circuito; checkpoints/saídas reposicionados e progressão persistente após morte/revisita. Tutorial, indicação de objetivo e CIMA atualizados. Save corrente valida progresso/portões sem criar migrações. Há 155 inimigos ativos iniciais, duas origens dormentes de torretas, 77 checkpoints e 78 objetos. Atlas/arte de acabamento continuam pendentes.

**378 testes passaram**: 69 idas exploratórias, 69 retornos e 18 percursos opcionais nos três heróis, além das regressões de trem, combate, saves, entrada e áudio. O planejador usa o motor e reproduz comandos sem modificar posição no percurso aceito. Combate isolado, móveis opcionais removidos e contatos de perigo recusados; não é campanha vencida manualmente nem certificação de dificuldade. Substituídos testes antigos de corredor, em vez de abrir os portões para fazê-los passar.

Chromium horizontal confirmou retenção de direita sem concluir, saída bloqueada, guarda vencido por golpes, CIMA por toque, abertura e persistência no retorno após reload, sem erros JS. Algumas posições foram preparadas para o ensaio de interação/combate. TypeScript, builds web/assets Android e sync aprovados. Mapas SVG de 1A/4B/8C exportáveis pelo script de autoria. Nenhuma Action/APK. Música fica pausada; próximos aceites são leitura/dificuldade/acessos no aparelho e variedade de mecanismos.

## Incremento 19 — Catálogo musical completo em síntese e sinais de gameplay

O usuário autorizou retomar música/outros sons após a revisão de exploração. Acrescentadas 14 partituras de capítulos 2–8/chefes e três de fluxo, totalizando 19 com o par distrito/Cipher. Há ganchos, progressões, ritmos e timbres por dupla, swing financeiro, subdivisões do museu, respostas dos gêmeos e fase 2 dos oito chefes. Seleção contextual em todos os capítulos, mudança no compasso e fluxos de menu/derrota/vitória; menu inicial espera gesto e playback repetido é idempotente.

Catálogo de 30 sinais com cooldown/prioridades: passos/aterrissagem, combo, materiais, quatro tipos de tiro, painel/portão/bloqueio/portal/checkpoint/segredo, torreta, aviso do chefe, overdrives por herói, confirmação/continue/derrota. Grito do combo normal somente no finalizador. Limite de 48 fontes, margem para sinais importantes e descarte/substituição de baixa prioridade; ruído compartilhado. Sem mudança na física, pontuação, exploração ou regra de Actions.

**385 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium percorreu os oito pares de tema/fase 2, pausa/background e fluxos de menu/game over/vitória, além do estúdio. Houve preparo dos cenários/estado concluído para o ensaio; não certificação auditiva ou campanha inteira vencida. Renderizadas 28 prévias finitas/sem silêncio acidental/clipping; cerca de 5,08 MiB somente na documentação, fora do bundle/APK. Estúdio exporta WAV e script/manifesto reproduzem o catálogo. Autoria, BPM, instrumentos, sinais e limitações em [TRILHA_E_EFEITOS.md](TRILHA_E_EFEITOS.md).

Nenhuma Action/APK. Permanecem escuta e latência no Android/DualShock 4, ajuste de mixagem/repetição sob carga, ambiências/efeitos legados e eventual produção gravada. Estrutura exploratória do incremento 18 conservada; não foram criadas migrações de saves.

## Incremento 20 — Pipeline de sprites e animação dos três heróis

Retomada fase 7 após catálogo sonoro. Atlas procedural editável de Ren, Maya e Leon, 18 clipes/55 posições de quadro por herói, paletas e proporções próprias. Render passa a usar quadros de corrida, salto, queda, parede/escalada, hang/vault, dash/slide, três ataques, dano/stun/especial, voo e morte. Retiradas rotação do idle no slide e inversão vertical no hang; cachecol e efeitos existentes preservados.

Pivot nos pés, fonte 24 × 32 a escala 2 e atlas 192 × 224; caixas físicas/alcance/tempos de combate preservados. Relógio visual congela no hitstop/cut-in e pausa. Combo amostra o relógio físico; evento documental não repete dano/som. Reset visual em área/resgate/troca de teste. Morte tem sequência no atlas, mas o continue imediato pausa na primeira pose; não se anuncia reprodução completa no fluxo atual.

Estúdio `/tools/art-studio.html` permite animar/inspecionar/exportar; script manual reproduz PNG/JSON/folhas em `docs/arte`, fora do bundle. Contrato, orçamento de aproximadamente 504 KiB RGBA para três atlas e pendências em [ARTE_E_ANIMACAO.md](ARTE_E_ANIMACAO.md). Arte inicial por código, não acabamento final aprovado no aparelho. Inimigos, chefes e ambientes continuam pendentes; a contagem do plano foi corrigida para 12 arquétipos.

**390 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal com touch renderizou corrida/salto/ataque dos três heróis e verificou hitstop/pausa, sem erros JS; cenário/estados preparados para isolar o ensaio. Folhas de contato inspecionadas. Sem certificação física Android/DualShock 4. Nenhuma Action/APK, mudança de save ou nova alteração de áudio/exploração. Próximo bloco: silhuetas dos inimigos.

## Incremento 21 — Silhuetas e posturas dos 12 inimigos

Retomado 7.2.0.2: raster/paletas próprios para todos os arquétipos, substituindo o agente genérico recolorido. Armas, capacetes, capa, braços, ombreiras, mochila/ferramenta e proporções distinguem funções; cão/drone mantêm leitura não humanoide. Quatro posições por tipo para repouso/apoios/ação, sem anunciar quatro desenhos exclusivos. Seleção visual lê IA/velocidade e relógio visual, sem escrever na simulação. Caixas físicas, alcance, dano e instalação/respawn preservados.

Torretas recebem carcaça pixelada e conservam mira, extensão e suportes nos quatro sentidos; faixa âmbar identifica instalação. Escudos permanecem overlays condicionais à quebra. Mochila/ferramenta do engenheiro e chama do jetpack passam à fonte, removendo retângulos duplicados. Recortes próprios impedem que áreas transparentes reduzam cão/drone. Removido `pixelSprites.ts` sem consumidores, incluindo antigos heróis estáticos.

Estúdio e script manual exportam catálogo/atlas/JSON; cache nativo até 144 KiB RGBA, fora overhead. Contrato, tabela de identificação, imagens e limitações em [ARTE_DOS_INIMIGOS.md](ARTE_DOS_INIMIGOS.md). Arte de primeira passagem; chefes/transformações/retratos/cenários seguem pendentes.

**395 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal com touch desenhou 48 combinações pelo renderizador real, quatro suportes de torreta, quebra de escudo e cache; sem mutação de entidades ou erros JS. Estado preparado, não campanha manual ou ensaio físico Android/DualShock 4. Fontes e render inspecionados. Bundle JS +3,22 kB (+1,38 kB gzip). Nenhuma Action/APK, migração de save ou mudança de música/exploração. Próximo bloco: identidade visual dos oito chefes e transformações.

## Incremento 22 — Oito chefes, duas fases e poses ligadas à IA

Retomado 7.2.0.2: primeira passagem de pixel art de Cipher, Valkyrie, Goliath, Arisawa/Cyber-T-Rex, gêmeos, Kusanagi, Vane e Oswald/Entidade Zero. Duas variantes de fase/quatro poses (`ready/windup/active/recover`) e variante própria de Pólux: 72 posições gráficas. Transformações incluem reatores/circuitos, máscara/energia, espinhos e corpo cósmico. Não são ciclos completos de cada ataque ou arte final aprovada no aparelho.

Render lê fase/estado real sem mudar IA ou disparar eventos. Caixas físicas, alcance/tempos, dano, tiros, avisos, escudo e regras dos gêmeos preservados. Pólux usa suas coordenadas e não é desenhado sem elas; Entidade Zero passa a caber na caixa visual existente. Fontes/atlas cacheados até 864 KiB RGBA, fora overhead, sem canvas por frame. Estúdio e script manual exportam galeria/atlas/JSON. Contrato e prévias em [ARTE_DOS_CHEFES.md](ARTE_DOS_CHEFES.md).

**400 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal com touch renderizou 64 combinações de chefe/fase/estado, orientação e cache, conferiu o secundário dos gêmeos por pixels e acionou as oito fases 2 pelo dano real, sem mutação pelo renderer ou erros JS. Estados preparados, não campanha vencida nem ensaio físico. Folha de contato inspecionada. Nenhuma Action/APK, mudança de saves, áudio, exploração ou recompensas. Próximo: retratos/cut-ins (7.2.0.3), depois ambientes (7.3); aceites físicos e acabamento continuam pendentes.

## Incremento 23 — Revisão visual V2: anatomia e ilustração 2D

O usuário pediu formas humanas, menos blocos e liberdade de ampliar resolução/qualidade. Revisados os três heróis, 12 inimigos e oito chefes/duas fases: rig articulado, torso afunilado, cabeça/mandíbula e pescoço proporcionais, volumes de membros, tecido/costuras, metal/gradientes e equipamentos. Goliath segue mecha próprio, criaturas têm fontes específicas. Fontes de 96 × 128 para heróis/inimigos e 144 × 192 para chefes (16×/9× área), antialias e metadados V2; dimensões físicas e timings preservados.

Prancha pintada original por geração de imagem define Ren/Maya/Leon e direção de acabamento, preservada na documentação. É conceito de referência; os sprites integrados são a revisão procedural anatômica, sem anunciar pintura equivalente em cada pose. Galerias/atlas/JSON exportados novamente, ferramenta atualizada e validação manual de 285 recortes/cores/cache. Fontes/imagens/limites/memória em [DIRECAO_VISUAL_V2.md](DIRECAO_VISUAL_V2.md). Antigos documentos de arte foram marcados como contrato V1 superado.

**400 testes aprovados**; substituídas verificações de paleta/matriz de caracteres por contratos do rig/atlas, sem inflar a contagem. Chromium horizontal com touch verificou heróis, 48 combinações inimigas, quatro suportes, escudo, 64 combinações de chefes e oito transições por dano, sem erros JS ou mutação por render. Estados preparados, não campanha completa ou ensaio Android físico. TypeScript, builds web/assets Android e sync aprovados. Bundle JS 473,15 kB / 146,40 kB gzip; caches gráficos até aproximadamente 17,72 MiB RGBA mais overhead, pendente de profiling no aparelho.

Sem Action/APK, migração de save, mudança de colisão/IA, música, exploração ou recompensas. Próximos: avaliar leitura/custo no celular, refinar acabamento/poses rumo ao conceito, retratos/cut-ins e ambientes. Não tratar conceito ou suíte verde como aprovação visual final.

## Incremento 24 — Ren pintado a partir da prancha de conceito

O usuário pediu aproximar a imagem jogável da pintura detalhada e focar um personagem por vez. Produzidas três folhas RGBA do Ren por geração de imagem com referência direta ao conceito, incluindo correção de vazamento entre células. São 18 pinturas-fonte cobrindo 18 clipes/55 posições lógicas, com três chaves de corrida, alternância parede/escalada e holds/reutilização explícitos. Não se anuncia animação final com 55 pinturas independentes. Maya/Leon e demais fontes V2 preservadas.

Atlas real integrado 2560 × 2240, quadros 320 × 320, WebP alpha de 1.169.560 bytes. Pivot/referência preservam caixa física 32 × 56, timings, dano e habilidades. Loader assíncrono valida dimensões, usa cache e mantém fallback em erro; renderer consulta metadados por herói. Cachecol geométrico ocultado com pintura pronta e arco normal ajustado ao ciano. Workbox inclui WebP; assets Android locais contêm o arquivo. Fontes fora do bundle, manifesto com hashes/recortes/alinhamento e montagem manual reproduzível. Contrato/prévias em [REN_PINTADO.md](REN_PINTADO.md).

**406 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal confirmou Ren pintado na instância real do renderer, corrida/salto/ataque, pausa/hitstop e outros heróis sem erros JS; posições/estado preparados. Falha de rede manteve fallback e reload recuperou pintura. Build PWA recarregou/decodificou o WebP offline após limpar cache HTTP; arquivo localizado no precache. Autoria verificou 285 recortes. Nenhuma Action/APK ou migração de save.

Ren ocupa 21,875 MiB RGBA; teto gráfico aritmético com demais catálogos cerca de 36,97 MiB, além de decode/cópias/GPU. Pendentes profiling Android, escala/legibilidade física, consistência de poses e intermediários. Próximo foco: refinar a animação do Ren neste acabamento, depois os outros heróis; não saltar para produção em massa antes dessa revisão.

## Incremento 25 — Orientação do Ren corrigida e Maya pintada

O usuário identificou Ren aparentemente de costas fora do ataque. A fonte idle olha à esquerda e a recuperação a reutiliza; corrida e cortes já olham à direita. Bake agora normaliza somente a fonte idle em torno do pivot, com `sourceFacing=-1`; runtime continua usando `player.facing` uma vez. Regressão e quadro visual dos dois sentidos adicionados, sem inverter ataques corretos.

Produzidas quatro folhas da Maya com referência à prancha, 24 pinturas para 18 clipes/55 slots, seis chaves de corrida, duas de voo e stun próprio. Correção por geração de imagem isolou o sprite de morte da célula de voo. Atlas integrado 2560 × 2240/quadros 320 × 320, mesma referência física 32 × 56; poderes/tempos/energia preservados. Loader comum com estados/cache independentes e fallback. Montador comum, manifests com orientação/hashes e ferramenta de revisão por renderer real. Contrato/prévias em [MAYA_PINTADA_E_ORIENTACAO.md](MAYA_PINTADA_E_ORIENTACAO.md).

**412 testes**, TypeScript, builds web/assets Android e sync aprovados. Chromium horizontal com touch confirmou movimentos/repouso/ataque/recuperação para ambos os lados, dano à frente sem atingir alvo de trás, voo real da Maya com subida/consumo de energia e clipe correto. Estados/alvos preparados, sem campanha manual completa. Autoria validou 285 recortes e 16 casos de orientação, sem erros JS. Falha da imagem da Maya preservou Ren; reload recuperou Maya. Ambos WebP foram decodificados offline no PWA após limpar cache HTTP, e hashes nos assets Android conferem.

Ren corrigido 1.168.748 bytes, Maya 1.183.792 bytes; fontes/PNG de documentação fora do pacote. Soma máxima aritmética dos caches gráficos ~56,22 MiB RGBA mais overhead; profiling Android pendente. Nenhuma Action/APK, migração de save ou mudança de física/combate/música/exploração/recompensas. Próximo: revisão de animação dos dois e produção individual do Leon, preservando ensaios físicos e demais fases do plano.

## Incremento 26 — Redes amplas de exploração por fase e rotas de habilidade

O usuário definiu o alvo a partir do mapa de Metal Warriors: inspiração Metroidvania confinada à fase principal, sem retorno de fase 6 para 2; fábrica exploratória, trem linear de ação, vai e vem, recursos e atalhos de habilidade. Reescrito [PADRAO_DE_FASES.md](PADRAO_DE_FASES.md) e atualizado o catálogo/retomada do plano.

23 setores recebem rede modular de três níveis, alas oeste/central/leste, quatro poços, ramificações altas e ligações às alas originais, preservando arenas/encontros/ascensões anteriores. Larguras 7.500–10.200; fábrica 9.700/9.840/10.200. São seis comandos obrigatórios e três mecanismos opcionais por setor, com portões independentes e progresso persistente. Trem 2A–2C sem mudança de geometria. Composição compartilhada e variantes não equivalem a 23 labirintos totalmente feitos do zero; diferenciação editorial/puzzles mais específicos segue prevista.

Ren: trava cinética, parede e duto de precisão; Maya: poço de voo, ilha e atalho; Leon: parede física rompida por golpe e compartimento fechado. Todos concluem sem essas habilidades. `routeState.ts` separa conclusão obrigatória e sinais de portões; save valida cada abertura. `travel()` e validador recusam cruzamento de capítulo. Troca de teste/continue, recompensas/respawn e música preservados. Sem migração de save.

Catálogo: 316 inimigos ativos + duas origens dormentes, 123 checkpoints, 170 objetos, 1.452 peças de terreno e 138 barreiras. Exportados 26 SVG, catálogo JSON e atlas HTML com seleção/zoom. A documentação não entra no pacote.

**424 testes aprovados**: 69 idas pelos seis comandos, 69 retornos, 18 depósitos universais, três percursos físicos de habilidade na fábrica, regressões de trem/combate/sons/saves/torretas e bloqueio entre capítulos. Navegação usa física real e replay de comandos com guias regionais; sem edição de posição no percurso aceito, voo/itens/resgate na rota comum ou contato com perigos. Combate isolado; não campanha vencida manualmente.

Chromium horizontal com touch confirmou comandos por CIMA, guarda, aberturas intermediárias, habilidade, brecha por golpe, ida/volta e restauração dos nove comandos/seis portões, além do atlas 26/26; posições preparadas nesse ensaio de interface. Sem erros JS. TypeScript, builds web/assets Android e sync aprovados. JS 482,33 kB / 149,64 kB gzip. Nenhuma Action/APK. Próximos: combate/ritmo/orientação/recursos em playtest, variedade de mecanismos/salas e ensaio físico Android/DualShock 4.

## Incremento 27 — Ren e Maya com vistas próprias para cada direção

Por pedido do usuário, substituída a reflexão de runtime das pinturas por pares de atlas. Quatro folhas novas por geração de imagem com referência nas fontes anteriores, revisadas para representar o flanco oposto: mangas simples no lado próximo, diferenças de ombreira/painel e sobreposição de tiras/equipamentos. Ren recebe 21 fontes à esquerda, Maya 24; ambos têm seis chaves novas de corrida e cobertura dos 18 clipes/55 posições lógicas. Inclui salto/queda, parede/escalada, dash/slide, ataques/recuperação e voo da Maya, evitando voltar ao espelhamento ao mudar de ação. Fontes existentes à direita preservadas.

`heroDirections.ts` define mapeamento e atlas compactado de 2560 × 960; holds compartilham células. Loader publica os dois lados atomicamente e mantém promessas em cache. Corrigido erro tardio ao limpar `Image.src`: remover handlers antes de liberar a imagem. Renderer seleciona pixels/metadados por direção, sem escala negativa nas pinturas. Pivot, referência física, timings, alcance, dano e física conservados. Fallback procedural mantém compatibilidade operacional em falha de recurso, sem migração de save.

Estúdio com seletor de direção e exportação identificada; bake manual reproduzível, manifestos com SHA-256 e pranchas comparativas atualizadas. Contrato e política de continuidade em [VISTAS_DIRECIONAIS.md](VISTAS_DIRECIONAIS.md): Leon, inimigos e chefes ainda usam o desenho anterior, mas deverão migrar para pares autorais nos seus lotes visuais. Atlas adicional ocupa 9,375 MiB RGBA por herói, fora overhead/GPU, e os dois pares de Ren/Maya carregados somam 62,5 MiB. Profiling físico e refinamento fino entre pinturas continuam pendentes.

**22 testes direcionados aprovados**, com cinco novos casos de cobertura física/timing/fontes, compactação, proveniência e loader atômico/falha/limpeza. Chromium horizontal com suporte a touch verificou 220 combinações de quadro/direção e as duas direções por entradas de toque no motor real; atlas distintos, transformações positivas, imagens presentes e novos recortes sem cortar bordas. Comparação de pixels rejeita simples reflexo; pranchas inspecionadas. Evidência em `docs/arte/validacao-direcional.json`. Estado preparado para isolar o renderer; não campanha manual nem aparelho físico.

TypeScript, builds web/assets Android e Capacitor sync aprovados; nenhuma Action executada ou APK gerado. Não alterados mapas/exploração do incremento 26, música, recompensas ou regras de troca de personagem. Próximos aceites: leitura e memória no celular, refinamento das animações e extensão da política direcional à revisão visual dos demais personagens.
