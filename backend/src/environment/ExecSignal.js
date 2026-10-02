/**
 * Señales de control de flujo para evitar depender de excepciones durante la ejecución
 */
export const ExecSignal = Object.freeze({
    NORMAL: 'normal',
    BREAK: 'break',
    CONTINUE: 'continue',
    RETURN: 'return'
});

export class ExecutionResult {
    /**
     * @param {string} signal - Del enum ExecSignal
     * @param {*} value - Valor de retorno (para RETURN) o resultado
     */
    constructor(signal = ExecSignal.NORMAL, value = null) {
        this.signal = signal;
        this.value = value;
    }

    static normal(value = null) {
        return new ExecutionResult(ExecSignal.NORMAL, value);
    }

    static break() {
        return new ExecutionResult(ExecSignal.BREAK);
    }

    static continue() {
        return new ExecutionResult(ExecSignal.CONTINUE);
    }

    static return(value = null) {
        return new ExecutionResult(ExecSignal.RETURN, value);
    }
}
