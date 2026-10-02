import { TokenType } from './TokenType.js';
import { Token } from './Token.js';
import { CompilerError } from '../errors/CompilerError.js';
import { ErrorType } from '../errors/ErrorType.js';

export class Lexer {
    /**
     * @param {string} source - Código fuente en AutoInfra
     */
    constructor(source) {
        this.source = source || '';
        this.tokens = [];
        this.errors = [];

        this.start = 0;
        this.current = 0;
        this.line = 1;
        this.column = 1;
        this.tokenStartColumn = 1;

        this.keywords = new Map([
            ['int', TokenType.INT],
            ['float', TokenType.FLOAT],
            ['string', TokenType.STRING_TYPE],
            ['bool', TokenType.BOOL],
            ['server', TokenType.SERVER],
            ['service', TokenType.SERVICE],
            ['database', TokenType.DATABASE],
            ['if', TokenType.IF],
            ['else', TokenType.ELSE],
            ['while', TokenType.WHILE],
            ['for', TokenType.FOR],
            ['break', TokenType.BREAK],
            ['continue', TokenType.CONTINUE],
            ['return', TokenType.RETURN],
            ['function', TokenType.FUNCTION],
            ['task', TokenType.TASK],
            ['main', TokenType.MAIN],
            ['run', TokenType.RUN],
            ['true', TokenType.TRUE],
            ['false', TokenType.FALSE]
        ]);
    }

