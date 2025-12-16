import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import Popup from './PopupComponent';
import { AppProvider } from '../options/store';

ReactDOM.createRoot(document.getElementById('popup-root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <Popup />
    </AppProvider>
  </React.StrictMode>
);
