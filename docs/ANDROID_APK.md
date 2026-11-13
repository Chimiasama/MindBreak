# APK Android e construção manual

## Construir e baixar no GitHub

1. Abra o repositório → **Actions** → **Construir APK Android (manual)**.
2. Clique em **Run workflow**, selecione `main` e confirme. Apenas essa ação explícita inicia uma construção; push e pull request não iniciam nada.
3. Aguarde o job terminar. Se testes, TypeScript, sincronização ou Gradle falharem, corrija a falha antes de instalar; não há upload de um APK antigo como fallback.
4. Na execução concluída, abra **Artifacts** e baixe `MindBreak-APK-debug-<número>` (requer acesso ao repositório; retenção de 14 dias).
5. Extraia o ZIP: contém `MindBreak-debug.apk`, `SHA256SUMS` e `BUILD-INFO.txt` com commit e execução.
6. No Android 7.0/API 24 ou superior, abra o APK, permita instalação por essa origem se solicitado e instale. O GitHub não instala nem abre o aplicativo remotamente no seu celular.

**Inicie uma execução nova em `main`.** “Re-run jobs” de uma execução antiga usa o commit e o workflow antigos; a execução anterior de validação não se transforma em construção de APK.

## Implementação

- Workflow: `.github/workflows/manual-checks.yml`, preservado no mesmo caminho para substituir a antiga validação. Único evento: `workflow_dispatch`. Permissão `contents: read`, sem publicação de release/loja.
- Runner fixo `ubuntu-26.04`; Node 24; Bun 1.4.4; Temurin JDK 21. Actions fixadas por SHA e executadas em Node 24.
- Capacitor core/Android/CLI 8.6.2; Android Gradle Plugin 8.13.0; Gradle 8.14.3 com checksum oficial e validação da distribuição. SDK mínimo 24, compile/target 36, build-tools 35.0.0 do runner.
- Identificador provisório `com.chimiasama.mindbreak`, nome `MIND//BREAK`, versão `0.1.0-test`. `versionCode` recebe `github.run_number`; builds locais usam 1, salvo `CI_VERSION_CODE` explícito.
- Ordem: checkout → runtimes/cache → instalação congelada → testes → TypeScript → assets Android → sync → conferência SDK → `assembleDebug` → verificação da assinatura → upload do APK/checksum/metadados.
- `npm run build:android` desabilita somente o plugin PWA nesse alvo. Os assets ficam dentro do APK, sem URL de servidor remoto nem service worker capaz de substituir a versão empacotada. O build web normal continua gerando PWA.
- O APK é debug assinado e mantém `VITE_TEST_CHARACTER_SWITCH=true`. A troca livre continua disponível para testes; a regra final de troca apenas no continue permanece no plano. Não é um release de produção.
- A keystore debug fica fora do Git e é reutilizada com `actions/cache`. Cache não é cofre permanente: expiração/remoção ou duas primeiras execuções concorrentes podem produzir assinaturas distintas. Nesse caso, desinstalar a versão anterior pode ser necessário e apaga dados locais. Uma assinatura estável de distribuição exigirá keystore dedicada em secrets e fluxo próprio.
- O projeto não usa plugins Cordova adicionais: o módulo vazio gerado não é incluído no grafo Gradle. Novos plugins exigem revisar essa integração.

## Avisos corrigidos

Na execução antiga, os avisos identificados foram a descontinuação do runtime **Node 20 das Actions** e a migração de **ubuntu-latest** para Ubuntu 26.04. Não foi identificado aviso de Java nas anotações daquela execução. As Actions agora usam Node 24 e o runner está explicitamente fixado. Java 21 foi selecionado por compatibilidade com Capacitor 8, evitando depender do Java padrão da imagem. Avisos novos de ferramentas/runner devem ser avaliados na próxima execução; não foram ocultados globalmente.

## Reprodução local

Requer Node 24, Bun 1.4.4, JDK 21 completo (com `javac`), Android SDK com platform 36/build-tools 35.0.0 e licenças aceitas. Configure `JAVA_HOME` e `ANDROID_HOME`; não versione `local.properties`, SDK, keystores ou artefatos compilados.

```sh
bun install --frozen-lockfile
npm test
npm run lint
npm run build:android
npm run android:sync
cd android
./gradlew --no-daemon --max-workers=2 assembleDebug
```

Saída: `android/app/build/outputs/apk/debug/app-debug.apk`. Para abrir no Android Studio: `npm run android:open` na raiz.

## Evidências e pendências

Incremento 5: 91 testes passaram, TypeScript e build web passaram. Build nativo real concluído localmente: APK de aproximadamente 4,2 MB, assinatura verificada por `apksigner`, package/minSDK/targetSDK conferidos por `aapt`. Conferidos assets internos, ausência de service worker e configuração sem servidor remoto.

Não foi acionada a nova Action nesta entrega. Conclusão no runner do GitHub, download do artifact, instalação/atualização em celular, áudio após gesto, rotação/safe areas, retorno de background, toque simultâneo e DualShock 4 físico ainda precisam de ensaio. Compilação não certifica essas interações.

## Incremento 6 — apresentação e navegação no celular

- Android usa `sensorLandscape`: permanece horizontal, permitindo virar entre as duas posições horizontais. O navegador comum não recebe bloqueio de orientação.
- `MainActivity` oculta barras de status e navegação via `WindowInsetsControllerCompat`, com modo imersivo e reaplicação ao retomar/recuperar foco. Um gesto deliberado ainda pode revelar as barras temporariamente; isso é comportamento do Android. Não requer permissão de sobreposição sobre outros apps.
- Controles ficam pelo menos 24 px afastados das bordas laterais e inferior, respeitando safe areas maiores.
- Câmera passou de 900 para 540 unidades de altura lógica: personagens ficam cerca de 67% maiores na mesma tela. A mudança também vale no navegador. Física, velocidades e dimensões do mundo permanecem iguais.
- O botão/gesto Voltar usa `OnBackPressedDispatcher`, sem navegar pelo histórico do WebView ou encerrar imediatamente. Um evento encaminha a decisão ao App: fora do menu, confirma retorno à tela inicial; no menu, confirma fechamento. Apenas a confirmação de fechar chama o plugin nativo `GameShell.exitApp` e encerra a Activity.
- Durante a confirmação, simulação, entrada de gameplay e contador de continue ficam suspensos. Voltar repetido não duplica nem confirma o diálogo. Cancelar mantém a tela anterior; após voltar ao menu, a retomada depende das regras existentes da campanha e da sessão em memória.
- Validação: 91 testes, TypeScript e compilação Java Android passaram. Chromium em 915×412 validou os dois textos de confirmação, cancelar, Voltar repetido, retorno ao menu e retomada, sem erros JavaScript. Uma ponte nativa simulada confirmou que cancelar não chama `exitApp` e confirmar chama uma vez; isso não certifica o fechamento em aparelho. Nenhum novo APK ou execução de Action foi solicitado/gerado neste incremento. Orientação, barras/gestos e fechamento nativo exigem confirmação no aparelho após uma construção manual.
