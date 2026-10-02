import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, Database, Hash } from 'lucide-react';

export const TablesView = ({ type, data = [] }) => {
    const [search, setSearch] = useState('');

    const filteredData = data.filter(item => {
        if (!search) return true;
        const s = search.toLowerCase();
        return Object.values(item).some(val => String(val).toLowerCase().includes(s));
    });

    if (type === 'errors') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Total de errores registrados: <strong>{data.length}</strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', border: '1px solid var(--border-subtle)' }}>
                        <Search size={14} color="var(--text-muted)" style={{ marginRight: '6px' }} />
                        <input
                            type="text"
                            placeholder="Buscar en errores..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                        />
                    </div>
                </div>

                {data.length === 0 ? (
                    <div className="glass" style={{ padding: '30px', textAlign: 'center', color: '#34d399', borderRadius: 'var(--radius-md)' }}>
                        <CheckCircle size={32} style={{ marginBottom: '8px' }} />
                        <p style={{ fontWeight: 600 }}>¡No se detectaron errores en el código analizado!</p>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>El archivo cumple con las reglas léxicas, sintácticas y semánticas.</span>
                    </div>
                ) : (
                    <div className="glass" style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Tipo</th>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th>Línea</th>
                                    <th>Columna</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((err, i) => (
                                    <tr key={i}>
                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: err.type === 'Semántico' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: err.type === 'Semántico' ? '#fde047' : '#f87171'
                                            }}>
                                                {err.type}
                                            </span>
                                        </td>
                                        <td style={{ color: '#60a5fa', fontWeight: 600 }}>{err.code}</td>
                                        <td style={{ color: '#f8fafc', whiteSpace: 'pre-line' }}>{err.description}</td>
                                        <td style={{ color: '#38bdf8' }}>{err.line}</td>
                                        <td style={{ color: '#38bdf8' }}>{err.column}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    if (type === 'tokens') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Total de tokens reconocidos: <strong>{data.length}</strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', border: '1px solid var(--border-subtle)' }}>
                        <Search size={14} color="var(--text-muted)" style={{ marginRight: '6px' }} />
                        <input
                            type="text"
                            placeholder="Buscar token..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                        />
                    </div>
                </div>

                <div className="glass" style={{ overflowX: 'auto', maxHeight: '550px', borderRadius: 'var(--radius-md)' }}>
                    <table className="data-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th>#</th>
                                <th>Lexema</th>
                                <th>Tipo de Token</th>
                                <th>Línea</th>
                                <th>Columna</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((tok, i) => (
                                <tr key={i}>
                                    <td style={{ color: 'var(--text-muted)' }}>{tok.id || i + 1}</td>
                                    <td style={{ color: '#34d399', fontWeight: 600 }}>
                                        {tok.lexeme === '\n' ? '\\n' : tok.lexeme || '<EOF>'}
                                    </td>
                                    <td>
                                        <span style={{ padding: '2px 6px', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', borderRadius: '4px' }}>
                                            {tok.type}
                                        </span>
                                    </td>
                                    <td>{tok.line}</td>
                                    <td>{tok.column}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (type === 'symbols') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Total de símbolos en tabla: <strong>{data.length}</strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', border: '1px solid var(--border-subtle)' }}>
                        <Search size={14} color="var(--text-muted)" style={{ marginRight: '6px' }} />
                        <input
                            type="text"
                            placeholder="Buscar en símbolos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                        />
                    </div>
                </div>

                <div className="glass" style={{ overflowX: 'auto', maxHeight: '550px', borderRadius: 'var(--radius-md)' }}>
                    <table className="data-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th>#</th>
                                <th>Identificador</th>
                                <th>Categoría</th>
                                <th>Tipo</th>
                                <th>Ámbito</th>
                                <th>Valor / Estado</th>
                                <th>Línea</th>
                                <th>Columna</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((sym, i) => (
                                <tr key={i}>
                                    <td style={{ color: 'var(--text-muted)' }}>{sym.id || i + 1}</td>
                                    <td style={{ color: '#60a5fa', fontWeight: 700 }}>{sym.name}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            background: sym.category === 'recurso' ? 'rgba(16, 185, 129, 0.15)' :
                                                        sym.category === 'función' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                            color: sym.category === 'recurso' ? '#34d399' :
                                                   sym.category === 'función' ? '#c084fc' : '#93c5fd'
                                        }}>
                                            {sym.category}
                                        </span>
                                    </td>
                                    <td style={{ color: '#fbbf24' }}>{sym.type}</td>
                                    <td style={{ color: '#a5b4fc' }}>{sym.scope}</td>
                                    <td style={{ color: '#f8fafc', fontWeight: 600 }}>{sym.value}</td>
                                    <td>{sym.line}</td>
                                    <td>{sym.column}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return null;
};
