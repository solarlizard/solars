import cdi = require ("./cdi");
import thread = require ("./thread");

import { Bean } from "./cdi";
import { Autowire } from "./cdi";

export class AccessDeniedException {}
export class NotAuthorisedException {}

export function Secured (role : string) {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        console.log(`@Secured : ${target.constructor.name}.${methodName} = "${role}"`);

        return {
            value: async function (...args: any[]) {
                let principal = <Principal>cdi.lookup (Security.prototype).getPrincipal();

                if (principal == null || !principal.hasRole(role)) {
                    throw new AccessDeniedException ();
                }
                else {
                    return await descriptor.value.apply(this, args);
                }
            }
        };
    }
}

export class Principal {
    private roleList : string [] = [];
    
    constructor (...roleList : string []){
        this.roleList = roleList;
    }
    
    public hasRole (role : string) {
        return this.roleList.indexOf(role) >= 0;
    }
}

export abstract class Security<PRINCIPAL extends Principal> {
    abstract getPrincipal (): PRINCIPAL;
}
/*
export abstract class LoginService<PRINCIPAL extends Principal> {
    abstract async login (login : string, password : string) : Promise<Principal>
}

export abstract class SecurityManager<PRINCIPAL extends Principal> {
    abstract async getPrincipal () : Promise<PRINCIPAL>;
}

export abstract class SecurityManagerBase<PRINCIPAL extends Principal> implements SecurityManager<PRINCIPAL> {
    @Inject
    private sessionStore : SessionStore<PRINCIPAL>;
    
    @Inject
    private loginService : LoginService<PRINCIPAL>;
    
    async getPrincipal () {
        return null;
    }
    
    abstract async getCode (headerList : {[code: string]: string;}) : Promise<string>;
}

export abstract class SessionStore<PRINCIPAL extends Principal> {
    async abstract getPrincipal (code : string) : Promise<PRINCIPAL>;
    async abstract kill (code : string) : Promise<void>;
}

export class MemorySessionStore<PRINCIPAL extends Principal> implements SessionStore<PRINCIPAL> {
    
    private store: {[code: string]: PRINCIPAL;} = {};
    
    async getPrincipal(code: string) {
        return this.store [code];
    }
    
    async kill (code : string) {
        delete this.store[code];
    }
}
*/

export function setPrincipal (principal : Principal) {
    thread.setThread(Principal.name, principal);
}

@Bean(Security)
class SecurityBean<PRINCIPAL extends Principal> implements Security<PRINCIPAL> {
    
    public getPrincipal () : PRINCIPAL {
        return <PRINCIPAL>thread.getThread(Principal.name);
    }
}

