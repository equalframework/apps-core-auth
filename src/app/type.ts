export type AuthMethod = 'pwd'|'passkey'|'otp';

export type CredentialType = 'passkey'|'totpkey';

export interface SignInChallenge {
    method: AuthMethod;
    auth_token: string;
    data?: any;
}

export interface AuthResponse {
    status: 'authenticated'|'challenge';
    auth_token?: string;
    challenge?: {
        method: AuthMethod;
        data?: any;
    };
}

export type SignInWorkflowState =
    { step: 'signin-info' }
    | { step: 'authentication-method', method: AuthMethod }
    | { step: 'challenge', challenge: SignInChallenge }
    | { step: 'credential-creation', credential: CredentialType }
    | { step: 'redirect' };

export interface UserSignInInfo {
    username: string;
    allowed_methods: AuthMethod[];
    allowed_creations: CredentialType[];
    methods_data: {
        pwd?: {
            otp_required?: boolean;
        };
        passkey?: {
            user_handle: string;
        };
        otp?: {
            enabled: boolean;
            digits?: number;
        };
    },
    user_data: {
        has_passkey: boolean,
        has_totpkey: boolean,
        factors?: any[]
    }
}
