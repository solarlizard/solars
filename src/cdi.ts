import 'reflect-metadata';

let startCallback : () => void;

export function Bean(beanInterface: Function) {
    return (target: Function) => {
        let componentClassName = target.name;

        console.log("@" + Bean.name + " : " + componentClassName + " = " + beanInterface.name);

        checkAlreadyRegistered(beanInterface);

        componentPrototypeMap[componentPrototypeMapIndex.push(beanInterface.prototype) - 1] = new (<any> target);

        injectWaiters(beanInterface.name);
    }
}

export function Service(target: any, key: string, propertyDescriptor: PropertyDescriptor) {
    console.log("@" + Service.name + " : " + key + " = " + target.constructor.name);
    
    let serviceInteface = Reflect.getMetadata("design:returntype", target, key);

    checkAlreadyRegistered(serviceInteface);
    
    componentPrototypeMap[componentPrototypeMapIndex.push(serviceInteface.prototype) - 1] = propertyDescriptor.value.apply (new (<any> target.constructor));

    injectWaiters(serviceInteface.name);
}

export function Component(constructor: Function) {
    console.log("@" + Component.name + " : " + constructor.name);
    
    checkAlreadyRegistered(constructor);

    componentPrototypeMap[componentPrototypeMapIndex.push(constructor.prototype) - 1] = new (<any> constructor);

    injectWaiters(constructor.name);

}

export function Inject(target: any, key: string) {
    
    let entityClassName = target.constructor.name;

    let component: Function = Reflect.getMetadata("design:type", target, key);

    let log = ` : ${entityClassName}.${key} = ${component.name}`;

    let injectee = doLookup(component.prototype);

    if (injectee != null) {
        console.log(`@${Inject.name} [injected]${log}`);
        target[key] = lookup(component.prototype);
    }
    else {
        console.log(`@${Inject.name} [waiting]${log}`);
        let waiterList = componentWaitingMap[component.name];

        if (waiterList == null) {
            waiterList = [];
            componentWaitingMap[component.name] = waiterList;
        }

        waiterList.push(() => {
            console.log(`@${Inject.name} [injected]${log}`);
            target[key] = lookup(component.prototype);
        });
    }
}

export function lookup<SERVICE> (service : SERVICE) : SERVICE {
    let result = doLookup(service);
    
    if (result == null) {
        console.log(`${service} is not registerd`);
        process.exit(1);
    }
    else {
        return result;
    }
}

export function doLookup<SERVICE> (service : SERVICE) : SERVICE {
    return <SERVICE> componentPrototypeMap[componentPrototypeMapIndex.indexOf(service)];
}

export function register (component : Object) {
    console.log("@Register : " + component.constructor.name);
    
    checkAlreadyRegistered(component.constructor);
    
    componentPrototypeMap[componentPrototypeMapIndex.push(component.constructor.prototype) - 1] = component;

    injectWaiters(component.constructor.name);
}

export function start (callback : ()=> void) {
    for (let name in componentWaitingMap) {
        startCallback = callback;
        return;
    }
    callback ();
}

interface ComponentWaiter {
    (): void
}

let componentPrototypeMapIndex : any [] = [];
let componentPrototypeMap: {[index: number]: Object;} = {};

let componentWaitingMap: {[name: string]: ComponentWaiter[]} = {};

function isReady(): boolean {
    for (let name in componentWaitingMap) {
        return false;
    }

    return true;
}

function injectWaiters(name: string) {

    let waiterList = componentWaitingMap[name];

    if (waiterList != null) {
        for (let waiter of waiterList) {
            waiter();
        }

        delete componentWaitingMap[name];
    }
    
    if (isReady() && startCallback) {
        startCallback();
    }
}

function checkAlreadyRegistered (bean : Function) {
    if (componentPrototypeMapIndex.indexOf(bean.prototype) > 0) {
        console.error(bean.name + " is already registerd");
        process.exit(1);
    }
}