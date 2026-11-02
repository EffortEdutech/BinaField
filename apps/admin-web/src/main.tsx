import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './SupervisorDashboardV2';
import './styles.css';
import './dashboard.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
