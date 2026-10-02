import { ErrorType } from './ErrorType.js';

export class CompilerError {
    /**
     * @param {string} type - Léxico, Sintáctico, Semántico, Infraestructura, Ejecución
     * @param {string} code - Código de error (ej: SEM-001, INFRA-004, LEX-001, etc.)
     * @param {string} description - Mensaje explicativo
     * @param {number} line - Línea (1-indexed)
     * @param {number} column - Columna (1-indexed)
     */
    constructor(type, code, description, line, column) {
        this.type = type;
        this.code = code;
        this.description = description;
        this.line = line;
        this.column = column;
    }

    toString() {
        return `[${this.type}] ${this.code ? this.code + ': ' : ''}${this.description} (Línea: ${this.line}, Columna: ${this.column})`;
    }
}
