import { execSync } from 'child_process';

console.log('Running Blue Cube Portfolio Build...');
execSync('python3 scripts/build_portfolio.py', { stdio: 'inherit' });
