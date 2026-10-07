/**
 * Sistema de tipos para AutoInfra
 */
export const DataType = Object.freeze({
    INT: 'int',
    FLOAT: 'float',
    STRING: 'string',
    BOOL: 'bool',
    SERVER: 'server',
    SERVICE: 'service',
    DATABASE: 'database',
    RESOURCE: 'resource', // Tipo polimórfico genérico que acepta server, service o database
    VOID: 'void',
    NULL: 'null',
    ANY: 'any',
    ARRAY_ONLY: '_array_only' // Tipo interno para length() que requiere solo arreglos
});

export class Type {
    /**
     * @param {string} baseType - Uno de DataType
     * @param {boolean} isArray - Si es un arreglo T[]
     */
    constructor(baseType, isArray = false) {
        this.baseType = baseType;
        this.isArray = isArray;
    }

    toString() {
        return this.isArray ? `${this.baseType}[]` : this.baseType;
    }

    equals(other) {
        if (!other) return false;
        return this.baseType === other.baseType && this.isArray === other.isArray;
    }

    /**
     * Retorna el valor por defecto según el tipo (Sección 5.1)
     */
    getDefaultValue() {
        if (this.isArray) return [];
        switch (this.baseType) {
            case DataType.INT: return 0;
            case DataType.FLOAT: return 0.0;
            case DataType.STRING: return '';
            case DataType.BOOL: return false;
            case DataType.SERVER:
            case DataType.SERVICE:
            case DataType.DATABASE:
            case DataType.RESOURCE:
                return null;
            default: return null;
        }
    }

    /**
     * Valida si un valor 'fromType' puede ser asignado a una variable de este tipo (Sección 26.6)
     * NOTA: Para arreglos, la coincidencia es estricta (no hay widening int→float).
     */
    isAssignable(fromType) {
        if (!fromType) return false;
        if (this.isArray !== fromType.isArray) return false;

        // Arreglos: coincidencia estricta de tipo base (sin widening)
        if (this.isArray) {
            if (this.baseType === DataType.RESOURCE &&
                (fromType.baseType === DataType.SERVER || fromType.baseType === DataType.SERVICE || fromType.baseType === DataType.DATABASE || fromType.baseType === DataType.RESOURCE)) {
                return true;
            }
            return this.baseType === fromType.baseType;
        }

        // Caso float: acepta int o float (Sección 26.6) - solo para valores individuales
        if (this.baseType === DataType.FLOAT && (fromType.baseType === DataType.INT || fromType.baseType === DataType.FLOAT)) {
            return true;
        }

        // Caso Resource genérico (parámetros de start, stop, restart, etc.)
        if (this.baseType === DataType.RESOURCE &&
            (fromType.baseType === DataType.SERVER || fromType.baseType === DataType.SERVICE || fromType.baseType === DataType.DATABASE || fromType.baseType === DataType.RESOURCE)) {
            return true;
        }

        // Tipos idénticos
        return this.baseType === fromType.baseType;
    }

    /**
     * Verifica si dos tipos son estrictamente iguales (para homogeneidad de arreglos).
     * No permite widening int→float.
     */
    isStrictEqual(other) {
        if (!other) return false;
        return this.baseType === other.baseType && this.isArray === other.isArray;
    }
}
