# solarf
> Typescript CDI-based framework with ORM

[![Build Status](https://travis-ci.org/solarlizard/solarf.svg?branch=master)](https://travis-ci.org/solarlizard/solarf)
![Dependencies](https://david-dm.org/solarlizard/solarf.svg)

## Installation
```bash
$ npm install solarf
```
## Usage

### CDI 
> Context Dependency Injection

#### Component injection
```typescript
import { Component } from "solarf/cdi"
import { Inject    } from "solarf/cdi"

@Component
class CommonComponent {

    public sum (a : number, b : number) : number {
    	return a + b;
    }
}

@Component
class MyComponent {

    @Inject
    private commonComponent : CommonComponent;
  
    public calculate () {
    	this.commonComponent.sum (1,2);
    }
}
```

#### Bean injection
```typescript
import { Bean      } from "solarf/cdi"
import { Component } from "solarf/cdi"
import { Inject    } from "solarf/cdi"

abstract class CommonBean {

    abstract sum (a : number, b : number) : number;
}

@Bean (CommonBean)
class CommonBeanImpl implements CommonBean {

    public sum (a : number, b : number) : number {
        return a + b;
    }
}

@Component
class MyComponent {

    @Inject
    private commonBean : CommonBean;
  
    public calculate () {
    	this.commonBean.sum (1,2);
    }
}
```
#### Service injection
```typescript
import { Service      } from "solarf/cdi"
import { Component } from "solarf/cdi"
import { Inject    } from "solarf/cdi"

abstract class CommonService {

    abstract sum (a : number, b : number) : number;
}

class CommonServiceBuilder {

    @Service
    public buildService () : CommonService {
        return {
            sum : (a : number, b : number) => {
                return a + b;
            }
        };
    }

}

@Component
class MyComponent {

    @Inject
    private commonService : CommonService;
  
    public calculate () {
    	this.commonService.sum (1,2);
    }
}
```
### Datasource
> Connection pooling

```typescript
import { Bean             } from "solarf/cdi"
import { Datasource       } from "solarf/datasource"
import { PooledDatasource } from "solarf/datasource"

@Bean (Datasource)
class MyDatasource extends PooledDatasource {
    constructor () {
        super ({
            maxPoolQuantity: number,
            createConnection(): async ()=> {
                return ... ;
            }
        });
    }
}
```