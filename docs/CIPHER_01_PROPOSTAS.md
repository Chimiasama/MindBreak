# Cipher-01 — propostas pintadas

Propostas geradas em 2026-11-14, retomando a etapa visual dos chefes após o incremento 28. Não estão integradas ao renderer e não têm aceite artístico final.

## Referência e escopo

Foram lidos AGENTS.md, CONTINUIDADE_VISUAL.md, ARTE_DOS_CHEFES.md e DIRECAO_VISUAL_V2.md, e inspecionados bossArtwork.ts e a folha atual dos chefes. Preservados traje violeta, viseira, núcleo psíquico e mudança dos acentos para dourado na fase 2. A proposta anterior de casaco claro/cabelo prateado não foi usada como identidade definitiva.

- [Vistas das duas fases](arte/chefes/cipher-01/proposta-vistas.png).
- [Quatro poses nas duas direções — fase 1](arte/chefes/cipher-01/proposta-fase-1.png).
- [Quatro poses nas duas direções — fase 2](arte/chefes/cipher-01/proposta-fase-2.png).

Imagens produzidas com a ferramenta de geração de imagens da OpenAI; folhas de poses derivadas da nova referência. São propostas com fundo e legendas, não atlas transparentes prontos.

## Contrato de produção

Os estados atuais são ready, windup, active e recover. Recuperação não é um novo estado de dano: não alterar a IA para acomodar as poses. Adagas orbitais e escudo continuam overlays dinâmicos, separados da pintura do corpo. Física, alcance, dano, temporização e colisões permanecem sem alterações.

Detalhes propostos para padronização: duas joelheiras com tiras circundantes, harness contínuo no verso, controlador único no antebraço esquerdo anatômico. Esses detalhes são proposta de design, não definições antigas atribuídas ao usuário.

## Revisão e pendências

As oito poses de cada folha apontam para a direção indicada. A inspeção inicial não identifica o problema antigo de repouso/preparação apontando para a direção contrária. Isso não encerra a revisão anatômica.

O controlador ainda varia de forma e projeção entre poses; há detalhes nos punhos que tornam ambígua a distinção entre luva e módulo. Corrigir as fontes, fixando volume, lado anatômico e oclusão antes da extração. Conferir também tiras dos joelhos, desgaste das abas entre fases e constância da viseira. Não considerar essas folhas aprovadas por terem sido geradas.

Próximos passos: corrigir continuidade nas fontes, extrair poses sem fundo/legendas, construir atlas independentes por direção e fase, integrar com fallback procedural e verificar escala, pivôs, transições e overlays no renderer real. Só então executar a validação pertinente do aplicativo. Nenhum teste de código foi necessário para estas propostas documentais; não houve integração, Action ou APK.
