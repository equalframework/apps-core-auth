import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'sb-shared-lib';
import { SignInService } from './services/sign-in.service';

/*
    This is the component that is bootstrapped by app.module.ts
*/

@Component({
    selector: 'app-root',
    templateUrl: './app.root.component.html',
    styleUrls: ['./app.root.component.scss']
})
export class AppRootComponent implements OnInit {

    public ready: boolean = false;

    constructor(
        private auth: AuthService,
        private router: Router,
        private signIn: SignInService
    ) {}

    public async ngOnInit() {
        this.handleRedirectParam();

        await this.tryAuthenticate();
    }

    /**
     * Extract and set redirect_to in SignInService, it will be used to redirect the user when he is correctly authenticated
     */
    private handleRedirectParam(): void {
        let redirect_to: string|null = null;

        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.has('redirect_to')) {
            redirect_to = urlParams.get('redirect_to');
        }
        else {
            const hash = window.location.hash;

            const query_string_index = hash.indexOf('?');
            if (query_string_index !== -1) {
                const query_params = hash.substring(query_string_index + 1);
                const url_params = new URLSearchParams(query_params);

                redirect_to = url_params.get('redirect_to');
            }
        }

        if(redirect_to) {
            this.signIn.setRedirectTo(redirect_to);
        }
    }

    /**
     * Try to authenticate because maybe the access_token cookie is already set and valid
     */
    private async tryAuthenticate(): Promise<void> {
        try {
            console.log('trying to authenticate');
            await this.auth.authenticate();
            console.log('after authenticate');
        }
        catch(err) {
            // user is not authenticated : go to /signin or received route if hash is present
            try {
                let hash = window.location.hash;
                const route = hash.substring(2);
                if(!route.length) {
                    throw new Error('empty_hash');
                }
                this.router.navigate([route]);
            }
            catch(err) {
                // empty hash or non-existing route: default to /signin
                this.router.navigate(['/signin']);
            }
        }
        /**
         * Hide loader if:
         *   - trying to elevate privileges (AuthLevelComponent)
         *   - not authenticated yet
         */
        finally {
            this.ready = true;
        }
    }
}
