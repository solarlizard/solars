import cls = require("continuation-local-storage");

let ns = cls.createNamespace('com.solarlizard.application');

export function isActive () {
    return ns.active;
}

export function runThread<RESULT>(cb: () => RESULT) : RESULT {
    return ns.runAndReturn(cb)
}

export function setThread<RESULT>(key: string, value: RESULT): RESULT {
    ns.set(key, value);

    return value;
}

export function getThread<RESULT>(key: string): RESULT {
    return ns.get(key);
}
