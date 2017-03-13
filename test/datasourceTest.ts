import { assert } from "chai";

import { PooledDatasource } from "./../src/datasource";
import { suite, test} from "mocha-typescript";
 
@suite class datasourceTest {
    
    private datasource = new PooledDatasource ({
        maxPoolQuantity : 2,
        createConnection : async ()=> {
            return {
                update : null,
                select : null,
                commit : null,
                rollback : async ()=> {},
                close : null
            };
        }
    });
    
    @test async "pool"() {
        assert.equal(this.datasource.getFreeConnectionQuantity(), 2, "No used connections");
        let connection1 = await this.datasource.getConnection();
        assert.equal(this.datasource.getFreeConnectionQuantity(), 1, "1 used connections");
        let connection2 = await this.datasource.getConnection();
        assert.equal(this.datasource.getFreeConnectionQuantity(), 0, "No free connections");
        await connection1.close();
        assert.equal(this.datasource.getFreeConnectionQuantity(), 1, "1 closed connections");
        await connection2.close();
        assert.equal(this.datasource.getFreeConnectionQuantity(), 2, "2 closed connections");
    }
}
