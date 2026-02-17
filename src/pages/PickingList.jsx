import { useState, useEffect, useRef } from 'react';

export default function PickingList() {
    const [items, setItems] = useState([]);
    const [globalOpd, setGlobalOpd] = useState("");
    const [opdComment, setOpdComment] = useState("");
    const [showAllZones, setShowAllZones] = useState(false);
    const [kitsOpen, setKitsOpen] = useState(false);
    const fileInputRef = useRef(null);

    // 1. CARREGAR DADOS ATUAIS (CASO FAÇA F5)
    const fetchCurrent = () => {
        fetch('http://localhost:8080/api/picking/current')
            .then(res => res.json())
            .then(data => {
                const enriched = data.map(i => ({ ...i, found: 0 }));
                setItems(enriched);
                if (data.length > 0 && !globalOpd) setGlobalOpd(data[0].opd);
            })
            .catch(err => console.error("Erro ao carregar lista:", err));
    };

    useEffect(() => {
        fetchCurrent();
    }, []);

    // 2. UPLOAD DE ARQUIVO
    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        fetch('http://localhost:8080/api/picking/upload', {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                const enriched = data.map(i => ({ ...i, found: 0 }));
                setItems(enriched);
                if (data.length > 0) setGlobalOpd(data[0].opd);
                e.target.value = null; // Reseta o input
            })
            .catch(err => alert("Erro ao processar o arquivo."));
    };

    // 3. FINALIZAR SESSÃO
    const handleFinalize = () => {
        if (!window.confirm("Deseja realmente finalizar esta sessão e salvar o histórico?")) return;

        const payload = {
            globalOpd: globalOpd,
            opdComment: opdComment,
            items: {}
        };

        items.forEach(item => {
            payload.items[item.uniqueId] = item.found;
        });

        fetch('http://localhost:8080/api/picking/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                setItems([]);
                setGlobalOpd("");
                setOpdComment("");
                alert(data.message);
            });
    };

    // 4. LÓGICA DE NEGÓCIO: KITS E PEÇAS
    const handleKitChange = (kitId, val) => {
        setItems(prev => {
            const next = prev.map(i => ({ ...i }));
            const kit = next.find(i => i.uniqueId === kitId);
            let newFound = parseInt(val) || 0;
            if (newFound > kit.quantityRequested) newFound = kit.quantityRequested;
            kit.found = newFound;

            const children = next.filter(i => i.parentCode === kitId);
            children.forEach(c => {
                c.found = kit.quantityRequested > 0 ? Math.floor(c.quantityRequested * (kit.found / kit.quantityRequested)) : 0;
            });
            return next;
        });
    };

    const handlePartChange = (code, val) => {
        setItems(prev => {
            const next = prev.map(i => ({ ...i }));
            const refs = next.filter(i => i.productCode === code && !i.kitParent);
            const totalReq = refs.reduce((acc, curr) => acc + curr.quantityRequested, 0);

            let newFound = parseInt(val) || 0;
            if (newFound > totalReq) newFound = totalReq;

            let remaining = newFound;
            refs.forEach(item => {
                if (remaining >= item.quantityRequested) {
                    item.found = item.quantityRequested;
                    remaining -= item.quantityRequested;
                } else {
                    item.found = remaining;
                    remaining = 0;
                }
            });

            // Atualiza Kits baseado nos filhos
            next.filter(i => i.kitParent).forEach(kit => {
                const children = next.filter(i => i.parentCode === kit.uniqueId);
                if (children.length > 0) {
                    const allDone = children.every(c => c.found === c.quantityRequested);
                    kit.found = allDone ? kit.quantityRequested : 0;
                }
            });
            return next;
        });
    };

    // 5. AGREGAÇÃO MATEMÁTICA PARA RENDERIZAÇÃO
    const aggregatedParts = {};
    items.filter(i => !i.kitParent).forEach(part => {
        if (!aggregatedParts[part.productCode]) {
            aggregatedParts[part.productCode] = {
                code: part.productCode,
                desc: part.description,
                zone: part.zone,
                req: 0,
                found: 0,
                inScope: false
            };
        }
        aggregatedParts[part.productCode].req += part.quantityRequested;
        aggregatedParts[part.productCode].found += part.found;
        if (part.inScope) aggregatedParts[part.productCode].inScope = true;
    });

    const partsArray = Object.values(aggregatedParts).sort((a, b) => (a.zone || "").localeCompare(b.zone || ""));
    const kitsArray = items.filter(i => i.kitParent);

    // 6. CÁLCULO DE PROGRESSO
    let totalProgress = 0, doneProgress = 0;
    partsArray.forEach(agg => {
        if (agg.req > 0 && (agg.inScope || showAllZones)) {
            totalProgress += agg.req;
            doneProgress += agg.found;
        }
    });
    const pct = totalProgress ? Math.round((doneProgress / totalProgress) * 100) : 0;

    // RENDERIZAÇÃO
    return (
        <main className="main-content">
            <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-dark)', marginRight: '10px' }}>Importar Estrutura ERP:</span>
                    <input type="file" accept=".csv, .xlsx" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
                    <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>Selecionar Arquivo</button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                    <h3 style={{ color: '#64748b', fontWeight: 500 }}>Nenhuma lista carregada</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Importe um arquivo usando o botão acima.</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>OPD:</label>
                            <input type="text" value={globalOpd} onChange={(e) => setGlobalOpd(e.target.value)}
                                   style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--primary-dark)', width: '160px' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Mostrar Outras Áreas</span>
                            <label className="switch">
                                <input type="checkbox" checked={showAllZones} onChange={() => setShowAllZones(!showAllZones)} />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className="section-title accordion-header" onClick={() => setKitsOpen(!kitsOpen)}>
                        <span>Conjuntos</span>
                        <span>{kitsOpen ? "▲" : "▼"}</span>
                    </div>

                    {kitsOpen && (
                        <div className="table-container">
                            <table>
                                <thead>
                                <tr>
                                    <th className="align-left" style={{ width: '25%' }}>Código da Peça</th>
                                    <th className="align-left" style={{ width: '35%' }}>Descrição</th>
                                    <th className="align-center" style={{ width: '10%' }}>Local</th>
                                    <th className="align-center" style={{ width: '10%' }}>Req.</th>
                                    <th className="align-center" style={{ width: '10%' }}>Enc.</th>
                                    <th className="align-center" style={{ width: '10%' }}>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {kitsArray.map(kit => {
                                    if (!kit.inScope && !showAllZones) return null;
                                    const isDone = kit.found === kit.quantityRequested && kit.quantityRequested > 0;
                                    return (
                                        <tr key={kit.uniqueId} className={isDone ? "picked" : ""}>
                                            <td className="align-left" style={{ fontWeight: 700 }}>{kit.productCode}</td>
                                            <td className="align-left">{kit.description}</td>
                                            <td className="align-center" style={{ color: !kit.inScope ? '#ef4444' : 'inherit', fontWeight: !kit.inScope ? 'bold' : 'normal' }}>{kit.zone}</td>
                                            <td className="align-center" style={{ fontWeight: 700 }}>{kit.quantityRequested}</td>
                                            <td className="align-center">
                                                <input type="number" min="0" max={kit.quantityRequested} value={kit.found}
                                                       onChange={(e) => handleKitChange(kit.uniqueId, e.target.value)} />
                                            </td>
                                            <td className="align-center">
                                                <div className={`status-btn ${isDone ? 'checked' : ''}`}
                                                     onClick={() => handleKitChange(kit.uniqueId, isDone ? 0 : kit.quantityRequested)}></div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="separator"></div>
                    <div className="section-title">Peças</div>

                    <div className="table-container">
                        <table>
                            <thead>
                            <tr>
                                <th className="align-left" style={{ width: '25%' }}>Código da Peça</th>
                                <th className="align-left" style={{ width: '35%' }}>Descrição</th>
                                <th className="align-center" style={{ width: '10%' }}>Local</th>
                                <th className="align-center" style={{ width: '10%' }}>Req.</th>
                                <th className="align-center" style={{ width: '10%' }}>Enc.</th>
                                <th className="align-center" style={{ width: '10%' }}>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {partsArray.map(part => {
                                if (!part.inScope && !showAllZones) return null;
                                const isDone = part.found === part.req && part.req > 0;
                                return (
                                    <tr key={part.code} className={isDone ? "picked" : ""}>
                                        <td className="align-left" style={{ fontWeight: 600 }}>{part.code}</td>
                                        <td className="align-left">{part.desc}</td>
                                        <td className="align-center" style={{ color: !part.inScope ? '#ef4444' : 'inherit', fontWeight: !part.inScope ? 'bold' : 'normal' }}>{part.zone}</td>
                                        <td className="align-center" style={{ fontWeight: 700 }}>{part.req}</td>
                                        <td className="align-center">
                                            <input type="number" min="0" max={part.req} value={part.found}
                                                   onChange={(e) => handlePartChange(part.code, e.target.value)} />
                                        </td>
                                        <td className="align-center">
                                            <div className={`status-btn ${isDone ? 'checked' : ''}`}
                                                 onClick={() => handlePartChange(part.code, isDone ? 0 : part.req)}></div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    <div className="finalize-container">
                        <textarea placeholder="Adicionar observação sobre as faltas (Ex: 'Material bloqueado na qualidade')..."
                                  value={opdComment} onChange={(e) => setOpdComment(e.target.value)}
                                  style={{ width: '100%', marginBottom: '15px', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: 'inherit', resize: 'vertical', minHeight: '70px', fontSize: '0.95rem' }} />
                        <button className="btn btn-success" onClick={handleFinalize}>Finalizar Sessão</button>
                    </div>
                </div>
            )}

            {items.length > 0 && (
                <div className="progress-dock">
                    <div className="progress-info" style={{ fontWeight: 600, fontSize: '1rem' }}>
                        Progresso: <span style={{ color: 'var(--primary-dark)' }}>{pct}%</span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>
                        Itens: <span>{doneProgress}/{totalProgress}</span>
                    </div>
                </div>
            )}
        </main>
    );
}