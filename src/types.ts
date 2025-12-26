export type SoundState = "A" | "B" | "mute";

export type SoundProfileTone = {
  type?: OscillatorType;
  frequency?: number;
  volume?: number;
  decay?: number;
  duration?: number;
  preset?: "loud" | "stacked";
};

export type SoundProfile = {
  accent: SoundProfileTone;
  regular: SoundProfileTone;
};
