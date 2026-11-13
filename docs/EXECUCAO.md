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
