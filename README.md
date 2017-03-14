# solars
> Typescript CDI-based framework with ORM

[![Build Status](https://travis-ci.org/solarlizard/solars.svg?branch=master)](https://travis-ci.org/solarlizard/solars)
![Dependencies](https://david-dm.org/solarlizard/solars.svg)

## Installation
```bash
$ npm install https://github.com/solarlizard/solars/releases/download/[version]/archive.tar.gz
```
## Usage

### CDI 
> Context Dependency Injection

#### Component injection
```typescript
import { Component } from "solars/cdi"
import { Inject    } from "solars/cdi"

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
import { Bean      } from "solars/cdi"
import { Component } from "solars/cdi"
import { Inject    } from "solars/cdi"

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
import { Service      } from "solars/cdi"
import { Component } from "solars/cdi"
import { Inject    } from "solars/cdi"

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
import { Bean             } from "solars/cdi"
import { Datasource       } from "solars/datasource"
import { PooledDatasource } from "solars/datasource"

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

### Transaction
> Automatic transaction handling during method invocation

You need to register Bean implementing Datasource

```typescript
import { Inject       } from "solars/cdi"
import { Transactional} from "solars/transaction"
import { Transaction  } from "solars/transaction"

class SomeClass {
    
    @Inject
    private transaction : Transaction;
    
    @Transactional
    public doSomeWorkInTransaction () {
    }
}

```

