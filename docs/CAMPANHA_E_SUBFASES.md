# Campanha, subfases e exploração — contrato atual

Implementação inicial: incremento 4, 13/11/2026. Este documento descreve código executável, não apenas o roteiro editorial.

## Conteúdo disponível

A campanha mantém oito fases principais. Distrito: quatro mapas próprios; monotrilho, canteiro, fábrica e financeiro: três mapas próprios cada. As fases 6–8 usam seus três mapas originais por adaptadores. Existem **19 mapas na campanha atual**, rumo a 26. Os originais das fases 1–5 permanecem acessíveis pelos botões de teste e pela API `loadStage()`, fora dessa contagem.

| Setor | Identidade | Inimigos iniciais | Pontos de apoio | Papel |
| --- | --- | ---: | ---: | --- |
| 1A | Fuga do Laboratório | 4 | 3 | Aprender portas, exploração superior e primeiros combates |
| 1B | Telhados de Neon | 5 | 3 | Vãos, coberturas, plataformas móveis, sniper e jetpack |
| 1C | Esgotos de Manutenção | 4 | 3 | Ácido, esteira, reservatório e caminhos por canos |
| 1D | Avenida Bloqueada | 5 | 2 | Bloqueio tático e encontro final com Cipher-01 |
| 2A | Vagões e Embarque | 5 | 3 | Acoplamentos entre vagões, vento e compartimentos superiores |
| 2B | Cabos e Manutenção | 5 | 3 | Conduítes, refrigeração, esteira e exploração por cabos |
| 2C | Teto e Pórticos | 5 | 3 | Rasteira contra pórticos, escolta obrigatória e Valkyrie-7 |
| 3A | Fundação da Torre | 5 | 3 | Bases de concreto, vãos e exploração nas vigas |
| 3B | Guindastes e Vigas | 6 | 3 | Subida de mil unidades, patamar intermediário e andaimes opcionais |
| 3C | Heliponto na Tormenta | 5 | 3 | Escolta de demolição e encontro final com Goliath-IV |
| 4A | Tanques de Refrigeração | 5 | 3 | Canais de resíduo, comandos superiores e suprimentos |
| 4B | Linhas de Esteiras | 5 | 3 | Transporte em sentidos opostos e terminais elevados |
| 4C | Núcleo de Descarte | 5 | 3 | Guarda do reator e Arisawa/Cyber-T-Rex |
| 5A | Boulevard de Mármore | 5 | 3 | Barricadas, terraços, carros e agentes executivos |
| 5B | Garagens e Serviços | 5 | 3 | Barreiras laser, elevadores e acesso restrito |
| 5C | Suíte Executiva | 5 | 3 | Escolta do cofre e Castor/Pólux |

```mermaid
flowchart LR
  A[1A · Laboratório] <--> B[1B · Telhados]
  B <--> C[1C · Esgotos]
  C <--> D[1D · Avenida / Cipher-01]
  D -. "vencer chefe e avançar" .-> E[2A · Vagões]
  E <--> F[2B · Manutenção]
  F <--> G[2C · Teto / Valkyrie-7]
  G -. "vencer chefe e avançar" .-> H[3A · Fundação]
  H <--> I[3B · Guindastes e vigas]
  I <--> J[3C · Heliponto / Goliath-IV]
  J -. "vencer chefe e avançar" .-> K[4A · Tanques]
  K <--> L[4B · Esteiras]
  L <--> M[4C · Núcleo / Arisawa]
  M -. "vencer chefe e avançar" .-> N[5A · Boulevard]
  N <--> O[5B · Garagens]
  O <--> P[5C · Suíte / Gêmeos]
  P -. "vencer chefe e avançar" .-> Q[6A · Museu original]
```

O grafo de portas só liga áreas da mesma fase principal. Avançar para a fase principal seguinte é uma transição de campanha após conclusão, não uma porta livre.

## Arquivos e contratos

