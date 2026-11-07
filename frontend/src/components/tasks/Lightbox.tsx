import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Attachment } from '../../api/types'
import { Icon } from '../Icon'
import styles from './Lightbox.module.css'
import { t } from '../../lib/i18n'

const MIN = 1
const MAX = 5
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v))

interface Props {
  images: Attachment[]
  start: number
  onClose: () => void
}

/**
 * Floating photo viewer: zoom (buttons, wheel, pinch, double tap), drag to
 * look around a zoomed photo, and swipe or arrows to go through several.
 */
export function Lightbox({ images, start, onClose }: Props) {
  const [index, setIndex] = useState(start)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ x: number; y: number; ox: number; oy: number; dist: number; scale: number } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const many = images.length > 1
  const image = images[index]

  function go(to: number) {
    setIndex((to + images.length) % images.length)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  function zoom(next: number) {
    const s = clamp(next)
    setScale(s)
    if (s === 1) setOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && many) go(index + 1)
      else if (e.key === 'ArrowLeft' && many) go(index - 1)
      else if (e.key === '+' || e.key === '=') zoom(scale * 1.5)
      else if (e.key === '-') zoom(scale / 1.5)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    const dist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    gesture.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, dist, scale }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    const g = gesture.current
    if (pts.length === 2 && g.dist > 0) {
      // Pinch.
      zoom(g.scale * (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / g.dist))
    } else if (pts.length === 1 && scale > 1) {
      // Look around a zoomed photo.
      setOffset({ x: g.ox + (e.clientX - g.x), y: g.oy + (e.clientY - g.y) })
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    const wasSingle = pointers.current.size === 1
    pointers.current.delete(e.pointerId)
    if (pointers.current.size > 0) {
      // One finger left after a pinch: continue from here.
      const [p] = [...pointers.current.values()]
      gesture.current = { x: p.x, y: p.y, ox: offset.x, oy: offset.y, dist: 0, scale }
      return
    }
    gesture.current = null
    // Swipe (only when not zoomed).
    if (g && wasSingle && scale === 1 && many) {
      const dx = e.clientX - g.x
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - g.y)) go(index + (dx < 0 ? 1 : -1))
    }
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    zoom(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
  }

  // On <body>, above the app's bars and menus.
  return createPortal(
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={t('Foto {n} de {total}: {name}', { n: index + 1, total: images.length, name: image.name })}>
      <div className={styles.top}>
        <span className={styles.name}>
          {many && <strong>{index + 1} / {images.length}</strong>} {image.name}
        </span>
        <a className={styles.tool} href={image.url} download={image.name} aria-label={t('Descargar')} title={t('Descargar')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
        </a>
        <button ref={closeRef} type="button" className={styles.tool} aria-label={t('Cerrar')} title={t('Cerrar (Esc)')} onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={() => zoom(scale > 1 ? 1 : 2.5)}
        onClick={(e) => {
          // A click on the dark area (not the photo) closes it.
          if (e.target === e.currentTarget && scale === 1) onClose()
        }}
        style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
      >
        <img
          key={image.id}
          src={image.url}
          alt={image.name}
          draggable={false}
          className={styles.image}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        />
      </div>

      {many && (
        <>
          <button type="button" className={`${styles.nav} ${styles.prev}`} aria-label="Foto anterior" onClick={() => go(index - 1)}>
            <Icon name="back" size={24} />
          </button>
          <button type="button" className={`${styles.nav} ${styles.next}`} aria-label="Foto siguiente" onClick={() => go(index + 1)}>
            <Icon name="forward" size={24} />
          </button>
        </>
      )}

      <div className={styles.bottom}>
        <div className={styles.zoomBar} role="group" aria-label={t('Zoom')}>
          <button type="button" className={styles.tool} aria-label={t('Alejar')} disabled={scale <= MIN} onClick={() => zoom(scale / 1.5)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 12h12" />
            </svg>
          </button>
          <button type="button" className={styles.percent} aria-label={t('Tamaño original')} onClick={() => zoom(1)}>
            {Math.round(scale * 100)}%
          </button>
          <button type="button" className={styles.tool} aria-label={t('Acercar')} disabled={scale >= MAX} onClick={() => zoom(scale * 1.5)}>
            <Icon name="plus" size={20} />
          </button>
        </div>
        {many && (
          <div className={styles.strip}>
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={styles.stripItem}
                aria-label={t('Ver foto {n}', { n: i + 1 })}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              >
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
