import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sound } from '../src/game/audio';

afterEach(() => sound.stopMusic());
import { CAMPAIGN, SUBSTAGES, getSubstage, validateCampaign } from '../src/game/campaign';
import { GameEngine } from '../src/game/engine';
import { SpawnManager } from '../src/game/spawns';
import { STAGES } from '../src/game/stages';

Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
function fixture(hero: 'ren' | 'maya' | 'leon' = 'ren', onStageClear = () => {}) {
  const canvas = { width: 1280, height: 720, getContext: () => ({ imageSmoothingEnabled: false }) } as unknown as HTMLCanvasElement;
  const engine = new GameEngine(canvas, { onHudUpdate() {}, onStageClear, onGameOver() {}, onContinueCountdown() {} });
  engine.startCampaign(1, hero); engine.setPaused(false);
  const state: any = engine;
  return { engine, state };
}
function through(engine: GameEngine, state: any, id: string) {
  const door = state.stage.exits.find((exit: any) => exit.id === id);
  assert.ok(door, `missing portal ${id}`);
  Object.assign(state.player, { x: door.x, y: door.y + door.h - 56 });
  assert.equal(engine.travel(id), true);
}

test('campaign graph, checkpoint placement, exits and unique final encounters validate', () => {
  assert.deepEqual(validateCampaign(), []);
  assert.equal(CAMPAIGN.length, 8);
  assert.equal(CAMPAIGN.reduce((total, chapter) => total + chapter.plannedCount, 0), 26);
  assert.equal(SUBSTAGES.length, 11, 'four new district maps plus seven legacy adapters');
  assert.deepEqual(CAMPAIGN[0].substages, ['1A', '1B', '1C', '1D']);
  assert.equal(SUBSTAGES.filter((area) => area.id === 1 && area.boss).length, 1);
});

test('validator rejects unknown target, blocked checkpoint and unreachable area', () => {
  const areas = structuredClone(SUBSTAGES);
  areas[0].exits[0].target = '99A';
  areas[0].checkpoints[0].y = 680;
  const errors = validateCampaign(areas);
  assert.ok(errors.some((error) => error.includes('destino ausente')));
  assert.ok(errors.some((error) => error.includes('checkpoint obstruído')));
  assert.ok(errors.some((error) => error.includes('inalcançável')));
});

test('portal travel preserves hero, HP, focus, lives, hidden score, ammunition and buffs', () => {
  const { engine, state } = fixture('leon');
  Object.assign(state.player, { hp: 79, psyEnergy: 42, lives: 5, score: 12345, nextOneUpScore: 15000,
    wavAmmo: 9, atkTimer: 321, jmpTimer: 222, gstTimer: 111 });
  const carry = engine.getPlayerCarry();
  through(engine, state, 'telhados');
  assert.equal(state.stage.substageId, '1B');
  assert.deepEqual(engine.getPlayerCarry(), carry);
  assert.equal(state.boss.active, false);
  engine.stop();
});

test('backtracking preserves opened props, pickups, enemy state and reward histories', () => {
  const { engine, state } = fixture();
  state.props[0].broken = true;
  const victim = state.enemies[0]; victim.hp = 0;
  assert.equal(state.spawns.claimDefeatReward(victim), 1000);
  state.enemies = state.enemies.filter((enemy: any) => enemy.id !== victim.id);
  const manager = state.spawns;
  state.pickups.push({ x: 300, y: 600, w: 22, h: 22, kind: 'heal', vy: 0 });
  through(engine, state, 'telhados');
  state.worldTick += 1000;
  through(engine, state, 'laboratorio');
  assert.equal(state.stage.substageId, '1A');
  assert.equal(state.props[0].broken, true);
  assert.equal(state.pickups.length, 1);
  assert.equal(state.spawns, manager);
  assert.equal(state.enemies.some((enemy: any) => enemy.id === victim.id), false);
  assert.equal(state.spawns.claimDefeatReward(victim), 0);
  engine.stop();
});

test('closed mandatory arenas and remote portal calls cannot change areas', () => {
  const { engine, state } = fixture();
  assert.equal(engine.travel('telhados'), false, 'must stand inside the portal');
  through(engine, state, 'telhados'); through(engine, state, 'esgotos'); through(engine, state, 'avenida');
  const door = state.stage.exits[0];
  Object.assign(state.player, { x: door.x, y: door.y });
  state.ambushArenas[0].active = true;
  assert.equal(engine.travel(door.id), false);
  engine.stop();
});

