export const PRESETS = {
    basico: `// Caso de Prueba: Básico
server web {
    cpu = 2;
    memory = 4;
    disk = 50;
    os = "ubuntu";
}

service frontend {
    port = 80;
    replicas = 1;
}

main {
    start(web);
    int cost = web.cpu * 10 + web.memory * 5;
    if (cost >= 40) {
        install(web, "nginx");
        deploy(web, frontend);
    }
}
`,

    intermedio: `// Caso de Prueba: Intermedio
server node {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

string[] packages = ["docker", "git", "nginx"];

function prepare(server s, string[] pkgs) bool {
    int i = 0;
    while (i < length(pkgs)) {
        install(s, pkgs[i]);
        i = i + 1;
    }
    return true;
}

task setup {
    start(node);
    prepare(node, packages);
}

main {
    run setup;
}
`,

    avanzado: `// Caso de Prueba: Avanzado
database db {
    engine = "postgresql";
    version = "16";
    port = 5432;
}

server backend {
    cpu = 8;
    memory = 16;
    disk = 200;
    os = "ubuntu";
}

service api {
    port = 8080;
    replicas = 2;
    dependsOn = [db];
}

function retryStart(server s, int n) bool {
    if (n <= 0) {
        return false;
    }
    if (start(s)) {
        return true;
    }
    return retryStart(s, n - 1);
}

task production {
    start(db);
    retryStart(backend, 3);
    if (backend.status == "running" && db.status == "running") {
        install(backend, "docker");
        deploy(backend, api);
        for (int i = 2; i <= 5; i = i + 1) {
            scale(api, i);
        }
    }
}

main {
    run production;
}
`,

    errores: `// Casos de Prueba con Errores
server backend {
    cpu = 4;
    memory = 8;
    disk = 100;
    os = "ubuntu";
}

database db {
    engine = "postgresql";
    version = "16";
    port = 5432;
}

service api {
    port = 8080;
    replicas = 2;
    dependsOn = [db];
}

main {
    // 1. Error de Dependencia detenida (db no ha sido iniciada antes del deploy)
    // start(backend);
    // deploy(backend, api);

    // 2. Error léxico: caracter no reconocido
    // int x = 10 @ 2;

    // 3. Variable no declarada
    // x = 5;

    // 4. Tipo incompatible
    // int x = "hola";

    // 5. Propiedad de solo lectura
    // backend.status = "running";

    // Descomente una línea a la vez para probar diferentes tipos de errores:
    deploy(backend, api);
}
`
};
