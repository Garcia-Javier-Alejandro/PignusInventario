export const BUILD_SHA = __BUILD_SHA__
export const BUILD_TIME = __BUILD_TIME__

export function formatBuildLabel(): string {
  const d = new Date(BUILD_TIME)
  const date = isNaN(d.getTime())
    ? BUILD_TIME
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${BUILD_SHA} · ${date}`
}

export async function forceAppUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } finally {
    window.location.reload()
  }
}
