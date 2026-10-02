import { ServerResource } from './ServerResource.js';
import { ServiceResource } from './ServiceResource.js';
import { DatabaseResource } from './DatabaseResource.js';

export class InfraState {
    constructor() {
        /** @type {Map<string, ServerResource>} */
        this.servers = new Map();
        /** @type {Map<string, ServiceResource>} */
        this.services = new Map();
        /** @type {Map<string, DatabaseResource>} */
        this.databases = new Map();
        /** @type {Array<{ from: string, to: string }>} */
        this.connections = [];
        /** @type {string[]} */
        this.bitacora = [];
        /** @type {string[]} */
        this.consoleOutput = [];
    }

    reset() {
        this.servers.clear();
        this.services.clear();
        this.databases.clear();
        this.connections = [];
        this.bitacora = [];
        this.consoleOutput = [];
    }

    addServer(server) {
        this.servers.set(server.name, server);
        this.log(`Resource '${server.name}' registered`);
    }

    addService(service) {
        this.services.set(service.name, service);
        this.log(`Resource '${service.name}' registered`);
    }

    addDatabase(database) {
        this.databases.set(database.name, database);
        this.log(`Resource '${database.name}' registered`);
    }

    getResource(name) {
        return this.servers.get(name) || this.services.get(name) || this.databases.get(name) || null;
    }

    log(message) {
        const entry = `[OK] ${message}`;
        this.bitacora.push(entry);
    }

    printToConsole(message) {
        this.consoleOutput.push(String(message));
    }

    /**
     * start(resource): Cambia stopped -> running
     * start sobre un recurso ya activo no deberá duplicar efectos; retornará false y registrará advertencia.
     */
    start(resource) {
        if (!resource) return false;
        if (resource.status === 'running') {
            this.bitacora.push(`[WARN] Resource '${resource.name}' is already running`);
            return false;
        }

        resource.status = 'running';
        this.log(`${resource.name} -> running`);
        return true;
    }

    /**
     * stop(resource): Cambia running -> stopped
     * stop sobre un recurso detenido retornará false.
     */
    stop(resource) {
        if (!resource) return false;
        if (resource.status === 'stopped' || resource.status === 'undeployed') {
            return false;
        }

        resource.status = 'stopped';
        this.log(`${resource.name} -> stopped`);
        return true;
    }

    /**
     * restart(resource): Reinicia un recurso activo
     */
    restart(resource) {
        if (!resource) return false;
        if (resource.status !== 'running') {
            return false;
        }

        // Simula reinicio
        resource.status = 'running';
        this.log(`${resource.name} restarted`);
        return true;
    }

    /**
     * install(server, string): Agrega un paquete al servidor
     * Regla: No se puede instalar software en un servidor detenido.
     */
    install(server, packageName) {
        if (!server || !(server instanceof ServerResource)) {
            return false;
        }
        if (server.status !== 'running') {
            return false;
        }
        if (!server.packages.includes(packageName)) {
            server.packages.push(packageName);
        }
        this.log(`${packageName} installed on ${server.name}`);
        return true;
    }

    /**
     * uninstall(server, string): Elimina un paquete instalado
     */
    uninstall(server, packageName) {
        if (!server || !(server instanceof ServerResource)) {
            return false;
        }
        const index = server.packages.indexOf(packageName);
        if (index !== -1) {
            server.packages.splice(index, 1);
            this.log(`${packageName} uninstalled from ${server.name}`);
            return true;
        }
        return false;
    }

    /**
     * deploy(server, service): Asocia y activa un servicio en un server
     * Reglas:
     * - No se puede desplegar un servicio en un servidor detenido.
     * - Antes de desplegar api, todas sus dependencias deberán existir y encontrarse en estado running (INFRA-004).
     */
    deploy(server, service, line = 0, column = 0) {
        if (!server || !(server instanceof ServerResource)) {
            throw new Error(`Primer argumento de deploy() debe ser un server`);
        }
        if (!service || !(service instanceof ServiceResource)) {
            throw new Error(`Segundo argumento de deploy() debe ser un service`);
        }

        if (server.status !== 'running') {
            const err = new Error(`No se puede desplegar '${service.name}'. El servidor '${server.name}' se encuentra en estado stopped.`);
            err.code = 'INFRA-001';
            err.line = line;
            err.column = column;
            throw err;
        }

        // Validar dependencias (Sección 12 y 12.1)
        for (const dep of service.dependsOn) {
            const resolvedDep = typeof dep === 'string' ? this.getResource(dep) : dep;
            if (!resolvedDep) {
                const err = new Error(`Dependencia '${dep}' no existe.`);
                err.code = 'INFRA-003';
                err.line = line;
                err.column = column;
                throw err;
            }
            if (resolvedDep.status !== 'running') {
                const err = new Error(`No se puede desplegar '${service.name}'.\nDependencia '${resolvedDep.name}' se encuentra en estado ${resolvedDep.status}.`);
                err.code = 'INFRA-004';
                err.line = line;
                err.column = column;
                throw err;
            }
        }

        // Si pasa todas las precondiciones, aplicar cambios atómicos
        service.host = server;
        service.status = 'running';
        this.log(`${service.name} deployed on ${server.name}`);
        return true;
    }

    /**
     * scale(service, int): Modifica réplicas (requiere al menos 1 réplica)
     */
    scale(service, replicas) {
        if (!service || !(service instanceof ServiceResource)) {
            return false;
        }
        if (replicas < 1) {
            return false;
        }
        const oldReplicas = service.replicas;
        service.replicas = replicas;
        this.log(`${service.name} scaled from ${oldReplicas} to ${replicas} replicas`);
        return true;
    }

    /**
     * connect(res1, res2): Registra una conexión lógica sin duplicar
     */
    connect(res1, res2) {
        if (!res1 || !res2) return false;
        const exists = this.connections.some(c =>
            (c.from === res1.name && c.to === res2.name) ||
            (c.from === res2.name && c.to === res1.name)
        );
        if (!exists) {
            this.connections.push({ from: res1.name, to: res2.name });
            this.log(`Connected ${res1.name} <-> ${res2.name}`);
            return true;
        }
        return false;
    }

    /**
     * disconnect(res1, res2): Elimina una conexión lógica
     */
    disconnect(res1, res2) {
        if (!res1 || !res2) return false;
        const initialLen = this.connections.length;
        this.connections = this.connections.filter(c =>
            !( (c.from === res1.name && c.to === res2.name) || (c.from === res2.name && c.to === res1.name) )
        );
        if (this.connections.length < initialLen) {
            this.log(`Disconnected ${res1.name} <-> ${res2.name}`);
            return true;
        }
        return false;
    }

    /**
     * status(resource): Devuelve estado actual en string
     */
    status(resource) {
        return resource ? resource.status : 'unknown';
    }

    /**
     * Retorna una representación JSON del estado de infraestructura para la API y reportes
     */
    toJSON() {
        return {
            servers: Array.from(this.servers.values()).map(s => s.toJSON()),
            services: Array.from(this.services.values()).map(s => s.toJSON()),
            databases: Array.from(this.databases.values()).map(db => db.toJSON()),
            connections: [...this.connections]
        };
    }
}
