import { assert } from "chai";

import cdi = require ("./../src/cdi");

import { Service } from "./../src/cdi";
import { Bean } from "./../src/cdi";
import { Component } from "./../src/cdi";
import { Inject } from "./../src/cdi";

@Component
class TestComponent {
    
    public test () : string {
        return "TestComponent";
    }
}

abstract class TestBean {
    abstract test () : string;
}

@Bean (TestBean)
class TestBeanImpl implements TestBean {
    public test () {
        return "TestBean";
    }
}

abstract class TestService {
    abstract test () : string;
}

class TestServiceBean {
    
    @Service
    public createTestService () : TestService {
        return {
            test : ()=> {
                return "TestService";
            }
        };
    }
}

class Tester {
    
    @Inject
    private component: TestComponent;
    
    @Inject
    private bean: TestBean;
    
    @Inject
    private service: TestService;
    
    public testComponent () : string {
        return this.component.test();
    }
    
    public testBean () : string {
        return this.bean.test();
    }
    
    public testService () : string {
        return this.service.test();
    }
}


import { suite, test} from "mocha-typescript";

let tester = new Tester (); 

@suite class cdiTest {
    
    @test async "@Component"() {
        assert.equal(tester.testComponent(), "TestComponent");
        assert.isTrue(cdi.lookup(TestComponent.prototype) instanceof TestComponent);
    }
    
    @test async "@Bean"() {
        assert.equal(tester.testBean(), "TestBean");
        assert.isTrue(cdi.lookup(TestBean.prototype) instanceof TestBeanImpl);
    }
    
    @test async "@Service"() {
        assert.equal(tester.testService(), "TestService");
        assert.equal(cdi.lookup(TestService.prototype).test(), "TestService");
        
    }
}
