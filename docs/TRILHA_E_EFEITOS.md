# Catálogo sonoro — incremento 19

O usuário autorizou retomar música e outros sons após a revisão exploratória. O catálogo agora cobre **oito fases, oito chefes e três telas de fluxo: 19 partituras**. Foram acrescentadas 17 às duas do incremento 17. Todas usam síntese local, sem amostras de terceiros ou chamadas de rede.

Esta é a primeira edição completa das composições sintetizadas; mixagem, repetição e latência em Android físico continuam em avaliação. Não se confunde cobertura do catálogo com masterização ou dublagem profissional.

## 1. Ouvir as fases e chefes

Cada tema de fase tem 16 compassos; cada chefe, oito. A grade é 4/4 em semicolcheias. A segunda fase do chefe muda a densidade/contramelodia, conservando o BPM e a duração do ciclo.

| Fase | Tema / prévia | BPM / ciclo | Chefe / prévias | BPM / ciclo |
| --- | --- | --- | --- | --- |
| 1 · Distrito | [Circuitos de Fuga](audio/distrito.ogg) | 120 / 32,00 s | Protocolo Cipher · [fase 1](audio/cipher-fase-1.ogg) / [fase 2](audio/cipher-fase-2.ogg) | 136 / 14,12 s |
| 2 · Monotrilho | [Trilhos em Fuga](audio/monorail.ogg) | 172 / 22,33 s | Interceptação Valkyrie · [fase 1](audio/valkyrie-fase-1.ogg) / [fase 2](audio/valkyrie-fase-2.ogg) | 184 / 10,43 s |
| 3 · Construção | [Concreto e Tormenta](audio/construction.ogg) | 112 / 34,29 s | Peso de Goliath · [fase 1](audio/goliath-fase-1.ogg) / [fase 2](audio/goliath-fase-2.ogg) | 124 / 15,48 s |
| 4 · Fábrica | [Pulso de Refrigeração](audio/factory.ogg) | 132 / 29,09 s | Reator Arisawa · [fase 1](audio/arisawa-fase-1.ogg) / [fase 2](audio/arisawa-fase-2.ogg) | 144 / 13,33 s |
| 5 · Financeiro | [Juros de Neon](audio/financial.ogg) | 116 / 33,10 s | Duas Faces do Cofre · [fase 1](audio/twins-fase-1.ogg) / [fase 2](audio/twins-fase-2.ogg) | 132 / 14,55 s |
| 6 · Museu | [Memória de Vidro](audio/museum.ogg) | 96 / 40,00 s | Lâmina do Acervo · [fase 1](audio/kusanagi-fase-1.ogg) / [fase 2](audio/kusanagi-fase-2.ogg) | 128 / 15,00 s |
| 7 · Blacksite | [Frequência Clandestina](audio/blacksite.ogg) | 112 / 34,29 s | Protocolo Vane · [fase 1](audio/vane-fase-1.ogg) / [fase 2](audio/vane-fase-2.ogg) | 144 / 13,33 s |
| 8 · Torre | [Ascensão Zero](audio/tower.ogg) | 164 / 23,41 s | Órbita de Oswald · [fase 1](audio/oswald-fase-1.ogg) / [fase 2](audio/oswald-fase-2.ogg) | 176 / 10,91 s |

### 1.1 Identidade e arranjo

As sete novas duplas têm linhas escritas de melodia, progressões de raízes e grades de bateria próprias em `musicCatalog.ts`; não são apenas o tema do distrito transposto. `music.ts` organiza as notas por compasso, contexto e instrumentos.

- **Distrito/Cipher:** conserva as composições do incremento 17 e o motivo Mi–Sol–Si–Lá, com tensão frígia no chefe.
- **Monotrilho/Valkyrie:** centro em Ré, pulsação rápida, baixo sincopado e bateria inspirada em drum and bass; o chefe usa frases descendentes e tensão frígia.
- **Construção/Goliath:** centro em Dó sustenido, baixo em pulsos e acentos pesados inspirados em industrial; Goliath acrescenta movimentos cromáticos e bumbo mais denso.
- **Fábrica/Arisawa:** centro em Lá, baixo eletrônico sincopado e pulso de quatro tempos; o chefe introduz semitons e frases agudas de tensão.
- **Financeiro/Gêmeos:** centro em Sol, baixo caminhante e swing. As notas nas subdivisões correspondentes recebem atraso de um quarto de semicolcheia. Os gêmeos têm resposta melódica intercalada; a fase 2 adensa essa segunda voz.
- **Museu/Kusanagi:** centro em Mi, motivos pentatônicos/passagens menores, graves em seno com queda de frequência e hi-hats com subdivisões curtas. Kusanagi usa chamadas espaçadas e respostas descendentes.
- **Blacksite/Vane:** centro em Fá sustenido, baixo pulsante e síntese inspirada em synthwave; Vane usa agrupamentos mais agressivos e cromatismo.
- **Torre/Oswald:** centro em Lá, apoio harmônico mais cheio e bateria rápida. Oswald altera o centro por semitons e usa fechamentos harmônicos para reforçar a tensão orbital.

