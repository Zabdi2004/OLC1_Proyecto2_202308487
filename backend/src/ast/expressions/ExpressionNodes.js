import { Expression } from '../ASTNode.js';
import { ServerResource } from '../../infrastructure/ServerResource.js';
import { ServiceResource } from '../../infrastructure/ServiceResource.js';
import { DatabaseResource } from '../../infrastructure/DatabaseResource.js';

export class LiteralExpr extends Expression {
    constructor(value, type, line = 0, column = 0) {
        super(line, column);
        this.value = value;
        this.type = type; // 'int', 'float', 'string', 'bool'
    }

    evaluate(environment) {
        return this.value;
    }

    getNodeLabel() {
        return `Literal(${this.value})`;
    }
}

export class IdentifierExpr extends Expression {
    constructor(name, line = 0, column = 0) {
        super(line, column);
        this.name = name;
    }

    evaluate(environment) {
        const symbol = environment.lookup(this.name);
        if (!symbol) {
            const err = new Error(`Variable o identificador '${this.name}' no declarada`);
            err.code = 'SEM-003';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        return symbol.value;
    }

    getNodeLabel() {
        return `Identifier(${this.name})`;
    }
}

export class BinaryExpr extends Expression {
    constructor(left, operator, right, line = 0, column = 0) {
        super(line, column);
        this.left = left;
        this.operator = operator;
        this.right = right;
    }

