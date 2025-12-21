export function playSound(src: string): void {
  const audio = new Audio(src);
  audio.volume = 1;
  audio.play().catch(() => {});
}