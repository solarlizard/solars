//import 'reflect-metadata';

import parse = require('xml-parser');

import {Document, Node, Attributes} from "xml-parser";

import * as t from "xmlbuilder";
import {XMLElementOrXMLNode} from "xmlbuilder";

export class XmlTag {
    name : string;
    prefix : string;
    ns : string;
}

export class XmlAttr {
    name: XmlTag;
    value : string;
}

export class XmlNode {
    tag: XmlTag;
    
    attr: XmlAttr [] = [];
    children: XmlNode [] = [];
    content : string = null;
}

export function write(node: XmlNode) : string {
    let nsMap = collectNs(node);
    
    let tagName = node.tag.name;
    
    if (node.tag.ns != null) {
        tagName = nsMap.get(node.tag.ns) + ":" + tagName;
    }
    
    let builder = t.create(tagName, { encoding: 'utf-8' });
    
    nsMap.forEach((prefix : string, ns : string)=> {
        builder = builder.attribute("xmlns:" + prefix, ns);
    });
    
    for (let child of node.children) {
        writeNode(child, nsMap, builder);
    }
    
    return builder.end({ pretty: true });
}

export function writeNode(node: XmlNode, nsMap : Map<string,string>, builder : XMLElementOrXMLNode) : XMLElementOrXMLNode {
    let tagName = node.tag.name;
    
    if (node.tag.ns != null) {
        tagName = nsMap.get(node.tag.ns) + ":" + tagName;
    }
    
    builder = builder.element(tagName);
    
    for (let attr of node.attr) {
        if (attr.name.prefix == null || attr.name.prefix != "xmlns") {
            let attrName = attr.name.name;
            
            
            if (attr.name.ns != null) {
                attrName = nsMap.get(attr.name.ns) + ":" + attrName;
            }
            
            builder = builder.attribute(attrName, attr.value);
        }
    }
    
    for (let child of node.children) {
        writeNode(child, nsMap, builder);
    }
    
    if (node.content != null) {
        builder.text(node.content);
    }
        
    return builder.up();

}

function collectNs(node: XmlNode, namespacePrefixMap? : Map<string,string>) : Map<string,string> {
    
    if (namespacePrefixMap == null) {
        namespacePrefixMap = new Map<string,string> ();
    }
    
    if (node.tag.ns != null) {
        namespacePrefixMap.set(node.tag.ns, "ns" + namespacePrefixMap.size);
    }
    
    for (let attr of node.attr) {
        if (attr.name.ns != null) {
            namespacePrefixMap.set(attr.name.ns, "ns" + namespacePrefixMap.size);
        }
    }
    
    for (let child of node.children) {
        collectNs(child, namespacePrefixMap);
    }
    
    return namespacePrefixMap;
}

export function read(xml: string): XmlNode {
    return parseNode(parse(xml).root, new Map ());
}

function parseNode(node: Node, nsMap : Map<string,string>): XmlNode {
    let result = new XmlNode ();
    
    let nodeNsMap = parseNamespaceMap(node);
    
    let changedNsMap = new Map<string,string> ();
    
    for (let nsPrefix of nodeNsMap.keys()) {
        if (nsMap.get(nsPrefix) != null) {
            changedNsMap.set(nsPrefix, nsMap.get(nsPrefix));
        }
        
        nsMap.set(nsPrefix, nodeNsMap.get(nsPrefix));
    }
    
    result.tag = parseXmlTag(node.name, nsMap);
    
    for (let attributeName in node.attributes) {
        result.attr.push(parseXmlAttribute(attributeName, node.attributes[attributeName], nsMap));
    }
    
    for (let childNode of node.children) {
        result.children.push(parseNode(childNode, nsMap));
    }
    
    for (let nsPrefix of nodeNsMap.keys()) {
        nsMap.delete(nsPrefix);
    }

    for (let nsPrefix of changedNsMap.keys()) {
        nsMap.set(nsPrefix, changedNsMap.get(nsPrefix));
    }
    
    if (node.children == null || node.children.length == 0){
        result.content = node.content;
    }
        
    return result;
}

function parseXmlAttribute (name : string, value : string, nsMap : Map<string,string>) {
    let result = new XmlAttr ();
    
    result.value = value;
    result.name = parseXmlTag(name, nsMap);
    
    return result;
}

function parseXmlTag (value : string, nsMap : Map<string,string>) {
    let result = new XmlTag ();
    
        
    if (value.indexOf (":") < 0) {
        result.name = value;
        result.prefix = null;
        result.ns = null;
    }
    else {
        let parts = value.split(":");
        
        result.prefix = parts[0];
        result.name = parts[1];
        if (nsMap.has(parts[0])) {
            result.ns = nsMap.get(parts[0]);
        }
        else {
            result.ns = null;
        }
    }
    
    return result;
}

function parseNamespaceMap (node : Node) {
    let result = new Map<string,string> ();
    
    for (let attributeName in node.attributes) {
        if (attributeName.toLowerCase().startsWith("xmlns:")) {
            let namespaceNameParts = attributeName.split(":");
            result.set(namespaceNameParts[1], node.attributes[attributeName]);
        }
    }
    
    return result;
}