test('only the fourth district area has a boss and completes the main chapter', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let completions = 0; const { engine, state } = fixture('ren', () => { completions++; });
  through(engine, state, 'telhados'); through(engine, state, 'esgotos'); through(engine, state, 'avenida');
  assert.equal(completions, 0); assert.equal(state.stage.substageId, '1D');
  assert.equal(state.boss.active, true);
  state.damageBoss(10000); t.mock.timers.tick(1200);
  assert.equal(completions, 1); engine.stop();
});

test('continue changes the hero inside the current substage without resetting exploration', () => {
  const { engine, state } = fixture(); through(engine, state, 'telhados');
  state.props[0].broken = true; engine.continueWithCharacter('maya');
  assert.equal(state.stage.substageId, '1B'); assert.equal(state.characterId, 'maya');
  assert.equal(state.player.hp, 85); assert.equal(state.props[0].broken, true);
  engine.stop();
});

test('extra-life death returns to the activated checkpoint rather than the latest arbitrary floor', () => {
  const { engine, state } = fixture();
  state.checkpointId = 'manutencao';
  state.player.lastGroundX = 1700; state.player.lastGroundY = 660;
  state.player.invulnTimer = 0;
  state.damagePlayer(1000, 0, true);
  assert.equal(state.player.lives, 2);
  assert.ok(Math.abs(state.player.x - 1100) < 1);
  engine.stop();
});

test('legacy loadStage remains available and each main chapter still has a runnable adapter', () => {
  const { engine, state } = fixture();
  engine.loadStage(1, 'ren'); assert.equal(state.stage.title, STAGES[0].title);
  assert.equal(state.campaignMode, false);
  for (let main = 2; main <= 8; main++) {
    engine.startCampaign(main, 'ren');
    assert.equal(state.stage.substageId, `${main}A`);
    assert.equal(state.boss.active, true);
  }
  engine.stop();
});

test('absence in another area counts toward respawn only after sufficient simulated time', () => {
  const manager = new SpawnManager(getSubstage('1A'), '1A');
  const initial = manager.initial(); initial[0].hp = 0;
  manager.noteMissing(initial, 0); manager.advanceAway(1000);
  const alive = initial.slice(1);
  const spawned = manager.update({ x: 100, y: 604, w: 32, h: 56 }, { x: -1200, y: -100, w: 200, h: 100 }, 1, alive, []);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].spawnId, initial[0].spawnId);
  assert.notEqual(spawned[0].id, initial[0].id);
});

for (const hero of ['ren', 'maya', 'leon'] as const) {
  for (const id of ['1A', '1B', '1C', '1D'] as const) {
    test(`${hero} can traverse the primary geometry of ${id} without flight or teleport`, (t) => {
      const { engine, state } = fixture(hero);
      if (id !== '1A') {
        through(engine, state, 'telhados');
        if (id === '1C' || id === '1D') through(engine, state, 'esgotos');
        if (id === '1D') through(engine, state, 'avenida');
      }
      t.after(() => engine.stop());
      // Geometry-only acceptance: combat/arena outcomes are tested separately.
      state.enemies = []; state.spawns.update = () => [];
      state.boss.active = false; state.ambushArenas = [];
      state.updateEnemies = () => {};
      state.player.invulnTimer = 100000;
      engine.setKey('right', true);
      let airborneTicks = 0;
      let rescued = false;
      let touchedHazard = false;
      const hazardPositions: number[][] = [];
      const damage = state.damagePlayer.bind(state);
      state.damagePlayer = (...args: unknown[]) => { touchedHazard = true; hazardPositions.push([state.player.x, state.player.y, state.player.vy]); return damage(...args); };
      let previousX = state.player.x;
      const goal = id === '1D' ? 2580 : state.stage.exits.find((exit: any) => exit.x > 1000).x;
      for (let tick = 0; tick < 2400 && state.player.x < goal - 24; tick++) {
        const p = state.player;
        if (p.grounded) {
          airborneTicks = 0;
          const wallAhead = state.platforms.some((platform: any) => !platform.broken &&
            platform.type !== 'acid' && platform.x >= p.x + p.w - 1 && platform.x < p.x + p.w + 55 &&
            platform.y < p.y + p.h && platform.y + platform.h > p.y);
          const floorAhead = state.platforms.some((platform: any) => !platform.broken && platform.type !== 'acid' &&
            p.x + p.w + 55 >= platform.x && p.x + p.w + 55 <= platform.x + platform.w &&
            Math.abs(platform.y - (p.y + p.h)) < 10);
          if (wallAhead || !floorAhead) engine.queueAction('jump');
        } else {
          airborneTicks++;
          if (airborneTicks === 13 && p.doubleJump) engine.queueAction('jump');
        }
        engine.setKey('jumpHeld', false);
        state.update();
        if (state.player.x < previousX - 100) rescued = true;
        previousX = state.player.x;
      }
      assert.equal(rescued, false, 'route must not rely on pitfall recovery');
      assert.equal(touchedHazard, false, `route must not rely on acid bounce or damage immunity: ${JSON.stringify(hazardPositions)}`);
      assert.ok(state.player.x >= goal - 24, `stopped at ${state.player.x}, expected ${goal}`);
      engine.stop();
    });
  }
}

