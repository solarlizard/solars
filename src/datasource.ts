export abstract class Connection {
    abstract update(sql: string, params: Object[]): Promise<number>;
    abstract select(sql: string, params: Object[]): Promise<Object[]>;
    abstract commit(): Promise<void>;
    abstract rollback(): Promise<void>;
    abstract close(): Promise<void>;
}

export interface DatasourceConfig {
    maxPoolQuantity: number,
    createConnection(): Promise<Connection>
}

export abstract class Datasource {
    abstract getConnection(): Promise<Connection>;
}

export class PooledDatasource implements Datasource {

    private config: DatasourceConfig;
    private freeConnectionList: Connection[] = [];
    private openedConnectionQuantity = 0;

    private waiterList: ((connection: Connection) => void)[] = [];

    constructor(config: DatasourceConfig) {
        this.config = config;
    }

    public getConnection(): Promise<Connection> {
        if (this.openedConnectionQuantity < this.config.maxPoolQuantity) {
            this.openedConnectionQuantity++;
            
            return this.createPooledConnection();
        }
        else {
            return new Promise((resolve: (connection: Connection) => void, reject: (err: Error) => void) => {

                if (this.freeConnectionList.length > 0) {
                    let freeConnection = this.freeConnectionList[0];

                    this.freeConnectionList.splice(0, 1);

                    resolve(freeConnection);
                }
                else {
                    this.waiterList.push(resolve);
                }
            });
        }
    }
    
    private async createPooledConnection() {
        let connection = await this.config.createConnection();
        
        let result : Connection = {
            update: async (sql: string, params: Object[]) => {return await connection.update(sql, params);},
            select: async (sql: string, params: Object[]) => {return await connection.select(sql, params);},
            commit: async () => {await connection.commit();},
            rollback: async () => {await connection.rollback();},
            close: async () => {
                try {
                    await connection.rollback();

                    if (this.waiterList.length > 0) {
                        this.waiterList.splice(0, 1)[0](result);
                    }
                    else {
                        this.freeConnectionList.push(result);
                    }
                }
                catch (ex) {
                    connection.close();
                }
            }
        }
        
        return result;
    }
    
    public getFreeConnectionQuantity () {
        return this.config.maxPoolQuantity - this.openedConnectionQuantity + this.freeConnectionList.length;
    }
}
