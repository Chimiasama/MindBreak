import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sound } from '../src/game/audio';
import { GameEngine } from '../src/game/engine';
import { CAMPAIGN, getSubstage } from '../src/game/campaign';
import { CampaignSave, campaignContentId, decodeCampaignSave } from '../src/game/campaign/save';
import { CAMPAIGN_SAVE_KEY, CAMPAIGN_BACKUP_KEY, readCampaignSave, writeCampaignSave, discardCampaignSave, SaveStorage } from '../src/game/campaign/storage';
import { overlaps } from '../src/game/collision';

Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
afterEach(() => sound.stopMusic());

function fixture(chapter = 1, hero: 'ren' | 'maya' | 'leon' = 'ren') {
  const canvas = { width: 915, height: 412, getContext: () => ({ imageSmoothingEnabled: false }) } as unknown as HTMLCanvasElement;
  const engine = new GameEngine(canvas, { onHudUpdate() {}, onStageClear() {}, onContinueCountdown() {}, onGameOver() {} });
  engine.startCampaign(chapter, hero); engine.setPaused(false);
  return { engine, state: engine as any };
}
function through(engine: GameEngine, state: any, id: string) {
  const door = state.stage.exits.find((exit: any) => exit.id === id);
  Object.assign(state.player, { x: door.x, y: door.y + door.h - 56 });
  assert.equal(engine.travel(id), true);
}
function checked(save: CampaignSave) {
  const result = decodeCampaignSave(JSON.stringify(save));
  assert.equal(result.status, 'ready', 'a real engine snapshot must be accepted');
  if (result.status !== 'ready') throw new Error('invalid snapshot');
  return result.save;
}
class MemoryStorage implements SaveStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test('a fresh process restores hero/resources at a safe checkpoint, paused with no held input', () => {
  const { engine, state } = fixture(1, 'leon');
  state.checkpointId = 'manutencao';
  Object.assign(state.player, { hp: 79, psyEnergy: 42, lives: 5, score: 12345,
    wavAmmo: 9, atkTimer: 321, jmpTimer: 222, gstTimer: 111, x: 1900, y: 200 });
  engine.setKey('left', true);
  const saved = checked(engine.captureCampaignSave(true)!);
  const fresh = fixture();
  assert.equal(fresh.engine.restoreCampaignSave(saved), 'playing');
  assert.deepEqual(fresh.engine.getPlayerCarry(), engine.getPlayerCarry());
  assert.equal(fresh.state.paused, true);
  assert.equal(fresh.state.keys.left, false);
  assert.equal(fresh.state.player.vx, 0); assert.equal(fresh.state.player.vy, 0);
  assert.ok(Math.abs(fresh.state.player.x - 1100) < 1);
  assert.ok(fresh.state.player.invulnTimer >= 60);
  assert.ok(!fresh.state.platforms.some((p: any) => !p.broken && p.type !== 'acid' && overlaps(p, fresh.state.player)));
  assert.equal(saved.preferences.muted, true);
  engine.stop(); fresh.engine.stop();
});

test('save preserves off-area props, pickups, enemy HP, cleared arenas and diminishing rewards', () => {
  const { engine, state } = fixture();
  Object.assign(state.props[0], { hp: 0, broken: true });
  state.enemies[1].hp = 7;
  const victim = state.enemies[0]; victim.hp = 0;
  assert.equal(state.spawns.claimDefeatReward(victim), 1000);
  state.pickups.push({ x: 300, y: 600, w: 22, h: 22, kind: 'wav', amount: 12, vy: 0 });
  through(engine, state, 'telhados'); through(engine, state, 'esgotos'); through(engine, state, 'avenida');
  state.ambushArenas[0].cleared = true;
  const saved = checked(engine.captureCampaignSave()!);
  const fresh = fixture(); fresh.engine.restoreCampaignSave(saved);
  assert.equal(fresh.state.ambushArenas[0].cleared, true);
  fresh.engine.setPaused(false);
  through(fresh.engine, fresh.state, 'esgotos'); through(fresh.engine, fresh.state, 'telhados'); through(fresh.engine, fresh.state, 'laboratorio');
  assert.equal(fresh.state.props[0].broken, true);
  assert.equal(fresh.state.pickups[0].amount, 12);
  assert.equal(fresh.state.enemies.find((e: any) => e.spawnId === '1A:2').hp, 7);
  assert.equal(fresh.state.enemies.some((e: any) => e.spawnId === victim.spawnId), false);
  // Only simulated absence counts. Resume itself neither respawns nor resets reward history.
  through(fresh.engine, fresh.state, 'telhados'); fresh.state.worldTick += 1000;
  through(fresh.engine, fresh.state, 'laboratorio');
  const replacement = fresh.state.enemies.find((e: any) => e.spawnId === victim.spawnId);
  assert.ok(replacement); assert.notEqual(replacement.id, victim.id);
  replacement.hp = 0;
  assert.equal(fresh.state.spawns.claimDefeatReward(replacement), 500);
  assert.equal(fresh.state.spawns.claimDefeatReward(replacement), 0);
  engine.stop(); fresh.engine.stop();
});

