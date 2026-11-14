# Concepção de fases — exploração confinada por capítulo (revisão 26)

## 1. Referência e identidade

A referência apresentada pelo usuário, um mapa de **Metal Warriors**, descreve o conceito desejado: caminhos por cima, pelo meio e por baixo, conexões verticais, barreiras condicionais, desvios, mecanismos, retornos e atalhos. A referência é de **design espacial**, sem pedido para copiar sua aparência.

O nome de trabalho é **fases exploratórias interconectadas com gating, loops e backtracking significativo**, ou “exploração de inspiração Metroidvania dentro de cada fase”. Não é um mundo global em que estar na fase 6 permite voltar à fase 2.

- Oito fases principais, **26 subfases/setores** mantidos.
- Cada fase principal contém sua própria rede de exploração. Os seus setores permitem ida/volta e conservam os avanços locais.
- Depois de avançar a outro capítulo, não existe porta de exploração para capítulos anteriores. Validador e `travel()` rejeitam essa ligação. O seletor externo de teste continua uma ferramenta separada.
- **Trem 2A–2C:** exceção linear de ação, obstáculos, saltos, rasteiras e combate. Seus mapas não foram alterados nesta revisão.
- Fábrica, laboratório, museu, base e outras instalações devem oferecer circulação ampla, camadas de percurso úteis no plano 2D e motivos concretos para voltar.

## 2. O que torna uma fase exploratória

A unidade de autoria é uma **rede de regiões**, em vez de um corredor contendo plataformas altas opcionais. Cada região tem entradas, saídas, altura, referências visuais e relação com as demais. Os objetivos podem seguir uma ordem, enquanto os caminhos para alcançá-los oferecem bifurcações e conexões.

### 2.1 Regras de concepção

1. **Apresentar bloqueios e destinos antes da solução.** O jogador deve lembrar onde havia uma passagem inacessível e reconhecer o que mudou.
2. **Criar largura e profundidade vertical úteis.** A área adicional precisa conter circulação, encontros, recursos e conexões, não ser só um piso vazio mais longo.
3. **Distribuir os acessos.** Subir por um poço e descer por outro permite conhecer novas relações entre lugares. Tetos/pisos sólidos delimitam os níveis, evitando que qualquer salto atravesse toda a estrutura.
4. **Usar vai e vem com consequência.** Um comando na ala alta habilita algo na ala baixa; a ação posterior abre outra passagem. A volta não precisa repetir exatamente o caminho de ida.
5. **Abrir atalhos persistentes.** O esforço para acessar uma passagem difícil recompensa as revisitas, sem exigir repetir o mesmo desafio toda vez.
6. **Separar exploração obrigatória e descoberta opcional.** Há regiões para concluir a fase e outras para recursos, segredos ou atalhos. Não exigir limpar todos os inimigos do mundo.
7. **Considerar os três personagens desde o mapa.** Todos concluem a rota principal; habilidades especiais dão acessos e vantagens opcionais. A campanha não pode exigir troca livre, pois a regra final é trocar no continue.
8. **Preservar o que o jogador conquistou.** Painéis, brechas e atalhos abertos não fecham por morte, ida/volta ou carregamento. Guardas de mecanismos não reaparecem para desfazer progresso.
9. **Manter orientação compreensível.** Nomear alas, sinalizar poços e bloqueios e indicar o objetivo; evitar tanto um labirinto sem referências quanto um roteiro que revele todos os segredos.
10. **Validar a geografia jogando.** Um grafo abstrato conectado não garante que um corpo com 32 × 56 consiga fazer um salto, sair de uma sala ou voltar de um depósito.

### 2.2 Estrutura implantada nesta revisão

Os 23 setores exploratórios ganharam uma rede modular nova antes das alas/encontros já existentes. Assim se preservam as arenas, os chefes, as torretas/instalações e as ascensões originais, enquanto a circulação principal deixa de ser só o corredor anterior.

| Região/camada | Função |
|---|---|
| Ala oeste, galeria central e ala leste | Três regiões largas, cada uma com nível inferior, intermediário e superior |
| Quatro poços e patamares | Conectar os níveis por entradas diferentes, com saltos e retornos |
| Galeria cinética acima dos caminhos usuais | Percurso de parede/precisão e atalho do Ren |
| Ilha suspensa acima do poço | Região de voo, recursos e comando de atalho da Maya |
| Compartimento inferior selado | Parede que Leon rompe com golpe para alcançar um depósito |
| Depósito lateral universal | Desvio elevado que os três alcançam por saltos, sem resolver o circuito principal |
| Alas internas e trecho de encontro preservado | Continuação com identidade do setor, controles locais e acesso ao setor seguinte/chefe |

