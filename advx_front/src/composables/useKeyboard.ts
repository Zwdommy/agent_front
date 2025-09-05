import { onMounted, onUnmounted, ref } from 'vue'

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

export function useKeyboard() {
  const keyState = ref<Record<ArrowKey, boolean>>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key in keyState.value) {
      keyState.value[e.key as ArrowKey] = true
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key in keyState.value) {
      keyState.value[e.key as ArrowKey] = false
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return { keyState }
}


