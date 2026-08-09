import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import { setBaseUrl } from '@workspace/api-client-react';

// Set API base URL from environment variable for production deployment
// In development, this defaults to the Vite proxy
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

createRoot(document.getElementById('root')!).render(<App />);