    evaluate(environment) {
        // Cortocircuito para operadores lógicos (Sección 6.3 y 26.4)
        if (this.operator === '&&') {
            const leftVal = this.left.evaluate(environment);
            if (typeof leftVal !== 'boolean') {
                const err = new Error(`Operador '&&' requiere operandos de tipo bool`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            if (!leftVal) return false;

            const rightVal = this.right.evaluate(environment);
            if (typeof rightVal !== 'boolean') {
                const err = new Error(`Operador '&&' requiere operandos de tipo bool`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            return rightVal;
        }

        if (this.operator === '||') {
            const leftVal = this.left.evaluate(environment);
            if (typeof leftVal !== 'boolean') {
                const err = new Error(`Operador '||' requiere operandos de tipo bool`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            if (leftVal) return true;

            const rightVal = this.right.evaluate(environment);
            if (typeof rightVal !== 'boolean') {
                const err = new Error(`Operador '||' requiere operandos de tipo bool`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            return rightVal;
        }

        const leftVal = this.left.evaluate(environment);
        const rightVal = this.right.evaluate(environment);

        switch (this.operator) {
            case '+': {
                // String concatenation
                if (typeof leftVal === 'string' || typeof rightVal === 'string') {
                    return String(leftVal) + String(rightVal);
                }
                // Number addition
                if (typeof leftVal === 'number' && typeof rightVal === 'number') {
                    return leftVal + rightVal;
                }
                const err = new Error(`Operación '+' no válida entre tipos incompatibles`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }

            case '-': {
                if (typeof leftVal === 'number' && typeof rightVal === 'number') {
                    return leftVal - rightVal;
                }
                const err = new Error(`Operador '-' solo permite operandos numéricos`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }

            case '*': {
                if (typeof leftVal === 'number' && typeof rightVal === 'number') {
                    return leftVal * rightVal;
                }
                const err = new Error(`Operador '*' solo permite operandos numéricos`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }

            case '/': {
                if (typeof leftVal === 'number' && typeof rightVal === 'number') {
                    if (rightVal === 0) {
                        const err = new Error(`División por cero no permitida`);
                        err.code = 'RUN-001';
                        err.line = this.line;
                        err.column = this.column;
                        throw err;
                    }
                    return leftVal / rightVal;
                }
                const err = new Error(`Operador '/' solo permite operandos numéricos`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }

            case '%': {
                if (Number.isInteger(leftVal) && Number.isInteger(rightVal)) {
                    if (rightVal === 0) {
                        const err = new Error(`Módulo por cero no permitido`);
                        err.code = 'RUN-001';
                        err.line = this.line;
                        err.column = this.column;
                        throw err;
                    }
                    return leftVal % rightVal;
                }
                const err = new Error(`Operador '%' solo acepta enteros`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }

            // Operadores Relacionales
            case '<': return leftVal < rightVal;
            case '<=': return leftVal <= rightVal;
            case '>': return leftVal > rightVal;
            case '>=': return leftVal >= rightVal;

            // Operadores de Igualdad
            case '==':
                return leftVal === rightVal;
            case '!=':
                return leftVal !== rightVal;

            default:
                throw new Error(`Operador binario '${this.operator}' no reconocido`);
        }
    }

    getNodeLabel() {
        return `Binary(${this.operator})`;
    }
}

export class UnaryExpr extends Expression {
    constructor(operator, right, line = 0, column = 0) {
        super(line, column);
        this.operator = operator;
        this.right = right;
    }

    evaluate(environment) {
        const val = this.right.evaluate(environment);
        if (this.operator === '-') {
            if (typeof val === 'number') return -val;
            const err = new Error(`Operador unario '-' solo permite números`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        if (this.operator === '!') {
            if (typeof val === 'boolean') return !val;
            const err = new Error(`Operador '!' solo permite valores booleanos`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        throw new Error(`Operador unario desconocido '${this.operator}'`);
    }

    getNodeLabel() {
        return `Unary(${this.operator})`;
    }
}

export class PropertyAccessExpr extends Expression {
    constructor(object, property, line = 0, column = 0) {
        super(line, column);
        this.object = object; // Expression
        this.property = property; // String
    }

    evaluate(environment) {
        const target = this.object.evaluate(environment);
        if (!target || typeof target !== 'object') {
            const err = new Error(`No se puede acceder a propiedad '${this.property}' de un valor no objeto`);
            err.code = 'SEM-005';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        if (target.getProperty) {
            const val = target.getProperty(this.property);
            if (val === undefined) {
                const err = new Error(`Propiedad '${this.property}' no existe en el recurso '${target.name}'`);
                err.code = 'SEM-005';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            return val;
        }

        if (this.property in target) {
            return target[this.property];
        }

        const err = new Error(`Propiedad inexistente '${this.property}'`);
        err.code = 'SEM-005';
        err.line = this.line;
        err.column = this.column;
        throw err;
    }

    getNodeLabel() {
        return `PropertyAccess(.${this.property})`;
    }
}

export class IndexExpr extends Expression {
    constructor(arrayExpr, indexExpr, line = 0, column = 0) {
        super(line, column);
        this.arrayExpr = arrayExpr;
        this.indexExpr = indexExpr;
    }

    evaluate(environment) {
        const arr = this.arrayExpr.evaluate(environment);
        const idx = this.indexExpr.evaluate(environment);

        if (!Array.isArray(arr)) {
            const err = new Error(`El objetivo de indexación no es un arreglo`);
            err.code = 'SEM-006';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        if (!Number.isInteger(idx)) {
            const err = new Error(`El índice debe ser un número entero`);
            err.code = 'SEM-006';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        if (idx < 0 || idx >= arr.length) {
            const err = new Error(`Índice fuera de límites: ${idx} en arreglo de tamaño ${arr.length}`);
            err.code = 'RUN-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        return arr[idx];
    }

    getNodeLabel() {
        return `IndexAccess`;
    }
}

export class ArrayExpr extends Expression {
    constructor(elements = [], line = 0, column = 0) {
        super(line, column);
        this.elements = elements;
    }

    evaluate(environment) {
        return this.elements.map(e => e.evaluate(environment));
    }

    getNodeLabel() {
        return `ArrayLiteral[${this.elements.length}]`;
    }
}

export class CallExpr extends Expression {
    constructor(callee, args = [], line = 0, column = 0) {
        super(line, column);
        this.callee = callee; // string con el nombre de la función
        this.args = args;     // Expression[]
    }

    evaluate(environment) {
        // 1. Verificar si es una función nativa del lenguaje
        const evaluatedArgs = this.args.map(arg => arg.evaluate(environment));
        const infra = environment.infraState;

        switch (this.callee) {
            case 'start':
                if (evaluatedArgs.length !== 1) throw new Error(`start() requiere exactamente 1 argumento`);
                return infra.start(evaluatedArgs[0]);

            case 'stop':
                if (evaluatedArgs.length !== 1) throw new Error(`stop() requiere exactamente 1 argumento`);
                return infra.stop(evaluatedArgs[0]);

            case 'restart':
                if (evaluatedArgs.length !== 1) throw new Error(`restart() requiere exactamente 1 argumento`);
                return infra.restart(evaluatedArgs[0]);

            case 'install':
                if (evaluatedArgs.length !== 2) throw new Error(`install() requiere exactamente 2 argumentos (server, string)`);
                return infra.install(evaluatedArgs[0], evaluatedArgs[1]);

            case 'uninstall':
                if (evaluatedArgs.length !== 2) throw new Error(`uninstall() requiere exactamente 2 argumentos (server, string)`);
                return infra.uninstall(evaluatedArgs[0], evaluatedArgs[1]);

            case 'deploy':
                if (evaluatedArgs.length !== 2) throw new Error(`deploy() requiere exactamente 2 argumentos (server, service)`);
                return infra.deploy(evaluatedArgs[0], evaluatedArgs[1], this.line, this.column);

            case 'scale':
                if (evaluatedArgs.length !== 2) {
                    const err = new Error(`Firma incorrecta: scale() requiere 2 argumentos (service, replicas)`);
                    err.code = 'SEM-007';
                    err.line = this.line;
                    err.column = this.column;
                    throw err;
                }
                return infra.scale(evaluatedArgs[0], evaluatedArgs[1]);

            case 'connect':
                if (evaluatedArgs.length !== 2) throw new Error(`connect() requiere 2 argumentos (resource, resource)`);
                return infra.connect(evaluatedArgs[0], evaluatedArgs[1]);

            case 'disconnect':
                if (evaluatedArgs.length !== 2) throw new Error(`disconnect() requiere 2 argumentos (resource, resource)`);
                return infra.disconnect(evaluatedArgs[0], evaluatedArgs[1]);

            case 'print':
                const outStr = evaluatedArgs.map(a => {
                    if (a === null || a === undefined) return 'null';
                    if (typeof a === 'object' && a.name) return a.name;
                    return String(a);
                }).join(' ');
                infra.printToConsole(outStr);
                return null;

            case 'length':
                if (evaluatedArgs.length !== 1) throw new Error(`length() requiere 1 argumento`);
                const target = evaluatedArgs[0];
                if (Array.isArray(target)) return target.length;
                throw new Error(`length() solo es aplicable a arreglos`);

            case 'status':
                if (evaluatedArgs.length !== 1) throw new Error(`status() requiere 1 argumento`);
                return infra.status(evaluatedArgs[0]);

            default:
                break;
        }

        // 2. Si no es nativa, buscar función definida por el usuario
        const funcSymbol = environment.lookup(this.callee);
        if (!funcSymbol || funcSymbol.category !== 'función') {
            const err = new Error(`Función '${this.callee}' no declarada`);
            err.code = 'SEM-003';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        const funcNode = funcSymbol.value;
        return funcNode.call(evaluatedArgs, environment, this.line, this.column);
    }

    getNodeLabel() {
        return `Call(${this.callee})`;
    }
}