São arranjos de sintetizador com inspiração nesses estilos, sem gravações de bandas ou orquestra. Motivos musicais dedicados a cada herói e instrumentação gravada continuam possibilidades de produção.

### 1.2 Variações e transições

- O setor A tem entrada melódica mais espaçada; B aumenta a pulsação de hi-hat; C acrescenta respostas; D conserva a identidade do capítulo e reage à tensão de arena.
- Arenas e fase 2 aumentam densidade sem mudar o comprimento dos compassos. As vozes da partitura terminam até o fim do compasso, inclusive swing e hi-hats subdivididos.
- Fase → chefe e mudanças de setor/tensão entram no próximo limite de 16 passos, com reinício da nova partitura quando o tema muda. O novo tema usa seu próprio BPM.
- A seleção usa o contexto real de fase/chefe do motor em todos os oito capítulos. O catálogo antigo por gênero continua apenas como fallback da API sem contexto.
- Pausa conserva posição/contexto; mute conserva o transporte. A simulação de combate continua independente da música.

## 2. Música de fluxo

| Tela | Prévia | Forma |
| --- | --- | --- |
| Menu | [Rebeldes em Espera](audio/menu.ogg) | 100 BPM, oito compassos, 19,20 s; síntese suave e ausência de bateria |
| Game over | [Último Sinal](audio/game_over.ogg) | 76 BPM, quatro compassos, 12,63 s; linha descendente |
| Vitória da campanha | [Amanhecer dos Rebeldes](audio/victory.ogg) | 120 BPM, oito compassos, 16 s; transformação do motivo para centro maior |

O menu inicial espera toque/tecla para criar e liberar o áudio. Depois que o contexto já foi liberado, as telas de fluxo podem começar o tema correspondente. Vários toques na mesma tela não reiniciam a faixa nem criam schedulers extras. Trocar entre tela de fluxo e gameplay inicia o contexto musical correto imediatamente; a transição de chefe dentro da fase continua quantizada.

Perda de foco/background cancela fontes e suspende o contexto. Nas telas de fluxo, um novo gesto retoma a reprodução; durante gameplay, usa-se a retomada da pausa. As confirmações de Voltar continuam respeitadas. A fanfarra de conclusão de fase existente permanece; a trilha de vitória nova é a da conclusão da campanha.

## 3. Efeitos e sinais

[Ouvir a demonstração dos 30 sinais](audio/efeitos.ogg) — aproximadamente 13,31 s, com cada sinal separado por uma pausa.

`src/game/soundEffects.ts` reúne envelopes, atrasos, volume, prioridade e intervalo mínimo por sinal. O motor executa os efeitos no mesmo evento de gameplay que produz o resultado visual.

| Grupo | Sinais / integração |
| --- | --- |
| Movimento | salto, salto duplo, passos e aterrissagem. Passos seguem distância no chão (90 unidades), cessam no ar/idle/dash/rasteira; aterrissagem ocorre só na transição com velocidade vertical acima de 4,5 |
| Combo | corte, corte de retorno e finalizador têm envelopes distintos. O grito sintetizado do golpe normal fica no finalizador, reduzindo repetição sobre os dois cortes |
| Impacto | corpo, metal e chefe têm materiais/envelopes distintos; drones, torretas e tropas pesadas usam metal |
| Tiros | atirador, torreta, sniper e chefe têm timbres próprios; uma salva não empilha um som por projétil |
| Defesa | reflexão recebe sinal agudo prioritário; efeitos anteriores de bloqueio/quebra continuam disponíveis |
| Exploração | painel ativado, passagem liberada, ação bloqueada, portal, checkpoint e baú secreto têm sinais separados |
| Encontros | instalação de torreta e preparação de ataque do chefe recebem avisos próprios |
| Poderes | overdrives de Ren/Maya/Leon têm assinaturas distintas, com a voz no canal separado |
| Interface e morte | confirmação, ticks do continue, aviso mais agudo nos três segundos finais e derrota |

Alguns efeitos legados de parede/cano/dash/rasteira/armor/coleta/assistência/fanfarra continuam no motor e não são contabilizados como sinais novos do catálogo. Não foi adicionada dublagem gravada; os gritos são os formantes sintetizados do projeto.

