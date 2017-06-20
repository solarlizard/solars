import { Bean } from "./cdi";
import { Inject } from "./cdi";

import { Transaction } from "./transaction";

export interface Generator {
    (table : string) : Promise<number>;
};

export function Entity(table : string) {
    return (constructor: Function) => {
        console.log("@" + Entity.name + " : " + constructor.name + " -> " + table);
        
        let entityDefinition = createDefinition(constructor, table);
        
        entityDefinitionMap[constructor.name] = entityDefinition;
        entityPrototypeNameMap[entityPrototypeNameMapIndex.push(constructor.prototype) - 1] = constructor.name;
    }
    
    function createDefinition (constructor: Function, table : string) {
        let result = new EntityDefinition ();
        
        result.cons = constructor;
        result.table = table;
        result.prototype = constructor.prototype;
        
        for (let fieldDefinition of entityClassFieldListMap[constructor.name]) {
            result.fieldMap[fieldDefinition.name] = fieldDefinition;
            fieldDefinition.generator = entityClassFieldIdListMap[constructor.name + "." + fieldDefinition.name];
        }
        
        return result;
    }
}

export function Field (column : string) {
    return (target: any, field: string)=> {
        console.log("@" + Field.name + " : " + target.constructor.name + "." + field + " -> " + column);
        
        getList(target).push(createDefinition(target, column, field));
    }
    
    function getList(target : any): FieldDefinition [] {
        let result = entityClassFieldListMap[target.constructor.name];
        
        if (result == null) {
            result = [];
            entityClassFieldListMap[target.constructor.name] = result;
        }
        
        return result;
    } 
    
    function getJoinedType (target : any, field : string) : Function {
        let fieldType : Function = Reflect.getMetadata("design:type", target, field);
        
        if (fieldType.name.endsWith("Entity")) {
            return fieldType;
        }
        else {
            return null;
        }
    }
    
    function createDefinition (targe : any, column : string, field : string) {
        let result = new FieldDefinition ();
        
        result.column = column;
        result.name = field;
        result.join = getJoinedType(targe, field);
        
        return result;
    }
}

export function Id (generator : Generator) {
    return (target: any, field: string)=> {
        console.log("@" + Id.name + " : " + target.constructor.name + "." + field + " -> " + generator["name"]);
        entityClassFieldIdListMap[target.constructor.name + "." + field] = generator;
    }
}

export abstract class EntityManager {
    abstract selectWhere<ENTITY>(entity: ENTITY, nameValue : any []) : Promise<ENTITY []>
    
    abstract selectNative<ENTITY>(query : string, entity: ENTITY, args : any[]) : Promise<ENTITY []>
    
    abstract select<ENTITY>(query : string, entity: ENTITY, args : any[]) : Promise<ENTITY []>
    
    abstract get<ENTITY>(entity: ENTITY, recordId : number) : Promise<ENTITY>
    
    abstract getWhere<ENTITY>(entity: ENTITY, nameValue : any[]) : Promise<ENTITY>
    
    abstract merge<ENTITY> (entity : ENTITY) : Promise<ENTITY>;
    
    abstract remove (entity : any) : Promise<void>;
    
    abstract flush () : Promise<void>;
}

export class RecordNotFoundException {
}

const entityClassFieldListMap : {[entityClassName: string]: FieldDefinition[]; } = {};
const entityClassFieldIdListMap : {[entityClassName: string]: Generator; } = {};
const entityDefinitionMap: {[entityName: string]: EntityDefinition; } = {};

const entityPrototypeNameMapIndex : any [] = [];
const entityPrototypeNameMap : {[entityPrototypeIndex: number]: string; } = {};

const transactionStoreMap : {[transactionId: string]: TransactionStore; } = {};

const RECORD_ID_FIELD = "recordId";
const RECORD_ID_COLUMN = "RECORD_ID";

@Bean(EntityManager)
class EntityManagerBean implements EntityManager {
    
    @Inject
    private transaction : Transaction;
    
    public async selectWhere<ENTITY>(entity: ENTITY, nameValue : any[]) : Promise<ENTITY []> {
        let entityDefinition = entityDefinitionMap[entityPrototypeNameMap[entityPrototypeNameMapIndex.indexOf(entity)]];
        
        let query = "SELECT * FROM " + entityDefinition.table;
        
        let args : Object [] = [];
        
        for (let q = 0; q < nameValue.length; q+=2) {
            if (q == 0) {
                query += " WHERE "
            }
            else {
                query += " AND "
            }
            
            let value = nameValue [q+1];
            
            if (value[RECORD_ID_FIELD] != null) {
                args.push(value[RECORD_ID_FIELD]);
            }
            else {
                args.push(value);
            }
            
            query += entityDefinition.fieldMap[nameValue[q]].column + " = $" + args.length;
        }
        return await this.selectNative(query, entity, args);
    }
    
