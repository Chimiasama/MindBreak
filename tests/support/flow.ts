import type { GameEngine } from '../../src/game/engine';
/** Flow/save fixtures isolate travel from traversal/combat. Spatial acceptance lives in exploration-routes.test.ts. */
export function prepareForwardTravel(engine: GameEngine, state: any) {
  const { x, y } = state.player;
  for (const node of state.stage.exploration?.nodes ?? []) {
    if (node.guardIndex !== undefined) {
      const origin = `${state.stage.substageId}:${node.guardIndex + 1}`;
      state.enemies = state.enemies.filter((enemy: any) => enemy.spawnId !== origin);
    }
    Object.assign(state.player, { x: node.x, y: node.y });
    engine.inspectRouteNode(node.id);
  }
  Object.assign(state.player, { x, y });
}
