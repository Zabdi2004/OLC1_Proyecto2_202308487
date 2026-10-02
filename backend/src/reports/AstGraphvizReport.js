export class AstGraphvizReport {
    constructor() {
        this.nodeCounter = 0;
        this.dotLines = [];
    }

    /**
     * Genera el código DOT a partir de la lista de nodos del AST
     * @param {import('../ast/ASTNode.js').ASTNode[]} astNodes
     * @returns {string}
     */
    generateDot(astNodes) {
        this.nodeCounter = 0;
        this.dotLines = [
            'digraph AST {',
            '  node [shape=box, style="filled,rounded", fillcolor="#1e293b", fontcolor="#f8fafc", fontname="Courier"];',
            '  edge [color="#64748b", arrowhead=vee];',
            '  bgcolor="transparent";'
        ];

        const rootId = 'node_root';
        this.dotLines.push(`  ${rootId} [label="Program", fillcolor="#3b82f6", fontcolor="#ffffff"];`);

        for (const node of astNodes) {
            const childId = this.traverse(node);
            this.dotLines.push(`  ${rootId} -> ${childId};`);
        }

        this.dotLines.push('}');
        return this.dotLines.join('\n');
    }

    traverse(node) {
        if (!node) {
            const nullId = `node_${this.nodeCounter++}`;
            this.dotLines.push(`  ${nullId} [label="null", fillcolor="#475569"];`);
            return nullId;
        }

        const id = `node_${this.nodeCounter++}`;
        const label = this.escapeLabel(node.getNodeLabel ? node.getNodeLabel() : node.constructor.name);

        this.dotLines.push(`  ${id} [label="${label}"];`);

        // Recorrer hijos según el tipo de nodo
        switch (node.constructor.name) {
            case 'ResourceDeclInstruction': {
                for (const [propName, propExpr] of Object.entries(node.properties)) {
                    const propId = `node_${this.nodeCounter++}`;
                    this.dotLines.push(`  ${propId} [label="${propName} =", fillcolor="#0f766e"];`);
                    this.dotLines.push(`  ${id} -> ${propId};`);
                    const valId = this.traverse(propExpr);
                    this.dotLines.push(`  ${propId} -> ${valId};`);
                }
                break;
            }

            case 'VarDeclInstruction': {
                if (node.initializer) {
                    const initId = this.traverse(node.initializer);
                    this.dotLines.push(`  ${id} -> ${initId};`);
                }
                break;
            }

            case 'AssignmentInstruction': {
                const targetId = this.traverse(node.target);
                const valId = this.traverse(node.valueExpr);
                this.dotLines.push(`  ${id} -> ${targetId} [label="target"];`);
                this.dotLines.push(`  ${id} -> ${valId} [label="value"];`);
                break;
            }

            case 'IfInstruction': {
                const condId = this.traverse(node.condition);
                this.dotLines.push(`  ${id} -> ${condId} [label="cond"];`);
                const thenId = this.traverse(node.thenBranch);
                this.dotLines.push(`  ${id} -> ${thenId} [label="then"];`);
                if (node.elseBranch) {
                    const elseId = this.traverse(node.elseBranch);
                    this.dotLines.push(`  ${id} -> ${elseId} [label="else"];`);
                }
                break;
            }

            case 'WhileInstruction': {
                const condId = this.traverse(node.condition);
                this.dotLines.push(`  ${id} -> ${condId} [label="cond"];`);
                const bodyId = this.traverse(node.body);
                this.dotLines.push(`  ${id} -> ${bodyId} [label="body"];`);
                break;
            }

            case 'ForInstruction': {
                if (node.init) {
                    const initId = this.traverse(node.init);
                    this.dotLines.push(`  ${id} -> ${initId} [label="init"];`);
                }
                if (node.condition) {
                    const condId = this.traverse(node.condition);
                    this.dotLines.push(`  ${id} -> ${condId} [label="cond"];`);
                }
                if (node.update) {
                    const updId = this.traverse(node.update);
                    this.dotLines.push(`  ${id} -> ${updId} [label="update"];`);
                }
                const bodyId = this.traverse(node.body);
                this.dotLines.push(`  ${id} -> ${bodyId} [label="body"];`);
                break;
            }

            case 'FunctionDeclInstruction':
            case 'TaskDeclInstruction': {
                if (node.body) {
                    const bodyId = this.traverse(node.body);
                    this.dotLines.push(`  ${id} -> ${bodyId};`);
                }
                break;
            }

            case 'BlockInstruction': {
                for (const stmt of node.statements) {
                    const childId = this.traverse(stmt);
                    this.dotLines.push(`  ${id} -> ${childId};`);
                }
                break;
            }

            case 'ExpressionInstruction': {
                const exprId = this.traverse(node.expression);
                this.dotLines.push(`  ${id} -> ${exprId};`);
                break;
            }

            case 'BinaryExpr': {
                const leftId = this.traverse(node.left);
                const rightId = this.traverse(node.right);
                this.dotLines.push(`  ${id} -> ${leftId} [label="L"];`);
                this.dotLines.push(`  ${id} -> ${rightId} [label="R"];`);
                break;
            }

            case 'UnaryExpr': {
                const rightId = this.traverse(node.right);
                this.dotLines.push(`  ${id} -> ${rightId};`);
                break;
            }

            case 'PropertyAccessExpr': {
                const objId = this.traverse(node.object);
                this.dotLines.push(`  ${id} -> ${objId};`);
                break;
            }

            case 'IndexExpr': {
                const arrId = this.traverse(node.arrayExpr);
                const idxId = this.traverse(node.indexExpr);
                this.dotLines.push(`  ${id} -> ${arrId} [label="arr"];`);
                this.dotLines.push(`  ${id} -> ${idxId} [label="idx"];`);
                break;
            }

            case 'ArrayExpr': {
                for (const el of node.elements) {
                    const elId = this.traverse(el);
                    this.dotLines.push(`  ${id} -> ${elId};`);
                }
                break;
            }

            case 'CallExpr': {
                for (const arg of node.args) {
                    const argId = this.traverse(arg);
                    this.dotLines.push(`  ${id} -> ${argId} [label="arg"];`);
                }
                break;
            }

            default:
                break;
        }

        return id;
    }

    escapeLabel(text) {
        return String(text)
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, ' ');
    }
}