- `src/game/campaign/types.ts`: `CampaignStage`, `SubstageDefinition`, `CheckpointDefinition`, `ExitDefinition`, `PlayerCarry` e `CampaignProgress`.
- `src/game/campaign/factory.ts` e `financial.ts`: seis mapas das fases 4/5, com portas de retorno e arenas/chefes somente no último setor. `authoring.ts` compartilha valores de autoria dos novos mapas, sem alterar os capítulos já existentes.
- `src/game/campaign/construction.ts`: três mapas do canteiro; o núcleo em degraus sobe de Y=1040 para Y=40, com câmera limitada ao setor e checkpoints no meio/topo.
- `src/game/campaign/monorail.ts`: três mapas do monotrilho, com arena e chefe apenas no setor final.
- `src/game/campaign/district.ts`: os quatro mapas do distrito. Paleta/música temática são reaproveitadas; geometria e arrays de encontros são novos.
- `src/game/campaign/index.ts`: catálogo executável, adaptador dos mapas antigos, resolução de IDs e validação.
- `GameEngine.startCampaign()`: começa uma tentativa na entrada da fase principal.
- `GameEngine.loadStage()`: API de compatibilidade para os mapas originais, sem navegação entre áreas.
- `GameEngine.travel()`: aplica uma porta válida próxima ao personagem e preserva recursos/estado da sessão.
- `GameEngine.getCampaignProgress()`: retorna uma cópia da identificação de fase, setor, checkpoint, áreas visitadas e recursos do jogador. É contrato resumido de sessão. O save completo é produzido por `captureCampaignSave()` e validado/restaurado por `restoreCampaignSave()`; ver `SALVAMENTO.md`.

IDs de subfase são estáveis, como `1A`. Um spawn usa namespace da subfase, por exemplo `1B:3`; seu identificador de entidade muda a cada aparição. Objetos podem reutilizar números em subfases diferentes porque o estado é separado por área.

## Portas e entrada

A interação é **CIMA**: seta/W no teclado, botão superior do direcional de toque ou analógico/D-pad para cima. O evento de interação entra na fila do tick; um toque curto não se perde quando o jogador solta o botão antes da próxima atualização.

É necessário estar dentro da região da porta. Segurar cima sem uma nova interação não atravessa automaticamente. As posições de chegada ficam afastadas da porta de retorno, evitando ida e volta involuntária. Estado de entrada é limpo na transição.

Uma arena obrigatória ativa ou um chefe em combate bloqueia a saída. O chefe da avenida espera a arena obrigatória ser concluída antes de ativar seu encontro. Cipher-01 em 1D conclui a fase 1; Valkyrie-7 em 2C conclui a fase 2. Goliath-IV em 3C conclui a fase 3. Arisawa em 4C conclui a fase 4; os Gêmeos em 5C concluem a fase 5. Os cinco encontros finais aguardam suas escoltas obrigatórias. As configurações/padrões existentes dos chefes foram reaproveitados; isso não conclui o item de individualização dos oito chefes. Pórticos móveis estão habilitados em 2C, com aviso e desvio por rasteira; 2A/2B não usam esse perigo. Sair de um setor intermediário não concede bônus de conclusão nem dispara vitória.

## Estado preservado nas transições

| Estado | Regra |
| --- | --- |
| Herói | Mantém o mesmo; porta nunca troca personagem |
| HP, foco e vidas | Mantém os valores correntes; atravessar porta não cura |
| Pontos e próximo limiar de vida | Preserva internamente, sem números na interface |
| WAV e buffs ATK/JMP/GST | Preserva munição e tempo restante |
| Objetos destruídos e baús abertos | Permanecem abertos no retorno |
| Pickups no chão | Permanecem no estado em que a área foi deixada |
| Inimigos vivos e seu HP | Permanecem na área; não são duplicados nem reiniciados |
| Histórico de derrotas/recompensas | Mantém a curva 1.000 → 500 → 50 → 0 por origem |
| Arenas concluídas | Permanecem concluídas, sem novo bloqueio obrigatório |
| Projéteis, cut-ins e efeitos de assistência | Transientes são descartados ao mudar de área |
| Posição de chegada | Usa checkpoint especificado pela porta; recebe proteção breve |

