/**
 * Suite de pruebas para AutoInfra
 * Ejecuta: npm test
 */
import { Lexer } from './src/lexer/Lexer.js';
import { Parser } from './src/parser/Parser.js';
import { TokenType } from './src/lexer/TokenType.js';

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
// Runner
// ============================================

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
