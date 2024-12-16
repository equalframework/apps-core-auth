import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SignInService } from '../../../../services/sign-in.service';
import { AuthService, ApiService } from 'sb-shared-lib';
import { UserSignInInfo } from '../../../../type';

@Component({
    selector: 'auth-signin-passkey',
    templateUrl: 'auth.signin.passkey.component.html',
    styleUrls: ['auth.signin.passkey.component.scss']
})
export class AuthSigninPasskeyComponent implements OnInit {

    public loading: boolean = false;
    public signin_error: boolean = false;
    public server_error: boolean = false;
    public user_sign_in_info: UserSignInInfo|null = null;

    constructor(
        private auth: AuthService,
        private router: Router,
        private api: ApiService,
        private signIn: SignInService
    ) {}

    public ngOnInit() {
        this.signIn.user_sign_in_info$.subscribe((user_sign_in_info) => {
            this.user_sign_in_info = user_sign_in_info;
        });
    }

    public async onSubmit() {
        this.signin_error = false;
        this.server_error = false;
        this.loading = true;

        try {
            const options = await this.api.fetch('/?get=core_user_passkey-auth-options', { login: this.user_sign_in_info.username });

            const authToken = options.auth_token;
            delete options.auth_token;

            this.signIn.recursiveBase64StrToArrayBuffer(options);

            try {
                const credential: any = await navigator.credentials.get(options);

                try {
                    await this.api.call('/?do=core_user_passkey-auth', {
                        auth_token: authToken,
                        credential_id: credential.rawId ? this.signIn.arrayBufferToBase64(credential.rawId) : null,
                        client_data_json: credential.response.clientDataJSON ? this.signIn.arrayBufferToBase64(credential.response.clientDataJSON) : null,
                        authenticator_data: credential.response.authenticatorData ? this.signIn.arrayBufferToBase64(credential.response.authenticatorData) : null,
                        signature: credential.response.signature ? this.signIn.arrayBufferToBase64(credential.response.signature) : null,
                        user_handle: credential.response.userHandle ? this.signIn.arrayBufferToBase64(credential.response.userHandle) : null
                    });

                    // success: we should be able to authenticate
                    this.auth.authenticate();
                    // SignIn service should now redirect to /apps
                }
                catch(e) {
                    console.error('Error during server authentication call:', e);
                    this.server_error = true;
                }
            }
            catch(e) {
                console.error('WebAuthn credential retrieval error:', e);
                this.signin_error = true;
            }
        }
        catch(e) {
            console.error('Error fetching passkey authentication options:', e);
            this.server_error = true;
        }

        this.loading = false;
    }

    public onTryAnotherWay() {
        this.router.navigate(['/signin/password']);
    }

    public onSwitchUser() {
        // By setting user sign in info to null, the SignInService auto redirect to 'signin' to re-enter login
        this.signIn.setUserSignInInfo(null);
    }
}
