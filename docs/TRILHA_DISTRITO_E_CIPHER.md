# Primeira composição de trilha — incremento 17

## Ouvir

- [Circuitos de Fuga — distrito, arranjo de 1B](audio/distrito.ogg)
- [Protocolo Cipher — fase 1](audio/cipher-fase-1.ogg)
- [Protocolo Cipher — fase 2](audio/cipher-fase-2.ogg)

Estas prévias são uma volta completa, renderizada offline pela partitura do jogo, sem gameplay/SFX. Os Ogg são somente documentação, **não são carregados pelo app nem incluídos no APK**. O jogo sintetiza a partitura localmente; continua funcionando sem API externa ou download musical.

## 1. Composição e autoria

Partituras procedurais produzidas neste projeto com assistência do Codex, sem samples, melodias importadas, gravações ou novos recursos de terceiros. Fonte editável: `src/game/music.ts`. As formas de onda e o ruído são sintetizados por Web Audio. Não foi adicionada dublagem nem declarada uma licença externa fictícia. A política de distribuição do código do repositório continua sendo a do projeto.

| Tema | Uso | BPM | Tonalidade | Grade / duração |
| --- | --- | ---: | --- | --- |
| Circuitos de Fuga | Capítulo 1, setores 1A–1D | 120 | Mi menor | 4/4, semicolcheias, 16 compassos / 256 passos / 32 s |
| Protocolo Cipher | Chefe do capítulo 1 | 136 | Mi frígio, dominante de Si nos fechamentos | 4/4, semicolcheias, 8 compassos / 128 passos / aproximadamente 14,12 s |

### 1.1 Circuitos de Fuga

Baixo sincopado em triângulo sobre raízes **Mi–Dó–Sol–Ré**; melodia em seno, apoio de tônica/quinta em seno e bateria sintética. O motivo Mi–Sol–Si–Lá reaparece em frases ascendentes e respostas descendentes. A grade tem oito frases escritas, articuladas em quatro blocos de quatro compassos, com retorno variado no bloco final.

- **1A:** quatro primeiros compassos sem melodia principal e hi-hat mais espaçado na abertura. Depois a melodia entra; a abertura integra o loop e volta a cada ciclo.
- **1B:** melodia desde o início e hi-hat em semicolcheias, acentuando o transporte/movimento.
- **1C:** acrescenta respostas/arpejos curtos nos contratempos.
- **1D:** mantém o motivo com melodia desde o início; a arena obrigatória ativa a camada de tensão antes do chefe.
- **Tensão:** hi-hat mais denso, bumbo adicional e contramelodia, mantendo a progressão e o BPM.

### 1.2 Protocolo Cipher

O motivo do distrito recebe o semitom **Mi–Fá** e frases mais tensas. Raízes por compasso: **Mi–Fá–Dó–Si–Mi–Sol–Fá–Si**. A dominante de Si usa Ré sustenido nos fechamentos para conduzir de volta a Mi. Baixo em dente de serra, melodia em triângulo, apoio em seno e percussão sintética.

A fase 2 acrescenta bumbo e contramelodia, sem aumentar o BPM nem encurtar o ciclo. A densidade muda sem dessincronizar harmonia e relógio; os ataques do chefe continuam seguindo a simulação, não são sincronizados obrigatoriamente à música.

## 2. Integração

`MusicScene` descreve capítulo, setor, presença de chefe, fase e tensão de arena. `GameEngine.musicScene()` publica o estado real após a atualização do chefe; `playStageMusic()` também entrega o contexto ao carregar/retomar. Não é preciso deduzir o chefe pelo gênero musical.

`scoreFor()` seleciona as duas novas partituras **somente no capítulo 1**. Os capítulos 2–8 conservam seus protótipos anteriores; ainda não receberam sete trilhas finais nem temas próprios de chefes neste bloco.

