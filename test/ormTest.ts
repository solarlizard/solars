import {assert} from "chai";

import thread = require ("./../src/thread");

import {Transaction} from "./../src/transaction";
import {Transactional} from "./../src/transaction";
import {Inject} from "./../src/cdi";
import {EntityManager} from "./../src/orm";
import {Bean} from "./../src/cdi";
import {PooledDatasource} from "./../src/datasource";
import {Datasource} from "./../src/datasource";
import {Connection} from "./../src/datasource";
import {Entity} from "./../src/orm";
import {Field} from "./../src/orm";

import {suite, test} from "mocha-typescript";

import {Database} from "sqlite3";

@Bean (Datasource)
class DatasourceBean extends PooledDatasource {

    constructor () {
        super ({
            maxPoolQuantity : 1,
            createConnection :  () => {
                return new Promise<Connection> ((resolve : (connection : Connection)=> void, reject : (err : Error)=> void) => {
                    let db = new Database(':memory:'); 
                    db.exec(`
            CREATE TABLE PARENT (
                    RECORD_ID   INTEGER PRIMARY KEY ASC
                ,   NAME        TEXT
            );
            CREATE TABLE CHILD (
                    RECORD_ID INTEGER   PRIMARY KEY ASC
                ,   RECORD_ID_PARENT    INTEGER
                ,   NAME                TEXT
            );
            INSERT INTO PARENT (RECORD_ID, NAME) VALUES (1, 'parent');
            INSERT INTO CHILD  (RECORD_ID, RECORD_ID_PARENT, NAME) VALUES (1, 1, 'child');

            `       , (err : Error)=> {        
                        if (err) {
                            reject (err);
                        }
                        else {
                            resolve ({
                                update : (sql : string, args : any []) => {
                                    return new Promise ((resolve : (result : number)=> void, reject : (err : Error)=> void)=> {
                                        let statement = db.prepare(sql, args, (err : Error)=> {
                                            if (err) {
                                                reject (err);
                                            }
                                            else {
                                                statement.run((err : Error)=> {
                                                    if (err) {
                                                        reject(err);
                                                    }
                                                    else {
                                                        resolve (0);
                                                    }
                                                });
                                            }
                                        });
                                    });
                                },
                                select : (sql : string, args : any []) : Promise<Object []> => {
                                    return new Promise((resolve : (result : Object [])=> void, reject : (err : Error)=> void)=> {
                                        let result : Object [] = [];

                                        db.each(sql, args, (err: Error, row: any) => {
                                            if (err) {
                                                reject (err);
                                            }
                                            else {
                                                result.push(row);
                                            }
                                        }, 
                                        (err: Error, count: number) => {
                                            resolve(result);
                                        });
                                    });
                                },
                                commit : async ()=> {
                                },
                                rollback : async ()=> {
                                },
                                close : async () => {
                                }
                            });
                        }
                    });
                });
            }
        });

    }
}

@Entity ("PARENT")
export class ParentEntity {
    
    @Field ("RECORD_ID")
    public recordId : number;
    
    @Field ("NAME")
    public name : string;
}

@Entity ("CHILD")
export class ChildEntity {
    
    @Field ("RECORD_ID")
    public recordId : number;
    
    @Field ("RECORD_ID_PARENT")
    public parent : ParentEntity;
    
    @Field ("NAME")
    public name : string;
}

class Tester {
    
    @Inject
    private entityManager : EntityManager;
    
    @Transactional
    public async test () {
        {
            let childEntity = await this.entityManager.get(ChildEntity.prototype, 1);
            assert.equal(childEntity.recordId, 1);
            assert.equal(childEntity.name, 'child');

            {
                let parentEntity = await childEntity.parent;
                assert.equal(parentEntity.recordId, 1);
                assert.equal(parentEntity.name, 'parent');
            }
            {
                let parentEntity = await childEntity.parent;
                assert.equal(parentEntity.recordId, 1);
                assert.equal(parentEntity.name, 'parent');
            }
        }
        {
            let childEntity = await this.entityManager.getWhere(ChildEntity.prototype, ["name", "child", "parent", await this.entityManager.get(ParentEntity.prototype, 1)]);
            assert.equal(childEntity.recordId, 1);
            assert.equal(childEntity.name, 'child');
        }
    }
}

let tester = new Tester ();

describe ('orm', ()=> {
    it ('get', (done)=> {
        thread.runThread(async ()=> {
            try {
                await tester.test();
                done ();
            }
            catch (err) {
                done (new Error (err));
                console.log(err);
            }
        })
    });
})


/*
@suite class ormTest {
    
    @Inject
    private entityManager : EntityManager;
    
    @test
    async testGet() {
        thread.runThread(async ()=> {
            await this._testGet();
        });
    }
    
    @test
    async testSelectWhere() {
        thread.runThread(async ()=> {
            await this._testSelectWhere();
        });
    }
    
    @Transactional
    async _testGet () {
        try {
            let childEntity = await this.entityManager.get(ChildEntity.prototype, 1);
            assert.equal(childEntity.recordId, 1);
            assert.equal(childEntity.name, 'child');

            //let parentEntity = await childEntity.parent;
            //assert.equal(parentEntity.recordId, 1);
            //assert.equal(parentEntity.name, 'parent');

            //await childEntity.parent;
        }
        catch (err) {
            console.log(err);
        }
    }
    
    @Transactional
    async _testSelectWhere () {
        
        //let parentEntity = await this.entityManager.get(ParentEntity.prototype, 1);
        
        //let childEntity = (await this.entityManager.selectWhere(ChildEntity.prototype, ["name",'child','parent', parentEntity])) [0];
        
        //assert.equal(childEntity.recordId, 1);
        //assert.equal(childEntity.name, 'child');
    }
}
*/