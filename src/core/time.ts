import { CONFIG } from '../config'

/** Data de hoje no horário de Brasília, AAAA-MM-DD. */
export function todayBR(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

export function dailyNumber(date = todayBR()) {
  const a = Date.parse(`${CONFIG.dailyEpoch}T12:00:00Z`)
  const b = Date.parse(`${date}T12:00:00Z`)
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

export function untilElection(now = Date.now()) {
  const ms = CONFIG.electionAt.getTime() - now
  if (ms <= 0) return null
  const d = Math.floor(ms / 86400000)
  const hh = Math.floor((ms % 86400000) / 3600000)
  const mm = Math.floor((ms % 3600000) / 60000)
  return {
    d,
    hh,
    mm,
    label: d > 0 ? `${d}d ${String(hh).padStart(2, '0')}h` : `${hh}h ${String(mm).padStart(2, '0')}min`,
  }
}

export function msToNextDay() {
  const now = new Date()
  const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const next = new Date(br)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - br.getTime()
}
