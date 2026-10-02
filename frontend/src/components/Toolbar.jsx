import React, { useRef } from 'react';
import { Play, FilePlus, FolderOpen, Save, Trash2, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { PRESETS } from '../examples/presets';

export const Toolbar = ({
    onExecute,
    onNewFile,
    onOpenFile,
    onSaveFile,
    onClear,
    onSelectPreset,
    loading,
    backendStatus
}) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            onOpenFile(event.target.result, file.name);
        };
        reader.readAsText(file);
    };

    return (
        <header className="glass-header" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            {/* Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
                }}>
                    <Server size={20} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        AutoInfra <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>OLC1 - P2</span>
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Lenguaje para simulación y automatización de infraestructura</p>
                </div>
            </div>

            {/* Presets and Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".infra,.txt"
                    style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '8px' }}>Ejemplos:</span>
                    <select
                        onChange={(e) => onSelectPreset(e.target.value)}
                        defaultValue="basico"
                        style={{
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            border: 'none',
                            fontSize: '0.85rem',
                            outline: 'none',
                            cursor: 'pointer',
                            padding: '4px 0'
                        }}
                    >
                        <option value="basico" style={{ background: '#111827' }}>1. Básico (web + frontend)</option>
                        <option value="intermedio" style={{ background: '#111827' }}>2. Intermedio (packages + while)</option>
                        <option value="avanzado" style={{ background: '#111827' }}>3. Avanzado (db + for + recursión)</option>
                        <option value="errores" style={{ background: '#111827' }}>4. Errores Obligatorios</option>
                    </select>
                </div>

                <button className="btn" onClick={onNewFile} title="Nuevo archivo .infra">
                    <FilePlus size={16} />
                    <span>Nuevo</span>
                </button>

                <button className="btn" onClick={() => fileInputRef.current?.click()} title="Abrir archivo .infra">
                    <FolderOpen size={16} />
                    <span>Abrir</span>
                </button>

                <button className="btn" onClick={onSaveFile} title="Guardar archivo">
                    <Save size={16} />
                    <span>Guardar</span>
                </button>

                <button className="btn btn-danger" onClick={onClear} title="Limpiar ejecución y reportes">
                    <Trash2 size={16} />
                    <span>Limpiar</span>
                </button>

                <button
                    className="btn btn-success"
                    onClick={onExecute}
                    disabled={loading}
                    style={{ padding: '8px 20px', fontWeight: 600 }}
                >
                    <Play size={16} fill="white" />
                    <span>{loading ? 'Ejecutando...' : 'Ejecutar'}</span>
                </button>
            </div>

            {/* Backend Health Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                {backendStatus === 'ok' ? (
                    <span className="badge badge-running" style={{ textTransform: 'none' }}>
                        <CheckCircle2 size={12} /> Backend Conectado (:8080)
                    </span>
                ) : (
                    <span className="badge badge-stopped" style={{ textTransform: 'none' }}>
                        <AlertCircle size={12} /> Backend Desconectado
                    </span>
                )}
            </div>
        </header>
    );
};
