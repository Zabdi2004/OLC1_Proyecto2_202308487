/**
 * Suite de pruebas para AutoInfra
 * Ejecuta: npm test
 */
import { Lexer } from './src/lexer/Lexer.js';
import { Parser } from './src/parser/Parser.js';
import { TokenType } from './src/lexer/TokenType.js';
import { AstGraphvizReport } from './src/reports/AstGraphvizReport.js';
import { SemanticAnalyzer } from './src/semantic/SemanticAnalyzer.js';

const testGroups = [];
let currentGroup = null;
const failures = [];
let passed = 0;

function describe(name, fn) {
    currentGroup = { name, tests: [] };
    testGroups.push(currentGroup);
    fn();
}

function test(name, fn) {
    if (currentGroup) {
        currentGroup.tests.push({ name, fn });
    } else {
        testGroups.push({ name: 'Default', tests: [{ name, fn }] });
        currentGroup = testGroups[testGroups.length - 1];
    }
}

function assertEqual(actual, expected, msg = '') {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error(`${msg}\n  esperado: ${e}\n  actual:   ${a}`);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
}

function runTest({ name, fn }) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failures.push({ name, error: err.message });
        console.log(`  ✗ ${name}`);
        console.log(`    ${err.message}`);
    }
}

// ============================================
// Lexer Tests
// ============================================

describe("Lexer", () => {
    test('tokens básicos', () => {
        const lexer = new Lexer('server api { }');
        const { tokens } = lexer.scanTokens();
        const types = tokens.map(t => t.type);
        assert(types.includes(TokenType.SERVER), 'debe reconocer server');
        assert(types.includes(TokenType.IDENTIFIER), 'debe reconocer identifier');
        assert(types.includes(TokenType.LBRACE), 'debe reconocer {');
        assert(types.includes(TokenType.RBRACE), 'debe reconocer }');
        assertEqual(tokens[0].lexeme, 'server');
        assertEqual(tokens[0].line, 1);
        assertEqual(tokens[0].column, 1);
    });

    test('palabras reservadas', () => {
        const src = 'int float string bool server service database if else while for break continue return function task main run true false';
        const lexer = new Lexer(src);
        const { tokens } = lexer.scanTokens();
        const keywords = tokens.filter(t => t.type !== TokenType.IDENTIFIER && t.type !== TokenType.EOF);
        assertEqual(keywords.length, 20, 'debe reconocer 18 keywords + 2 literales bool');
    });

    test('identificadores', () => {
        const lexer = new Lexer('_var nombre123 MiVar');
        const { tokens } = lexer.scanTokens();
        const ids = tokens.filter(t => t.type === TokenType.IDENTIFIER);
        assertEqual(ids.length, 3);
        assertEqual(tokens[0].lexeme, '_var');
        assertEqual(tokens[1].lexeme, 'nombre123');
        assertEqual(tokens[2].lexeme, 'MiVar');
    });

    test('enteros y floats', () => {
        const lexer = new Lexer('123 45.67');
        const { tokens } = lexer.scanTokens();
        assertEqual(tokens[0].type, TokenType.INT_LITERAL);
        assertEqual(tokens[0].literal, 123);
        assertEqual(tokens[1].type, TokenType.FLOAT_LITERAL);
        assertEqual(tokens[1].literal, 45.67);
    });

    test('strings con escapes', () => {
        const lexer = new Lexer('"hola \\"mundo\\"\\ntab\\t"');
        const { tokens, errors } = lexer.scanTokens();
        assertEqual(errors.length, 0, 'no debe haber errores léxicos');
        assertEqual(tokens[0].literal, 'hola "mundo"\ntab\t');
    });

    test('string sin cerrar', () => {
        const lexer = new Lexer('"hola sin cerrar');
        const { errors } = lexer.scanTokens();
        assert(errors.length > 0, 'debe reportar error de string sin cerrar');
        assert(errors[0].code === 'LEX-004');
    });

    test('comentario una línea', () => {
        const lexer = new Lexer('// comentario\n123');
        const { tokens, errors } = lexer.scanTokens();
        assertEqual(errors.length, 0);
        assertEqual(tokens[0].type, TokenType.INT_LITERAL);
        assertEqual(tokens[0].line, 2);
    });

    test('comentario multilínea', () => {
        const lexer = new Lexer('/* multi\nlinea */ 42');
        const { tokens, errors } = lexer.scanTokens();
        assertEqual(errors.length, 0);
        assertEqual(tokens[0].type, TokenType.INT_LITERAL);
    });

    test('comentario multilínea sin cerrar', () => {
        const lexer = new Lexer('/* sin cerrar');
        const { errors } = lexer.scanTokens();
        assert(errors.length > 0);
        assert(errors[0].code === 'LEX-003');
    });

    test('operadores', () => {
        const lexer = new Lexer('== != <= >= && || !');
        const { tokens } = lexer.scanTokens();
        const ops = tokens.filter(t => t.type !== TokenType.EOF).map(t => t.type);
        assertEqual(ops, [
            TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL,
            TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL,
            TokenType.AND, TokenType.OR,
            TokenType.BANG
        ]);
    });

    test('línea y columna', () => {
        const lexer = new Lexer('int x = 5;');
        const { tokens } = lexer.scanTokens();
        assertEqual(tokens[0].lexeme, 'int');
        assertEqual(tokens[0].line, 1);
        assertEqual(tokens[0].column, 1);
        assertEqual(tokens[1].lexeme, 'x');
        assertEqual(tokens[1].column, 5);
    });

    test('carácter no reconocido', () => {
        const lexer = new Lexer('@');
        const { errors } = lexer.scanTokens();
        assert(errors.length > 0);
        assert(errors[0].code === 'LEX-002');
    });
});

