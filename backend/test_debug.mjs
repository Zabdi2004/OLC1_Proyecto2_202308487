import { Lexer } from './src/lexer/Lexer.js';
import { Parser } from './src/parser/Parser.js';
import { SemanticAnalyzer } from './src/semantic/SemanticAnalyzer.js';

const source = `server s {
    cpu = -1;
}

main {
}`;

const lexer = new Lexer(source);
const { tokens } = lexer.scanTokens();
const parser = new Parser(tokens);
const { ast } = parser.parse();
const analyzer = new SemanticAnalyzer();
const result = analyzer.analyze(ast);

console.log('Errors:', result.errors.map(e => `${e.code}: ${e.description}`));

// Verificar el AST
const serverNode = ast.find(n => n.constructor.name === 'ResourceDeclInstruction');
if (serverNode) {
    console.log('Server node:', serverNode.constructor.name);
    console.log('Properties:', Object.keys(serverNode.properties));
    for (const [k, v] of Object.entries(serverNode.properties)) {
        console.log(`  ${k}:`, v.constructor.name, v);
    }
}