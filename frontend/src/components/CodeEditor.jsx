import React from 'react';
import Editor from '@monaco-editor/react';

export const CodeEditor = ({ code, onChange }) => {
    const handleEditorWillMount = (monaco) => {
        // Registrar lenguaje AutoInfra en Monaco
        if (!monaco.languages.getLanguages().some(lang => lang.id === 'autoinfra')) {
            monaco.languages.register({ id: 'autoinfra' });

            monaco.languages.setMonarchTokensProvider('autoinfra', {
                keywords: [
                    'int', 'float', 'string', 'bool',
                    'server', 'service', 'database',
                    'if', 'else', 'while', 'for', 'break', 'continue', 'return',
                    'function', 'task', 'main', 'run',
                    'true', 'false'
                ],
                builtins: [
                    'start', 'stop', 'restart', 'install', 'uninstall',
                    'deploy', 'scale', 'connect', 'disconnect',
                    'print', 'length', 'status'
                ],
                tokenizer: {
                    root: [
                        [/\/\/.*$/, 'comment'],
                        [/\/\*/, 'comment', '@comment'],
                        [/"([^"\\]|\\.)*$/, 'string.invalid'],
                        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                        [/\b\d+\.\d+\b/, 'number.float'],
                        [/\b\d+\b/, 'number'],
                        [/[a-zA-Z_]\w*/, {
                            cases: {
                                '@keywords': 'keyword',
                                '@builtins': 'type.identifier',
                                '@default': 'identifier'
                            }
                        }],
                        [/[{}()\[\]]/, '@brackets'],
                        [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
                        [/[;,.]/, 'delimiter']
                    ],
                    comment: [
                        [/[^\/*]+/, 'comment'],
                        [/\*\//, 'comment', '@pop'],
                        [/[\/*]/, 'comment']
                    ],
                    string: [
                        [/[^\\"]+/, 'string'],
                        [/\\./, 'string.escape'],
                        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
                    ]
                }
            });

            // Tema visual oscuro premium para AutoInfra
            monaco.editor.defineTheme('autoinfra-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
                    { token: 'type.identifier', foreground: 'a78bfa', fontStyle: 'bold' },
                    { token: 'identifier', foreground: 'f1f5f9' },
                    { token: 'string', foreground: '34d399' },
                    { token: 'number', foreground: 'fbbf24' },
                    { token: 'number.float', foreground: 'f59e0b' },
                    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
                    { token: 'operator', foreground: 'f43f5e' }
                ],
                colors: {
                    'editor.background': '#0b0f17',
                    'editor.foreground': '#f8fafc',
                    'editorLineNumber.foreground': '#334155',
                    'editorLineNumber.activeForeground': '#60a5fa',
                    'editor.selectionBackground': '#1e3a8a80',
                    'editor.lineHighlightBackground': '#111827'
                }
            });
        }
    };

    return (
        <div style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <Editor
                height="100%"
                language="autoinfra"
                theme="autoinfra-dark"
                value={code}
                onChange={onChange}
                beforeMount={handleEditorWillMount}
                options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true
                }}
            />
        </div>
    );
};
