# MIND//BREAK: Kinetic Rebels — documento técnico e parecer

Data: 13/11/2026. Base analisada: commit `3e1df606b5a2dae72fea19e66bb54f7b0eed1ae9`.

## 1. Escopo e conclusão

Análise dos arquivos de aplicação, definições das oito fases, motor, interface, arte, áudio, tipografia, configuração e recursos públicos. Inclui execução no Chromium, checagem TypeScript, build e sondagens controladas do motor. Não equivale a terminar a campanha com todos os personagens nem a testar aparelhos físicos.

O projeto é um jogo web de ação e plataforma 2D, para um jogador, com combate psíquico, estética urbana cyberpunk/shounen e mobilidade inspirada em Strider. Tem uma base jogável com campanha definida e mecânicas variadas. A arte e a música ainda têm características de protótipo; consistência de simulação, transições de estado, controles e apresentação merecem prioridade antes de ampliar o conteúdo.

## 2. Produto, narrativa e experiência

Ren, Maya e Leon escapam de um laboratório e enfrentam a corporação Nexus. A campanha atravessa distrito comercial, monotrilho, construção, fábrica, centro financeiro, museu, prisão marítima e torre orbital. Diálogos curtos apresentam objetivos e conectam as fases; a conclusão expõe os experimentos da corporação.

O ciclo é: escolher personagem e fase → ler introdução → explorar, combater e coletar itens → vencer chefe → ler desfecho → avançar. Todas as oito fases estão disponíveis desde o menu. Não há desbloqueio progressivo, conta, inventário persistente, ranking online ou salvamento de campanha.

A interface contém seleção de personagens, cartões de fases, descrição do cenário e chefe, instruções, áudio e instalação. Durante a partida mostra HP, vidas, foco, combo/rank, pontuação, próxima vida extra, inimigos restantes, efeitos temporários e barra do chefe. Há pausa, reinício, continue de nove segundos, game over e vitória da campanha.

## 3. Personagens e balanceamento

| Personagem | Perfil | HP | Velocidade | Impulso de pulo | Ataque | Alcance |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ren, 17 anos | Ninja Cinético | 100 | 5,8 | 12,6 | 26 | 76 |
| Maya, 16 anos | Mestra da Gravidade | 85 | 5,1 | 12,4 | 22 | 90 |
| Leon, 18 anos | Colosso Brawler | 150 | 4,7 | 11,8 | 35 | 68 |

Velocidades e impulsos são parâmetros por atualização; o motor não os expressa em unidades por segundo. Ren é o mais rápido e tem cachecol simulado. Maya voa segurando pulo no ar, com direções e consumo de foco. Leon quebra escudos imediatamente e recebe 70% do dano de tiros fracos sem o recuo comum.

A troca é livre e mantém aproximadamente a proporção de HP, mas impõe um mínimo de 10 HP. Isso cria recuperação artificial quando a vida está baixa. Não são três reservas independentes de vida. As diferenças numéricas são claras; a equivalência de dificuldade entre personagens exige testes de campanha.

## 4. Controles e mobilidade

| Ação | Teclado |
| --- | --- |
| Mover e direcionar | Setas ou WASD |
| Pular, salto duplo, wall-kick, vault; manter voo de Maya | Espaço |
| Golpe e reflexão | J ou Z |
| Dash | K, X ou Shift esquerdo |
| Rasteira | Baixo + dash, no chão |
| Poder psíquico / overdrive | L ou C |
| Assistência | U ou V |
| Trocar personagem | Tab |
| Pausar | Escape; retomar pelo botão |

Há escalada ativa com cima junto à parede, wall-slide, wall-kick com restrição contra repetição na mesma parede, agarrar canos, andar pendurado e saltar por cima deles. O dash dura 12 atualizações, tem cooldown de 26 e protege contra o dano comum. A rasteira dura 22 e pode lançar inimigos.

