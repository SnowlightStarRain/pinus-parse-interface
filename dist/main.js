"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const TJS = require("typescript-json-schema");
const fs = require("fs");
const util = require("util");
const path = require("path");
function log(...args) {
    console.log(...args);
}
function error(msg, ...args) {
    const str = util.format(msg, ...args);
    console.error(str);
    throw new Error(str);
}
function parseToPinusProtobuf(baseDir) {
    let retObj = {};
    const files = fs.readdirSync(baseDir);
    files.forEach(val => {
        if (!val.endsWith('.ts')) {
            return;
        }
        const obj = parseFile(baseDir, val);
        const tmp = path.parse(val);
        retObj[tmp.name] = obj;
    });
    return retObj;
}
exports.parseToPinusProtobuf = parseToPinusProtobuf;
function parseFile(baseDir, filename) {
    // optionally pass argument to schema generator
    const settings = {
        required: true
    };
    // optionally pass ts compiler options
    const compilerOptions = {
        strictNullChecks: true
    };
    const program = TJS.getProgramFromFiles([path_1.resolve(baseDir + '/' + filename)], compilerOptions, baseDir);
    const generator = TJS.buildGenerator(program, settings);
    // all symbols
    const symbols = generator.getMainFileSymbols(program);
    if (!symbols || !symbols.length) {
        return;
    }
    const symbolName = symbols[symbols.length - 1];
    if (!symbolName) {
        return;
    }
    const symbol = generator.getSchemaForSymbol(symbolName);
    const messages = {};
    return parseSymbol(symbol, symbol, messages);
    //   return transMessage(obj,messages);
}
const PROTOBUF_TYPES = [
    "uInt32",
    "sInt32",
    "int32",
    "double",
    "string",
    "message",
    "float"
];
function getDefinitionFromRoot(root, ref) {
    // "#/definitions/MyRank"
    let name = ref.split('/');
    name = name[name.length - 1];
    const ret = root.definitions[name];
    if (!ret) {
        error('!find definition from root error', root, ret);
    }
    ret.name = name;
    return ret;
}
function normalType(typeName) {
    if (PROTOBUF_TYPES.includes(typeName)) {
        return typeName;
    }
    if (typeName == 'number') {
        return 'uInt32';
    }
    error('!! error typeName', typeName);
}
function parseSymbol(root, symbol, messages) {
    /*
{
  "type": "object",
  "properties": {
    "normalArr": {
      "description": "The float of the nowplayers.",
      "additionalProperties": "uInt32",
      "type": "array"
    },
    "normalStrArr": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "ranks": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/MyRank"
      }
    },
    "rk": {
      "$ref": "#/definitions/MyRank"
    },
    "val": {
      "type": "number"
    }
  },
  "required": [
    "normalArr",
    "normalStrArr",
    "ranks"
  ],
  "definitions": {
    "MyRank": {
      "type": "object",
      "properties": {
        "nickname": {
          "type": "number"
        },
        "ggg": {
          "$ref": "#/definitions/GGG"
        }
      },
      "required": [
        "ggg",
        "nickname"
      ]
    },
    "GGG": {
      "type": "object",
      "properties": {
        "ccgg": {
          "type": "number"
        }
      },
      "required": [
        "ccgg"
      ]
    }
  },
  "$schema": "http://json-schema.org/draft-06/schema#"
}
     */
    function parseRef(obj, key, $ref) {
        const definition = getDefinitionFromRoot(root, $ref);
        const name = definition.name;
        if (!messages[name]) {
            messages[name] = parseSymbol(root, definition, messages);
        }
        obj['message ' + name] = messages[name];
        return ' ' + name + ' ' + key;
    }
    let val = {};
    let i = 0;
    for (let key in symbol.properties) {
        const prop = symbol.properties[key];
        let msgkey = 'optional';
        // 判断是否是required
        if (prop.type == 'array') {
            msgkey = 'repeated';
        }
        else if (symbol.required.includes(key)) {
            msgkey = 'required';
        }
        // 判断类型  type items additionalProperties
        if (prop.type != 'array') {
            if (prop.$ref) {
                msgkey += parseRef(val, key, prop.$ref);
            }
            else {
                msgkey += ' ' + normalType(prop.type) + ' ' + key;
            }
        }
        else {
            // array
            if (prop.additionalProperties) {
                msgkey += ' ' + normalType(prop.additionalProperties) + ' ' + key;
            }
            else {
                if (prop.items.type) {
                    msgkey += ' ' + normalType(prop.items.type) + ' ' + key;
                }
                else {
                    msgkey += parseRef(val, key, prop.items.$ref);
                }
            }
        }
        val[msgkey] = i++;
    }
    return val;
}
//# sourceMappingURL=main.js.map