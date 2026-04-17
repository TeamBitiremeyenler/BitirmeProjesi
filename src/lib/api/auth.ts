import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

type EmailStatusPayload = {
    exists?: boolean;
};

function resolveBackendBaseUrl(): string | null {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
    return envUrl ? envUrl.replace(/\/$/, '') : null;
}

export function normalizeAuthEmail(email: string): string {
    return email.trim().toLowerCase();
}

export async function checkEmailExists(email: string): Promise<boolean | null> {
    const baseUrl = resolveBackendBaseUrl();
    if (!baseUrl) return null;

    const response = await fetch(`${baseUrl}/api/auth/email-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: normalizeAuthEmail(email),
        }),
    });

    if (!response.ok) {
        throw new Error(`email_status_failed_${response.status}`);
    }

    const payload = (await response.json()) as EmailStatusPayload;
    return Boolean(payload.exists);
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeAuthEmail(email), {
        redirectTo: Linking.createURL('/reset-password'),
    });
    if (error) {
        throw error;
    }
}
