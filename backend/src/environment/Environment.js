import { Symbol } from './Symbol.js';
import { InfraState } from '../infrastructure/InfraState.js';

export class Environment {
    /**
     * @param {Environment|null} parent - Entorno padre
     * @param {string} name - Nombre descriptivo del ámbito ('global', nombre de función, etc.)
     * @param {InfraState|null} infraState - Estado de infraestructura compartido
     */
    constructor(parent = null, name = 'global', infraState = null) {
        this.parent = parent;
        this.name = name;
        /** @type {Map<string, Symbol>} */
        this.symbols = new Map();
        this.infraState = infraState || (parent ? parent.infraState : new InfraState());
        
        // Registro de todos los símbolos creados durante el análisis para reporte
        this.symbolHistory = [];
    }

    /**
     * Declara un símbolo en el entorno actual
     */
    define(name, symbol) {
        this.symbols.set(name, symbol);
        this.recordHistory(symbol);
    }

    /**
     * Registra en la historia del entorno raíz para facilitar la generación del reporte
     */
    recordHistory(symbol) {
        if (this.parent) {
            this.parent.recordHistory(symbol);
        } else {
            this.symbolHistory.push(symbol);
        }
    }

    /**
     * Verifica si el identificador ya existe en el ámbito actual (para evitar duplicados en el mismo scope)
     */
    existsCurrent(name) {
        return this.symbols.has(name);
    }

    /**
     * Busca un símbolo desde el entorno actual hacia arriba
     */
    lookup(name) {
        if (this.symbols.has(name)) {
            return this.symbols.get(name);
        }
        if (this.parent !== null) {
            return this.parent.lookup(name);
        }
        return null;
    }

    /**
     * Asigna un nuevo valor a una variable existente en el ámbito correspondiente
     */
    assign(name, value) {
        if (this.symbols.has(name)) {
            const sym = this.symbols.get(name);
            sym.value = value;
            return true;
        }

        if (this.parent !== null) {
            return this.parent.assign(name, value);
        }

        return false;
    }

    /**
     * Retorna todos los símbolos registrados históricamente
     */
    getAllHistorySymbols() {
        if (this.parent) {
            return this.parent.getAllHistorySymbols();
        }
        return this.symbolHistory;
    }
}
