import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from 'sb-shared-lib';
import { SignInService } from '../../../../services/sign-in.service';
import { UserSignInInfo } from '../../../../type';

@Component({
    selector: 'auth-signin-password',
    templateUrl: 'auth.signin.password.component.html',
    styleUrls: ['auth.signin.password.component.scss']
})
export class AuthSigninPasswordComponent implements OnInit {

    public form: FormGroup;
    public loading: boolean = false;
    public submitted: boolean = false;
    public hidepass: boolean = true;
    public signin_error: boolean = false;
    public server_error: boolean = false;
    public user_sign_in_info: UserSignInInfo|null = null;

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

        this.setUpForm();
    }

    private setUpForm() {
        this.form = <FormGroup>this.formBuilder.group({
            password: ['', Validators.required]
        });

        this.form.get('password').valueChanges.subscribe( () => {
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
            const data = await this.auth.signIn(this.user_sign_in_info.username, this.f.password.value);

            if(this.user_sign_in_info && !this.user_sign_in_info.has_passkey && this.user_sign_in_info.propose_first_passkey_creation) {
                this.router.navigate(['signin/passkey-create-first']);
            }
            else {
                // success: we should be able to authenticate
                this.auth.authenticate();
                // SignIn service should now redirect to /apps
            }
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

    public onRecover() {
        this.router.navigate(['/recover/password']);
    }

    public onSwitchUser() {
        // By setting user sign in info to null, the SignInService auto redirect to 'signin' to re-enter login
        this.signIn.setUserSignInInfo(null);
    }
}
