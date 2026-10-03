import { Component, OnInit } from '@angular/core';
import { SignInService } from '../../../../services/sign-in.service';
import { ApiService } from 'sb-shared-lib';
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
    public user_signin_info: UserSignInInfo|null = null;

    constructor(
        private api: ApiService,
        private signIn: SignInService
    ) {}

    public ngOnInit() {
        this.signIn.user_signin_info$.subscribe((user_signin_info) => {
            this.user_signin_info = user_signin_info;
        });
    }

    public async onSubmit() {
        this.signin_error = false;
        this.server_error = false;
        this.loading = true;

        try {
            const options = await this.api.fetch('/?get=core_user_passkey-auth-options', { user_handle: this.user_signin_info.methods_data?.passkey?.user_handle });

            this.signIn.recursiveBase64StrToArrayBuffer(options);

            try {
                const credential: any = await navigator.credentials.get(options);
                try {
                    await this.signIn.authenticateWith('passkey', {
                        credential_id: credential.rawId ? this.signIn.arrayBufferToBase64(credential.rawId) : null,
                        client_data_json: credential.response.clientDataJSON ? this.signIn.arrayBufferToBase64(credential.response.clientDataJSON) : null,
                        authenticator_data: credential.response.authenticatorData ? this.signIn.arrayBufferToBase64(credential.response.authenticatorData) : null,
                        signature: credential.response.signature ? this.signIn.arrayBufferToBase64(credential.response.signature) : null,
                        user_handle: this.user_signin_info.methods_data?.passkey?.user_handle
                    }, options.authToken);
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
        this.signIn.useAuthenticationMethod('pwd');
    }

    public onSwitchUser() {
        this.signIn.resetSignInContext();
    }
}
