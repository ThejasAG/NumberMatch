export type SoundName = "tap" | "match" | "error" | "row" | "win" | "lose";

export class SoundManager {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies: Record<SoundName, number> = {
      tap: 440,
      match: 660,
      error: 180,
      row: 330,
      win: 880,
      lose: 120
    };
    oscillator.frequency.value = frequencies[name];
    oscillator.type = name === "error" || name === "lose" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    this.context = AudioCtor ? new AudioCtor() : null;
    return this.context;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const soundManager = new SoundManager();