test('campaign progress is an isolated session snapshot and can be resumed from menu', () => {
  const { engine, state } = fixture(); through(engine, state, 'telhados');
  const progress = engine.getCampaignProgress()!;
  assert.equal(progress.chapterId, 1);
  assert.equal(progress.substageId, '1B');
  assert.deepEqual(progress.visited, ['1A', '1B']);
  progress.player.hp = 0; progress.visited.push('8D');
  assert.ok(engine.getPlayerCarry().hp > 0);
  assert.equal(engine.getCampaignProgress()!.visited.includes('8D'), false);
  engine.stop(); assert.equal(engine.canResume(), true);
  state.gameOverTriggered = true; assert.equal(engine.canResume(), false);
});

test('final district boss waits for the mandatory squad to be cleared', () => {
  const { engine, state } = fixture();
  through(engine, state, 'telhados'); through(engine, state, 'esgotos'); through(engine, state, 'avenida');
  Object.assign(state.player, { x: 2200, y: 644, invulnTimer: 100000 });
  state.ambushArenas[0].active = true;
  state.update(); assert.equal(state.boss.triggered, false);
  state.ambushArenas[0].active = false; state.ambushArenas[0].cleared = true;
  state.update(); assert.equal(state.boss.triggered, true);
  engine.stop();
});

test('authoring validator rejects invalid geometry and orphaned substages', () => {
  const areas = structuredClone(SUBSTAGES);
  areas[0].platforms[0].w = NaN;
  const chapters = structuredClone(CAMPAIGN);
  chapters[0].substages = chapters[0].substages.slice(1);
  const errors = validateCampaign(areas, chapters);
  assert.ok(errors.some((error) => error.includes('geometria inválida')));
  assert.ok(errors.some((error) => error.includes('sem filiação')));
});

test('a short up tap crosses a portal even when released before the next simulation tick', () => {
  const { engine, state } = fixture();
  const door = state.stage.exits[0];
  Object.assign(state.player, { x: door.x, y: 604, grounded: true });
  engine.setKey('up', true); engine.queueAction('interact'); engine.setKey('up', false);
  state.update();
  assert.equal(state.stage.substageId, '1B');
  assert.equal(state.keys.up, false); engine.stop();
});

test('holding up without a new interaction does not automatically cross a portal', () => {
  const { engine, state } = fixture();
  const door = state.stage.exits[0];
  Object.assign(state.player, { x: door.x, y: 604, grounded: true });
  engine.setKey('up', true); state.update();
  assert.equal(state.stage.substageId, '1A'); engine.stop();
});

test('walking to a checkpoint activates it through normal simulation', () => {
  const { engine, state } = fixture();
  Object.assign(state.player, { x: 1100, y: 604, vy: 0 });
  state.update();
  assert.equal(state.checkpointId, 'manutencao'); engine.stop();
});

test('gamepad up queues the same portal interaction as keyboard and touch', (t) => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false })); buttons[12].pressed = true;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true,
    value: () => [{ connected: true, axes: [0, 0], buttons }] });
  t.after(() => { if (original) Object.defineProperty(navigator, 'getGamepads', original); else delete (navigator as any).getGamepads; });
  const { engine, state } = fixture();
  const door = state.stage.exits[0];
  Object.assign(state.player, { x: door.x, y: 604, grounded: true });
  state.pollGamepad(); state.update();
  assert.equal(state.stage.substageId, '1B'); engine.stop();
});

test('long backtracking restores eligible distant enemies before revealing the area', () => {
  const { engine, state } = fixture();
  const victim = state.enemies[0]; victim.hp = 0;
  state.spawns.claimDefeatReward(victim);
  state.enemies = state.enemies.filter((enemy: any) => enemy.id !== victim.id);
  through(engine, state, 'telhados'); state.worldTick += 1000;
  through(engine, state, 'laboratorio');
  const replacement = state.enemies.find((enemy: any) => enemy.spawnId === victim.spawnId);
  assert.ok(replacement, 'off-area absence should restore the encounter before first reveal');
  assert.notEqual(replacement.id, victim.id);
  replacement.hp = 0;
  assert.equal(state.spawns.claimDefeatReward(replacement), 500);
  engine.stop();
});
