import fs = require ('fs');

import { assert } from "chai";
import { suite, test} from "mocha-typescript";

import * as xml from "./../src/xml";

@suite class xmlTest {
    
    @test async "read"() {
        let xmlDocument = xml.read(fs.readFileSync("test/xml.xml").toString());
        
        assert.equal(xmlDocument.tag.name, "parent");
        assert.equal(xmlDocument.tag.prefix, "ns1");
        assert.equal(xmlDocument.tag.ns, "http://namespace1");

        assert.equal(xmlDocument.children[0].tag.name, "child");
        assert.equal(xmlDocument.children[0].tag.prefix, "ns2");
        assert.equal(xmlDocument.children[0].tag.ns, "http://namespace2");
                
    }
    
    
    @test async "write"() {
        let xmlDocument = xml.read(fs.readFileSync("test/xml.xml").toString());
        
        let expected = `<?xml version="1.0" encoding="utf-8"?>
<ns0:parent xmlns:ns0="http://namespace1" xmlns:ns4="http://namespace4" xmlns:ns2="http://namespace3">
  <ns4:child name="child">
    <ns2:subChild name="subChild"/>
  </ns4:child>
  <ns4:simpleChild>simpleChild</ns4:simpleChild>
  <ns4:childList name="childList1"/>
  <ns4:childList name="childList2"/>
  <ns4:simpleChildList>simpleChild1</ns4:simpleChildList>
  <ns4:simpleChildList>simpleChild2</ns4:simpleChildList>
</ns0:parent>`;

        assert(xml.write(xmlDocument), expected);
    }    
}
