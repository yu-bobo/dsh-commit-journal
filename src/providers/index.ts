import type { Account, VcsProviderId } from '../core/types.js'
import { codeupProvider } from './codeup/index.js'
import { githubProvider } from './github/index.js'
import { gitlabProvider } from './gitlab/index.js'
import { localGitProvider } from './local/index.js'
import type { VcsProvider } from './types.js'

const providers: Record<VcsProviderId, VcsProvider> = {
  codeup: codeupProvider,
  local: localGitProvider,
  gitlab: gitlabProvider,
  github: githubProvider
}

export function getProvider(providerId: VcsProviderId | Account): VcsProvider {
  if (typeof providerId !== 'string' && providerId.mode === 'local') {
    return localGitProvider
  }
  const id = typeof providerId === 'string' ? providerId : providerId.provider
  const provider = providers[id]
  if (!provider) {
    throw new Error(`未知 VCS provider「${id}」。支持 codeup / gitlab / github / local。`)
  }
  return provider
}

export type { VcsProvider, RemoteCommit, BranchInfo, ListCommitsResult } from './types.js'
