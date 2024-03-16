import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'sb-shared-lib';

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
    public redirect_to: string = '/apps';

    constructor(private auth: AuthService, private router: Router) {}

    public async ngOnInit() {
        // retrieve redirect_to param, if provided
        const urlParams = new URLSearchParams(window.location.search);

        if(urlParams.has('redirect_to')) {
            this.redirect_to = decodeURIComponent(<string> urlParams.get('redirect_to'));
        }

        // listen to authentication events
        this.auth.getObservable().subscribe( (user:any) => {
            if(user.hasOwnProperty('id') && user.id > 0) {
                // user is authenticated : redirect go target page (Apps)
                window.location.href = this.redirect_to;
            }
        });

        // request authentication
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