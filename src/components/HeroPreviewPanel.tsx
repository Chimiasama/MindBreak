import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHARACTER_ORDER, CHARACTERS } from '../game/characters';
import { MOVEMENT_PROFILES } from '../game/movement';
import { HERO_CLIPS, type HeroPose } from '../game/heroAnimation';
import { drawHeroFrame, prepareHeroArtwork } from '../game/heroArtwork';
import { buildHeroRig3D, updateHeroRig3D } from '../game/render3d/characterRig3d';
import {
  IDLE_VARIATION_START_TICKS,
  MEDITATION_RAMP_TICKS,
  MEDITATION_START_TICKS,
} from '../game/render3d/idleChoreography';
import { sampleSpriteClipAt } from '../game/render3d/spriteInterpolation';
import { detectSoftwareWebGL, disposeMaterialTree, makeToonMaterial } from '../game/render3d/materials';
import type { CharacterId } from '../game/types';

interface HeroPreviewPanelProps {
  selectedHero: CharacterId;
  onSelectHero: (id: CharacterId) => void;
}

type PreviewMode = 'details' | 'compare';
type PreviewPoseKind = 'idle' | 'meditate' | 'jump' | 'combat' | 'traversal';

interface HeroGameplayProfile {
  roleLabel: string;
  playstyle: string;
  strengths: string[];
  exclusiveTraitLabel: string;
  exclusiveTraitDetail: string;
  psyPowerSummary: string;
}

const HERO_GAMEPLAY_DETAILS: Record<CharacterId, HeroGameplayProfile> = {
  ren: {
    roleLabel: 'Velocista & Duelista',
    playstyle:
      'Ideal para avançar pelas rotas superiores com máxima velocidade no chão e no ar.',
    strengths: [
      'Maior velocidade (6.1) e aceleração (2.4) do grupo',
      'Exclusivo: Wall-Jump alternado + Pulo Psy duplo e maior impulso (13.0)',
      'Combo equilibrado de 26 de dano com corte que rebate projéteis',
    ],
    exclusiveTraitLabel: 'Wall-Jump & Mobilidade Máxima',
    exclusiveTraitDetail:
      'Único capaz de encadear wall-jumps pressionando contra a parede + pulo para escalar chaminés e alcançar atalhos.',
    psyPowerSummary: 'Onda cortante e captura telecinética em distância (25 PSY)',
  },
  maya: {
    roleLabel: 'Controle Aéreo & Alcance',
    playstyle:
      'Especialista em explorar áreas elevadas, evitar perigos no solo e atacar à distância.',
    strengths: [
      'Única com Voo Direcional em 8 direções (aperte e segure PULO no ar)',
      'Maior alcance de golpe corpo a corpo (90 px) + Pulo Psy duplo',
      'Atrai inimigos próximos com a Singularidade gravitacional (25 PSY)',
    ],
    exclusiveTraitLabel: 'Voo em 8 Direções',
    exclusiveTraitDetail:
      'Explora tetos, atalhos verticais e contorna emboscadas aéreas com liberdade total.',
    psyPowerSummary: 'Pulso de gravidade que puxa inimigos para o centro (25 PSY)',
  },
  leon: {
    roleLabel: 'Tanque Pirocinético',
    playstyle:
      'Brawler firme no chão (sem pulo psy nem wall-jump), feito para quebrar defesas e absorver fogo cruzado.',
    strengths: [
      'Maior reserva de vida (150 HP) e maior poder de ataque base (35)',
      'Punhos flamejantes: golpes causam queimadura contínua (dano por tempo)',
      'Super Armor e Quebra-Escudo imediato contra agentes blindados',
    ],
    exclusiveTraitLabel: 'Chamas Contínuas & Quebra-Escudo',
    exclusiveTraitDetail:
      'Foco total no combate direto e força bruta; sem pulo psy ou wall-jump, usa impulsos firmes e canos para avançar.',
    psyPowerSummary: 'Chama Intensa: onda de fogo que dobra o dano da queimadura por 8s (25 PSY)',
  },
};

const MAX_STAT_BASE = {
  maxHp: Math.max(...CHARACTER_ORDER.map((id) => CHARACTERS[id].maxHp)),
  attackPower: Math.max(...CHARACTER_ORDER.map((id) => CHARACTERS[id].attackPower)),
  speed: Math.max(...CHARACTER_ORDER.map((id) => CHARACTERS[id].speed)),
  slashRange: Math.max(...CHARACTER_ORDER.map((id) => CHARACTERS[id].slashRange)),
  jumpForce: Math.max(...CHARACTER_ORDER.map((id) => CHARACTERS[id].jumpForce)),
};

