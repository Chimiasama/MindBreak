import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { sound } from '../src/game/audio';
import { GameEngine } from '../src/game/engine';
import { FixedStepClock, STEP_MS } from '../src/game/simulation';
import { HERO_CLIPS, HeroAnimator } from '../src/game/heroAnimation';
import {
  SPRITE_KEYFRAMES,
  interpolateKeyframes,
  lerpActorPosition,
  sampleSpriteClipAt,
} from '../src/game/render3d/spriteInterpolation';
import {
  WORLD_UNIT,
  getToonGradient,
  worldX,
  worldY,
} from '../src/game/render3d/materials';
import {
  buildBossRig3D,
  buildEnemyRig3D,
  buildHeroRig3D,
  updateBossRig3D,
  updateEnemyRig3D,
  updateHeroRig3D,
} from '../src/game/render3d/characterRig3d';
import {
  buildCeilingPipe3D,
  buildPickupMesh3D,
  buildPlatform3D,
  buildProp3D,
  propColorForDebris,
} from '../src/game/render3d/worldGeometry3d';
import { STAGES } from '../src/game/stages';
import type { BossRuntime, CharacterId, DestructibleProp, Enemy, EnemyType, Platform } from '../src/game/types';
import type { HeroPose } from '../src/game/heroAnimation';

afterEach(() => sound.stopMusic());

test('WORLD_UNIT and coordinate mapping match 32px = 1.0 unit and Y-up inversion', () => {
  assert.equal(WORLD_UNIT, 1 / 32);
  assert.equal(worldX(320), 10);
  assert.equal(worldY(56), -1.75);

  const fovRad = THREE.MathUtils.degToRad(30);
  const viewHUnits = 540 * WORLD_UNIT;
  const camZ = viewHUnits / 2 / Math.tan(fovRad / 2);
  const visibleHeightAtZ0 = 2 * camZ * Math.tan(fovRad / 2);
  assert.ok(Math.abs(visibleHeightAtZ0 - viewHUnits) < 1e-9);
});

test('shared cel-shading toon gradient builds a crisp 4-band NearestFilter DataTexture', () => {
  const tex = getToonGradient();
  assert.equal(tex.image.width, 4);
  assert.equal(tex.image.height, 1);
  assert.equal(tex.minFilter, THREE.NearestFilter);
  assert.equal(tex.magFilter, THREE.NearestFilter);
});

test('all three heroes build distinct low-poly cylindrical 3D rigs and animate smoothly at 60fps', () => {
  const heroes: CharacterId[] = ['ren', 'maya', 'leon'];
  const poses: HeroPose[] = [
    'idle',
    'run',
    'jump',
    'fall',
    'wall',
    'climb',
    'hang',
    'vault',
    'dash',
    'slide',
    'attack1',
    'attack2',
    'attack3',
    'flight',
    'special',
    'hurt',
    'death',
  ];

  for (const heroId of heroes) {
    const rig = buildHeroRig3D(heroId);
    let meshCount = 0;
    rig.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && !obj.userData.isOutline) meshCount++;
    });
    assert.ok(meshCount >= 12, `${heroId} rig should contain >= 12 composite low-poly meshes`);

    if (heroId === 'ren') {
      assert.ok(rig.weaponGroup, 'Ren should have a plasma blade weaponGroup');
      assert.equal(rig.scarfMeshes?.length, 7, 'Ren should have a 7-segment 3D scarf');
    } else if (heroId === 'maya') {
      assert.ok(rig.haloGroup, 'Maya should have a floating psychic haloGroup');
    } else if (heroId === 'leon') {
      assert.ok(rig.heightUnits > 1.8, 'Leon should be taller/heavier than Ren/Maya');
    }

    for (let i = 0; i < poses.length; i++) {
      const pose = poses[i];
      updateHeroRig3D(
        rig,
        {
          characterId: heroId,
          pose,
          vx: pose === 'run' || pose === 'dash' ? 6 : 0,
          vy: pose === 'jump' ? -8 : pose === 'fall' ? 6 : 0,
          facing: i % 2 === 0 ? 1 : -1,
          onWall: pose === 'wall' ? 1 : 0,
          grounded: pose !== 'jump' && pose !== 'fall' && pose !== 'flight',
          isDashing: pose === 'dash',
          isSliding: pose === 'slide',
          isFlying: pose === 'flight',
          slashing: pose.startsWith('attack'),
          slashTimer: pose.startsWith('attack') ? 8 : 0,
          comboStep: i % 3,
          invulnTimer: i === 0 ? 6 : 0,
          gstTimer: 0,
          atkTimer: 0,
          flameTimer: heroId === 'leon' ? 12 : 0,
          stunTimer: 0,
          hp: 100,
          tickCount: i * 10,
        },
        1 / 60
      );
      assert.ok(Number.isFinite(rig.hips.position.y));
      assert.ok(Number.isFinite(rig.bodyPivot.rotation.y));
      assert.ok(Number.isFinite(rig.shoulderR.rotation.x));
      assert.ok(Number.isFinite(rig.kneeL.rotation.x));
    }
  }
});

