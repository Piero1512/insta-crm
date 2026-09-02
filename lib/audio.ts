// lib/audio.ts
// Generador de tono sintético para alertas sin requerir archivos externos pesados
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Tono D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // Sube a A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.log('Audio contextual en espera de interacción de usuario');
  }
}