test('elapsed wall clock never replenishes dead enemies or advances platform motion', () => {
  const { engine, state } = fixture();
  state.enemies[0].hp = 0; state.spawns.claimDefeatReward(state.enemies[0]);
  const saved = checked(engine.captureCampaignSave()!);
  saved.savedAt = 0;
  const fresh = fixture(); fresh.engine.restoreCampaignSave(saved);
  assert.equal(fresh.state.enemies.length, 3);
  assert.equal(fresh.state.tickCount, state.tickCount);
  assert.equal(fresh.state.worldTick, state.worldTick);
  assert.deepEqual(fresh.state.spawns.snapshot(), state.spawns.snapshot());
  engine.stop(); fresh.engine.stop();
});

test('moving/crumbling platforms restore without a one-frame transport jump', () => {
  const { engine, state } = fixture(); through(engine, state, 'telhados');
  state.tickCount = 111; state.worldTick = 111;
  const moving = state.platforms.find((p: any) => p.type === 'moving');
  if (moving.moveAxis === 'x') moving.x = moving.originX + Math.sin(111 * moving.moveSpeed) * moving.moveRange;
  else moving.y = moving.originY + Math.sin(111 * moving.moveSpeed) * moving.moveRange;

  const save = checked(engine.captureCampaignSave()!);
  const fresh = fixture(); fresh.engine.restoreCampaignSave(save);
  assert.deepEqual(fresh.state.platforms, state.platforms);
  assert.equal(fresh.state.standingPlatform, null);
  engine.stop(); fresh.engine.stop();
});

test('broken crumble platforms and remaining recovery timers persist', () => {
  const { engine, state } = fixture(3);
  const crumble = state.platforms.find((p: any) => p.type === 'crumble');
  assert.ok(crumble);
  Object.assign(crumble, { crumbleTimer: 60, broken: true });
  const fresh = fixture(); fresh.engine.restoreCampaignSave(checked(engine.captureCampaignSave()!));
  const restored = fresh.state.platforms.find((p: any) => p.type === 'crumble');
  assert.equal(restored.broken, true); assert.equal(restored.crumbleTimer, 60);
  engine.stop(); fresh.engine.stop();
});

test('unfinished boss encounter restarts at full HP; completed chapter stays completed', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { engine, state } = fixture();
  through(engine, state, 'telhados'); through(engine, state, 'esgotos'); through(engine, state, 'avenida');
  state.ambushArenas[0].cleared = true;
  state.boss.triggered = true; state.boss.hp = 10; state.boss.phase = 2;
  const fresh = fixture(); fresh.engine.restoreCampaignSave(checked(engine.captureCampaignSave()!));
  assert.equal(fresh.state.boss.hp, fresh.state.boss.maxHp);
  assert.equal(fresh.state.boss.triggered, false); assert.equal(fresh.state.boss.phase, 1);
  state.damageBoss(10000);
  const complete = checked(engine.captureCampaignSave()!);
  assert.equal(fresh.engine.restoreCampaignSave(complete), 'chapter-clear');
  assert.equal(fresh.state.stageClearTriggered, true); assert.equal(fresh.state.boss.active, false);
  assert.equal(fresh.state.boss.hp, 0);
  assert.equal(fresh.engine.getPlayerCarry().score, complete.player.score);
  engine.stop(); fresh.engine.stop();
});

