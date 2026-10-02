import { Interpreter } from './src/interpreter/Interpreter.js';
import { readFileSync } from 'fs';

const interp = new Interpreter();
const examples = ['basico', 'intermedio', 'avanzado', 'errores'];

for (const ex of examples) {
    const source = readFileSync(`../examples/${ex}.infra`, 'utf-8');
    const result = interp.execute(source);
    console.log(`${ex}: success=${result.success}, errors=${result.errors.length}`);
    if (result.errors.length > 0) {
        result.errors.forEach(e => console.log(`  ${e.code}: ${e.description} (L${e.line}:C${e.column})`));
    }
    if (result.success) {
        console.log(`  console output: ${result.output.join(' | ')}`);
    }
}
