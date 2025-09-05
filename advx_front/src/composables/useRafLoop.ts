import { ref } from 'vue'

export function useRafLoop(callback: (deltaMs: number, now: number) => void) {
  const running = ref(false)
  let lastTime = 0
  let rafId = 0

  function frame(now: number) {
    if (!running.value) return
    const delta = lastTime ? now - lastTime : 0
    lastTime = now
    callback(delta, now)
    rafId = requestAnimationFrame(frame)
  }

  function start() {
    if (running.value) return
    running.value = true
    lastTime = 0
    rafId = requestAnimationFrame(frame)
  }

  function stop() {
    running.value = false
    if (rafId) cancelAnimationFrame(rafId)
  }

  return { running, start, stop }
}


