export class ServerResource {
    constructor(name, properties = {}) {
        this.name = name;
        this.cpu = properties.cpu !== undefined ? properties.cpu : 1;
        this.memory = properties.memory !== undefined ? properties.memory : 1;
        this.disk = properties.disk !== undefined ? properties.disk : 10;
        this.os = properties.os !== undefined ? properties.os : 'linux';
        this.status = 'stopped'; // Inicia en stopped (Sección 9.1)
        this.packages = [];      // Inicia vacío (Sección 9.1)
    }

    getProperty(propName) {
        switch (propName) {
            case 'cpu': return this.cpu;
            case 'memory': return this.memory;
            case 'disk': return this.disk;
            case 'os': return this.os;
            case 'status': return this.status;
            case 'packages': return this.packages;
            default:
                return undefined;
        }
    }

    isReadOnlyProperty(propName) {
        return propName === 'status' || propName === 'packages';
    }

    setProperty(propName, value) {
        switch (propName) {
            case 'cpu': this.cpu = value; break;
            case 'memory': this.memory = value; break;
            case 'disk': this.disk = value; break;
            case 'os': this.os = value; break;
            default:
                throw new Error(`Propiedad '${propName}' no modificable o no existe en server`);
        }
    }

    toJSON() {
        return {
            name: this.name,
            cpu: this.cpu,
            memory: this.memory,
            disk: this.disk,
            os: this.os,
            status: this.status,
            packages: [...this.packages]
        };
    }
}
