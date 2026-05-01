import { NgModule, LOCALE_ID } from '@angular/core';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatNativeDateModule, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Platform, PlatformModule } from '@angular/cdk/platform';

import { SharedLibModule, AuthInterceptorService } from 'sb-shared-lib';

import { AppRoutingModule } from './app-routing.module';
import { AppRootComponent } from './app.root.component';

/* HTTP requests interception dependencies */
import { HTTP_INTERCEPTORS } from '@angular/common/http';


import { AuthRecoverPasswordComponent } from './app/auth/recover/password/auth.recover.password.component';
import { AuthRecoverUsernameComponent } from './app/auth/recover/username/auth.recover.username.component';
import { AuthSigninComponent } from './app/auth/signin/auth.signin.component';
import { AuthSigninPasswordComponent } from './app/auth/signin/password/auth.signin.password.component';
import { AuthSigninPasskeyComponent } from './app/auth/signin/passkey/auth.signin.passkey.component';
import { AuthSigninPasskeyCreateFirstComponent } from './app/auth/signin/passkey-create-first/auth.signin.passkey-create-first.component';
import { AuthLevelComponent } from './app/auth/level/auth.level.component';
import { AuthResetComponent } from './app/auth/reset/auth.reset.component';
import { AuthSignupComponent } from './app/auth/signup/auth.signup.component';
import { AuthSignupSentComponent } from './app/auth/signup/sent/auth.signup.sent.component';

@NgModule({
    declarations: [
        AppRootComponent,
        AuthRecoverPasswordComponent,
        AuthRecoverUsernameComponent,
        AuthSigninComponent,
        AuthSigninPasswordComponent,
        AuthSigninPasskeyComponent,
        AuthSigninPasskeyCreateFirstComponent,
        AuthLevelComponent,
        AuthResetComponent,
        AuthSignupComponent,
        AuthSignupSentComponent
    ],
    imports: [
        AppRoutingModule,
        BrowserModule,
        BrowserAnimationsModule,
        SharedLibModule,
        MatNativeDateModule,
        PlatformModule,
    ],
    providers: [
        // add HTTP interceptor to inject AUTH header to any outgoing request
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptorService, multi: true },
    ],
    bootstrap: [AppRootComponent]
})
export class AppModule { }
