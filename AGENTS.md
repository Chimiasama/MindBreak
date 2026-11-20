# MindBreak — diretrizes permanentes

- Roteiro único: docs/PLANO_DE_IMPLEMENTACAO.md. Evidências/histórico: docs/EXECUCAO.md. Não criar planos concorrentes por adendo.
- Prioridade: jogabilidade distinta dos três heróis e exploração ampla dentro de cada capítulo. A rota obrigatória deve funcionar com Leon (salto único), Ren e Maya; habilidades exclusivas abrem segredos/atalhos opcionais. Trem é exceção linear. Não usar troca de teste para justificar rota obrigatória.
- Simulação 2D a 60 Hz; apresentação 2.5D em Three.js. Modelos/animações não determinam colisão, alcance ou eventos de dano.
- Arte cel shading/anime, anatomia coerente e continuidade. Mesmo corpo/roupa/equipamento em todas as vistas. Bolsas na coxa direita anatômica de Ren/Maya; duas joelheiras do Leon; tiras circundantes, faixas e verso reais. Em 3D girar o modelo, nunca inverter por escala negativa para trocar lado. Sem membros extras/fundidos ou deformidades acidentais. Inspecionar o recurso realmente carregado; testes não aprovam anatomia.
- Preservar identidade de máquinas/criaturas/chefes não humanos. Fallback humanoide não é modelo definitivo.
- Troca livre é teste; versão final só permite troca no continue após escolha inicial. Não mostrar pontuação. Persistência/farm de vidas são aceitos com recompensas decrescentes.
- Actions exclusivamente workflow_dispatch; não executar workflows nem gerar APK/AAB sem pedido expresso. Builds de assets e sync não são APK. Publicar trabalho concluído no GitHub.
- Compatibilidade entre saves não é prioridade; salvar/restaurar a versão atual deve funcionar. Multiplayer/migração de engine ficam futuros.
