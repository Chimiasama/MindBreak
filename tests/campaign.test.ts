import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sound } from '../src/game/audio';

afterEach(() => sound.stopMusic());
import { CAMPAIGN, SUBSTAGES, getSubstage, validateCampaign } from '../src/game/campaign';
import { GameEngine } from '../src/game/engine';
import { SpawnManager } from '../src/game/spawns';
import { STAGES } from '../src/game/stages';

Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
function fixture(hero: 'ren' | 'maya' | 'leon' = 'ren', onStageClear = () => {}, chapter = 1) {
  const canvas = { width: 1280, height: 720, getContext: () => ({ imageSmoothingEnabled: false }) } as unknown as HTMLCanvasElement;
  const engine = new GameEngine(canvas, { onHudUpdate() {}, onStageClear, onGameOver() {}, onContinueCountdown() {} });
  engine.startCampaign(chapter, hero); engine.setPaused(false);
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
  assert.equal(SUBSTAGES.length, 26, 'all campaign sectors are authored maps');
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

test('legacy loadStage remains available outside the expanded campaign', () => {
  const { engine, state } = fixture();
  engine.loadStage(1, 'ren'); assert.equal(state.stage.title, STAGES[0].title);
  assert.equal(state.campaignMode, false);
  for (let main = 6; main <= 8; main++) {
    engine.loadStage(main, 'ren');
    assert.equal(state.campaignMode, false);
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
  for (const id of ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C', '5A', '5B', '5C', '6A', '6B', '6C', '7A', '7B', '7C', '8A', '8B', '8C', '8D'] as const) {
    test(`${hero} can traverse the primary geometry of ${id} without flight or teleport`, (t) => {
      const chapter = Number(id[0]);
      const { engine, state } = fixture(hero, () => {}, chapter);
      if (chapter === 1 && id !== '1A') {
        through(engine, state, 'telhados');
        if (id === '1C' || id === '1D') through(engine, state, 'esgotos');
        if (id === '1D') through(engine, state, 'avenida');
      }
      if (chapter === 2 && id !== '2A') {
        through(engine, state, 'manutencao');
        if (id === '2C') through(engine, state, 'teto');
      }
      if (chapter === 3 && id !== '3A') {
        through(engine, state, 'vigas');
        if (id === '3C') through(engine, state, 'heliponto');
      }
      if (chapter === 4 && id !== '4A') through(engine, state, 'esteiras');
      if (id === '4C') through(engine, state, 'nucleo');
      if (chapter === 5 && id !== '5A') through(engine, state, 'garagens');
      if (id === '5C') through(engine, state, 'suite');
      if (chapter === 6 && id !== '6A') through(engine, state, 'jardins');
      if (id === '6C') through(engine, state, 'acervo');
      if (chapter === 7 && id !== '7A') through(engine, state, 'blocos');
      if (id === '7C') through(engine, state, 'comando');
      if (chapter === 8 && id !== '8A') through(engine, state, 'nucleo');
      if (id === '8C' || id === '8D') through(engine, state, 'elevador');
      if (id === '8D') through(engine, state, 'estratosfera');
      t.after(() => engine.stop());
      // Geometry-only acceptance: combat/arena outcomes are tested separately.
      state.stage = { ...state.stage, hasLowCeilingHazard: false };
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
      const goal = state.stage.boss ? state.stage.goalX - 40 : state.stage.exits.find((exit: any) => exit.x > 1000).x;
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


test('monorail backtracking and reload preserve service rooms without activating the boss early', () => {
  const { engine, state } = fixture('maya', () => {}, 2);
  assert.equal(state.boss.active, false);
  Object.assign(state.props[0], { hp: 0, broken: true });
  through(engine, state, 'manutencao');
  assert.equal(state.stage.substageId, '2B'); assert.equal(state.boss.active, false);
  const save = engine.captureCampaignSave()!;
  engine.restoreCampaignSave(save); engine.setPaused(false);
  through(engine, state, 'vagoes'); assert.equal(state.props[0].broken, true);
  through(engine, state, 'manutencao'); through(engine, state, 'teto');
  assert.equal(state.stage.substageId, '2C');
  assert.equal(state.boss.active, true); assert.equal(state.boss.triggered, false);
  assert.equal(state.characterId, 'maya'); engine.stop();
});

test('Valkyrie waits for the escort arena and is the only monorail chapter completion', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let completions = 0;
  const { engine, state } = fixture('ren', () => { completions++; }, 2);
  through(engine, state, 'manutencao'); through(engine, state, 'teto');
  Object.assign(state.player, { x: 2160, y: 594, invulnTimer: 100000 });
  state.ambushArenas[0].active = true;
  state.update(); assert.equal(state.boss.triggered, false);
  assert.equal(completions, 0);
  state.ambushArenas[0].active = false; state.ambushArenas[0].cleared = true;
  state.update(); assert.equal(state.boss.triggered, true);
  state.damageBoss(10000); t.mock.timers.tick(1200);
  assert.equal(completions, 1); engine.stop();
});

test('a rooftop low gantry damages a standing hero while a timed slide avoids it', () => {
  for (const slide of [false, true]) {
    const { engine, state } = fixture('leon', () => {}, 2);
    through(engine, state, 'manutencao'); through(engine, state, 'teto');
    state.enemies = []; state.spawns.update = () => [];
    Object.assign(state.player, { x: 300, y: 594, grounded: true, invulnTimer: 0 });
    state.lowCeilingActive = true; state.lowCeilingX = 316; state.lowCeilingTimer = 100;
    if (slide) { engine.setKey('down', true); engine.triggerDashOrSlide(); }
    state.update();
    assert.equal(state.player.hp, slide ? 150 : 128);
    engine.stop();
  }
});

for (const hero of ['ren', 'maya', 'leon'] as const) {
  for (const id of ['2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C', '5A', '5B', '5C', '6A', '6B', '6C', '7A', '7B', '7C', '8A', '8B', '8C', '8D'] as const) {
    test(`${hero} can backtrack through ${id} without flight, hazards or rescue`, () => {
      const chapter = Number(id[0]);
      const { engine, state } = fixture(hero, () => {}, chapter);
      if (chapter === 2 && id !== '2A') through(engine, state, 'manutencao');
      if (id === '2C') through(engine, state, 'teto');
      if (chapter === 3 && id !== '3A') through(engine, state, 'vigas');
      if (id === '3C') through(engine, state, 'heliponto');
      if (chapter === 4 && id !== '4A') through(engine, state, 'esteiras');
      if (id === '4C') through(engine, state, 'nucleo');
      if (chapter === 5 && id !== '5A') through(engine, state, 'garagens');
      if (id === '5C') through(engine, state, 'suite');
      if (chapter === 6 && id !== '6A') through(engine, state, 'jardins');
      if (id === '6C') through(engine, state, 'acervo');
      if (chapter === 7 && id !== '7A') through(engine, state, 'blocos');
      if (id === '7C') through(engine, state, 'comando');
      if (chapter === 8 && id !== '8A') through(engine, state, 'nucleo');
      if (id === '8C' || id === '8D') through(engine, state, 'elevador');
      if (id === '8D') through(engine, state, 'estratosfera');
      state.checkpointId = state.stage.checkpoints.at(-1).id;
      engine.restoreCampaignSave(engine.captureCampaignSave()!);
      engine.setPaused(false);
      state.stage = { ...state.stage, hasLowCeilingHazard: false };
      state.enemies = []; state.spawns.update = () => []; state.boss.active = false;
      state.ambushArenas = []; state.updateEnemies = () => {};
      let rescued = false, hurt = false;
      const recover = state.recoverPlayer.bind(state);
      state.recoverPlayer = () => { rescued = true; recover(); };
      const damage = state.damagePlayer.bind(state);
      state.damagePlayer = (...args: unknown[]) => { hurt = true; damage(...args); };
      engine.setKey('left', true);
      let airborneTicks = 0;
      const goal = id.endsWith('A') ? 140 : 40;
      for (let tick = 0; tick < 2400 && state.player.x > goal + 24; tick++) {
        const p = state.player;
        if (p.grounded) {
          airborneTicks = 0;
          const wall = state.platforms.some((platform: any) => !platform.broken && platform.type !== 'acid' &&
            platform.x + platform.w <= p.x + 1 && platform.x + platform.w > p.x - 55 &&
            platform.y < p.y + p.h && platform.y + platform.h > p.y);
          const floor = state.platforms.some((platform: any) => !platform.broken && platform.type !== 'acid' &&
            p.x - 55 >= platform.x && p.x - 55 <= platform.x + platform.w && Math.abs(platform.y - p.y - p.h) < 10);
          if (wall || !floor) engine.queueAction('jump');
        } else {
          airborneTicks++;
          if (airborneTicks === 13 && p.doubleJump) engine.queueAction('jump');
        }
        engine.setKey('jumpHeld', false); state.update();
      }
      assert.equal(rescued, false); assert.equal(hurt, false);
      assert.ok(state.player.x <= goal + 24, `stopped at ${state.player.x}, expected ${goal}`);
      engine.stop();
    });
  }
}


test('Goliath belongs only to the helipad and waits for its demolition escort', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let completions = 0;
  const { engine, state } = fixture('leon', () => { completions++; }, 3);
  state.damageBoss(10000); assert.equal(completions, 0); assert.equal(state.boss.active, false);
  through(engine, state, 'vigas'); assert.equal(state.boss.active, false);
  through(engine, state, 'heliponto'); assert.equal(state.boss.active, true);
  Object.assign(state.player, { x: 1860, y: 384, invulnTimer: 100000 });
  state.ambushArenas[0].active = true;
  state.update(); assert.equal(state.boss.triggered, false);
  state.ambushArenas[0].active = false; state.ambushArenas[0].cleared = true;
  state.update(); assert.equal(state.boss.triggered, true);
  state.damageBoss(10000); t.mock.timers.tick(1200);
  assert.equal(completions, 1); engine.stop();
});

test('the construction ascent activates its intermediate checkpoint, survives reload and scrolls vertically', () => {
  const { engine, state } = fixture('ren', () => {}, 3); through(engine, state, 'vigas');
  engine.resize(1280, 720); const bottomCamera = state.camera.y;
  Object.assign(state.player, { x: 1070, y: 584, vx: 0, vy: 0, grounded: true });
  state.update(); assert.equal(state.checkpointId, 'nucleo');
  const carry = engine.getPlayerCarry();
  engine.restoreCampaignSave(engine.captureCampaignSave()!);
  assert.equal(state.checkpointId, 'nucleo'); assert.ok(Math.abs(state.player.x - 1070) < 1);
  assert.deepEqual(engine.getPlayerCarry(), carry);
  Object.assign(state.props[0], { hp: 0, broken: true });
  engine.setPaused(false); through(engine, state, 'heliponto'); through(engine, state, 'vigas');
  assert.equal(state.props[0].broken, true); assert.equal(state.stage.substageId, '3B');
  engine.resize(1280, 720);
  assert.ok(state.camera.y < bottomCamera - 900);
  assert.ok(state.camera.y >= state.stage.boundsTop); engine.stop();
});

test('construction enemies start outside authored solids/hazards and the chapter has three distinct maps', () => {
  const areas = SUBSTAGES.filter((area) => area.id === 3);
  assert.deepEqual(CAMPAIGN[2].substages, ['3A', '3B', '3C']);
  assert.equal(areas.length, 3);
  assert.equal(new Set(areas.map((area) => JSON.stringify(area.platforms))).size, 3);
  for (const area of areas) for (const enemy of area.enemies) {
    assert.equal(area.platforms.some((platform) => enemy.x < platform.x + platform.w && enemy.x + enemy.w > platform.x &&
      enemy.y < platform.y + platform.h && enemy.y + enemy.h > platform.y), false, `${area.substageId}: ${enemy.type} starts inside terrain`);
  }
});

for (const chapter of [4, 5]) {
  test(`chapter ${chapter} reserves its boss for the final sector and preserves exploration across reload`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let completions = 0;
    const { engine, state } = fixture('maya', () => { completions++; }, chapter);
    assert.equal(state.boss.active, false);
    Object.assign(state.props[0], { hp: 0, broken: true });
    const forward = chapter === 4 ? ['esteiras', 'nucleo'] : ['garagens', 'suite'];
    through(engine, state, forward[0]);
    assert.equal(state.boss.active, false);
    engine.restoreCampaignSave(engine.captureCampaignSave()!); engine.setPaused(false);
    assert.equal(state.areaCache.get(`${chapter}A`).props[0].broken, true);
    through(engine, state, forward[1]);
    assert.equal(state.boss.active, true);
    assert.equal(completions, 0);
    state.ambushArenas[0].active = true;
    Object.assign(state.player, { x: state.stage.boss.x - 450, y: state.stage.spawnY, invulnTimer: 100000 });
    state.update(); assert.equal(state.boss.triggered, false);
    state.ambushArenas[0].active = false; state.ambushArenas[0].cleared = true;
    state.update(); assert.equal(state.boss.triggered, true);
    state.damageBoss(10000); t.mock.timers.tick(1200);
    assert.equal(completions, 1); engine.stop();
  });
}

test('new factory/financial maps have valid spawns and opposite conveyor directions', () => {
  const areas = SUBSTAGES.filter((area) => area.id === 4 || area.id === 5);
  assert.equal(areas.length, 6);
  assert.equal(new Set(areas.map((area) => JSON.stringify(area.platforms))).size, 6);
  for (const area of areas) for (const enemy of area.enemies) {
    assert.equal(area.platforms.some((platform) => enemy.x < platform.x + platform.w && enemy.x + enemy.w > platform.x &&
      enemy.y < platform.y + platform.h && enemy.y + enemy.h > platform.y), false, `${area.substageId}: ${enemy.type}`);
  }
  const speeds = getSubstage('4B').platforms.filter((platform) => platform.type === 'conveyor').map((platform) => platform.conveyorSpeed!);
  assert.ok(speeds.some((speed) => speed < 0)); assert.ok(speeds.some((speed) => speed > 0));
  assert.equal(getSubstage('5B').platforms.filter((platform) => platform.type === 'laser_gate').length, 2);
});

test('an arena follows its authored squad identities even if a surviving actor leaves its bounds', () => {
  const { engine, state } = fixture();
  through(engine, state, 'telhados'); through(engine, state, 'esgotos'); through(engine, state, 'avenida');
  const arena = state.ambushArenas[0]; arena.active = true;
  const members = state.enemies.filter((enemy: any) => enemy.x >= arena.minX - 60 && enemy.x <= arena.maxX + 60);
  members.slice(1).forEach((enemy: any) => { enemy.hp = 0; });
  members[0].x = 100;
  assert.equal(state.checkAmbushArenas(), arena); assert.equal(arena.cleared, false);
  members[0].hp = 0;
  assert.equal(state.checkAmbushArenas(), null); assert.equal(arena.cleared, true); engine.stop();
});

for (const chapter of [6, 7, 8]) {
  test(`chapter ${chapter} traverses its complete sector chain before a single final completion`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let completions = 0; const { engine, state } = fixture('maya', () => { completions++; }, chapter);
    const paths = chapter === 6 ? ['jardins', 'acervo'] : chapter === 7 ? ['blocos', 'comando'] : ['nucleo', 'elevador', 'estratosfera'];
    for (const id of paths) { assert.equal(state.boss.active, false); through(engine, state, id); }
    assert.equal(state.boss.active, true); assert.equal(completions, 0);
    state.ambushArenas[0].active = true;
    Object.assign(state.player, { x: state.stage.boss.x - 450, y: state.stage.spawnY, invulnTimer: 100000 });
    state.update(); assert.equal(state.boss.triggered, false);
    state.ambushArenas[0].active = false; state.ambushArenas[0].cleared = true;
    state.update(); assert.equal(state.boss.triggered, true);
    state.damageBoss(10000); t.mock.timers.tick(1200);
    assert.equal(completions, 1);
    const save = engine.captureCampaignSave()!;
    assert.equal(engine.restoreCampaignSave(save), 'chapter-clear');
    assert.equal(state.boss.active, false); assert.equal(state.boss.hp, 0);
    if (chapter === 8) assert.equal(save.current, '8D');
    engine.stop();
  });
}

test('all 26 maps have distinct geometry, valid authored spawns and exactly one final encounter per chapter', () => {
  assert.deepEqual(CAMPAIGN.map((chapter) => chapter.substages.length), [4, 3, 3, 3, 3, 3, 3, 4]);
  assert.equal(new Set(SUBSTAGES.map((area) => JSON.stringify(area.platforms))).size, 26);
  for (const area of SUBSTAGES) {
    for (const actor of [...area.enemies, ...(area.boss ? [area.boss] : [])]) {
      assert.equal(area.platforms.some((platform) => actor.x < platform.x + platform.w && actor.x + actor.w > platform.x &&
        actor.y < platform.y + platform.h && actor.y + actor.h > platform.y), false, `${area.substageId}: actor starts in terrain`);
    }
  }
  for (const chapter of CAMPAIGN) {
    assert.equal(chapter.substages.filter((id) => getSubstage(id).boss).length, 1);
    assert.ok(getSubstage(chapter.substages.at(-1)!).boss);
  }
});

test('the orbital elevator scrolls through its ascent and retains checkpoint/gravity after reload', () => {
  const { engine, state } = fixture('leon', () => {}, 8);
  through(engine, state, 'nucleo'); through(engine, state, 'elevador');
  engine.resize(1280, 720); const bottom = state.camera.y;
  Object.assign(state.player, { x: 1080, y: 584, grounded: true, vx: 0, vy: 0 });
  state.update(); assert.equal(state.checkpointId, 'eixo');
  engine.restoreCampaignSave(engine.captureCampaignSave()!);
  assert.equal(state.stage.gravityScale, 0.72); assert.equal(state.checkpointId, 'eixo');
  assert.ok(Math.abs(state.player.x - 1080) < 1);
  engine.setPaused(false); through(engine, state, 'estratosfera'); through(engine, state, 'elevador');
  engine.resize(1280, 720); assert.ok(state.camera.y < bottom - 800);
  engine.stop();
});

test('industrial authoring rejects detached mounts and invalid engineer/turret associations', () => {
  const detached = structuredClone(SUBSTAGES);
  const mount = detached.find((a) => a.substageId === '4A')!.enemies.find((e) => e.mount)!;
  mount.x += 10;
  assert.ok(validateCampaign(detached).some((e) => e.includes('torreta sem suporte')));
  const invalid = structuredClone(SUBSTAGES);
  invalid.find((a) => a.substageId === '4B')!.enemies.at(-1)!.deployedBy = 1;
  assert.ok(validateCampaign(invalid).some((e) => e.includes('instalação inválida')));
});
