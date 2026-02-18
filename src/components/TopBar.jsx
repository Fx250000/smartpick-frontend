import { NavLink } from 'react-router-dom';

export default function TopBar() {
    return (
        <nav className="topbar">
            <div className="topbar-left">
                <div className="brand">SmartPick</div>
            </div>
            <div className="topbar-center">
                <div className="nav-menu">
                    <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Lista de Separação</NavLink>
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Painel Kanban</NavLink>
                    <NavLink to="/reports/missing" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Backlog Faltas</NavLink>
                    <NavLink to="/reports/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>Histórico de Entregas</NavLink>
                    <NavLink to="/reports/ShiftReport" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        Baixa de Turno
                    </NavLink>
                </div>
            </div>
            <div className="topbar-right"></div>
        </nav>
    );
}