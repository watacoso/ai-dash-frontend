import { createContext, useContext, useState } from 'react'

interface SessionContextValue {
  snowflakeId: string | null
  claudeId: string | null
  setSnowflakeId: (id: string | null) => void
  setClaudeId: (id: string | null) => void
}

export const SessionContext = createContext<SessionContextValue>({
  snowflakeId: null,
  claudeId: null,
  setSnowflakeId: () => {},
  setClaudeId: () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [snowflakeId, setSnowflakeId] = useState<string | null>(null)
  const [claudeId, setClaudeId] = useState<string | null>(null)

  return (
    <SessionContext.Provider value={{ snowflakeId, claudeId, setSnowflakeId, setClaudeId }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