Controles de toque usam Pointer Events e oferecem direcional, pulo, golpe, dash, PSY e assistência; a troca fica no HUD. Estão visíveis também no desktop. O gamepad usa o primeiro controle detectado, direcional/analógico e botões padrão: 0 pulo, 2 golpe, 1/5 dash, 3 PSY, 4 assistência. Não há remapeamento, troca ou pausa dedicadas no polling do gamepad. Sua presença sobrescreve os estados direcionais compartilhados com teclado e toque.

## 5. Combate, recursos e progressão

Golpes usam hitboxes retangulares, alcance frontal e cooldown de 11 atualizações. O ciclo de ataque tem três estados; o launcher ocorre no estado 2, alcançado no segundo golpe após a inicialização. Não há animação completa de três golpes: o efeito visual principal é um arco.

Ataques pelas costas dobram o dano. Escudos comuns quebram após três bloqueios; Leon e ATK quebram imediatamente. Inimigos sinalizam ataques com exclamações. Guardas têm atraso para virar, cães podem flanquear o jogador engajado com um guarda e atiradores aceleram fogo contra jogador atordoado. São regras locais, sem navegação sofisticada.

O corte pode refletir projéteis, dobrando a velocidade e atribuindo dano base 42. Procura o atirador original ou o chefe; sem esses alvos, inverte a trajetória. Apesar do comentário no código, não há busca geral pelo inimigo comum mais próximo.

Foco começa em 65/100, regenera 0,07 por atualização fora do voo e sobe com acertos. Com pelo menos 95, PSY ativa overdrive, zera foco, atinge inimigos da região visível, causa 100 ao chefe próximo e limpa tiros hostis. Os três nomes são diferentes, mas a resolução principal do overdrive é compartilhada.

Abaixo desse limiar, PSY pode capturar um inimigo num raio de 240, removê-lo da lista e lançá-lo por 28 de foco; o corpo lançado causa 70 de dano. Sem alvo, há burst de custo 25, mas a validação exige pelo menos 28. Assistência custa 32: Ren chama o poço gravitacional de Maya; Maya chama o fogo de Leon; Leon chama o ataque de Ren.

Combos aumentam pontuação e expiram após 130 atualizações sem novo acerto. O rank visual vai de B a SSS. Uma vida extra é concedida a cada 15.000 pontos; vencer um chefe rende 2.500. Começa-se com três vidas. A morte usa o último piso seguro registrado; o continue restaura três vidas e zera pontos, preservando o estado corrente da fase. Avançar mantém pontos, vidas e próximo limiar de 1-UP, mas reinicializa HP, foco e power-ups.

| Item | Efeito implementado |
| --- | --- |
| Cura | Recupera aproximadamente 35% do HP máximo |
| Cura completa | Restaura todo o HP |
| PSY | Recupera 50 pontos de foco |
| WAV | Normalmente seis lâminas perfurantes; baú A fornece 12 |
| ATK | Dano dobrado e quebra de escudo, 720 atualizações |
| JMP | Impulso ×1,4 e repetição de saltos aéreos, 900 atualizações |
| GST | Camuflagem e proteção contra dano comum, 600 atualizações |

Baú A combina WAV e GST; baú B combina ATK e cura completa. Os tempos mostrados como 12/15/10 segundos pressupõem 60 atualizações por segundo.

## 6. Campanha e inimigos

| Fase | Tema e mecânica | Chefe / HP | Música declarada | Inimigos iniciais |
| --- | --- | --- | --- | ---: |
| 1 | Distrito, telhados, esgoto e emboscada | CIPHER-01 / 340 | Electro-Funk | 9 |
| 2 | Monotrilho, vento, pórticos e emboscada | VALKYRIE-7 / 380 | D&B / J-Rock | 7 |
| 3 | Construção vertical, plataformas frágeis e tempestade | GOLIATH-IV / 440 | Metal Industrial | 6 |
| 4 | Fábrica, ácido e esteiras | ARISAWA & CYBER-T-REX / 500 | Acid Techno / EBM | 6 |
| 5 | Centro financeiro e emboscada | CASTOR & PÓLUX / 520 | Electro-Swing | 7 |
| 6 | Museu, cerejeiras e lasers | KUSANAGI / 580 | Trap Japonês / Shamisen | 6 |
| 7 | Prisão marítima, torretas e vãos | COMANDANTE VANE / 640 | Synthwave / Metal | 6 |
| 8 | Torre orbital e gravidade reduzida | DIRETOR OSWALD / 820 | Sinfônica / D&B | 5 |

