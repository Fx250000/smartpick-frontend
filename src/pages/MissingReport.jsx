import { useState, useEffect } from 'react';

export default function MissingReport() {
    const [groupedBacklog, setGroupedBacklog] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [serverError, setServerError] = useState(false); // NOVO: Estado de erro

    const fetchBacklog = () => {
        setServerError(false);
        fetch('http://localhost:8080/api/reports/missing')
            .then(res => {
                if (!res.ok) throw new Error("Erro no servidor Java"); // Proteção
                return res.json();
            })
            .then(data => {
                setGroupedBacklog(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao carregar faltas:", err);
                setServerError(true);
                setGroupedBacklog({}); // Evita o crash
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
        // Protege contra items inválidos (se não for array)
        if (!Array.isArray(items)) return false;

        return items.some(item =>
            (item.productCode && item.productCode.toUpperCase().includes(term)) ||
            (item.description && item.description.toUpperCase().includes(term))
        );
    });

    if (loading) return <main className="main-content"><h2 style={{textAlign: 'center', padding: '4rem'}}>A procurar faltas no armazém...</h2></main>;

    // SE O JAVA DEU ERRO 500, MOSTRA ISTO EM VEZ DE ECRÃ BRANCO
    if (serverError) {
        return (
            <main className="main-content">
                <div className="card" style={{textAlign: 'center', padding: '4rem', borderColor: '#ef4444'}}>
                    <h3 style={{color: '#ef4444'}}>Ocorreu um erro ao comunicar com o servidor (Spring Boot).</h3>
                    <p>Verifique a consola do seu backend Java para diagnosticar o erro 500.</p>
                    <button className="btn btn-primary" onClick={fetchBacklog}>Tentar Novamente</button>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            <div className="action-bar">
                <span style={{fontWeight: 600, color: 'var(--text-dark)'}}>Localizar:</span>
                <input type="text" className="action-input" placeholder="Digite número da OPD ou código da peça..."
                       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <span style={{color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 'auto'}}>Filtro rápido em tempo real</span>
            </div>

            {filteredEntries.length === 0 ? (
                <div className="card" style={{textAlign: 'center', padding: '4rem'}}>
                    <h3 style={{color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Nenhuma peça em falta encontrada.</h3>
                    <p style={{color: '#94a3b8', fontSize: '0.95rem', margin: 0}}>O backlog está vazio ou a busca não obteve resultados.</p>
                </div>
            ) : (
                filteredEntries.map(([opd, items]) => (
                    <div key={opd} className="opd-group">
                        <div className="opd-header" style={{background: '#f1f5f9', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                                <div>
                                    <div>
                                        <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700}}>OPD:</span>
                                        <span style={{fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginLeft: '6px'}}>{opd}</span>
                                    </div>
                                    <div style={{fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px'}}>
                                        ⏱️ Registrado em: <span>{items[0] && items[0].timestamp ? new Date(items[0].timestamp).toLocaleString() : 'Data indisponível'}</span>
                                    </div>
                                </div>
                                <a href={`http://localhost:8080/api/pdf/missing/${opd}`} className="btn-secondary" style={{fontSize: '0.9rem', textDecoration: 'none'}}>
                                    🖨️ PDF de Faltas
                                </a>
                            </div>

                            {items[0] && items[0].opdComment && (
                                <div style={{background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '10px 15px', borderRadius: '6px'}}>
                                    <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase'}}>⚠️ Obs:</span>
                                    <span style={{fontSize: '0.95rem', color: '#78350f', marginLeft: '5px'}}>{items[0].opdComment}</span>
                                </div>
                            )}
                        </div>

                        <div className="table-container" style={{border: 'none', borderRadius: 0}}>
                            <table style={{margin: 0}}>
                                <thead>
                                <tr>
                                    <th style={{width: '15%'}}>Código</th>
                                    <th style={{width: '35%'}}>Descrição</th>
                                    <th style={{width: '10%'}} className="align-center">Local</th>
                                    <th style={{width: '15%'}} className="align-center">Status</th>
                                    <th style={{width: '25%'}} className="align-center">Ação</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.isArray(items) && items.map(item => (
                                    <tr key={item.id} className="item-row">
                                        <td style={{fontWeight: 600}}>{item.productCode}</td>
                                        <td>{item.description}</td>
                                        <td className="align-center"><span className="badge-zone">{item.zone}</span></td>
                                        <td className="align-center">
                                            <span className={item.status === 'PENDENTE' ? 'status-pending' : 'status-requested'}>{item.status}</span>
                                            {item.quantityFound > 0 && (
                                                <div style={{fontSize: '0.8rem', color: '#d97706', fontWeight: 'bold', marginTop: '4px'}}>(Parcial)</div>
                                            )}
                                        </td>
                                        <td className="align-center">
                                            <form onSubmit={(e) => handleResolve(item.id, e)} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                                                <input type="number" name="qtyReceived" min="1" max={item.quantityMissing} placeholder={`Faltam ${item.quantityMissing}`} required />
                                                <button type="submit" className="btn-primary">Baixar</button>
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