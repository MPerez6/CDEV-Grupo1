import { startApplication } from './core/application.ts';
import './ui/style.css';

const app = document.getElementById('app');
if (!app) throw new Error('No se encontró #app');
startApplication(app);
