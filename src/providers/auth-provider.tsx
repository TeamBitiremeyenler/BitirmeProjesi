// src/providers/auth-provider.tsx
import { AuthContext } from '@/src/hooks/auth-hooks';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { PropsWithChildren, useEffect, useState, useCallback } from 'react';
import type { Profile } from '@/src/types/user.type';

function isMissingProfilesTableError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'PGRST205'
    );
}

function isMissingProfileRowError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'PGRST116'
    );
}

export default function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false); // NEW

    const fetchProfile = useCallback(async (userId: string) => {
        setIsProfileLoading(true); // NEW
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (isMissingProfilesTableError(error) || isMissingProfileRowError(error)) {
                    setProfile(null);
                    return;
                }

                console.warn('Profile fetch failed:', error);
                setProfile(null);
            } else {
                setProfile(data as Profile);
            }
        } catch (error) {
            console.warn('Unexpected profile fetch failure:', error);
            setProfile(null);
        } finally {
            setIsProfileLoading(false); // NEW
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            if (!isSupabaseConfigured) {
                if (isMounted) {
                    setSession(null);
                    setProfile(null);
                    setIsLoading(false);
                    setIsInitialized(true);
                }
                return;
            }

            try {
                const {
                    data: { session: currentSession },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error fetching session:', error);
                }

                if (isMounted) {
                    setSession(currentSession);

                    if (currentSession?.user) {
                        await fetchProfile(currentSession.user.id);
                    } else {
                        setProfile(null);
                    }

                    setIsLoading(false);
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error('Error in initializeAuth:', error);
                if (isMounted) {
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
        };
    }, [fetchProfile]);

    useEffect(() => {
        if (!isInitialized || !isSupabaseConfigured) return;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state changed:', { event: _event });

            setSession(session);

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [isInitialized, fetchProfile]);

    const refreshProfile = useCallback(async () => {
        if (session?.user.id) {
            await fetchProfile(session.user.id);
        }
    }, [session, fetchProfile]);

    return (
        <AuthContext.Provider
            value={{
                session,
                isLoading: isLoading || isProfileLoading,
                profile,
                isLoggedIn: !!session,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
