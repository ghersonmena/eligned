import { useEffect, useMemo, useState } from 'react'
import type { Attachment } from '../../api/types'
import { Icon } from '../Icon'
import { Lightbox } from './Lightbox'
import { formatSize } from '../../lib/attachments'
import styles from './Attachments.module.css'

/** Files of a saved comment: photos as thumbnails, everything else as a download chip. */
export function AttachmentList({ items }: { items: Attachment[] }) {
  const images = items.filter((a) => a.is_image)
  const files = items.filter((a) => !a.is_image)
  const [viewing, setViewing] = useState<number | null>(null)
  return (
    <div className={styles.saved}>
      {images.length > 0 && (
        <div className={styles.thumbs}>
          {images.map((a, i) => (
            <button key={a.id} type="button" className={styles.thumb} title={a.name} aria-label={`Ver ${a.name}`} onClick={() => setViewing(i)}>
              <img src={a.url} alt={a.name} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {viewing !== null && <Lightbox images={images} start={viewing} onClose={() => setViewing(null)} />}
      {files.map((a) => (
        <a key={a.id} href={a.url} download={a.name} className={styles.file}>
          <Icon name="clip" size={16} />
          <span className={styles.fileName}>{a.name}</span>
          <span className={styles.fileSize}>{formatSize(a.size)}</span>
        </a>
      ))}
    </div>
  )
}

/** Files chosen for the comment being written, each removable. */
export function PendingFiles({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files])
  useEffect(() => () => previews.forEach((url) => url && URL.revokeObjectURL(url)), [previews])
  if (files.length === 0) return null

  return (
    <ul className={styles.pending} aria-label="Archivos por enviar">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className={styles.pendingItem}>
          {previews[i] ? <img src={previews[i]!} alt="" className={styles.pendingImg} /> : <Icon name="clip" size={16} />}
          <span className={styles.fileName}>{f.name}</span>
          <span className={styles.fileSize}>{formatSize(f.size)}</span>
          <button type="button" className={styles.remove} aria-label={`Quitar ${f.name}`} onClick={() => onRemove(i)}>
            <Icon name="close" size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}
