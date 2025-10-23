import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import Options from './options';
import { AppProvider } from './store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <Options />
    </AppProvider>
  </React.StrictMode>
);
