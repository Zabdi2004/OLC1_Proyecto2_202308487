import { TokenType } from '../lexer/TokenType.js';
import { CompilerError } from '../errors/CompilerError.js';
import { ErrorType } from '../errors/ErrorType.js';
import { Type, DataType } from '../environment/Type.js';

import {
    LiteralExpr,
    IdentifierExpr,
    BinaryExpr,
    UnaryExpr,
    CallExpr,
    PropertyAccessExpr,
    IndexExpr,
    ArrayExpr
} from '../ast/expressions/ExpressionNodes.js';

import {
    BlockInstruction,
    ExpressionInstruction,
    VarDeclInstruction,
    AssignmentInstruction,
    IfInstruction,
    WhileInstruction,
    ForInstruction,
    BreakInstruction,
    ContinueInstruction,
    ReturnInstruction,
    FunctionDeclInstruction,
    TaskDeclInstruction,
    RunInstruction,
    ResourceDeclInstruction
} from '../ast/instructions/InstructionNodes.js';

export class Parser {
    /**
     * @param {import('../lexer/Token.js').Token[]} tokens 
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
        this.errors = [];
        this.mainCount = 0;
    }

    /**
     * Punto de entrada principal para construir el AST
     * @returns {{ ast: import('../ast/ASTNode.js').ASTNode[], errors: CompilerError[] }}
     */
    parse() {
        const declarations = [];

        while (!this.isAtEnd()) {
            try {
                const decl = this.globalDeclaration();
                if (decl) {
                    declarations.push(decl);
                }
            } catch (err) {
                this.synchronize();
            }
        }

        // Validar exactamente un main (enunciado: "El enunciado exige exactamente un main")
        if (this.mainCount === 0) {
            this.error(
                { type: TokenType.EOF, lexeme: 'EOF', line: 1, column: 1 },
                'No se encontró el bloque obligatorio main { ... }',
                'SEM-000'
            );
        }
        if (this.mainCount > 1) {
            this.error(
                { type: TokenType.EOF, lexeme: 'EOF', line: 1, column: 1 },
                `Se encontraron ${this.mainCount} bloques main. Solo se permite exactamente un main.`,
                'SEM-000'
            );
        }

        return {
            ast: declarations,
            errors: this.errors
        };
    }

    // ==========================================
    // DECLARACIONES GLOBALES
    // ==========================================

    globalDeclaration() {
        if (this.match(TokenType.SERVER, TokenType.SERVICE, TokenType.DATABASE)) {
            return this.resourceDeclaration();
        }
        if (this.match(TokenType.FUNCTION)) {
            return this.functionDeclaration();
        }
        if (this.match(TokenType.TASK)) {
            return this.taskDeclaration();
        }
        if (this.match(TokenType.MAIN)) {
            return this.mainDeclaration();
        }
        if (this.isType(this.peek())) {
            return this.variableDeclaration();
        }

        const token = this.peek();
        this.error(token, `Declaración inesperada '${token.lexeme}'. Se esperaba un recurso, función, task, variable o bloque main.`);
        this.advance();
        return null;
    }

    resourceDeclaration() {
        const typeToken = this.previous();
        const resourceType = typeToken.lexeme; // 'server', 'service', 'database'

        const nameToken = this.consume(TokenType.IDENTIFIER, `Se esperaba un nombre para el recurso ${resourceType}`);
        this.consume(TokenType.LBRACE, `Se esperaba '{' tras el nombre del recurso`);

        const properties = {};
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            const propNameToken = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre de la propiedad`);
            this.consume(TokenType.EQUAL, `Se esperaba '=' después de '${propNameToken.lexeme}'`);
            const propValExpr = this.expression();
            this.consume(TokenType.SEMICOLON, `Se esperaba ';' tras la asignación de propiedad`);

            properties[propNameToken.lexeme] = propValExpr;
        }

        this.consume(TokenType.RBRACE, `Se esperaba '}' al final del recurso`);
        return new ResourceDeclInstruction(resourceType, nameToken.lexeme, properties, typeToken.line, typeToken.column);
    }

    functionDeclaration() {
        const funcToken = this.previous();
        const nameToken = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre de la función`);
        this.consume(TokenType.LPAREN, `Se esperaba '(' tras el nombre de la función`);

