import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import MissingReport from './pages/MissingReport';
import PickingList from './pages/PickingList';
import DeliveryHistory from './pages/DeliveryHistory';
import ShiftReport from './pages/ShiftReport';

function App() {
    return (
        <BrowserRouter>
            <TopBar />
            <Routes>
                <Route path="/" element={<PickingList />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reports/missing" element={<MissingReport />} />
                <Route path="/reports/history" element={<DeliveryHistory />} />
                <Route path="/reports/ShiftReport" element={<ShiftReport/>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;