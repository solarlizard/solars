import 'reflect-metadata';

import fs = require ('fs');

import cdi = require ("./cdi");

let resourceDefinitionMapIndex : Function [] = [];
let resourceDefinitionMap : {[index: number]: Resource} = {};

interface Resource {
    path : string,
    id : string
}

interface Controller {
    instance : any,
    method? : Function,
    methodName : string
}

let pathControllerMap: {[path: string]: Controller} = {};

export async function route (callback : (route : {
    path : string,
    instance : any,
    method : Function
}) => void) {
    for (let path in pathControllerMap) {
        let controller = pathControllerMap[path];
        
        controller.method = controller.instance[controller.methodName];
        
        callback ({
            path: path,
            instance: controller.instance,
            method: controller.method
        });
        
    }
}

export function RpcResource (path : string, id : string) {
    return (target: Function) => {
        console.log(`@${RpcResource.name} : ${target.name} = "${path}/${id}"`);
        
        resourceDefinitionMap[resourceDefinitionMapIndex.push(target) - 1] = {
            path : path,
            id : id
        };
    }
}

export function Rpc (resourceInterface: Function) {
    return (target: Function) => {
        let resourceDefinition = resourceDefinitionMap[resourceDefinitionMapIndex.indexOf(resourceInterface)];
        
        console.log(`@${Rpc.name} : ${target.constructor.name}.${resourceDefinition.id} = ${resourceInterface.name} = "${resourceDefinition.path}/${resourceDefinition.id}"`);
        
        let instance = new (<any> target);
        
        pathControllerMap[resourceDefinition.path + "/" + resourceDefinition.id] = {
            instance : instance,
            methodName: resourceDefinition.id
        }
        
        cdi.register(instance);
    }
}

export function generateServer (sectionList : SectionModel []) {
    for (let sectionModel of sectionList) {
        generateSection([], sectionModel);
    }
}

function generateSection(path : string [], sectionModel: SectionModel) {
    path.push(sectionModel.path);
    
    if (sectionModel.operationList) {
        for (let opertionModel of sectionModel.operationList) {
            generateOperation(path, opertionModel);
        }
    }
    
    if (sectionModel.sectionList) {

        for (let childSectionModel of sectionModel.sectionList) {
            generateSection(path, childSectionModel);
        }
    }
    
    path.splice(path.length - 1, 1);
}

function generateOperation(path: string[], operationModel: OperationModel) {
    
    let code = "";
    code += `import shared = require ("${getPathRoot(path)}shared");`;
    code += `\r\nimport { RpcResource } from "solar/dist/rpc";`;
    code += "\r\n";
    code += `\r\n@RpcResource ("${getPath(path, operationModel)}","${operationModel.id}")`;
    code += `\r\nexport abstract class ${getOperationInterfaceName(operationModel)} {`;
    code += "\r\n";
    code += "\r\n    abstract " + getOperationDefinition(operationModel);
    code += "\r\n";
    code += `\r\n}`;
    
    fs.writeFileSync(getOperationFile(path, operationModel), code);
    
}

function getPathRoot (path : string []) {
    let result = "./../../";
    
    for (let q = 0; q < path.length; q++) {
        result += "../";
    }
    
    return result;
}

function getOperationDefinition(operationModel: OperationModel) {
    let result = operationModel.id + " (";
    
    result += ") : Promise<";
    
    if (operationModel.resultType != null) {
        result += getType(operationModel.resultType)
    }
    else if (operationModel.resultModel != null) {
        result += "shared." + operationModel.resultModel.name
    }
    
    if (operationModel.resultArray) {
        result += " []";
    }
    
    result += ">";
    
    return result;
}

function getType (code : TYPE) {
    if (code == TYPE.STRING) {
        return "string"
    }
    else if (code == TYPE.NUMBER) {
        return "number"
    }
    else if (code == TYPE.DATE) {
        return "date"
    }
    else if (code == TYPE.BOOLEAN) {
        return "boolean"
    }
    else {
        throw "IllegalTypeException";
    }
} 

function getOperationInterfaceName(operationModel: OperationModel) {
    return camel(operationModel.id) + "Resource";
}

function getOperationFileName(operationModel: OperationModel) {
    return getOperationInterfaceName(operationModel) + ".ts";
}

function getOperationFile(path : string [], operationModel: OperationModel) {
    return getPathFolder(path) + "/" + getOperationFileName(operationModel);
}

function getPathFolder (path : string []) : string{
    let result = "src/server/generated";
    
    if (!fs.existsSync(result)) {
        fs.mkdirSync(result);
    }
    
    for (let pathItem of path) {
        result += "/" + pathItem;

        if (!fs.existsSync(result)) {
            fs.mkdirSync(result);
        }
    }
    
    return result;
}

function getPath(path: string[], operation: OperationModel) : string{
    let result = "";
    
    for (let pathItem of path) {
        result += "/" + pathItem;
    }
    
    return result;
}

function camel (str : string) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}

export enum TYPE {
    STRING = <any>"STRING",
    NUMBER = <any>"NUMBER",
    DATE = <any>"DATE",
    BOOLEAN = <any>"BOOLEAN"
}

export class Imprt {
    public prifix : string;
    public tsFile : string;
}

export class OperationModel {
    public id : string
    public paramArray? : boolean = false;
    public paramType? : TYPE;
    public paramModel? : Function;
    public resultArray? : boolean = false;
    public resultType? : TYPE;
    public resultModel? : Function;
}

export class SectionModel {
    public path : string;
    public operationList?: OperationModel [] = [];
    public sectionList?: SectionModel [] = [];
}
