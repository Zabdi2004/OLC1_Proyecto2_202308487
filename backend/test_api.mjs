import http from 'http';

const req = http.request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/health',
    method: 'GET'
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Health:', data);
        
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
        const req2 = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/execute',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                const result = JSON.parse(data2);
                console.log('Execute success:', result.success);
                console.log('Errors:', result.errors.length);
                console.log('Servers:', result.infrastructure?.servers?.length || 0);
                console.log('Output:', result.output);
            });
        });
        req2.write(body);
        req2.end();
    });
});
req.end();