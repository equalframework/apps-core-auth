import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { AuthService } from 'sb-shared-lib';
import {
    AuthMethod,
    AuthResponse,
    CredentialType,
    SignInChallenge,
    SignInWorkflowState,
    UserSignInInfo
} from '../type';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SignInService {

    private redirect_to: string = '/apps';
    public user_signin_info$ = new BehaviorSubject<UserSignInInfo|null>(null);
    public challenge$ = new BehaviorSubject<SignInChallenge|null>(null);
    public workflow_state$ = new BehaviorSubject<SignInWorkflowState>({ step: 'signin-info' });

    private user_signin_info: UserSignInInfo|null = null;
    private handled_credential_creations = new Set<CredentialType>();
    private readonly authentication_routes: Record<AuthMethod, string> = {
        pwd: '/signin/password',
        passkey: '/signin/passkey',
        otp: '/signin/totp'
    };

    constructor(
        private auth: AuthService,
        private router: Router
    ) {
        this.auth.getObservable().subscribe((user: any) => {
            const is_user_authenticated = user?.id > 0;
            const is_level_elevation = window.location.hash.startsWith('#/level/');

            // Authentication initiated by authenticateWith() is continued after
            // the generic response has been processed. This branch only handles
            // a session that already existed when the auth app was loaded.
            if(is_user_authenticated && this.user_signin_info === null && !is_level_elevation) {
                this.finishSignIn();
            }
        });

        this.router.events.subscribe(event => {
            if(event instanceof NavigationEnd) {
                const current_url = event.urlAfterRedirects.split('?')[0];
                const does_current_component_need_user_signin_info =
                    ['/signin/password', '/signin/passkey', '/signin/passkey-create-first', '/signin/totp', '/signin/totpkey-create-first'].includes(current_url);

                if(does_current_component_need_user_signin_info && !this.user_signin_info) {
                    this.router.navigate(['/signin']);
                }
            }
        });
    }

    public setRedirectTo(redirect_to: string) {
        this.redirect_to = redirect_to;
    }

    public setUserSignInInfo(user_signin_info: UserSignInInfo|null) {
        if(user_signin_info === null) {
            this.resetSignInContext();
            return;
        }

        this.user_signin_info = user_signin_info;
        this.user_signin_info$.next(user_signin_info);
        this.handled_credential_creations.clear();
        this.challenge$.next(null);

        const method = this.selectInitialAuthMethod(user_signin_info);
        this.navigateToAuthenticationMethod(method);
    }

    public resetSignInContext(navigate_to_signin: boolean = true) {
        this.user_signin_info = null;
        this.user_signin_info$.next(null);
        this.challenge$.next(null);
        this.handled_credential_creations.clear();
        this.workflow_state$.next({ step: 'signin-info' });

        if(navigate_to_signin) {
            this.router.navigate(['/signin']);
        }
    }

    public async authenticateWith(method: AuthMethod, credentials: any, method_auth_token?: string): Promise<AuthResponse> {
        const challenge = this.challenge$.value;
        const auth_token = method_auth_token || (challenge?.method === method ? challenge.auth_token : undefined);
        // The installed shared library still declares legacy method names, but forwards this value verbatim at runtime.
        const response = await this.auth.authenticateWith(method as any, credentials, auth_token) as any;

        if(response.status === 'challenge') {
            if(!response.auth_token || !response.challenge?.method) {
                throw new Error('Invalid authentication challenge response.');
            }

            const next_challenge: SignInChallenge = {
                method: this.normalizeAuthMethod(response.challenge.method),
                auth_token: response.auth_token,
                data: response.challenge.data
            };

            this.challenge$.next(next_challenge);
            this.workflow_state$.next({ step: 'challenge', challenge: next_challenge });
            this.navigateToChallenge(next_challenge);

            return {
                status: 'challenge',
                auth_token: next_challenge.auth_token,
                challenge: {
                    method: next_challenge.method,
                    data: next_challenge.data
                }
            };
        }

        this.challenge$.next(null);
        await this.continueAfterAuthentication();

        return { status: 'authenticated' };
    }

    public canCreatePasskey(): boolean {
        return this.canCreateCredential('passkey');
    }

    public canCreateTotpkey(): boolean {
        return this.canCreateCredential('totpkey');
    }

    public useAuthenticationMethod(method: AuthMethod) {
        if(this.user_signin_info?.allowed_methods.includes(method)) {
            this.navigateToAuthenticationMethod(method);
        }
    }

    public goToCredentialCreation(credential: CredentialType) {
        const current_state = this.workflow_state$.value;
        if(current_state.step === 'credential-creation' && current_state.credential !== credential) {
            this.handled_credential_creations.add(current_state.credential);
        }

        if(this.canCreateCredential(credential)) {
            this.navigateToCredentialCreation(credential);
        }
    }

    public async completeCredentialCreation(credential: CredentialType) {
        const establishes_session = this.challenge$.value !== null;

        if(this.user_signin_info) {
            if(credential === 'passkey') {
                this.user_signin_info.user_data.has_passkey = true;
            }
            else {
                this.user_signin_info.user_data.has_totpkey = true;
            }
        }

        this.handled_credential_creations.add(credential);

        if(establishes_session) {
            this.challenge$.next(null);
            await this.auth.authenticate();
        }

        await this.continueAfterAuthentication();
    }

    public async skipCredentialCreation(credential: CredentialType) {
        this.handled_credential_creations.add(credential);
        await this.continueAfterAuthentication();
    }

    private selectInitialAuthMethod(user_signin_info: UserSignInInfo): AuthMethod {
        if(user_signin_info.user_data.has_passkey && user_signin_info.allowed_methods.includes('passkey')) {
            return 'passkey';
        }

        return user_signin_info.allowed_methods[0] || 'pwd';
    }

    private navigateToAuthenticationMethod(method: AuthMethod) {
        this.workflow_state$.next({ step: 'authentication-method', method });
        this.router.navigate([this.authentication_routes[method]]);
    }

    private navigateToChallenge(challenge: SignInChallenge) {
        if(challenge.method === 'otp' && !this.user_signin_info?.user_data.has_totpkey && this.canCreateTotpkey()) {
            this.router.navigate(['/signin/totpkey-create-first']);
            return;
        }

        this.router.navigate([this.authentication_routes[challenge.method]]);
    }

    private canCreateCredential(credential: CredentialType): boolean {
        if(!this.user_signin_info) {
            return false;
        }

        const has_credential = credential === 'totpkey'
            ? this.user_signin_info.user_data.has_totpkey
            : this.user_signin_info.user_data.has_passkey;

        const method_enabled = credential === 'totpkey'
            ? this.user_signin_info.methods_data?.otp?.enabled === true
            : this.user_signin_info.allowed_methods.includes('passkey');

        return !has_credential
            && method_enabled
            && this.user_signin_info.allowed_creations.includes(credential);
    }

    private async continueAfterAuthentication() {
        const credentials: CredentialType[] = ['totpkey', 'passkey'];
        const credential = credentials.find((candidate) =>
            !this.handled_credential_creations.has(candidate) && this.canCreateCredential(candidate)
        );

        if(credential) {
            this.navigateToCredentialCreation(credential);
            return;
        }

        this.finishSignIn();
    }

    private navigateToCredentialCreation(credential: CredentialType) {
        this.workflow_state$.next({ step: 'credential-creation', credential });
        this.router.navigate([`/signin/${credential}-create-first`]);
    }

    private finishSignIn() {
        const redirect_to = this.redirect_to;
        this.workflow_state$.next({ step: 'redirect' });
        this.resetSignInContext(false);
        window.location.href = redirect_to;
    }

    private normalizeAuthMethod(method: string): AuthMethod {
        if(method === 'password') {
            return 'pwd';
        }
        if(method === 'totp') {
            return 'otp';
        }
        if(method === 'pwd' || method === 'passkey' || method === 'otp') {
            return method;
        }

        throw new Error(`Unsupported authentication method: ${method}`);
    }

    public recursiveBase64StrToArrayBuffer(obj: any) {
        let prefix = '=?BINARY?B?';
        let suffix = '?=';
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; ++i) {
                this.recursiveBase64StrToArrayBuffer(obj[i]);
            }
        }
        else if (typeof obj === 'object') {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    let str = obj[key];
                    if (str.substring(0, prefix.length) === prefix && str.substring(str.length - suffix.length) === suffix) {
                        str = str.substring(prefix.length, str.length - suffix.length);

                        let binary_string = window.atob(str);
                        let len = binary_string.length;
                        let bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++)        {
                            bytes[i] = binary_string.charCodeAt(i);
                        }
                        obj[key] = bytes.buffer;
                    }
                } else {
                    this.recursiveBase64StrToArrayBuffer(obj[key]);
                }
            }
        }
    }

    public arrayBufferToBase64(buffer: any) {
        let binary = '';
        let bytes = new Uint8Array(buffer);
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode( bytes[ i ] );
        }
        return window.btoa(binary);
    }
}
