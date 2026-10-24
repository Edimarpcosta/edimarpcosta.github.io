/**
 * Script de Build de Produção - Analítica Política 2026
 * Constrói a pasta de distribuição limpa `analitica/dist/` para deploy 100% estático no GitHub Pages.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('='.repeat(70));
  console.log('INICIANDO BUILD ESTÁTICO DE PRODUÇÃO: ANALÍTICA POLÍTICA 2026');
  console.log('='.repeat(70));

  // 1. Limpar / Criar diretório dist
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets', 'css'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets', 'js'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets', 'data'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'public', 'data'), { recursive: true });

  // 2. Copiar arquivos raiz de produção
  fs.copyFileSync(path.join(ROOT_DIR, '404.html'), path.join(DIST_DIR, '404.html'));
  fs.copyFileSync(path.join(ROOT_DIR, 'public', 'favicon.svg'), path.join(DIST_DIR, 'favicon.svg'));
  fs.copyFileSync(path.join(ROOT_DIR, 'public', '.nojekyll'), path.join(DIST_DIR, '.nojekyll'));
  fs.copyFileSync(path.join(ROOT_DIR, 'public', 'config.json'), path.join(DIST_DIR, 'config.json'));

  // 3. Copiar CSS
  fs.copyFileSync(
    path.join(ROOT_DIR, 'src', 'styles.css'),
    path.join(DIST_DIR, 'assets', 'css', 'styles.css')
  );

  // 4. Copiar todo o código JS mantendo estrutura modular
  copyRecursiveSync(path.join(ROOT_DIR, 'src'), path.join(DIST_DIR, 'src'));
  copyRecursiveSync(path.join(ROOT_DIR, 'src'), path.join(DIST_DIR, 'assets', 'js'));

  // 5. Copiar dados estáticos para todas as rotas suportadas
  copyRecursiveSync(path.join(ROOT_DIR, 'public', 'data'), path.join(DIST_DIR, 'assets', 'data'));
  copyRecursiveSync(path.join(ROOT_DIR, 'public', 'data'), path.join(DIST_DIR, 'data'));
  copyRecursiveSync(path.join(ROOT_DIR, 'public', 'data'), path.join(DIST_DIR, 'public', 'data'));
  copyRecursiveSync(path.join(ROOT_DIR, 'public'), path.join(DIST_DIR, 'public'));

  // 6. Gerar index.html otimizado para dist/
  let indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
  
  // Garantir paths corretos em dist/
  indexHtml = indexHtml.replace('href="./src/styles.css"', 'href="./assets/css/styles.css"');
  indexHtml = indexHtml.replace('href="./public/favicon.svg"', 'href="./favicon.svg"');
  indexHtml = indexHtml.replace('src="./src/app.js"', 'src="./assets/js/app.js"');

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml, 'utf-8');

  console.log('[OK] dist/index.html gerado');
  console.log('[OK] dist/404.html copiado');
  console.log('[OK] dist/favicon.svg e dist/.nojekyll copiados');
  console.log('[OK] dist/config.json copiado');
  console.log('[OK] dist/assets/css/styles.css compilado');
  console.log('[OK] dist/assets/js/ (módulos ES6) sincronizados');
  console.log('[OK] dist/assets/data/ e dist/data/live.json sincronizados');
  console.log('='.repeat(70));
  console.log('BUILD CONCLUÍDO COM SUCESSO EM: ' + DIST_DIR);
  console.log('='.repeat(70));
}

build();
