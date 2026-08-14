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
        });

        this.signIn.mfa_token$.subscribe((mfa_token) => {
            this.mfa_token = mfa_token;
        });

        this.setUpForm();
    }

    private setUpForm() {
        this.form = <FormGroup>this.formBuilder.group({
            auth_code: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{6}|[0-9]{8})$/)]]
        });

        this.form.get('auth_code').valueChanges.subscribe( () => {
            this.submitted = false;
        });
    }

    public async onSubmit() {
        // prevent submitting invalid form
        if (this.form.invalid) {
            console.log('invalid')
            return;
        }
        this.signin_error = false;
        this.server_error = false;
        this.submitted = true;
        this.loading = true;

        try {
            await this.auth.signInTotp(this.user_sign_in_info.username, this.mfa_token, this.f.auth_code.value);

            // success: we should be able to authenticate
            this.auth.authenticate();
            // SignIn service should now redirect to /apps
        }
        catch(response:any) {
            console.log(response);

            try {
                if(response.hasOwnProperty('status')) {
                    if(response.status == 0) {
                        throw {
                            code: 'server_error',
                            message: 'Server error'
                        };
                    }
                    if(response.hasOwnProperty('error') && response.error.hasOwnProperty('errors')) {
                        let code = Object.keys(response.error['errors'])[0];
                        let msg = response.error['errors'][code];

                        if(msg === 'allowed_failed_attempts_reached') {
                            this.failed_attempts_reached = true;
                        }
                        else if(msg === 'expired_token') {
                            this.expired_token = true;
                        }

                        throw {
                            code: code,
                            message: msg
                        };
                    }
                }
                else {
                    throw {
                        code: 'server_error',
                        message: 'Server error'
                    };
                }
            }
            catch(exception:any) {
                if(exception.code == 'server_error') {
                    this.server_error = true;
                }
                else {
                    this.signin_error = true;
                }
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
