let activeLocks = 0

export function lockBodyScroll() {
  if (typeof document === 'undefined') return () => {}

  activeLocks += 1
  document.body.style.overflowY = 'hidden'

  let released = false

  return () => {
    if (released) return

    released = true
    activeLocks = Math.max(0, activeLocks - 1)

    if (activeLocks === 0) {
      document.body.style.overflow = ''
      document.body.style.overflowY = ''
    }
  }
}
