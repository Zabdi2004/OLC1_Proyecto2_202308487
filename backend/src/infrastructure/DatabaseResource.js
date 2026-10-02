export class DatabaseResource {
    constructor(name, properties = {}) {
        this.name = name;
        this.engine = properties.engine !== undefined ? properties.engine : 'postgresql';
        this.version = properties.version !== undefined ? properties.version : '1.0';
        this.port = properties.port !== undefined ? properties.port : 5432;
        this.status = 'stopped'; // Inicia en stopped (Sección 9.3)
    }

    getProperty(propName) {
        switch (propName) {
            case 'engine': return this.engine;
            case 'version': return this.version;
            case 'port': return this.port;
            case 'status': return this.status;
            default:
                return undefined;
        }
    }

    isReadOnlyProperty(propName) {
        return propName === 'status';
    }

    setProperty(propName, value) {
        switch (propName) {
            case 'engine': this.engine = value; break;
            case 'version': this.version = value; break;
            case 'port': this.port = value; break;
            default:
                throw new Error(`Propiedad '${propName}' no modificable o no existe en database`);
        }
    }

    toJSON() {
        return {
            name: this.name,
            engine: this.engine,
            version: this.version,
            port: this.port,
            status: this.status
        };
    }
}
