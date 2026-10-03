import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ApiService, AuthService, EnvService } from 'sb-shared-lib';
import { SignInService } from '../../../../services/sign-in.service';
import { UserSignInInfo } from '../../../../type';

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
    public user_signin_info: UserSignInInfo|null = null;
    public auth_token: string = '';

    public step: 'propose-creation'|'scan-qr-code' = 'propose-creation';
    public totpkey: any = null;
    public qr_code_img = '';

    constructor(
        private formBuilder: FormBuilder,
        private signIn: SignInService,
        private api: ApiService,
        private auth: AuthService,
        private env: EnvService
    ) {
        this.form = this.formBuilder.group({
            dont_show_again: [false]
        }) as FormGroup;
    }

    public get f() {
        return this.form.controls;
    }

    public get can_create_passkey(): boolean {
        return this.signIn.canCreatePasskey();
    }

    public ngOnInit() {
        this.signIn.user_signin_info$.subscribe((user_signin_info) => {
            this.user_signin_info = user_signin_info;
        });

        this.signIn.challenge$.subscribe((challenge) => {
            this.auth_token = challenge?.method === 'otp' ? challenge.auth_token : '';
        });
    }

    private setUpAuthCodeControl(totp_conf: any) {
        this.form.setControl('auth_code', this.formBuilder.control('', [
            Validators.required,
            Validators.pattern(new RegExp(`^[0-9]{${totp_conf.digits}}$`))
        ]));

        this.form.get('auth_code').valueChanges.subscribe(() => {
            this.auth_code_mismatch = false;
        });
    }

    public async onSubmit() {
        if(this.step === 'scan-qr-code' && this.form.invalid) {
            return;
        }

        this.loading = true;
        if(this.step === 'propose-creation') {
            this.create_totpkey_error = false;

            try {
                let data: any = {};
                if(this.auth_token) {
                    // #memo - auth_token required because user isn't logged in yet
                    data.auth_token = this.auth_token;
                }

                this.totpkey = await this.api.call('/?do=core_user_totpkey-create', data);

                this.setUpAuthCodeControl({ digits: this.totpkey.digits });

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
                if(this.auth_token) {
                    // #memo - auth_token required because user isn't logged in yet
                    data.auth_token = this.auth_token;
                }

                await this.api.call('/?do=core_user_totpkey-validate', data);

                await this.signIn.completeCredentialCreation('totpkey');
            }
            catch(e) {
                console.error('Error validating totpkey:', e);
                this.auth_code_mismatch = true;
            }
        }

        this.loading = false;
    }

    public async onGoToCreatePasskey() {
        this.signIn.goToCredentialCreation('passkey');
    }

    public async onIgnoreAndContinue() {
        if(this.f.dont_show_again.value) {
            await this.updateProposeFirstTotpkeyCreationSettingValue(false);
        }

        await this.signIn.skipCredentialCreation('totpkey');
    }

    private async updateProposeFirstTotpkeyCreationSettingValue(value: boolean) {
        let settings_domain = [
            ['package', '=', 'core'],
            ['section', '=', 'security'],
            ['code', '=', 'auth.totp.creation'],
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
                        name: 'core.security.auth.totp.creation',
                        value: value ? '1' : '0'
                    },
                    env.lang
                );
            }
        }
        else {
            console.error('Setting `core.security.auth.totp.creation` does not exist.')
        }
    }
}