test('continue and game over are restored explicitly instead of granting free lives', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { engine, state } = fixture();
  state.player.lives = 1; state.player.invulnTimer = 0;
  state.damagePlayer(10000, 0, true);
  const save = checked(engine.captureCampaignSave()!);
  assert.equal(save.mode, 'continue');
  const fresh = fixture(); assert.equal(fresh.engine.restoreCampaignSave(save), 'continue');
  assert.equal(fresh.state.player.lives, 0); assert.equal(fresh.state.player.hp, 0);
  fresh.engine.continueWithCharacter('maya');
  assert.equal(fresh.state.characterId, 'maya'); assert.equal(fresh.state.player.lives, 3);
  engine.triggerFinalGameOver();
  assert.equal(fresh.engine.restoreCampaignSave(checked(engine.captureCampaignSave()!)), 'game-over');
  engine.stop(); fresh.engine.stop();
});

test('all eight chapters and three heroes support save/restore and legacy maps do not overwrite saves', () => {
  for (const chapter of CAMPAIGN) for (const hero of ['ren', 'maya', 'leon'] as const) {
    const { engine } = fixture(chapter.id, hero);
    const save = checked(engine.captureCampaignSave()!);
    const fresh = fixture(); fresh.engine.restoreCampaignSave(save);
    assert.equal(fresh.engine.getCampaignProgress()!.chapterId, chapter.id);
    assert.equal(fresh.engine.getPlayerCarry().characterId, hero);
    engine.loadStage(1, hero); assert.equal(engine.captureCampaignSave(), null);
    engine.stop(); fresh.engine.stop();
  }
});

test('malformed values, duplicate entities, missing state and unsupported versions are rejected atomically', () => {
  const { engine, state } = fixture();
  const original = checked(engine.captureCampaignSave()!);
  const invalidChanges: ((save: any) => void)[] = [
    (s) => { s.player.hp = -1; }, (s) => { s.player.hp = '100'; },
    (s) => { s.player.psyEnergy = null; }, (s) => { s.player.lives = 1.5; },
    (s) => { s.player.nextOneUpScore = 0; }, (s) => { s.player.characterId = '__proto__'; },
    (s) => { s.areas.push(s.areas[0]); }, (s) => { s.areas = []; },
    (s) => { s.areas[0].enemies.push(s.areas[0].enemies[0]); },
    (s) => { s.areas[0].enemies = []; }, (s) => { s.areas[0].spawns.records[0].activeId = 999; },
    (s) => { s.areas[0].spawns.records[0].defeats = 999; },
    (s) => { s.areas[0].platforms[0].x = Infinity; },
    (s) => { s.areas[0].props[0].broken = true; },
  ];
  for (const mutate of invalidChanges) {
    const save = structuredClone(original); mutate(save);
    assert.equal(decodeCampaignSave(JSON.stringify(save)).status, 'corrupt');
    assert.throws(() => engine.restoreCampaignSave(save));
    assert.equal(state.stage.substageId, '1A');
    assert.deepEqual(engine.getPlayerCarry(), original.player);
  }
  assert.equal(decodeCampaignSave('{not json').status, 'corrupt');
  assert.equal(decodeCampaignSave('x'.repeat(600000)).status, 'corrupt');
  for (const mutate of [(s: any) => s.version++, (s: any) => s.content = 'older-layout', (s: any) => s.areas[0].checkpoint = 'removed']) {
    const save = structuredClone(original); mutate(save);
    assert.equal(decodeCampaignSave(JSON.stringify(save)).status, 'incompatible');
  }
  engine.stop();
});

