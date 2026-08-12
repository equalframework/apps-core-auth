export interface UserSignInInfo {
    username: string;
    allowed_methods: ('password'|'passkey')[];
    allowed_creations: ('passkey'|'totpkey')[];
    methods_data: any,
    user_data: {
        has_passkey: boolean,
        has_totpkey: boolean,
        factors?: any[]
    }
}
