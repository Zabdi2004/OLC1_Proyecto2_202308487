import { Interpreter } from './src/interpreter/Interpreter.js';

const interp = new Interpreter();

const tests = [
    {
        name: 'Type mismatch assignment',
        code: `int x = 5;
main {
    x = "hola";
}`,
        expectErrors: true,
        expectErrorCode: 'SEM-002',
    },
    {
        name: 'Array type mismatch',
        code: `string[] x = ["a", 5];
main { print("test"); }`,
        expectErrors: true,
    },
    {
        name: 'Array index type mismatch',
        code: `string[] x = ["a"];
main {
    x[0] = 5;
}`,
        expectErrors: true,
    },
    {
        name: 'Bad property on server',
        code: `server backend {
    cpu = 4;
    banana = 123;
}

main { print("test"); }`,
        expectErrors: true,
    },
    {
        name: 'Return outside function',
        code: `main {
    return 5;
}`,
        expectErrors: true,
    },
    {
        name: 'Break outside loop',
        code: `main {
    break;
}`,
        expectErrors: true,
    },
    {
        name: 'Continue outside loop',
        code: `main {
    continue;
}`,
        expectErrors: true,
    },
    {
        name: 'Function param type mismatch',
        code: `function f(server s) bool {
    return true;
}

main {
    f(123);
}`,
        expectErrors: true,
    },
    {
        name: 'Return type mismatch',
        code: `function f() int {
    return "hola";
}

main { print("test"); }`,
        expectErrors: true,
    },
    {
        name: 'Valid program (no errors)',
        code: `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

function add(int a, int b) int {
    return a + b;
}

main {
    int result = add(1, 2);
    print("result: " + result);
}`,
        expectErrors: false,
    },
];

let allPass = true;
for (const t of tests) {
    const result = interp.execute(t.code);
    const hasErrors = result.errors && result.errors.length > 0;
    const pass = t.expectErrors ? hasErrors : !hasErrors;
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${t.name}`);
    if (!pass) {
        allPass = false;
        console.log(`  success=${result.success}`);
        console.log(`  errors=${JSON.stringify(result.errors, null, 2)}`);
    } else if (hasErrors && t.expectErrorCode) {
        const codes = result.errors.map(e => e.code).join(',');
        console.log(`  errors: ${codes}`);
    }
}

console.log(`\n${allPass ? 'ALL PASSED' : 'SOME FAILED'}`);
process.exit(allPass ? 0 : 1);