    /**
     * Escanea todo el código fuente y genera la lista de tokens y errores léxicos
     * @returns {{ tokens: Token[], errors: CompilerError[] }}
     */
    scanTokens() {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.tokenStartColumn = this.column;
            this.scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, '', null, this.line, this.column));
        return {
            tokens: this.tokens,
            errors: this.errors
        };
    }

    scanToken() {
        const c = this.advance();

        switch (c) {
            case '(': this.addToken(TokenType.LPAREN); break;
            case ')': this.addToken(TokenType.RPAREN); break;
            case '{': this.addToken(TokenType.LBRACE); break;
            case '}': this.addToken(TokenType.RBRACE); break;
            case '[': this.addToken(TokenType.LBRACKET); break;
            case ']': this.addToken(TokenType.RBRACKET); break;
            case ';': this.addToken(TokenType.SEMICOLON); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case '.': this.addToken(TokenType.DOT); break;
            case '+': this.addToken(TokenType.PLUS); break;
            case '-': this.addToken(TokenType.MINUS); break;
            case '*': this.addToken(TokenType.STAR); break;
            case '%': this.addToken(TokenType.PERCENT); break;

            case '!':
                this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
                break;
            case '=':
                this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
                break;
            case '<':
                this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
                break;
            case '>':
                this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;

            case '&':
                if (this.match('&')) {
                    this.addToken(TokenType.AND);
                } else {
                    this.addError(
                        'LEX-001',
                        `Operador no reconocido '&'. ¿Quiso escribir '&&'?`,
                        this.line,
                        this.tokenStartColumn
                    );
                }
                break;

            case '|':
                if (this.match('|')) {
                    this.addToken(TokenType.OR);
                } else {
                    this.addError(
                        'LEX-001',
                        `Operador no reconocido '|'. ¿Quiso escribir '||'?`,
                        this.line,
                        this.tokenStartColumn
                    );
                }
                break;

            case '/':
                if (this.match('/')) {
                    // Comentario de una sola línea
                    while (this.peek() !== '\n' && !this.isAtEnd()) {
                        this.advance();
                    }
                } else if (this.match('*')) {
                    // Comentario multilínea
                    this.scanBlockComment();
                } else {
                    this.addToken(TokenType.SLASH);
                }
                break;

            case ' ':
            case '\r':
            case '\t':
                // Ignorar espacios en blanco
                break;

            case '\n':
                this.line++;
                this.column = 1;
                break;

            case '"':
                this.scanString();
                break;

            default:
                if (this.isDigit(c)) {
                    this.scanNumber();
                } else if (this.isAlpha(c)) {
                    this.scanIdentifier();
                } else {
                    this.addError(
                        'LEX-002',
                        `Carácter no reconocido: '${c}'`,
                        this.line,
                        this.tokenStartColumn
                    );
                }
                break;
        }
    }

    scanBlockComment() {
        const startLine = this.line;
        const startCol = this.tokenStartColumn;

        while (!this.isAtEnd()) {
            if (this.peek() === '*' && this.peekNext() === '/') {
                this.advance(); // consume '*'
                this.advance(); // consume '/'
                return;
            }

            if (this.peek() === '\n') {
                this.line++;
                this.column = 0; // Se incrementará con advance()
            }
            this.advance();
        }

        // Si llegamos aquí, el comentario no se cerró
        this.addError(
            'LEX-003',
            'Comentario multilínea sin cierre',
            startLine,
            startCol
        );
    }

    scanString() {
        const startLine = this.line;
        const startCol = this.tokenStartColumn;
        let value = '';

        while (this.peek() !== '"' && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                // Cadena sin cerrar en la misma línea
                this.addError(
                    'LEX-004',
                    'Cadena de texto sin cerrar antes del fin de línea',
                    startLine,
                    startCol
                );
                return;
            }

            if (this.peek() === '\\') {
                this.advance(); // consume '\'
                const escapeChar = this.peek();
                const validEscapes = new Set(['"', '\\', 'n', 't', 'r']);
                if (!validEscapes.has(escapeChar)) {
                    this.addError(
                        'LEX-005',
                        `Secuencia de escape inválida '\\${escapeChar}'`,
                        this.line,
                        this.column
                    );
                    value += escapeChar;
                } else {
                    switch (escapeChar) {
                        case '"': value += '"'; break;
                        case '\\': value += '\\'; break;
                        case 'n': value += '\n'; break;
                        case 't': value += '\t'; break;
                        case 'r': value += '\r'; break;
                    }
                }
                this.advance();
            } else {
                value += this.peek();
                this.advance();
            }
        }

        if (this.isAtEnd()) {
            this.addError(
                'LEX-004',
                'Cadena de texto sin cerrar al final del archivo',
                startLine,
                startCol
            );
            return;
        }

        // Consumir la comilla de cierre '"'
        this.advance();

        const lexeme = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(TokenType.STRING_LITERAL, lexeme, value, startLine, startCol));
    }

    scanNumber() {
        while (this.isDigit(this.peek())) {
            this.advance();
        }

        let isFloat = false;
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            isFloat = true;
            this.advance(); // Consumir '.'
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }

        const text = this.source.substring(this.start, this.current);
        if (isFloat) {
            this.tokens.push(new Token(TokenType.FLOAT_LITERAL, text, parseFloat(text), this.line, this.tokenStartColumn));
        } else {
            this.tokens.push(new Token(TokenType.INT_LITERAL, text, parseInt(text, 10), this.line, this.tokenStartColumn));
        }
    }

    scanIdentifier() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }

        const text = this.source.substring(this.start, this.current);
        const type = this.keywords.get(text) || TokenType.IDENTIFIER;
        let literal = null;

        if (type === TokenType.TRUE) literal = true;
        if (type === TokenType.FALSE) literal = false;

        this.tokens.push(new Token(type, text, literal, this.line, this.tokenStartColumn));
    }

    advance() {
        const char = this.source.charAt(this.current++);
        this.column++;
        return char;
    }

    match(expected) {
        if (this.isAtEnd()) return false;
        if (this.source.charAt(this.current) !== expected) return false;

        this.current++;
        this.column++;
        return true;
    }

    peek() {
        if (this.isAtEnd()) return '\0';
        return this.source.charAt(this.current);
    }

    peekNext() {
        if (this.current + 1 >= this.source.length) return '\0';
        return this.source.charAt(this.current + 1);
    }

    isAtEnd() {
        return this.current >= this.source.length;
    }

    isDigit(c) {
        return c >= '0' && c <= '9';
    }

    isAlpha(c) {
        return (c >= 'a' && c <= 'z') ||
               (c >= 'A' && c <= 'Z') ||
               c === '_';
    }

    isAlphaNumeric(c) {
        return this.isAlpha(c) || this.isDigit(c);
    }

    addToken(type, literal = null) {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line, this.tokenStartColumn));
    }

    addError(code, description, line, column) {
        this.errors.push(new CompilerError(ErrorType.LEXICO, code, description, line, column));
    }
}
