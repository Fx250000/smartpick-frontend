import { useState } from 'react';

export default function DeliveryHistory() {
    // DADOS SIMULADOS (Mock) - Substituiremos pelo Fetch ao Spring Boot no próximo passo
    const [mockMetrics] = useState({
        throughput: 42,
        totalVolume: 8450,
        globalFillRate: "96.5%"
    });

    const [mockHistory] = useState([
        { opd: "OPD-9001", date: "17/02/2026 14:15", req: 120, found: 120, fillRate: "100%", status: "Completa" },
        { opd: "OPD-9002", date: "17/02/2026 11:30", req: 300, found: 285, fillRate: "95%", status: "Com Faltas" },
        { opd: "OPD-9003", date: "16/02/2026 16:45", req: 50, found: 48, fillRate: "96%", status: "Com Faltas" },
        { opd: "OPD-9004", date: "16/02/2026 09:20", req: 400, found: 400, fillRate: "100%", status: "Completa" }
    ]);

    return (
        <main className="main-content">
            {/* BARRA DE FILTROS */}
            <div className="action-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Período:</span>
                <input type="date" className="action-input" style={{ flex: 0, minWidth: '140px' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>até</span>
                <input type="date" className="action-input" style={{ flex: 0, minWidth: '140px' }} />
                <button className="btn btn-primary">Aplicar Filtro</button>
            </div>

            <div className="card">
                <div className="table-header">
                    <h2>Métricas de Produtividade (WMS)</h2>
                </div>

                {/* KPIs DA INDÚSTRIA */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Throughput (OPDs Processadas)</div>
                        <div className="kpi-value" style={{ color: 'var(--text-dark)' }}>{mockMetrics.throughput}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>Total de listas finalizadas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Volume Movimentado</div>
                        <div className="kpi-value" style={{ color: 'var(--text-dark)' }}>{mockMetrics.totalVolume}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>Peças físicas separadas</div>
                    </div>
                    <div className="kpi-card" style={{ background: mockMetrics.globalFillRate === "100%" ? 'var(--success-bg)' : '#f8fafc' }}>
                        <div className="kpi-label">Fill Rate Global (Nível de Serviço)</div>
                        <div className="kpi-value" style={{ color: mockMetrics.globalFillRate === "100%" ? 'var(--success)' : 'var(--primary-dark)' }}>
                            {mockMetrics.globalFillRate}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>Eficiência no 1º atendimento</div>
                    </div>
                </div>

                <div className="separator"></div>
                <div className="section-title">Rastreabilidade de Entregas</div>

                {/* TABELA DE HISTÓRICO */}
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th className="align-left">Data/Hora Finalização</th>
                            <th className="align-left">OPD</th>
                            <th className="align-center">Requisitado</th>
                            <th className="align-center">Entregue</th>
                            <th className="align-center">Fill Rate (OPD)</th>
                            <th className="align-center">Status Operacional</th>
                            <th className="align-center">Ações</th>
                        </tr>
                        </thead>
                        <tbody>
                        {mockHistory.map((item, index) => (
                            <tr key={index}>
                                <td className="align-left" style={{ color: '#64748b', fontSize: '0.9rem' }}>{item.date}</td>
                                <td className="align-left" style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{item.opd}</td>
                                <td className="align-center">{item.req} un</td>
                                <td className="align-center" style={{ fontWeight: 600 }}>{item.found} un</td>
                                <td className="align-center">
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: item.fillRate === "100%" ? 'var(--success)' : '#d97706'
                                        }}>
                                            {item.fillRate}
                                        </span>
                                </td>
                                <td className="align-center">
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                                            background: item.status === "Completa" ? '#dcfce7' : '#fee2e2',
                                            color: item.status === "Completa" ? '#16a34a' : '#b91c1c'
                                        }}>
                                            {item.status}
                                        </span>
                                </td>
                                <td className="align-center">
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>Ver Detalhes</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}