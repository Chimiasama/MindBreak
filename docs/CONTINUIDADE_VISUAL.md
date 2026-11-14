# Continuidade visual e anatomia — diretriz obrigatória de alta prioridade

Registrada por solicitação expressa do usuário no incremento 28. Aplica-se a qualquer recurso com mais de uma pose/vista do mesmo objeto: protagonistas, NPCs, inimigos, chefes, transformações, retratos e futuros sprites.

## 1. Princípio

**Virar ou movimentar o corpo muda a projeção e a oclusão; não muda o inventário do personagem.** Imagens próprias de esquerda/direita são necessárias, mas não suficientes. O verso de cada detalhe precisa ser pensado e desenhado.

Direita e esquerda sempre significam o lado anatômico. Não mover uma bolsa para a outra perna ao mudar a direção. Não remover tiras do lado de trás só porque a parte frontal da bolsa ficou escondida. Não alternar a quantidade de joelheiras durante a corrida.

Oclusão é geométrica: uma parte pode ficar totalmente invisível se estiver realmente coberta pelo corpo, roupa ou membro próximo. Isso não autoriza apagar o trecho exposto de uma tira, a borda de uma placa ou a ponta de uma faixa. Também não se deve desenhar através do corpo para mostrar um acessório oculto.

## 2. Inventário dos protagonistas

| Personagem | Elemento permanente | Continuidade entre vistas |
|---|---|---|
| Ren | Uma bolsa/coldre na coxa **direita**, presa por duas tiras | Bolsa na face externa da mesma coxa; trechos das tiras circundam frente, interior e verso. Lado oposto mostra as partes expostas da fixação, não uma perna sem equipamento nem bolsa duplicada à esquerda. |
| Ren | Cachecol e faixas magenta do cinto | Preservar fixação, quantidade e comprimento de referência; mudar a curva com o movimento. Na vista oposta, conservar as pontas que ultrapassam a silhueta. |
| Ren | Viseira, luvas, botas, proteção de ombro e harness | Manter identidade/material e continuidade das amarrações. Elementos de um ombro não devem migrar para o outro; o verso continua tendo encaixe e bordas. |
| Maya | Uma bolsa/coldre na coxa **direita**, presa por duas tiras | Mesmo contrato de volume, lateral e fixação circundante de Ren. A coxa esquerda não recebe uma cópia. |
| Maya | Casaco verde, guarnições douradas, forro e abas | Manter corte, costuras e bordas. Forro visto por trás difere da superfície bordada, mas pertence à mesma peça; abas não somem entre poses. |
| Maya | Rabo de cavalo, presilha, luvas e botas | Mesmo ponto de fixação e modelos em todas as vistas; cabelo pode seguir a inércia. |
| Leon | **Duas joelheiras**, uma em cada perna | Mesma placa cinza e duas faixas de fixação por joelho. Vistas laterais/traseiras mostram bordas e trechos das faixas. Flexionar não remove a placa. |
| Leon | Duas manoplas laranja e colete sem mangas | Preservar placas, encaixes, dobradiças, fechos e superfícies de trás; braços humanos continuam dentro do equipamento. |
| Leon | Harness e bolsa de equipamento da referência | Preservar posição e fixação; não duplicar nem deslocar entre pernas/costas ao virar. |

O usuário confirmou não ter outro lado específico a acrescentar além das bolsas à direita e das duas joelheiras. Os demais detalhes devem ser conferidos com a referência, sem presumir que os exemplos esgotam a revisão. Novos pontos de dúvida devem ser perguntados.

## 3. Anatomia — mesma prioridade

O usuário identificou um braço extra na corrida **4/6 do Ren**. A correção precisa remover o membro indevido, e não esconder o erro com escala, corte ou outra peça de roupa.

Para personagens humanos: uma cabeça, pescoço e tronco; dois braços conectados a dois ombros; dois cotovelos, antebraços, punhos e mãos; duas pernas conectadas à bacia, dois joelhos, tornozelos e pés. Manter proporções, volume e amplitude articular coerentes com a pose. Sem mãos duplicadas, braços que nascem do torso, membros fundidos, pernas soltas, dedos/rostos deformados ou fragmentos de uma célula vizinha.

Uma mão pode ser encoberta, e um membro pode parecer curto por perspectiva, desde que sua conexão e oclusão sejam plausíveis. Desfoque de movimento não justifica um terceiro membro sólido. Deformidades em um zumbi ou criatura só valem quando são parte intencional e documentada do design daquele personagem; não são exceção genérica para erros de autoria.

## 4. Processo de produção e aceite

1. Partir de um inventário fixo de corpo, roupa e equipamentos, com lado anatômico e fixação definidos.
2. Conferir a referência nas vistas frente, lado e verso; imaginar o volume e a continuação das tiras antes de produzir poses.
3. Incluir essas restrições em toda solicitação de geração/edição. Fontes com erro continuam sendo referências de pose, não autorização para repetir o erro.
4. Corrigir as **fontes**, reconstruir os atlas e revisar o que o jogo realmente desenha. Não manter a fonte corrigida apenas como conceito enquanto o runtime usa a antiga.
5. Inspecionar repouso, seis tempos de corrida, salto/queda, escalada, dash/slide, ataques/recuperação, dano, especial, voo quando existir e morte, nas duas direções.
6. Conferir alternância de pernas e braços, acessórios atrás da silhueta, bordas de célula e transições. Revisar especificamente os dois joelhos do Leon, as duas tiras da coxa direita de Ren/Maya e a corrida 4/6 do Ren.
7. Verificar alpha, recortes, pivôs, tempos e carregamento por testes; avaliar anatomia/continuidade visualmente. Registrar limites de revisão e não prometer aprovação automática da semântica da imagem.

Esta diretriz também está em [AGENTS.md](../AGENTS.md), para orientar os próximos trabalhos. Contratos de animação e direção: [ARTE_E_ANIMACAO.md](ARTE_E_ANIMACAO.md) e [VISTAS_DIRECIONAIS.md](VISTAS_DIRECIONAIS.md).