test('all twelve enemy archetypes and bosses build valid 3D rigs and update without NaN', () => {
  const types: EnemyType[] = [
    'mib_gunner',
    'mib_shield',
    'cyber_hound',
    'jetpack',
    'drone',
    'mutant',
    'sniper',
    'suit_martial',
    'samurai',
    'turret_engineer',
    'turret',
    'heavy_trooper',
  ];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const enemy: Enemy = {
      id: i + 1,
      type: t,
      x: 120 + i * 50,
      y: 300,
      w: t === 'cyber_hound' ? 40 : 32,
      h: t === 'cyber_hound' ? 28 : 54,
      vx: t === 'turret' ? 0 : 2,
      vy: 0,
      airborne: false,
      hp: 60,
      maxHp: 60,
      facing: 1,
      patrolMinX: 0,
      patrolMaxX: 600,
      shootTimer: 40,
      attackTimer: 0,
      telegraph: 0,
      ai: {
        state: 'chase',
        timer: 10,
        facing: 1,
        aimX: 200,
        aimY: 300,
        memory: 30,
        action: 'melee',
      },
    };
    const rig = buildEnemyRig3D(enemy);
    updateEnemyRig3D(rig, enemy, 25, 1 / 60);
    assert.ok(Number.isFinite(rig.bodyPivot.rotation.y));
    if (t === 'mib_shield') assert.ok(rig.shieldMesh);
    if (t === 'turret') assert.ok(rig.turretBarrels);
    if (t === 'drone') assert.ok(rig.rotorMesh);
    if (t === 'jetpack') assert.ok(rig.jetFlames?.length === 2);
  }

  for (const behavior of ['valkyrie', 'twins', 'cipher', 'goliath'] as const) {
    const boss: BossRuntime = {
      id: `boss_${behavior}`,
      name: 'Boss',
      subtitle: 'Test',
      behavior,
      x: 500,
      y: 300,
      w: 44,
      h: 64,
      vx: 3,
      vy: 0,
      hp: 400,
      maxHp: 400,
      facing: -1,
      phase: 2,
      active: true,
      triggered: true,
      attackTimer: 0,
      specialTimer: 0,
      telegraph: 0,
      color: '#ef4444',
      accentColor: '#facc15',
      orbitalAngle: 0.5,
      shieldActive: true,
      mind: {
        state: 'active',
        index: 0,
        phase: 2,
        attack: 'charge',
        timer: 15,
        facing: -1,
        aimX: 400,
        aimY: 300,
      },
    };
    const rig = buildBossRig3D(boss);
    updateBossRig3D(rig, boss, 30, 1 / 60);
    assert.ok(Number.isFinite(rig.hips.position.y));
  }
});

