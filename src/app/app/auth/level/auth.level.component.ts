import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService, ApiService } from 'sb-shared-lib';
import { UserSignInInfo } from '../../../type';
import { SignInService } from '../../../services/sign-in.service';

type AuthMethod = 'password'|'email'|'passkey'|'test';
type AuthStep = 'select-auth-method'|'authentication'|'authenticated';

@Component({
    selector: 'auth-level',
    templateUrl: 'auth.level.component.html',
    styleUrls: ['auth.level.component.scss']
})
export class AuthLevelComponent implements OnInit {

    public level = 2;
    private level$ = new BehaviorSubject<number>(this.level);

    public selected_auth_method: AuthMethod|null = null;

    public step: AuthStep = 'select-auth-method';

    public authentication_methods: AuthMethod[]  = ['passkey'];

    private map_auth_level_methods: { [key: number]: AuthMethod[] } = {
        1: ['password', 'email'],
        2: ['passkey']
    };

    public loading = false;

    public passkey_signin_error = false;
    public passkey_server_error = false;

    private user_sign_in_info: UserSignInInfo|null = null;

    constructor(
        private route: ActivatedRoute,
        private auth: AuthService,
        private api: ApiService,
        private signIn: SignInService
    ) {}

    public ngOnInit(): void {
        this.auth.getObservable().subscribe(async (user: any) => {
            if(user) {
                await this.setUserSignInInfo(user.login);
            }
        });

        this.route.paramMap.subscribe(params => {
            const level = this.getLevelFromRoute(params);
            if(level) {
                this.level$.next(level);
            }
            else {
                console.log('invalid auth level');
            }
        });

        this.level$.subscribe((value) => {
            this.level = value;
            this.authentication_methods = this.getLevelAvailableAuthMethods(value);
            if(this.authentication_methods.length === 1) {
                this.selected_auth_method = this.authentication_methods[0];
                this.step = 'authentication';
            }
        });
    }

    private async setUserSignInInfo(login: string): Promise<void> {
        try {
            this.user_sign_in_info = await this.api.fetch('/?get=signin-info', { login }) as UserSignInInfo;
        }
        catch (e) {
            console.log(e);
        }
    }

    private getLevelFromRoute(params: ParamMap) {
        const level = params.get('level');
        if(!Object.keys(this.map_auth_level_methods).includes(level)) {
            return false;
        }

        return parseInt(level);
    }

    private getLevelAvailableAuthMethods(level: number): AuthMethod[] {
        let authMethods: AuthMethod[] = [];

        for (let i = Object.keys(this.map_auth_level_methods).length; i >= level; i--) {
            authMethods = [...authMethods, ...this.map_auth_level_methods[i]];
        }

        return authMethods;
    }

    public onSelectAuthMethod(method: AuthMethod) {
        this.selected_auth_method = method;
    }

    public onTryAnotherWay() {
        this.selected_auth_method = null;
    }

    public onAuthSubmit() {
        switch (this.selected_auth_method) {
            case 'passkey':
                this.passkeyAuth();
                break;
        }
    }

    private async passkeyAuth(): Promise<void> {
        this.passkey_signin_error = false;
        this.passkey_server_error = false;
        this.loading = true;

        try {
            const options = await this.api.fetch('/?get=core_user_passkey-auth-options', { user_handle: this.user_sign_in_info.user_handle });

            this.signIn.recursiveBase64StrToArrayBuffer(options);

            try {
                const credential: any = await navigator.credentials.get(options);
                try {
                    await this.api.call('/?do=core_user_auth_passkey', {
                        auth_token: options.authToken,
                        credential_id: credential.rawId ? this.signIn.arrayBufferToBase64(credential.rawId) : null,
                        client_data_json: credential.response.clientDataJSON ? this.signIn.arrayBufferToBase64(credential.response.clientDataJSON) : null,
                        authenticator_data: credential.response.authenticatorData ? this.signIn.arrayBufferToBase64(credential.response.authenticatorData) : null,
                        signature: credential.response.signature ? this.signIn.arrayBufferToBase64(credential.response.signature) : null,
                        user_handle: this.user_sign_in_info.user_handle
                    });

                    this.step = 'authenticated';
                }
                catch(e) {
                    console.error('Error during server authentication call:', e);
                    this.passkey_server_error = true;
                }
            }
            catch(e) {
                console.error('WebAuthn credential retrieval error:', e);
                this.passkey_signin_error = true;
            }
        }
        catch(e) {
            console.error('Error fetching passkey authentication options:', e);
            this.passkey_server_error = true;
        }

        this.loading = false;
    }
}
