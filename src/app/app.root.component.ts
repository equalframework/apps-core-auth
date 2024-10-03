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
        const urlParams = new URLSearchParams(window.location.search);

        if(urlParams.has('redirect_to')) {
            this.signIn.setRedirectTo(<string> urlParams.get('redirect_to'));
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
            // user is not authenticated : hide loader and go to /signin or received route if hash is present
            this.ready = true;
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
    }
}
