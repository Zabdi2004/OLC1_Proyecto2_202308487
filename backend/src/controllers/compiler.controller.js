import { Interpreter } from '../interpreter/Interpreter.js';
import { Lexer } from '../lexer/Lexer.js';
import { Parser } from '../parser/Parser.js';
import { AstGraphvizReport } from '../reports/AstGraphvizReport.js';

const interpreter = new Interpreter();
const dotGenerator = new AstGraphvizReport();

export const healthCheck = (req, res) => {
    return res.status(200).json({ status: 'ok', message: 'AutoInfra Backend API está funcionando correctamente.' });
};

export const executeCode = (req, res) => {
    try {
        const { source } = req.body;
        if (source === undefined || source === null) {
            return res.status(400).json({ success: false, error: 'Campo "source" es requerido en la solicitud' });
        }

        const result = interpreter.execute(source);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const analyzeCode = (req, res) => {
    try {
        const { source } = req.body;
        if (source === undefined || source === null) {
            return res.status(400).json({ success: false, error: 'Campo "source" es requerido' });
        }

        const lexer = new Lexer(source);
        const { tokens, errors: lexErrors } = lexer.scanTokens();

        const parser = new Parser(tokens);
        const { ast, errors: parseErrors } = parser.parse();

        const allErrors = [...lexErrors, ...parseErrors];
        const astDot = dotGenerator.generateDot(ast);

        return res.status(200).json({
            success: allErrors.length === 0,
            errors: allErrors.map(e => ({
                type: e.type,
                code: e.code,
                description: e.description,
                line: e.line,
                column: e.column
            })),
            tokens: tokens.map((t, idx) => ({
                id: idx + 1,
                lexeme: t.lexeme,
                type: t.type,
                line: t.line,
                column: t.column
            })),
            astDot
        });
    } catch (err) {
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
