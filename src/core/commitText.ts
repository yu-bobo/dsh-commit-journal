// Prefer full commit message; fall back to title
export function commitFullText(commit: { title?: string; message?: string }): string {
  const message = (commit.message || '').trim()
  const title = (commit.title || '').trim()
  if (message) return message
  return title
}

// Prefer title line; otherwise first non-empty line of full message
export function commitTitleLine(commit: { title?: string; message?: string }): string {
  const title = (commit.title || '').trim()
  if (title) {
    return title.split('\n').find((l) => l.trim())?.trim() || title
  }
  const full = commitFullText(commit)
  return full.split('\n').find((l) => l.trim())?.trim() || full
}
