import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import FieldApp from './app/FieldApp';

registerSW({
  immediate: true,
  onNeedRefresh() {
    // A field worker must not stay on an obsolete jobsheet shell after a
    // deployment. The local draft is durable, so a controlled reload is safe.
    window.location.reload();
  },
});
createRoot(document.getElementById('root')!).render(<StrictMode>{new URLSearchParams(location.search).has('diag') ? <App /> : <FieldApp />}</StrictMode>);
