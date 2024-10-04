import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { ApiService, AuthService, EnvService } from 'sb-shared-lib';
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
    public create_passkey_error: boolean = false;
    public server_error: boolean = false;
    public user_sign_in_info: UserSignInInfo|null = null;

    constructor(
        private formBuilder: FormBuilder,
        private signIn: SignInService,
        private api: ApiService,
        private auth: AuthService,
        private env: EnvService
    ) {
        this.form = new FormGroup({});
    }

    public get f() {
        return this.form.controls;
    }

    public ngOnInit() {
        this.signIn.user_sign_in_info$.subscribe((user_sign_in_info) => {
            this.user_sign_in_info = user_sign_in_info;
        });

        this.setUpForm();
    }

    private setUpForm() {
        this.form = <FormGroup>this.formBuilder.group({
            dont_show_again: [false]
        });
    }

    public async onSubmit() {
        this.loading = true;

        const options = await this.api.fetch('/?get=core_user_passkey-register-options', { login: this.user_sign_in_info.username });

        const registerToken = options.register_token;
        delete options.register_token;

        this.signIn.recursiveBase64StrToArrayBuffer(options);

        try {
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
                this.server_error = true;
            }
        }
        catch(e) {
            console.log(e);
            this.create_passkey_error = true;
        }

        this.loading = false;
    }

    public async onIgnoreAndContinue() {
        if(this.f.dont_show_again.value) {
            await this.updateProposeFirstPasskeyCreationSettingValue(false);
        }

        this.signIn.redirectAfterAuthenticate();
    }

    private async updateProposeFirstPasskeyCreationSettingValue(value: boolean) {
        let settings_domain = [
            ['package', '=', 'core'],
            ['section', '=', 'auth'],
            ['code', '=', 'propose_passkey_creation'],
        ];

        const settings = await this.api.collect('core\\setting\\Setting', settings_domain, ['id']);
        if(settings.length) {
            const env = await this.env.getEnv();

            const setting = settings[0];
            const setting_value_domain = [
                ['setting_id', '=', setting.id],
                ['user_id', '=', this.auth.user.id]
            ];

            const settingValues = await this.api.collect('core\\setting\\SettingValue', setting_value_domain, ['id']);
            if(settingValues.length) {
                const settingValue = settingValues[0];

                this.api.update(
                    'core\\setting\\SettingValue',
                    [settingValue.id],
                    { value: value ? '1' : '0' },
                    env.lang
                );
            }
            else {
                this.api.create(
                    'core\\setting\\SettingValue',
                    {
                        setting_id: setting.id,
                        name: 'core.auth.propose_passkey_creation',
                        value: value ? '1' : '0'
                    },
                    env.lang
                );
            }
        }
        else {
            console.error('Setting core.auth.propose_passkey_creation does not exist.')
        }
    }
}
