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
            })
            .catch(err => {
                console.error("Erro ao carregar relatório:", err);
                setLoading(false);
            });
    }, [selectedDate]);

    // Exportação da Baixa de Turno (CSV)
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

    // NOVO: Exportação das Faltas Pendentes (Excel gerado pelo Java)
    const exportMissingToExcel = () => {
        fetch('http://localhost:8080/api/reports/missing/export')
            .then(response => {
                if (!response.ok) throw new Error("Falha ao gerar o arquivo Excel");
                return response.blob(); // Recebe o arquivo binário do Java
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Formata a data atual para o nome do arquivo
                const today = new Date().toISOString().split('T')[0];
                a.download = `Relatorio_Faltas_Pendentes_${today}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(err => {
                console.error(err);
                alert("Erro ao exportar o relatório de faltas. Verifique se o servidor está ativo.");
            });
    };

    return (
        <main className="main-content">
            <div className="table-header">
                <div>
                    <h2>Central de Relatórios</h2>
                    <p className="subtext">Consolidados diários e pendências da fábrica</p>
                </div>

                <div className="filter-group" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: 600 }}>Data do Turno:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-input"
                        style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px' }}
                    />

                    <div style={{ borderLeft: '2px solid #e2e8f0', height: '30px', margin: '0 10px' }}></div>

                    <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '6px 15px' }}>PDF (Baixa)</button>
                    <button onClick={exportToCSV} className="btn btn-primary" style={{ padding: '6px 15px' }}>CSV (Baixa)</button>

                    {/* Botão de Excel em destaque (Verde) */}
                    <button onClick={exportMissingToExcel} className="btn" style={{ padding: '6px 15px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Excel (Faltas Pendentes)
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Carregando dados...</div>
            ) : (
                <div className="card">
                    <div className="section-title">Movimentações de Baixa (Realizadas)</div>
                    <table className="report-table">
                        <thead>
                        <tr>
                            <th className="align-left">Código</th>
                            <th className="align-left">Descrição</th>
                            <th className="align-center">Zona</th>
                            <th className="align-center">Total p/ Baixa</th>
                        </tr>
                        </thead>
                        <tbody>
                        {report.length > 0 ? report.map((item, i) => (
                            <tr key={i}>
                                <td className="align-left" style={{ fontWeight: 600 }}>{item.code}</td>
                                <td className="align-left">{item.description}</td>
                                <td className="align-center"><span className="badge">{item.zone}</span></td>
                                <td className="align-center" style={{ fontWeight: 'bold' }}>{item.total_out} un</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                    Nenhuma movimentação de baixa encontrada para a data selecionada.
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