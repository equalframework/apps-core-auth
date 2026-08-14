import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from 'sb-shared-lib';
import { SignInService } from '../../../../services/sign-in.service';
import { UserSignInInfo } from '../../../../type';

@Component({
    selector: 'auth-signin-totp',
    templateUrl: 'auth.signin.totp.component.html',
    styleUrls: ['auth.signin.totp.component.scss']
})
export class AuthSigninTotpComponent implements OnInit {

    public form: FormGroup;
    public loading: boolean = false;
    public submitted: boolean = false;
    public signin_error: boolean = false;
    public server_error: boolean = false;
    public expired_token: boolean = false;
    public failed_attempts_reached: boolean = false;
    public user_sign_in_info: UserSignInInfo|null = null;
    public mfa_token: string = '';

    constructor(
        private formBuilder: FormBuilder,
        private auth: AuthService,
        private router: Router,
        private signIn: SignInService
    ) {
        this.form = new FormGroup({});
    }

    // convenience getter for easy access to form fields
    public get f() {
        return this.form.controls;
    }

    public async ngOnInit() {
        this.signIn.user_sign_in_info$.subscribe((user_sign_in_info) => {
            this.user_sign_in_info = user_sign_in_info;

            let totp_conf: any = { digits: 6 };
            if(this.user_sign_in_info?.methods_data?.totp) {
                totp_conf = this.user_sign_in_info.methods_data.totp;
            }

            this.setUpForm(totp_conf);
        });

        this.signIn.mfa_token$.subscribe((mfa_token) => {
            this.mfa_token = mfa_token;
        });
    }

    private setUpForm(totp_conf: any) {
        const digits = totp_conf.digits;

        this.form = <FormGroup>this.formBuilder.group({
            auth_code: ['', [Validators.required, Validators.pattern(new RegExp(`^[0-9]{${digits}}$`))]]
        });

        this.form.get('auth_code').valueChanges.subscribe( () => {
            this.submitted = false;
        });
    }

    public async onSubmit() {
        // prevent submitting invalid form
        if (this.form.invalid) {
            return;
        }
        this.signin_error = false;
        this.server_error = false;
        this.submitted = true;
        this.loading = true;

        try {
            await this.auth.signInTotp(this.mfa_token, this.f.auth_code.value);

            // success: we should be able to authenticate
            this.auth.authenticate();
            // SignIn service should now redirect to /apps
        }
        catch(response:any) {
            if(response.hasOwnProperty('status')) {
                if(response.status == 0) {
                    this.server_error = true;
                }
                else if(response.hasOwnProperty('error') && response.error.hasOwnProperty('errors')) {
                    let code = Object.keys(response.error['errors'])[0];
                    let error_code = response.error['errors'][code];

                    if(error_code === 'allowed_failed_attempts_reached') {
                        this.failed_attempts_reached = true;
                    }
                    else if(error_code === 'expired_token') {
                        this.expired_token = true;
                    }
                    else {
                        this.signin_error = true;
                    }
                }
            }
            else {
                this.server_error = true;
            }

            // there was an error: stop loading indicator
            this.loading = false;
        }
    }

    public onSwitchUser() {
        // By setting user sign in info to null, the SignInService auto redirect to 'signin' to re-enter login
        this.signIn.setUserSignInInfo(null);
    }
}