test('parsed entity fields cannot replace authored geometry or introduce prototype properties', () => {
  const { engine } = fixture();
  const save: any = engine.captureCampaignSave()!;
  Object.assign(save.areas[0].enemies[0], { type: 'fake', w: 50000, maxHp: 999999, constructor: 'bad' });
  const result = checked(save);
  const base = getSubstage('1A').enemies[0];
  assert.equal(result.areas[0].enemies[0].type, base.type);
  assert.equal(result.areas[0].enemies[0].w, base.w);
  assert.equal(result.areas[0].enemies[0].maxHp, base.maxHp);
  assert.equal(Object.hasOwn(result.areas[0].enemies[0], 'constructor'), false);
  engine.stop();
});

test('storage survives JSON roundtrip and recovers the previous valid copy without erasing corrupt data', () => {
  const storage = new MemoryStorage(), { engine, state } = fixture();
  assert.equal(readCampaignSave(storage).status, 'missing');
  assert.equal(writeCampaignSave(engine.captureCampaignSave()!, storage), 'saved');
  state.player.hp = 50;
  assert.equal(writeCampaignSave(engine.captureCampaignSave()!, storage), 'saved');
  const read = readCampaignSave(storage);
  assert.equal(read.status, 'ready'); if ('save' in read) assert.equal(read.save.player.hp, 50);
  storage.setItem(CAMPAIGN_SAVE_KEY, '{broken');
  const recovered = readCampaignSave(storage);
  assert.equal(recovered.status, 'recovered');
  if ('save' in recovered) assert.equal(recovered.save.player.hp, 100);
  assert.equal(storage.getItem(CAMPAIGN_SAVE_KEY), '{broken');
  assert.equal(discardCampaignSave(storage), true);
  assert.equal(storage.getItem(CAMPAIGN_BACKUP_KEY), null);
  assert.equal(readCampaignSave(storage).status, 'missing');
  engine.stop();
});

test('denied storage/quota and invalid writes do not crash or destroy the last good save', () => {
  const { engine } = fixture(), storage = new MemoryStorage();
  const save = engine.captureCampaignSave()!;
  assert.equal(writeCampaignSave(save, storage), 'saved');
  const before = storage.getItem(CAMPAIGN_SAVE_KEY);
  const full = { getItem: storage.getItem.bind(storage), removeItem: storage.removeItem.bind(storage),
    setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(writeCampaignSave(save, full), 'unavailable');
  assert.equal(storage.getItem(CAMPAIGN_SAVE_KEY), before);
  const invalid = structuredClone(save); invalid.player.hp = -1;
  assert.equal(writeCampaignSave(invalid, storage), 'invalid');
  assert.equal(storage.getItem(CAMPAIGN_SAVE_KEY), before);
  const denied = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('SecurityError'); } };
  assert.equal(readCampaignSave(denied).status, 'unavailable');
  assert.equal(discardCampaignSave(denied), false);
  engine.stop();
});

test('incompatible saves remain available for explicit discard instead of being silently erased', () => {
  const { engine } = fixture(), storage = new MemoryStorage();
  const save = engine.captureCampaignSave()!; save.content = 'previous-campaign';
  storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(save));
  assert.equal(readCampaignSave(storage).status, 'incompatible');
  assert.equal(storage.getItem(CAMPAIGN_SAVE_KEY), JSON.stringify(save));
  assert.match(campaignContentId(1), /^campaign-1-/);
  engine.stop();
});

test('snapshots remain valid during real simulation across every chapter, including damage and hazards', () => {
  for (const chapter of CAMPAIGN) {
    const { engine, state } = fixture(chapter.id);
    for (let tick = 0; tick < 360; tick++) {
      if (!state.paused) state.update();
      if (tick % 30 === 0) checked(engine.captureCampaignSave()!);
    }
    checked(engine.captureCampaignSave()!);
    engine.stop();
  }
});

test('restoring a save cancels delayed completion callbacks from the previous run', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let completions = 0;
  const { engine, state } = fixture(2);
  const save = checked(engine.captureCampaignSave()!);
  state.callbacks.onStageClear = () => { completions++; };
  state.damageBoss(10000);
  engine.restoreCampaignSave(save);
  t.mock.timers.tick(1500);
  assert.equal(completions, 0);
  assert.equal(state.stageClearTriggered, false);
  assert.equal(state.bullets.length, 0); assert.equal(state.thrownEnemies.length, 0);
  engine.stop();
});
