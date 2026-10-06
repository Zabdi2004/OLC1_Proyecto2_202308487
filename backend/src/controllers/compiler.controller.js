import { Interpreter } from '../interpreter/Interpreter.js';
import { Lexer } from '../lexer/Lexer.js';
import { Parser } from '../parser/Parser.js';
import { AstGraphvizReport } from '../reports/AstGraphvizReport.js';
import { SemanticAnalyzer } from '../semantic/SemanticAnalyzer.js';
import { Type } from '../environment/Type.js';

const interpreter = new Interpreter();
const dotGenerator = new AstGraphvizReport();
const semanticAnalyzer = new SemanticAnalyzer();

export const healthCheck = (req, res) => {
    return res.status(200).json({ status: 'ok', message: 'AutoInfra Backend API está funcionando correctamente.' });
};

export const executeCode = (req, res) => {
    try {
        const { source } = req.body;
        if (source === undefined || source === null) {
            return res.status(400).json({ success: false, error: 'Campo "source" es requerido en la solicitud' });
        }

        if (typeof source !== 'string') {
            return res.status(400).json({ success: false, error: 'Campo "source" debe ser un string' });
        }

        const result = interpreter.execute(source);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error en executeCode:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const analyzeCode = (req, res) => {
    try {
        const { source } = req.body;
        if (source === undefined || source === null) {
            return res.status(400).json({ success: false, error: 'Campo "source" es requerido' });
        }

        if (typeof source !== 'string') {
            return res.status(400).json({ success: false, error: 'Campo "source" debe ser un string' });
        }

        // 1. Lexer
        const lexer = new Lexer(source);
        const { tokens, errors: lexErrors } = lexer.scanTokens();

        // 2. Parser
        const parser = new Parser(tokens);
        const { ast, errors: parseErrors } = parser.parse();

        // 3. AST
        const astDot = dotGenerator.generateDot(ast);

        // 4. SemanticAnalyzer (NO ejecuta, NO modifica InfraState)
        const { errors: semErrors, symbols } = semanticAnalyzer.analyze(ast);

        const allErrors = [
            ...lexErrors.map(e => ({ type: e.type, code: e.code, description: e.description, line: e.line, column: e.column })),
            ...parseErrors.map(e => ({ type: e.type, code: e.code, description: e.description, line: e.line, column: e.column })),
            ...semErrors.map(e => ({ type: e.type, code: e.code, description: e.description, line: e.line, column: e.column }))
        ];

        return res.status(200).json({
            success: allErrors.length === 0,
            errors: allErrors,
            tokens: tokens.map((t, idx) => ({
                id: idx + 1,
                lexeme: t.lexeme,
                type: t.type,
                line: t.line,
                column: t.column
            })),
            symbols: symbols.map((s, idx) => ({
                id: idx + 1,
                name: s.name,
                category: s.category,
                type: s.type instanceof Type ? s.type.toString() : String(s.type),
                scope: s.scope,
                value: null,
                line: s.line,
                column: s.column
            })),
            astDot
        });
    } catch (err) {
        console.error('Error en analyzeCode:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const getTokens = (req, res) => {
    try {
        const { source } = req.body;
        const lexer = new Lexer(source || '');
        const { tokens, errors } = lexer.scanTokens();
        return res.status(200).json({
            tokens: tokens.map((t, idx) => ({
                id: idx + 1,
                lexeme: t.lexeme,
                type: t.type,
                line: t.line,
                column: t.column
            })),
            errors: errors.map(e => ({
                type: e.type,
                code: e.code,
                description: e.description,
                line: e.line,
                column: e.column
            }))
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const getAst = (req, res) => {
    try {
        const { source } = req.body;
        const lexer = new Lexer(source || '');
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { ast, errors } = parser.parse();
        const astDot = dotGenerator.generateDot(ast);
        return res.status(200).json({ astDot, errors });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const getSymbols = (req, res) => {
    try {
        const { source } = req.body;
        const result = interpreter.execute(source || '');
        return res.status(200).json({ symbols: result.symbols });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const getErrors = (req, res) => {
    try {
        const { source } = req.body;
        const result = interpreter.execute(source || '');
        return res.status(200).json({ errors: result.errors });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
