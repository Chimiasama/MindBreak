export const SCORES = {
  district: { title: 'Circuitos de Fuga', bpm: 120, bars: 16, key: 'Mi menor', steps: 256, chapter: 1, kind: 'stage' },
  cipher: { title: 'Protocolo Cipher', bpm: 136, bars: 8, key: 'Mi frígio / dominante de Si', steps: 128, chapter: 1, kind: 'boss' },
  monorail: { title: 'Trilhos em Fuga', bpm: 172, bars: 16, key: 'Ré menor', steps: 256, chapter: 2, kind: 'stage' },
  valkyrie: { title: 'Interceptação Valkyrie', bpm: 184, bars: 8, key: 'Ré frígio', steps: 128, chapter: 2, kind: 'boss' },
  construction: { title: 'Concreto e Tormenta', bpm: 112, bars: 16, key: 'Dó sustenido menor', steps: 256, chapter: 3, kind: 'stage' },
  goliath: { title: 'Peso de Goliath', bpm: 124, bars: 8, key: 'Dó sustenido / tensão cromática', steps: 128, chapter: 3, kind: 'boss' },
  factory: { title: 'Pulso de Refrigeração', bpm: 132, bars: 16, key: 'Lá menor', steps: 256, chapter: 4, kind: 'stage' },
  arisawa: { title: 'Reator Arisawa', bpm: 144, bars: 8, key: 'Lá frígio', steps: 128, chapter: 4, kind: 'boss' },
  financial: { title: 'Juros de Neon', bpm: 116, bars: 16, key: 'Sol menor / swing', steps: 256, chapter: 5, kind: 'stage' },
  twins: { title: 'Duas Faces do Cofre', bpm: 132, bars: 8, key: 'Sol menor / dueto', steps: 128, chapter: 5, kind: 'boss' },
  museum: { title: 'Memória de Vidro', bpm: 96, bars: 16, key: 'Mi pentatônico menor', steps: 256, chapter: 6, kind: 'stage' },
  kusanagi: { title: 'Lâmina do Acervo', bpm: 128, bars: 8, key: 'Mi pentatônico menor', steps: 128, chapter: 6, kind: 'boss' },
  blacksite: { title: 'Frequência Clandestina', bpm: 112, bars: 16, key: 'Fá sustenido menor', steps: 256, chapter: 7, kind: 'stage' },
  vane: { title: 'Protocolo Vane', bpm: 144, bars: 8, key: 'Fá sustenido / tensão cromática', steps: 128, chapter: 7, kind: 'boss' },
  tower: { title: 'Ascensão Zero', bpm: 164, bars: 16, key: 'Lá menor', steps: 256, chapter: 8, kind: 'stage' },
  oswald: { title: 'Órbita de Oswald', bpm: 176, bars: 8, key: 'Lá menor harmônico', steps: 128, chapter: 8, kind: 'boss' },
  menu: { title: 'Rebeldes em Espera', bpm: 100, bars: 8, key: 'Mi menor', steps: 128, chapter: 0, kind: 'flow' },
  game_over: { title: 'Último Sinal', bpm: 76, bars: 4, key: 'Mi menor', steps: 64, chapter: 0, kind: 'flow' },
  victory: { title: 'Amanhecer dos Rebeldes', bpm: 120, bars: 8, key: 'Mi maior', steps: 128, chapter: 0, kind: 'flow' },
} as const;
export type ScoreId = keyof typeof SCORES;
export type FlowScore = 'menu' | 'game_over' | 'victory';
export const CHAPTER_SCORES = [
  ['district','cipher'], ['monorail','valkyrie'], ['construction','goliath'], ['factory','arisawa'],
  ['financial','twins'], ['museum','kusanagi'], ['blacksite','vane'], ['tower','oswald'],
] as const;
interface Arrangement {
  roots: number[]; phrases: number[][]; bass: OscillatorType; lead: OscillatorType;
  bassBeats: number[]; leadBeats: number[]; kick: number[]; snare: number[];
  hat: number; swing?: boolean; duet?: boolean; trap?: boolean; padThird?: number;
}
const eighths=[0,2,4,6,8,10,12,14];
/** Separate written hooks, harmonic progressions and rhythm grids per location/boss. */
export const ARRANGEMENTS: Record<Exclude<ScoreId,'district'|'cipher'>, Arrangement> = {
 monorail: {roots:[38,34,41,36,38,41,43,33],phrases:[[74,77,81,84,81,79,77,74],[70,74,77,81,79,77,74,72],[77,81,84,88,86,84,81,77],[72,76,79,82,81,79,76,73]],bass:'triangle',lead:'square',bassBeats:[0,2,3,6,8,10,11,14],leadBeats:eighths,kick:[0,6,10],snare:[4,12],hat:1},
 valkyrie: {roots:[38,39,34,33,38,41,39,33],phrases:[[86,81,77,75,74,77,81,84],[87,84,81,79,77,75,74,73],[82,77,74,70,74,77,81,79],[81,78,75,73,75,78,81,85]],bass:'sawtooth',lead:'triangle',bassBeats:[0,3,6,8,11,14],leadBeats:eighths,kick:[0,3,6,10,14],snare:[4,12],hat:1},
 construction: {roots:[37,37,33,35,37,40,33,32],phrases:[[73,76,80,78,76,73,71,68],[73,73,76,80,83,80,78,76],[69,73,76,80,78,76,73,71],[71,75,78,80,78,75,72,68]],bass:'square',lead:'sawtooth',bassBeats:eighths,leadBeats:[0,3,6,8,11,14],kick:[0,3,8,11],snare:[4,12],hat:2},
 goliath: {roots:[37,36,33,32,37,40,36,32],phrases:[[73,72,68,69,73,76,75,72],[72,68,67,68,72,75,76,75],[69,73,76,80,76,73,72,68],[68,72,75,80,78,75,72,68]],bass:'sawtooth',lead:'square',bassBeats:[0,2,4,6,8,10,12,14],leadBeats:[0,4,6,8,12,14],kick:[0,2,6,8,10,14],snare:[4,12],hat:2},
 factory: {roots:[33,33,36,31,33,38,36,28],phrases:[[69,72,76,79,76,74,72,69],[69,76,81,79,76,72,71,69],[72,76,79,83,81,79,76,72],[67,71,74,79,76,74,71,68]],bass:'sawtooth',lead:'triangle',bassBeats:[0,1,3,6,8,9,11,14],leadBeats:[0,2,6,8,10,14],kick:[0,4,8,12],snare:[4,12],hat:2},
 arisawa: {roots:[33,34,36,28,33,36,34,28],phrases:[[81,79,76,74,70,69,72,76],[82,79,77,76,74,70,69,68],[84,83,79,76,72,76,79,81],[80,76,71,68,71,74,76,80]],bass:'square',lead:'sawtooth',bassBeats:[0,1,3,6,8,11,13,14],leadBeats:eighths,kick:[0,3,6,8,11,14],snare:[4,12],hat:1},
 financial: {roots:[43,48,41,38,43,39,45,38],phrases:[[79,82,86,84,82,79,77,74],[84,87,91,87,86,84,82,79],[77,81,84,88,86,84,81,77],[78,81,84,86,84,81,78,74]],bass:'triangle',lead:'sine',bassBeats:[0,4,6,8,12,14],leadBeats:eighths,kick:[0,8],snare:[4,12],hat:2,swing:true,padThird:3},
 twins: {roots:[43,42,39,38,43,46,45,38],phrases:[[79,82,86,89,86,84,82,79],[78,81,85,88,85,83,81,78],[75,79,82,86,82,81,79,75],[78,81,84,86,84,81,78,74]],bass:'triangle',lead:'triangle',bassBeats:[0,3,6,8,11,14],leadBeats:eighths,kick:[0,6,8,14],snare:[4,12],hat:2,swing:true,duet:true},
 museum: {roots:[40,36,43,38,40,43,45,35],phrases:[[76,79,83,86,83,79,76,74],[72,76,79,83,79,76,74,72],[79,83,86,88,86,83,79,76],[74,78,81,83,81,78,76,71]],bass:'sine',lead:'triangle',bassBeats:[0,6,8,14],leadBeats:[0,4,7,8,12,14],kick:[0,7,8],snare:[8],hat:2,trap:true},
 kusanagi: {roots:[40,43,38,35,40,45,43,35],phrases:[[88,86,83,79,76,79,83,86],[79,83,86,88,86,83,79,76],[86,83,81,78,74,78,81,83],[83,78,75,71,75,78,81,83]],bass:'triangle',lead:'sine',bassBeats:[0,3,8,11,14],leadBeats:[0,3,6,8,11,14],kick:[0,3,8,11],snare:[4,12],hat:2},
 blacksite: {roots:[42,38,45,40,42,45,47,37],phrases:[[78,81,85,88,85,83,81,78],[74,78,81,85,83,81,78,76],[81,85,88,92,90,88,85,81],[76,80,83,86,85,83,80,77]],bass:'sawtooth',lead:'square',bassBeats:eighths,leadBeats:eighths,kick:[0,4,8,12],snare:[4,12],hat:2,padThird:3},
 vane: {roots:[42,41,38,37,42,45,41,37],phrases:[[90,85,81,78,77,78,81,85],[89,84,80,77,76,77,80,84],[86,81,78,74,78,81,85,83],[85,80,77,73,77,80,83,85]],bass:'square',lead:'sawtooth',bassBeats:[0,2,3,6,8,10,11,14],leadBeats:eighths,kick:[0,3,6,8,11,14],snare:[4,12],hat:1},
 tower: {roots:[45,41,48,43,45,50,41,40],phrases:[[81,84,88,93,91,88,84,81],[77,81,84,89,88,84,81,77],[84,88,91,95,93,91,88,84],[79,83,86,91,89,86,83,80]],bass:'sawtooth',lead:'triangle',bassBeats:[0,3,6,8,11,14],leadBeats:eighths,kick:[0,6,10],snare:[4,12],hat:1,padThird:3},
 oswald: {roots:[45,46,41,40,45,48,46,40],phrases:[[93,88,84,83,81,84,88,92],[94,89,86,84,82,86,89,93],[89,84,81,77,81,84,88,86],[92,88,83,80,83,86,88,92]],bass:'square',lead:'triangle',bassBeats:[0,2,3,6,8,10,11,14],leadBeats:eighths,kick:[0,3,6,10,14],snare:[4,12],hat:1,padThird:3},
 menu: {roots:[40,36,43,38,40,45,36,35],phrases:[[76,79,83,81,79,76,74,71],[72,76,79,83,81,79,76,74],[79,83,86,83,81,79,78,74],[74,78,81,83,81,78,76,71]],bass:'sine',lead:'sine',bassBeats:[0,8],leadBeats:[0,4,8,12],kick:[],snare:[],hat:0,padThird:3},
 game_over: {roots:[40,36,35,40],phrases:[[83,81,79,76,74,71,67,64],[79,76,74,72,71,67,64,60],[78,75,71,66,63,59,63,66],[76,74,71,67,64,59,64,67]],bass:'sine',lead:'triangle',bassBeats:[0],leadBeats:[0,4,8,12],kick:[],snare:[],hat:0,padThird:3},
 victory: {roots:[40,45,47,40,44,45,47,40],phrases:[[76,80,83,88,85,83,80,76],[81,85,88,93,92,88,85,81],[83,87,90,95,92,90,87,83],[88,83,80,76,80,83,85,88]],bass:'triangle',lead:'sine',bassBeats:[0,4,8,12],leadBeats:eighths,kick:[0,8],snare:[4,12],hat:2,padThird:4},
};
