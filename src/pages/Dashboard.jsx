import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Faz o fetch (pedido HTTP) à API do Spring Boot
        fetch('http://localhost:8080/api/dashboard')
            .then(response => response.json())
            .then(json => {
                setData(json);
                setLoading(false); // Desliga o ecrã de carregamento
            })
            .catch(error => console.error("Erro ao buscar dados do Spring:", error));
    }, []);

    // Enquanto o Java pensa, mostramos isto:
    if (loading) {
        return <main className="main-content"><h2 style={{textAlign: 'center', marginTop: '50px'}}>Calculando Métricas Kanban...</h2></main>;
    }

    // Quando o JSON chega, montamos o HTML dinamicamente
    return (
        <main className="main-content">
            <div className="card">
                <div className="table-header">
                    <h2>Métricas para Dimensionamento Kanban</h2>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Lead Time Médio (Global)</div>
                        <div className="kpi-value">{data.avgLeadTime}</div>
                        <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '5px'}}>Média de todo o histórico</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Ciclos Resolvidos</div>
                        <div className="kpi-value">{data.resolvedCount}</div>
                        <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '5px'}}>Amostragem processada</div>
                    </div>
                </div>

                <div className="separator"></div>

                <div className="section-title">Curva ABC - Demanda de Peças (React Render)</div>
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th className="align-left">Código do Produto</th>
                            <th className="align-left">Descrição</th>
                            <th className="align-center">Local (Zona)</th>
                            <th className="align-center">Volume Consumido</th>
                        </tr>
                        </thead>
                        <tbody>
                        {/* O Map substitui o th:each do Thymeleaf */}
                        {data.abcData && data.abcData.length > 0 ? (
                            data.abcData.map((row, index) => (
                                <tr key={index}>
                                    <td className="align-left" style={{fontWeight: 600}}>{row[0]}</td>
                                    <td className="align-left">{row[1]}</td>
                                    <td className="align-center">{row[2]}</td>
                                    <td className="align-center" style={{fontWeight: 700}}>{row[3]}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{textAlign: 'center', padding: '3rem', color: '#64748b'}}>Nenhum histórico registrado.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}