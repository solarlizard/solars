import pg = require("pg");

import {Connection} from "./datasource";

export async function nextVal (connection : Connection, sequenceName : string) : Promise<number> {
    return (<any>(await connection.select(`SELECT NEXTVAL ('${sequenceName}') AS seq`,[]))[0]).seq;
}

export function connect(config: {
    login: string,
    password: string,
    database: string,
    port: number,
    host: string
}) : Promise<Connection> {
    let client = new pg.Client({
        ssl: false,
        user: config.login,
        database: config.database,
        password: config.password,
        port: config.port,
        host: config.host
    });

    return new Promise((resolve: (connection: Connection) => void, reject: (err: Error) => void) => {
        client.connect((err?: Error) => {
            if (err) {
                reject(err);
            }
            else {
                client.query(`START TRANSACTION`, [], (err: Error, result: pg.QueryResult) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({
                            update: async (sql: string, args: Object[]) => {
                                return (await client.query(sql, args)).rowCount;
                            },
                            select: async (sql: string, args: Object[]) => {
                                return (await client.query(sql, args)).rows;
                            },
                            commit: async () => {
                                await client.query("COMMIT");
                            },
                            rollback: async () => {
                                await client.query("ROLLBACK");
                            },
                            close: () => {
                                return new Promise<void>((resolve: () => void, reject: (err: Error) => void) => {
                                    client.end((err: Error) => {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve();
                                        }
                                    })
                                });
                            }
                        });
                    }
                });
            }
        });
    });
}
