import { createContext, useContext } from 'react'
import { ExtensionEntry } from '../types/schema'

export const ExtensionsContext = createContext<ExtensionEntry[]>([])

export function useExtensionsContext(): ExtensionEntry[] {
  return useContext(ExtensionsContext)
}
