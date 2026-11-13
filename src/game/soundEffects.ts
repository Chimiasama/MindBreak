export interface EffectEvent { delay: number; duration: number; volume: number; frequency?: number; wave?: OscillatorType; endFrequency?: number; noise?: boolean }
interface Cue { priority: number; cooldown: number; events: EffectEvent[] }
const tone=(frequency:number,wave:OscillatorType,duration:number,volume:number,endFrequency?:number,delay=0):EffectEvent=>({frequency,wave,duration,volume,endFrequency,delay});
const noise=(duration:number,volume:number,delay=0):EffectEvent=>({noise:true,duration,volume,delay});
/** Local synthesis authored for this project. Cooldowns are seconds of the audio clock. */
export const SOUND_CUES = {
 jump:{priority:1,cooldown:0.06,events:[tone(300,'triangle',0.13,0.12,540),noise(0.025,0.012)]},
 double_jump:{priority:2,cooldown:0.08,events:[tone(480,'sine',0.16,0.14,860),tone(720,'sine',0.1,0.055,1100,0.04)]},
 footstep:{priority:0,cooldown:0.1,events:[noise(0.035,0.018),tone(95,'triangle',0.035,0.018,65)]},
 land:{priority:1,cooldown:0.12,events:[tone(90,'sine',0.09,0.08,40),noise(0.04,0.025)]},
 cut:{priority:2,cooldown:0.06,events:[tone(760,'sawtooth',0.09,0.1,220),noise(0.04,0.035)]},
 return_cut:{priority:2,cooldown:0.06,events:[tone(550,'triangle',0.1,0.12,1050),noise(0.035,0.04)]},
 finisher:{priority:3,cooldown:0.1,events:[tone(300,'square',0.15,0.1,85),tone(900,'sine',0.12,0.07,320,0.025),noise(0.09,0.05)]},
 hit_body:{priority:2,cooldown:0.035,events:[tone(150,'triangle',0.1,0.13,55),noise(0.05,0.045)]},
 hit_metal:{priority:2,cooldown:0.035,events:[tone(850,'square',0.055,0.055,400),tone(1230,'sine',0.12,0.035,680),noise(0.025,0.03)]},
 hit_boss:{priority:3,cooldown:0.05,events:[tone(95,'sine',0.17,0.14,35),tone(300,'square',0.08,0.06,90),noise(0.07,0.05)]},
 gunner_shot:{priority:2,cooldown:0.04,events:[tone(440,'square',0.065,0.075,140),noise(0.025,0.025)]},
 turret_shot:{priority:2,cooldown:0.045,events:[tone(180,'square',0.055,0.08,65),noise(0.03,0.04)]},
 sniper_shot:{priority:3,cooldown:0.09,events:[tone(1200,'sawtooth',0.07,0.06,160),noise(0.025,0.065)]},
 boss_shot:{priority:3,cooldown:0.07,events:[tone(120,'sawtooth',0.16,0.065,55),tone(450,'sine',0.13,0.065,900)]},
 parry:{priority:4,cooldown:0.07,events:[tone(980,'sine',0.11,0.13,1540),tone(1568,'sine',0.12,0.045,undefined,0.03)]},
 panel:{priority:3,cooldown:0.25,events:[tone(523.25,'sine',0.08,0.065),tone(659.25,'sine',0.08,0.065,undefined,0.045),tone(783.99,'sine',0.12,0.065,undefined,0.09)]},
 unlock:{priority:4,cooldown:0.35,events:[tone(100,'triangle',0.23,0.09,50),noise(0.16,0.025),tone(659.25,'sine',0.14,0.065,undefined,0.15),tone(783.99,'sine',0.18,0.065,undefined,0.22)]},
 denied:{priority:2,cooldown:0.3,events:[tone(220,'square',0.07,0.05,150),tone(145,'triangle',0.1,0.055,100,0.08)]},
 portal:{priority:3,cooldown:0.25,events:[tone(880,'sine',0.16,0.07,1320),tone(330,'triangle',0.2,0.04,660,0.04)]},
 checkpoint:{priority:3,cooldown:0.6,events:[tone(523.25,'sine',0.11,0.065),tone(783.99,'sine',0.12,0.065,undefined,0.06),tone(1046.5,'sine',0.16,0.05,undefined,0.12)]},
 deploy:{priority:3,cooldown:0.2,events:[noise(0.04,0.04),noise(0.04,0.035,0.07),tone(540,'triangle',0.16,0.07,240,0.1)]},
 secret:{priority:3,cooldown:0.4,events:[tone(659.25,'sine',0.2,0.06),tone(880,'sine',0.2,0.06,undefined,0.07),tone(1318.5,'sine',0.25,0.045,undefined,0.14)]},
 confirm:{priority:1,cooldown:0.08,events:[tone(440,'sine',0.06,0.045,660),tone(880,'sine',0.07,0.035,undefined,0.035)]},
 continue_tick:{priority:2,cooldown:0.5,events:[tone(520,'sine',0.07,0.055,420)]},
 continue_urgent:{priority:3,cooldown:0.5,events:[tone(880,'square',0.09,0.055,660)]},
 boss_warning:{priority:4,cooldown:0.2,events:[tone(660,'square',0.07,0.04),tone(880,'triangle',0.08,0.04,undefined,0.09)]},
 overdrive_ren:{priority:4,cooldown:0.4,events:[tone(120,'sawtooth',0.42,0.14,960),tone(1480,'sine',0.15,0.055,740,0.12),noise(0.07,0.04)]},
 overdrive_maya:{priority:4,cooldown:0.4,events:[tone(220,'sine',0.45,0.12,65),tone(440,'sine',0.35,0.07,880,0.08),noise(0.12,0.018)]},
 overdrive_leon:{priority:4,cooldown:0.4,events:[tone(80,'square',0.45,0.1,35),noise(0.16,0.05),tone(130,'triangle',0.3,0.08,520,0.12)]},
 death:{priority:4,cooldown:0.4,events:[tone(220,'sawtooth',0.28,0.09,40),noise(0.12,0.03)]},
} satisfies Record<string,Cue>;
export type SoundCue = keyof typeof SOUND_CUES;
