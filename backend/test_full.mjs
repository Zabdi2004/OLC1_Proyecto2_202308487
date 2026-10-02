import http from 'http';

// Test frontend
const req = http.request({
    hostname: 'localhost',
    port: 5173,
    path: '/',
    method: 'GET'
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Frontend status:', res.statusCode);
        console.log('Content length:', data.length);
        
        // Test backend
        const req2 = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/health',
            method: 'GET'
        }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                console.log('Backend health:', data2);
                
                // Execute code
                const code = `server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

main {
    start(backend);
    print("Servidor iniciado");
}`;
                
                const body = JSON.stringify({ source: code });
                const req3 = http.request({
                    hostname: 'localhost',
                    port: 8080,
                    path: '/api/execute',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
                }, (res3) => {
                    let data3 = '';
                    res3.on('data', chunk => data3 += chunk);
                    res3.on('end', () => {
                        const result = JSON.parse(data3);
                        console.log('\n=== RESULTADO /api/execute ===');
                        console.log('Success:', result.success);
                        console.log('Errors:', result.errors.length);
                        console.log('Output:', result.output);
                        console.log('Servers:', result.infrastructure.servers.map(s => `${s.name}: ${s.status}`));
                    });
                });
                req3.write(body);
                req3.end();
            });
        });
        req2.end();
    });
});
req.end();