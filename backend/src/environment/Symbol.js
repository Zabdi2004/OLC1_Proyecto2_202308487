export class Symbol {
    /**
     * @param {string} name - Nombre del identificador
     * @param {string} category - 'recurso', 'variable', 'parámetro', 'función', 'task'
     * @param {string} type - 'int', 'float', 'string', 'server', 'string[]', etc.
     * @param {string} scope - Nombre del ámbito (ej: 'global', nombre de función)
     * @param {*} value - Valor actual o referencia
     * @param {number} line
     * @param {number} column
     */
    constructor(name, category, type, scope, value, line = 0, column = 0) {
        this.name = name;
        this.category = category;
        this.type = type;
        this.scope = scope;
        this.value = value;
        this.line = line;
        this.column = column;
    }

    getDisplayValue() {
        if (this.value === null || this.value === undefined) return 'null';
        if (typeof this.value === 'object') {
            if (this.value.status !== undefined) return this.value.status; // Para recursos (running, stopped)
            if (Array.isArray(this.value)) return JSON.stringify(this.value);
            if (this.value.name) return this.value.name;
        }
        return String(this.value);
    }

    toJSON() {
        return {
            name: this.name,
            category: this.category,
            type: this.type,
            scope: this.scope,
            value: this.getDisplayValue(),
            line: this.line,
            column: this.column
        };
    }
}
