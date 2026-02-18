import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [currentQueue, setCurrentQueue] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAllData() {
            try {
                // 1. Busca Métricas, ABC e Kanban
                const historyRes = await fetch('http://localhost:8080/api/delivery/history');
                if (!historyRes.ok) throw new Error("Erro ao buscar histórico");
                const historyData = await historyRes.json();
                setData(historyData);

                // 2. Busca Status Operacional Atual
                const queueRes = await fetch('http://localhost:8080/api/picking/current');
                const queueData = await queueRes.json();
                setCurrentQueue(Array.isArray(queueData) ? queueData.length : 0);
            } catch (error) {
                console.error("Erro no carregamento do Dashboard:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAllData();
    }, []);

    if (loading) return <div className="main-content">Carregando indicadores...</div>;

    return (
        <main className="main-content">
            <div className="table-header">
                <h2>Painel de Inteligência Logística</h2>
            </div>

            {/* SEÇÃO 1: KPIs CONSOLIDADOS */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Throughput (OPDs)</div>
                    <div className="kpi-value">{data?.summary?.throughput || 0}</div>
                    <div className="kpi-subtext">Total no período</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Volume de Peças</div>
                    <div className="kpi-value">{data?.summary?.totalVolume || 0}</div>
                    <div className="kpi-subtext">Itens físicos movimentados</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Fill Rate Global</div>
                    <div className="kpi-value" style={{ color: 'var(--primary-dark)' }}>
                        {data?.summary?.globalFillRate || "0.0%"}
                    </div>
                    <div className="kpi-subtext">Nível de atendimento</div>
                </div>
                <div className="kpi-card" onClick={() => navigate('/')} style={{ cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}>
                    <div className="kpi-label">Status Operacional</div>
                    <div className="kpi-value">{currentQueue}</div>
                    <div className="kpi-subtext">Itens em fila de separação</div>
                </div>
            </div>

            {/* SEÇÃO 2: CURVAS ABC (PEÇAS E KITS) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div className="card">
                    <div className="section-title">Curva ABC: Peças Individuais</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr><th>Código</th><th>Volume</th><th>Zona</th></tr>
                            </thead>
                            <tbody>
                            {(data?.abcCurve || []).map((item, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 700 }}>{item.code}</td>
                                    <td>{item.volume} un</td>
                                    <td><span className="badge">{item.zone}</span></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="section-title">Curva ABC: Kits de Montagem</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr><th>Código do Kit</th><th>Volume</th><th>Descrição</th></tr>
                            </thead>
                            <tbody>
                            {(data?.abcKits || []).map((item, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{item.code}</td>
                                    <td>{item.volume} kits</td>
                                    <td style={{ fontSize: '0.85rem' }}>{item.description}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 3: KANBAN E LEAD TIME */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div className="card">
                    <div className="section-title">Lead Time Médio por Zona (Horas)</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr><th>Zona</th><th>Referência</th><th>Tempo Médio</th></tr>
                            </thead>
                            <tbody>
                            {(data?.kanban || []).map((item, i) => (
                                <tr key={i}>
                                    <td><strong>{item.zone}</strong></td>
                                    <td>{item.code}</td>
                                    <td>{parseFloat(item.avgLeadTime || 0).toFixed(2)}h</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid #d97706' }}>
                    <div className="section-title">Sugestão de Estoque Kanban</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr><th>Código</th><th>Consumo 30d</th><th>Estoque Sugerido</th></tr>
                            </thead>
                            <tbody>
                            {(data?.kanbanStock || []).map((item, i) => (
                                <tr key={i}>
                                    <td>{item.code}</td>
                                    <td>{item.totalConsumed} un</td>
                                    <td style={{ fontWeight: 800, color: '#d97706' }}>
                                        {item.recommendedKanban} un/bins
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}