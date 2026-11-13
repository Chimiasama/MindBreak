# MIND//BREAK: Kinetic Rebels

Jogo de ação e plataforma 2D em React, TypeScript, Canvas e Web Audio. Oito fases principais com **26 subfases próprias conectadas**: 4+3+3+3+3+3+3+4. A campanha usa save local, respawn exploratório e chefes com padrões próprios. É uma base jogável em evolução; balanceamento, áudio e arte ainda têm etapas previstas.

## Desenvolvimento

Requer Node 24 e Bun 1.4.4 (o lockfile usa formato que versões antigas de Bun não leem).

```sh
bun install --frozen-lockfile
npm run dev
```

```sh
npm test
npm run lint
npm run build
```

`lint` executa a checagem TypeScript. O build web gera `dist/` e recursos PWA. Nenhuma API key, banco de dados ou backend é necessário para o jogo atual.

## Perfil de teste e regra final

A troca livre via Tab/botão permanece disponível **para testes**. Depois da escolha inicial, a regra da versão final é permitir mudar de herói somente no continue. Assistência não é troca de herói.

```sh
VITE_TEST_CHARACTER_SWITCH=false npm run build
```

Essa configuração retira a troca livre da interface e bloqueia o método do motor. O build padrão ainda é o perfil de testes. A escolha de personagem no continue permanece funcionando nos dois perfis.

## Campanha e exploração

No distrito: **1A Laboratório ↔ 1B Telhados ↔ 1C Esgotos ↔ 1D Avenida/Cipher-01**. Aperte **CIMA** dentro das portas para atravessar. HP, foco, munição, buffs, inimigos e baús abertos são preservados ao voltar. Bandeiras ativam pontos de apoio. Só o chefe de 1D encerra a fase 1.

O menu permite retomar a exploração na sessão atual. Recarregar/fechar a página ainda não salva a campanha; o save persistente continua no plano. O mapa original do distrito está disponível pelo botão de teste, oculto no perfil final.


Inimigos comuns podem reaparecer após afastamento prolongado e retorno. O ajuste inicial exige cinco segundos longe da origem e pelo menos quinze segundos desde a morte. A distância mínima de afastamento é adaptada ao tamanho 2D do mapa, até 1.800 unidades. Reaparições aguardam um ponto fora da câmera, afastado do jogador e sem sólidos/entidades sobrepostos.

Inimigos de emboscadas obrigatórias não reaparecem; chefes não são repostos. Persistência é recompensada: derrotas confirmadas do mesmo inimigo de origem rendem internamente 1.000, 500, 50 e depois zero pontos. O histórico é por origem e por tentativa da fase; golpes sem matar não consomem a sequência, e captura telecinética conta como derrota. Não há teto adicional de vidas por fase. Pontos e limiar da próxima vida ficam ocultos na interface, mas continuam funcionando internamente. Baús e itens únicos não são restaurados por esse sistema. Os ajustes de respawn estão em `src/game/tuning.ts`; a curva de recompensas está em `src/game/rewards.ts`.

## GitHub Actions e Android

**Todos os workflows são exclusivamente manuais.** Em Actions, escolha **Construir APK Android (manual)** e clique em **Run workflow**, selecionando `main`. O fluxo valida testes e TypeScript, empacota o jogo com Capacitor e disponibiliza o APK assinado de testes em **Artifacts** por 14 dias.

Baixe `MindBreak-APK-debug-<execução>`, extraia o ZIP e abra `MindBreak-debug.apk` no Android (7.0 ou superior). Não use “Re-run” da execução antiga de validação: ela continua usando a configuração do commit antigo. Nenhuma geração ocorre em push ou pull request. [Guia técnico e instalação](docs/ANDROID_APK.md).

Options/Start é lido mesmo em pausa. O mapeamento padrão do DualShock 4 está descrito no menu; a validação em controle físico e aparelho Android ainda está pendente.

## Documentação

- [Campanha e subfases: contratos e regras atuais](docs/CAMPANHA_E_SUBFASES.md)
- [Plano de implementação](docs/PLANO_DE_IMPLEMENTACAO.md)
- [Registro de execução e verificações](docs/EXECUCAO.md)
- [Diagnóstico técnico original](docs/DOCUMENTO_TECNICO.md)

As alterações de jogabilidade atuais estão no registro; o diagnóstico original é histórico. Multiplayer e migração de engine estão fora do escopo ativo.

## Progresso local

A campanha agora salva automaticamente e pode ser carregada na tela inicial após fechar/reabrir o jogo. A restauração volta ao ponto de apoio, preservando recursos e exploração. Começar outra campanha ou apagar o save pede confirmação. O mapa original de teste não substitui a campanha salva. [Formato, recuperação e limites](docs/SALVAMENTO.md).

Torretas industriais de parede/teto e instaladores: comportamento, colisão de tiros e salvamento documentados em [docs/TORRETAS_E_PROJETEIS.md](docs/TORRETAS_E_PROJETEIS.md).

Combos e controles de áudio: [docs/COMBOS_E_AUDIO.md](docs/COMBOS_E_AUDIO.md) descreve os tempos dos três golpes, cobertura, quatro volumes persistentes e scheduler musical.

Primeiros temas originais: [distrito/Cipher, prévias para ouvir e parâmetros](docs/TRILHA_DISTRITO_E_CIPHER.md). Para renderizar e baixar WAV localmente, abrir `/tools/music-studio.html` com o servidor de desenvolvimento.

Estrutura exploratória revisada: [padrão de fases, mapas e validação](docs/PADRAO_DE_FASES.md). Os 23 setores fora do trem exigem alas elevadas e retorno antes de liberar saída/confronto; CIMA examina painéis.
