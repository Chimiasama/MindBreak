# Torretas, instaladores e projéteis — incremento 15

## Comportamento

| Inimigo | Vida inicial | Regra |
| --- | ---: | --- |
| Torreta fixa industrial | 90 | Suporte na parede ou no teto, abertura ao detectar o jogador, mira travada e rajada de três tiros. |
| Instalador (`turret_engineer`) | 55 | Aproxima-se do ponto de instalação; prepara por 90 ticks (1,5 s), instala e foge em direção oposta ao jogador. |
| Torreta instalada | 180 | Permanece após a morte/fuga do instalador; usa a mesma rajada e pode ser destruída normalmente. |

Primeiras colocações: parede e teto em **4A**, instalador em **4B**, parede em **7A**, instalador e teto em **7B**. São 132 inimigos inicialmente ativos na campanha e duas origens adicionais dormentes para as instalações. Continuam 26 setores, 77 checkpoints e 78 objetos.

Matar o instalador antes do término impede a instalação. Um golpe, lançamento ou stun interrompe sua preparação; sobreviver permite tentar novamente. Perder visão também cancela a preparação. O ponto precisa estar desocupado pelo jogador/outros inimigos, fora dos sólidos e perto do instalador; uma tentativa bloqueada entra em recuperação e pode ser repetida. O limite de 24 inimigos ativos também se aplica. Após instalar, ele não instala outra torreta na mesma aparição. A fuga usa chão seguro, respeita paredes/perigos e termina no obstáculo ou no limite de afastamento de 700 unidades; não há teleporte/desaparecimento gratuito.

As fixas abrem em 12 ticks de alerta; preparam a mira por 20 ticks e atiram no evento inicial, mais duas vezes na recuperação, em intervalos de seis ticks. A recuperação total é de 54 ticks depois do evento inicial, deixando uma janela após a rajada. Cada tiro causa 11 de dano antes das proteções do jogador. Não há disparo se a visão estiver bloqueada ou durante stun. A mira da rajada permanece travada, permitindo esquiva.

## Estrutura e colisão

- `Enemy.mount`: `floor`, `ceiling`, `wall-left` ou `wall-right`. Os lados descrevem a superfície de suporte, não o sentido do tiro. Teto só mira para baixo; paredes só miram para o lado exposto. Corpos ficam fora dos sólidos, tocando o suporte; o tiro nasce dentro da área livre do corpo, sem ignorar o suporte na colisão.
- Torretas montadas não recebem gravidade, recuo, lançamento ou puxão gravitacional; sofrem dano e interrupção. A telecinese de arremesso seleciona apenas atores soltos. Torretas antigas sem suporte explícito mantêm seu corpo de chão.
- `Enemy.deployedBy`: índice **a partir de 1** do instalador na lista autoral. Cada instalador tem exatamente um filho. O validador rejeita vínculo inválido, falta de filho e suporte de parede/teto sem superfície correspondente.
- `SpawnManager.installationX()` fornece o destino de aproximação. `deploy()` ativa a origem dormente com um ID único, sem criar inimigo fora do sistema de origens. A criança compartilha o ponto autoral de instalação e tem no máximo uma instância viva.
- O instalador reaparecido pode substituir uma torreta derrotada; uma ainda viva nunca é duplicada. A torreta não reaparece sozinha. O histórico de derrotas é da origem, preservando **1.000 → 500 → 50 → 0**, independentemente de qual geração a instalou. Pontos continuam ocultos e não há novo teto de vidas.

## Política dos tiros

A colisão contínua com terreno já existia na versão analisada. Foram acrescentadas regras explícitas de exceção e regressões de parede, teto, piso, tiros muito rápidos e ordem dos contatos. Não foi reproduzida passagem de tiros comuns pelos sólidos atuais.

| Campo | Padrão | Efeito |
| --- | --- | --- |
| `piercing` | falso | Atravessa atores; continua bloqueado pelo terreno. É a regra do WAV. |
| `passesThroughWalls` | falso | Somente `true` ignora o terreno. Disponível para futuros ataques excepcionais; **nenhum ataque atual habilita**. |
| `reflectable` | verdadeiro | `false` impede devolver o tiro com o golpe corpo a corpo. |

Todo projétil compara a primeira colisão do trajeto com atores e com sólidos; a parede vence o empate. Isso inclui tiros inimigos, de chefes, do jogador e tiros devolvidos, mesmo em alta velocidade. Sólidos incluem paredes, pisos, plataformas, esteiras e plataformas móveis não quebradas. Ácido e barreira laser continuam perigos transitáveis; canos de escalada e elementos de fundo não são paredes sólidas. Objetos quebráveis não foram transformados em cobertura neste bloco.

O **Olho Cósmico de Oswald** é a exceção inicial de reflexão: ganha contorno branco e não pode ser devolvido por golpe. Continua bloqueado por paredes. Os demais tiros mantêm a reflexão existente. A possibilidade de atravessar parede e a possibilidade de rebater são independentes; novos ataques precisam declarar e testar suas exceções.

## Salvamento e compatibilidade

O formato continua versão 1. Só origens autorais com `deployedBy` podem ter `generation: -1`, sem entidade ativa, morte, recompensa ou temporizadores armados: representam uma torreta ainda não instalada. Campos de suporte/vínculo vêm do mapa, nunca da entidade fornecida pelo save. A flag `deployed` do instalador é validada e preservada. Instalação concluída permanece ao trocar de setor, carregar ou matar o instalador.

Carregar durante preparação cancela o ataque antigo. Uma torreta restaurada termina a recuperação sem disparar restos da rajada anterior. Saves antigos dos capítulos **4 e 7** ficam incompatíveis devido aos novos encontros, mas são retidos para descarte explícito; os outros capítulos conservam suas identificações.

## Evidência e aceite restante

**320 testes passam**, com regressões de morte antes da instalação, fuga, instância única, respawn/recompensa da origem filha, origem dormente inválida, restauração antes/depois da instalação, rajada interrompida, restauração no meio da rajada, mira de teto/duas paredes, colisão em alta velocidade e reflexão independente de penetração. Rotas anteriores dos 26 setores continuam passando para os três heróis com combate isolado.

Chromium em 915×412: renderização das torretas de 4A, aproximação/instalação/fuga em 4B e carregamento do save sem duplicar a torreta, sem erro JavaScript. Os cenários foram preparados por instrumentação somente no ensaio, sem ganchos de teste no produto. Ainda é necessário avaliar a dificuldade no Android físico e com DualShock 4. Nenhuma Action acionada e nenhum APK gerado.
