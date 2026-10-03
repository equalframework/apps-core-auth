import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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
    public auth_code_digits: number = 6;
    public user_signin_info: UserSignInInfo|null = null;

    constructor(
        private formBuilder: FormBuilder,
        private signIn: SignInService
    ) {
        this.form = new FormGroup({});
    }

    // convenience getter for easy access to form fields
    public get f() {
        return this.form.controls;
    }

    public async ngOnInit() {
        this.signIn.user_signin_info$.subscribe((user_signin_info) => {
            this.user_signin_info = user_signin_info;

            this.auth_code_digits = this.user_signin_info?.methods_data?.totp?.digits ?? 6;
            this.setUpForm(this.auth_code_digits);
        });

    }

    private setUpForm(digits: number) {
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
            await this.signIn.authenticateWith('totp', { auth_code: this.f.auth_code.value });
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
        this.signIn.resetSignInContext();
    }
}
