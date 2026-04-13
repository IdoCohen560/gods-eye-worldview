import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Cesium from 'cesium';
import App from './App';
import './styles/theme.css';
import { CESIUM_ION_TOKEN } from './config/constants';

Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