São 52 inimigos comuns posicionados, 94 plataformas, 27 objetos destrutíveis e três arenas de emboscada, além dos oito chefes. Há onze tipos de inimigo: atirador MIB, escudeiro, cão cibernético, jetpack, drone, mutante, sniper, artista marcial, samurai, torreta e soldado pesado.

Chefes passam à fase 2 abaixo de 50% de HP, aumentando frequência e dispersão dos tiros. Há especializações como investida, teleporte e gêmeo visual. Vários compartilham a mesma base de comportamento; Arisawa e Vane usam o ramo especial genérico. O segundo gêmeo não tem entidade de HP independente. O Oswald ganha representação de olho cósmico na fase 2.

O trem a “300 km/h” é tema narrativo, sem simulação dessa velocidade real. A gravidade da fase 8 é 65% da base, não gravidade lunar fisicamente exata. Vencer o chefe conclui a fase; `goalX` orienta limites do chefe, não exige alcançar uma saída.

## 7. Arquitetura e estrutura interna

| Arquivo | Responsabilidade |
| --- | --- |
| `src/main.tsx` | Montagem React e CSS |
| `src/App.tsx` | Estados de interface, HUD, diálogos, entrada de teclado e campanha |
| `src/game/engine.ts` | Loop, física, combate, IA, câmera, efeitos e renderização |
| `src/game/stages.ts` | Dados dos oito mapas, inimigos, chefes e diálogos |
| `src/game/characters.ts` | Perfis, atributos e cores dos personagens |
| `src/game/types.ts` | Contratos TypeScript das entidades e estados |
| `src/game/pixelSprites.ts` | Matrizes de pixels, paletas e cache dos sprites |
| `src/game/audio.ts` | Música e efeitos por Web Audio |
| `src/components/TouchControls.tsx` | Entrada por toque |
| `src/hooks/usePWAInstall.ts` e botão PWA | Detecção e fluxo de instalação |
| `src/index.css` e `index.html` | Tema, fontes e metadados |
| `vite.config.ts` | React, Tailwind, PWA, servidor e build |

São aproximadamente 5.145 linhas nos módulos principais contados; o motor concentra 2.487 e o App 794. React controla a interface sobre um canvas 2D que mantém a simulação imperativa em uma classe. O HUD recebe snapshots a cada quatro atualizações. Dados das fases são copiados ao carregar, evitando modificar diretamente as definições estáticas.

Fluxo técnico: entrada → métodos do motor → atualização de entidades e colisões → desenho no canvas → callback de HUD/transição → estado React. O estado de tela e o booleano de pausa do motor são separados, o que permite divergências.

Não usa Phaser, Pixi ou motor externo. Não há servidor de jogo, API em uso, banco, autenticação ou multiplayer. Express, dotenv, Motion e SDK Gemini estão declarados, mas sem uso identificado no código de aplicação. A indicação de Gemini em `metadata.json` e os placeholders de `.env.example` não correspondem a uma funcionalidade de IA implementada.

## 8. Física, câmera e desempenho

O loop usa `requestAnimationFrame` sem delta de tempo nem passo fixo. Cada quadro executa uma atualização; gravidade base é 0,65, atrito horizontal sem entrada é multiplicação por 0,72 e queda na parede é limitada a 2,4. A colisão usa AABB, resolvendo X e Y separadamente. Há plataformas móveis, frágeis, esteiras, ácido, paredes e lasers alternados.

A câmera segue com interpolação 0,14 e zoom fixo 0,8; o canvas assume o tamanho da janela. Portanto telas estreitas veem menos mundo, enquanto telas grandes podem enxergar muito mais. Não existe tratamento explícito de `devicePixelRatio` ou resolução lógica uniforme. A dimensão da tela também participa da área atingida pelo overdrive.

