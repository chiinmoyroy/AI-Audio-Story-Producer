
export interface Dialogue {
  type: 'dialogue';
  character: string;
  content: string;
}

export interface Narration {
  type: 'narration';
  content: string;
}

export interface SoundCue {
  type: 'sound_cue';
  description: string;
}

export type SceneElement = Dialogue | Narration | SoundCue;

export interface Scene {
  setting: string;
  elements: SceneElement[];
}

export interface DramatizedScript {
  characters: string[];
  scenes: Scene[];
}
