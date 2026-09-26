const { execSync } = require('child_process');
const path = require('path');

console.log('Iniciando build frontend...');
console.log('Timestamp:', new Date().toISOString());

try {
    const result = execSync(
        'node ./node_modules/vite/bin/vite.js build --mode production',
        {
            cwd: '/home/flautisc0/athamu_workspace',
            timeout: 90000,
            encoding: 'utf-8',
            stdio: 'pipe'
        }
    );
    
    console.log('STDOUT:', result.split('\n').slice(-20).join('\n'));
    console.log('BUILD EXITOSO');
    process.exit(0);
} catch (error) {
    console.log('STDOUT:', error.stdout ? error.stdout.split('\n').slice(-20).join('\n') : 'none');
    console.log('STDERR:', error.stderr ? error.stderr.split('\n').slice(-20).join('\n') : 'none');
    console.log('Código:', error.status);
    console.log('ERROR:', error.message);
    process.exit(error.status || 1);
}