`SoundEngine.setMusicScene()` apenas solicita um estado. O scheduler aplica a solicitação no próximo limite de 16 passos. Setor/tensão/fase preservam o contador harmônico; trocar entre distrito e Cipher reinicia a nova partitura na sua primeira nota e usa o novo BPM. Espera máxima nominal: um compasso (2 s no distrito), além das condições de agendamento do dispositivo. Não há crossfade longo; as notas são escritas para terminar antes do compasso seguinte.

A pausa preserva o primeiro passo ainda não ouvido e seu contexto, cancela as fontes musicais e conserva a solicitação pendente. Retomar não duplica scheduler nem volta sempre ao início. Mute continua no master e deixa o transporte avançar. Background conserva as regras do incremento 16: cancela fontes, suspende contexto e depende de retomada pelo usuário. Vitória interrompe o tema e mantém a fanfarra existente.

## 3. Síntese e recursos

Ataques de oscilador recebem rampa inicial de até 5 ms e decaimento exponencial até 0,0005 antes de encerrar, reduzindo descontinuidades. Ruído tem ataque de 2 ms, decaimento e semente fixa; os buffers são reutilizados por duração. Atualmente são três durações (25/70/90 ms), aproximadamente 33 KiB de samples mono em 44,1 kHz. Limite global de 48 fontes, mixer e compressor continuam os do incremento 16.

Volumes da composição: baixo 0,065; lead 0,042; respostas 0,022; apoio 0,022/0,015; bumbo 0,12; caixa 0,065; hi-hat 0,012/0,021, antes dos ganhos de música/master. O mixer permanece ajustável pelo jogador. Não há normalização automática por tema.

## 4. Reproduzir e exportar

1. Executar `npm run dev`.
2. Abrir `/tools/music-studio.html` no endereço do servidor Vite.
3. Escolher distrito, Cipher fase 1 ou fase 2. A ferramenta usa `OfflineAudioContext` e as mesmas notas, envelopes, ruído determinístico e ganhos padrão para gerar uma volta.
4. Ouvir no player ou baixar WAV PCM mono, 44,1 kHz / 16 bits. A ferramenta é de desenvolvimento e não entra no bundle principal.
5. Para regenerar as prévias da documentação, converter cada WAV com `ffmpeg -i entrada.wav -c:a libvorbis -q:a 5 saida.ogg`. O distrito de referência usa o arranjo 1B; os chefes usam 1D e a fase correspondente.

`musicPreview.ts` e o codificador WAV não são importados pela aplicação principal. As prévias Ogg somam aproximadamente 614 KiB; os recursos de runtime são código e buffers de síntese, sem os WAV/arquivos da documentação.

## 5. Verificação e pendências

**338 testes passam**, incluindo ciclos determinísticos, notas válidas/limitadas, caudas dentro do compasso, arranjos por setor/tensão/fase, seleção exclusiva do capítulo 1, transição no compasso, alteração de BPM, pausa com contexto pendente e cabeçalho/clamping do WAV. As regressões anteriores de gameplay/saves/mixer continuam passando; não foram criadas migrações de saves.

Chromium horizontal: distrito ao iniciar, gatilho real de Cipher com cenário preparado para o ensaio, mudança de fase pelo método de dano do motor, pausa sem avanço de transporte, background suspenso e retomada sem voltar ao distrito. Sem erro JavaScript. A ferramenta também renderizou o ciclo de 32 s pela interface.

Renderizações OfflineAudioContext: distrito com pico absoluto 0,1593/RMS 0,01376; Cipher 1 com pico 0,1391/RMS 0,01366; Cipher 2 com pico 0,1391/RMS 0,01453. Todos os samples eram finitos, com sinal e sem clipping. São medidas das prévias com ganhos padrão, não certificação de volume percebido, latência, emenda perfeita sob carga ou qualidade auditiva no Android físico.

TypeScript, builds web/assets Android e sync aprovados. Nenhuma Action acionada nem APK gerado. Pendente: escuta no celular/DualShock 4, ajuste de mixagem/repetição, demais sete temas e chefes, transições mais elaboradas e renovação dos efeitos conforme o plano.
