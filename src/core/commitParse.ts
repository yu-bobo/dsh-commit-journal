import type { StoredCommit } from './types.js'
import { commitFullText, commitTitleLine } from './commitText.js'

// none = 不解析；conventional = 抽 type/scope/ticket（可选增强）
export type ReportParseStrategy = 'none' | 'conventional'

export interface ParsedCommit {
  type: string | null
  scope: string | null
  ticket: string | null
  summary: string
  bullets: string[]
}

// type(scope)!: rest
const CONVENTIONAL_HEAD =
  /^([a-zA-Z]+)(?:\(([^)]*)\))?(?:!)?:\s*(.*)$/

// [TICKET-1] / #123 / ABC-123
const TICKET_BRACKET = /\[([A-Za-z][A-Za-z0-9_.-]*-\d+)\]/
const TICKET_HASH = /(?:^|[\s:])#(\d+)(?:\b|$)/
const TICKET_BARE = /\b([A-Z][A-Z0-9]+-\d+)\b/

function emptyParsed(summary: string): ParsedCommit {
  return { type: null, scope: null, ticket: null, summary, bullets: [] }
}

function normalizeTicket(raw: string): string {
  const t = raw.trim()
  if (/^\d+$/.test(t)) return `#${t}`
  return t.toUpperCase()
}

function findTicket(text: string): string | null {
  const bracket = text.match(TICKET_BRACKET)
  if (bracket) return normalizeTicket(bracket[1])
  const hash = text.match(TICKET_HASH)
  if (hash) return normalizeTicket(hash[1])
  const bare = text.match(TICKET_BARE)
  if (bare) return normalizeTicket(bare[1])
  return null
}

function stripLeadingTicket(rest: string): { ticket: string | null; summary: string } {
  const trimmed = rest.trim()
  const bracket = trimmed.match(/^\[([A-Za-z][A-Za-z0-9_.-]*-\d+)\]\s*(.*)$/)
  if (bracket) {
    return { ticket: normalizeTicket(bracket[1]), summary: bracket[2].trim() }
  }
  const hash = trimmed.match(/^#(\d+)\s+(.*)$/)
  if (hash) {
    return { ticket: normalizeTicket(hash[1]), summary: hash[2].trim() }
  }
  const bare = trimmed.match(/^([A-Z][A-Z0-9]+-\d+)\s*[:：]?\s*(.*)$/)
  if (bare && bare[2]) {
    return { ticket: normalizeTicket(bare[1]), summary: bare[2].trim() }
  }
  return { ticket: null, summary: trimmed }
}

function extractBullets(bodyLines: string[]): string[] {
  const bullets: string[] = []
  for (const line of bodyLines) {
    const m = line.match(/^\s*[-*]\s+(.+)$/)
    if (m) bullets.push(m[1].trim())
  }
  return bullets
}

/**
 * 解析 conventional 风格提交；失败则降级为摘要=标题行
 */
export function parseConventional(commit: StoredCommit): ParsedCommit {
  const title = commitTitleLine(commit)
  const full = commitFullText(commit)
  const lines = full.split(/\r?\n/)
  const bodyLines = lines.slice(1)
  const bullets = extractBullets(bodyLines)

  const head = title.match(CONVENTIONAL_HEAD)
  if (!head) {
    const ticket = findTicket(full)
    return {
      ...emptyParsed(title),
      ticket,
      bullets
    }
  }

  const type = head[1].toLowerCase()
  const scope = (head[2] || '').trim() || null
  const { ticket: titleTicket, summary } = stripLeadingTicket(head[3] || '')
  const ticket = titleTicket || findTicket(full)

  return {
    type,
    scope,
    ticket,
    summary: summary || title,
    bullets
  }
}

/**
 * 按策略解析；none 时不做结构化抽取
 */
export function parseCommit(
  commit: StoredCommit,
  strategy: ReportParseStrategy
): ParsedCommit {
  if (strategy === 'conventional') return parseConventional(commit)
  return emptyParsed(commitTitleLine(commit))
}

/**
 * 仅抽 type（过滤用）；认不出返回 null
 */
export function extractCommitType(commit: StoredCommit): string | null {
  return parseConventional(commit).type
}
