import React from 'react';
import { Server, Database, Layers, Cpu, HardDrive, Package, Activity, ArrowRight, ShieldCheck } from 'lucide-react';

export const InfrastructureView = ({ infrastructure }) => {
    if (!infrastructure) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No hay infraestructura ejecutada todavía. Presiona <strong>Ejecutar</strong> para simular el entorno.</p>
            </div>
        );
    }

    const { servers = [], services = [], databases = [], connections = [] } = infrastructure;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'running':
                return (
                    <span className="badge badge-running">
                        <span className="pulse-indicator pulse-running" /> running
                    </span>
                );
            case 'stopped':
                return (
                    <span className="badge badge-stopped">
                        <span className="pulse-indicator pulse-stopped" /> stopped
                    </span>
                );
            case 'degraded':
                return (
                    <span className="badge badge-degraded">
                        <span className="pulse-indicator" style={{ background: '#f59e0b' }} /> degraded
                    </span>
                );
            case 'undeployed':
            default:
                return (
                    <span className="badge badge-undeployed">
                        <span className="pulse-indicator pulse-undeployed" /> {status || 'undeployed'}
                    </span>
                );
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px' }}>
            {/* SERVERS */}
            <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Server size={18} color="#3b82f6" /> Servidores ({servers.length})
                </h3>
                {servers.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay servidores declarados.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {servers.map((s, idx) => (
                            <div key={idx} className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#60a5fa' }}>{s.name}</span>
                                    {getStatusBadge(s.status)}
                                </div>
                                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Cpu size={14} /> <span>CPU: <strong>{s.cpu} cores</strong> | RAM: <strong>{s.memory} GB</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <HardDrive size={14} /> <span>Disco: <strong>{s.disk} GB</strong> | OS: <strong>{s.os}</strong></span>
                                    </div>
                                    <div style={{ marginTop: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <Package size={14} /> Paquetes ({s.packages ? s.packages.length : 0}):
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {s.packages && s.packages.length > 0 ? (
                                                s.packages.map((pkg, i) => (
                                                    <span key={i} style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                        {pkg}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ninguno instalado</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SERVICES */}
            <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Layers size={18} color="#a855f7" /> Servicios ({services.length})
                </h3>
                {services.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay servicios declarados.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {services.map((srv, idx) => (
                            <div key={idx} className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#c084fc' }}>{srv.name}</span>
                                    {getStatusBadge(srv.status)}
                                </div>
                                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                                    <div>Puerto: <strong>:{srv.port}</strong> | Réplicas: <strong style={{ color: '#34d399' }}>{srv.replicas}</strong></div>
                                    <div>Host asignado: {srv.host ? <strong style={{ color: '#60a5fa' }}>{srv.host}</strong> : <span style={{ color: 'var(--text-muted)' }}>No desplegado</span>}</div>
                                    {srv.dependsOn && srv.dependsOn.length > 0 && (
                                        <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Depende de: </span>
                                            {srv.dependsOn.map((d, i) => (
                                                <span key={i} style={{ padding: '2px 6px', background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', borderRadius: '4px', marginLeft: '4px' }}>
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DATABASES */}
            <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Database size={18} color="#10b981" /> Bases de Datos ({databases.length})
                </h3>
                {databases.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay bases de datos declaradas.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {databases.map((db, idx) => (
                            <div key={idx} className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#34d399' }}>{db.name}</span>
                                    {getStatusBadge(db.status)}
                                </div>
                                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                                    <div>Motor: <strong style={{ color: '#f8fafc' }}>{db.engine}</strong> (v{db.version})</div>
                                    <div>Puerto de escucha: <strong>:{db.port}</strong></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* LOGICAL CONNECTIONS */}
            {connections && connections.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Activity size={18} color="#06b6d4" /> Conexiones Lógicas ({connections.length})
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {connections.map((c, i) => (
                            <div key={i} className="glass" style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                <strong style={{ color: '#60a5fa' }}>{c.from}</strong>
                                <ArrowRight size={14} color="var(--text-muted)" />
                                <strong style={{ color: '#34d399' }}>{c.to}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
