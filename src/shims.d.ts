declare module '@deepseek-ai/cordis' {
  export interface Context {
    tools: {
      register(tool: unknown): void
    }
    effect(fn: () => void | (() => void)): void
    logger?: {
      info(...args: unknown[]): void
      warn(...args: unknown[]): void
      error(...args: unknown[]): void
    }
    get?(name: string): unknown
    on?(event: string, handler: (...args: unknown[]) => unknown): void
  }
  export type Volatile<T> = { get(): T }
}

declare module '@deepseek-ai/dsh-tools' {
  export function defineTool<TArgs = Record<string, unknown>, TOut = unknown>(def: {
    name: string
    description: string
    parameters?: Record<string, unknown>
    output?: {
      schema?: unknown
      render?: (args: TArgs, value: TOut) => Array<{ type: string; text: string }>
    }
    execute: (args: TArgs, exec?: { signal?: AbortSignal }) => Promise<TOut> | TOut
  }): unknown
}

declare module '@deepseek-ai/schemastery' {
  const z: any
  export default z
}

declare module 'react' {
  export type ReactNode = unknown
  export type FC<P = {}> = (props: P) => unknown
  export function useState<T>(init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void]
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void
  export function useMemo<T>(factory: () => T, deps?: unknown[]): T
  export function useRef<T>(init: T): { current: T }
  const React: { createElement: (...args: unknown[]) => unknown; Fragment: unknown }
  export default React
}

declare module 'react/jsx-runtime' {
  export const jsx: (...args: unknown[]) => unknown
  export const jsxs: (...args: unknown[]) => unknown
  export const Fragment: unknown
}