        const params = [];
        if (!this.check(TokenType.RPAREN)) {
            do {
                const paramType = this.parseType();
                const paramName = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre del parámetro`);
                params.push({ type: paramType, name: paramName.lexeme });
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RPAREN, `Se esperaba ')' tras la lista de parámetros`);

        // Tipo de retorno (opcional o explícito, ej: bool, int, void)
        let returnType = 'void';
        if (this.isType(this.peek())) {
            returnType = this.parseType().toString();
        }

        this.consume(TokenType.LBRACE, `Se esperaba '{' para iniciar el cuerpo de la función`);
        const body = this.blockStatement();

        return new FunctionDeclInstruction(nameToken.lexeme, params, returnType, body, funcToken.line, funcToken.column);
    }

    taskDeclaration() {
        const taskToken = this.previous();
        const nameToken = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre del task`);
        this.consume(TokenType.LBRACE, `Se esperaba '{' tras el nombre del task`);
        const body = this.blockStatement();

        return new TaskDeclInstruction(nameToken.lexeme, body, taskToken.line, taskToken.column);
    }

    mainDeclaration() {
        const mainToken = this.previous();
        this.mainCount++;
        this.consume(TokenType.LBRACE, `Se esperaba '{' tras 'main'`);
        const body = this.blockStatement();
        return new TaskDeclInstruction('main', body, mainToken.line, mainToken.column);
    }

    // ==========================================
    // SENTENCIAS (STATEMENTS)
    // ==========================================

    statement() {
        if (this.match(TokenType.IF)) return this.ifStatement();
        if (this.match(TokenType.WHILE)) return this.whileStatement();
        if (this.match(TokenType.FOR)) return this.forStatement();
        if (this.match(TokenType.BREAK)) return this.breakStatement();
        if (this.match(TokenType.CONTINUE)) return this.continueStatement();
        if (this.match(TokenType.RETURN)) return this.returnStatement();
        if (this.match(TokenType.RUN)) return this.runStatement();
        if (this.match(TokenType.LBRACE)) return this.blockStatement();
        if (this.isType(this.peek())) return this.variableDeclaration();

        return this.expressionOrAssignmentStatement();
    }

    ifStatement() {
        const token = this.previous();
        this.consume(TokenType.LPAREN, `Se esperaba '(' después de 'if'`);
        const condition = this.expression();
        this.consume(TokenType.RPAREN, `Se esperaba ')' después de la condición de 'if'`);

        this.consume(TokenType.LBRACE, `Se esperaba '{' antes del bloque then`);
        const thenBranch = this.blockStatement();

        let elseBranch = null;
        if (this.match(TokenType.ELSE)) {
            if (this.match(TokenType.IF)) {
                // Else-if encadenado
                elseBranch = this.ifStatement();
            } else {
                this.consume(TokenType.LBRACE, `Se esperaba '{' antes del bloque else`);
                elseBranch = this.blockStatement();
            }
        }

        return new IfInstruction(condition, thenBranch, elseBranch, token.line, token.column);
    }

    whileStatement() {
        const token = this.previous();
        this.consume(TokenType.LPAREN, `Se esperaba '(' después de 'while'`);
        const condition = this.expression();
        this.consume(TokenType.RPAREN, `Se esperaba ')' después de la condición de 'while'`);

        this.consume(TokenType.LBRACE, `Se esperaba '{' antes del cuerpo de 'while'`);
        const body = this.blockStatement();

        return new WhileInstruction(condition, body, token.line, token.column);
    }

