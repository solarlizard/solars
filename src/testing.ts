import thread = require("./thread");

let suite : (()=>void) [] = [];

export function run () {
    for (let test of suite) {
        test ();
    }
}

export function Test(target: any, methodName: string, descriptor: PropertyDescriptor) {

    console.log(`@${Test.name} : ${target.constructor.name}.${methodName}`);

    suite.push(()=> {
        it (`${target.constructor.name}.${methodName}`, (done)=> {
            thread.runThread(async ()=> {
                try {
                    await descriptor.value.apply(new (<any>target.constructor));
                    done ();
                }
                catch (err) {
                    done (new Error (err));
                }
            });
        });    
    });

    return {
        value : descriptor.value
    };
}