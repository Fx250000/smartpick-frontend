import { useState, useEffect, useCallback } from 'react';

export default function DeliveryHistory() {
    const [metrics, setMetrics] = useState({
        throughput: 0,
        totalVolume: 0,
        globalFillRate: "0%"
    });
    const [history, setHistory] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:8080/api/delivery/history';
            const params = new URLSearchParams();
            if (startDate) params.append('start', startDate);
            if (endDate) params.append('end', endDate);

            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao carregar histórico');

            const data = await response.json();
            setMetrics({
                throughput: data.throughput,
                totalVolume: data.totalVolume,
                globalFillRate: data.globalFillRate
            });
            setHistory(data.history);
        } catch (error) {
            console.error("Erro no dashboard:", error);
            alert("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // Carregar dados ao montar o componente
    useEffect(() => {
        fetchData();
    }, []);

    return (
        <main className="main-content">
            <div className="action-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Período:</span>
                <input
                    type="date"
                    className="action-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ flex: 0, minWidth: '140px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>até</span>
                <input
                    type="date"
                    className="action-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ flex: 0, minWidth: '140px' }}
                />
                <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
                    {loading ? 'Carregando...' : 'Aplicar Filtro'}
                </button>
            </div>

            <div className="card">
                <div className="table-header">
                    <h2>Métricas de Produtividade (WMS)</h2>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Throughput (OPDs Processadas)</div>
                        <div className="kpi-value">{metrics.throughput}</div>
                        <div className="kpi-subtext">Total de listas finalizadas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Volume Movimentado</div>
                        <div className="kpi-value">{metrics.totalVolume}</div>
                        <div className="kpi-subtext">Peças físicas separadas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Fill Rate Global</div>
                        <div className="kpi-value" style={{ color: 'var(--primary-dark)' }}>
                            {metrics.globalFillRate}
                        </div>
                        <div className="kpi-subtext">Eficiência no 1º atendimento</div>
                    </div>
                </div>

                <div className="separator"></div>
                <div className="section-title">Rastreabilidade de Entregas</div>

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
                        </tr>
                        </thead>
                        <tbody>
                        {history.length > 0 ? history.map((item) => (
                            <tr key={item.id}>
                                <td className="align-left" style={{ fontSize: '0.9rem' }}>
                                    {new Date(item.completionDate).toLocaleString('pt-BR')}
                                </td>
                                <td className="align-left" style={{ fontWeight: 700 }}>{item.opd}</td>
                                <td className="align-center">{item.itemsRequested} un</td>
                                <td className="align-center">{item.itemsFound} un</td>
                                <td className="align-center">
                                        <span style={{ fontWeight: 'bold', color: item.fillRate >= 100 ? '#16a34a' : '#d97706' }}>
                                            {item.fillRate.toFixed(1)}%
                                        </span>
                                </td>
                                <td className="align-center">
                                        <span className={`badge ${item.status === 'Completa' ? 'badge-success' : 'badge-danger'}`}>
                                            {item.status}
                                        </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                    Nenhum registro encontrado no período selecionado.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}