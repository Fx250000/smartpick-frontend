import { useState, useEffect, useCallback } from 'react';

// Funções de formatação global
const formatOpd = (raw) => {
    if (!raw) return "";
    const str = String(raw).replace(/\D/g, '');
    if (str.length < 5) return str;
    const year = str.slice(-4);
    const seq = str.slice(0, -4).padStart(6, '0');
    return `${seq}/${year}`;
};

const formatProductCode = (raw) => {
    if (!raw) return "";
    let str = String(raw).trim();
    if (str.length < 13) str = str.padStart(13, '0');
    if (/^\d{13}$/.test(str)) return str.replace(/^(\d{2})(\d{3})(\d{3})(\d{5})$/, '$1.$2.$3.$4');
    return str;
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:8080/api/delivery/history';
            const params = new URLSearchParams();
            if (startDate) params.append('start', startDate);
            if (endDate) params.append('end', endDate);

            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao carregar dashboard');

            const json = await response.json();
            setData(json);
        } catch (error) {
            console.error("Erro no dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !data) return <div className="main-content">Carregando indicadores...</div>;

    return (
        <main className="main-content">
            {/* Barra de Filtros */}
            <div className="action-bar">
                <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Filtrar Período:</span>
                <input type="date" className="action-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>até</span>
                <input type="date" className="action-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
                    {loading ? 'Carregando...' : 'Aplicar Filtro'}
                </button>
            </div>

            {/* KPIs */}
            <div className="card">
                <div className="table-header">
                    <h2>Métricas Globais</h2>
                </div>
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Throughput (OPDs)</div>
                        <div className="kpi-value">{data?.summary?.throughput || 0}</div>
                        <div className="kpi-subtext">Listas finalizadas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Volume Total</div>
                        <div className="kpi-value">{data?.summary?.totalVolume || 0}</div>
                        <div className="kpi-subtext">Peças e Kits movimentados</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Fill Rate Global</div>
                        <div className="kpi-value" style={{ color: 'var(--primary-dark)' }}>{data?.summary?.globalFillRate || "0%"}</div>
                        <div className="kpi-subtext">Eficiência de separação</div>
                    </div>
                </div>
            </div>

            {/* Grid de Tabelas Gerenciais */}
            <div className="split-grid" style={{ padding: 0 }}>

                {/* 1. Curva ABC Peças */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title">Curva ABC: Peças</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr>
                                <th className="align-left">Código</th>
                                <th className="align-left">Descrição</th>
                                <th className="align-center">Volume</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data?.abcCurve?.map((it, i) => (
                                <tr key={i}>
                                    <td className="align-left" style={{ fontWeight: 600 }}>{formatProductCode(it.code)}</td>
                                    <td className="align-left">{it.description}</td>
                                    <td className="align-center">{it.volume} un</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Curva ABC Kits */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title">Curva ABC: Kits</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr>
                                <th className="align-left">Kit</th>
                                <th className="align-left">Descrição</th>
                                <th className="align-center">Volume</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data?.abcKits?.map((it, i) => (
                                <tr key={i}>
                                    <td className="align-left" style={{ fontWeight: 600 }}>{formatProductCode(it.code)}</td>
                                    <td className="align-left">{it.description}</td>
                                    <td className="align-center">{it.volume} un</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Lead Time */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title">Lead Time de Reposição (Horas)</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr>
                                <th className="align-left">Área</th>
                                <th className="align-center">Média (Recebimento)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data?.kanbanLeadTime?.map((it, i) => (
                                <tr key={i}>
                                    <td className="align-left" style={{ fontWeight: 600 }}>{it.zone}</td>
                                    <td className="align-center">{Number(it.avgLeadTime).toFixed(2)}h</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Sugestão Kanban */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title">Sugestão de Estoque Kanban</div>
                    <div className="table-container">
                        <table>
                            <thead>
                            <tr>
                                <th className="align-left">Código</th>
                                <th className="align-center">Consumo</th>
                                <th className="align-center">Sugerido</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data?.kanbanStock?.map((it, i) => (
                                <tr key={i}>
                                    <td className="align-left" style={{ fontWeight: 600 }}>{formatProductCode(it.code)}</td>
                                    <td className="align-center">{it.totalConsumed} un</td>
                                    <td className="align-center" style={{fontWeight: 'bold', color: '#d97706'}}>{it.recommendedKanban} bins</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Histórico Detalhado */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="table-header">
                    <h2>Histórico Operacional Detalhado</h2>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th className="align-left">Data/Hora</th>
                            <th className="align-left">OPD</th>
                            <th className="align-left">Código</th>
                            <th className="align-center">Req.</th>
                            <th className="align-center">Entregue</th>
                            <th className="align-center">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data?.history?.length > 0 ? data.history.map((item) => (
                            <tr key={item.id}>
                                <td className="align-left" style={{ fontSize: '0.9rem' }}>{new Date(item.completionDate).toLocaleString('pt-BR')}</td>
                                <td className="align-left" style={{ fontWeight: 700 }}>{formatOpd(item.opd)}</td>
                                <td className="align-left">{formatProductCode(item.productCode)}</td>
                                <td className="align-center">{item.itemsRequested}</td>
                                <td className="align-center">{item.itemsFound}</td>
                                <td className="align-center">
                                    <span className={`badge ${item.fillRate >= 100 ? 'badge-success' : 'badge-danger'}`}>
                                        {item.status} ({item.fillRate.toFixed(1)}%)
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" className="align-center" style={{ padding: '2rem' }}>Nenhum registro encontrado.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}