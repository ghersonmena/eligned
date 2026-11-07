import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { User } from '../api/auth'
import { ApiError } from '../api/client'
import type { Invitation, Member, Role } from '../api/types'
import { Icon } from '../components/Icon'
import { WorkloadSection } from '../components/team/WorkloadSection'
import { useInvitations, useInvite, useRemoveMember, useRenameWorkspace, useRenewInvitation, useRevokeInvitation, useSetRole } from '../hooks/useTeam'
import { useMembers } from '../hooks/useWorkspaceData'
import { initials } from '../lib/initials'
import { canManage, currentWorkspace, ROLE_HINTS, ROLE_LABELS } from '../lib/workspace'
import pageStyles from './pages.module.css'
import styles from './team.module.css'

type InviteRole = Exclude<Role, 'owner'>
const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

export function TeamPage({ user }: { user: User }) {
  const workspace = currentWorkspace(user)!
  const myRole = workspace.role
  const manager = canManage(myRole)
  const { data: members = [], isPending } = useMembers()
  const [renaming, setRenaming] = useState(false)

  return (
    <>
      <div className={styles.header}>
        <div>
          <span className={pageStyles.eyebrow}>{workspace.personal ? 'Tu espacio personal' : 'Espacio de trabajo'}</span>
          {renaming ? (
            <RenameForm name={workspace.name} onDone={() => setRenaming(false)} />
          ) : (
            <h1 className={pageStyles.pageTitle}>
              {workspace.name}
              {manager && (
                <button type="button" className={styles.iconButton} aria-label="Cambiar el nombre del espacio" onClick={() => setRenaming(true)}>
                  <Icon name="edit" size={18} />
                </button>
              )}
            </h1>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.side}>
          <WorkloadSection meId={user.id} className={pageStyles.card} />
          <section className={pageStyles.card} aria-labelledby="people-title">
            <h2 id="people-title">
              Personas <span className={pageStyles.count}>· {members.length}</span>
            </h2>
            {isPending && <p>Cargando…</p>}
            <ul className={styles.people}>
              {members.map((m) => (
                <MemberRow key={m.id} member={m} me={user} myRole={myRole} />
              ))}
            </ul>
            <dl className={styles.roles}>
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <div key={r}>
                  <dt>{ROLE_LABELS[r]}</dt>
                  <dd>{ROLE_HINTS[r]}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {manager && (
          <div className={styles.side}>
            <InviteCard isOwner={myRole === 'owner'} />
            <PendingInvitations />
          </div>
        )}
      </div>
    </>
  )
}

function RenameForm({ name, onDone }: { name: string; onDone: () => void }) {
  const rename = useRenameWorkspace()
  const [value, setValue] = useState(name)
  return (
    <form
      className={styles.renameForm}
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) rename.mutate(value.trim(), { onSuccess: onDone })
      }}
    >
      <input className={pageStyles.input} aria-label="Nombre del espacio" value={value} maxLength={120} autoFocus onChange={(e) => setValue(e.target.value)} />
      <button type="submit" className={pageStyles.primary} disabled={!value.trim() || rename.isPending}>
        Guardar
      </button>
      <button type="button" className={pageStyles.secondary} onClick={onDone}>
        Cancelar
      </button>
    </form>
  )
}

function MemberRow({ member, me, myRole }: { member: Member; me: User; myRole: Role | undefined }) {
  const setRole = useSetRole()
  const remove = useRemoveMember()
  const navigate = useNavigate()
  const isMe = member.id === me.id
  const role = member.role ?? 'member'
  // Admins handle members and guests; only the owner handles admins.
  const canEdit = !isMe && role !== 'owner' && (myRole === 'owner' || (myRole === 'admin' && role !== 'admin'))
  const options: InviteRole[] = myRole === 'owner' ? ['admin', 'member', 'guest'] : ['member', 'guest']
  const error = setRole.error ?? remove.error

  function onRemove() {
    const text = isMe
      ? '¿Salir de este espacio? Dejarás de ver sus tareas.'
      : `¿Quitar a ${member.name} del espacio? Dejará de ver sus tareas y de ser responsable de ellas.`
    if (!window.confirm(text)) return
    remove.mutate(member.id, { onSuccess: () => isMe && navigate('/') })
  }

  return (
    <li className={styles.person}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(member.name)}
      </span>
      <div className={styles.personText}>
        <strong>
          {member.name}
          {isMe && <span className={styles.you}> (tú)</span>}
        </strong>
        <span>{member.email}</span>
        {error instanceof ApiError && (
          <span className={pageStyles.error} role="alert">
            {error.message}
          </span>
        )}
      </div>
      {canEdit ? (
        <select
          className={styles.roleSelect}
          aria-label={`Rol de ${member.name}`}
          value={role}
          disabled={setRole.isPending}
          onChange={(e) => setRole.mutate({ userId: member.id, role: e.target.value as InviteRole })}
        >
          {options.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      ) : (
        <span className={`${styles.roleTag} ${styles[`role_${role}`]}`}>{ROLE_LABELS[role]}</span>
      )}
      {(canEdit || (isMe && role !== 'owner')) && (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={isMe ? 'Salir del espacio' : `Quitar a ${member.name}`}
          title={isMe ? 'Salir del espacio' : 'Quitar del espacio'}
          disabled={remove.isPending}
          onClick={onRemove}
        >
          <Icon name={isMe ? 'logout' : 'trash'} size={18} />
        </button>
      )}
    </li>
  )
}