test('3D platforms, walls, ceiling pipes, pickups and destructible props preserve 2D bounds and grounding', () => {
  const pal = STAGES[0].palette;
  const platSpecs: Platform[] = [
    { x: 0, y: 480, w: 600, h: 90, type: 'solid' },
    { x: 300, y: 200, w: 48, h: 280, type: 'wall' },
    { x: 400, y: 340, w: 120, h: 20, type: 'moving', moveAxis: 'x', moveRange: 120, moveSpeed: 1.5 },
    { x: 560, y: 340, w: 100, h: 20, type: 'crumble' },
    { x: 700, y: 480, w: 180, h: 24, type: 'conveyor', conveyorSpeed: 2 },
    { x: 900, y: 500, w: 160, h: 40, type: 'acid' },
    { x: 1100, y: 360, w: 20, h: 120, type: 'laser_gate' },
    { x: 1200, y: 360, w: 32, h: 120, type: 'wall', gateId: 'g1' },
  ];

  for (const plat of platSpecs) {
    const pv = buildPlatform3D(plat, pal, 1, 1);
    assert.ok(Math.abs(pv.group.position.x - worldX(plat.x + plat.w / 2)) < 1e-6);
    assert.ok(Math.abs(pv.group.position.y - worldY(plat.y + plat.h / 2)) < 1e-6);
  }

  const pipe = buildCeilingPipe3D({ x: 100, y: 220, w: 200, h: 16 }, pal.pipeColor, 1);
  assert.ok(Math.abs(pipe.position.x - worldX(200)) < 1e-6);

  const propKinds: DestructibleProp['kind'][] = ['crate', 'vending', 'car', 'pillar', 'terminal', 'chest'];
  for (let idx = 0; idx < propKinds.length; idx++) {
    const kind = propKinds[idx];
    const pr: DestructibleProp = { id: idx + 1, x: 160, y: 440, w: 40, h: 40, kind, hp: 20, dropType: 'heal' };
    const pv = buildProp3D(pr, 1);
    // Grounded bottom-center pivot aligns exactly with bottom edge y + h
    assert.ok(Math.abs(pv.group.position.x - worldX(pr.x + pr.w / 2)) < 1e-6);
    assert.ok(Math.abs(pv.group.position.y - worldY(pr.y + pr.h)) < 1e-6);
    assert.ok(propColorForDebris(kind).startsWith('#'));
  }

  const pickup = buildPickupMesh3D('atk');
  assert.ok(pickup.children.length >= 2);
});

test('GameEngine retains exact 2D physics/wall/crate behavior and falls back cleanly without WebGL container', () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
  const canvas = { width: 960, height: 540, getContext: () => ({ imageSmoothingEnabled: false }) } as unknown as HTMLCanvasElement;
  const engine = new GameEngine(canvas, {
    onHudUpdate() {},
    onStageClear() {},
    onContinueCountdown() {},
    onGameOver() {},
  });
  engine.loadStage(1, 'ren');
  engine.setPaused(false);
  engine.attach3DContainer(null);

  const state: any = engine;
  // Verify destructible crate still breaks via melee attack in 2.5D architecture
  const crate = state.props.find((p: DestructibleProp) => !p.broken);
  assert.ok(crate, 'Stage 1 should contain destructible props');
  state.player.x = crate.x - state.player.w - 4;
  state.player.y = crate.y + crate.h - state.player.h;
  state.player.facing = 1;
  engine.triggerAttack();
  for (let i = 0; i < 6; i++) state.update();
  assert.ok(crate.hp < 20 || crate.broken, 'Melee attack should damage or shatter 3D destructible crate');

  engine.dispose();
});

test('original 2D hero reference sprites remain preserved in src/assets/{ren,maya,leon}', () => {
  const root = process.cwd();
  for (const hero of ['ren', 'maya', 'leon']) {
    const dir = path.join(root, 'src', 'assets', hero);
    assert.ok(fs.existsSync(dir), `Expected reference sprite directory ${dir}`);
    const files = fs.readdirSync(dir);
    assert.ok(files.length > 0, `Expected preserved reference sprite files in ${dir}`);
  }
});

