# Diretrizes permanentes do MindBreak

## Arte — prioridade muito alta

Antes de criar, editar ou integrar sprites, ler [docs/CONTINUIDADE_VISUAL.md](docs/CONTINUIDADE_VISUAL.md).

- Um personagem é o mesmo corpo vestido em todas as poses e vistas. Conservar lado **anatômico**, quantidade, forma, material e fixação dos detalhes; não interpretar direita/esquerda como lado da tela.
- Uma bolsa oculta continua tendo volume, verso e tiras que circundam a mesma perna. Uma joelheira tem placa frontal, bordas e fixação traseira. Faixas parcialmente ocultas mantêm as pontas expostas quando cabíveis. Não apagar componentes porque a câmera virou.
- Ren e Maya têm bolsas na **coxa direita anatômica**. Leon tem joelheiras nas **duas pernas**, inclusive nos movimentos. Usar o inventário visual para os demais elementos.
- Corpos humanos mantêm anatomia coerente: dois braços/mãos e duas pernas/pés, articulações e proporções plausíveis. Proibidos membros extras, ausentes, fundidos, soltos ou resíduos de células vizinhas. Deformidades só são admitidas se fizerem parte do design explícito do personagem, como um zumbi; nunca usar isso para justificar erro de geração.
- Cada direção precisa de arte própria; não resolver continuidade espelhando a pintura. Revisar também a transição entre repouso, movimento, ataque e recuperação.
- Conferir fontes e sprites realmente integrados, em sequência e lado a lado. Um teste de pixels ou atlas carregado não comprova anatomia nem continuidade. Não declarar arte aprovada apenas porque os testes passaram.
- Em dúvida sobre uma característica não definida, consultar o usuário; não inventar uma mudança de design silenciosa.

## Publicação e testes

- Actions do GitHub são exclusivamente manuais. Não disparar workflows nem gerar APK sem pedido expresso do usuário. Builds de assets e sync do Capacitor não equivalem a gerar APK.
- Nesta fase de testes não é necessário preservar compatibilidade de saves; o usuário avisará quando isso mudar.
