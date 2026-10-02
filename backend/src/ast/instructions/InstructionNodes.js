import { Instruction } from '../ASTNode.js';
import { ExecutionResult, ExecSignal } from '../../environment/ExecSignal.js';
import { Environment } from '../../environment/Environment.js';
import { Symbol } from '../../environment/Symbol.js';
import { ServerResource } from '../../infrastructure/ServerResource.js';
import { ServiceResource } from '../../infrastructure/ServiceResource.js';
import { DatabaseResource } from '../../infrastructure/DatabaseResource.js';

// Contador global de seguridad para evitar bloqueos por ciclos infinitos (Sección 7.5: 100,000 max)
export let globalInstructionCounter = 0;
export const MAX_INSTRUCTIONS = 100000;

export function resetInstructionCounter() {
    globalInstructionCounter = 0;
}

export function checkInstructionLimit(line, col) {
    globalInstructionCounter++;
    if (globalInstructionCounter > MAX_INSTRUCTIONS) {
        const err = new Error(`Límite de seguridad de ${MAX_INSTRUCTIONS} instrucciones excedido. Posible ciclo infinito.`);
        err.code = 'RUN-LIMIT';
        err.line = line;
        err.column = col;
        throw err;
    }
}

export class BlockInstruction extends Instruction {
    constructor(statements = [], line = 0, column = 0) {
        super(line, column);
        this.statements = statements;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        for (const stmt of this.statements) {
            const res = stmt.execute(environment);
            if (res && res.signal !== ExecSignal.NORMAL) {
                return res; // Propaga return, break o continue
            }
        }
        return ExecutionResult.normal();
    }

    getNodeLabel() {
        return `Block[${this.statements.length}]`;
    }
}

export class ExpressionInstruction extends Instruction {
    constructor(expression, line = 0, column = 0) {
        super(line, column);
        this.expression = expression;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        this.expression.evaluate(environment);
        return ExecutionResult.normal();
    }

    getNodeLabel() {
        return `ExprStmt`;
    }
}

