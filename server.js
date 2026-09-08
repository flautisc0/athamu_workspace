import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const distDir = path.join(__dirname, 'dist');

app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`crm-web sirviendo en puerto ${PORT}`);
});