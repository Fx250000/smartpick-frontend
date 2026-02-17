import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8080/api/delivery/history')
            .then(res => res.json())
            .then(json => setData(json));
    }, []);

    if (!data) return <div className="main-content">Carregando...</div>;

    return (
        <main className="main-content">
            {/* KPI Section */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Throughput</div>
                    <div className="kpi-value">{data.summary.throughput}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Volume Total</div>
                    <div className="kpi-value">{data.summary.totalVolume}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Fill Rate Global</div>
                    <div className="kpi-value">{data.summary.globalFillRate}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                {/* Curva ABC Table */}
                <div className="card">
                    <h3>Curva ABC (Top 10 Produtos)</h3>
                    <table>
                        <thead>
                        <tr><th>Código</th><th>Volume</th><th>Zona</th></tr>
                        </thead>
                        <tbody>
                        {data.abcCurve.map((item, i) => (
                            <tr key={i}>
                                <td>{item.code}</td>
                                <td>{item.volume} un</td>
                                <td>{item.zone}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* Lead Time Kanban */}
                <div className="card">
                    <h3>Lead Time por Zona (Horas)</h3>
                    <table>
                        <thead>
                        <tr><th>Zona</th><th>Produto</th><th>Média Lead Time</th></tr>
                        </thead>
                        <tbody>
                        {data.kanban.map((item, i) => (
                            <tr key={i}>
                                <td>{item.zone}</td>
                                <td>{item.code}</td>
                                <td>{parseFloat(item.avgleadtime).toFixed(2)}h</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}