Sprites são pré-renderizados em canvases e armazenados em cache, uma boa escolha. O desenho percorre entidades e plataformas sem descarte explícito por visibilidade. Gradientes, textos e partículas são processados no loop; não há medição de FPS, orçamento de partículas ou qualidade adaptativa. O volume de conteúdo atual é pequeno, mas desempenho em celulares modestos ainda precisa de medição.

## 9. Arte, animação e identidade visual

A linguagem visual combina fundos escuros, neon ciano/magenta, amarelo de alerta, contornos geométricos, silhuetas urbanas com parallax, chuva, pétalas, partículas e onomatopeias. Ren tem um cachecol com oito nós; hitstop, screen shake e cut-ins reforçam impacto.

Os heróis e parte dos inimigos são matrizes textuais convertidas em pixels. Não há spritesheets animadas completas: o movimento usa espelhamento, oscilação, rotação e inversão da pose base. Diversos inimigos reutilizam o mesmo desenho com outra paleta. Chefes são principalmente retângulos com detalhes; objetos e cenários também usam primitivas. A expressão “16-bits” descreve a intenção estética, não uma limitação técnica ou fidelidade integral a consoles daquela geração.

A escala fracionária dos sprites e o zoom 0,8 podem produzir pixels irregulares. Os ícones PNG/SVG existentes atendem à instalação; não são uma biblioteca de arte do jogo.

## 10. Fontes e escrita

| Fonte declarada | Papel |
| --- | --- |
| Barlow Condensed | Títulos, botões, identidade arcade e alguns textos do canvas |
| Plus Jakarta Sans | Texto de interface, descrições e diálogos |
| JetBrains Mono | HP, pontos, contadores e informações técnicas |

São carregadas por Google Fonts, com fallback sans-serif/monospace. Há solicitação de Barlow normal 600/700/800 e itálico 800; alguns textos do canvas pedem peso 900 e podem usar síntese/substituição. Parte do canvas usa fontes genéricas diretamente. O pacote não inclui os arquivos das fontes nem uma regra específica para seu cache externo: a tipografia original não está garantida offline.

Os textos são majoritariamente PT-BR, com vocabulário inglês de arcade. A narrativa é direta e funcional, mas poderia mostrar melhor personalidades, motivação e consequências. Os nomes musicais e descrições de chefes prometem uma produção mais elaborada do que a representação atual. A instrução “Assistente / Trocar” mistura ações diferentes; vale separar e padronizar termos. Metadados de busca permanecem em inglês e o manifest não declara `lang` explicitamente.

## 11. Música e efeitos

Não há faixas MP3/OGG/WAV de trilha no código atual. `SoundEngine` sintetiza baixo, lead, bumbo e ruído com osciladores Web Audio. Oito perfis mudam frequências, ondas e intervalo de sequenciamento, de 102 a 135 ms por passo; esses valores não são BPM.

Há efeitos próprios para salto, dash, golpe, bloqueio, reflexão, dano, coleta, poderes e vida extra. “Gritos” dos personagens são sínteses com filtros formantes, não falas gravadas. A música repete padrões curtos; gêneros como metal, shamisen e sinfônico são aproximações por síntese simples, sem esses instrumentos gravados.

Existe mute global, sem volumes separados. A pausa para o sequenciador e o retorno reinicia o padrão. O agendamento por `setInterval` tende a variar com carga/aba em segundo plano; um scheduler baseado no relógio de áudio seria mais estável. A inspeção verificou a implementação; não constitui avaliação auditiva humana de mixagem ou qualidade musical.

## 12. PWA, distribuição e superfície pública

O build gera manifest, service worker Workbox, registro e ícones 192/512/maskable. Usa modo standalone, orientação livre e `autoUpdate`. O hook trata prompt de instalação e oferece guia no iOS. O botão “Instalar no Android” também pode aparecer em navegador desktop compatível, tornando o rótulo impreciso.

O cache gerado cobre os arquivos locais correspondentes às extensões configuradas, mas não garante as fontes remotas. Instalação real, atualização e uso offline completo precisam de testes próprios em HTTPS e aparelhos. Não há Capacitor, pasta Android, Gradle nem fluxo de APK neste checkout: hoje é uma PWA, não um projeto Android nativo.

