export type DiscoveryAuthMethod = 'pwd'|'passkey';

export type AuthMethod = DiscoveryAuthMethod|'totp'|'emailotp';

export type ChallengeAuthMethod = 'totp'|'email_otp';

export type CredentialType = 'passkey'|'totpkey';

export interface SignInChallenge {
    method: ChallengeAuthMethod;
    auth_token: string;
    data?: any;
}

export interface AuthResponse {
    status: 'authenticated'|'challenge';
    auth_token?: string;
    challenge?: {
        method: ChallengeAuthMethod;
        data?: any;
    };
}

export type SignInWorkflowState =
    { step: 'signin-info' }
    | { step: 'authentication-method', method: DiscoveryAuthMethod }
    | { step: 'challenge', challenge: SignInChallenge }
    | { step: 'credential-creation', credential: CredentialType }
    | { step: 'redirect' };

export interface UserSignInInfo {
    username: string;
    allowed_methods: DiscoveryAuthMethod[];
    allowed_creations: CredentialType[];
    methods_data: {
        pwd?: {
            mfa_required?: boolean;
        };
        passkey?: {
            user_handle: string;
        };
        totp?: {
            enabled: boolean;
            digits?: number;
        };
        email_otp?: {
            required: boolean;
            digits: number;
        };
    },
    user_data: {
        has_passkey: boolean,
        has_totpkey: boolean,
        factors?: any[]
    }
}
