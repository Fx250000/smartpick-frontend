import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';

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

// Formatação de data
const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Formatação de Mês/Ano para o Accordion
const formatMonthYear = (dateString) => {
    const date = new Date(dateString);
    const m = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    const y = date.toLocaleString('pt-BR', { year: '2-digit' });
    return `${m.charAt(0).toUpperCase() + m.slice(1)}/${y}`;
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Estados para Accordions e Filtros
    const [openOpds, setOpenOpds] = useState({});
    const [openDesc, setOpenDesc] = useState({});
    const [openMonths, setOpenMonths] = useState({});

    const [opdFilter, setOpdFilter] = useState('');

    // Estados para expansão das tabelas gerenciais
    const [showAllPecas, setShowAllPecas] = useState(false);
    const [showAllKits, setShowAllKits] = useState(false);
    const [showAllLead, setShowAllLead] = useState(false);
    const [showAllKanban, setShowAllKanban] = useState(false);

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

    const toggleOpd = (opd) => setOpenOpds(prev => ({ ...prev, [opd]: !prev[opd] }));
    const toggleDesc = (table, index) => setOpenDesc(prev => ({ ...prev, [`${table}-${index}`]: !prev[`${table}-${index}`] }));
    const toggleMonth = (month) => setOpenMonths(prev => ({ ...prev, [month]: !prev[month] }));

    // Lógica inteligente do Histórico Operacional
    const processedHistory = useMemo(() => {
        if (!data?.history) return { recent10: [], groupedMonths: {}, isFiltered: false, flatFiltered: [] };

        // 1. Agrupar por OPD
        const grouped = data.history.reduce((acc, item) => {
            const opd = formatOpd(item.opd);
            if (!acc[opd]) acc[opd] = [];
            acc[opd].push(item);
            return acc;
        }, {});

        // 2. Converter em array ordenado do mais recente para o mais antigo
        let historyArray = Object.entries(grouped).map(([opd, items]) => ({
            opd,
            items,
            lastDate: items[0].completionDate
        })).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

        // 3. Aplicar Filtro de Pesquisa (se houver, ignoramos a separação de meses)
        if (opdFilter.trim() !== '') {
            const term = opdFilter.trim().toUpperCase();
            const flatFiltered = historyArray.filter(h => h.opd.includes(term));
            return { recent10: [], groupedMonths: {}, isFiltered: true, flatFiltered };
        }

        // 4. Separar Top 10 e Agrupar Restante por Mês
        const recent10 = historyArray.slice(0, 10);
        const rest = historyArray.slice(10);

        const groupedMonths = rest.reduce((acc, curr) => {
            const monthLabel = formatMonthYear(curr.lastDate);
            if (!acc[monthLabel]) acc[monthLabel] = [];
            acc[monthLabel].push(curr);
            return acc;
        }, {});

        return { recent10, groupedMonths, isFiltered: false, flatFiltered: [] };
    }, [data, opdFilter]);

    if (loading && !data) return <div className="main-content">Carregando indicadores...</div>;

    // Componente auxiliar para renderizar a linha da OPD
    const renderOpdRow = (h) => {
        const { opd, items, lastDate } = h;
        const isOpen = openOpds[opd];
        const totalReq = items.reduce((sum, i) => sum + i.itemsRequested, 0);
        const totalFound = items.reduce((sum, i) => sum + i.itemsFound, 0);
        const globalRate = totalReq > 0 ? Math.round((totalFound / totalReq) * 100) : 0;

        return (
            <Fragment key={opd}>
                <tr style={{ backgroundColor: isOpen ? '#f8fafc' : 'transparent', borderBottom: isOpen ? 'none' : '1px solid var(--border)' }}>
                    <td className="align-center" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatDate(lastDate)}</td>
                    <td className="align-center" style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{opd}</td>
                    <td className="align-center" style={{ fontWeight: 600 }}>{totalReq}</td>
                    <td className="align-center" style={{ fontWeight: 600 }}>{totalFound}</td>
                    <td className="align-center">
                        <span className={`badge ${globalRate >= 100 ? 'badge-success' : 'badge-danger'}`}>
                            {globalRate >= 100 ? 'Completa' : 'Faltas'} ({globalRate}%)
                        </span>
                    </td>
                    <td className="align-center">
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => toggleOpd(opd)}>
                            {isOpen ? 'Ocultar Peças' : 'Ver Peças'}
                        </button>
                    </td>
                </tr>
                {isOpen && (
                    <tr>
                        <td colSpan="6" style={{ padding: 0, backgroundColor: '#f1f5f9' }}>
                            <table style={{ width: '95%', margin: '10px auto', background: 'white', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <thead>
                                <tr>
                                    <th className="align-center" style={{ background: '#e2e8f0', fontSize: '0.75rem' }}>Código</th>
                                    <th className="align-center" style={{ background: '#e2e8f0', fontSize: '0.75rem' }}>Descrição</th>
                                    <th className="align-center" style={{ background: '#e2e8f0', fontSize: '0.75rem' }}>Req.</th>
                                    <th className="align-center" style={{ background: '#e2e8f0', fontSize: '0.75rem' }}>Enc.</th>
                                    <th className="align-center" style={{ background: '#e2e8f0', fontSize: '0.75rem' }}>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td className="align-center" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatProductCode(item.productCode)}</td>
                                        <td className="align-center" style={{ fontSize: '0.85rem' }}>{item.description}</td>
                                        <td className="align-center" style={{ fontSize: '0.85rem' }}>{item.itemsRequested}</td>
                                        <td className="align-center" style={{ fontSize: '0.85rem' }}>{item.itemsFound}</td>
                                        <td className="align-center">
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: item.fillRate >= 100 ? '#16a34a' : '#d97706' }}>
                                                    {item.fillRate.toFixed(0)}%
                                                </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                )}
            </Fragment>
        );
    };

    return (
        <main className="main-content">
            {/* Barra de Filtros Clean (Estilo Pílula) */}
            <div className="action-bar" style={{ padding: '0.75rem 1.5rem', marginBottom: '1rem', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem', marginRight: '10px' }}>Período:</span>
                    <input type="date" style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-dark)', fontFamily: 'inherit' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                    <input type="date" style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-dark)', fontFamily: 'inherit' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ padding: '6px 15px' }} onClick={fetchData} disabled={loading}>
                    {loading ? 'Atualizando...' : 'Aplicar'}
                </button>
            </div>

            {/* KPIs */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-grid" style={{ padding: '1rem 1.5rem', gap: '1rem' }}>
                    <div className="kpi-card" style={{ padding: '1rem' }}>
                        <div className="kpi-label" style={{ fontSize: '0.8rem' }}>Throughput (OPDs)</div>
                        <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{data?.summary?.throughput || 0}</div>
                    </div>
                    <div className="kpi-card" style={{ padding: '1rem' }}>
                        <div className="kpi-label" style={{ fontSize: '0.8rem' }}>Volume Total</div>
                        <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{data?.summary?.totalVolume || 0}</div>
                    </div>
                    <div className="kpi-card" style={{ padding: '1rem' }}>
                        <div className="kpi-label" style={{ fontSize: '0.8rem' }}>Fill Rate Global</div>
                        <div className="kpi-value" style={{ fontSize: '1.5rem', color: 'var(--primary-dark)' }}>
                            {data?.summary?.globalFillRate ? data.summary.globalFillRate.replace(',0%', '%') : "0%"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Histórico Detalhado */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Histórico Operacional Detalhado</h2>
                    <input
                        type="text"
                        placeholder="Buscar OPD..."
                        className="action-input"
                        style={{ maxWidth: '200px', padding: '6px 12px' }}
                        value={opdFilter}
                        onChange={(e) => setOpdFilter(e.target.value)}
                    />
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th className="align-center">Data/Hora</th>
                            <th className="align-center">OPD</th>
                            <th className="align-center">Total Req.</th>
                            <th className="align-center">Total Entregue</th>
                            <th className="align-center">Status Global</th>
                            <th className="align-center">Detalhes</th>
                        </tr>
                        </thead>
                        <tbody>
                        {/* Se houver filtro ativo, mostra a lista plana filtrada */}
                        {processedHistory.isFiltered ? (
                            processedHistory.flatFiltered.length > 0
                                ? processedHistory.flatFiltered.map(h => renderOpdRow(h))
                                : <tr><td colSpan="6" className="align-center" style={{ padding: '2rem' }}>Nenhuma OPD encontrada.</td></tr>
                        ) : (
                            /* Lógica Padrão: 10 recentes + Accordion de Meses */
                            <>
                                {processedHistory.recent10.map(h => renderOpdRow(h))}

                                {Object.entries(processedHistory.groupedMonths).map(([month, historyArray]) => (
                                    <Fragment key={month}>
                                        <tr onClick={() => toggleMonth(month)} style={{ cursor: 'pointer', backgroundColor: '#e2e8f0', borderTop: '2px solid #cbd5e1' }}>
                                            <td colSpan="6" className="align-center" style={{ fontWeight: 700, padding: '10px', color: 'var(--primary-dark)' }}>
                                                {openMonths[month] ? '▼' : '▶'} Arquivo: {month} ({historyArray.length} OPDs)
                                            </td>
                                        </tr>
                                        {openMonths[month] && historyArray.map(h => renderOpdRow(h))}
                                    </Fragment>
                                ))}

                                {processedHistory.recent10.length === 0 && (
                                    <tr><td colSpan="6" className="align-center" style={{ padding: '2rem' }}>Nenhum registro encontrado.</td></tr>
                                )}
                            </>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Grid de Tabelas Gerenciais */}
            <div className="split-grid" style={{ padding: 0 }}>

                {/* 1. Curva ABC Peças */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title align-center">Curva ABC: Peças</div>
                    <div className="table-container">
                        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                            <thead><tr><th className="align-left" style={{ width: '70%' }}>Código (Clique p/ Descrição)</th><th className="align-center" style={{ width: '30%' }}>Volume</th></tr></thead>
                            <tbody>
                            {(showAllPecas ? (data?.abcCurve || []) : (data?.abcCurve?.slice(0, 10) || [])).map((it, i) => {
                                const isOpen = openDesc[`peca-${i}`];
                                return (
                                    <Fragment key={`peca-${i}`}>
                                        <tr onClick={() => toggleDesc('peca', i)} style={{ cursor: 'pointer', backgroundColor: isOpen ? '#f8fafc' : 'transparent' }}>
                                            <td className="align-left" style={{ fontWeight: 600, color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isOpen ? '▼' : '▶'}</span> {formatProductCode(it.code)}
                                            </td>
                                            <td className="align-center" style={{ fontWeight: 600 }}>{it.volume} un</td>
                                        </tr>
                                        {isOpen && <tr><td colSpan="2" style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', fontSize: '0.85rem' }}><span style={{ fontWeight: 700 }}>Ref:</span> {it.description}</td></tr>}
                                    </Fragment>
                                )
                            })}
                            {data?.abcCurve?.length > 10 && (
                                <tr onClick={() => setShowAllPecas(!showAllPecas)} style={{ cursor: 'pointer', background: '#f8fafc' }}>
                                    <td colSpan="2" className="align-center" style={{ padding: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {showAllPecas ? '▲ Ocultar' : `▼ Ver mais ${data.abcCurve.length - 10} itens`}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Curva ABC Kits */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title align-center">Curva ABC: Kits</div>
                    <div className="table-container">
                        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                            <thead><tr><th className="align-left" style={{ width: '70%' }}>Kit (Clique p/ Descrição)</th><th className="align-center" style={{ width: '30%' }}>Volume</th></tr></thead>
                            <tbody>
                            {(showAllKits ? (data?.abcKits || []) : (data?.abcKits?.slice(0, 10) || [])).map((it, i) => {
                                const isOpen = openDesc[`kit-${i}`];
                                return (
                                    <Fragment key={`kit-${i}`}>
                                        <tr onClick={() => toggleDesc('kit', i)} style={{ cursor: 'pointer', backgroundColor: isOpen ? '#f8fafc' : 'transparent' }}>
                                            <td className="align-left" style={{ fontWeight: 600, color: 'var(--primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isOpen ? '▼' : '▶'}</span> {formatProductCode(it.code)}
                                            </td>
                                            <td className="align-center" style={{ fontWeight: 600 }}>{it.volume} un</td>
                                        </tr>
                                        {isOpen && <tr><td colSpan="2" style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', fontSize: '0.85rem' }}><span style={{ fontWeight: 700 }}>Ref:</span> {it.description}</td></tr>}
                                    </Fragment>
                                )
                            })}
                            {data?.abcKits?.length > 10 && (
                                <tr onClick={() => setShowAllKits(!showAllKits)} style={{ cursor: 'pointer', background: '#f8fafc' }}>
                                    <td colSpan="2" className="align-center" style={{ padding: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {showAllKits ? '▲ Ocultar' : `▼ Ver mais ${data.abcKits.length - 10} itens`}
                                    </td>
                                </tr>
                            )}
                            {(!data?.abcKits || data.abcKits.length === 0) && <tr><td colSpan="2" className="align-center" style={{ padding: '1.5rem', color: '#94a3b8' }}>Nenhum kit processado</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Lead Time */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title align-center">Lead Time de Reposição</div>
                    <div className="table-container">
                        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                            <thead><tr><th className="align-center" style={{ width: '60%' }}>Área / Processo</th><th className="align-center" style={{ width: '40%' }}>Média (Horas)</th></tr></thead>
                            <tbody>
                            {(showAllLead ? (data?.kanbanLeadTime || []) : (data?.kanbanLeadTime?.slice(0, 10) || [])).map((it, i) => (
                                <tr key={i}><td className="align-center" style={{ fontWeight: 600 }}>{it.zone}</td><td className="align-center">{Number(it.avgLeadTime).toFixed(2)}h</td></tr>
                            ))}
                            {data?.kanbanLeadTime?.length > 10 && (
                                <tr onClick={() => setShowAllLead(!showAllLead)} style={{ cursor: 'pointer', background: '#f8fafc' }}>
                                    <td colSpan="2" className="align-center" style={{ padding: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {showAllLead ? '▲ Ocultar' : `▼ Ver mais ${data.kanbanLeadTime.length - 10} áreas`}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Sugestão Kanban */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <div className="section-title align-center">Estoque Kanban</div>
                    <div className="table-container">
                        <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                            <thead><tr><th className="align-center" style={{ width: '40%' }}>Código</th><th className="align-center" style={{ width: '30%' }}>Consumo</th><th className="align-center" style={{ width: '30%' }}>Sugerido</th></tr></thead>
                            <tbody>
                            {(showAllKanban ? (data?.kanbanStock || []) : (data?.kanbanStock?.slice(0, 10) || [])).map((it, i) => (
                                <tr key={i}>
                                    <td className="align-center" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatProductCode(it.code)}</td>
                                    <td className="align-center">{it.totalConsumed} un</td>
                                    <td className="align-center" style={{fontWeight: 'bold', color: '#d97706'}}>{it.recommendedKanban} bins</td>
                                </tr>
                            ))}
                            {data?.kanbanStock?.length > 10 && (
                                <tr onClick={() => setShowAllKanban(!showAllKanban)} style={{ cursor: 'pointer', background: '#f8fafc' }}>
                                    <td colSpan="3" className="align-center" style={{ padding: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {showAllKanban ? '▲ Ocultar' : `▼ Ver mais ${data.kanbanStock.length - 10} itens`}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}