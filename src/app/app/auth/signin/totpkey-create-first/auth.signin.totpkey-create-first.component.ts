import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ApiService, AuthService, EnvService } from 'sb-shared-lib';
import { SignInService } from '../../../../services/sign-in.service';
import { UserSignInInfo } from '../../../../type';
import { Router } from '@angular/router';

@Component({
    selector: 'auth-signin-totpkey-create-first',
    templateUrl: 'auth.signin.totpkey-create-first.component.html',
    styleUrls: ['auth.signin.totpkey-create-first.component.scss']
})
export class AuthSigninTotpkeyCreateFirstComponent implements OnInit {

    public form: FormGroup;
    public loading = false;
    public create_totpkey_error: boolean = false;
    public auth_code_mismatch: boolean = false;
    public user_sign_in_info: UserSignInInfo|null = null;
    public mfa_token: string = '';

    public step: 'propose-creation'|'scan-qr-code' = 'propose-creation';
    public totpkey: any = null;
    public qr_code_img = '';

    constructor(
        private formBuilder: FormBuilder,
        private signIn: SignInService,
        private api: ApiService,
        private auth: AuthService,
        private env: EnvService,
        private router: Router
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

        this.signIn.mfa_token$.subscribe((mfa_token) => {
            this.mfa_token = mfa_token;
        });

        this.setUpForm();
    }

    private setUpForm() {
        this.form = this.formBuilder.group(
            {
                auth_code: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{6}|[0-9]{8})$/)]],
                dont_show_again: [false]
            }
        ) as FormGroup;
    }

    public async onSubmit() {
        this.loading = true;
        if(this.step === 'propose-creation') {
            this.create_totpkey_error = false;

            try {
                let data: any = {};
                if(this.mfa_token) {
                    // #memo - auth_token required because user isn't logged in yet
                    data.auth_token = this.mfa_token;
                }

                this.totpkey = await this.api.call('/?do=core_user_totpkey-create', data);

                this.step = 'scan-qr-code';
                this.qr_code_img = this.totpkey.totp_qr_code_uri;
            }
            catch(e) {
                console.error('Error creating totpkey:', e);
                this.create_totpkey_error = true;
            }
        }
        else if(this.step === 'scan-qr-code') {
            this.auth_code_mismatch = false;

            try {
                let data: any = {
                    totpkey_id: this.totpkey.id,
                    auth_code: this.form.get('auth_code').value
                };
                if(this.mfa_token) {
                    // #memo - auth_token required because user isn't logged in yet
                    data.auth_token = this.mfa_token;
                }

                await this.api.call('/?do=core_user_totpkey-validate', data);

                // auth.authenticate
                this.signIn.redirectAfterAuthenticate();
            }
            catch(e) {
                console.error('Error validating totpkey:', e);
                this.auth_code_mismatch = true;
            }
        }

        this.loading = false;
    }

    public async onGoToCreatePasskey() {
        this.router.navigate(['signin/passkey-create-first']);
    }

    public async onIgnoreAndContinue() {
        if(this.f.dont_show_again.value) {
            await this.updateProposeFirstTotpkeyCreationSettingValue(false);
        }

        this.signIn.redirectAfterAuthenticate();
    }

    private async updateProposeFirstTotpkeyCreationSettingValue(value: boolean) {
        let settings_domain = [
            ['package', '=', 'core'],
            ['section', '=', 'security'],
            ['code', '=', 'totpkey_creation'],
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
                        user_id: this.auth.user.id,
                        name: 'core.security.totpkey_creation',
                        value: value ? '1' : '0'
                    },
                    env.lang
                );
            }
        }
        else {
            console.error('Setting `core.security.totpkey_creation` does not exist.')
        }
    }
}
