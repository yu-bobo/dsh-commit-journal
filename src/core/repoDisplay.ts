// Strip leading org/enterprise id so UI labels stay readable
export function shortRepoPath(
  pathWithNamespace: string | undefined | null,
  organizationId?: string
): string {
  const raw = (pathWithNamespace || '').trim()
  if (!raw) return ''
  const parts = raw.split('/').filter(Boolean)
  if (parts.length <= 1) return raw

  if (organizationId && parts[0] === organizationId) {
    return parts.slice(1).join('/')
  }
  // Codeup central often prefixes a 24-char hex org id
  if (/^[a-f0-9]{24}$/i.test(parts[0])) {
    return parts.slice(1).join('/') || raw
  }
  return raw
}
