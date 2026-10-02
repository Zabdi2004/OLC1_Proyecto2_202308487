import React from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export const ConsolePanel = ({ lines = [] }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        if (!lines || lines.length === 0) return;
        navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatLine = (line, index) => {
        let color = '#e2e8f0';
        if (line.startsWith('[OK]')) color = '#34d399';
        else if (line.startsWith('[WARN]')) color = '#fbbf24';
        else if (line.startsWith('[ERROR]') || line.includes('Error')) color = '#f87171';
        else if (line.startsWith('==') || line.startsWith('--')) color = '#60a5fa';
        else if (line.startsWith('FINAL STATE') || line.startsWith('OUTPUT:')) color = '#38bdf8';

        return (
            <div key={index} style={{ color, marginBottom: '3px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {line}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#070a10', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Terminal size={14} color="#60a5fa" />
                    <span>Terminal / Bitácora de Ejecución</span>
                </div>
                {lines.length > 0 && (
                    <button
                        onClick={handleCopy}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: copied ? '#34d399' : 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem'
                        }}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                )}
            </div>

            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                {lines.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        La consola está vacía. Ejecuta un script para observar la bitácora y salidas.
                    </div>
                ) : (
                    lines.map((l, i) => formatLine(l, i))
                )}
            </div>
        </div>
    );
};