A rede usa um kit comum, com larguras diferentes por capítulo/tipo, nomes e sinais temáticos, perigos localizados e as geometrias originais distintas. **Não são 23 labirintos inteiramente desenhados do zero.** Individualizar mais mecanismos e formatos de sala é um próximo refinamento, sobre uma base já jogável e verificada.

A fábrica recebe a maior expansão horizontal: setores de **9.700, 9.840 e 10.200 unidades**, antes 2.500, 2.640 e 3.000. Os demais setores exploratórios ficam entre **7.500 e 9.640**, com três níveis na rede nova e as alturas originais preservadas. O trem mantém suas larguras anteriores.

## 3. Progressão, mecanismos e retornos

Cada setor exploratório tem seis comandos obrigatórios: quatro distribuídos pela rede nova e dois nas alas internas anteriores. O primeiro novo e o primeiro interno possuem guardas próprios não repetíveis.

1. Alcançar a ala superior central e resolver o posto protegido.
2. Retornar à ala inferior oeste e enviar o sinal de distribuição.
3. Explorar a ala leste pelo nível intermediário.
4. Voltar à galeria central e habilitar a ligação às alas internas.
5. Inspecionar o controle elevado do trecho interno.
6. Retornar ao comando local e liberar a passagem final/confronto.

Há **portões independentes**: o segundo comando abre a ligação intermediária; o quarto abre a ligação ao trecho interno; a dupla interna libera a saída/confronto. Os três mecanismos opcionais abrem suas próprias passagens. Examinar um painel não abre todos os portões de uma vez.

As linhas ciano dos mapas documentais representam sinais/dependências, **não uma linha física que o jogador deve seguir**. A navegação ocorre pelas passagens do terreno. Voar por cima de uma barreira não substitui os comandos exigidos para sair ou iniciar o chefe.

Os comandos ainda usam interação local por CIMA. Seus nomes variam por tema — refrigeração, contenção, distribuição, arquivos, projeção, autorização — e já abrem barreiras diferentes. Interações mais específicas, como mudar o estado de uma máquina ou drenar um tanque, continuam uma oportunidade de autoria; não são anunciadas como implementadas apenas porque um painel recebeu esse nome.

## 4. Personagens e caminhos opcionais

| Personagem | Acesso aplicado | Recompensa espacial |
|---|---|---|
| Ren | Subida por parede até a trava cinética e travessia de um duto com salto/dash | Atalho alto e recurso ao final de um percurso de precisão |
| Maya | Subida por poço aberto até a ilha suspensa, considerando teto e energia | Recurso e liberação de uma ligação superior mais direta |
| Leon | Golpe próximo rompe uma parede física que bloqueia corpos/tiros | Entrada no compartimento de recursos e retorno pela brecha |
| Todos | Patamares, salto duplo e corredores comuns | Campanha inteira e depósito lateral universal |

A habilidade básica de parede dos outros personagens não foi retirada. A trava cinética é uma interação própria do Ren; voo e brecha são considerados pelo percurso e pelo mecanismo correspondente. Alguns lugares podem oferecer soluções alternativas de habilidade. A intenção não é transformar cada item em uma exclusividade arbitrária.

CIMA não rompe a parede do Leon; ataques de outros heróis também não a rompem. O golpe precisa alcançar a parede e ter linha livre. O bloqueio sai da colisão somente depois da abertura. Os comandos de habilidade são opcionais e não participam da condição de saída.

## 5. Atlas e números atuais

- [Atlas interativo dos 26 setores](ATLAS_DAS_FASES.html), com seleção e zoom.
- [4A — visão estrutural da fábrica](mapas/4A.svg), [prévia PNG](mapas/4A-visao.png) e [ensaio no jogo](mapas/fabrica-jogo.png).
- [4B — linhas de transporte](mapas/4B.svg).
- [3B — complexo e ascensão dos guindastes](mapas/3B.svg).
- [8C — complexo e elevador orbital](mapas/8C.svg).
- [2A — comparação com a exceção linear do trem](mapas/2A.svg).
- [Catálogo de dimensões/contagens](mapas/catalogo.json).

