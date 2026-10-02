import { Interpreter } from './src/interpreter/Interpreter.js';

const interp = new Interpreter();

// Shadowing test (expected: x=1 due to lexical scoping, but currently returns 2 due to dynamic scoping)
const shadow = `int x = 1;

function test() int {
    return x;
}

task demo {
    int x = 2;
    print(test());
}

main {
    run demo;
}`;

const result = interp.execute(shadow);
console.log('=== SHADOW ===');
console.log('success:', result.success);
console.log('errors:', JSON.stringify(result.errors));
console.log('output:', result.output);
console.log('Expected: 1 (lexical scope), Got:', result.output[0]);

// Valid type program
const valid = `string[] items = ["a", "b", "c"];
main {
    int len = length(items);
    print(len);
}`;

const result2 = interp.execute(valid);
console.log('\n=== VALID TYPE ===');
console.log('success:', result2.success);
console.log('errors:', JSON.stringify(result2.errors));
console.log('output:', result2.output);

// Array index type check: x[0] = 5 on string[]
const arrAssign = `string[] x = ["a", "b"];
main {
    x[0] = 5;
}`;

const result3 = interp.execute(arrAssign);
console.log('\n=== ARRAY INDEX TYPE CHECK ===');
console.log('success:', result3.success);
console.log('errors:', result3.errors.map(e => `${e.code}: ${e.description}`));

// Nested property access: api.host.os
const nested = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

service api {
    port = 8080;
    replicas = 2;
    dependsOn = [backend];
}

main {
    start(backend);
    deploy(backend, api);
    string osName = api.host.os;
    print(osName);
}`;

const result4 = interp.execute(nested);
console.log('\n=== NESTED PROPERTY (api.host.os) ===');
console.log('success:', result4.success);
console.log('errors:', JSON.stringify(result4.errors));
console.log('output:', result4.output);

// dependsOn type check - dependsOn should accept resource[]
const depTypes = `database db {
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

main {
    start(db);
    start(backend);
    deploy(backend, api);
}`;

const result5 = interp.execute(depTypes);
console.log('\n=== DEPENDSON MULTIPLE ===');
console.log('success:', result5.success);
console.log('errors:', JSON.stringify(result5.errors));
console.log('infrastructure:', JSON.stringify(result5.infrastructure.services));