    forStatement() {
        const token = this.previous();
        this.consume(TokenType.LPAREN, `Se esperaba '(' después de 'for'`);

        // Inicializador: puede ser declaración de variable o asignación
        let init = null;
        if (!this.check(TokenType.SEMICOLON)) {
            if (this.isType(this.peek())) {
                init = this.variableDeclaration();
            } else {
                init = this.expressionOrAssignmentStatement();
            }
        } else {
            this.consume(TokenType.SEMICOLON, `Se esperaba ';'`);
        }

        // Condición
        let condition = null;
        if (!this.check(TokenType.SEMICOLON)) {
            condition = this.expression();
        }
        this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de la condición del for`);

        // Actualización (sin punto y coma final)
        let update = null;
        if (!this.check(TokenType.RPAREN)) {
            const expr = this.expression();
            if (this.match(TokenType.EQUAL)) {
                const val = this.expression();
                update = new AssignmentInstruction(expr, val, expr.line, expr.column);
            } else {
                update = new ExpressionInstruction(expr, expr.line, expr.column);
            }
        }
        this.consume(TokenType.RPAREN, `Se esperaba ')' después de las cláusulas del for`);

        this.consume(TokenType.LBRACE, `Se esperaba '{' para el cuerpo del for`);
        const body = this.blockStatement();

        return new ForInstruction(init, condition, update, body, token.line, token.column);
    }

    breakStatement() {
        const token = this.previous();
        this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de 'break'`);
        return new BreakInstruction(token.line, token.column);
    }

    continueStatement() {
        const token = this.previous();
        this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de 'continue'`);
        return new ContinueInstruction(token.line, token.column);
    }

    returnStatement() {
        const token = this.previous();
        let valueExpr = null;
        if (!this.check(TokenType.SEMICOLON)) {
            valueExpr = this.expression();
        }
        this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de 'return'`);
        return new ReturnInstruction(valueExpr, token.line, token.column);
    }

    runStatement() {
        const token = this.previous();
        const taskName = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre del task a ejecutar`);
        this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de 'run ${taskName.lexeme}'`);
        return new RunInstruction(taskName.lexeme, token.line, token.column);
    }

    blockStatement() {
        const statements = [];
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            statements.push(this.statement());
        }
        this.consume(TokenType.RBRACE, `Se esperaba '}' al cerrar bloque`);
        return new BlockInstruction(statements, this.previous().line, this.previous().column);
    }

    variableDeclaration() {
        const type = this.parseType();
        const nameToken = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre de la variable`);

        let initializer = null;
        if (this.match(TokenType.EQUAL)) {
            initializer = this.expression();
        }

        this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de la declaración de variable`);
        return new VarDeclInstruction(type, nameToken.lexeme, initializer, nameToken.line, nameToken.column);
    }

    expressionOrAssignmentStatement() {
        const expr = this.expression();

        if (this.match(TokenType.EQUAL)) {
            const value = this.expression();
            this.consume(TokenType.SEMICOLON, `Se esperaba ';' después de la asignación`);
            return new AssignmentInstruction(expr, value, expr.line, expr.column);
        }

        this.consume(TokenType.SEMICOLON, `Se esperaba ';' al final de la instrucción`);
        return new ExpressionInstruction(expr, expr.line, expr.column);
    }

    // ==========================================
    // EXPRESIONES (PREDICCIONES Y NIVELES)
    // ==========================================

    expression() {
        return this.logicalOr();
    }

    logicalOr() {
        let expr = this.logicalAnd();

        while (this.match(TokenType.OR)) {
            const operator = this.previous().lexeme;
            const right = this.logicalAnd();
            expr = new BinaryExpr(expr, operator, right, expr.line, expr.column);
        }

        return expr;
    }

    logicalAnd() {
        let expr = this.equality();

        while (this.match(TokenType.AND)) {
            const operator = this.previous().lexeme;
            const right = this.equality();
            expr = new BinaryExpr(expr, operator, right, expr.line, expr.column);
        }

        return expr;
    }

    equality() {
        let expr = this.comparison();

        while (this.match(TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL)) {
            const operator = this.previous().lexeme;
            const right = this.comparison();
            expr = new BinaryExpr(expr, operator, right, expr.line, expr.column);
        }

        return expr;
    }

    comparison() {
        let expr = this.term();

        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous().lexeme;
            const right = this.term();
            expr = new BinaryExpr(expr, operator, right, expr.line, expr.column);
        }

        return expr;
    }

    term() {
        let expr = this.factor();

        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const operator = this.previous().lexeme;
            const right = this.factor();
            expr = new BinaryExpr(expr, operator, right, expr.line, expr.column);
        }

        return expr;
    }

    factor() {
        let expr = this.unary();

        while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
            const operator = this.previous().lexeme;
            const right = this.unary();
            expr = new BinaryExpr(expr, operator, right, expr.line, expr.column);
        }

        return expr;
    }

    unary() {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.previous().lexeme;
            const right = this.unary();
            return new UnaryExpr(operator, right, this.previous().line, this.previous().column);
        }

        return this.postfix();
    }

    postfix() {
        let expr = this.primary();

        while (true) {
            if (this.match(TokenType.DOT)) {
                const prop = this.consume(TokenType.IDENTIFIER, `Se esperaba el nombre de la propiedad tras '.'`);
                expr = new PropertyAccessExpr(expr, prop.lexeme, expr.line, expr.column);
            } else if (this.match(TokenType.LBRACKET)) {
                const indexExpr = this.expression();
                this.consume(TokenType.RBRACKET, `Se esperaba ']' tras la expresión de índice`);
                expr = new IndexExpr(expr, indexExpr, expr.line, expr.column);
            } else {
                break;
            }
        }

        return expr;
    }

    primary() {
        if (this.match(TokenType.TRUE)) return new LiteralExpr(true, 'bool', this.previous().line, this.previous().column);
        if (this.match(TokenType.FALSE)) return new LiteralExpr(false, 'bool', this.previous().line, this.previous().column);
        if (this.match(TokenType.INT_LITERAL)) return new LiteralExpr(this.previous().literal, 'int', this.previous().line, this.previous().column);
        if (this.match(TokenType.FLOAT_LITERAL)) return new LiteralExpr(this.previous().literal, 'float', this.previous().line, this.previous().column);
        if (this.match(TokenType.STRING_LITERAL)) return new LiteralExpr(this.previous().literal, 'string', this.previous().line, this.previous().column);

        // Identificador o Llamada de Función / Acción Nativa
        if (this.match(TokenType.IDENTIFIER)) {
            const idToken = this.previous();
            if (this.match(TokenType.LPAREN)) {
                const args = [];
                if (!this.check(TokenType.RPAREN)) {
                    do {
                        args.push(this.expression());
                    } while (this.match(TokenType.COMMA));
                }
                this.consume(TokenType.RPAREN, `Se esperaba ')' tras los argumentos de la función`);
                return new CallExpr(idToken.lexeme, args, idToken.line, idToken.column);
            }
            return new IdentifierExpr(idToken.lexeme, idToken.line, idToken.column);
        }

        // Agrupación ( expression )
        if (this.match(TokenType.LPAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RPAREN, `Se esperaba ')' tras la expresión`);
            return expr;
        }

        // Arreglo literal [ expr, expr, ... ]
        if (this.match(TokenType.LBRACKET)) {
            const elements = [];
            if (!this.check(TokenType.RBRACKET)) {
                do {
                    elements.push(this.expression());
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RBRACKET, `Se esperaba ']' al cerrar arreglo`);
            return new ArrayExpr(elements, this.previous().line, this.previous().column);
        }

        const token = this.peek();
        this.error(token, `Expresión inesperada cerca de '${token.lexeme}'`);
        throw new Error(`Error sintáctico`);
    }

    // ==========================================
    // UTILIDADES Y TIPOS
    // ==========================================

    isType(token) {
        if (!token) return false;
        return [
            TokenType.INT,
            TokenType.FLOAT,
            TokenType.STRING_TYPE,
            TokenType.BOOL,
            TokenType.SERVER,
            TokenType.SERVICE,
            TokenType.DATABASE
        ].includes(token.type);
    }

    parseType() {
        const token = this.advance();
        let baseType = token.lexeme;
        if (token.type === TokenType.STRING_TYPE) baseType = 'string';

        let isArray = false;
        if (this.match(TokenType.LBRACKET)) {
            this.consume(TokenType.RBRACKET, `Se esperaba ']' tras '[' para tipo de arreglo`);
            isArray = true;
        }

        return new Type(baseType, isArray);
    }

    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    consume(type, message, code = 'SIN-001') {
        if (this.check(type)) return this.advance();

        const token = this.peek();
        this.error(token, message, code);
        throw new Error(message);
    }

    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    advance() {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }

    peek() {
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current - 1];
    }

    error(token, message, code = 'SIN-001') {
        this.errors.push(
            new CompilerError(
                ErrorType.SINTACTICO,
                code,
                message,
                token.line || 1,
                token.column || 1
            )
        );
    }

    synchronize() {
        this.advance();

        while (!this.isAtEnd()) {
            if (this.previous().type === TokenType.SEMICOLON || this.previous().type === TokenType.RBRACE) {
                return;
            }

            switch (this.peek().type) {
                case TokenType.SERVER:
                case TokenType.SERVICE:
                case TokenType.DATABASE:
                case TokenType.FUNCTION:
                case TokenType.TASK:
                case TokenType.MAIN:
                case TokenType.IF:
                case TokenType.WHILE:
                case TokenType.FOR:
                case TokenType.RETURN:
                    return;
                default:
                    break;
            }

            this.advance();
        }
    }
}
