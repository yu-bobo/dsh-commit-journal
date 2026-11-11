import type { Account, VcsProviderId } from '../core/types.js'
import { codeupProvider } from './codeup/index.js'
import { localGitProvider } from './local/index.js'
import type { VcsProvider } from './types.js'

const providers: Record<VcsProviderId, VcsProvider | null> = {
  codeup: codeupProvider,
  local: localGitProvider,
  // Roadmap: enterprise GitLab / GitHub adapters
  gitlab: null,
  github: null
}

export function getProvider(providerId: VcsProviderId | Account): VcsProvider {
  if (typeof providerId !== 'string' && providerId.mode === 'local') {
    return localGitProvider
  }
  const id = typeof providerId === 'string' ? providerId : providerId.provider
  const provider = providers[id]
  if (!provider) {
    throw new Error(
      `VCS provider「${id}」尚未实现。当前支持 codeup（远程）与 local（本机扫描）；GitLab/GitHub 见 README 路线图。`
    )
  }
  return provider
}

export type { VcsProvider, RemoteCommit, BranchInfo, ListCommitsResult } from './types.js'
