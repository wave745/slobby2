export class UI {
  constructor(game) {
    this.game = game; // Store a reference to the main game class
    this.raceTimerElement = document.getElementById('raceTimer');
    this.raceStatusElement = document.getElementById('raceStatus');
    this.leaderboardElement = document.getElementById('leaderboardContent');
    this.queueContentElement = document.getElementById('queueContent');
    this.countdownElement = document.getElementById('countdown');
    this.chatMessagesElement = document.getElementById('chatMessages');
    this.raceUIElement = document.getElementById('raceUI');
    this.leaderboardContainer = document.getElementById('leaderboard');
    this.chatBoxElement = document.getElementById('chatBox');
    this.winnerPopupElement = document.getElementById('winnerPopup');
    this.winnerUsernameElement = document.getElementById('winnerUsernameDisplay');
    this.winnerTokenElement = document.getElementById('winnerTokenDisplay');
    this.tokenIcons = {
        'TROLL': 'https://s2.coinmarketcap.com/static/img/coins/64x64/36313.png',
        'AURA': 'https://s2.coinmarketcap.com/static/img/coins/64x64/31843.png',
        'FARTCOIN': 'https://s2.coinmarketcap.com/static/img/coins/64x64/33597.png',
        
        'DEFAULT': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png'
    };
    this.setupEventListeners();
  }
  getTokenIcon(tokenSymbol) {
      return this.tokenIcons[tokenSymbol] || this.tokenIcons['DEFAULT'];
  }
  setupEventListeners() {
      this.leaderboardElement.addEventListener('click', (event) => {
          const entry = event.target.closest('.snail-entry[data-username]');
          if (entry) {
              const username = entry.dataset.username;
              this.game.focusOnSnail(username);
          }
      });
  }
  update(raceManager, snails) {
    // Update race timer and status
    this.raceTimerElement.textContent = raceManager.getRaceStatus();
    const isRacing = raceManager.raceState === 'racing';
    this.raceUIElement.style.opacity = isRacing ? 0.7 : 1;
    this.leaderboardContainer.style.opacity = isRacing ? 0.7 : 1;
    this.chatBoxElement.style.opacity = isRacing ? 0.7 : 1;
    
    // Update race state message
    switch (raceManager.raceState) {
      case 'waiting':
        this.raceStatusElement.textContent = `Waiting for racers... (${snails.length} online)`;
        break;
      case 'countdown':
        this.raceStatusElement.textContent = 'Get ready! 🐌💨';
        break;
      case 'racing':
        this.raceStatusElement.textContent = 'Race is live!';
        break;
      case 'finished':
        this.raceStatusElement.textContent = 'Race finished! 🏆';
        break;
    }
    // Update Countdown display
    if (raceManager.raceState === 'countdown' || raceManager.raceState === 'finished') {
        this.countdownElement.style.display = 'block';
        const timerValue = Math.ceil(raceManager.raceTimer);
        const currentText = this.countdownElement.textContent;
        let newText;
        if (raceManager.raceState === 'countdown') {
            newText = timerValue > 0 ? timerValue.toString() : 'GO!';
        } else if (raceManager.raceState === 'finished') {
            newText = timerValue > 0 ? timerValue.toString() : 'NEXT RACE!';
        }
        if (currentText !== newText) {
            this.countdownElement.textContent = newText;
            // Reset animation
            this.countdownElement.style.animation = 'none';
            this.countdownElement.offsetHeight; /* trigger reflow */
            this.countdownElement.style.animation = '';
        }
    } else {
        this.countdownElement.style.display = 'none';
    }

    // Update leaderboard
    const leaderboard = raceManager.getLeaderboard();
    this.leaderboardElement.innerHTML = '';
    
    leaderboard.forEach((snail, index) => {
  const position = index + 1;
  const percentage = Math.floor(snail.progress * 100);
  const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🐌';
  const displayToken = snail.displayToken || snail.token;
  const iconUrl = this.getTokenIcon(displayToken);

  const entry = document.createElement('div');
  entry.className = 'snail-entry';
  entry.dataset.username = snail.username; // Add username for click handling
  entry.style.cursor = 'pointer'; // Indicate it's clickable
  entry.innerHTML = `
    <span class="leaderboard-name">
      <img src="${iconUrl}" class="token-icon">
      ${emoji} ${snail.username} (${displayToken})
    </span>
    <span>${percentage}%</span>
  `;

  // This highlight is no longer needed as there's no final winner state
  // if (raceManager.raceState === 'finished' && index === 0) {
  //   entry.style.background = 'rgba(255, 215, 0, 0.3)';
  //   entry.style.border = '1px solid gold';
  // }

  this.leaderboardElement.appendChild(entry);
});


    // Update queue display
    if (raceManager.raceState === 'waiting' || raceManager.raceState === 'countdown' || raceManager.raceState === 'finished') {
        const queueHeader = document.querySelector('#raceUI h4');
        if (queueHeader) {
            queueHeader.style.display = 'block';
            if (raceManager.raceState === 'finished') {
                queueHeader.textContent = 'Final Results';
            } else {
                queueHeader.textContent = 'In Queue';
            }
        }
        this.queueContentElement.style.display = 'block';
        this.queueContentElement.innerHTML = ''; // Clear previous entries
        raceManager.participants.forEach(p => {
            const entry = document.createElement('div');
            entry.className = 'snail-entry'; // Reuse style from leaderboard
            const displayToken = p.displayToken || p.token;
            const iconUrl = this.getTokenIcon(displayToken);
            entry.innerHTML = `<span class="queue-name"><img src="${iconUrl}" class="token-icon"> ${p.username} (${displayToken})</span>`;
            this.queueContentElement.appendChild(entry);
        });
    } else {
        const queueHeader = document.querySelector('#raceUI h4');
        if (queueHeader) queueHeader.style.display = 'none';
        this.queueContentElement.innerHTML = '';
        this.queueContentElement.style.display = 'none';
    }
  }
  addChatMessage(username, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const userSpan = document.createElement('span');
    userSpan.className = 'username';
    userSpan.textContent = `${username}: `;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    messageElement.appendChild(userSpan);
    messageElement.appendChild(messageSpan);
    
    this.chatMessagesElement.appendChild(messageElement);
    
    // Auto-scroll to the latest message
    this.chatMessagesElement.scrollTop = this.chatMessagesElement.scrollHeight;
  }

  showWinnerPopup(username, token) {
    this.winnerUsernameElement.textContent = `${username} (${token})`;
    this.winnerTokenElement.textContent = ``;
    this.winnerPopupElement.style.display = 'flex';
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      this.hideWinnerPopup();
    }, 4000);
  }

  hideWinnerPopup() {
    this.winnerPopupElement.style.display = 'none';
  }
}