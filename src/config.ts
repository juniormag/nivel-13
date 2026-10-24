// Configuração de campanha. Os valores vêm de variáveis de ambiente no build (ver README).
const env = import.meta.env

export const CONFIG = {
  /** Abertura das urnas (horário de Brasília). */
  electionAt: new Date(env.VITE_ELECTION_AT ?? '2026-10-25T08:00:00-03:00'),
  electionLabel: env.VITE_ELECTION_LABEL ?? 'domingo, 25 de outubro, das 8h às 17h',
  /** Exigido pela lei eleitoral: quem responde pela peça. Preencha antes de publicar. */
  responsavel: (env.VITE_RESPONSAVEL as string | undefined) ?? '',
  apiBase: (env.VITE_API_URL as string | undefined) ?? '/api',
  siteUrl: ((env.VITE_SITE_URL as string | undefined) ?? location.origin).replace(/\/$/, ''),
  aiLabel: 'Conteúdo produzido com uso de inteligência artificial',
  /** Dia 1 do Desafio do Dia. */
  dailyEpoch: '2026-10-20',
}

export const responsavelText = () =>
  CONFIG.responsavel ? `Responsável: ${CONFIG.responsavel}` : 'Responsável: (preencher VITE_RESPONSAVEL)'