// ============================================
// Parser Tests
// ============================================

describe("Parser", () => {
    test('server resource', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main {
    print("test");
}`;
        const lexer = new Lexer(source);
        const { tokens, errors: lexErrors } = lexer.scanTokens();
        assertEqual(lexErrors.length, 0);

        const parser = new Parser(tokens);
        const { ast, errors } = parser.parse();
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
        assert(ast.length >= 2, 'debe tener al menos 2 declaraciones (server + main)');
    });

    test('service resource', () => {
        const source = `service api {
    port = 8080;
    replicas = 2;
    dependsOn = [];
}

main { print("ok"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('database resource', () => {
        const source = `database db {
    engine = "postgresql";
    version = "16";
    port = 5432;
}

main { print("ok"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('expresiones aritméticas', () => {
        const source = `int x = 2 + 3 * 4;
main { print(x); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('precedencia de operadores', () => {
        const source = `bool r = 1 + 2 * 3 >= 4 && 5 == 5;
main { print("ok"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('if-else', () => {
        const source = `main {
    if (true) {
        print("a");
    } else {
        print("b");
    }
}`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('while', () => {
        const source = `main {
    int i = 0;
    while (i < 10) {
        i = i + 1;
    }
}`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('for', () => {
        const source = `main {
    for (int i = 0; i < 10; i = i + 1) {
        print("i");
    }
}`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('function', () => {
        const source = `function add(int a, int b) int {
    return a + b;
}

main { print("ok"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('task', () => {
        const source = `task setup {
    print("setting up");
}

main { run setup; }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('arrays', () => {
        const source = `string[] names = ["a", "b", "c"];
main { print("ok"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('propiedades', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main {
    int c = backend.cpu;
    print("ok");
}`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('índices de arreglo', () => {
        const source = `string[] items = ["x", "y"];
main {
    string first = items[0];
    print(first);
}`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0);
    });

    test('error sintáctico', () => {
        const source = `int x 5;`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assert(errors.length > 0, 'debe detectar error sintáctico');
    });

    test('errores múltiples', () => {
        const source = `int x 5;
server s { cpu = 4; }
main { }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assert(errors.length >= 1, 'debe detectar al menos un error');
    });

    test('cero main', () => {
        const source = `int x = 5;`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assert(errors.length > 0, 'debe error por falta de main');
        assert(errors.some(e => e.code === 'SEM-000'));
    });

    test('dos mains', () => {
        const source = `main { print("a"); }
main { print("b"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assert(errors.length > 0, 'debe error por múltiples main');
        assert(errors.some(e => e.code === 'SEM-000'));
    });

    test('main exactamente uno', () => {
        const source = `server s { cpu = 1; memory = 1; disk = 1; os = "lin"; }
main { print("ok"); }`;
        const lexer = new Lexer(source);
        const { tokens } = lexer.scanTokens();
        const parser = new Parser(tokens);
        const { errors } = parser.parse();
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });
});

// ============================================
// AST Tests
// ============================================

function parseSource(source) {
    const lexer = new Lexer(source);
    const { tokens } = lexer.scanTokens();
    const parser = new Parser(tokens);
    return parser.parse();
}

describe("AST", () => {
    test('AST contiene todos los tipos de nodo', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

string[] packages = ["docker", "git"];

function canDeploy(server s, int minCpu) bool {
    return s.cpu >= minCpu;
}

task setup {
    start(backend);
    deploy(backend, api);
}

main {
    run setup;
    int x = 10;
    x = x + 5;
    string p = packages[0];
    if (x >= 15) {
        int y = 0;
    }
    while (x > 0) {
        x = x - 1;
        continue;
    }
    for (int i = 0; i < 5; i = i + 1) {
        break;
    }
    return;
}`;
        const { ast, errors } = parseSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));

        function collectNodes(node, found) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
                node.forEach(n => collectNodes(n, found));
                return;
            }
            if (node.constructor && node.constructor.name) {
                found.add(node.constructor.name);
            }
            for (const key of Object.keys(node)) {
                const val = node[key];
                if (val && typeof val === 'object') {
                    if (Array.isArray(val)) {
                        val.forEach(v => collectNodes(v, found));
                    } else if (val.constructor && val.constructor.name !== node.constructor.name) {
                        collectNodes(val, found);
                    }
                }
            }
        }

        const found = new Set();
        collectNodes(ast, found);

        assert(found.has('VarDeclInstruction'), 'debe contener VarDeclInstruction');
        assert(found.has('AssignmentInstruction'), 'debe contener AssignmentInstruction');
        assert(found.has('IfInstruction'), 'debe contener IfInstruction');
        assert(found.has('WhileInstruction'), 'debe contener WhileInstruction');
        assert(found.has('ForInstruction'), 'debe contener ForInstruction');
        assert(found.has('ReturnInstruction'), 'debe contener ReturnInstruction');
        assert(found.has('BreakInstruction'), 'debe contener BreakInstruction');
        assert(found.has('ContinueInstruction'), 'debe contener ContinueInstruction');
        assert(found.has('FunctionDeclInstruction'), 'debe contener FunctionDeclInstruction');
        assert(found.has('TaskDeclInstruction'), 'debe contener TaskDeclInstruction');
        assert(found.has('RunInstruction'), 'debe contener RunInstruction');
        assert(found.has('ResourceDeclInstruction'), 'debe contener ResourceDeclInstruction');
        assert(found.has('ArrayExpr'), 'debe contener ArrayExpr');
        assert(found.has('PropertyAccessExpr'), 'debe contener PropertyAccessExpr');
        assert(found.has('IndexExpr'), 'should contain IndexExpr');
        assert(found.has('CallExpr'), 'debe contener CallExpr');
        assert(found.has('BinaryExpr'), 'debe contener BinaryExpr');
        assert(found.has('IdentifierExpr'), 'debe contener IdentifierExpr');
        assert(found.has('LiteralExpr'), 'debe contener LiteralExpr');
    });

    test('AST Graphviz genera DOT válido', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

function add(int a, int b) int {
    return a + b;
}

main {
    int x = add(1, 2);
    if (x > 0) {
        print("positive");
    }
}`;
        const { ast, errors } = parseSource(source);
        assertEqual(errors.length, 0);

        const generator = new AstGraphvizReport();
        const dot = generator.generateDot(ast);
        assert(dot.includes('digraph AST {'), 'debe contener encabezado digraph');
        assert(dot.includes('Program'), 'debe contener nodo root Program');
        assert(dot.includes('ResourceDecl'), 'debe contener nodo ResourceDecl');
        assert(dot.includes('FuncDecl'), 'debe contener nodo FuncDecl');
        assert(dot.includes('VarDecl'), 'debe contener nodo VarDecl');
        assert(dot.includes('If'), 'debe contener nodo If');
        assert(dot.includes('Call'), 'debe contener nodo Call');
        assert(dot.includes('}'), 'debe cerrar el digraph');
    });

    test('AST Graphviz incluye todos los nodos', () => {
        const source = `main {
    int x = 0;
    while (x < 10) {
        x = x + 1;
        if (x == 5) {
            break;
        }
        continue;
    }
    for (int i = 0; i < 3; i = i + 1) {
        return;
    }
}`;
        const { ast, errors } = parseSource(source);
        assertEqual(errors.length, 0);

        const generator = new AstGraphvizReport();
        const dot = generator.generateDot(ast);
        assert(dot.includes('While'), 'debe contener While');
        assert(dot.includes('For'), 'debe contener For');
        assert(dot.includes('Return'), 'debe contener Return');
        assert(dot.includes('Break'), 'debe contener Break');
        assert(dot.includes('Continue'), 'debe contener Continue');
    });

    test('Literal expressions en AST', () => {
        const source = `main {
    int a = 10;
    float b = 2.5;
    string c = "hello";
    bool d = true;
}`;
        const { ast, errors } = parseSource(source);
        assertEqual(errors.length, 0);
        assert(ast.length > 0);
    });

    test('PropertyAccess y IndexExpr en AST', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

string[] pkgs = ["a", "b"];

main {
    int c = backend.cpu;
    string first = pkgs[0];
}`;
        const { ast, errors } = parseSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });
});

describe("Semantic", () => {
    function analyzeSource(source) {
        const { ast } = parseSource(source);
        const analyzer = new SemanticAnalyzer();
        return analyzer.analyze(ast);
    }

    test('tipos básicos válidos', () => {
        const source = `int x = 5;
float y = 3.14;
string s = "hola";
bool b = true;
main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('int assignable a float', () => {
        const source = `float f = 10;
main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0);
    });

    test('tipo incompatible en declaración', () => {
        const source = `int x = "hola";
main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar error de tipo');
    });

    test('asignación de tipo incompatible', () => {
        const source = `int x = 5;
main {
    x = "hola";
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar error de tipo en asignación');
        assert(errors.some(e => e.code === 'SEM-002'));
    });

    test('arreglo heterogéneo', () => {
        const source = `string[] x = ["a", 5];
main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar arreglo heterogéneo');
    });

    test('asignación de índice incompatible', () => {
        const source = `string[] x = ["a"];
main {
    x[0] = 5;
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar asignación de índice incompatible');
    });

    test('propiedad no permitida en server', () => {
        const source = `server backend {
    cpu = 4;
    banana = 123;
}

main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar propiedad no permitida');
    });

    test('propiedad válida en server', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('parametro de tipo incorrecto', () => {
        const source = `function f(server s) bool {
    return true;
}

main {
    f(123);
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar argumento de tipo incorrecto');
    });

    test('retorno de tipo incompatible', () => {
        const source = `function f() int {
    return "hola";
}

main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar retorno de tipo incompatible');
    });

    test('return sin valor en función no void', () => {
        const source = `function f() int {
    return;
}

main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar return sin valor en función no void');
    });

    test('return void en función void', () => {
        const source = `function f() void {
    return;
}

main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('break fuera de ciclo', () => {
        const source = `main {
    break;
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar break fuera de ciclo');
    });

    test('continue fuera de ciclo', () => {
        const source = `main {
    continue;
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar continue fuera de ciclo');
    });

    test('return fuera de función', () => {
        const source = `main {
    return 5;
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar return fuera de función');
    });

    test('break dentro de while', () => {
        const source = `main {
    while (true) {
        break;
    }
}`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('break dentro de for', () => {
        const source = `main {
    for (int i = 0; i < 10; i = i + 1) {
        break;
    }
}`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('cero main', () => {
        const source = `int x = 5;`;
        const { errors } = analyzeSource(source);
        assert(errors.some(e => e.code === 'SEM-000'));
    });

    test('dos mains', () => {
        const source = `main { print("a"); }
main { print("b"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.some(e => e.code === 'SEM-000'));
    });

    test('función no declarada', () => {
        const source = `main {
    unknown(5);
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar función no declarada');
    });

    test('native function argument count', () => {
        const source = `main {
    start();
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar número de argumentos incorrecto');
    });

    test('native function argument type', () => {
        const source = `main {
    start(123);
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar tipo de argumento incorrecto');
    });

    test('dependsOn con recursos válidos', () => {
        const source = `database db {
    engine = "postgresql";
    version = "16";
    port = 5432;
}

server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

service api {
    port = 8080;
    replicas = 2;
    dependsOn = [db, backend];
}

main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('propiedades de recurso: server', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main {
    backend.status = "running";
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar asignación a propiedad de solo lectura status');
    });

    test('acceso a propiedad de recurso', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main {
    int c = backend.cpu;
    string os = backend.os;
}`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('acceso a propiedad inexistente', () => {
        const source = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main {
    int c = backend.nonexistent;
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar propiedad inexistente');
    });

    test('doble asignación en mismo scope', () => {
        const source = `int x = 1;
int x = 2;
main { print("ok"); }`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar declaración duplicada');
    });

    test('shadowing permitido', () => {
        const source = `int x = 1;
function test() int {
    int x = 2;
    return x;
}
main { print(test()); }`;
        const { errors } = analyzeSource(source);
        assertEqual(errors.length, 0, errors.map(e => e.description).join('; '));
    });

    test('condiciones de if deben ser bool', () => {
        const source = `main {
    if (5) { print("ok"); }
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar condición no booleana en if');
    });

    test('condiciones de while deben ser bool', () => {
        const source = `main {
    while (5) { print("ok"); }
}`;
        const { errors } = analyzeSource(source);
        assert(errors.length > 0, 'debe detectar condición no booleana en while');
    });
});

console.log('========================================');
console.log('  AutoInfra Test Suite');
console.log('========================================\n');

testGroups.forEach(group => {
    console.log(`${group.name}:`);
    group.tests.forEach(runTest);
    console.log('');
});

const totalTests = testGroups.reduce((sum, g) => sum + g.tests.length, 0);

console.log('========================================');
console.log(`  Resultado: ${passed}/${totalTests} pasaron, ${failures.length} fallaron`);
console.log('========================================');

if (failures.length > 0) {
    process.exitCode = 1;
}
