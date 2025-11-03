import React from 'react';
import ReactDOM from 'react-dom/client';
import Options from './options';
import { AppProvider } from './store';
import { ToastProvider } from './hook/ToastProvider';

import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <ToastProvider>
        <Options />
      </ToastProvider>
    </AppProvider>
  </React.StrictMode>
);
