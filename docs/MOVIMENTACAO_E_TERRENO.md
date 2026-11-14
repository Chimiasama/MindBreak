# Movimento e terreno — incremento 9

> **Revisão 28:** Maya salta normalmente no primeiro toque mantido; voo exige soltar PULO, apertar novamente no ar e manter. Soltura, pouso e interrupções cancelam a intenção. Contrato e ensaios em [LEON_PINTADO_E_VOO_DA_MAYA.md](LEON_PINTADO_E_VOO_DA_MAYA.md).

## Perfis e unidades

A simulação continua em 60 ticks/s. Distâncias são unidades do mundo; velocidade é unidade/tick, aceleração é unidade/tick². `movement.ts` define perfis versão 1 e `tuning.ts` centraliza gravidade, velocidades especiais, fatores de salto e tempos já existentes. Velocidades máximas, dano, custos e altura lógica da câmera não foram aumentados.

| Herói | Velocidade máxima | Aceleração chão/ar | Frenagem chão/ar | Arranque até o máximo |
| --- | ---: | ---: | ---: | ---: |
| Ren | 5,8 | 2,4 / 2,4 | 2,8 / 1,0 | 3 ticks |
| Maya | 5,1 | 2,0 / 2,0 | 2,5 / 1,0 | 3 ticks |
| Leon | 4,7 | 1,7 / 1,7 | 2,2 / 0,9 | 3 ticks |

A reversão aplica multiplicador 1,5 na aceleração enquanto a velocidade aponta para o lado contrário ao comando. A aproximação não ultrapassa o alvo; soltar o comando chega exatamente a zero. O voo usa aceleração 2,8 e mantém a normalização diagonal. A escolha de controle aéreo ágil conserva as rotas de ida/volta já aceitas.

Dash, rasteira, stun e o período protegido de wall-kick continuam tendo precedência sobre a aceleração normal. Após impulso externo, a velocidade volta gradualmente ao alvo. Vento continua aplicado no ar; escalada/canos e o eixo vertical do voo mantêm suas regras próprias. Não é um novo motor de física.

## Medição de saltos

Medição antes/depois no motor real, piso plano, gravidade normal, sem vento, corrida já na velocidade máxima, sem voo/buff. O salto duplo foi acionado no tick 13. Valores iguais antes e depois:

| Herói | Altura salto simples | Alcance simples | Duração | Altura salto duplo | Alcance duplo | Duração |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ren | 115,900 | 220,400 | 38 ticks | 193,696 | 313,200 | 54 ticks |
| Maya | 112,100 | 193,800 | 38 ticks | 188,242 | 275,400 | 54 ticks |
| Leon | 101,250 | 169,200 | 36 ticks | 172,010 | 244,400 | 52 ticks |

Esses valores descrevem esse ensaio, não o alcance máximo em qualquer situação. Um salto partindo do repouso tem deslocamento inicial menor por causa da aceleração; salto com vento, buff e outro instante de salto duplo muda o resultado. Teste de sequência com aceleração, reversão e salto em 30/60/120/144 Hz produz o mesmo estado final.

## Inimigos terrestres

`groundActors.ts` separa integração do terreno e verificação de piso da IA de combate. O motor calcula os deslocamentos das plataformas uma vez por tick e entrega ao integrador dos inimigos.

- Gravidade 0,6 multiplicada pela escala da fase; queda limitada a 22 unidades/tick.
- Momentum, stun e perseguição usam `moveAgainstSolids()` em X/Y. O inimigo não atravessa parede ou plataforma fina; um impacto ascendente para sob o teto, sem ser colocado em cima dele.
- Apoio em plataforma móvel transporta o inimigo no mesmo tick. Esteiras respeitam obstáculos laterais. Perder o apoio põe o inimigo no ar e suspende a perseguição terrestre até pousar.
- Movimento voluntário exige piso sob o pé dianteiro, margem de 6 unidades e desnível máximo de 32. Ácido e barreiras laser são evitados mesmo quando a barreira está momentaneamente desligada.
- Perseguição tem detecção de 660 e limite de 700 unidades em relação à origem. Se um impulso o deixar além do limite, o inimigo tenta retornar andando com verificação de piso; não se teletransporta.
- A manobra de flanco do cão exige piso no destino e respeito ao limite da origem. Impulso de combate ainda pode derrubar inimigos de uma borda. Desaparecimento/esmagamento ambiental sem derrota confirmada não concede nem consome recompensa por derrota.

Drones/jetpacks conservam sua navegação aérea; quando atordoados, usam a integração de queda. Não foi substituída toda a IA por uma máquina de estados nem remodelada a física dos chefes. Colisão de corpos contra terreno não equivale a implementar oclusão de todos os ataques/projéteis por paredes.

## Evidências e limites

144 testes passaram no fechamento deste bloco: perfis, envelope medido dos saltos, equivalência por taxa de render, parede/teto/piso fino, apoio móvel, esteira, borda/perigo, stun, limite de perseguição e flanco sem piso. As rotas principais existentes passaram novamente para os três heróis, incluindo ida e volta no monotrilho.

Balanceamento final, perseguição em geometrias complexas, padrões dos chefes, interpolação visual, opções de shake e ensaio físico Android/DualShock 4 continuam pendentes. Nenhuma Action automática ou construção de APK foi acrescentada.

Na integração com o incremento 10, a distância de ataque terrestre passou a ser recalculada depois da aplicação do impulso/transporte. Um teste adicional garante que um inimigo empurrado para longe não acerte corpo a corpo usando sua posição anterior. As novas rotas do canteiro também foram verificadas com estes perfis.
