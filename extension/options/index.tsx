import React from 'react';
import ReactDOM from 'react-dom/client';
import OptionsApp from '../src/options/OptionsApp';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
