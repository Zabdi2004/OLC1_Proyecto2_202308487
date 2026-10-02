export class ServiceResource {
    constructor(name, properties = {}) {
        this.name = name;
        this.port = properties.port !== undefined ? properties.port : 80;
        this.replicas = properties.replicas !== undefined ? properties.replicas : 1;
        this.status = 'undeployed'; // Inicia en undeployed (Sección 27.4)
        this.host = null;           // Server host asignado después de deploy (Sección 9.2)
        this.dependsOn = properties.dependsOn || []; // Array de referencias a recursos (Sección 12)
    }

    getProperty(propName) {
        switch (propName) {
            case 'port': return this.port;
            case 'replicas': return this.replicas;
            case 'status': return this.status;
            case 'host': return this.host;
            case 'dependsOn': return this.dependsOn;
            default:
                return undefined;
        }
    }

    isReadOnlyProperty(propName) {
        return propName === 'status' || propName === 'host';
    }

    setProperty(propName, value) {
        switch (propName) {
            case 'port': this.port = value; break;
            case 'replicas': this.replicas = value; break;
            case 'dependsOn': this.dependsOn = value; break;
            default:
                throw new Error(`Propiedad '${propName}' no modificable o no existe en service`);
        }
    }

    toJSON() {
        return {
            name: this.name,
            port: this.port,
            replicas: this.replicas,
            status: this.status,
            host: this.host ? this.host.name : null,
            dependsOn: this.dependsOn.map(r => r.name || r)
        };
    }
}
