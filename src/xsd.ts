//import 'reflect-metadata';

import * as xmlParser from "./xml";
import {XmlNode} from "./xml";

let classXmlElementDefinitionMap = new Map<any,XmlElementDefinition> ();
let classXmlAttributeDefinitionMap = new Map<any,XmlAttributeDefinition []> ();
let classXmlFieldDefinitionMap = new Map<any, XmlFieldDefinition []> ();

enum DATA_TYPE {
    STRING, NUMBER, BOOLEAN, DATE
}

class XmlAttributeDefinition {
    attributeName : string;
    ns : string;
    fieldName : string;
    typ: DATA_TYPE;
}

class XmlFieldDefinition {
    xmlName : string;
    ns : string;
    fieldName : string;
    cons : Function;
    array : boolean;
    typ: DATA_TYPE;
}

class XmlElementDefinition {
    cons : Function;
    elementName : string;
    ns : string;
    attributeList : XmlAttributeDefinition [] = [];
    fieldList : XmlFieldDefinition [] = [];
}

export function XmlElement(elementName : string, ns? : string) {
    return (constructor: Function) => {
        console.log("@" + XmlElement.name + " : " + constructor.name + " -> " + elementName);
        
        let xmlElementDefinition = new XmlElementDefinition ();
        
        xmlElementDefinition.ns = ns;
        xmlElementDefinition.cons = constructor;
        xmlElementDefinition.attributeList = classXmlAttributeDefinitionMap.get(constructor.prototype);
        xmlElementDefinition.fieldList = classXmlFieldDefinitionMap.get(constructor.prototype);
        
        if (xmlElementDefinition.attributeList == null) {
            xmlElementDefinition.attributeList = [];
        }
        
        if (xmlElementDefinition.fieldList == null) {
            xmlElementDefinition.fieldList = [];
        }
        
        classXmlElementDefinitionMap.set(constructor.prototype, xmlElementDefinition);
    }
}

export function XmlAttribute(attributeName : string, ns? : string) {
    return (target: any, field: string)=> {
        console.log("@" + XmlAttribute.name + " : " + target.constructor.name + "." + field + " -> " + attributeName);
        
        let definitionList = classXmlAttributeDefinitionMap.get(target.constructor.prototype);
        
        if (definitionList == null) {
            definitionList = [];
            classXmlAttributeDefinitionMap.set(target.constructor.prototype, definitionList)
        }
        
        let definition = new XmlAttributeDefinition ();
        
        definition.ns = ns;
        definition.attributeName = attributeName;
        definition.fieldName = field;
        
        definition.typ = getDataType(Reflect.getMetadata("design:type", target, field));
        
        definitionList.push(definition);
    }
}

export function XmlField(xmlName : string, ns? : string, array? : Function) {
    return (target: any, field: string)=> {
        console.log("@" + XmlField.name + " : " + target.constructor.name + "." + field + " -> " + xmlName);
        
        let definitionList = classXmlFieldDefinitionMap.get(target.constructor.prototype);
        
        if (definitionList == null) {
            definitionList = [];
            classXmlFieldDefinitionMap.set(target.constructor.prototype, definitionList)
        }
        
        let definition = new XmlFieldDefinition ();
        definition.xmlName = xmlName;
        definition.fieldName = field;
        definition.ns = ns;
        
        if (array instanceof Function) {
            definition.array = true;
            definition.typ = getDataType(array);
            
            if (definition.typ == null) {
                definition.cons = array;
            }
        }
        else {
            definition.array = false;
            
            let fieldType : Function = Reflect.getMetadata("design:type", target, field);
            
            definition.typ = getDataType(fieldType);
            if (definition.typ == null) {
                definition.cons = fieldType;
            }
        }
        
        definitionList.push(definition);
    }
}

function getDataType(cons: Function): DATA_TYPE {
    if (cons == String) {
        return DATA_TYPE.STRING;
    }
    else if (cons == Number) {
        return DATA_TYPE.NUMBER
    }
    else if (cons == Boolean) {
        return DATA_TYPE.BOOLEAN
    }
    else if (cons == Date) {
        return DATA_TYPE.DATE;
    }
    else {
        return null;
    }
}

export function read<T> (xml : string, t : T) : T {
    return readNode(xmlParser.read(xml),t);
}

export function readNode<T>(node: XmlNode, t : T) : T {
    
    let definition = classXmlElementDefinitionMap.get(t);
    
    let result = new (<any>definition.cons);
    
    for (let xmlAttribute of definition.attributeList) {
        
        for (let attr of node.attr) {
            if (attr.name.name == xmlAttribute.fieldName) {
                if (xmlAttribute.ns == null || xmlAttribute.ns == attr.name.ns) {
                    result[xmlAttribute.fieldName] = parseTypedValue(xmlAttribute.typ, attr.value);
                }
            }
        }
        
        for (let field of definition.fieldList) {
            for (let child of node.children) {
                if (field.xmlName == child.tag.name) {
                    if (field.ns == null || field.ns == child.tag.ns) {
                        if (field.array == true) {
                            if (result[field.fieldName] == null) {
                                result[field.fieldName] = [];
                            }
                            
                            let list = <any[]>result[field.fieldName];
                            
                            if (field.typ != null) {
                                list.push(parseTypedValue(field.typ, child.content));
                            }
                            else if (field.cons != null) {
                                list.push(readNode(child, field.cons.prototype));
                            }
                        }
                        else if (field.typ != null) {
                            result[field.fieldName] = parseTypedValue(field.typ, child.content);
                        }
                        else if (field.cons != null) {
                            result[field.fieldName] = readNode(child, field.cons.prototype);
                        }
                    }
                }
            }
        }
    }
    
    return result;
}

function parseTypedValue (typ: DATA_TYPE, value : string) : any {
    if (value == null || value.length == 0) {
        return null;
    }
    else if (typ == DATA_TYPE.STRING) {
        return value;
    }
    else if (typ == DATA_TYPE.NUMBER) {
        return parseInt(value);
    }
    else if (typ == DATA_TYPE.BOOLEAN) {
        return Boolean(value);
    }
    else if (typ == DATA_TYPE.DATE) {
        return new Date(value);
    }
}