Há um arquivo de histórico de conversa em `public/assets/aistudio/`, com relatos de terminal e caminhos pessoais de outra configuração. Foi confirmado HTTP 200 no servidor local. Vite copia `public` para o build; esse texto não é recurso necessário ao jogo e deve ser revisado/removido antes de distribuição. Nenhum conteúdo pessoal desse arquivo precisa ser reproduzido na documentação pública.

Não foram identificadas chamadas de gameplay para serviços externos. Ainda assim, Google Fonts implica acesso externo. Pontuação é inteiramente local e pode ser alterada pelo cliente; um ranking competitivo futuro precisará de estratégia própria de validação. Não foi feita auditoria de vulnerabilidades de todas as dependências.

## 13. Validação e achados

Validação desta análise:

- `npm run lint`: passou; executa TypeScript, não ESLint.
- `npm run build`: passou; JavaScript principal 324,33 kB (99,54 kB gzip), CSS 31,76 kB (6,50 kB gzip); precache de 15 entradas, aproximadamente 427,64 KiB. Esses números não medem a instalação total ou todos os arquivos públicos.
- Chromium desktop: menu, início da fase 1, diálogos, envio de comandos de teclado, canvas e pausa passaram, sem exceções JavaScript no smoke test.
- Inspeção visual em 1280×800 e 390×844: sem transbordamento horizontal na medição mobile; isso não comprova ergonomia, multitouch físico ou cobertura de todas as telas.
- Sondagens do motor confirmaram HP artificial na troca, estado de entrada preservado após carregar fase e ausência de pausa automática ao derrotar chefe.
- As oito fases carregaram e executaram 180 atualizações com renderização cada, sem falha ou coordenadas inválidas na sondagem. Isso valida inicialização e execução breve, não conclusão ou acessibilidade de todas as rotas.
- Não há suíte de testes versionada ou CI neste checkout. Os auxiliares usados na análise ficam fora do código do produto.

| Prioridade | Achado e evidência | Consequência / encaminhamento |
| --- | --- | --- |
| Alta | `start()` chama `update()` uma vez por frame, sem delta | Velocidade e durações variam com taxa de atualização; adotar simulação fixa e testar 30/60/120 Hz |
| Alta | `switchCharacter()` aplica mínimo de 10 HP; teste 1 HP Ren → 10 Maya → 18 Leon | Recuperação por troca; definir regra de vida e eliminar ganho involuntário |
| Alta | Derrota do chefe não pausa; callbacks de fim não sincronizam o motor com os overlays | Simulação pode continuar em diálogos finais/tela de conclusão; centralizar transições |
| Alta | `loadStage()` não limpa teclas; teste preservou `right=true`; sem tratamento de blur/visibilidade | Comando preso entre telas ou ao perder foco; limpar entrada e pausar em eventos adequados |
| Alta | Histórico pessoal servido em `public` | Retirar conteúdo alheio ao produto antes de distribuição |
| Média | Dano de rasteira/corpo lançado sem registro de alvo atingido | Sobreposições podem causar múltiplos impactos; decidir regras e testar contabilização |
| Média | Timers de transição usam `setTimeout` sem cancelamento no `stop()` | Callbacks atrasados podem afetar outra partida; vincular ao ciclo de vida da sessão |
| Média | Tamanho da tela altera visão e alcance efetivo do overdrive | Vantagem e experiência diferentes por aparelho; usar câmera e área de efeito consistentes |
| Média | Botão de pulo touch não captura ponteiro; gamepad sobrescreve direções | Risco de entrada persistente/conflitos; testar multitouch e arbitragem entre dispositivos |
| Média | Troca de personagem e algumas ações não validam estado central da partida | Evitar ações indevidas em pausa, stun e transições com regras explícitas |
| Média | UI bloqueia zoom e não oferece redução de efeitos | Melhorar acessibilidade, tamanho de texto, flashes e screen shake |
| Baixa | Build avisa sobre `__dirname` e futuro configLoader nativo | Ajustar configuração ao atualizar Vite; não bloqueia o build atual |