test('2.5D sprite-frame interpolation produces continuous 60fps skeletal transitions and pose crossfading', () => {
  // Every HeroPose in HERO_CLIPS has matching keyframe entries
  for (const pose of Object.keys(HERO_CLIPS) as HeroPose[]) {
    assert.equal(
      SPRITE_KEYFRAMES[pose].length,
      HERO_CLIPS[pose].durations.length,
      `Sprite keyframes for ${pose} should match clip frame count`
    );
  }

  // Sampling run clip across sub-frame fractions yields smooth intermediate hip/shoulder curves
  const sA = sampleSpriteClipAt('run', 7.25);
  const sB = sampleSpriteClipAt('run', 7.5);
  const sC = sampleSpriteClipAt('run', 7.75);
  assert.equal(sA.frame, 1);
  assert.equal(sA.nextFrame, 2);
  assert.ok(sA.frameAlpha < sB.frameAlpha && sB.frameAlpha < sC.frameAlpha);

  const pA = interpolateKeyframes(SPRITE_KEYFRAMES.run, sA.frame, sA.nextFrame, sA.frameAlpha, true);
  const pB = interpolateKeyframes(SPRITE_KEYFRAMES.run, sB.frame, sB.nextFrame, sB.frameAlpha, true);
  const pC = interpolateKeyframes(SPRITE_KEYFRAMES.run, sC.frame, sC.nextFrame, sC.frameAlpha, true);
  assert.ok(Number.isFinite(pB.hipLX) && Number.isFinite(pB.shRX));
  assert.ok((pA.hipLX > pB.hipLX && pB.hipLX > pC.hipLX) || (pA.hipLX < pB.hipLX && pB.hipLX < pC.hipLX));

  // HeroAnimator.sampleInterpolated reflects sub-tick alpha
  const animator = new HeroAnimator();
  animator.reset(0);
  const runInput = {
    hp: 100, vx: 5, vy: 0, grounded: true, onWall: 0, hangingCeiling: false,
    isDashing: false, isSliding: false, isFlying: false, slashTimer: 0, comboStep: 0, stunTimer: 0,
  };
  const enterRun = animator.sampleInterpolated(runInput, 0, 0);
  assert.equal(enterRun.pose, 'run');
  assert.equal(enterRun.frame, 0);
  const sample0 = animator.sampleInterpolated(runInput, 6, 0.5);
  assert.equal(sample0.pose, 'run');
  assert.equal(sample0.frame, 1);
  assert.ok(Math.abs(sample0.frameAlpha - 0.3) < 1e-6);

  // Pose crossfade smoothly converges when transitioning idle -> attack1
  const rig = buildHeroRig3D('ren');
  const commonInput = {
    characterId: 'ren' as const,
    vx: 0, vy: 0, facing: 1 as const, onWall: 0 as const, grounded: true,
    isDashing: false, isSliding: false, isFlying: false, slashing: false,
    slashTimer: 0, comboStep: 0, invulnTimer: 0, gstTimer: 0, atkTimer: 0, flameTimer: 0, stunTimer: 0, hp: 100, tickCount: 10,
  };
  updateHeroRig3D(rig, { ...commonInput, pose: 'idle', frame: 0, nextFrame: 1, frameAlpha: 0 }, 1 / 60);
  const idleShR = rig.shoulderR.rotation.x;
  updateHeroRig3D(rig, { ...commonInput, pose: 'attack1', slashing: true, slashTimer: 10, frame: 1, nextFrame: 2, frameAlpha: 0.2 }, 1 / 60);
  const midBlendShR = rig.shoulderR.rotation.x;
  assert.ok(midBlendShR < idleShR, 'Transitioning to attack1 should smoothly swing arm forward without NaN');
  assert.ok((rig.poseBlend ?? 1) < 1, 'Pose transition should crossfade over multiple 60fps frames');

  // FixedStepClock exposes sub-tick alpha and lerpActorPosition guards teleports
  const clock = new FixedStepClock();
  clock.advance(1000, () => true);
  clock.advance(1000 + STEP_MS * 0.5, () => true);
  assert.ok(Math.abs(clock.alpha - 0.5) < 1e-4);
  assert.deepEqual(lerpActorPosition(100, 200, 110, 200, 0.5), { x: 105, y: 200 });
  assert.deepEqual(lerpActorPosition(100, 200, 900, 200, 0.5), { x: 900, y: 200 });
});