function resolvePose(heroId: CharacterId, kind: PreviewPoseKind, elapsedTicks = 0): {
  pose: HeroPose;
  comboStep: number;
  idleTicks: number;
  vy: number;
} {
  if (kind === 'combat') {
    const step = Math.floor(elapsedTicks / 18) % 3;
    const pose: HeroPose = step === 0 ? 'attack1' : step === 1 ? 'attack2' : 'attack3';
    return { pose, comboStep: step, idleTicks: 0, vy: 0 };
  }
  if (kind === 'jump') {
    const cycle = elapsedTicks % 48;
    const rising = cycle < 22;
    return {
      pose: rising ? 'jump' : 'fall',
      comboStep: 0,
      idleTicks: 0,
      vy: rising ? -9 + cycle * 0.35 : (cycle - 22) * 0.35,
    };
  }
  if (kind === 'meditate') {
    return {
      pose: 'idle',
      comboStep: 0,
      idleTicks: MEDITATION_START_TICKS + MEDITATION_RAMP_TICKS + (elapsedTicks % 480),
      vy: 0,
    };
  }
  if (kind === 'traversal') {
    return { pose: heroId === 'maya' ? 'flight' : 'run', comboStep: 0, idleTicks: 0, vy: 0 };
  }
  return {
    pose: 'idle',
    comboStep: 0,
    idleTicks: IDLE_VARIATION_START_TICKS + (elapsedTicks % 460),
    vy: 0,
  };
}