As consequências não reproduzidas ponta a ponta são riscos inferidos dos caminhos de código, não relatos de falha em todos os aparelhos. A lógica de giro do guarda foi sondada e efetivamente mudou sua direção; não foi classificada como defeito.

## 14. O que posso implementar diretamente

| Área | Capacidade e limites práticos |
| --- | --- |
| Sprites e arte | Criar conceitos e imagens com geração de imagem; desenhar pixel art por código, paletas, tiles, ícones, fundos, retratos e efeitos; integrar spritesheets e animações. Coerência entre frames exige revisão, recorte e ajustes; imagem gerada não é automaticamente uma spritesheet pronta |
| Música | Compor melodias, harmonias, ritmos e arranjos originais; programar sintetizadores/sequenciadores e gerar MIDI/WAV com ferramentas adequadas; integrar loops e transições. Não há ferramenta dedicada de geração musical habilitada nesta sessão para prometer produção vocal/orquestral pronta |
| Efeitos sonoros | Criar sons procedurais de armas, poderes, passos, interface e ambiência; melhorar filtros, espacialização e mixagem. Dublagem humana exige gravações ou um serviço de voz apropriado |
| Física | Alterar gravidade, aceleração, atrito, pulo, dash, voo, knockback, colisão, plataformas e câmera; implementar passo fixo, coyote time e buffer de pulo |
| Combate e IA | Criar golpes, hitboxes por frame, combos, janelas de cancelamento, parry, chefes, padrões, dificuldade e testes de regressão |
| Conteúdo | Criar fases, inimigos, desafios, segredos, diálogos, tutorial e ferramentas locais de edição |
| Interface | Refazer HUD e menus, integrar arte, melhorar toque, gamepad, acessibilidade, tipografia e traduções |
| Engenharia | Refatorar motor, implementar saves locais, configurações, testes, profiling, PWA e fluxo de distribuição |
| Android | Preparar integração Capacitor e build Android, conforme SDK/JDK disponíveis; APK de produção requer identificador, assinatura e decisões de publicação |

Posso editar e testar o repositório diretamente quando essas mudanças forem solicitadas. Nesta entrega foi feita documentação; as propostas não foram implementadas, nem houve publicação ou alteração do rascunho do ambiente.

## 15. Parecer e melhorias recomendadas

O diferencial mais promissor é combinar mobilidade vertical, reflexão de tiros e troca tática de personagens. A base de dados das fases e a separação entre interface e canvas permitem evoluir o jogo sem trocar imediatamente de tecnologia.

A prioridade seria estabilizar a experiência: passo fixo, estados sincronizados, limpeza de entrada, regra de HP e controle de callbacks. Depois, criar testes de dano, escudos, respawn, transições e progresso. Isso evita que novo conteúdo amplifique inconsistências existentes.

Em seguida, faria uma fase exemplar: sprites animados para os três heróis, silhuetas distintas dos inimigos, chefe com arte própria, cenário com tiles legíveis, tutorial prático e trilha com introdução, exploração e combate. Essa fase serviria como padrão de qualidade para as outras sete.

No toque, ofereceria layout ajustável, escala/opacidade dos botões, captura consistente de ponteiros e modo paisagem recomendado. No desktop, controles virtuais opcionais; no gamepad, pausa, troca e remapeamento. Ajustaria a câmera e o tamanho lógico para preservar legibilidade e equilíbrio em telas diferentes.

Para dar continuidade ao jogador, adicionaria save local versionado, recordes, preferências, checkpoints explícitos e modos campanha/seleção livre. Para apresentação, hospedaria fontes localmente, revisaria textos e promessas do menu e criaria sliders separados para música e efeitos.

Por fim, modularizaria o motor em entrada, simulação, combate, IA, renderização e áudio; removeria dependências sem uso após validação; documentaria comandos e licenças; adicionaria CI e testes PWA/Android. Não começaria por multiplayer ou migração de engine: o retorno inicial é maior ao consolidar a jogabilidade e o acabamento já previstos.