### 3.1 Mixer, prioridade e memória

Permanecem quatro volumes persistentes: geral/música/efeitos/voz, com suavização e compressor no master. Não foram alteradas as regras de pontos, vida, física, comandos ou exploração.

- Máximo global de **48 fontes** de oscilador/buffer.
- Efeitos de prioridade baixa deixam de admitir novas fontes a partir de 40, reservando margem.
- Com o teto atingido, um sinal de prioridade maior pode interromper a fonte mais antiga dentre as de menor prioridade; empate não força substituição. Alertas, desbloqueio e parry recebem prioridade maior que passos/interface.
- Cooldowns usam `AudioContext.currentTime`, não o relógio da simulação. Atrasos das sequências são programados no áudio; não há `setTimeout` para ressuscitar efeitos depois do background.
- Fontes terminadas/canceladas saem dos registros de canal e prioridade. Ruído determinístico é compartilhado por duração: as 11 durações atuais ocupam aproximadamente 113 KiB em mono/44,1 kHz, sem carregar samples externos.

O limite pode descartar notas/efeitos sob sobrecarga. Ele não é garantia de audibilidade de todas as fontes simultâneas nem substitui ajuste de mixagem no celular.

## 4. Autoria, arquivos e reprodução

Composições e síntese produzidas no projeto com assistência do Codex, sem novos samples, serviços de geração, downloads de áudio ou licenças externas. Fonte editável em `musicCatalog.ts`, `music.ts`, `soundEffects.ts` e `audio.ts`.

O jogo gera os sons no dispositivo. Os **28 Ogg de documentação**, cerca de **5,08 MiB**, ficam em `docs/audio` e não entram no bundle/APK. [catalogo.json](audio/catalogo.json) registra título, fase, BPM/centro tonal, duração, tamanho, pico/RMS e SHA-256 de cada arquivo.

### 4.1 Estúdio local

1. Executar `npm run dev` e abrir `/tools/music-studio.html`.
2. Selecionar uma das 19 partituras, setor, tensão e fase do chefe; ou escolher um efeito/catálogo.
3. Renderizar, ouvir e baixar WAV PCM mono/44,1 kHz/16 bits.

A ferramenta usa as mesmas notas/envelopes/ruído e ganhos padrão no `OfflineAudioContext`. Não é importada pelo app e não dispara workflows.

### 4.2 Exportação em lote

`scripts/render-audio-previews.mjs` requer servidor Vite, Playwright/Chromium e ffmpeg instalados no ambiente de autoria. Não adiciona dependências ao runtime do jogo. Variáveis opcionais: `PREVIEW_URL`, `PLAYWRIGHT_MODULE` e `CHROMIUM_PATH`.

```sh
node scripts/render-audio-previews.mjs
```

Por padrão exporta todos os temas, variantes de chefe e catálogo de efeitos. Para atualizar só efeitos, usar `PREVIEW_IDS=effects`; a exportação parcial conserva as outras entradas do manifesto. A renderização rejeita samples não finitos, silêncio acidental ou pico acima do limite de verificação. Trabalhar com o código estável durante a exportação, evitando recarga de desenvolvimento no meio da renderização.

## 5. Verificação e próximos aceites

**385 testes passaram**, incluindo os 378 anteriores de gameplay/rotas/saves/áudio. Novos casos verificam os 19 ciclos, diversidade de material, intensificação dos oito chefes, notas e caudas com swing/hi-hat, cooldowns, reserva/substituição de fontes, fluxo idempotente, suspensão sem efeitos atrasados, passos/aterrissagem e sinais de exploração.

Chromium horizontal: oito pares de fase/chefe e fase 2 pelo contexto do motor; pausa, mute/background/retomada; menu após gesto, game over e vitória por carregamento de conclusão preparada; estúdio com 19 opções e renderização de música/efeito. Os cenários de chefe e conclusão foram preparados no ensaio; não foi vencida uma campanha completa para validar áudio. Sem erro JavaScript nos percursos aprovados.

Foram renderizadas 28 prévias completas. Samples finitos, sinal presente e sem clipping: pico absoluto entre 0,0777 e 0,1859; RMS entre 0,00629 e 0,01705, nos ganhos padrão. Esses números não certificam volume percebido ou o resultado de um combate com música/voz/efeitos sobrepostos.

TypeScript, builds web/assets Android e sync aprovados. **Nenhuma Action acionada e nenhum APK gerado.** Pendentes: escuta com alto-falante/fone do Android, fadiga/repetição, latência com toque/DualShock 4, mixagem sob carga, ambiências ambientais, efeitos legados restantes e eventual produção gravada/dublagem. A estrutura exploratória do incremento 18 foi conservada.
