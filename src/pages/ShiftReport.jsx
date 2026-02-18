import { useState, useEffect } from 'react';

export default function ShiftReport() {
    const [report, setReport] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`http://localhost:8080/api/delivery/shift-report?date=${selectedDate}`)
            .then(res => res.json())
            .then(data => {
                setReport(data);
                setLoading(false);
            });
    }, [selectedDate]); // Recarrega sempre que a data mudar

    const exportToCSV = () => {
        const headers = "Codigo,Descricao,Zona,Quantidade\n";
        const rows = report.map(i => `${i.code},${i.description},${i.zone},${i.total_out}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baixa_estoque_${selectedDate}.csv`;
        a.click();
    };

    return (
        <main className="main-content">
            <div className="table-header">
                <div>
                    <h2>Relatório de Baixa</h2>
                    <p className="subtext">Consolidado de movimentações por dia</p>
                </div>

                <div className="filter-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <label>Data do Turno:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-input"
                    />
                    <button onClick={() => window.print()} className="btn-secondary">PDF</button>
                    <button onClick={exportToCSV} className="btn-primary">CSV</button>
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Carregando dados...</div>
            ) : (
                <div className="card">
                    <table className="report-table">
                        <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Zona</th>
                            <th style={{ textAlign: 'center' }}>Total p/ Baixa</th>
                        </tr>
                        </thead>
                        <tbody>
                        {report.length > 0 ? report.map((item, i) => (
                            <tr key={i}>
                                <td><strong>{item.code}</strong></td>
                                <td>{item.description}</td>
                                <td><span className="badge">{item.zone}</span></td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.total_out} un</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                                    Nenhuma movimentação encontrada para esta data.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}