export const HeroPreviewPanel: React.FC<HeroPreviewPanelProps> = ({
  selectedHero,
  onSelectHero,
}) => {
  const [mode, setMode] = useState<PreviewMode>('details');
  const [poseKind, setPoseKind] = useState<PreviewPoseKind>('idle');
  const [artRevision, setArtRevision] = useState(0);
  const [webglFallback, setWebglFallback] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseKindRef = useRef<PreviewPoseKind>(poseKind);
  poseKindRef.current = poseKind;
  const selectedHeroRef = useRef<CharacterId>(selectedHero);
  selectedHeroRef.current = selectedHero;
  const yawOffsetRef = useRef<number>(0);

  const hero = CHARACTERS[selectedHero];
  const movement = MOVEMENT_PROFILES[selectedHero];
  const gameplay = HERO_GAMEPLAY_DETAILS[selectedHero];

  useEffect(() => {
    let active = true;
    void prepareHeroArtwork(selectedHero).then(() => {
      if (active) setArtRevision((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [selectedHero]);

  // 3D Low-Poly Cylindrical Hero Turntable Preview
  useEffect(() => {
    if (mode !== 'details') return;
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      const isSw = detectSoftwareWebGL();
      renderer = new THREE.WebGLRenderer({ antialias: !isSw, alpha: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setPixelRatio(isSw ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(148, 148, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(28, 1, 0.2, 40);
      camera.position.set(0, 1.12, 4.9);
      camera.lookAt(0, 0.92, 0);

      scene.add(new THREE.HemisphereLight('#93c5fd', '#1e1b4b', 0.95));
      const key = new THREE.DirectionalLight('#fff7ed', 1.65);
      key.position.set(3, 5, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight('#38bdf8', 0.9);
      rim.position.set(-4, 3, -3);
      scene.add(rim);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.0, 0.14, 16),
        makeToonMaterial('#0f172a', { emissive: '#1e293b', emissiveIntensity: 0.35 })
      );
      pedestal.position.y = -0.07;
      scene.add(pedestal);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.025, 6, 24),
        makeToonMaterial('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.9 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);

      const rigs = {
        ren: buildHeroRig3D('ren'),
        maya: buildHeroRig3D('maya'),
        leon: buildHeroRig3D('leon'),
      };
      const turntable = new THREE.Group();
      scene.add(turntable);
      for (const r of Object.values(rigs)) {
        r.root.visible = false;
        turntable.add(r.root);
      }

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      let alive = true;
      let rafId = 0;
      let timerId = 0;
      let elapsedTicks = 0;
      let lastTs = performance.now();

      const renderLoop = (now: number) => {
        if (!alive) return;
        const dt = Math.min(0.05, Math.max(0.008, (now - lastTs) / 1000));
        lastTs = now;
        elapsedTicks += dt * 60;

        const activeId = selectedHeroRef.current;
        const resolved = resolvePose(activeId, poseKindRef.current, elapsedTicks);
        const activePose = resolved.pose;
        for (const id of CHARACTER_ORDER) {
          rigs[id].root.visible = id === activeId;
        }
        const r = rigs[activeId];
        const localTick = activePose.startsWith('attack') ? elapsedTicks % 18 : elapsedTicks;
        const sample = sampleSpriteClipAt(activePose, localTick);
        updateHeroRig3D(
          r,
          {
            characterId: activeId,
            pose: activePose,
            frame: sample.frame,
            nextFrame: sample.nextFrame,
            frameAlpha: sample.frameAlpha,
            elapsedTicks: localTick,
            idleTicks: resolved.idleTicks,
            vx: activePose === 'run' || activePose === 'flight' ? 5.2 : 0,
            vy: resolved.vy,
            facing: 1,
            onWall: 0,
            grounded: activePose !== 'flight' && activePose !== 'jump' && activePose !== 'fall',
            isDashing: false,
            isSliding: false,
            isFlying: activePose === 'flight',
            slashing: activePose.startsWith('attack'),
            slashTimer: activePose.startsWith('attack') ? 14 - (elapsedTicks % 14) : 0,
            comboStep: resolved.comboStep,
            invulnTimer: 0,
            gstTimer: 0,
            atkTimer: 0,
            flameTimer: activeId === 'leon' && activePose.startsWith('attack') ? 10 : 0,
            stunTimer: 0,
            hp: 100,
            tickCount: elapsedTicks,
          },
          dt
        );

        const ringMat = ring.material as THREE.MeshToonMaterial;
        ringMat.color.set(CHARACTERS[activeId].accentColor);
        ringMat.emissive.set(CHARACTERS[activeId].accentColor);

        if (!reducedMotion) {
          turntable.rotation.y = Math.sin(elapsedTicks * 0.025) * 0.55 + yawOffsetRef.current;
        } else {
          turntable.rotation.y = yawOffsetRef.current;
        }

        renderer.render(scene, camera);

        if (reducedMotion) return;
        if (isSw) {
          timerId = window.setTimeout(() => renderLoop(performance.now()), 90);
        } else {
          rafId = window.requestAnimationFrame(renderLoop);
        }
      };

      renderLoop(lastTs);

      return () => {
        alive = false;
        if (rafId) window.cancelAnimationFrame(rafId);
        if (timerId) window.clearTimeout(timerId);
        disposeMaterialTree(scene);
        envRT.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch {
      setWebglFallback(true);
      return;
    }
  }, [mode]);

  // 2D fallback canvas if WebGL is unavailable
  useEffect(() => {
    if (mode !== 'details' || !webglFallback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { pose } = resolvePose(selectedHero, poseKind);
    const clip = HERO_CLIPS[pose];
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let frameIdx = pose === 'attack1' ? 1 : 0;
    let tickInFrame = 0;
    let rafId = 0;

    const renderFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, h - 18, w - 20, 4);
      ctx.fillStyle = hero.accentColor;
      ctx.fillRect(14, h - 18, w - 28, 2);
      ctx.save();
      const zoom = 1.75;
      ctx.scale(zoom, zoom);
      drawHeroFrame(ctx, selectedHero, pose, frameIdx % clip.durations.length, w / (2 * zoom), (h - 18) / zoom, 1);
      ctx.restore();
    };

    renderFrame();
    if (reducedMotion) return;

    const step = () => {
      tickInFrame += 1;
      const duration = Math.max(4, clip.durations[frameIdx % clip.durations.length] * 2);
      if (tickInFrame >= duration) {
        tickInFrame = 0;
        frameIdx = (frameIdx + 1) % clip.durations.length;
        renderFrame();
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => { if (rafId) window.cancelAnimationFrame(rafId); };
  }, [selectedHero, poseKind, mode, artRevision, hero.accentColor, webglFallback]);

  const statRows = useMemo(
    () => [
      {
        label: 'Vida (HP)',
        valueText: `${hero.maxHp} HP`,
        ratio: hero.maxHp / MAX_STAT_BASE.maxHp,
        note: hero.maxHp === MAX_STAT_BASE.maxHp ? 'Maior do grupo' : hero.maxHp === 85 ? 'Mais frágil' : 'Equilibrado',
      },
      {
        label: 'Ataque Base',
        valueText: `${hero.attackPower} DMG`,
        ratio: hero.attackPower / MAX_STAT_BASE.attackPower,
        note: hero.attackPower === MAX_STAT_BASE.attackPower ? 'Maior impacto' : hero.attackPower === 22 ? 'Foco em alcance' : 'Cortes rápidos',
      },
      {
        label: 'Velocidade',
        valueText: `${hero.speed.toFixed(1)} · Acel. ${movement.groundAcceleration.toFixed(1)}`,
        ratio: hero.speed / MAX_STAT_BASE.speed,
        note: hero.speed === MAX_STAT_BASE.speed ? 'Mais rápido' : hero.speed === 4.7 ? 'Passo pesado' : 'Ágil',
      },
      {
        label: 'Alcance do Golpe',
        valueText: `${hero.slashRange} px`,
        ratio: hero.slashRange / MAX_STAT_BASE.slashRange,
        note: hero.slashRange === MAX_STAT_BASE.slashRange ? 'Maior alcance' : hero.slashRange === 68 ? 'Curta distância' : 'Alcance médio',
      },
      {
        label: 'Impulso de Salto',
        valueText: hero.jumpForce.toFixed(1),
        ratio: hero.jumpForce / MAX_STAT_BASE.jumpForce,
        note: hero.canFlight ? 'Inclui voo aéreo' : hero.jumpForce === MAX_STAT_BASE.jumpForce ? 'Salto mais alto' : 'Salto firme',
      },
    ],
    [hero, movement.groundAcceleration]
  );

  return (
    <section
      aria-label="Pré-visualização de estatísticas do herói"
      className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-display text-xl font-bold text-white">
            Pré-visualização de Estatísticas e Estilo
          </h3>
          <p className="text-xs text-slate-400">
            Compare atributos numéricos e habilidades únicas antes de iniciar a fase
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Modo de visualização dos heróis"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'details'}
            onClick={() => setMode('details')}
            className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              mode === 'details'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ficha de {hero.name}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'compare'}
            onClick={() => setMode('compare')}
            className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              mode === 'compare'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Comparar os 3
          </button>
        </div>
      </div>

      {mode === 'details' ? (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Left: 3D Low-Poly Cylindrical Turntable & Pose Switcher */}
          <div className="md:col-span-4 flex flex-col items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/85 p-3">
            <div className="w-full flex items-center justify-between text-xs text-slate-400">
              <span>{gameplay.roleLabel}</span>
              <span className="font-mono tabular-nums">{hero.age} anos</span>
            </div>

            {!webglFallback ? (
              <div
                ref={mountRef}
                aria-label={`Prévia 3D de ${hero.name} (arraste para girar)`}
                onPointerMove={(e) => {
                  if (e.buttons === 1) yawOffsetRef.current += e.movementX * 0.025;
                }}
                className="my-2 h-36 w-36 cursor-grab active:cursor-grabbing touch-none"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={128}
                height={128}
                aria-label={`Prévia animada de ${hero.name}`}
                className="my-2 h-32 w-32"
                style={{ imageRendering: 'pixelated' }}
              />
            )}

            <div className="w-full space-y-2">
              <div className="grid grid-cols-5 gap-1 rounded-md bg-slate-900 p-1">
                {(
                  [
                    { id: 'idle', label: 'Idle' },
                    { id: 'meditate', label: 'Meditar' },
                    { id: 'jump', label: 'Salto' },
                    { id: 'combat', label: 'Golpes' },
                    { id: 'traversal', label: hero.canFlight ? 'Voo' : 'Correr' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPoseKind(item.id)}
                    className={`min-h-[30px] rounded px-1 py-1 text-[10px] font-semibold transition whitespace-nowrap ${
                      poseKind === item.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="text-center text-[11px] text-slate-400">
                {poseKind === 'meditate'
                  ? selectedHero === 'ren'
                    ? 'Meditação Oculta (escurece e some)'
                    : selectedHero === 'maya'
                      ? 'Levitação Serena (olhos fechados)'
                      : 'Combustão Calma (respiração funda)'
                  : poseKind === 'idle'
                    ? selectedHero === 'ren'
                      ? 'Vigilância tática & furtividade'
                      : selectedHero === 'maya'
                        ? 'Postura serena & foco psíquico'
                        : 'Soquinhos, peito estufado & tosse'
                    : hero.powerName}
              </div>
            </div>
          </div>

          {/* Right: Quantitative stat bars & explicit gameplay differences */}
          <div className="md:col-span-8 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              {statRows.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200">{stat.label}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] text-slate-400">{stat.note}</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-white">
                        {stat.valueText}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-950 ring-1 ring-slate-800">
                    <div
                      className="h-full transition-all duration-200 ease-out"
                      style={{
                        width: `${Math.round(stat.ratio * 100)}%`,
                        backgroundColor: hero.accentColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-white">
                  Diferencial: {gameplay.exclusiveTraitLabel}
                </span>
                <span className="text-slate-400">{hero.title}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{gameplay.playstyle}</p>
              <ul className="space-y-1 text-slate-300">
                {gameplay.strengths.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span style={{ color: hero.accentColor }} aria-hidden="true">
                      ▸
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/70 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400">Poder PSY: </span>
                  <span>{gameplay.psyPowerSummary}</span>
                </div>
                <div>
                  <span className="text-slate-400">Overdrive (95%+): </span>
                  <span className="font-semibold text-white">{hero.overdriveName}</span>
                  <span className="text-slate-500"> · </span>
                  <span className="text-slate-400">Assist: </span>
                  <span>{hero.assistName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-semibold">Atributo / Mecânica</th>
                {CHARACTER_ORDER.map((id) => {
                  const ch = CHARACTERS[id];
                  const isCurrent = id === selectedHero;
                  return (
                    <th key={id} className="py-2 px-2 font-semibold">
                      <button
                        type="button"
                        onClick={() => onSelectHero(id)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left transition whitespace-nowrap ${
                          isCurrent
                            ? 'bg-slate-800 text-white ring-1 ring-pink-500/70'
                            : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <span className="font-display text-sm font-bold">{ch.name}</span>
                        <span className="text-[10px]" style={{ color: ch.accentColor }}>
                          {isCurrent ? 'Selecionado' : 'Selecionar'}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              <tr>
                <td className="py-2 pr-3 text-slate-400">Função</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 font-medium">
                    {HERO_GAMEPLAY_DETAILS[id].roleLabel}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Vida Máxima</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 font-mono tabular-nums font-bold">
                    {CHARACTERS[id].maxHp} HP
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Ataque Base</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 font-mono tabular-nums font-bold">
                    {CHARACTERS[id].attackPower} DMG
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Velocidade / Aceleração</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 font-mono tabular-nums">
                    {CHARACTERS[id].speed.toFixed(1)} / {MOVEMENT_PROFILES[id].groundAcceleration.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Alcance do Golpe</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 font-mono tabular-nums">
                    {CHARACTERS[id].slashRange} px
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Salto</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 font-mono tabular-nums">
                    {CHARACTERS[id].jumpForce.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Wall-Jump</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2">
                    {CHARACTERS[id].canWallJump ? (
                      <span className="font-semibold text-pink-300">Sim (Exclusivo)</span>
                    ) : (
                      <span className="text-slate-500">Não</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Pulo Psy (Duplo)</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2">
                    {CHARACTERS[id].canPsyJump ? (
                      <span className="font-semibold text-cyan-300">Sim</span>
                    ) : (
                      <span className="text-slate-500">Não</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Voo em 8 Direções</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2">
                    {CHARACTERS[id].canFlight ? (
                      <span className="font-semibold text-cyan-300">Sim (Pulo no ar)</span>
                    ) : (
                      <span className="text-slate-500">Não</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Super Armor</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2">
                    {CHARACTERS[id].superArmor ? (
                      <span className="font-semibold text-amber-300">Sim (Tiros fracos)</span>
                    ) : (
                      <span className="text-slate-500">Não</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Quebra-Escudo</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2">
                    {CHARACTERS[id].shieldBreaker ? (
                      <span className="font-semibold text-orange-300">Imediato</span>
                    ) : (
                      <span className="text-slate-400">Padrão</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-400">Assistência</td>
                {CHARACTER_ORDER.map((id) => (
                  <td key={id} className="py-2 px-2 text-slate-300">
                    {CHARACTERS[id].assistName}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
