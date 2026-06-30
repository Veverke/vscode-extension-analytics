import { createContext, useContext } from 'react'

export interface UserContextValue {
  username: string | null
  setUsername: (name: string) => void
  clearUsername: () => void
}

export const UserContext = createContext<UserContextValue>({
  username: null,
  setUsername: () => {},
  clearUsername: () => {},
})

export function useUser(): UserContextValue {
  return useContext(UserContext)
}