import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { CodeEditor } from './components/CodeEditor';
import { ConsolePanel } from './components/ConsolePanel';
import { InfrastructureView } from './components/InfrastructureView';
import { AstViewer } from './components/AstViewer';
import { TablesView } from './components/TablesView';
import { apiService } from './services/api';
import { PRESETS } from './examples/presets';
import {
    Terminal,
    Server,
    GitCommit,
    Table,
    AlertOctagon,
    Binary,
    CheckCircle2,
    XCircle
} from 'lucide-react';

export function App() {
    const [code, setCode] = useState(PRESETS.basico);
    const [fileName, setFileName] = useState('script.infra');
    const [activeTab, setActiveTab] = useState('infra'); // infra, console, ast, tokens, symbols, errors
    const [loading, setLoading] = useState(false);
    const [backendStatus, setBackendStatus] = useState('checking');
    
    // Resultados de la ejecución
    const [result, setResult] = useState(null);
    const [lastExecutionSuccess, setLastExecutionSuccess] = useState(null);

    // Verificar salud del backend al montar el componente
    useEffect(() => {
        const checkBackend = async () => {
            const health = await apiService.checkHealth();
            setBackendStatus(health.status === 'ok' ? 'ok' : 'error');
        };
        checkBackend();
        const interval = setInterval(checkBackend, 10000);
        return () => clearInterval(interval);
    }, []);

    // Atajo de teclado: Ctrl + Enter para ejecutar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleExecute();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [code]);

    const handleExecute = async () => {
        setLoading(true);
        try {
            const data = await apiService.executeCode(code);
            setResult(data);
            setLastExecutionSuccess(data.success);

            // Si hay errores, sugerir pestaña de errores; si no, mostrar la infraestructura
            if (!data.success && data.errors && data.errors.length > 0) {
                setActiveTab('errors');
            } else if (activeTab === 'errors') {
                setActiveTab('infra');
            }
        } catch (err) {
            console.error('Error al ejecutar:', err);
            setLastExecutionSuccess(false);
            setResult({
                success: false,
                console: [`[ERROR] Falló la comunicación con el servidor backend: ${err.message}`],
                errors: [{
                    type: 'Ejecución',
                    code: 'NET-001',
                    description: err.message,
                    line: 1,
                    column: 1
                }]
            });
            setActiveTab('console');
        } finally {
            setLoading(false);
        }
    };

    const handleNewFile = () => {
        if (window.confirm('¿Deseas crear un nuevo archivo? Los cambios no guardados se perderán.')) {
            setCode('// Nuevo archivo AutoInfra\nserver backend {\n    cpu = 2;\n    memory = 4;\n    disk = 50;\n    os = "ubuntu";\n}\n\nmain {\n    start(backend);\n    print("Servidor iniciado");\n}\n');
            setFileName('nuevo.infra');
            setResult(null);
            setLastExecutionSuccess(null);
        }
    };

    const handleOpenFile = (content, name) => {
        setCode(content);
        setFileName(name);
        setResult(null);
        setLastExecutionSuccess(null);
    };

    const handleSaveFile = () => {
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.endsWith('.infra') ? fileName : `${fileName}.infra`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setResult(null);
        setLastExecutionSuccess(null);
    };

    const handleSelectPreset = (presetKey) => {
        if (PRESETS[presetKey]) {
            setCode(PRESETS[presetKey]);
            setFileName(`${presetKey}.infra`);
            setResult(null);
            setLastExecutionSuccess(null);
        }
    };

    const errorCount = result?.errors?.length || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-main)' }}>
            {/* Barra superior */}
            <Toolbar
                onExecute={handleExecute}
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onSaveFile={handleSaveFile}
                onClear={handleClear}
                onSelectPreset={handleSelectPreset}
                loading={loading}
                backendStatus={backendStatus}
            />

            {/* Contenedor Principal (Layout dividido de 2 paneles) */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '12px', gap: '12px' }}>
                {/* PANEL IZQUIERDO: EDITOR DE CÓDIGO */}
                <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Archivo: <strong style={{ color: '#60a5fa' }}>{fileName}</strong>
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Ctrl + Enter para ejecutar)</span>
                        </div>

                        {lastExecutionSuccess !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                {lastExecutionSuccess ? (
                                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={14} /> Ejecución Exitosa
                                    </span>
                                ) : (
                                    <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <XCircle size={14} /> Con Errores ({errorCount})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <CodeEditor code={code} onChange={(val) => setCode(val || '')} />
                    </div>
                </div>

                {/* PANEL DERECHO: PESTAÑAS DE SALIDA, REPORTES E INFRAESTRUCTURA */}
                <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '420px' }}>
                    {/* Barra de pestañas */}
                    <div className="glass" style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
                        <button
                            className={`tab-btn ${activeTab === 'infra' ? 'active' : ''}`}
                            onClick={() => setActiveTab('infra')}
                        >
                            <Server size={15} />
                            <span>Infraestructura</span>
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
                            onClick={() => setActiveTab('console')}
                        >
                            <Terminal size={15} />
                            <span>Consola</span>
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'ast' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ast')}
                        >
                            <GitCommit size={15} />
                            <span>AST Gráfico</span>
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'tokens' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tokens')}
                        >
                            <Binary size={15} />
                            <span>Tokens</span>
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'symbols' ? 'active' : ''}`}
                            onClick={() => setActiveTab('symbols')}
                        >
                            <Table size={15} />
                            <span>Símbolos</span>
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'errors' ? 'active' : ''}`}
                            onClick={() => setActiveTab('errors')}
                        >
                            <AlertOctagon size={15} color={errorCount > 0 ? '#ef4444' : undefined} />
                            <span>Errores {errorCount > 0 && `(${errorCount})`}</span>
                        </button>
                    </div>

                    {/* Contenido de la pestaña activa */}
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        {activeTab === 'infra' && (
                            <div className="glass" style={{ minHeight: '100%', borderRadius: 'var(--radius-md)', overflowY: 'auto' }}>
                                <InfrastructureView infrastructure={result?.infrastructure} />
                            </div>
                        )}

                        {activeTab === 'console' && (
                            <ConsolePanel lines={result?.console || []} />
                        )}

                        {activeTab === 'ast' && (
                            <div className="glass" style={{ height: '100%', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                                <AstViewer dotSource={result?.astDot} />
                            </div>
                        )}

                        {activeTab === 'tokens' && (
                            <TablesView type="tokens" data={result?.tokens || []} />
                        )}

                        {activeTab === 'symbols' && (
                            <TablesView type="symbols" data={result?.symbols || []} />
                        )}

                        {activeTab === 'errors' && (
                            <TablesView type="errors" data={result?.errors || []} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
