import React, { useEffect, useState, useRef } from 'react';
import { instance } from '@viz-js/viz';
import { ZoomIn, ZoomOut, RotateCcw, Download, Copy, Code, Eye } from 'lucide-react';

export const AstViewer = ({ dotSource }) => {
    const [svgContent, setSvgContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [showRawDot, setShowRawDot] = useState(false);
    const [copied, setCopied] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!dotSource) {
            setSvgContent('');
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        instance()
            .then((viz) => {
                const svg = viz.renderString(dotSource, { format: 'svg' });
                if (isMounted) {
                    setSvgContent(svg);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError('Error al renderizar el gráfico del AST: ' + err.message);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [dotSource]);

    const handleCopy = () => {
        if (!dotSource) return;
        navigator.clipboard.writeText(dotSource);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ast_autoinfra.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!dotSource) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Ejecuta un archivo de código para generar la visualización gráfica del AST.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
            {/* Toolbar for AST */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button className="btn" onClick={() => setZoom(z => Math.min(z + 0.2, 3))} title="Acercar">
                        <ZoomIn size={14} />
                    </button>
                    <button className="btn" onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} title="Alejar">
                        <ZoomOut size={14} />
                    </button>
                    <button className="btn" onClick={() => setZoom(1)} title="Restablecer">
                        <RotateCcw size={14} /> <span>100%</span>
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        Zoom: {Math.round(zoom * 100)}%
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="btn" onClick={() => setShowRawDot(!showRawDot)}>
                        {showRawDot ? <Eye size={14} /> : <Code size={14} />}
                        <span>{showRawDot ? 'Ver Gráfico' : 'Ver Código DOT'}</span>
                    </button>
                    <button className="btn" onClick={handleCopy}>
                        <Copy size={14} />
                        <span>{copied ? 'Copiado' : 'Copiar DOT'}</span>
                    </button>
                    <button className="btn btn-primary" onClick={handleDownload} disabled={!svgContent}>
                        <Download size={14} />
                        <span>Descargar SVG</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {showRawDot ? (
                <div className="glass" style={{ flex: 1, padding: '16px', overflowY: 'auto', borderRadius: 'var(--radius-md)' }}>
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#93c5fd' }}>
                        {dotSource}
                    </pre>
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className="glass"
                    style={{
                        flex: 1,
                        minHeight: '480px',
                        overflow: 'auto',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        background: '#070a10',
                        position: 'relative'
                    }}
                >
                    {loading && <p style={{ color: 'var(--text-muted)' }}>Renderizando árbol AST con Graphviz...</p>}
                    {error && <p style={{ color: '#f87171' }}>{error}</p>}
                    {!loading && !error && svgContent && (
                        <div
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.15s ease-out'
                            }}
                            dangerouslySetInnerHTML={{ __html: svgContent }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};
