/**
 * Nodo base para cualquier elemento del Árbol de Sintaxis Abstracta (AST)
 */
export class ASTNode {
    /**
     * @param {number} line 
     * @param {number} column 
     */
    constructor(line = 0, column = 0) {
        this.line = line;
        this.column = column;
    }

    /**
     * Método para serialización o recorrido gráfico
     */
    getNodeLabel() {
        return this.constructor.name;
    }
}

/**
 * Nodo base para expresiones que retornan un valor al evaluarse
 */
export class Expression extends ASTNode {
    /**
     * Evalúa la expresión en el entorno dado
     * @param {import('../environment/Environment.js').Environment} environment 
     * @returns {*}
     */
    evaluate(environment) {
        throw new Error(`evaluate() no implementado en ${this.constructor.name}`);
    }
}

/**
 * Nodo base para instrucciones que producen efectos o alteran el flujo
 */
export class Instruction extends ASTNode {
    /**
     * Ejecuta la instrucción en el entorno dado
     * @param {import('../environment/Environment.js').Environment} environment 
     * @returns {import('../environment/ExecSignal.js').ExecutionResult}
     */
    execute(environment) {
        throw new Error(`execute() no implementado en ${this.constructor.name}`);
    }
}
