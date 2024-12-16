import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { AuthService } from 'sb-shared-lib';
import { UserSignInInfo } from '../type';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SignInService {

    private redirect_to: string = '/apps';
    public user_sign_in_info$ = new BehaviorSubject<UserSignInInfo|null>(null);
    private user_sign_in_info: UserSignInInfo|null = null;

    constructor(
        private auth: AuthService,
        private router: Router
    ) {
        this.user_sign_in_info$.subscribe((user_sign_in_info) => {
            this.redirectIfSignInRoute(user_sign_in_info);
            this.user_sign_in_info = user_sign_in_info;
        });

        this.auth.getObservable().subscribe((user: any) => {
            const is_user_authenticated = user?.id > 0;
            const should_not_propose_to_create_passkey =
                this.user_sign_in_info === null || this.user_sign_in_info.has_passkey || !this.user_sign_in_info.passkey_creation;

            if(is_user_authenticated && should_not_propose_to_create_passkey) {
                this.redirectAfterAuthenticate();
            }
        });

        this.router.events.subscribe(event => {
            if(event instanceof NavigationEnd) {
                const current_url = event.url;
                const does_current_component_need_user_sign_in_info =
                    ['/signin/password', '/signin/passkey', '/signin/passkey-create-first'].includes(current_url);

                if(does_current_component_need_user_sign_in_info && !this.user_sign_in_info) {
                    this.router.navigate(['/signin'])
                }
            }
        });
    }

    /**
     * Redirects user:
     *   - to "signin" route                              -> if user has not entered his/her username and tries to access password or passkey pages
     *   - to "signin/passkey" route                      -> if user has entered his/her username and has a passkey
     *   - to "signin/password" route                     -> if user has entered his/her username and hasn't a passkey
     *  Only redirects if the current route is related to signin (not recover, register, ...)
     */
    private redirectIfSignInRoute(user_sign_in_info: UserSignInInfo|null) {
        let hash = window.location.hash;
        const route = hash.substring(2);
        if(!route.length || route.startsWith('signin')) {
            if(user_sign_in_info === null) {
                this.router.navigate(['/signin']);
            }
            else {
                this.router.navigate([
                    user_sign_in_info.has_passkey ? '/signin/passkey' : '/signin/password'
                ]);
            }
        }
    }

    public setRedirectTo(redirect_to: string) {
        this.redirect_to = redirect_to;
    }

    public redirectAfterAuthenticate() {
        window.location.href = this.redirect_to;
    }

    public setUserSignInInfo(user_sign_in_info: UserSignInInfo) {
        this.user_sign_in_info$.next(user_sign_in_info);
    }

    public recursiveBase64StrToArrayBuffer(obj: any) {
        let prefix = '=?BINARY?B?';
        let suffix = '?=';
        if (typeof obj === 'object') {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    let str = obj[key];
                    if (str.substring(0, prefix.length) === prefix && str.substring(str.length - suffix.length) === suffix) {
                        str = str.substring(prefix.length, str.length - suffix.length);

                        let binary_string = window.atob(str);
                        let len = binary_string.length;
                        let bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++)        {
                            bytes[i] = binary_string.charCodeAt(i);
                        }
                        obj[key] = bytes.buffer;
                    }
                } else {
                    this.recursiveBase64StrToArrayBuffer(obj[key]);
                }
            }
        }
    }

    public arrayBufferToBase64(buffer: any) {
        let binary = '';
        let bytes = new Uint8Array(buffer);
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode( bytes[ i ] );
        }
        return window.btoa(binary);
    }
}
