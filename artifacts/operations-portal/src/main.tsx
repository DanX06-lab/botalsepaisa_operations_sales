import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { setBaseUrl } from '@workspace/api-client-react';

// Use env var if set, otherwise use the known Render backend URL
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://botalsepaisa-api.onrender.com';
setBaseUrl(apiBaseUrl);

createRoot(document.getElementById('root')!).render(<App />);