export class VarDeclInstruction extends Instruction {
    constructor(type, name, initializer = null, line = 0, column = 0) {
        super(line, column);
        this.type = type; // Type object or string
        this.name = name;
        this.initializer = initializer; // Expression or null
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        if (environment.existsCurrent(this.name)) {
            const err = new Error(`Identificador '${this.name}' ya ha sido declarado en este ámbito`);
            err.code = 'SEM-001';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        let val = null;
        if (this.initializer !== null) {
            val = this.initializer.evaluate(environment);
            // Validación de tipos básica
            this.validateType(val);
        } else {
            val = typeof this.type.getDefaultValue === 'function' ? this.type.getDefaultValue() : null;
        }

        const typeStr = this.type.toString ? this.type.toString() : String(this.type);
        const sym = new Symbol(this.name, 'variable', typeStr, environment.name, val, this.line, this.column);
        environment.define(this.name, sym);

        return ExecutionResult.normal();
    }

    validateType(val) {
        const typeStr = this.type.toString ? this.type.toString() : String(this.type);
        if (typeStr === 'int' && !Number.isInteger(val)) {
            const err = new Error(`Tipo incompatible: no se puede asignar '${val}' a una variable de tipo int`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        if (typeStr === 'float' && typeof val !== 'number') {
            const err = new Error(`Tipo incompatible: no se puede asignar '${val}' a una variable de tipo float`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        if (typeStr === 'string' && typeof val !== 'string') {
            const err = new Error(`Tipo incompatible: valor '${val}' no es de tipo string`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        if (typeStr === 'bool' && typeof val !== 'boolean') {
            const err = new Error(`Tipo incompatible: valor '${val}' no es de tipo bool`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
        if (typeStr.endsWith('[]') && !Array.isArray(val)) {
            const err = new Error(`Tipo incompatible: se esperaba un arreglo para '${typeStr}'`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }
    }

    getNodeLabel() {
        return `VarDecl(${this.type} ${this.name})`;
    }
}

export class AssignmentInstruction extends Instruction {
    constructor(target, valueExpr, line = 0, column = 0) {
        super(line, column);
        this.target = target; // IdentifierExpr, PropertyAccessExpr, or IndexExpr
        this.valueExpr = valueExpr;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        const val = this.valueExpr.evaluate(environment);

        // Caso 1: Asignación a variable simple (x = 5;)
        if (this.target.constructor.name === 'IdentifierExpr') {
            const varName = this.target.name;
            const sym = environment.lookup(varName);
            if (!sym) {
                const err = new Error(`Variable '${varName}' no declarada`);
                err.code = 'SEM-003';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            environment.assign(varName, val);
            return ExecutionResult.normal();
        }

        // Caso 2: Asignación a propiedad (backend.status = "running";)
        if (this.target.constructor.name === 'PropertyAccessExpr') {
            const obj = this.target.object.evaluate(environment);
            const prop = this.target.property;

            if (obj && obj.isReadOnlyProperty && obj.isReadOnlyProperty(prop)) {
                const err = new Error(`No se puede modificar la propiedad de solo lectura '${prop}' del recurso '${obj.name}'`);
                err.code = 'SEM-005';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }

            if (obj && obj.setProperty) {
                obj.setProperty(prop, val);
                return ExecutionResult.normal();
            }

            if (obj) {
                obj[prop] = val;
                return ExecutionResult.normal();
            }
        }

        // Caso 3: Asignación a índice de arreglo (pkgs[i] = "val";)
        if (this.target.constructor.name === 'IndexExpr') {
            const arr = this.target.arrayExpr.evaluate(environment);
            const idx = this.target.indexExpr.evaluate(environment);
            if (Array.isArray(arr) && Number.isInteger(idx) && idx >= 0 && idx < arr.length) {
                arr[idx] = val;
                return ExecutionResult.normal();
            }
        }

        throw new Error(`Objetivo de asignación no válido`);
    }

    getNodeLabel() {
        return `Assignment`;
    }
}

export class IfInstruction extends Instruction {
    constructor(condition, thenBranch, elseBranch = null, line = 0, column = 0) {
        super(line, column);
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        const condVal = this.condition.evaluate(environment);
        if (typeof condVal !== 'boolean') {
            const err = new Error(`Condición en 'if' debe producir un valor booleano`);
            err.code = 'SEM-002';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        const ifScope = new Environment(environment, 'if');
        if (condVal) {
            return this.thenBranch.execute(ifScope);
        } else if (this.elseBranch !== null) {
            const elseScope = new Environment(environment, 'else');
            return this.elseBranch.execute(elseScope);
        }

        return ExecutionResult.normal();
    }

    getNodeLabel() {
        return `If`;
    }
}

export class WhileInstruction extends Instruction {
    constructor(condition, body, line = 0, column = 0) {
        super(line, column);
        this.condition = condition;
        this.body = body;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        while (true) {
            checkInstructionLimit(this.line, this.column);
            const condVal = this.condition.evaluate(environment);
            if (typeof condVal !== 'boolean') {
                const err = new Error(`Condición en 'while' debe producir un valor booleano`);
                err.code = 'SEM-002';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            if (!condVal) break;

            const loopScope = new Environment(environment, 'while');
            const res = this.body.execute(loopScope);

            if (res && res.signal === ExecSignal.BREAK) {
                break;
            }
            if (res && res.signal === ExecSignal.RETURN) {
                return res; // Propagar return fuera del ciclo
            }
            // CONTINUE continúa el siguiente ciclo de forma natural
        }
        return ExecutionResult.normal();
    }

    getNodeLabel() {
        return `While`;
    }
}

export class ForInstruction extends Instruction {
    constructor(init, condition, update, body, line = 0, column = 0) {
        super(line, column);
        this.init = init;         // VarDeclInstruction or AssignmentInstruction or null
        this.condition = condition; // Expression or null
        this.update = update;     // AssignmentInstruction or ExprStmt or null
        this.body = body;         // Instruction
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        // Crear un scope para el ciclo for (para la variable del for)
        const forScope = new Environment(environment, 'for');

        if (this.init !== null) {
            this.init.execute(forScope);
        }

        while (true) {
            checkInstructionLimit(this.line, this.column);
            if (this.condition !== null) {
                const condVal = this.condition.evaluate(forScope);
                if (typeof condVal !== 'boolean') {
                    const err = new Error(`Condición en 'for' debe producir un valor booleano`);
                    err.code = 'SEM-002';
                    err.line = this.line;
                    err.column = this.column;
                    throw err;
                }
                if (!condVal) break;
            }

            const bodyScope = new Environment(forScope, 'for-body');
            const res = this.body.execute(bodyScope);

            if (res && res.signal === ExecSignal.BREAK) {
                break;
            }
            if (res && res.signal === ExecSignal.RETURN) {
                return res;
            }

            // Ejecutar la actualización del for
            if (this.update !== null) {
                this.update.execute(forScope);
            }
        }

        return ExecutionResult.normal();
    }

    getNodeLabel() {
        return `For`;
    }
}

export class BreakInstruction extends Instruction {
    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        return ExecutionResult.break();
    }

    getNodeLabel() {
        return `Break`;
    }
}

export class ContinueInstruction extends Instruction {
    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        return ExecutionResult.continue();
    }

    getNodeLabel() {
        return `Continue`;
    }
}

export class ReturnInstruction extends Instruction {
    constructor(valueExpr = null, line = 0, column = 0) {
        super(line, column);
        this.valueExpr = valueExpr;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        const val = this.valueExpr !== null ? this.valueExpr.evaluate(environment) : null;
        return ExecutionResult.return(val);
    }

    getNodeLabel() {
        return `Return`;
    }
}

export class FunctionDeclInstruction extends Instruction {
    constructor(name, params = [], returnType = 'void', body = null, line = 0, column = 0) {
        super(line, column);
        this.name = name;
        this.params = params; // Array de { type, name }
        this.returnType = returnType;
        this.body = body;
        this.callDepth = 0;
        this.maxRecursionDepth = 1000; // Sección 8.3
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        if (environment.existsCurrent(this.name)) {
            const err = new Error(`Función '${this.name}' ya ha sido declarada`);
            err.code = 'SEM-001';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        const sym = new Symbol(this.name, 'función', this.returnType, environment.name, this, this.line, this.column);
        environment.define(this.name, sym);
        return ExecutionResult.normal();
    }

    call(args, callingEnvironment, callLine, callCol) {
        if (args.length !== this.params.length) {
            const err = new Error(`Número de argumentos incorrecto en '${this.name}': se esperaban ${this.params.length}, se recibieron ${args.length}`);
            err.code = 'SEM-004';
            err.line = callLine;
            err.column = callCol;
            throw err;
        }

        this.callDepth++;
        if (this.callDepth > this.maxRecursionDepth) {
            this.callDepth = 0;
            const err = new Error(`Límite de recursividad máxima (${this.maxRecursionDepth}) excedido en función '${this.name}'`);
            err.code = 'RUN-RECURSION';
            err.line = callLine;
            err.column = callCol;
            throw err;
        }

        try {
            // El nuevo entorno local de la función se enlaza al entorno global / donde fue declarada
            const funcEnv = new Environment(callingEnvironment, this.name);

            // Registrar parámetros en el entorno
            for (let i = 0; i < this.params.length; i++) {
                const param = this.params[i];
                const argVal = args[i];
                const sym = new Symbol(param.name, 'parámetro', String(param.type), this.name, argVal, callLine, callCol);
                funcEnv.define(param.name, sym);
            }

            const result = this.body.execute(funcEnv);
            return result && result.signal === ExecSignal.RETURN ? result.value : null;
        } finally {
            this.callDepth--;
        }
    }

    getNodeLabel() {
        return `FuncDecl(${this.name} -> ${this.returnType})`;
    }
}

export class TaskDeclInstruction extends Instruction {
    constructor(name, body, line = 0, column = 0) {
        super(line, column);
        this.name = name;
        this.body = body;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        if (environment.existsCurrent(this.name)) {
            const err = new Error(`Task '${this.name}' ya ha sido declarada`);
            err.code = 'SEM-001';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        const sym = new Symbol(this.name, 'task', 'task', environment.name, this, this.line, this.column);
        environment.define(this.name, sym);
        return ExecutionResult.normal();
    }

    run(environment) {
        const taskEnv = new Environment(environment, this.name);
        return this.body.execute(taskEnv);
    }

    getNodeLabel() {
        return `TaskDecl(${this.name})`;
    }
}

export class RunInstruction extends Instruction {
    constructor(taskName, line = 0, column = 0) {
        super(line, column);
        this.taskName = taskName;
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        const taskSymbol = environment.lookup(this.taskName);
        if (!taskSymbol || taskSymbol.category !== 'task') {
            const err = new Error(`Task '${this.taskName}' no encontrada para ejecutar con 'run'`);
            err.code = 'SEM-003';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        const taskNode = taskSymbol.value;
        return taskNode.run(environment);
    }

    getNodeLabel() {
        return `Run(${this.taskName})`;
    }
}

export class ResourceDeclInstruction extends Instruction {
    constructor(resourceType, name, properties = {}, line = 0, column = 0) {
        super(line, column);
        this.resourceType = resourceType; // 'server', 'service', 'database'
        this.name = name;
        this.properties = properties;     // Objeto con { propName: Expression }
    }

    execute(environment) {
        checkInstructionLimit(this.line, this.column);
        if (environment.existsCurrent(this.name)) {
            const err = new Error(`Recurso '${this.name}' ya ha sido declarado`);
            err.code = 'SEM-001';
            err.line = this.line;
            err.column = this.column;
            throw err;
        }

        // Evaluar las propiedades iniciales
        const evaluatedProps = {};
        for (const [key, expr] of Object.entries(this.properties)) {
            evaluatedProps[key] = expr.evaluate(environment);
        }

        let resourceInstance = null;
        if (this.resourceType === 'server') {
            // Validar restricciones numéricas de server (Sección 9.1)
            if (evaluatedProps.cpu !== undefined && evaluatedProps.cpu <= 0) {
                const err = new Error(`server.cpu debe ser > 0`);
                err.code = 'SEM-008';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            if (evaluatedProps.memory !== undefined && evaluatedProps.memory <= 0) {
                const err = new Error(`server.memory debe ser > 0`);
                err.code = 'SEM-008';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            if (evaluatedProps.disk !== undefined && evaluatedProps.disk <= 0) {
                const err = new Error(`server.disk debe ser > 0`);
                err.code = 'SEM-008';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            resourceInstance = new ServerResource(this.name, evaluatedProps);
            environment.infraState.addServer(resourceInstance);
        } else if (this.resourceType === 'service') {
            // Validar restricciones de service (Sección 9.2)
            if (evaluatedProps.port !== undefined && (evaluatedProps.port < 1 || evaluatedProps.port > 65535)) {
                const err = new Error(`service.port debe estar entre 1 y 65535`);
                err.code = 'SEM-008';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            if (evaluatedProps.replicas !== undefined && evaluatedProps.replicas < 1) {
                const err = new Error(`service.replicas debe ser >= 1`);
                err.code = 'SEM-008';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            resourceInstance = new ServiceResource(this.name, evaluatedProps);
            environment.infraState.addService(resourceInstance);
        } else if (this.resourceType === 'database') {
            // Validar restricciones de database (Sección 9.3)
            if (evaluatedProps.port !== undefined && (evaluatedProps.port < 1 || evaluatedProps.port > 65535)) {
                const err = new Error(`database.port debe estar entre 1 y 65535`);
                err.code = 'SEM-008';
                err.line = this.line;
                err.column = this.column;
                throw err;
            }
            resourceInstance = new DatabaseResource(this.name, evaluatedProps);
            environment.infraState.addDatabase(resourceInstance);
        }

        const sym = new Symbol(this.name, 'recurso', this.resourceType, environment.name, resourceInstance, this.line, this.column);
        environment.define(this.name, sym);

        return ExecutionResult.normal();
    }

    getNodeLabel() {
        return `ResourceDecl(${this.resourceType} ${this.name})`;
    }
}
