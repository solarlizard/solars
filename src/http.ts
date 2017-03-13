import thread = require ("./thread");

import { Request } from "hapi";

import { Bean } from "./cdi";

export abstract class HttpRequest {
    abstract getHeader (name : string ) : string;
}

export function startHttp (request : Request) {
    let httpRequest: HttpRequest = {
        getHeader (name : string) : string {
            return request.headers[name];
        }
    }
    thread.setThread(HttpRequest.name, httpRequest);
}

@Bean(HttpRequest)
class HttpRequestBean implements HttpRequest {
    
    getHeader (name : string ) : string {
        return thread.getThread<HttpRequest>(HttpRequest.name).getHeader(name);
    }
}