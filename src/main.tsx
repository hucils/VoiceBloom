import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces/soft.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { applyTheme } from './app/theme';

// Match the OS theme before the stored preference loads, to avoid a flash.
applyTheme('system');

const container = document.getElementById('root');
if (!container) throw new Error('VoiceBloom: #root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
