import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ApiService } from 'sb-shared-lib';
import { SignInService } from '../../../services/sign-in.service';
import { UserSignInInfo } from '../../../type';

@Component({
    selector: 'auth-signin',
    templateUrl: 'auth.signin.component.html',
    styleUrls: ['auth.signin.component.scss']
})
export class AuthSigninComponent implements OnInit {

    public form: FormGroup;
    public loading: boolean = false;
    public submitted: boolean = false;
    public signin_error: boolean = false;
    public server_error: boolean = false;

    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private api: ApiService,
        private signIn: SignInService
    ) {
        this.form = new FormGroup({});
    }

    // convenience getter for easy access to form fields
    public get f() {
        return this.form.controls;
    }

    public ngOnInit() {
        // setup the form
        this.form = <FormGroup>this.formBuilder.group({
            username: ['', [Validators.required]]
        });

        this.form.get('username').valueChanges.subscribe( () => {
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

        const username = this.f.username.value;

        try {
            const user_sign_in_info = await this.api.fetch('/?get=user_signin-info', { login: username }) as UserSignInInfo;

            // By setting user sign in info, the SignInService auto redirect to 'signin/passkey' or 'signin/password' to auth final step
            this.signIn.setUserSignInInfo(user_sign_in_info);
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
        this.router.navigate(['/recover/username']);
    }

    public onRegister() {
        this.router.navigate(['/signup']);
    }
}
