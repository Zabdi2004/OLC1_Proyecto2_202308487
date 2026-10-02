export class Token {
    /**
     * @param {string} type - Tipo de token (de TokenType)
     * @param {string} lexeme - Texto coincidente exacto
     * @param {*} literal - Valor evaluado (número, string, bool, etc.)
     * @param {number} line - Número de línea (1-indexed)
     * @param {number} column - Número de columna (1-indexed)
     */
    constructor(type, lexeme, literal, line, column) {
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
        this.column = column;
    }

    toString() {
        return `Token(${this.type}, "${this.lexeme}", Line:${this.line}, Col:${this.column})`;
    }
}
