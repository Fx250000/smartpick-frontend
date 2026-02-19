import { useState, useEffect } from 'react';

// Funções de formatação global (Padrão Rigoroso)
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

export default function MissingReport() {
    const [groupedBacklog, setGroupedBacklog] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [serverError, setServerError] = useState(false);

    // Data para o Relatório Diário (Por defeito: hoje)
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchBacklog = () => {
        setServerError(false);
        fetch('http://localhost:8080/api/reports/missing')
            .then(res => {
                if (!res.ok) throw new Error("Erro no servidor Java");
                return res.json();
            })
            .then(data => {
                setGroupedBacklog(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao carregar faltas:", err);
                setServerError(true);
                setGroupedBacklog({});
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchBacklog();
    }, []);

    const handleResolve = (id, e) => {
        e.preventDefault();
        const form = e.target;
        const qtyReceived = form.elements.qtyReceived.value;

        // Ao resolver, o backend gravará a data/hora para o Lead Time
        fetch(`http://localhost:8080/api/reports/missing/resolve/${id}?qtyReceived=${qtyReceived}`, {
            method: 'POST'
        })
            .then(res => {
                if (res.ok) fetchBacklog();
            });
    };

    const filteredEntries = Object.entries(groupedBacklog).filter(([opd, items]) => {
        const term = searchTerm.toUpperCase();
        if (opd.toUpperCase().includes(term)) return true;
        if (!Array.isArray(items)) return false;

        return items.some(item =>
            (item.productCode && item.productCode.toUpperCase().includes(term)) ||
            (item.description && item.description.toUpperCase().includes(term))
        );
    });

    if (loading) return <main className="main-content"><h2 style={{textAlign: 'center', padding: '4rem'}}>A procurar faltas no armazém...</h2></main>;

    if (serverError) {
        return (
            <main className="main-content">
                <div className="card" style={{textAlign: 'center', padding: '4rem', borderColor: '#ef4444'}}>
                    <h3 style={{color: '#ef4444'}}>Ocorreu um erro ao comunicar com o servidor.</h3>
                    <p>Verifique a consola do seu backend Java.</p>
                    <button className="btn btn-primary" onClick={fetchBacklog}>Tentar Novamente</button>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            {/* Barra de Ações com Filtro e Botão de Impressão Diária */}
            <div className="action-bar" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{fontWeight: 600, color: 'var(--text-dark)'}}>Localizar:</span>
                <input type="text" className="action-input" placeholder="OPD ou Código..."
                       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                <div style={{ flex: 1, minWidth: '20px' }}></div> {/* Espaçador */}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#e2e8f0', padding: '5px 10px', borderRadius: '8px' }}>
                    <span style={{fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem'}}>Relatório Diário:</span>
                    <input type="date" className="action-input" style={{flex: 0, minWidth: '130px', padding: '4px 8px'}}
                           value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                    <a href={`http://localhost:8080/api/pdf/missing/daily?date=${reportDate}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{textDecoration: 'none'}}>
                        🖨️ Imprimir
                    </a>
                </div>
            </div>

            {filteredEntries.length === 0 ? (
                <div className="card" style={{textAlign: 'center', padding: '4rem'}}>
                    <h3 style={{color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Nenhuma peça em falta encontrada.</h3>
                    <p style={{color: '#94a3b8', fontSize: '0.95rem', margin: 0}}>O backlog está vazio ou a busca não obteve resultados.</p>
                </div>
            ) : (
                filteredEntries.map(([opd, items]) => (
                    <div key={opd} className="opd-group card" style={{ padding: 0 }}>
                        <div className="table-header" style={{background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between'}}>
                            <div>
                                <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700}}>OPD:</span>
                                <span style={{fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-dark)', marginLeft: '8px'}}>{formatOpd(opd)}</span>
                                <div style={{fontSize: '0.85rem', color: '#64748b', marginTop: '4px'}}>
                                    ⏱️ Solicitado em: <span style={{fontWeight: 600}}>{items[0] && items[0].timestamp ? new Date(items[0].timestamp).toLocaleString('pt-BR') : 'Data indisponível'}</span>
                                </div>
                            </div>
                            <a href={`http://localhost:8080/api/pdf/missing/${opd}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
                                🖨️ PDF OPD
                            </a>
                        </div>

                        {items[0] && items[0].opdComment && (
                            <div style={{background: '#fffbeb', padding: '10px 20px', borderBottom: '1px solid #fde68a'}}>
                                <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#b45309'}}>⚠️ Observação:</span>
                                <span style={{fontSize: '0.9rem', color: '#92400e', marginLeft: '5px'}}>{items[0].opdComment}</span>
                            </div>
                        )}

                        <div className="table-container">
                            <table>
                                <thead>
                                <tr>
                                    <th className="align-left" style={{width: '20%'}}>Código</th>
                                    <th className="align-left" style={{width: '35%'}}>Descrição</th>
                                    <th className="align-center" style={{width: '10%'}}>Local</th>
                                    <th className="align-center" style={{width: '15%'}}>Status</th>
                                    <th className="align-center" style={{width: '20%'}}>Ação (Receber)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.isArray(items) && items.map(item => (
                                    <tr key={item.id}>
                                        <td className="align-left" style={{fontWeight: 700}}>{formatProductCode(item.productCode)}</td>
                                        <td className="align-left">{item.description}</td>
                                        <td className="align-center" style={{fontWeight: 600}}>{item.zone}</td>
                                        <td className="align-center">
                                            <span className="badge badge-danger">Em Falta</span>
                                        </td>
                                        <td className="align-center">
                                            <form onSubmit={(e) => handleResolve(item.id, e)} style={{display: 'flex', justifyContent: 'center', gap: '5px'}}>
                                                <input type="number" name="qtyReceived" min="1" max={item.quantityMissing} placeholder={`Req: ${item.quantityMissing}`} required style={{width: '70px', padding: '4px'}} />
                                                <button type="submit" className="btn btn-success" style={{padding: '4px 10px'}}>OK</button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </main>
    );
}