import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Task } from '../../api/types'
import { useCreateTask, useTasks } from '../../hooks/useWorkspaceData'
import { answerQuery } from '../../lib/assistant/answer'
import { sayWhen } from '../../lib/assistant/describe'
import { dueFrom, interpret, mergeDraft, parseAnswer, parseDraft, type Draft } from '../../lib/assistant/parse'
import { canListen, canSpeak, listen, readVoiceSettings, saveVoiceSettings, speak, stopSpeaking, type Listener } from '../../lib/assistant/speech'
import { formatDue } from '../../lib/dates'
import { upper } from '../../lib/text'
import { Icon } from '../Icon'
import styles from './assistant.module.css'

/** What the next thing you say means. */
type Mode = 'idle' | 'confirm' | 'title' | 'saving'

interface Message {
  id: number
  from: 'me' | 'bot'
  text: string
  tasks?: Task[]
  link?: { to: string; label: string }
}

const EXAMPLES = 'Por ejemplo: «Recuérdame mañana a las 9 llamar a soporte» o «¿Qué tengo hoy?».'

const lower = (s: string) => s.toLocaleLowerCase('es')

/**
 * The assistant: a round button at the bottom right that listens (or reads
 * what you type), creates tasks after asking you to confirm out loud, and
 * answers "¿qué tengo hoy?". Rules only for now (lib/assistant/parse);
 * `interpret` returning "unknown" is where an AI can step in later.
 */
