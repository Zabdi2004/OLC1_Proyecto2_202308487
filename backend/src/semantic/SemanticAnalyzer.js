import { CompilerError } from '../errors/CompilerError.js';
import { ErrorType } from '../errors/ErrorType.js';
import { Type, DataType } from '../environment/Type.js';

const NATIVE_FUNCTIONS = {
    start:     { params: [DataType.RESOURCE], returnType: DataType.BOOL },
    stop:      { params: [DataType.RESOURCE], returnType: DataType.BOOL },
    restart:   { params: [DataType.RESOURCE], returnType: DataType.BOOL },
    install:   { params: [DataType.SERVER, DataType.STRING], returnType: DataType.BOOL },
    uninstall: { params: [DataType.SERVER, DataType.STRING], returnType: DataType.BOOL },
    deploy:    { params: [DataType.SERVER, DataType.SERVICE], returnType: DataType.BOOL },
    scale:     { params: [DataType.SERVICE, DataType.INT], returnType: DataType.BOOL },
    connect:   { params: [DataType.RESOURCE, DataType.RESOURCE], returnType: DataType.BOOL },
    disconnect:{ params: [DataType.RESOURCE, DataType.RESOURCE], returnType: DataType.BOOL },
    print:     { params: [], variadic: true, returnType: DataType.VOID },
    length:    { params: ['ARRAY_OR_STRING'], returnType: DataType.INT },
    status:    { params: [DataType.RESOURCE], returnType: DataType.STRING },
};

const RESOURCE_PROPERTIES = {
    server: {
        cpu:      { type: new Type(DataType.INT),    readOnly: false },
        memory:   { type: new Type(DataType.INT),    readOnly: false },
        disk:     { type: new Type(DataType.INT),    readOnly: false },
        os:       { type: new Type(DataType.STRING), readOnly: false },
        status:   { type: new Type(DataType.STRING), readOnly: true },
        packages: { type: new Type(DataType.STRING, true), readOnly: true },
    },
    service: {
        port:      { type: new Type(DataType.INT),    readOnly: false },
        replicas:  { type: new Type(DataType.INT),    readOnly: false },
        status:    { type: new Type(DataType.STRING), readOnly: true },
        host:      { type: new Type(DataType.SERVER), readOnly: true },
        dependsOn: { type: new Type(DataType.RESOURCE, true), readOnly: false },
    },
    database: {
        engine:  { type: new Type(DataType.STRING), readOnly: false },
        version: { type: new Type(DataType.STRING), readOnly: false },
        port:    { type: new Type(DataType.INT),    readOnly: false },
        status:  { type: new Type(DataType.STRING), readOnly: true },
    },
};

const RESOURCE_TYPES = new Set(['server', 'service', 'database']);

export class SemanticAnalyzer {
    constructor() {
        this.errors = [];
        this.scopes = [];
        this.loopDepth = 0;
        this.functionDepth = 0;
        this.currentFunction = null;
        this.symbols = [];
    }

    analyze(ast) {
        this.errors = [];
        this.scopes = [];
        this.loopDepth = 0;
        this.functionDepth = 0;
        this.currentFunction = null;
        this.symbols = [];
        this.mainCount = 0;

        this.pushScope('global');
        for (const node of ast) {
            this.visit(node);
        }

        if (this.mainCount === 0) {
            this.error(ErrorType.SEMANTICO, 'SEM-000',
                'No se encontró el bloque obligatorio main { ... }', 1, 1);
        }
        if (this.mainCount > 1) {
            this.error(ErrorType.SEMANTICO, 'SEM-000',
                `Se encontraron ${this.mainCount} bloques main. Solo se permite exactamente un main.`, 1, 1);
        }

        this.popScope();
        return { errors: this.errors, symbols: this.symbols };
    }

    // ============================================
    // Scope Management
    // ============================================

    pushScope(name) {
        this.scopes.push({ name, symbols: new Map() });
    }

    popScope() {
        this.scopes.pop();
    }

