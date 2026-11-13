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
