import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { ApiService } from 'sb-shared-lib';
import { SignInService } from '../../../../services/sign-in.service';
import { UserSignInInfo } from '../../../../type';

@Component({
    selector: 'auth-signin-passkey-create-first',
    templateUrl: 'auth.signin.passkey-create-first.component.html',
    styleUrls: ['auth.signin.passkey-create-first.component.scss']
})
export class AuthSigninPasskeyCreateFirstComponent implements OnInit {

    public form: FormGroup;
    public loading = false;
    public user_sign_in_info: UserSignInInfo|null = null;

    constructor(
        private signIn: SignInService,
        private api: ApiService
    ) {
        this.form = new FormGroup({});
    }

    public ngOnInit() {
        this.signIn.user_sign_in_info$.subscribe((user_sign_in_info) => {
            this.user_sign_in_info = user_sign_in_info;
        });
    }

    public async onSubmit() {
        const options = await this.api.fetch('/?get=core_user_passkey-register-options', { login: this.user_sign_in_info.username });

        const registerToken = options.register_token;
        delete options.register_token;

        this.signIn.recursiveBase64StrToArrayBuffer(options);

        // TODO: handle error here
        const credential: any = await navigator.credentials.create(options);

        try {
            await this.api.call('/?do=core_user_passkey-register', {
                register_token: registerToken,
                transports: credential.response.getTransports ? credential.response.getTransports() : null,
                client_data_json: credential.response.clientDataJSON ? this.signIn.arrayBufferToBase64(credential.response.clientDataJSON) : null,
                attestation_object: credential.response.attestationObject ? this.signIn.arrayBufferToBase64(credential.response.attestationObject) : null
            });

            // auth.authenticate
            this.signIn.redirectAfterAuthenticate();
        }
        catch(e) {
            console.log(e);
        }
    }

    public onIgnoreAndContinue() {
        this.signIn.redirectAfterAuthenticate();
    }
}