export function Assistant({ canEdit }: { canEdit: boolean }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setModeState] = useState<Mode>('idle')
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [typed, setTyped] = useState('')
  const [voiceOn, setVoiceOn] = useState(() => readVoiceSettings().enabled)
  const createTask = useCreateTask()
  const { data: openTasks = [] } = useTasks({ status: 'open' }, open)

  // The listen → answer → listen loop runs in callbacks: they read these refs, not stale state.
  const modeRef = useRef<Mode>('idle')
  const draftRef = useRef<Draft | null>(null)
  const voiceRef = useRef(voiceOn)
  const tasksRef = useRef<Task[]>(openTasks)
  const listener = useRef<Listener | null>(null)
  // Only reopen the mic after a question when you were talking (not typing).
  const byVoice = useRef(false)
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tasksRef.current = openTasks
  }, [openTasks])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, partial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Leaving the app (or logging out) stops the mic and the voice.
  useEffect(
    () => () => {
      listener.current?.abort()
      stopSpeaking()
    },
    [],
  )

  function setMode(next: Mode) {
    modeRef.current = next
    setModeState(next)
  }

  function add(from: Message['from'], text: string, extra: Partial<Message> = {}) {
    const id = nextId.current++
    setMessages((list) => [...list.slice(-40), { id, from, text, ...extra }])
  }

  /** Shows (and says) a reply; `thenListen` opens the mic again for the answer. */
  function reply(text: string, opts: { spoken?: string; thenListen?: boolean; tasks?: Task[]; link?: Message['link'] } = {}) {
    add('bot', text, { tasks: opts.tasks, link: opts.link })
    const after = () => {
      if (opts.thenListen && byVoice.current) window.setTimeout(startListening, 200)
    }
    if (voiceRef.current && canSpeak()) speak(opts.spoken ?? text, after)
    else after()
  }

  function startListening() {
    if (!canListen()) return
    listener.current?.abort()
    stopSpeaking()
    setPartial('')
    const me: { l: Listener | null } = { l: null }
    me.l = listen({
      onPartial: setPartial,
      onFinal: (text) => {
        setPartial('')
        byVoice.current = true
        handle(text)
      },
      onError: (error) => {
        if (error === 'denied') reply('No tengo permiso para usar el micrófono. Actívalo en el navegador o escríbeme aquí abajo.')
        else if (error === 'network') reply('Para escucharte necesito conexión a internet. Puedes escribirme mientras.')
        else if (error === 'no-speech') add('bot', 'No te escuché. Toca el micrófono para intentarlo otra vez.')
      },
      onEnd: () => {
        if (listener.current !== me.l) return
        listener.current = null
        setListening(false)
        setPartial('')
      },
    })
    listener.current = me.l
    setListening(!!me.l)
  }

  function stopListening() {
    listener.current?.stop()
  }

  function confirm(draft: Draft) {
    draftRef.current = draft
    setMode('confirm')
    const when = sayWhen(draft)
    const title = upper(draft.title)
    const tail = when === 'sin fecha' ? 'sin fecha' : `para ${when}`
    reply(`¿Guardo la tarea "${title}" ${tail}?`, { spoken: `¿Guardo la tarea: ${lower(draft.title)}, ${tail}?`, thenListen: true })
  }

  function save(draft: Draft) {
    setMode('saving')
    const { due } = dueFrom(draft)
    const when = sayWhen(draft)
    createTask.mutate(
      { title: draft.title, due_at: due ? due.toISOString() : null },
      {
        onSuccess: (task) => {
          draftRef.current = null
          setMode('idle')
          const tail = when === 'sin fecha' ? '' : ` para ${when}`
          const note = due ? ' Te avisaré según tus ajustes.' : ''
          reply(`Listo, guardé "${task.title}"${tail}.${note}`, {
            spoken: `Listo, la guardé.${note}`,
            link: { to: `/tareas/${task.id}`, label: 'Abrir la tarea' },
          })
        },
        onError: () => {
          setMode('confirm')
          reply('No pude guardarla. Revisa tu conexión y dime "sí" para intentarlo otra vez.')
        },
      },
    )
  }

  function handle(raw: string) {
    const text = raw.trim()
    if (!text) return
    add('me', text)
    const draft = draftRef.current

    if (modeRef.current === 'saving') return

    if (modeRef.current === 'confirm' && draft) {
      const answer = parseAnswer(text)
      if (answer.kind === 'yes') return save(draft)
      const fixText = answer.kind === 'no' ? answer.rest : text
      if (answer.kind === 'no' && !fixText) {
        draftRef.current = null
        setMode('idle')
        return reply('De acuerdo, no la guardé.')
      }
      const fix = parseDraft(fixText)
      if (fix.day || fix.time || fix.exact || (answer.kind === 'no' && fix.title)) return confirm(mergeDraft(draft, fix))
      return reply('No te entendí. ¿La guardo? Dime "sí" o "no".', { thenListen: true })
    }

    if (modeRef.current === 'title' && draft) {
      const fix = parseDraft(text)
      return confirm(mergeDraft(draft, { ...fix, title: fix.title || text }))
    }

    const intent = interpret(text)
    if (intent.kind === 'query') {
      const a = answerQuery(intent.range, tasksRef.current)
      return reply(a.text, { spoken: a.spoken, tasks: a.tasks.slice(0, 8) })
    }
    if (intent.kind === 'create') {
      if (!canEdit) return reply('En este espacio eres invitado: puedo decirte qué tienes pendiente, pero no crear tareas.')
      if (!intent.draft.title) {
        draftRef.current = intent.draft
        setMode('title')
        return reply('¿Qué quieres que te recuerde?', { thenListen: true })
      }
      return confirm(intent.draft)
    }
    reply(`No entendí. ${EXAMPLES}`)
  }

  function openPanel() {
    // The voice may have been changed in Ajustes meanwhile.
    const { enabled } = readVoiceSettings()
    setVoiceOn(enabled)
    voiceRef.current = enabled
    setOpen(true)
    if (messages.length === 0) {
      add('bot', canListen() ? `Hola, te escucho. ${EXAMPLES}` : `Hola. Tu navegador no me deja escuchar, pero puedes escribirme. ${EXAMPLES}`)
    }
    startListening()
    window.setTimeout(() => panelRef.current?.focus(), 0)
  }

  function close() {
    listener.current?.abort()
    listener.current = null
    setListening(false)
    setPartial('')
    stopSpeaking()
    setOpen(false)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = typed.trim()
    if (!text) return
    setTyped('')
    listener.current?.abort()
    byVoice.current = false
    handle(text)
  }

  function toggleVoice() {
    const next = !voiceOn
    setVoiceOn(next)
    voiceRef.current = next
    if (!next) stopSpeaking()
    saveVoiceSettings({ enabled: next })
  }

  return (
    <>
      {open && (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Asistente" tabIndex={-1}>
          <header className={styles.head}>
            <span className={styles.orb} aria-hidden="true" />
            <strong>Asistente</strong>
            {canSpeak() && (
              <button type="button" className={styles.iconBtn} onClick={toggleVoice} aria-pressed={voiceOn} aria-label={voiceOn ? 'Silenciar mis respuestas' : 'Leer mis respuestas en voz alta'}>
                <Icon name={voiceOn ? 'volume' : 'mute'} size={18} />
              </button>
            )}
            <button type="button" className={styles.iconBtn} onClick={close} aria-label="Cerrar asistente">
              <Icon name="close" size={18} />
            </button>
          </header>

          <div ref={logRef} className={styles.log} aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={m.from === 'me' ? styles.me : styles.bot}>
                <p className={m.from === 'me' ? 'caps' : undefined}>{m.text}</p>
                {m.tasks && m.tasks.length > 0 && (
                  <ul className={styles.tasks}>
                    {m.tasks.map((t) => (
                      <li key={t.id}>
                        <Link to={`/tareas/${t.id}`}>{t.title}</Link>
                        {t.due_at && <span>{formatDue(t.due_at)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {m.link && (
                  <Link to={m.link.to} className={styles.msgLink}>
                    {m.link.label}
                  </Link>
                )}
              </div>
            ))}
            {partial && (
              <div className={`${styles.me} ${styles.partial}`}>
                <p className="caps">{partial}…</p>
              </div>
            )}
          </div>

          {mode === 'confirm' && (
            <div className={styles.choices}>
              <button type="button" className={styles.yes} onClick={() => {
                  byVoice.current = false
                  handle('sí')
                }}>
                Sí, guárdala
              </button>
              <button type="button" className={styles.no} onClick={() => {
                  byVoice.current = false
                  handle('no')
                }}>
                No
              </button>
            </div>
          )}

          <form className={styles.inputRow} onSubmit={submit}>
            <input
              className="caps"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={listening ? 'Te escucho…' : 'Escríbeme o toca el micrófono'}
              aria-label="Mensaje para el asistente"
              autoCapitalize="characters"
            />
            {typed.trim() ? (
              <button type="submit" className={styles.send} aria-label="Enviar">
                <Icon name="send" size={18} />
              </button>
            ) : (
              canListen() && (
                <button
                  type="button"
                  className={`${styles.send} ${listening ? styles.live : ''}`}
                  onClick={listening ? stopListening : startListening}
                  aria-pressed={listening}
                  aria-label={listening ? 'Dejar de escuchar' : 'Hablar'}
                >
                  <Icon name="mic" size={18} />
                </button>
              )
            )}
          </form>
        </div>
      )}

      <button
        type="button"
        className={`${styles.fab} ${listening ? styles.live : ''} ${open ? styles.fabOpen : ''}`}
        onClick={open ? (listening ? stopListening : startListening) : openPanel}
        aria-label={open ? (listening ? 'Dejar de escuchar' : 'Hablar con el asistente') : 'Abrir asistente'}
        aria-expanded={open}
      >
        <Icon name="mic" size={24} />
      </button>
    </>
  )
}
