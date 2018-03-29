import fs = require ('fs');

import { assert } from "chai";
import { suite, test} from "mocha-typescript";

import {XmlElement, XmlAttribute, XmlField} from "./../src/xsd";
import * as xml from "./../src/xsd";


@XmlElement ("subChild", "http://namespace3")
class SubChild {
    
    @XmlAttribute ("name")
    name : string;
}


@XmlElement ("Child", "http://namespace2")
class Child {
    
    @XmlAttribute ("name")
    name : string;
    
    @XmlField ("subChild")
    subChild: SubChild;
}

@XmlElement ("childList", "http://namespace2")
class ChildList {
    
    @XmlAttribute ("name")
    name : string;
}

@XmlElement ("parent", "http://namespace1")
class Parent {
    
    @XmlAttribute ("name")
    name : string;
    
    @XmlField ("child")
    child : Child;
    
    @XmlField ("simpleChild", "http://namespace4")
    simpleChild : string;
    
    @XmlField("childList", null, ChildList)
    childList: ChildList [];
    
    @XmlField("simpleChildList", "http://namespace4", String)
    simpleChildList: String [];
}



@suite class xsdTest {
    
    @test async "read"() {
        let xmlString = fs.readFileSync("test/xml.xml").toString();
        
        let parent = xml.read(xmlString, Parent.prototype);
        
        assert.equal(parent.name, "parent");
        assert.equal(parent.child.name, "child");
        assert.equal(parent.child.subChild.name, "subChild");
        assert.equal(parent.simpleChild, "simpleChild");
        assert.equal(parent.childList[0].name, "childList1");
        assert.equal(parent.childList[1].name, "childList2");
        assert.equal(parent.simpleChildList[0], "simpleChildList1");
        assert.equal(parent.simpleChildList[1], "simpleChildList2");
    }
}
