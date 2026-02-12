import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import { Profile } from '@/src/types/user.type'

export type AuthData = {
    session?: Session | null
    profile?: Profile | null
    isLoading: boolean
    isLoggedIn: boolean
    refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthData>({
    session: undefined,
    profile: undefined,
    isLoading: true,
    isLoggedIn: false,
    refreshProfile: async () => { },
})

export const useAuthContext = () => useContext(AuthContext)