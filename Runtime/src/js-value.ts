import { Memory } from "./memory";
import { pointer } from "./types";

export enum Kind {
    Invalid = -1,
    Boolean = 0,
    String = 1,
    Number = 2,
    Object = 3,
    Null = 4,
    Undefined = 5,
    Function = 6,
}

export const decode = (
    kind: Kind,
    payload1: number,
    payload2: number,
    memory: Memory
) => {
    switch (kind) {
        case Kind.Boolean:
            switch (payload1) {
                case 0:
                    return false;
                case 1:
                    return true;
            }
        case Kind.Number:
            return payload2;

        case Kind.String:
        case Kind.Object:
        case Kind.Function:
            return memory.getObject(payload1);

        case Kind.Null:
            return null;

        case Kind.Undefined:
            return undefined;

        default:
            throw new Error(`JSValue Type kind "${kind}" is not supported`);
    }
};

// Note:
// `decodeValues` assumes that the size of RawJSValue is 16.
export const decodeArray = (ptr: pointer, length: number, memory: Memory) => {
    let result = [];
    for (let index = 0; index < length; index++) {
        const base = ptr + 16 * index;
        const kind = memory.readUint32(base);
        const payload1 = memory.readUint32(base + 4);
        const payload2 = memory.readFloat64(base + 8);
        result.push(decode(kind, payload1, payload2, memory));
    }
    return result;
};

export const write = (
    value: any,
    kind_ptr: pointer,
    payload1_ptr: pointer,
    payload2_ptr: pointer,
    is_exception: boolean,
    memory: Memory
) => {
    const exceptionBit = (is_exception ? 1 : 0) << 31;
    if (value === null) {
        memory.writeUint32(kind_ptr, exceptionBit | Kind.Null);
        return;
    }
    switch (typeof value) {
        case "boolean": {
            memory.writeUint32(kind_ptr, exceptionBit | Kind.Boolean);
            memory.writeUint32(payload1_ptr, value ? 1 : 0);
            break;
        }
        case "number": {
            memory.writeUint32(kind_ptr, exceptionBit | Kind.Number);
            memory.writeFloat64(payload2_ptr, value);
            break;
        }
        case "string": {
            memory.writeUint32(kind_ptr, exceptionBit | Kind.String);
            memory.writeUint32(payload1_ptr, memory.retain(value));
            break;
        }
        case "undefined": {
            memory.writeUint32(kind_ptr, exceptionBit | Kind.Undefined);
            break;
        }
        case "object": {
            memory.writeUint32(kind_ptr, exceptionBit | Kind.Object);
            memory.writeUint32(payload1_ptr, memory.retain(value));
            break;
        }
        case "function": {
            memory.writeUint32(kind_ptr, exceptionBit | Kind.Function);
            memory.writeUint32(payload1_ptr, memory.retain(value));
            break;
        }
        default:
            throw new Error(`Type "${typeof value}" is not supported yet`);
    }
};
