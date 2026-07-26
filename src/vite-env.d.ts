/// <reference types="vite/client" />

/** VS Code webview API exposed by acquireVsCodeApi() */
interface VsCodeApi {
  postMessage(message: Record<string, unknown>): void
  getState(): unknown
  setState(state: unknown): void
}

declare global {
  interface Window {
    vscode?: VsCodeApi
  }
}

export {}
