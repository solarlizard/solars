import thread = require ("./thread");
import cdi = require ("./cdi");

import { Bean } from "./cdi";

import { Connection } from "./datasource";
import { Datasource } from "./datasource";

let transactionIdSeuence = 0;

export function Transactional(target: any, methodName: string, descriptor: PropertyDescriptor) {

    console.log(`@Transactional : ${target.constructor.name}.${methodName}`);

    return {
        value: async function (...args: any[]) {
            let connectionBuilder = thread.setThread(TransactionThread.name, new TransactionThread ());

            try {
                let result = await descriptor.value.apply(this, args);

                await connectionBuilder.commit();

                return result;
            }
            catch (ex) {
                await connectionBuilder.rollback();
                throw ex;
            }
            finally {
                await connectionBuilder.close();
            }
        }
    };
}

export interface TransactionListener {
    beforeCommit? : () => Promise<void>,
    rollbacked? : () => Promise<void>,
    finished? : () => Promise<void>
}

export abstract class Transaction {
    abstract getId () : string;
    abstract update(sql: string, params: Object[]): Promise<number>;
    abstract select(sql: string, params: Object[]): Promise<Object[]>;
    abstract addListener (listener: TransactionListener) : void;
}

@Bean(Transaction)
class TransactionBean implements Transaction {

    getId () : string {
        return this.getTransactionThread().id;
    }

    async update(sql: string, params: Object[]) {
        return (await this.getTransactionThread().getConnection()).update(sql, params);
    }

    async select(sql: string, params: Object[]): Promise<Object[]> {
        return (await this.getTransactionThread().getConnection()).select(sql, params);
    }
    
    addListener (listener: TransactionListener) {
        this.getTransactionThread().addListener(listener);
    };

    private getTransactionThread() {
        return <TransactionThread> thread.getThread(TransactionThread.name);
    }
}

class TransactionThread {
    
    private connection: Connection;
    public id: string = new Date().getTime() + "_" + (transactionIdSeuence++);
    private listenerList: TransactionListener [] = [];
    
    public async getConnection () : Promise<Connection> {
        if (this.connection == null) {
            this.connection = await cdi.lookup(Datasource.prototype).getConnection();
        }
        
        return this.connection;
    }
    
    public async commit () {
        
        this.fireEvent(async (listener: TransactionListener) => {
            if (listener.beforeCommit) {
                await listener.beforeCommit ();
            }
        });
        
        if (this.connection) {
            await this.connection.commit();
        }
        
        this.fireEvent(async (listener: TransactionListener) => {
            if (listener.finished) {
                await listener.finished ();
            }
        });
    }
    
    public async rollback () {
        if (this.connection) {
            await this.connection.rollback();
        }
        this.fireEvent(async (listener: TransactionListener) => {
            if (listener.rollbacked) {
                await listener.rollbacked ();
            }
            if (listener.finished) {
                await listener.finished ();
            }
        });
    }
    
    public async close () {
        if (this.connection) {
            await this.connection.close();
        }
    }
    
    public addListener(listener: TransactionListener) {
        this.listenerList.push(listener);
    }
    
    private async fireEvent(event: (listener: TransactionListener) => Promise<void>) {
        for (let listener of this.listenerList) {
            await event(listener);
        }
    }
    
}