    declare(name, type, category, line, column, params = null) {
        const scope = this.scopes[this.scopes.length - 1];
        if (scope.symbols.has(name)) {
            this.error(ErrorType.SEMANTICO, 'SEM-001',
                `Identificador '${name}' ya ha sido declarado en este ámbito`, line, column);
            return false;
        }
        const sym = { name, type, category, scope: scope.name, line, column };
        if (params !== null) sym.params = params;
        scope.symbols.set(name, sym);
        this.symbols.push({ ...sym });
        return true;
    }

    lookup(name) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].symbols.has(name)) {
                return this.scopes[i].symbols.get(name);
            }
        }
        return null;
    }

    lookupCurrent(name) {
        const scope = this.scopes[this.scopes.length - 1];
        return scope.symbols.get(name) || null;
    }

    error(type, code, description, line, column) {
        this.errors.push(new CompilerError(type, code, description, line, column));
    }

    // ============================================
    // Type Helpers
    // ============================================

    typeOfLiteral(literalType) {
        switch (literalType) {
            case 'int': return new Type(DataType.INT);
            case 'float': return new Type(DataType.FLOAT);
            case 'string': return new Type(DataType.STRING);
            case 'bool': return new Type(DataType.BOOL);
            default: return new Type(DataType.ANY);
        }
    }

    isResourceType(type) {
        return ['server', 'service', 'database', 'resource'].includes(type.baseType) && !type.isArray;
    }

    isResourceArrayType(type) {
        return type.isArray && ['server', 'service', 'database', 'resource'].includes(type.baseType);
    }

    arrayElementType(type) {
        if (type.isArray) {
            return new Type(type.baseType, false);
        }
        return null;
    }

    // ============================================
    // Visitor Methods
    // ============================================

    visit(node) {
        if (!node) return null;
        const methodName = 'visit' + node.constructor.name;
        const method = this[methodName];
        if (typeof method === 'function') {
            return method.call(this, node);
        }
        return null;
    }

    visitResourceDeclInstruction(node) {
        const declared = this.declare(node.name, new Type(node.resourceType), 'recurso', node.line, node.column);
        if (!declared) return;

        for (const [propName, propExpr] of Object.entries(node.properties)) {
            this.visitResourceProperty(node.resourceType, node.name, propName, propExpr);
        }
    }

    visitResourceProperty(resourceType, resourceName, propName, propExpr) {
        const props = RESOURCE_PROPERTIES[resourceType];
        if (!props) return;

        const propDef = props[propName];
        if (!propDef) {
            this.error(ErrorType.SEMANTICO, 'SEM-005',
                `Propiedad '${propName}' no existe en '${resourceType}'`, propExpr.line, propExpr.column);
            return;
        }

        const expectedType = propDef.type;
        const actualType = this.inferType(propExpr);

        if (actualType && !expectedType.isAssignable(actualType)) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Tipo incompatible: '${propName}' de '${resourceType}' espera '${expectedType.toString()}' pero se asignó '${actualType.toString()}'`,
                propExpr.line, propExpr.column);
        }

        // Validaciones de rango
        if (propDef.readOnly) return;

        const literalValue = this.getLiteralValue(propExpr);
        if (literalValue === null) return;

        this.validateResourcePropertyRange(resourceType, propName, literalValue, propExpr.line, propExpr.column);
    }

    getLiteralValue(expr) {
        if (!expr) return null;
        if (expr.constructor.name === 'LiteralExpr') {
            return expr.value;
        }
        if (expr.constructor.name === 'UnaryExpr' && expr.operator === '-') {
            const inner = this.getLiteralValue(expr.right);
            if (typeof inner === 'number') return -inner;
        }
        return null;
    }

    validateResourcePropertyRange(resourceType, propName, value, line, column) {
        const ranges = {
            server: {
                cpu:     { min: 1,     max: null,  msg: 'cpu debe ser > 0' },
                memory:  { min: 1,     max: null,  msg: 'memory debe ser > 0' },
                disk:    { min: 1,     max: null,  msg: 'disk debe ser > 0' },
                os:      { min: 1,     max: null,  msg: 'os no puede estar vacío', isString: true },
            },
            service: {
                port:     { min: 1,     max: 65535, msg: 'port debe estar en rango 1..65535' },
                replicas: { min: 1,     max: null,  msg: 'replicas debe ser >= 1' },
            },
            database: {
                engine:  { allowed: ['postgresql', 'mysql', 'sqlite'], msg: 'engine debe ser postgresql, mysql o sqlite' },
                version: { min: 1, max: null, msg: 'version no puede estar vacío', isString: true },
                port:    { min: 1, max: 65535, msg: 'port debe estar en rango 1..65535' },
            },
        };

        const resourceRanges = ranges[resourceType];
        if (!resourceRanges) return;

        const range = resourceRanges[propName];
        if (!range) return;

        if (range.allowed) {
            if (!range.allowed.includes(value)) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Valor inválido para '${propName}': ${range.msg}`, line, column);
            }
            return;
        }

        if (range.isString && (typeof value !== 'string' || value.length === 0)) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Valor inválido para '${propName}': ${range.msg}`, line, column);
            return;
        }

        if (typeof value !== 'number') return;

        if (range.min !== null && value < range.min) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Valor inválido para '${propName}': ${range.msg}`, line, column);
        }
        if (range.max !== null && value > range.max) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Valor inválido para '${propName}': ${range.msg}`, line, column);
        }
    }

    visitFunctionDeclInstruction(node) {
        const returnType = new Type(
            node.returnType === 'void' ? DataType.VOID : node.returnType.replace('[]', '')
        );
        const returnIsArray = node.returnType && node.returnType.endsWith('[]');
        const retType = returnIsArray ? new Type(node.returnType.replace('[]', ''), true) : returnType;

        const paramList = node.params.map(p => ({
            name: p.name,
            type: p.type instanceof Type ? p.type : new Type(p.type.baseType, p.type.isArray)
        }));

        this.declare(node.name, retType, 'función', node.line, node.column, paramList);

        this.pushScope(node.name);
        for (const param of node.params) {
            const pType = param.type instanceof Type ? param.type : new Type(param.type.baseType, param.type.isArray);
            this.declare(param.name, pType, 'parámetro', node.line, node.column);
        }

        this.functionDepth++;
        const prevFunction = this.currentFunction;
        this.currentFunction = node.name;

        this.visit(node.body);

        this.functionDepth--;
        this.currentFunction = prevFunction;
        this.popScope();
    }

    visitTaskDeclInstruction(node) {
        this.declare(node.name, new Type('task'), 'task', node.line, node.column);

        if (node.name === 'main') {
            this.mainCount++;
        }

        this.pushScope(node.name);
        this.visit(node.body);
        this.popScope();
    }

    visitVarDeclInstruction(node) {
        const varType = new Type(node.type.baseType, node.type.isArray);
        const declared = this.declare(node.name, varType, 'variable', node.line, node.column);
        if (!declared) return;

        if (node.initializer !== null) {
            const initType = this.inferType(node.initializer);
            if (initType && !varType.isAssignable(initType)) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Tipo incompatible: no se puede asignar '${initType.toString()}' a variable de tipo '${varType.toString()}'`,
                    node.line, node.column);
            }
            if (varType.isArray) {
                this.checkArrayHomogeneity(node.initializer, varType.baseType, node.line, node.column);
            }
        }
    }

    checkArrayHomogeneity(expr, expectedBaseType, line, column) {
        if (expr.constructor.name === 'ArrayExpr') {
            for (const elem of expr.elements) {
                const elemType = this.inferType(elem);
                if (elemType && !new Type(expectedBaseType).isAssignable(elemType)) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Arreglo heterogéneo: elemento de tipo '${elemType.toString()}' no es compatible con '${expectedBaseType}'`,
                        elem.line, elem.column);
                }
            }
        }
    }

    visitAssignmentInstruction(node) {
        const targetType = this.inferType(node.target);
        const valueType = this.inferType(node.valueExpr);

        if (targetType && valueType && !targetType.isAssignable(valueType)) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Asignación incompatible: variable de tipo '${targetType.toString()}' no acepta valor de tipo '${valueType.toString()}'`,
                node.line, node.column);
        }

        if (node.target.constructor.name === 'IdentifierExpr') {
            const sym = this.lookup(node.target.name);
            if (!sym) {
                this.error(ErrorType.SEMANTICO, 'SEM-003',
                    `Variable '${node.target.name}' no declarada`, node.target.line, node.target.column);
            }
        }

        if (node.target.constructor.name === 'PropertyAccessExpr') {
            this.checkReadOnlyProperty(node.target);
        }

        if (node.target.constructor.name === 'IndexExpr') {
            const arrType = this.inferType(node.target.arrayExpr);
            if (arrType && arrType.isArray) {
                const elemType = this.arrayElementType(arrType);
                if (elemType && valueType && !elemType.isAssignable(valueType)) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Tipo incompatible en índice: arreglo de '${elemType.toString()}' no acepta '${valueType.toString()}'`,
                        node.line, node.column);
                }
            }
        }
    }

    checkReadOnlyProperty(target) {
        if (target.object.constructor.name !== 'IdentifierExpr') return;
        const sym = this.lookup(target.object.name);
        if (!sym) return;
        const baseType = sym.type.baseType;
        if (!RESOURCE_TYPES.has(baseType)) return;

        const props = RESOURCE_PROPERTIES[baseType];
        if (!props) return;
        const propDef = props[target.property];
        if (propDef && propDef.readOnly) {
            this.error(ErrorType.SEMANTICO, 'SEM-005',
                `No se puede modificar la propiedad de solo lectura '${target.property}' del recurso '${target.object.name}'`,
                target.line, target.column);
        }
    }

    visitIfInstruction(node) {
        const condType = this.inferType(node.condition);
        if (condType && condType.baseType !== DataType.BOOL && condType.baseType !== DataType.ANY) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Condición en 'if' debe ser de tipo bool, se obtuvo '${condType.toString()}'`,
                node.condition.line, node.condition.column);
        }

        this.pushScope('if');
        this.visit(node.thenBranch);
        this.popScope();

        if (node.elseBranch) {
            this.pushScope('else');
            this.visit(node.elseBranch);
            this.popScope();
        }
    }

    visitWhileInstruction(node) {
        const condType = this.inferType(node.condition);
        if (condType && condType.baseType !== DataType.BOOL && condType.baseType !== DataType.ANY) {
            this.error(ErrorType.SEMANTICO, 'SEM-002',
                `Condición en 'while' debe ser de tipo bool, se obtuvo '${condType.toString()}'`,
                node.condition.line, node.condition.column);
        }

        this.loopDepth++;
        this.pushScope('while');
        this.visit(node.body);
        this.popScope();
        this.loopDepth--;
    }

    visitForInstruction(node) {
        this.loopDepth++;
        this.pushScope('for');

        if (node.init) this.visit(node.init);
        if (node.condition) {
            const condType = this.inferType(node.condition);
            if (condType && condType.baseType !== DataType.BOOL && condType.baseType !== DataType.ANY) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Condición en 'for' debe ser de tipo bool, se obtuvo '${condType.toString()}'`,
                    node.condition.line, node.condition.column);
            }
        }
        if (node.update) this.visit(node.update);

        this.pushScope('for-body');
        this.visit(node.body);
        this.popScope();

        this.popScope();
        this.loopDepth--;
    }

    visitBreakInstruction(node) {
        if (this.loopDepth === 0) {
            this.error(ErrorType.SEMANTICO, 'SEM-005',
                `'break' solo es válido dentro de un ciclo while o for`, node.line, node.column);
        }
    }

    visitContinueInstruction(node) {
        if (this.loopDepth === 0) {
            this.error(ErrorType.SEMANTICO, 'SEM-005',
                `'continue' solo es válido dentro de un ciclo while o for`, node.line, node.column);
        }
    }

    visitReturnInstruction(node) {
        if (this.functionDepth === 0) {
            this.error(ErrorType.SEMANTICO, 'SEM-005',
                `'return' solo es válido dentro de una función`, node.line, node.column);
            return;
        }

        const funcScope = this.scopes.find(s => s.name === this.currentFunction || s.symbols.has(this.currentFunction));
        const funcSym = funcScope ? funcScope.symbols.get(this.currentFunction) : null;

        const expectedReturnType = funcSym ? funcSym.type : new Type(DataType.VOID);

        if (node.valueExpr !== null) {
            const returnType = this.inferType(node.valueExpr);
            if (returnType && !expectedReturnType.isAssignable(returnType)) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Tipo de retorno incompatible: función '${this.currentFunction}' espera '${expectedReturnType.toString()}' pero se retornó '${returnType.toString()}'`,
                    node.line, node.column);
            }
        } else {
            if (expectedReturnType.baseType !== DataType.VOID && expectedReturnType.baseType !== DataType.ANY) {
                this.error(ErrorType.SEMANTICO, 'SEM-005',
                    `Función '${this.currentFunction}' tiene tipo de retorno '${expectedReturnType.toString()}' pero no se proporcionó un valor de retorno`,
                    node.line, node.column);
            }
        }
    }

    visitRunInstruction(node) {
        const sym = this.lookup(node.taskName);
        if (!sym) {
            this.error(ErrorType.SEMANTICO, 'SEM-003',
                `Task '${node.taskName}' no encontrada para ejecutar con 'run'`, node.line, node.column);
        } else if (sym.category !== 'task') {
            this.error(ErrorType.SEMANTICO, 'SEM-003',
                `'${node.taskName}' no es un task`, node.line, node.column);
        }
    }

    visitBlockInstruction(node) {
        for (const stmt of node.statements) {
            this.visit(stmt);
        }
    }

    visitExpressionInstruction(node) {
        this.inferType(node.expression);
    }

    // ============================================
    // Expression Type Inference
    // ============================================

    inferType(node) {
        if (!node) return null;
        const methodName = 'infer' + node.constructor.name;
        const method = this[methodName];
        if (typeof method === 'function') {
            return method.call(this, node);
        }
        return null;
    }

    inferLiteralExpr(node) {
        return this.typeOfLiteral(node.type);
    }

    inferIdentifierExpr(node) {
        const sym = this.lookup(node.name);
        if (!sym) {
            this.error(ErrorType.SEMANTICO, 'SEM-003',
                `Identificador '${node.name}' no declarado`, node.line, node.column);
            return new Type(DataType.ANY);
        }
        if (sym.type instanceof Type) {
            return sym.type;
        }
        return new Type(sym.type);
    }

    inferBinaryExpr(node) {
        const leftType = this.inferType(node.left);
        const rightType = this.inferType(node.right);

        if (!leftType || !rightType) return new Type(DataType.ANY);

        const lBase = leftType.baseType;
        const rBase = rightType.baseType;

        switch (node.operator) {
            case '&&':
            case '||':
                if (lBase !== DataType.BOOL && lBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador '${node.operator}' requiere operandos de tipo bool, se obtuvo '${lBase}'`,
                        node.left.line, node.left.column);
                }
                if (rBase !== DataType.BOOL && rBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador '${node.operator}' requiere operandos de tipo bool, se obtuvo '${rBase}'`,
                        node.right.line, node.right.column);
                }
                return new Type(DataType.BOOL);

            case '==':
            case '!=':
                if (!this.isEqualityCompatible(lBase, rBase)) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Comparación de igualdad incompatible entre '${lBase}' y '${rBase}'`,
                        node.line, node.column);
                }
                return new Type(DataType.BOOL);

            case '<':
            case '<=':
            case '>':
            case '>=':
                if (!['int', 'float'].includes(lBase) && lBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador relacional '${node.operator}' requiere operandos numéricos, se obtuvo '${lBase}'`,
                        node.left.line, node.left.column);
                }
                if (!['int', 'float'].includes(rBase) && rBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador relacional '${node.operator}' requiere operandos numéricos, se obtuvo '${rBase}'`,
                        node.right.line, node.right.column);
                }
                return new Type(DataType.BOOL);

            case '+':
                if (lBase === DataType.STRING || rBase === DataType.STRING) {
                    return new Type(DataType.STRING);
                }
                if (lBase === DataType.INT && rBase === DataType.INT) {
                    return new Type(DataType.INT);
                }
                if (lBase === DataType.FLOAT || rBase === DataType.FLOAT) {
                    return new Type(DataType.FLOAT);
                }
                if (lBase === DataType.ANY || rBase === DataType.ANY) {
                    return new Type(DataType.ANY);
                }
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Operador '+' no válido entre '${lBase}' y '${rBase}'`, node.line, node.column);
                return new Type(DataType.ANY);

            case '-':
            case '*':
            case '/':
                if (!['int', 'float'].includes(lBase) && lBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador '${node.operator}' requiere operandos numéricos, se obtuvo '${lBase}'`,
                        node.left.line, node.left.column);
                }
                if (!['int', 'float'].includes(rBase) && rBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador '${node.operator}' requiere operandos numéricos, se obtuvo '${rBase}'`,
                        node.right.line, node.right.column);
                }
                if (lBase === DataType.FLOAT || rBase === DataType.FLOAT) {
                    return new Type(DataType.FLOAT);
                }
                return new Type(DataType.INT);

            case '%':
                // SOLO int % int → int
                if (lBase !== DataType.INT && lBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador '%' requiere operando izquierdo de tipo int, se obtuvo '${lBase}'`,
                        node.left.line, node.left.column);
                }
                if (rBase !== DataType.INT && rBase !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-002',
                        `Operador '%' requiere operando derecho de tipo int, se obtuvo '${rBase}'`,
                        node.right.line, node.right.column);
                }
                return new Type(DataType.INT);

            default:
                return new Type(DataType.ANY);
        }
    }

    isEqualityCompatible(lBase, rBase) {
        if (lBase === DataType.ANY || rBase === DataType.ANY) return true;
        if (lBase === rBase) return true;
        // números compatibles
        if (['int', 'float'].includes(lBase) && ['int', 'float'].includes(rBase)) return true;
        return false;
    }

    inferUnaryExpr(node) {
        const valType = this.inferType(node.right);
        if (node.operator === '-') {
            if (valType && ['int', 'float'].includes(valType.baseType) === false && valType.baseType !== DataType.ANY) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Operador unario '-' solo permite números, se obtuvo '${valType.baseType}'`,
                    node.right.line, node.right.column);
            }
            return valType || new Type(DataType.ANY);
        }
        if (node.operator === '!') {
            if (valType && valType.baseType !== DataType.BOOL && valType.baseType !== DataType.ANY) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Operador '!' requiere tipo bool, se obtuvo '${valType.baseType}'`,
                    node.right.line, node.right.column);
            }
            return new Type(DataType.BOOL);
        }
        return new Type(DataType.ANY);
    }

    inferPropertyAccessExpr(node) {
        const objType = this.inferType(node.object);
        if (!objType) return new Type(DataType.ANY);

        const baseType = objType.baseType;
        if (RESOURCE_TYPES.has(baseType)) {
            const props = RESOURCE_PROPERTIES[baseType];
            if (props) {
                const propDef = props[node.property];
                if (!propDef) {
                    this.error(ErrorType.SEMANTICO, 'SEM-005',
                        `Propiedad '${node.property}' no existe en '${baseType}'`,
                        node.object.line, node.object.column);
                    return new Type(DataType.ANY);
                }
                return propDef.type;
            }
        }

        if (objType.baseType === 'resource') {
            const sym = this.lookup(node.object.name);
            if (sym && RESOURCE_TYPES.has(sym.type && sym.type.baseType)) {
                const props = RESOURCE_PROPERTIES[sym.type.baseType];
                if (props) {
                    const propDef = props[node.property];
                    if (!propDef) {
                        this.error(ErrorType.SEMANTICO, 'SEM-005',
                            `Propiedad '${node.property}' no existe en '${sym.type.baseType}'`,
                            node.object.line, node.object.column);
                        return new Type(DataType.ANY);
                    }
                    return propDef.type;
                }
            }
        }

        return new Type(DataType.ANY);
    }

    inferIndexExpr(node) {
        const arrType = this.inferType(node.arrayExpr);
        if (!arrType) return new Type(DataType.ANY);
        if (!arrType.isArray) {
            this.error(ErrorType.SEMANTICO, 'SEM-006',
                `No se puede indexar tipo no-arreglo '${arrType.toString()}'`,
                node.arrayExpr.line, node.arrayExpr.column);
            return new Type(DataType.ANY);
        }
        return this.arrayElementType(arrType);
    }

    inferArrayExpr(node) {
        if (node.elements.length === 0) {
            return new Type(DataType.ANY, true);
        }

        const firstType = this.inferType(node.elements[0]);
        for (let i = 1; i < node.elements.length; i++) {
            const elemType = this.inferType(node.elements[i]);
            if (elemType && firstType && !firstType.isAssignable(elemType) && !elemType.isAssignable(firstType)) {
                this.checkArrayHomogeneity(node.elements[i], firstType.baseType, node.elements[i].line, node.elements[i].column);
            }
        }

        if (firstType) {
            return new Type(firstType.baseType, true);
        }
        return new Type(DataType.ANY, true);
    }

    inferCallExpr(node) {
        if (NATIVE_FUNCTIONS[node.callee]) {
            const sig = NATIVE_FUNCTIONS[node.callee];
            this.validateNativeCall(node, sig);
            return new Type(sig.returnType);
        }

        const sym = this.lookup(node.callee);
        if (!sym) {
            this.error(ErrorType.SEMANTICO, 'SEM-003',
                `Función '${node.callee}' no declarada`, node.line, node.column);
            return new Type(DataType.ANY);
        }

        if (sym.category !== 'función') {
            this.error(ErrorType.SEMANTICO, 'SEM-003',
                `'${node.callee}' no es una función`, node.line, node.column);
            return new Type(DataType.ANY);
        }

        this.validateFunctionCall(node, sym);
        return sym.type instanceof Type ? sym.type : new Type(sym.type);
    }

    validateNativeCall(node, sig) {
        const arity = sig.params.length;
        if (sig.variadic) {
            if (node.args.length === 0) {
                this.error(ErrorType.SEMANTICO, 'SEM-007',
                    `Firma incorrecta: '${node.callee}' requiere al menos 1 argumento`, node.line, node.column);
            }
            return;
        }

        if (node.args.length !== arity) {
            this.error(ErrorType.SEMANTICO, 'SEM-007',
                `Firma incorrecta: '${node.callee}' requiere ${arity} argumento(s), se recibieron ${node.args.length}`,
                node.line, node.column);
            return;
        }

        for (let i = 0; i < node.args.length; i++) {
            const argType = this.inferType(node.args[i]);
            const expected = sig.params[i];

            if (expected === 'ARRAY_OR_STRING') {
                if (argType && !argType.isArray && argType.baseType !== DataType.STRING && argType.baseType !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-007',
                        `Argumento ${i + 1} de '${node.callee}' debe ser un arreglo o string, se obtuvo '${argType.toString()}'`,
                        node.args[i].line, node.args[i].column);
                }
            } else if (argType) {
                const expectedType = new Type(expected === DataType.RESOURCE ? DataType.RESOURCE : expected);
                if (!expectedType.isAssignable(argType) && argType.baseType !== DataType.ANY) {
                    this.error(ErrorType.SEMANTICO, 'SEM-007',
                        `Argumento ${i + 1} de '${node.callee}' debe ser de tipo '${expectedType.toString()}', se obtuvo '${argType.toString()}'`,
                        node.args[i].line, node.args[i].column);
                }
            }
        }
    }

    validateFunctionCall(node, sym) {
        const funcSym = sym;
        if (!funcSym.params) return;

        if (node.args.length !== funcSym.params.length) {
            this.error(ErrorType.SEMANTICO, 'SEM-004',
                `Número de argumentos incorrecto en '${node.callee}': se esperaban ${funcSym.params.length}, se recibieron ${node.args.length}`,
                node.line, node.column);
            return;
        }

        for (let i = 0; i < node.args.length; i++) {
            const argType = this.inferType(node.args[i]);
            const param = funcSym.params[i];
            const paramType = param.type;
            if (argType && paramType && !paramType.isAssignable(argType) && argType.baseType !== DataType.ANY) {
                this.error(ErrorType.SEMANTICO, 'SEM-002',
                    `Argumento ${i + 1} de '${node.callee}' debe ser de tipo '${paramType.toString()}', se obtuvo '${argType.toString()}'`,
                    node.args[i].line, node.args[i].column);
            }
        }
    }
}
