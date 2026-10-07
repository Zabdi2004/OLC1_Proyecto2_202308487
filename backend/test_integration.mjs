import http from 'http';

function get(path, port) {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: 'localhost', port, path, method: 'GET' }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 200) }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function test() {
    const frontend = await get('/', 5173);
    console.log('Frontend:', frontend.status, frontend.data.substring(0, 80));
    
    const backend = await get('/api/health', 8080);
    console.log('Backend:', backend.status, backend.data);
    
    // Test /api/analyze with a valid program
    const analyze = await new Promise((resolve, reject) => {
        const body = JSON.stringify({ source: 'server backend {\n    cpu = 4;\n    memory = 8;\n    disk = 100;\n    os = "ubuntu";\n}\n\nmain {\n    start(backend);\n}' });
        const req = http.request({
            hostname: 'localhost', port: 8080, path: '/api/analyze', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
    console.log('/api/analyze valid:', analyze.success, analyze.errors.length, 'errors');
    
    // Test /api/execute with a valid program
    const execute = await new Promise((resolve, reject) => {
        const body = JSON.stringify({ source: 'server backend {\n    cpu = 4;\n    memory = 8;\n    disk = 100;\n    os = "ubuntu";\n}\n\nmain {\n    start(backend);\n    print("OK");\n}' });
        const req = http.request({
            hostname: 'localhost', port: 8080, path: '/api/execute', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
    console.log('/api/execute valid:', execute.success, execute.errors.length, 'errors');
    console.log('Output:', execute.output);
    console.log('Infrastructure:', execute.infrastructure.servers.map(s => `${s.name}: ${s.status}`));
}

test().catch(console.error);