A área fora de atividade conserva seu estado de simulação. O tempo **simulado em outra área** conta para afastamento/cooldown de inimigos mortos. Tempo no menu/pausa não conta. Ao retornar, a área é repovoada antes do primeiro desenho, somente para inimigos já elegíveis, respeitando cooldown, distância de segurança, ocupação e limite de população. Isso não é aparição dentro de uma câmera já exibida: os inimigos estão presentes quando o setor é revelado. Durante a exploração normal, o raio de preparação se adapta à viewport e a regra de não surgir visivelmente permanece ativa. Inimigos vivos não são substituídos por um spawn novo.

O cache é reiniciado ao começar outra tentativa/fase principal. Não existe farm de baú por atravessar uma porta repetidamente. A troca livre segue disponível somente como ferramenta de teste; no perfil final ela está bloqueada, enquanto o continue permite escolher outro herói sem apagar a exploração corrente.

## Checkpoints, recuperação e retomada

Bandeiras marcam pontos de apoio. Aproximar-se andando ativa o ponto e mostra uma confirmação. Ao perder uma vida ou usar continue, a campanha retorna ao ponto de apoio ativado na subfase corrente, com a posição de piso revalidada. Uma queda não fatal continua usando o resgate para o piso seguro, sem apagar a área.

**Reiniciar Fase** começa novamente a fase principal, voltando ao seu primeiro setor e reinicializando a tentativa. **Retomar exploração** no menu mantém a sessão atual: não é reinício e não recria objetos/inimigos.

A retomada exata funciona enquanto a sessão está aberta. O incremento 7 acrescenta **Carregar campanha salva** depois de recarregar/fechar: restaura no ponto de apoio com recursos, objetos, inimigos e histórico de recompensas, validando todo o arquivo antes de alterar o motor. Emboscadas em andamento rearmam ao chegar ao gatilho e chefes não concluídos reiniciam o confronto; conclusão e game over permanecem como tais. Ver [SALVAMENTO.md](SALVAMENTO.md) para política, formato, recuperação e limites.

## Validação e limites

`validateCampaign()` roda na carga dos dados e nos testes. Rejeita IDs duplicados, filiação incorreta, geometrias inválidas, checkpoints obstruídos/fora do mapa, portas sem destino/checkpoint, setores inalcançáveis e fases sem exatamente um encontro final. A soma editorial de 26 setores é verificada separadamente da quantidade já construída.

A geometria principal de 1A–1D e 2A–2C/3A–3C/4A–4C/5A–5C foi atravessada por simulação para os três heróis, sem voo/teletransporte, sem resgate de abismo e sem contato com ácido ou dependência de imunidade. Nos capítulos 2–5, a volta também foi verificada em cada setor com os três heróis. Os lasers de 5B fazem parte das rotas testadas, sem depender de invulnerabilidade. Os testes de rota isolam combate/arena/pórticos (esses possuem teste próprio) para avaliar deslocamento; não representam uma certificação de dificuldade de todos os confrontos ou segredos. Há testes separados para bloqueios, derrota final, morte/continue e preservação de estado.

Os cenários continuam usando a arte provisória e o sistema sonoro existente. Produção das demais subfases, polimento de encontros e validação Android/DualShock 4 físico continuam pendentes. Nenhuma Action automática ou geração de APK faz parte desta etapa.

## Compatibilidade do incremento 10

A expansão substitui o antigo adaptador de 3A pelos novos mapas 3A/3B/3C. Saves de fases 1/2 preservam a identificação de conteúdo; saves da fase 3 original são apresentados como incompatíveis e ficam retidos para descarte/substituição explícita. Não existe migração automática entre geometrias diferentes. O mapa original continua acessível para testes, sem substituir o save de campanha. A máquina de estados completa da IA, aprimoramento dos chefes, arte e trilha novas continuam nas respectivas etapas do plano.

## Compatibilidade do incremento 12

A expansão das fases 4/5 mantém a identificação de conteúdo dos capítulos 1–3. Saves das versões originais de 4A/5A ficam incompatíveis com as novas geometrias e são retidos para descarte/substituição explícita, sem migração silenciosa. A IA tem leitura compatível do campo opcional `Enemy.ai`, conforme [IA_E_COMBATE.md](IA_E_COMBATE.md). Os perfis de chefes ainda são os existentes; o trabalho nos mapas não equivale a concluir suas mecânicas futuras.
