# Chefes — sequências e colisão (incremento 13)

`src/game/bosses.ts` define sequências próprias em duas fases e o ciclo `ready → windup → active → recover`. O alvo e a direção ficam travados ao preparar o golpe. `engine.ts` aplica movimento/projéteis e desenha avisos; o módulo não controla interface, vidas ou conclusão da campanha.

| Chefe | Fase 1 | Fase 2 |
| --- | --- | --- |
| Cipher-01 | Adagas → avanço cinético | Avanço → adagas → adagas |
| Valkyrie-7 | Lâminas de vento → mergulho | Mergulho → lâminas → mergulho |
| Goliath-IV | Investida → onda de choque | Onda → investida → investida |
| Arisawa / Cyber-T-Rex | Leque de neurotoxina → chuva ácida | Chuva → leque → chuva |
| Castor e Pólux | Fogo cruzado → portal | Portal → fogo cruzado → fogo cruzado |
| Kusanagi | Saque da katana → lâminas HF | Saque → saque → lâminas |
| Comandante Vane | Rajada de plasma → bombardeio | Bombardeio → rajada → rajada |
| Oswald / Entidade Zero | Órbitas → olho cósmico | Olho → órbitas → olho |

## Tempo e resposta

- Preparações têm 28–46 ticks no ajuste inicial. Fase 2 usa 85% do tempo, com piso de 18 ticks.
- Recuperações têm 42–60 ticks, reduzidas a 90% na fase 2, com piso de 24. Trocar para fase 2 interrompe o padrão antigo e abre uma pausa de 45 ticks antes da nova sequência.
- Avanços/mergulhos/saques/investidas têm duração finita e colisão varrida contra sólidos; o contato com o jogador também é varrido. Parede/borda pode interromper a investida e abrir recuperação. Os chefes terrestres não correm voluntariamente para fora do piso.
- Marcadores amarelos mostram o alvo comprometido. Chuva/bombardeio marcam três posições. São avisos, não caixas de dano adicionais; os impactos são os corpos/projéteis reais. As trajetórias e cores ainda usarão o acabamento de arte futuro.
- Plasma emite exatamente três pulsos, separados por seis ticks. Neurotoxina/chuva/bombardeio têm gravidade. Órbitas e olho aumentam quantidade/direções na fase 2. Tiros respeitam paredes e são descartados fora dos limites estendidos do mundo.
- Cipher recompõe escudo ao iniciar preparação na fase 1, mas não no meio dela depois de um guard break. Recuperação e fase 2 não têm esse escudo. Voo dos chefes mantém recuperação em altura acessível por salto/golpe dos três heróis.

## Gêmeos: dois corpos e uma vida

Castor e Pólux têm duas áreas atingíveis, uma barra de HP, um identificador de dano de grupo e uma conclusão de capítulo. Golpe normal, especiais/assistência, reflexão, WAV e corpo lançado verificam ambos os corpos. Um ataque que cruza/sobrepõe os dois conta uma vez no grupo; acertar os dois não dobra a recompensa.

O corpo principal permanece no espaço de combate; o secundário participa do fogo cruzado e muda de posição pelo portal. A posição do portal é limitada pelo mundo, testada contra sólidos e afastada do jogador; o portal não causa dano de contato instantâneo. Não são duas barras independentes nem dois chefes com recompensas separadas.

## Arenas e saves

A escolta obrigatória agora é acompanhada pelo `spawnId` dos membros originais, não apenas por sua posição atual. Sair da região por um impulso não libera a arena enquanto esse membro estiver vivo. Um inimigo ordinário de outra origem que passe por ali não reabre uma arena concluída.

A campanha continua salvando a exploração e reiniciando um chefe incompleto ao carregar o checkpoint. `BossMind` e projéteis não são serializados; a nova IA não muda o formato do save nem os identificadores de conteúdo dos mapas existentes. A fase concluída continua concluída, com uma única recompensa/callback.

## Validação e limites

239 testes passaram no fechamento deste bloco. Cobertura nova: sequências/fases dos oito chefes, alvo travado, recuperação, pulsos limitados, gravidade, escudo, parede fina, os dois corpos dos gêmeos, deduplicação de dano/conclusão, golpe comum dos três heróis em todos os chefes e simulação completa com projéteis limitados. Chromium confirmou dano real ao segundo corpo e o desenho da preparação.

Esses ensaios não são uma certificação de derrota de cada chefe em uma partida completa, nem de dificuldade/controle físico. Arte, áudio, ajuste de arenas, câmera e legibilidade em aparelho ainda precisam de playtest. A implementação é uma base jogável com números documentados; não é release final.

No incremento 14, o HUD dos gêmeos passou a indicar **VIDA COMPARTILHADA**. Os setores finais 6C/7C/8D integram os padrões de Kusanagi/Vane/Oswald; a prova de vitória/carregamento testa interface e integridade do save, não certifica balanceamento completo.
