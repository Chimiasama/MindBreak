# Salvamento persistente da campanha

Implementado no incremento 7. O save é local ao navegador/WebView: não há conta, servidor ou sincronização entre o navegador e o APK.

## Experiência do jogador

- O jogo salva ao começar uma campanha, atravessar uma porta, ativar um ponto de apoio, perder uma vida, entrar no continue, confirmar continue e concluir uma fase. Também salva a cada cinco segundos durante gameplay, ao pausar, voltar ao menu e receber os eventos de ocultação/saída/falta de foco.
- Na tela inicial, **Carregar campanha salva** restaura a tentativa no ponto de apoio do setor salvo, mantendo o herói, HP, vidas, foco, munição e duração restante dos buffs. Não aparece pontuação na interface.
- **Retomar exploração** continua sendo a retomada exata da sessão em memória. **Carregar campanha salva** é a restauração persistente no ponto de apoio; as duas operações não são equivalentes.
- Começar uma campanha pelo menu pede confirmação antes de substituir um save existente, inclusive quando incompatível. O mapa original de teste não grava nem substitui a campanha.
- **Apagar progresso salvo** pede confirmação e remove save e backup. A sessão em memória não é encerrada, mas não volta a gravar sozinha depois de apagar: é necessário retomar a sessão ou iniciar/carregar uma campanha.
- Um save inválido/incompatível não derruba o app e não é apagado automaticamente. Se houver uma cópia anterior compatível, ela fica disponível com aviso de recuperação. Se o armazenamento estiver bloqueado/cheio, o jogo continua e mostra que a sessão não pôde ser salva.

## Contrato e módulos

| Módulo | Responsabilidade |
| --- | --- |
| `src/game/campaign/save.ts` | Formato versão 1, identificação do conteúdo, limites e decodificação de dados desconhecidos |
| `src/game/campaign/storage.ts` | Leitura, escrita, backup e descarte com tratamento de falhas |
| `src/game/spawns.ts` | Exportação/restauração do estado de cada origem, sem serializar a definição do inimigo |
| `src/game/engine.ts` | Captura de estado estável e reconstrução do mundo a partir das definições atuais |
| `src/App.tsx` | Agendamento, eventos de ciclo de vida, confirmações e interface de carregamento |

Chaves de `localStorage`: `mindbreak.campaign.v1` e `mindbreak.campaign.v1.backup`. Limite de cada save: 512 KiB. Não entram no Git nem no pacote do APK. A assinatura/origem do aplicativo precisa ser preservada para que uma atualização mantenha o armazenamento; desinstalação ou limpeza de dados remove o progresso.

O documento contém:

1. `version`, `content`, `savedAt`: versão de formato, identificação do conteúdo da fase principal e instante informativo.
2. `chapterId`, `current`, `worldTick`, `mode`: capítulo, setor, relógio de simulação e estado de retomada (`playing`, `continue`, `game-over`, `chapter-clear`).
3. `player`: herói, HP, foco, vidas, pontuação/limiar internos, munição e buffs.
4. `preferences.muted`: preferência de som da tentativa. Opções adicionais de áudio/layout ainda pertencem às etapas futuras.
5. `areas`: todos os setores visitados da fase atual, com checkpoint, tick local, instante de saída, plataformas móveis/quebradiças, HP/estado dos objetos, itens no chão, arenas concluídas, inimigos vivos e registros dos spawns.

O identificador de conteúdo é derivado das definições da fase principal. Acrescentar mapas em outra fase não invalida a tentativa corrente. Alterar a geometria/dados da fase salva exige revisão/migração explícita: a implementação atual rejeita o save incompatível, sem tentar adivinhar coordenadas novas. Versões futuras devem acrescentar migrações ao decodificador; não há formato anterior persistente para migrar nesta primeira versão.

## Consistência e restauração

Os pedidos do motor são agrupados por microtask, depois que os ticks do frame terminam. O intervalo e eventos de ciclo de vida também executam entre tarefas JavaScript, sem interromper uma resolução de colisão. Não há escrita em cada frame.

A leitura valida todo o documento antes de modificar o motor. Exige números finitos/faixas válidas, herói existente, checkpoints conhecidos, tamanhos esperados das listas e correspondência entre inimigo vivo e origem/geração/ID ativo. IDs duplicados ou entidades ausentes são rejeitados. O motor reconstrói geometria, dimensões, tipos, HP máximo e demais atributos fixos pelas definições locais; objetos JSON não substituem diretamente entidades. Não é um sistema antitrapaça: os dados locais continuam pertencendo ao jogador.

O retorno usa um piso seguro revalidado a partir do checkpoint. Entradas, velocidade, relógio de catch-up, ataques, projéteis, corpos lançados e efeitos transitórios são limpos; há proteção breve ao reaparecer. Inimigos comuns vivos conservam HP/estado e inimigos derrotados não são recriados imediatamente. Os contadores de derrota preservam a curva **1.000 → 500 → 50 → 0** e a concessão interna de vidas.

Arenas concluídas continuam concluídas. Uma emboscada em andamento é desativada na restauração e pode rearmar ao chegar ao seu gatilho, usando os sobreviventes salvos. Um chefe em andamento reinicia com HP cheio/fase 1, pois a restauração acontece no ponto de apoio e não no meio de um ataque. Uma fase já concluída restaura a tela de conclusão, sem repetir bônus ou chefe. O diálogo final não é repetido nessa restauração.

Continue restaura com zero vidas/HP e nova contagem de nove segundos, permitindo a troca de herói pelas regras existentes. Game over permanece game over. Fechar/reabrir não concede automaticamente uma vida ou escolha livre de personagem.

Os ticks são preservados; o tempo real com o app fechado não conta para respawn, cooldown ou movimento de plataforma. O save anterior íntegro é copiado como backup antes da escrita principal. Escrita principal usa `setItem`, que é atômico no armazenamento web; falha de quota preserva o valor anterior. O backup é uma única geração, sem garantia de recuperação após limpar/desinstalar o app.

## Verificação

- Testes de integração com instâncias novas do motor: recursos/checkpoint, todos os capítulos/heróis, baús/itens, inimigos e recompensas após ida/volta, relógios, plataformas, continue, game over, conclusão e cancelamento de transições antigas.
- Testes de dados: JSON inválido, números inválidos, IDs duplicados/ausentes, versões/conteúdo incompatíveis, proteção da geometria e ausência de mutação parcial.
- Testes de armazenamento: roundtrip JSON, recuperação, retenção de dados inválidos, descarte, quota/permissão negada e preservação do último save válido.
- Chromium horizontal: gravação automática, recarga da página e carregamento de outro setor, cancelamento da substituição, descarte confirmado, backup, incompatibilidade e falha de quota, sem erros JavaScript.

Ainda pendentes: comportamento após encerramento forçado do processo Android, atualização de APK com a mesma assinatura e testes físicos de armazenamento/lifecycle. Um encerramento abrupto antes do próximo evento/intervalo pode perder os últimos segundos. Não foi gerado APK nem acionada Action neste incremento.

No incremento 11, o formato versão 1 passou a aceitar também `Enemy.ai`, mantendo leitura dos saves sem esse campo. Mira e temporizadores são validados; um ataque/preparação salvo retorna em recuperação ao carregar no checkpoint. Ver [IA_E_COMBATE.md](IA_E_COMBATE.md).

No incremento 14, a restauração foi verificada nos 26 setores. A vitória do capítulo 8 restaura diretamente a tela final, sem novo bônus. Os mapas originais das fases 6–8 ficaram incompatíveis com as novas geometrias; dados são retidos, enquanto as fases 1–5 mantêm a identificação anterior.
