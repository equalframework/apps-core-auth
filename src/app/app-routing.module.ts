import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { AuthSigninComponent } from './app/auth/signin/auth.signin.component';
import { AuthSigninPasswordComponent } from './app/auth/signin/password/auth.signin.password.component';
import { AuthSigninPasskeyComponent } from './app/auth/signin/passkey/auth.signin.passkey.component';
import { AuthSigninPasskeyCreateFirstComponent } from './app/auth/signin/passkey-create-first/auth.signin.passkey-create-first.component';
import { AuthRecoverPasswordComponent } from './app/auth/recover/password/auth.recover.password.component';
import { AuthRecoverUsernameComponent } from './app/auth/recover/username/auth.recover.username.component';
import { AuthResetComponent } from './app/auth/reset/auth.reset.component';
import { AuthSignupComponent } from './app/auth/signup/auth.signup.component';
import { AuthSignupSentComponent } from './app/auth/signup/sent/auth.signup.sent.component';

const routes: Routes = [
    /* routes specific to current app */
    {
        path: 'signup',
        component: AuthSignupComponent
    },
    {
        path: 'signup/sent',
        component: AuthSignupSentComponent
    },
    {
        path: 'signin',
        component: AuthSigninComponent
    },
    {
        path: 'signin/password',
        component: AuthSigninPasswordComponent
    },
    {
        path: 'signin/passkey',
        component: AuthSigninPasskeyComponent
    },
    {
        path: 'signin/passkey-create-first',
        component: AuthSigninPasskeyCreateFirstComponent
    },
    {
        path: 'recover/password',
        component: AuthRecoverPasswordComponent
    },
    {
        path: 'recover/username',
        component: AuthRecoverUsernameComponent
    },
    {
        path: 'reset/:token',
        component: AuthResetComponent
    }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, onSameUrlNavigation: 'reload', useHash: true})
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
