import { Session } from "@supabase/supabase-js";

export type PrimaryUseCase = 'work' | 'social' | 'school' | 'reminder';

export interface Profile {
    id: string;
    updated_at: string | null;
    username: string | null;
    avatar_url: string | null;
    primary_use_case: PrimaryUseCase | null;
    initial_collection_name: string | null;
    onboarding_completed: boolean | null;
}

export interface AuthContextType {
    session: Session | null | undefined;
    isLoading: boolean;
    profile: Profile | null | undefined;
    isLoggedIn: boolean;
    refreshProfile: () => Promise<void>;
}