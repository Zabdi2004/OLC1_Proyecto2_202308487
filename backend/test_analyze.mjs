import http from 'http';

function post(path, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function test() {
    console.log('=== PRUEBA 1: /api/analyze con error semántico (int x = "hola") ===');
    const r1 = await post('/api/analyze', JSON.stringify({ source: 'int x = "hola";\n\nmain {\n}' }));
    console.log('Success:', r1.success);
    console.log('Errors:', r1.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 2: /api/analyze con start(123) ===');
    const r2 = await post('/api/analyze', JSON.stringify({ source: 'main {\n    start(123);\n}' }));
    console.log('Success:', r2.success);
    console.log('Errors:', r2.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 3: /api/analyze con break fuera de ciclo ===');
    const r3 = await post('/api/analyze', JSON.stringify({ source: 'main {\n    break;\n}' }));
    console.log('Success:', r3.success);
    console.log('Errors:', r3.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 4: /api/analyze con return fuera de función ===');
    const r4 = await post('/api/analyze', JSON.stringify({ source: 'main {\n    return 5;\n}' }));
    console.log('Success:', r4.success);
    console.log('Errors:', r4.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 5: /api/analyze con array heterogéneo ===');
    const r5 = await post('/api/analyze', JSON.stringify({ source: 'string[] x = ["a", 5];\n\nmain {\n}' }));
    console.log('Success:', r5.success);
    console.log('Errors:', r5.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 6: /api/analyze con if(5) ===');
    const r6 = await post('/api/analyze', JSON.stringify({ source: 'main {\n    if (5) {\n    }\n}' }));
    console.log('Success:', r6.success);
    console.log('Errors:', r6.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 7: /api/analyze con return incompatible en función ===');
    const r7 = await post('/api/analyze', JSON.stringify({ source: 'function f() int {\n    return "x";\n}\n\nmain {\n}' }));
    console.log('Success:', r7.success);
    console.log('Errors:', r7.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 8: /api/analyze con server con cpu negativo ===');
    const r8 = await post('/api/analyze', JSON.stringify({ source: 'server s {\n    cpu = -1;\n}\n\nmain {\n}' }));
    console.log('Success:', r8.success);
    console.log('Errors:', r8.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 9: /api/analyze con database engine inválido ===');
    const r9 = await post('/api/analyze', JSON.stringify({ source: 'database db {\n    engine = "oracle";\n    version = "1";\n    port = 1234;\n}\n\nmain {\n}' }));
    console.log('Success:', r9.success);
    console.log('Errors:', r9.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 10: /api/analyze con propiedad solo lectura ===');
    const r10 = await post('/api/analyze', JSON.stringify({ source: 'server s {\n    cpu = 4;\n    memory = 8;\n    disk = 100;\n    os = "ubuntu";\n}\n\nmain {\n    s.status = "running";\n}' }));
    console.log('Success:', r10.success);
    console.log('Errors:', r10.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 11: /api/analyze con % entre float ===');
    const r11 = await post('/api/analyze', JSON.stringify({ source: 'main {\n    float x = 5.5 % 2;\n}' }));
    console.log('Success:', r11.success);
    console.log('Errors:', r11.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 12: /api/analyze con igualdad incompatible ===');
    const r12 = await post('/api/analyze', JSON.stringify({ source: 'main {\n    bool x = 5 == "5";\n}' }));
    console.log('Success:', r12.success);
    console.log('Errors:', r12.errors.map(e => `${e.code}: ${e.description}`));

    console.log('\n=== PRUEBA 13: /api/analyze con código válido ===');
    const r13 = await post('/api/analyze', JSON.stringify({ source: 'server backend {\n    cpu = 4;\n    memory = 8;\n    disk = 100;\n    os = "ubuntu";\n}\n\nmain {\n    start(backend);\n}' }));
    console.log('Success:', r13.success);
    console.log('Errors:', r13.errors.map(e => `${e.code}: ${e.description}`));
}

test().catch(console.error);