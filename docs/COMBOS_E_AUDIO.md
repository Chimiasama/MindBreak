# Combos e infraestrutura sonora — incremento 16

## 1. Combate

`src/game/combat.ts` reúne os tempos em ticks de simulação de 60 Hz. A sequência independe do contador de acertos do HUD. Antes, incrementar o índice antes de consultar o ataque fazia o launcher sair no segundo golpe; não havia expiração da sequência.

| Golpe | Índice interno | Efeito visual | Duração total | Dano adicional |
| --- | ---: | ---: | ---: | ---: |
| Corte | 0 | 6 ticks | 11 ticks | 0 |
| Segundo corte | 1 | 6 ticks | 11 ticks | 0 |
| Finalizador | 2 | 8 ticks | 16 ticks | 12 |

### 1.1 Entrada e impacto

- O impacto ocorre imediatamente no início do ataque aceito, uma vez por alvo, junto com som e início do arco visual. É a escolha atual para resposta arcade; a janela visual não reaplica dano e não permanece como hitbox contínua para alvos que chegarem depois.
- Depois do efeito visual existe recuperação sem arco ativo. O finalizador tem arco mais grosso e recuperação maior. Atlas/animações completas continuam previstos para a fase de arte.
- O próximo ataque precisa começar até 24 ticks depois da recuperação anterior. Após expirar, recomeça pelo corte, mesmo que o contador de acertos ainda esteja ativo. O terceiro golpe sempre é seguido de um primeiro, se a sequência continuar.
- Um novo comando nos últimos seis ticks de recuperação fica guardado para executar ao terminar. Há no máximo um comando antecipado; pressionar repetidamente não cria uma fila longa. Toque, teclado e controle usam a mesma regra e manter pressionado não repete ataques.
- Pausa/perda de foco limpam o comando antecipado. Dano com reação, stun e resgate também interrompem a sequência; a proteção de Leon contra tiros fracos conserva o comportamento de não interromper. Hitstop congela esses relógios junto da simulação.
- O finalizador só lança para cima com o herói no chão. No ar, conserva o bônus de dano e o recuo aéreo. A zona de chamas de Leon acontece no terceiro golpe, conforme a regra existente do personagem.
- O bônus também vale contra chefes. Dois corpos dos gêmeos continuam sendo um único alvo de dano por golpe. Não foram alterados os multiplicadores de backstab/ATK nem as regras de escudo.

### 1.2 Cobertura

Golpes usam alcance e linha de visão por sólidos para inimigos, corpos de chefe, objetos quebráveis e reflexão de tiros. Uma parede entre herói e alvo impede o impacto, mesmo quando a caixa de alcance alcança o outro lado. Elementos decorativos, canos, ácido e laser não viraram paredes. O teste de visibilidade usa centros dos corpos, portanto cobertura parcial ainda requer avaliação visual em aparelho.

## 2. Mixer e preferências

`audioPreferences.ts` define os volumes e a chave local `mindbreak.audio.v1`, independente da campanha. Não há migração de formatos antigos: a política de desenvolvimento continua permitindo instalação limpa.

| Canal | Volume padrão | Conteúdo |
| --- | ---: | --- |
| Geral/master | 70% | Todos os sons; mute atua aqui sem perder os quatro valores |
| Música | 75% | Baixo, melodia e percussão dos protótipos existentes |
| Efeitos | 100% | Movimento, combate, tiros, avisos e recompensas |
| Voz | 80% | Gritos sintetizados dos três heróis |

Os sliders estão em **Volumes de áudio**, no menu inicial e na pausa. Valores 0–100% são salvos imediatamente, validados e limitados ao intervalo; armazenamento negado/corrompido usa padrões sem bloquear o jogo. Carregar uma campanha não sobrescreve o mute global escolhido na instalação. Mudanças de ganho usam suavização de 20 ms. Um compressor no master reduz picos, com limiar -8 dB e razão 12:1; não substitui avaliação auditiva nem masterização da trilha final.

## 3. Relógio e ciclo de vida

O timer de 25 ms apenas preenche a fila dos próximos 100 ms. O momento exato da nota vem de `AudioContext.currentTime`, passado a `start()` e às curvas de frequência/volume; a margem inicial é 20 ms. O timer deixou de ser o relógio de execução das notas. Os oito protótipos mantêm suas sequências e tempos anteriores; este incremento não é a composição dos oito temas finais.

Mute conserva a fase musical, com ganho geral zerado. Pausa cancela notas musicais já programadas e guarda a primeira etapa ainda não ouvida; retomar a mesma faixa continua a sequência. Trocar de gênero/encerrar a música reinicia a sequência. Uma interrupção longa do timer é reancorada no relógio atual, sem despejar notas atrasadas em rajada. Não se promete sincronismo de transporte durante suspensão do sistema operacional.

Ao ocultar a página, sair ou perder foco, o app pausa o jogo, cancela os sons transitórios e suspende o contexto. A retomada pelo usuário reativa o contexto e o agendamento; não há autoplay na volta do background. Pausa manual interrompe só a música; o áudio da interface/efeitos já iniciados pode terminar. Sequências de efeitos de vitória/vida/overdrive usam deslocamentos no relógio de áudio, sem callbacks `setTimeout` atrasados.

Fontes sonoras conectam-se ao seu canal, são desconectadas ao terminar e têm limite global de **48 fontes simultâneas**; acima disso, uma nova fonte é descartada. Não há roubo de voz/prioridades por categoria neste bloco. O retorno do background não reproduz sons antigos pendentes.

## 4. Origem e próximos recursos

O som atual é síntese procedural local (`audio.ts`), com notas e parâmetros do código do projeto; nenhum arquivo de terceiros, API, sample ou serviço de geração foi adicionado. As vozes são formantes sintetizados, não dublagem gravada. A música é criada no dispositivo, sem download ou licença externa nova.

Para a próxima etapa 6.2: compor primeiro distrito/chefe, documentando BPM, tonalidade, compassos, instrumentos, duração e autoria. Preservar os motivos ao mudar tensão/subfase. Para futuros recursos gravados, manter fonte de trabalho WAV PCM e exportação de loop local em Ogg/arquivo compatível com WebView, com teste de decodificação no Android alvo; registrar autoria/licença e tamanho por recurso. O codec final e orçamento de assets ainda dependem desse teste. Pré-carregador de arquivos, transições adaptativas e temas finais não foram implementados agora.

## 5. Verificação

**332 testes passam**, incluindo doze novos casos de combo dos três heróis, janela expirada, comando antecipado único, dano/pausa/resgate, recuperação visual, cobertura, mixer, preferências inválidas, agendamento futuro/atraso, mute/pausa, roteamento, limite de fontes e background.

Chromium horizontal 915×412 com Web Audio real: sliders persistem após recarga; mute deixa a fase avançar; pausa abre os quatro controles; background suspende o contexto e retomar reativa; sequência preparada no motor confirma índices 0/1/2. Sem erro JavaScript. Instrumentação foi aplicada só às respostas do ensaio, sem adicionar ganchos ao produto.

TypeScript, builds web/assets Android e sync aprovados. Não há certificação auditiva em aparelho, medição de latência no DualShock 4 nem garantia de loop final sem estalos. Nenhuma Action ou APK.

Atualização do incremento 17: o capítulo 1 agora usa partituras novas de distrito/Cipher com contextos e transição no compasso; os demais protótipos permanecem. O scheduler conserva também o contexto do primeiro passo pendente. Síntese tem rampas iniciais e cache de ruído. Ver [TRILHA_DISTRITO_E_CIPHER.md](TRILHA_DISTRITO_E_CIPHER.md).
