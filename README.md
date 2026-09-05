# 🐾 Felineas — Reino Felino MMORPG & Gestão Estratégica

**Felineas** é um jogo web de estratégia em tempo real e RPG felino com progressão de vilas, expedições na Torre de Desafios, sistema de classes de tropas (Clash of Clans style), heróis colecionáveis, itens lendários e uma central soberana de **Game Master (GM)**.

---

## 🚀 Como Executar o Jogo Localmente

### Opção 1: Usando Node.js (Servidor Local)
Basta rodar no terminal na raiz do projeto:
```bash
node -e "const http = require('http'), fs = require('fs'), path = require('path'); const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png', '.mp3':'audio/mpeg' }; http.createServer((req, res) => { let p = req.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = path.join(process.cwd(), p); if (fs.existsSync(f) && !fs.statSync(f).isDirectory()) { res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end('Not Found'); } }).listen(3000, () => console.log('🐱 Felineas online em http://localhost:3000/'));"
```
Ou se tiver o `live-server` / `serve`:
```bash
npx serve . -p 3000
```
Acesse no seu navegador: **`http://localhost:3000/`**

---

## 🔥 Como Configurar o Firebase Firestore e Corrigir Erros de Permissão

Se você vir o erro `FirebaseError: [code=permission-denied]: Missing or insufficient permissions`:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione o seu projeto (**felineas**).
3. No menu lateral, clique em **Firestore Database** e vá na aba **Regras (Rules)**.
4. Substitua o conteúdo pelo que está no arquivo **`firestore.rules`**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /global/{docId} {
         allow read, write: if true;
       }
       match /villages/{villageId} {
         allow read, write: if true;
       }
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
5. Clique em **Publicar (Publish)**.
6. Pronto! As notícias, vilas e configurações do GM sincronizarão em tempo real sem nenhum erro.

> **Nota de Resiliência:** Mesmo sem conexão ou sem o Firebase configurado, o jogo conta com um **Zero-Crash Local Fallback**, salvando tudo no navegador (`localStorage`) para que você nunca perca seu progresso ou fique travado.

---

## 🌐 Deploy no Netlify

Para hospedar o jogo gratuitamente no Netlify:
1. Conecte seu repositório GitHub ao [Netlify](https://app.netlify.com/).
2. **Build command:** Deixe em branco (é uma aplicação estática Vanilla JS).
3. **Publish directory:** `./` (raiz do projeto).
4. Clique em **Deploy Site**.

---

## 👑 Acesso do Administrador e Game Master (GM)

O acesso ao Painel de GM é feito de forma segura e profissional através da tela principal de login:

- **E-mail:** `gm@felineas.com`
- **Senha:** `gm123` *(ou qualquer conta criada no painel com o cargo de Administrador)*

### Funcionalidades do Painel de GM:
- **Regras & Tempos:** Controle independente de segundos para cada um dos 7 edifícios, 5 classes de tropas e fadiga de cada herói.
- **Contas & Vilas:** Criador de contas com presets (Iniciante, Avançado, ADM), Ficha Completa do Jogador, ajuste de níveis de edifícios, doação de itens específicos, redefinição de senha e concessão de diamantes.
- **Itens & Drops:** Catálogo com 31 itens RPG (Tiers 1 a 4), edição de atributos e ativação/desativação de drops na Torre.
- **Notícias & Transmissão Global:** Publicação de notícias na tela de login e alerta sonoro/visual em tempo real para todo o reino.
- **Auditoria & Logs:** Registro de logins, criação de contas, alterações de taxas e banimentos.

---

## 📂 Arquitetura do Projeto

```
Felineas/
├── index.html             # Interface principal (Login, Jogo, Quartel, Painel de GM e Modais)
├── style.css              # Design system felino, temas dark/light, responsividade e componentes
├── main.js                # Ponto de entrada modular
├── auth.js                # Autenticação, gestão de sessão e login de GM/ADM
├── state.js               # Estado global reativo, banco de itens (31 itens), regras de batalha e persistência
├── game.js                # Loop de jogo, fazenda de recursos, expedições na Torre e interface do jogador
├── gm.js                  # Lógica completa da central de Game Master, auditoria e edição de contas
├── firebase-config.js     # Configuração e inicialização dos serviços Firebase
├── firestore.rules        # Regras oficiais de segurança do Firebase Firestore
└── assets/                # Imagens, retratos dos heróis, mapa mundi e música tema
```
