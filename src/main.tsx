import { render } from 'preact';
import { App } from './App';
import { initUpdates } from './updates';
import { requestPersistence } from './storage';
import './styles.css';

render(<App />, document.getElementById('app')!);
initUpdates();
void requestPersistence();