    public async select<ENTITY>(query : string, entity: ENTITY, args : any[]) : Promise<ENTITY []> {
        
        await this.flush();

        let nativeQuery = query;
        let nativeArgs = args;
        
        for (let argIndex in nativeArgs) {
            if (nativeArgs[argIndex][RECORD_ID_FIELD]) {
                nativeArgs[argIndex] = nativeArgs[argIndex][RECORD_ID_FIELD]; 
            }
        }
        
        return await this.selectNative(nativeQuery, entity, nativeArgs);
    }
    
    public async selectNative<ENTITY>(query : string, entity: ENTITY, args : any[]) : Promise<ENTITY []> {
        
        await this.flush();
        
        let entityDefinition = entityDefinitionMap[entityPrototypeNameMap[entityPrototypeNameMapIndex.indexOf(entity)]];

        let result : ENTITY [] = [];

        for (let record of await this.transaction.select(query, args)) {
            let entity = new (<any>entityDefinition.cons);
            
            for (let column in record) {
                record[column.toUpperCase()] = record[column];
            }
            
            for (let fieldName in entityDefinition.fieldMap) {
                let fieldDefinition = entityDefinition.fieldMap[fieldName];
    
                entity[fieldName] = record[fieldDefinition.column.toUpperCase()];
            }

            result.push(this.manageEntity(entity));

        }
        
        return result;
    }
    
    public async get<ENTITY>(entity: ENTITY, recordId : number) : Promise<ENTITY> {
        return await this.getWhere(entity, [RECORD_ID_FIELD, recordId]);
    }
    
    public async getWhere<ENTITY>(entity: ENTITY, nameValue : Object []) : Promise<ENTITY> {
        let entityList = await this.selectWhere(entity, nameValue);
        
        if (entityList.length == 0) {
            throw new RecordNotFoundException ();
        }
        else if (entityList.length > 1){
            throw "More than one record was returned";
        }
        else {
            return entityList[0];
        }
    }
    
    public async remove (entity : any){
        await this.flush();
        await this.transaction.update(`DELETE FROM ${entityDefinitionMap[entity.constructor.name].table} WHERE ${RECORD_ID_COLUMN} = $1`, entity[RECORD_ID_FIELD]);
    }
    
    public async merge<ENTITY> (entity : ENTITY) : Promise<ENTITY> {
        let entityDefinition = entityDefinitionMap[entity.constructor.name];
        
        if ((<any>entity)[RECORD_ID_FIELD] == null) {
            (<any> entity)[RECORD_ID_FIELD] = await entityDefinition.fieldMap[RECORD_ID_FIELD].generator(entityDefinition.table);
            
            return this.getTransactionStore().registerModification(this.manageEntity(entity), MODIFY.INSERT);
        }
        else {
            return entity;
        }
    }
    
    public async flush () {
        let transactionStore = this.getTransactionStore();
        
        for (let entityModification of transactionStore.list ()) {
            let entityDefinition = entityDefinitionMap[entityModification.entity.constructor.name];
            
            if (entityModification.modification == MODIFY.UPDATE) {
                await this.doUpdate(entityDefinition, entityModification);
            }
            else if (entityModification.modification == MODIFY.INSERT) {
                await this.doInsert(entityDefinition, entityModification);
            }
        }
        
        transactionStore.clear();
    }
    
    private async doUpdate(entityDefinition: EntityDefinition, entityModification: EntityModification) {
        let query = `UPDATE ${entityDefinition.table} SET `;

        let args = [];

        for (let fieldName in entityDefinition.fieldMap) {
            if (fieldName != RECORD_ID_FIELD) {
                let field = entityDefinition.fieldMap[fieldName];

                args.push(entityModification.entity["_" + fieldName]);

                if (args.length > 1) {
                    query += ", ";
                }
                query += `${field.column} = $${args.length}`;
            }
        }

        args.push(entityModification.entity.recordId);

        query += ` WHERE RECORD_ID = $${args.length}`;

        await this.transaction.update(query, args);
    }
    
    private async doInsert (entityDefinition: EntityDefinition, entityModification: EntityModification) {

        let query = `INSERT INTO ${entityDefinition.table} (`;

        let useComa = false;
        let args = [];

        for (let fieldName in entityDefinition.fieldMap) {
            let field = entityDefinition.fieldMap[fieldName];

            if (field.join == null) {
                args.push(entityModification.entity["_" + fieldName]);
            }
            else {
                args.push(entityModification.entity["_" + fieldName]);
            }

            if (useComa) {
                query += ", ";
            }
            useComa = true;
            query += `${field.column}`;
        }

        query += `) VALUES (`;

        for (let q = 1; q <= args.length; q++) {
            if (q > 1) {
                query += ", ";
            }
            useComa = true;
            query += "$" + q;
        }

        query += ")";

        await this.transaction.update(query, args);
    }
    
