import { useState, useEffect, useRef } from 'react';

export default function PickingList() {
    const [items, setItems] = useState([]);
    const [globalOpd, setGlobalOpd] = useState("");
    const [opdComment, setOpdComment] = useState("");
    const [multiplier, setMultiplier] = useState(1);
    const [showAllZones, setShowAllZones] = useState(false);
    const [kitsOpen, setKitsOpen] = useState(false);
    const fileInputRef = useRef(null);

    // 1. CARREGAR DADOS ATUAIS (Com Inteligência de Auto-Save)
    const fetchCurrent = () => {
        fetch('http://localhost:8080/api/picking/current')
            .then(res => res.json())
            .then(data => {
                // Recupera o rascunho do navegador, se existir
                const savedStr = localStorage.getItem('smartpick_session');
                let savedData = null;
                if (savedStr) {
                    try { savedData = JSON.parse(savedStr); } catch (e) {}
                }

                // Cruza os dados do banco com as quantidades rasunhadas
                const enriched = data.map(i => {
                    let f = 0;
                    if (savedData && savedData.foundItems && savedData.foundItems[i.uniqueId] !== undefined) {
                        f = savedData.foundItems[i.uniqueId];
                    }
                    return { ...i, found: f };
                });

                setItems(enriched);

                // Restaura cabeçalhos ou define padrões
                if (savedData) {
                    if (savedData.globalOpd) setGlobalOpd(savedData.globalOpd);
                    if (savedData.opdComment) setOpdComment(savedData.opdComment);
                    if (savedData.multiplier) setMultiplier(savedData.multiplier);
                } else if (data.length > 0) {
                    setGlobalOpd(data[0].opd || "");
                    setMultiplier(1);
                }
            })
            .catch(err => console.error("Erro ao carregar lista:", err));
    };

    const formatProductCode = (raw) => {
        if (!raw) return "";
        let str = String(raw).trim();
        if (str.length < 13) str = str.padStart(13, '0');
        if (/^\d{13}$/.test(str)) return str.replace(/^(\d{2})(\d{3})(\d{3})(\d{5})$/, '$1.$2.$3.$4');
        return str;
    };

    useEffect(() => {
        fetchCurrent();
    }, []);

    // NOVO: GATILHO DE AUTO-SAVE SILENCIOSO
    useEffect(() => {
        if (items.length > 0) {
            const foundItems = {};
            items.forEach(i => foundItems[i.uniqueId] = i.found);

            const sessionData = {
                globalOpd,
                opdComment,
                multiplier,
                foundItems
            };
            localStorage.setItem('smartpick_session', JSON.stringify(sessionData));
        }
    }, [items, globalOpd, opdComment, multiplier]);

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
            .then(res => {
                if (!res.ok) throw new Error("Falha na resposta do servidor");
                return res.json();
            })
            .then(data => {
                // Ao carregar nova lista, apaga o rascunho antigo
                localStorage.removeItem('smartpick_session');
                fetchCurrent();
                if (fileInputRef.current) fileInputRef.current.value = null;
            })
            .catch(err => {
                console.error(err);
                alert("Erro ao processar o arquivo.");
            });
    };

    // 3. FINALIZAR SESSÃO
    const handleFinalize = () => {
        if (!window.confirm("Deseja realmente finalizar esta sessão e salvar o histórico?")) return;

        const payload = {
            globalOpd: globalOpd,
            opdComment: opdComment,
            multiplier: parseInt(multiplier) || 1,
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
                // Sucesso! Limpa a tela e o rascunho
                setItems([]);
                setGlobalOpd("");
                setOpdComment("");
                setMultiplier(1);
                localStorage.removeItem('smartpick_session');
                alert(data.message);
            });
    };

    // 4. LÓGICA DE NEGÓCIO: KITS E PEÇAS
    const handleKitChange = (kitId, val) => {
        const mult = parseInt(multiplier) || 1;

        setItems(prev => {
            const next = prev.map(i => ({ ...i }));
            const kit = next.find(i => i.uniqueId === kitId);
            const targetReq = kit.quantityRequested * mult;

            let newFound = parseInt(val) || 0;
            if (newFound > targetReq) newFound = targetReq;
            kit.found = newFound;

            const children = next.filter(i => i.parentCode === kitId);
            children.forEach(c => {
                const cTarget = c.quantityRequested * mult;
                c.found = targetReq > 0 ? Math.floor(cTarget * (kit.found / targetReq)) : 0;
            });
            return next;
        });
    };

    const handlePartChange = (code, val) => {
        const mult = parseInt(multiplier) || 1;

        setItems(prev => {
            const next = prev.map(i => ({ ...i }));
            const refs = next.filter(i => i.productCode === code && !i.kitParent);
            const totalReq = refs.reduce((acc, curr) => acc + (curr.quantityRequested * mult), 0);

            let newFound = parseInt(val) || 0;
            if (newFound > totalReq) newFound = totalReq;

            let remaining = newFound;
            refs.forEach(item => {
                const itemTarget = item.quantityRequested * mult;
                if (remaining >= itemTarget) {
                    item.found = itemTarget;
                    remaining -= itemTarget;
                } else {
                    item.found = remaining;
                    remaining = 0;
                }
            });

            next.filter(i => i.kitParent).forEach(kit => {
                const kitTarget = kit.quantityRequested * mult;
                const children = next.filter(i => i.parentCode === kit.uniqueId);
                if (children.length > 0) {
                    const allDone = children.every(c => c.found === (c.quantityRequested * mult));
                    kit.found = allDone ? kitTarget : 0;
                }
            });
            return next;
        });
    };

    // 5. AGREGAÇÃO MATEMÁTICA
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
    const currentMult = parseInt(multiplier) || 1;
    let totalProgress = 0, doneProgress = 0;

    partsArray.forEach(agg => {
        if (agg.req > 0 && (agg.inScope || showAllZones)) {
            totalProgress += (agg.req * currentMult);
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>OPD:</label>
                                <input type="text"
                                       value={globalOpd}
                                       onChange={(e) => setGlobalOpd(e.target.value)}
                                       placeholder="Digite a OPD..."
                                       style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--primary-dark)', width: '160px' }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fef3c7', padding: '4px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <label style={{ fontWeight: 'bold', color: '#92400e' }}>Multiplicador (x):</label>
                                <input type="number" min="1"
                                       value={multiplier}
                                       onChange={(e) => setMultiplier(e.target.value)}
                                       style={{ padding: '4px 8px', border: '1px solid #fcd34d', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.05rem', color: '#b45309', width: '70px', textAlign: 'center' }} />
                            </div>
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
                                    const targetReq = kit.quantityRequested * currentMult;
                                    const isDone = kit.found === targetReq && targetReq > 0;
                                    return (
                                        <tr key={kit.uniqueId} className={isDone ? "picked" : ""}>
                                            <td className="align-left" style={{ fontWeight: 700 }}>{formatProductCode(kit.productCode)}</td>
                                            <td className="align-left">{kit.description}</td>
                                            <td className="align-center" style={{ color: !kit.inScope ? '#ef4444' : 'inherit', fontWeight: !kit.inScope ? 'bold' : 'normal' }}>{kit.zone}</td>
                                            <td className="align-center" style={{ fontWeight: 700, color: currentMult > 1 ? '#d97706' : 'inherit' }}>{targetReq}</td>
                                            <td className="align-center">
                                                <input type="number" min="0" max={targetReq} value={kit.found}
                                                       onChange={(e) => handleKitChange(kit.uniqueId, e.target.value)} />
                                            </td>
                                            <td className="align-center">
                                                <div className={`status-btn ${isDone ? 'checked' : ''}`}
                                                     onClick={() => handleKitChange(kit.uniqueId, isDone ? 0 : targetReq)}></div>
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
                                const targetReq = part.req * currentMult;
                                const isDone = part.found === targetReq && targetReq > 0;
                                return (
                                    <tr key={part.code} className={isDone ? "picked" : ""}>
                                        <td className="align-left" style={{ fontWeight: 600 }}>{formatProductCode(part.code)}</td>
                                        <td className="align-left">{part.desc}</td>
                                        <td className="align-center" style={{ color: !part.inScope ? '#ef4444' : 'inherit', fontWeight: !part.inScope ? 'bold' : 'normal' }}>{part.zone}</td>
                                        <td className="align-center" style={{ fontWeight: 700, color: currentMult > 1 ? '#d97706' : 'inherit' }}>{targetReq}</td>
                                        <td className="align-center">
                                            <input type="number" min="0" max={targetReq} value={part.found}
                                                   onChange={(e) => handlePartChange(part.code, e.target.value)} />
                                        </td>
                                        <td className="align-center">
                                            <div className={`status-btn ${isDone ? 'checked' : ''}`}
                                                 onClick={() => handlePartChange(part.code, isDone ? 0 : targetReq)}></div>
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