A campanha contém **316 inimigos iniciais ativos**, duas origens dormentes de torretas, **123 checkpoints, 170 objetos, 1.452 peças de terreno e 138 barreiras de mecanismo**. São quantidades de autoria, não limites de respawn ou vidas. Inimigos comuns conservam repopulação e recompensas; ampliar o vai e vem torna esses sistemas mais relevantes, sem alterar suas regras.

Atualização documental: `./node_modules/.bin/tsx scripts/export-route-maps.ts`. O atlas HTML/SVG e as imagens de documentação não são componentes do jogo nem entram no APK.

## 6. Contrato técnico

- `campaign/exploration.ts`: mantém os apoios, comandos e identidade dos trechos internos anteriores.
- `campaign/complexes.ts`: compõe as redes novas, ajusta dimensões/posições e conserva vínculos de inimigos, torretas, portas e arenas. Sem aleatoriedade na autoria.
- `exploration.nodes`: comandos com dependências, guarda, `optional`, `requiredHero` e ação `smash` quando aplicável.
- `exploration.gates`: lista de sinais exigidos por cada portão. `routeState.ts` centraliza conclusão obrigatória e abertura por mecanismo.
- `Platform.breakNode`: conecta a parede do Leon ao comando de brecha; o ataque verifica alcance e cobertura antes da interação.
- `routeComplete()`: considera só os seis comandos obrigatórios. Atalhos e depósitos não são exigidos para terminar com outro personagem.
- `travel()`: recusa destinos fora da fase principal. Portas de retorno entre setores do mesmo capítulo permanecem disponíveis conforme combate/arena.
- Save: preserva cada comando e a abertura de cada portão independentemente; valida sinais, guardas e coerência das brechas. A geometria corrente mudou sem migração/preservação de saves antigos, conforme orientação do usuário.
- Validação de autoria: rejeita objetivos sem apoio, dependências inválidas/cíclicas, comandos de habilidade obrigatórios, portões sem sinais e brechas sem vínculo válido.

A troca livre continua ferramenta de teste. Nenhum segredo novo depende dessa troca para concluir a campanha, nem altera a regra final de escolha no continue.

## 7. Evidências e próximos aceites

**424 testes aprovados**, TypeScript, build web, build de assets Android e Capacitor sync aprovados. Os ensaios de navegação foram distribuídos por arquivo/herói para executar a procura física sem concentrar todo o custo num único processo.

- 69 percursos obrigatórios: 23 setores × três heróis, seis comandos e saída/confronto, sem voo/dano/teletransporte na solução reproduzida.
- 69 retornos desde o último checkpoint, nos três heróis.
- 18 acessos ao depósito universal, sem liberar a rota principal.
- Ensaios físicos adicionais na fábrica: Ren sobe por parede e usa air dash no duto, Maya alcança a ilha pelo poço com energia finita, Leon entra/retorna pelo muro rompido.
- Os três setores do trem mantêm seus ensaios de ida/volta nos três personagens e a mesma geometria.
- Regressões de mecanismos intermediários, habilidades opcionais, brecha por golpe, portas entre capítulos, morte/revisita/save, guardas, combate, som e instalação de torretas.

O planejador usa a física real para procurar comandos e reproduzir a solução. Guias regionais reduzem a procura em mapas maiores; o percurso aceito não edita coordenadas nem abre portões artificialmente. Combate é isolado, plataformas móveis auxiliares são removidas e contatos com ácido/laser são rejeitados mesmo no instante apagado. O voo de teste parte com energia cheia, sem recarga por tick ou teletransporte durante o acesso.

Chromium horizontal com touch confirmou CIMA, guardas, seis comandos e aberturas distintas, habilidades opcionais, golpe do Leon, ida/volta de setor e restauração dos nove comandos/seis barreiras. Posições foram preparadas nesse ensaio de interface/comportamento; ele não substitui os trajetos físicos acima nem uma campanha manual completa. Sem erros JavaScript. Os 26 mapas e a ferramenta de zoom também foram conferidos.

**Pendentes:** jogar com todos os inimigos ativos, medir duração/orientação, densidade e reposição de recursos, ajustar diferenças editoriais entre salas, substituir parte dos painéis por mecanismos específicos, revisar arte/landmarks e testar Android/DualShock 4. Não se promete equilíbrio final só por haver caminhos válidos. Nenhuma Action foi executada ou APK gerado.
