import { useEffect, useRef, useCallback } from 'react'

interface UseIdleTimeoutOptions {
  /** 자동 로그아웃 시간 (ms). 기본값 10분 */
  timeout?: number
  /** 타임아웃 전 경고 시점 (ms). 기본값 1분 전 */
  warningBefore?: number
  /** 타임아웃 시 호출할 콜백 */
  onTimeout: () => void
  /** 훅 활성화 여부. false면 타이머 비활성 */
  enabled?: boolean
}

export function useIdleTimeout({
  timeout = 10 * 60 * 1000,
  warningBefore = 60 * 1000,
  onTimeout,
  enabled = true,
}: UseIdleTimeoutOptions) {
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivity = useRef(Date.now())
  const throttled = useRef(false)

  const clearTimers = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current)
    if (warningId.current) clearTimeout(warningId.current)
    timeoutId.current = null
    warningId.current = null
  }, [])

  const removeWarning = useCallback(() => {
    document.getElementById('idle-timeout-warning')?.remove()
  }, [])

  const ensureStyle = useCallback(() => {
    if (document.getElementById('idle-timeout-style')) return
    const s = document.createElement('style')
    s.id = 'idle-timeout-style'
    s.textContent = [
      '@keyframes idleSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}',
      '@keyframes idleFadeOut{from{opacity:1}to{opacity:0}}',
    ].join('')
    document.head.appendChild(s)
  }, [])

  const showWarning = useCallback(() => {
    if (document.getElementById('idle-timeout-warning')) return
    ensureStyle()
    const el = document.createElement('div')
    el.id = 'idle-timeout-warning'
    el.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:99999;background:#f59e0b;color:#fff;' +
      'padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;' +
      'box-shadow:0 4px 12px rgba(0,0,0,.15);animation:idleSlideIn .3s ease;'
    el.textContent = '\u26a0\ufe0f 1분 후 자동 로그아웃됩니다. 활동을 계속하려면 마우스를 움직여주세요.'
    document.body.appendChild(el)
  }, [ensureStyle])

  const showLogoutNotice = useCallback(() => {
    removeWarning()
    ensureStyle()
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:99999;background:#ef4444;color:#fff;' +
      'padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;' +
      'box-shadow:0 4px 12px rgba(0,0,0,.15);animation:idleSlideIn .3s ease;'
    el.textContent = '\ud83d\udd12 10분 무동작으로 자동 로그아웃되었습니다.'
    document.body.appendChild(el)
    setTimeout(() => {
      el.style.animation = 'idleFadeOut .3s ease forwards'
      setTimeout(() => el.remove(), 300)
    }, 4700)
  }, [removeWarning, ensureStyle])

  const resetTimers = useCallback(() => {
    clearTimers()
    removeWarning()
    lastActivity.current = Date.now()
    warningId.current = setTimeout(() => showWarning(), timeout - warningBefore)
    timeoutId.current = setTimeout(() => {
      showLogoutNotice()
      onTimeoutRef.current()
    }, timeout)
  }, [timeout, warningBefore, clearTimers, removeWarning, showWarning, showLogoutNotice])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      removeWarning()
      return
    }

    const handleActivity = () => {
      if (throttled.current) return
      throttled.current = true
      setTimeout(() => { throttled.current = false }, 1000)
      resetTimers()
    }

    const handleVisibility = () => {
      if (document.hidden) return
      if (Date.now() - lastActivity.current >= timeout) {
        showLogoutNotice()
        onTimeoutRef.current()
      } else {
        resetTimers()
      }
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
    events.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibility)
    resetTimers()

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      clearTimers()
      removeWarning()
    }
  }, [enabled, timeout, resetTimers, clearTimers, removeWarning, showLogoutNotice])
}
