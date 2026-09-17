import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanelApp from '../src/sidepanel/SidePanelApp';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>
);
