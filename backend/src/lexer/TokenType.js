/**
 * Enumeración de tipos de tokens para AutoInfra
 */
export const TokenType = Object.freeze({
    // Palabras Reservadas - Tipos
    INT: 'INT',
    FLOAT: 'FLOAT',
    STRING_TYPE: 'STRING_TYPE',
    BOOL: 'BOOL',
    SERVER: 'SERVER',
    SERVICE: 'SERVICE',
    DATABASE: 'DATABASE',

    // Palabras Reservadas - Control de Flujo
    IF: 'IF',
    ELSE: 'ELSE',
    WHILE: 'WHILE',
    FOR: 'FOR',
    BREAK: 'BREAK',
    CONTINUE: 'CONTINUE',
    RETURN: 'RETURN',

    // Palabras Reservadas - Declaraciones y Ejecución
    FUNCTION: 'FUNCTION',
    TASK: 'TASK',
    MAIN: 'MAIN',
    RUN: 'RUN',

    // Literales y Constantes
    IDENTIFIER: 'IDENTIFIER',
    INT_LITERAL: 'INT_LITERAL',
    FLOAT_LITERAL: 'FLOAT_LITERAL',
    STRING_LITERAL: 'STRING_LITERAL',
    TRUE: 'TRUE',
    FALSE: 'FALSE',

    // Operadores Aritméticos
    PLUS: 'PLUS',           // +
    MINUS: 'MINUS',         // -
    STAR: 'STAR',           // *
    SLASH: 'SLASH',         // /
    PERCENT: 'PERCENT',     // %

    // Operadores Relacionales y de Igualdad
    EQUAL_EQUAL: 'EQUAL_EQUAL',     // ==
    BANG_EQUAL: 'BANG_EQUAL',       // !=
    LESS_EQUAL: 'LESS_EQUAL',       // <=
    GREATER_EQUAL: 'GREATER_EQUAL', // >=
    LESS: 'LESS',                   // <
    GREATER: 'GREATER',             // >

    // Operadores Lógicos
    AND: 'AND',   // &&
    OR: 'OR',     // ||
    BANG: 'BANG', // !

    // Operador de Asignación
    EQUAL: 'EQUAL', // =

    // Delimitadores y Puntuación
    LPAREN: 'LPAREN',       // (
    RPAREN: 'RPAREN',       // )
    LBRACE: 'LBRACE',       // {
    RBRACE: 'RBRACE',       // }
    LBRACKET: 'LBRACKET',   // [
    RBRACKET: 'RBRACKET',   // ]
    SEMICOLON: 'SEMICOLON', // ;
    COMMA: 'COMMA',         // ,
    DOT: 'DOT',             // .

    // Fin de archivo
    EOF: 'EOF'
});
