import { useState, type InputHTMLAttributes } from 'react'
import { Icon } from './Icon'
import styles from './PasswordInput.module.css'
import { t } from '../lib/i18n'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** Password field with a button to show or hide what was typed. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className={styles.wrapper}>
      <input {...props} type={visible ? 'text' : 'password'} className={`${className ?? ''} ${styles.input}`} />
      <button
        type="button"
        className={styles.toggle}
        aria-label={visible ? t('Ocultar contraseña') : t('Mostrar contraseña')}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </span>
  )
}