    private manageEntity<ENTITY>(entity: ENTITY) : ENTITY {

        if (this.getTransactionStore().isManaged(entity)) {
            return entity;
        }
        else {
            return this.doManage(entity);
        }
    }
    
    private doManage<ENTITY>(entity: ENTITY) : ENTITY {

        let entityDefinition = entityDefinitionMap[entity.constructor.name];

        for (let fieldName in entityDefinition.fieldMap) {
            this.manageField(entity, entityDefinition.fieldMap[fieldName]);
        }

        return this.getTransactionStore().manage(entity);
    }
    
    private manageField(entity: any, field: FieldDefinition) {
        
        if (field.join != null) {
            if (entity[field.name] != null) {
                if (entity[field.name][RECORD_ID_FIELD] == null) {
                    entity["_" + field.name + "_join"] = null;
                    entity["_" + field.name] = entity[field.name];
                }
                else {
                    entity["_" + field.name + "_join"] = entity[field.name];
                    entity["_" + field.name] = entity[field.name][RECORD_ID_FIELD];
                }
            }
            else {
                entity["_" + field.name + "_join"] = null;
                entity["_" + field.name] = null;
            }
        }
        else {
            entity["_" + field.name] = entity[field.name];
        }

        delete entity[field.name];

        Object.defineProperty(entity, field.name, {
            get: () => {
                let value = entity["_" + field.name];
                
                if (field.join) {
                    return new Promise<Object> (async (resolve : (result : Object)=> void, reject : (err : Error) => void) => {
                        let joinedValue = entity["_" + field.name + "_join"];
                        
                        if (value != null && joinedValue == null) {
                            try {
                                joinedValue = await this.get(field.join.prototype, value);
                                
                                entity["_" + field.name + "_join"] = joinedValue;

                                entity["_" + field.name] = joinedValue.recordId;

                                resolve(joinedValue);
                            }
                            catch (ex) {
                                reject (ex);
                            }
                        }
                        else {
                            resolve(joinedValue);
                        }
                    });
                }
                else {
                    return value;
                }
            },
            set: (newValue : any) => {
                if (field.join) {
                    if (newValue == null) {
                        entity["_" + field.name + "_join"] = null;
                        entity["_" + field.name] = null;
                    }
                    else {
                        console.log(newValue);
                        entity["_" + field.name + "_join"] = newValue;
                        entity["_" + field.name] = newValue.recordId;
                    }
                }
                else {
                    entity["_" + field.name] = newValue;
                }
                
                this.getTransactionStore().registerModification(entity, MODIFY.UPDATE);
            },
            enumerable: true,
            configurable: true
        });
    }
    
    private getTransactionStore(): TransactionStore {
        let result = transactionStoreMap[this.transaction.getId()];

        if (result == null) {
            result = this.createTransactionStore();
            transactionStoreMap[this.transaction.getId()] = result;
        }

        return result;
    }
    
    private createTransactionStore () {
        let result = new TransactionStore ();
        
        this.transaction.addListener({
            finished : async () => {
                delete transactionStoreMap[this.transaction.getId()];
            },
            beforeCommit : async () => {
                await this.flush();
            } 
        });
        
        
        return result;
    }
}

enum MODIFY {
    INSERT = <any>"INSERT",
    UPDATE = <any>"UPDATE"
}

interface EntityModification {
    entity : any,
    modification : MODIFY;
}

class TransactionStore {
    
    private static IS_MANAGED = "_isManaged";
    private static IS_MODIFIED = "_isModified";
    
    private modificationList : EntityModification [] = [];
    
    public registerModification<ENTITY> (entity : ENTITY, modification : MODIFY) : ENTITY {
        if (!this.isModified(entity)) {
            this.modificationList.push({
                entity: entity,
                modification: modification
            });
            
            entity[TransactionStore.IS_MODIFIED] = true;
        }
        
        return entity;
    } 
    
    public isManaged (entity : any) {
        return entity[TransactionStore.IS_MANAGED] != null;
    }
    
    public isModified (entity : any) {
        return entity[TransactionStore.IS_MODIFIED] != null;
    }
    
    public manage<ENTITY> (entity : ENTITY) : ENTITY {
        if (!this.isManaged(entity)) {
            entity[TransactionStore.IS_MANAGED] = true;
        }
        
        return entity;
    }
    
    public list () : EntityModification [] {
        return this.modificationList;
    }
    
    public clear () {
        this.modificationList = [];
    }
    
}

class FieldDefinition {
    public generator : Generator;
    public column : string;
    public name : string;
    public join : Function;
}

class EntityDefinition {
    public prototype : any;
    public cons : Function;
    public table : string;
    public fieldMap : { [key: string]: FieldDefinition; } = {};
}