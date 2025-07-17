# SLOBBY2 - Live Memecoin Snail Racing

A live multiplayer web game where players race snails representing different Solana memecoins. Race outcomes are influenced by real-time token data from DexScreener API.

## 🎮 Features

- **Live Multiplayer Racing**: Real-time races with WebSocket synchronization
- **Cryptocurrency Integration**: Race performance tied to live token data
- **3D Graphics**: Full 3D environment with Three.js
- **Cross-Platform**: Works on desktop and mobile
- **Real-time Chat**: Chat with other players during races
- **Continuous Racing**: Non-stop racing action

## 🚀 Quick Start (Local)

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## 🌐 Live Deployment Options

### Option 1: Vercel (Recommended for Node.js apps)
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Your game will be live at the provided URL

### Option 2: Netlify (Static + Functions)
1. Connect your GitHub repo to Netlify
2. Deploy automatically on push

### Option 3: Heroku
1. Create a Heroku app
2. Push your code: `git push heroku main`

### Option 4: Railway
1. Connect GitHub repo
2. Auto-deploy on commits

## 🔧 Configuration

- **WebSocket URL**: Automatically configured based on deployment domain
- **Supabase**: Real-time database (optional, runs offline without it)
- **DexScreener API**: Fetches live token data

## 📱 How to Play

1. **Enter the Arena**: Click "Enter Arena" on the landing page
2. **Join or Spectate**: 
   - Join: Enter username and select/enter a Solana token
   - Spectate: Watch races without participating
3. **Race**: Watch your snail race based on your token's performance
4. **Chat**: Interact with other players in real-time

## 🛠 Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6 modules)
- **3D Engine**: Three.js
- **Animation**: Tween.js
- **Backend**: Node.js + Express + WebSocket
- **Database**: Supabase (optional)
- **APIs**: DexScreener for token data

## 🔗 Social Links

- Twitter: [@slobbyrace](https://x.com/slobbyrace)
- Built for the memecoin community

---

**Ready to race? Deploy SLOBBY2 and let the world join the snail racing championship!**