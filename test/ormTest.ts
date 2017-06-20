import {assert} from "chai";

import thread = require ("./../src/thread");

import {Transactional} from "./../src/transaction";
import {Inject} from "./../src/cdi";
import {EntityManager} from "./../src/orm";
import {Bean} from "./../src/cdi";
import {PooledDatasource} from "./../src/datasource";
import {Datasource} from "./../src/datasource";
import {Connection} from "./../src/datasource";
import {Entity} from "./../src/orm";
import {Field} from "./../src/orm";
import {Id} from "./../src/orm";

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

let sequence = 0;

async function sequenceGenerator () : Promise<number> {
    return sequence++;
}

@Entity ("PARENT")
export class ParentEntity {
    
    @Id(sequenceGenerator)
    @Field ("RECORD_ID")
    public recordId : number;
    
    @Field ("NAME")
    public name : string;
}

@Entity ("CHILD")
export class ChildEntity {
    
    @Id(sequenceGenerator)
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
    public async testSelect () {
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
        {
            let parentEntity = await this.entityManager.get(ParentEntity.prototype, 1);
            assert.equal((await this.entityManager.select("SELECT * FROM CHILD WHERE RECORD_ID_PARENT = $1", ChildEntity.prototype, [parentEntity])).length, 1);
        }
    }
    
    @Transactional
    public async testUpdate () {
        let childEntity = await this.entityManager.get(ChildEntity.prototype, 1);
        
        childEntity.name = 'newName';
        
        assert.equal((await this.entityManager.get(ChildEntity.prototype, 1)).name,'newName');
    }
    
    @Transactional
    public async testInsert () {
        let childEntity = new ChildEntity ();
        childEntity.name = 'newName';
        childEntity.parent = await this.entityManager.get(ParentEntity.prototype,1);
        
        let result = await this.entityManager.merge(childEntity);
        
        assert.equal((await this.entityManager.get(ChildEntity.prototype, result.recordId)).name,'newName');
    }
}

let tester = new Tester ();

describe ('orm', ()=> {
    it ('get', (done)=> {
        thread.runThread(async ()=> {
            try {
                await tester.testSelect();
                done ();
            }
            catch (err) {
                done (new Error (err));
                console.log(err);
            }
        })
    });
    it ('update', (done)=> {
        thread.runThread(async ()=> {
            try {
                await tester.testUpdate();
                done ();
            }
            catch (err) {
                done (new Error (err));
                console.log(err);
            }
        })
    });
    it ('insert', (done)=> {
        thread.runThread(async ()=> {
            try {
                await tester.testInsert();
                done ();
            }
            catch (err) {
                done (new Error (err));
                console.log(err);
            }
        })
    });
})
