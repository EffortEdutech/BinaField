import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import FieldApp from './app/FieldApp';

registerSW({ immediate: true });
createRoot(document.getElementById('root')!).render(<StrictMode>{new URLSearchParams(location.search).has('diag') ? <App /> : <FieldApp />}</StrictMode>);