function InviteCard({ isOwner }: { isOwner: boolean }) {
  const invite = useInvite()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('member')
  const [sendEmail, setSendEmail] = useState(true)
  const [created, setCreated] = useState<Invitation | null>(null)
  const error = invite.error instanceof ApiError ? (invite.error.fieldError('email') ?? invite.error.message) : null

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    invite.mutate(
      { email: email.trim(), role, send_email: sendEmail },
      {
        onSuccess: (inv) => {
          setCreated(inv)
          setEmail('')
        },
      },
    )
  }

  return (
    <section className={pageStyles.card} aria-labelledby="invite-title">
      <h2 id="invite-title">Invitar a alguien</h2>
      <form className={styles.inviteForm} onSubmit={onSubmit}>
        <label className={pageStyles.field}>
          Correo
          <input
            className={pageStyles.input}
            type="email"
            autoComplete="off"
            required
            value={email}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={pageStyles.field}>
          Rol
          <select className={pageStyles.input} value={role} onChange={(e) => setRole(e.target.value as InviteRole)}>
            {(isOwner ? (['admin', 'member', 'guest'] as const) : (['member', 'guest'] as const)).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]} — {ROLE_HINTS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className={pageStyles.check}>
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          Enviarle la invitación por correo
        </label>
        {error && (
          <p className={pageStyles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={pageStyles.primary} disabled={!email.trim() || invite.isPending}>
          {invite.isPending ? 'Invitando…' : 'Invitar'}
        </button>
      </form>
      {created?.link && (
        <LinkBox
          link={created.link}
          note={sendEmail ? `Le enviamos un correo a ${created.email}. También puedes compartirle este enlace:` : `Comparte este enlace con ${created.email}:`}
        />
      )}
    </section>
  )
}

function LinkBox({ link, note }: { link: string; note: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={styles.linkBox} role="status">
      <p>{note}</p>
      <div className={styles.linkRow}>
        <input className={pageStyles.input} readOnly value={link} aria-label="Enlace de invitación" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className={pageStyles.secondary}
          onClick={() =>
            void navigator.clipboard?.writeText(link).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            })
          }
        >
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <small>Solo funciona para ese correo y vence en 14 días.</small>
    </div>
  )
}

function PendingInvitations() {
  const { data: invitations = [] } = useInvitations(true)
  const renew = useRenewInvitation()
  const revoke = useRevokeInvitation()
  const [fresh, setFresh] = useState<Invitation | null>(null)
  if (invitations.length === 0) return null

  return (
    <section className={pageStyles.card} aria-labelledby="pending-title">
      <h2 id="pending-title">Invitaciones pendientes</h2>
      <ul className={styles.people}>
        {invitations.map((inv) => (
          <li key={inv.id} className={styles.invitation}>
            <div className={styles.personText}>
              <strong>{inv.email}</strong>
              <span>
                {ROLE_LABELS[inv.role]} · {inv.expired ? 'venció' : `vence el ${shortDate.format(new Date(inv.expires_at))}`}
              </span>
            </div>
            <div className={styles.invActions}>
              <button
                type="button"
                className={styles.smallButton}
                disabled={renew.isPending}
                onClick={() => renew.mutate({ id: inv.id, sendEmail: false }, { onSuccess: setFresh })}
              >
                Nuevo enlace
              </button>
              <button
                type="button"
                className={styles.smallButton}
                disabled={renew.isPending}
                onClick={() => renew.mutate({ id: inv.id, sendEmail: true }, { onSuccess: setFresh })}
              >
                Reenviar correo
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Cancelar la invitación de ${inv.email}`}
                onClick={() => window.confirm(`¿Cancelar la invitación de ${inv.email}?`) && revoke.mutate(inv.id)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
            {fresh?.id === inv.id && fresh.link && <LinkBox link={fresh.link} note="El enlace anterior ya no funciona. Este es el nuevo:" />}
          </li>
        ))}
      </ul>
    </section>
  )
}
