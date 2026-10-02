import { Lexer } from '../lexer/Lexer.js';
import { Parser } from '../parser/Parser.js';
import { Environment } from '../environment/Environment.js';
import { InfraState } from '../infrastructure/InfraState.js';
import { CompilerError } from '../errors/CompilerError.js';
import { ErrorType } from '../errors/ErrorType.js';
import { AstGraphvizReport } from '../reports/AstGraphvizReport.js';
import { SemanticAnalyzer } from '../semantic/SemanticAnalyzer.js';
import { resetInstructionCounter } from '../ast/instructions/InstructionNodes.js';
import { Type } from '../environment/Type.js';

export class Interpreter {
    constructor() {
        this.dotGenerator = new AstGraphvizReport();
        this.semanticAnalyzer = new SemanticAnalyzer();
    }

    /**
     * Ejecuta el pipeline completo de compilación e interpretación
     * @param {string} sourceCode 
     * @returns {Object} Resultado con success, console, bitacora, errors, tokens, symbols, infrastructure, astDot
     */
    execute(sourceCode) {
        resetInstructionCounter();

        const allErrors = [];
        const infra = new InfraState();
        const globalEnv = new Environment(null, 'global', infra);

        // 1. ANÁLISIS LÉXICO
        const lexer = new Lexer(sourceCode);
        const { tokens, errors: lexErrors } = lexer.scanTokens();
        allErrors.push(...lexErrors);

        // 2. ANÁLISIS SINTÁCTICO Y CONSTRUCCIÓN DEL AST
        const parser = new Parser(tokens);
        const { ast, errors: parseErrors } = parser.parse();
        allErrors.push(...parseErrors);

        // Generar DOT del AST (incluso si hubo errores parciales recuperados)
        const astDot = this.dotGenerator.generateDot(ast);

        // Si hay errores léxicos o sintácticos críticos, no analizamos ni ejecutamos
        if (allErrors.length > 0) {
            return {
                success: false,
                console: infra.consoleOutput,
                bitacora: infra.bitacora,
                errors: allErrors.map(e => ({
                    type: e.type,
                    code: e.code,
                    description: e.description,
                    line: e.line,
                    column: e.column
                })),
                tokens: tokens.map(t => ({
                    lexeme: t.lexeme,
                    type: t.type,
                    line: t.line,
                    column: t.column
                })),
                symbols: [],
                infrastructure: infra.toJSON(),
                astDot
            };
        }

        // 3. ANÁLISIS SEMÁNTICO (antes de ejecutar)
        const { errors: semErrors, symbols: semanticSymbols } = this.semanticAnalyzer.analyze(ast);
        allErrors.push(...semErrors);

        if (allErrors.length > 0) {
            return {
                success: false,
                console: infra.consoleOutput,
                bitacora: infra.bitacora,
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
                symbols: semanticSymbols.map((s, idx) => ({
                    id: idx + 1,
                    name: s.name,
                    category: s.category,
                    type: s.type instanceof Type ? s.type.toString() : String(s.type),
                    scope: s.scope,
                    value: null,
                    line: s.line,
                    column: s.column
                })),
                infrastructure: infra.toJSON(),
                astDot
            };
        }

        // 4. EJECUCIÓN (PATRÓN INTERPRETER)
        try {
            // Paso A: Registrar recursos, funciones, tareas y variables globales
            let mainTask = null;

            for (const node of ast) {
                if (node.constructor.name === 'TaskDeclInstruction' && node.name === 'main') {
                    mainTask = node;
                } else {
                    node.execute(globalEnv);
                }
            }

            // Paso B: Ejecutar el bloque main si existe
            if (mainTask) {
                mainTask.run(globalEnv);
            } else {
                allErrors.push(
                    new CompilerError(
                        ErrorType.SEMANTICO,
                        'SEM-000',
                        'No se encontró el bloque obligatorio main { ... }',
                        1,
                        1
                    )
                );
            }
        } catch (err) {
            // Manejo de errores semánticos, de infraestructura o de ejecución
            let errType = ErrorType.SEMANTICO;
            let errCode = err.code || 'SEM-ERR';

            if (errCode.startsWith('INFRA-')) {
                errType = ErrorType.INFRAESTRUCTURA;
            } else if (errCode.startsWith('RUN-')) {
                errType = ErrorType.EJECUCION;
            }

            allErrors.push(
                new CompilerError(
                    errType,
                    errCode,
                    err.message,
                    err.line || 1,
                    err.column || 1
                )
            );
        }

        // Consolidar la consola completa combinando bitácora y prints si se desea
        const combinedConsole = [
            '========================================',
            'AUTOINFRA - EXECUTION',
            '========================================',
            ...infra.bitacora,
            ...(infra.consoleOutput.length > 0 ? ['\nOUTPUT:'] : []),
            ...infra.consoleOutput,
            '\nFINAL STATE',
            '----------------------------------------',
            ...Array.from(infra.servers.values()).map(s => `${s.name} : server : ${s.status} (${s.packages.join(', ') || 'sin paquetes'})`),
            ...Array.from(infra.databases.values()).map(db => `${db.name} : database : ${db.status}`),
            ...Array.from(infra.services.values()).map(srv => `${srv.name} : service : ${srv.status} (${srv.replicas} replicas)`),
            '========================================'
        ];

        return {
            success: allErrors.length === 0,
            console: combinedConsole,
            bitacora: infra.bitacora,
            output: infra.consoleOutput,
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
            symbols: globalEnv.getAllHistorySymbols().map((s, idx) => ({
                id: idx + 1,
                ...s.toJSON()
            })),
            infrastructure: infra.toJSON(),
            astDot
        };
    }
}
