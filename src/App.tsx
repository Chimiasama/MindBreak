import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TouchControls } from './components/TouchControls';
import { sound } from './game/audio';
import { CHARACTER_ORDER, CHARACTERS } from './game/characters';
import { GameEngine } from './game/engine';
import { STAGES } from './game/stages';
import { CharacterId, GameState, HudSnapshot } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedChar, setSelectedChar] = useState<CharacterId>('ren');
  const [selectedStageId, setSelectedStageId] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [dialogueQueue, setDialogueQueue] = useState<{ speaker: string; line: string }[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [dialoguePurpose, setDialoguePurpose] = useState<'intro' | 'outro'>('intro');
  const [continueTimer, setContinueTimer] = useState<number>(9);
  const [continueChar, setContinueChar] = useState<CharacterId>('ren');

  const [hud, setHud] = useState<HudSnapshot>({
    stageId: 1,
    stageTitle: STAGES[0].title,
    characterId: 'ren',
    characterName: 'Ren',
    hp: 100,
    maxHp: 100,
    psyEnergy: 65,
    maxPsy: 100,
    lives: 3,
    nextOneUpScore: 15000,
    comboHits: 0,
    score: 0,
    enemiesRemaining: 0,
    bossActive: false,
    bossName: '',
    bossSubtitle: '',
    bossHp: 0,
    bossMaxHp: 100,
    bossPhase: 1,
    alertBanner: null,
    wavAmmo: 0,
    atkTimer: 0,
    jmpTimer: 0,
    gstTimer: 0,
    arenaLocked: false,
  });

  const handleStageClear = useCallback((stageId: number) => {
    const stageDef = STAGES.find((s) => s.id === stageId);
    if (stageDef && stageDef.outroDialogue.length > 0) {
      setDialogueQueue(stageDef.outroDialogue);
      setDialogueIndex(0);
      setDialoguePurpose('outro');
      setGameState('DIALOGUE');
    } else if (stageId >= STAGES.length) {
      setGameState('CAMPAIGN_VICTORY');
    } else {
      setGameState('STAGE_CLEAR');
    }
  }, []);

  const handleContinueCountdown = useCallback(() => {
    setContinueTimer(9);
    setGameState('CONTINUE_COUNTDOWN');
  }, []);

  const handleGameOver = useCallback(() => {
    setGameState('GAME_OVER');
  }, []);

  // Initialize Canvas & GameEngine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
        setContinueChar(snapshot.characterId);
      },
      onStageClear: handleStageClear,
      onContinueCountdown: handleContinueCountdown,
      onGameOver: handleGameOver,
    });
    engineRef.current = engine;

    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, [handleContinueCountdown, handleGameOver, handleStageClear]);

  // 9-second classic arcade Continue countdown
  useEffect(() => {
    if (gameState !== 'CONTINUE_COUNTDOWN') return;
    if (continueTimer <= 0) {
      engineRef.current?.triggerFinalGameOver();
      return;
    }
    const id = window.setTimeout(() => {
      setContinueTimer((t) => t - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [continueTimer, gameState]);

  // Keyboard controls when PLAYING
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || gameState !== 'PLAYING') return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.setKey('left', true);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.setKey('right', true);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        engine.setKey('up', true);
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        engine.setKey('down', true);
        engine.triggerDropDown();
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        engine.triggerJump();
      }
      if ((e.code === 'KeyJ' || e.code === 'KeyZ') && !e.repeat) {
        engine.triggerAttack();
      }
      if ((e.code === 'KeyK' || e.code === 'KeyX' || e.code === 'ShiftLeft') && !e.repeat) {
        engine.triggerDashOrSlide();
      }
      if ((e.code === 'KeyL' || e.code === 'KeyC') && !e.repeat) {
        engine.triggerPsy();
      }
      if ((e.code === 'KeyU' || e.code === 'KeyV') && !e.repeat) {
        engine.triggerAssist();
      }
      if (e.code === 'Tab' && !e.repeat) {
        e.preventDefault();
        engine.switchCharacter();
      }
      if (e.code === 'Escape' && !e.repeat) {
        engine.setPaused(true);
        setGameState('PAUSED');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.setKey('left', false);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.setKey('right', false);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') engine.setKey('up', false);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.setKey('down', false);
      if (e.code === 'Space') engine.setKey('jumpHeld', false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameState]);

  const startStage = (
    stageId: number,
    charId: CharacterId,
    carryScore = 0,
    showIntro = true,
    carryLives = 3,
    carryNextOneUp = 15000
  ) => {
    const engine = engineRef.current;
    if (!engine) return;
    sound.init();
    setSelectedStageId(stageId);
    setSelectedChar(charId);
    engine.loadStage(stageId, charId, carryScore, carryLives, carryNextOneUp);
    engine.start();

    const stageDef = STAGES.find((s) => s.id === stageId);
    if (showIntro && stageDef && stageDef.introDialogue.length > 0) {
      engine.setPaused(true);
      setDialogueQueue(stageDef.introDialogue);
      setDialogueIndex(0);
      setDialoguePurpose('intro');
      setGameState('DIALOGUE');
    } else {
      engine.setPaused(false);
      setGameState('PLAYING');
    }
  };

  const handleContinueConfirm = () => {
    const engine = engineRef.current;
    if (!engine) return;
    sound.init();
    engine.continueWithCharacter(continueChar);
    setGameState('PLAYING');
  };

  const advanceDialogue = () => {
    if (dialogueIndex + 1 < dialogueQueue.length) {
      setDialogueIndex(dialogueIndex + 1);
      return;
    }
    if (dialoguePurpose === 'intro') {
      engineRef.current?.setPaused(false);
      setGameState('PLAYING');
    } else {
      if (hud.stageId >= STAGES.length) {
        setGameState('CAMPAIGN_VICTORY');
      } else {
        setGameState('STAGE_CLEAR');
      }
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  const togglePause = () => {
    if (gameState === 'PLAYING') {
      engineRef.current?.setPaused(true);
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      engineRef.current?.setPaused(false);
      setGameState('PLAYING');
    }
  };

  const returnToMenu = () => {
    engineRef.current?.stop();
    setGameState('TITLE_MENU');
  };

  const styleRank =
    hud.comboHits >= 15
      ? 'SSS'
      : hud.comboHits >= 10
        ? 'SS'
        : hud.comboHits >= 6
          ? 'S'
          : hud.comboHits >= 3
            ? 'A'
            : 'B';

  const currentStageDef = STAGES.find((s) => s.id === selectedStageId) ?? STAGES[0];
  const psyReady = hud.psyEnergy >= 95;

  return (
    <div className="relative h-full w-full bg-[#070510] text-slate-100 font-sans overflow-hidden">
      {/* Main Full-Viewport Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: 'pixelated' }} />

      {/* =================================================================
          ACTIVE GAMEPLAY HUD & MOBILE CONTROLS
      ================================================================= */}
      {gameState !== 'TITLE_MENU' && (
        <>
          <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-3 pt-2.5 sm:px-5 sm:pt-4">
            {/* Left HUD Cluster: Player HP, Lives, Focus, Power-Ups & Boss Bar */}
            <div className="pointer-events-auto flex flex-col gap-1 min-w-0 max-w-[65%]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-sm sm:text-base font-extrabold tracking-wide text-white uppercase whitespace-nowrap">
                  {hud.characterName}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums text-pink-400">
                  <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
                  x{hud.lives}
                </span>
                <button
                  type="button"
                  onClick={() => engineRef.current?.switchCharacter()}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 hover:border-cyan-400 active:scale-95 transition whitespace-nowrap"
                >
                  <Users className="h-3 w-3" />
                  Trocar
                </button>
              </div>

              {/* HP Bar + Numeric readout */}
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-32 sm:w-44 overflow-hidden rounded-sm bg-slate-900/90 ring-1 ring-slate-700">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] font-bold tabular-nums text-cyan-200 whitespace-nowrap">
                  HP {hud.hp}/{hud.maxHp}
                </span>
              </div>

              {/* Psyche Bar */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-28 sm:w-36 overflow-hidden rounded-sm bg-slate-900/90 ring-1 ring-slate-800">
                  <div
                    className={`h-full transition-all duration-100 ${
                      psyReady ? 'bg-pink-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.max(0, (hud.psyEnergy / hud.maxPsy) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold tabular-nums text-purple-300 whitespace-nowrap">
                  {psyReady ? 'OVERDRIVE PRONTO' : `FOCO ${hud.psyEnergy}%`}
                </span>
              </div>

              {/* Active Power-Up Counters (only when active) */}
              {(hud.wavAmmo > 0 || hud.atkTimer > 0 || hud.jmpTimer > 0 || hud.gstTimer > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold tabular-nums">
                  {hud.wavAmmo > 0 && (
                    <span className="rounded border border-cyan-400/70 bg-slate-950/90 px-1.5 py-0.5 text-cyan-300">
                      WAV x{hud.wavAmmo}
                    </span>
                  )}
                  {hud.atkTimer > 0 && (
                    <span className="rounded border border-red-400/70 bg-slate-950/90 px-1.5 py-0.5 text-red-300">
                      ATK 2X {hud.atkTimer}s
                    </span>
                  )}
                  {hud.jmpTimer > 0 && (
                    <span className="rounded border border-amber-400/70 bg-slate-950/90 px-1.5 py-0.5 text-amber-300">
                      JMP {hud.jmpTimer}s
                    </span>
                  )}
                  {hud.gstTimer > 0 && (
                    <span className="rounded border border-purple-400/70 bg-slate-950/90 px-1.5 py-0.5 text-purple-300">
                      GST {hud.gstTimer}s
                    </span>
                  )}
                </div>
              )}

              {/* Boss HP stacked cleanly below player bars */}
              {hud.bossActive && (
                <div className="mt-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-pink-400">
                    <span className="truncate font-display tracking-wide">{hud.bossName}</span>
                    {hud.bossPhase === 2 && (
                      <span className="font-mono text-[10px] text-amber-300">OVERLOAD</span>
                    )}
                  </div>
                  <div className="h-2 w-40 sm:w-56 overflow-hidden rounded-sm bg-slate-950/90 ring-1 ring-pink-500/60">
                    <div
                      className="h-full bg-pink-500 transition-all duration-100"
                      style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Combo Rank */}
              {hud.comboHits > 1 && (
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold italic text-pink-500 tabular-nums drop-shadow">
                    {hud.comboHits}x
                  </span>
                  <span className="font-display text-sm sm:text-base font-bold italic text-amber-300">
                    RANK {styleRank}
                  </span>
                </div>
              )}
            </div>

            {/* Right HUD Cluster: Stage, Score & Controls */}
            <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/85 text-slate-200 hover:border-cyan-400 transition"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  aria-label="Pausar jogo"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/85 text-slate-200 hover:border-pink-400 transition"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <div className="font-display text-xs sm:text-sm font-bold text-slate-200 whitespace-nowrap">
                  Fase {hud.stageId}/8 · Restam {hud.enemiesRemaining}
                </div>
                <div className="font-mono text-xs font-bold tabular-nums text-amber-300">
                  {hud.score.toLocaleString('pt-BR')} PTS
                </div>
                <div className="font-mono text-[10px] tabular-nums text-slate-400">
                  1-UP em {hud.nextOneUpScore.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </header>

          {/* Tactical Alert Banner */}
          {hud.alertBanner && (
            <div className="pointer-events-none fixed inset-x-0 top-24 z-20 flex justify-center px-4">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/70 bg-slate-950/90 px-4 py-1.5 font-display text-sm font-bold tracking-wide text-amber-300 shadow-lg">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{hud.alertBanner}</span>
              </div>
            </div>
          )}

          {/* Touch Controls on Active Play */}
          {gameState === 'PLAYING' && (
            <TouchControls
              characterId={hud.characterId}
              psyReady={psyReady}
              onKey={(k, pressed) => engineRef.current?.setKey(k, pressed)}
              onJump={() => engineRef.current?.triggerJump()}
              onDropDown={() => engineRef.current?.triggerDropDown()}
              onAttack={() => engineRef.current?.triggerAttack()}
              onDash={() => engineRef.current?.triggerDashOrSlide()}
              onPsy={() => engineRef.current?.triggerPsy()}
              onAssist={() => engineRef.current?.triggerAssist()}
            />
          )}
        </>
      )}

      {/* =================================================================
          TITLE MENU (Character + 8 Stages + Android PWA Install)
      ================================================================= */}
      {gameState === 'TITLE_MENU' && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#070510] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic tracking-tight text-white">
                  MIND//BREAK <span className="text-pink-500">KINETIC REBELS</span>
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Beat &apos;em Up 2D Psíquico · Mobilidade Strider · 8 Fases Urbanas · Pixel Art 16-Bits &amp; Android
                </p>
              </div>
              <div className="flex items-center gap-3">
                <PWAInstallButton />
                <button
                  type="button"
                  onClick={toggleMute}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400 transition whitespace-nowrap shrink-0"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {muted ? 'Som Desligado' : 'Som Ativo'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl font-bold text-white">
                    01. Escolha seu Rebelde Psíquico
                  </h2>
                  <span className="text-xs text-slate-400">Troque a qualquer momento com TAB ou &ldquo;Trocar&rdquo;</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {CHARACTER_ORDER.map((id) => {
                    const ch = CHARACTERS[id];
                    const active = selectedChar === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedChar(id)}
                        className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-pink-500 bg-slate-900/95 shadow-lg'
                            : 'border-slate-800 bg-slate-900/45 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-2xl font-extrabold text-white">
                              {ch.name}
                            </span>
                            <span className="font-mono text-xs text-slate-400">{ch.age} anos</span>
                          </div>
                          <div
                            className="mt-0.5 text-xs font-semibold"
                            style={{ color: ch.accentColor }}
                          >
                            {ch.title}
                          </div>
                          <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                            {ch.summary}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 font-mono text-[11px] text-slate-400 tabular-nums">
                          HP {ch.maxHp} · Poder {ch.attackPower}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="font-display text-base font-bold text-cyan-300">
                    Controles (Toque Android, Teclado ou Gamepad Bluetooth)
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-300 sm:grid-cols-3">
                    <div><strong>Mover / Escalar:</strong> ◀ ▲ ▶ / A W D</div>
                    <div><strong>Pulo / Wall-Kick / Vault:</strong> PULO / Espaço</div>
                    <div><strong>Rasteira Lança-Ar:</strong> ▼ + DASH (S+K)</div>
                    <div><strong>Corte / Deflect 2X:</strong> GOLPE / J ou Z</div>
                    <div><strong>Telecinese / Overdrive:</strong> PSY / L ou C</div>
                    <div><strong>Assistente / Trocar:</strong> ASSIST / U ou Tab</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-5">
                <div>
                  <div className="text-xs font-semibold text-cyan-400">
                    Fase {currentStageDef.id} de 8 · {currentStageDef.musicLabel}
                  </div>
                  <h2 className="mt-1 font-display text-3xl font-extrabold text-white">
                    {currentStageDef.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">{currentStageDef.location}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    {currentStageDef.description}
                  </p>

                  <div className="mt-4 rounded-lg bg-slate-950/80 p-3 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Chefe da Fase</div>
                    <div className="font-display text-lg font-bold text-pink-400">
                      {currentStageDef.boss.name}
                    </div>
                    <div className="text-xs text-slate-300">{currentStageDef.boss.subtitle}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startStage(selectedStageId, selectedChar, 0, true)}
                  className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-6 py-3 font-display text-xl font-extrabold tracking-wide text-white shadow-lg hover:bg-pink-500 active:scale-[0.98] transition"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Iniciar Fase {selectedStageId}
                </button>
              </div>
            </div>

            <div className="space-y-3 pb-4">
              <h2 className="font-display text-2xl font-bold text-white">
                02. Selecionar Fase (Campanha Completa — 8 Fases)
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {STAGES.map((st) => {
                  const isSelected = st.id === selectedStageId;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStageId(st.id)}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                        isSelected
                          ? 'border-cyan-400 bg-slate-900 shadow-md'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className="font-mono font-bold"
                            style={{ color: st.palette.accentNeon }}
                          >
                            FASE 0{st.id}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {st.musicLabel}
                          </span>
                        </div>
                        <div className="mt-1 font-display text-lg font-bold text-white leading-tight">
                          {st.title}
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400 truncate">
                        Chefe: {st.boss.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          DIALOGUE CUTSCENE OVERLAY
      ================================================================= */}
      {gameState === 'DIALOGUE' && dialogueQueue[dialogueIndex] && (
        <div
          onClick={advanceDialogue}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:p-8"
        >
          <div className="w-full max-w-2xl rounded-2xl border-2 border-pink-500 bg-slate-950/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-extrabold tracking-wide text-cyan-400">
                {dialogueQueue[dialogueIndex].speaker} · COMUNICADOR
              </span>
              <span className="font-mono text-xs text-slate-400">
                {dialogueIndex + 1}/{dialogueQueue.length}
              </span>
            </div>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-100">
              {dialogueQueue[dialogueIndex].line}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  advanceDialogue();
                }}
                className="min-h-[44px] rounded-lg bg-pink-600 px-5 py-2 font-display text-base font-bold text-white hover:bg-pink-500 active:scale-95 transition"
              >
                {dialogueIndex + 1 < dialogueQueue.length ? 'Continuar' : 'Avançar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          CLASSIC 9-SECOND ARCADE CONTINUE SCREEN (With Hero Swap!)
      ================================================================= */}
      {gameState === 'CONTINUE_COUNTDOWN' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-pink-500 bg-slate-950 p-6 text-center shadow-2xl">
            <div className="font-display text-xl font-bold tracking-widest text-cyan-400">
              CONTINUE?
            </div>
            <div className="mt-1 font-display text-7xl font-extrabold tabular-nums text-pink-500">
              {continueTimer}
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Selecione seu herói e continue do último ponto seguro sem perder o avanço da fase.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {CHARACTER_ORDER.map((id) => {
                const ch = CHARACTERS[id];
                const active = continueChar === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setContinueChar(id)}
                    className={`min-h-[48px] rounded-lg border px-2 py-2 text-center transition ${
                      active
                        ? 'border-cyan-400 bg-slate-900 text-white'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-display text-base font-bold">{ch.name}</div>
                    <div className="font-mono text-[10px]">{ch.maxHp} HP</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleContinueConfirm}
                className="min-h-[48px] w-full rounded-xl bg-pink-600 font-display text-xl font-extrabold text-white hover:bg-pink-500 active:scale-95 transition"
              >
                Continuar com {CHARACTERS[continueChar].name}
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.triggerFinalGameOver()}
                className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 font-display text-sm font-bold text-slate-300 hover:bg-slate-800 transition"
              >
                Desistir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          PAUSE / STAGE CLEAR / GAME OVER / CAMPAIGN VICTORY MODALS
      ================================================================= */}
      {(gameState === 'PAUSED' ||
        gameState === 'STAGE_CLEAR' ||
        gameState === 'GAME_OVER' ||
        gameState === 'CAMPAIGN_VICTORY') && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="font-display text-3xl font-extrabold text-white">
              {gameState === 'PAUSED' && 'Jogo Pausado'}
              {gameState === 'STAGE_CLEAR' && `Fase ${hud.stageId} Concluída!`}
              {gameState === 'GAME_OVER' && 'Missão Interrompida'}
              {gameState === 'CAMPAIGN_VICTORY' && 'Nexus Derrotada!'}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {gameState === 'PAUSED' && `Fase ${hud.stageId}: ${hud.stageTitle}`}
              {gameState === 'STAGE_CLEAR' &&
                `Pontuação atual: ${hud.score.toLocaleString('pt-BR')} PTS. Prepare-se para o próximo setor.`}
              {gameState === 'GAME_OVER' &&
                'Os agentes da Nexus fecharam o cerco. Levante-se e tente novamente!'}
              {gameState === 'CAMPAIGN_VICTORY' &&
                `Você completou todas as 8 fases com ${hud.score.toLocaleString('pt-BR')} PTS!`}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {gameState === 'PAUSED' && (
                <button
                  type="button"
                  onClick={togglePause}
                  className="min-h-[48px] w-full rounded-xl bg-cyan-500 font-display text-lg font-bold text-slate-950 hover:bg-cyan-400 transition"
                >
                  Retomar Combate
                </button>
              )}

              {gameState === 'STAGE_CLEAR' && hud.stageId < STAGES.length && (
                <button
                  type="button"
                  onClick={() =>
                    startStage(
                      hud.stageId + 1,
                      hud.characterId,
                      hud.score,
                      true,
                      hud.lives,
                      hud.nextOneUpScore
                    )
                  }
                  className="min-h-[48px] w-full rounded-xl bg-pink-600 font-display text-lg font-bold text-white hover:bg-pink-500 transition"
                >
                  Ir para Fase {hud.stageId + 1}
                </button>
              )}

              {(gameState === 'GAME_OVER' || gameState === 'PAUSED') && (
                <button
                  type="button"
                  onClick={() => startStage(hud.stageId, hud.characterId, 0, false)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-pink-600 font-display text-lg font-bold text-white hover:bg-pink-500 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reiniciar Fase
                </button>
              )}

              <button
                type="button"
                onClick={returnToMenu}
                className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-800 font-display text-base font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                Voltar ao Menu &amp; Fases
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
