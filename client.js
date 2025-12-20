let ws;
let playerId;
let playerName;
let timerInterval = null;
let roundEndTime = null;

// WebSocket bağlantısı kur
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ WebSocket bağlantısı kuruldu');
        updateConnectionStatus(true);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    ws.onclose = () => {
        console.log('❌ WebSocket bağlantısı kapandı');
        updateConnectionStatus(false);
        setTimeout(() => connect(), 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket hatası:', error);
    };
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const statusElGame = document.getElementById('connectionStatusGame');
    
    if (connected) {
        if (statusEl) {
            statusEl.className = 'connection-status connected';
            statusEl.textContent = '🟢 Sunucuya bağlı';
        }
        if (statusElGame) {
            statusElGame.className = 'connection-status connected';
            statusElGame.textContent = '🟢 Sunucuya bağlı';
        }
    } else {
        if (statusEl) {
            statusEl.className = 'connection-status disconnected';
            statusEl.textContent = '🔴 Sunucuyla bağlantı kesildi';
        }
        if (statusElGame) {
            statusElGame.className = 'connection-status disconnected';
            statusElGame.textContent = '🔴 Sunucuyla bağlantı kesildi';
        }
    }
}

function handleMessage(data) {
    console.log('Mesaj alındı:', data);

    switch (data.type) {
        case 'connected':
            playerId = data.playerId;
            showStatus(data.message, 'success');
            break;

        case 'nameSet':
            playerName = data.name;
            // Giriş ekranını gizle, oyun ekranını göster
            document.getElementById('nameSection').classList.add('hidden');
            document.getElementById('gameSection').classList.remove('hidden');
            // Container'ı normal moda çevir ve sidebar'ı göster
            document.getElementById('mainContainer').classList.remove('login-mode');
            document.getElementById('sidebarPanel').classList.remove('hidden');
            showStatus(data.message, 'success');
            break;

        case 'waitingForRound':
            showWaitingMessage(`⏳ Mevcut round devam ediyor...<br>Round ${data.currentRound}/${data.totalRounds} bitince katılabilirsiniz.`);
            break;

        case 'waitingForMatch':
            showWaitingMessage('⏳ Yeni maç başlamak üzere...');
            break;

        case 'matchStart':
            hideWaitingMessage();
            hideCountdown();
            document.getElementById('matchNumber').textContent = data.matchNumber;
            document.getElementById('totalRounds').textContent = data.totalRounds;
            showStatus(data.message, 'success');
            resetMatchStats();
            break;

        case 'roundStart':
            hideWaitingMessage();
            document.getElementById('currentRound').textContent = data.roundNumber;
            document.getElementById('totalRounds').textContent = data.totalRounds;
            showStatus(data.message, 'success');
            resetRoundStats();
            clearHistory();
            enableGuessing();
            startTimer(data.roundDuration);
            break;

        case 'hint':
            updateGuessCount(data.guessCount);
            addHistoryItem(data.guess, data.result, false);
            showStatus(data.message, 'warning');
            break;

        case 'correctGuess':
            updateGuessCount(data.guessCount);
            updateMatchScore(data.matchScore);
            updateTotalScore(data.totalScore);
            addHistoryItem(data.guess, data.result, true);
            showStatus(`🎉 DOĞRU! +${data.score} puan! Round tamamlandı!`, 'success');
            disableGuessing();
            break;

        case 'playerWonRound':
            showStatus(`🏆 ${data.playerName} round'u kazandı! (${data.guessCount} tahminde, +${data.score}p)`, 'success');
            break;

        case 'roundEnd':
            stopTimer();
            if (data.winners.length > 0) {
                const winnerText = data.winners.map(w => `${w.name} (+${w.score}p)`).join(', ');
                if (data.earlyEnd) {
                    showStatus(`🎉 Tüm oyuncular kazandı! Round erken bitti! Kazananlar: ${winnerText} | Doğru sayı: ${data.targetNumber}`, 'success');
                } else {
                    showStatus(`⏰ Round bitti! Kazananlar: ${winnerText} | Doğru sayı: ${data.targetNumber}`, 'success');
                }
            } else {
                showStatus(`⏰ Round bitti! Kimse bilеmedi. Doğru sayı: ${data.targetNumber}`, 'error');
            }
            disableGuessing();
            if (!data.hasMoreRounds) {
                showStatus('🏁 Maç tamamlandı! Sonuçlar bekleniyor...', 'success');
            }
            break;

        case 'matchEnd':
            showStatus(`🏁 Maç bitti! Yeni maç ${Math.ceil(data.nextMatchIn/1000)} saniye sonra başlayacak.`, 'success');
            showMatchResults(data.matchResults);
            break;

        case 'matchCountdown':
            showCountdown(data.remainingSeconds);
            break;

        case 'leaderboard':
            updateLeaderboard(data.leaderboard);
            break;

        case 'playerJoined':
            showStatus(`${data.playerName} oyuna katıldı! (Toplam: ${data.totalPlayers} oyuncu)`, 'success');
            break;

        case 'playerLeft':
            showStatus(`${data.playerName} oyundan ayrıldı.`, 'error');
            break;

        case 'error':
            showStatus(data.message, 'error');
            break;
    }
}

function showStatus(message, type = '') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.innerHTML = message;
    statusEl.className = 'status ' + type;
}

function showWaitingMessage(message) {
    const waitingEl = document.getElementById('waitingMessage');
    const waitingText = document.getElementById('waitingText');
    waitingText.innerHTML = message;
    waitingEl.classList.remove('hidden');
    document.getElementById('guessSection').classList.add('hidden');
    document.getElementById('timerContainer').classList.add('hidden');
}

function hideWaitingMessage() {
    document.getElementById('waitingMessage').classList.add('hidden');
    document.getElementById('guessSection').classList.remove('hidden');
}

function showCountdown(seconds) {
    const countdownEl = document.getElementById('countdownDisplay');
    const numberEl = document.getElementById('countdownNumber');
    numberEl.textContent = seconds;
    numberEl.style.animation = 'none';
    setTimeout(() => {
        numberEl.style.animation = 'countdownPulse 1s ease-in-out';
    }, 10);
    countdownEl.classList.remove('hidden');
}

function hideCountdown() {
    document.getElementById('countdownDisplay').classList.add('hidden');
}

function startTimer(duration) {
    roundEndTime = Date.now() + duration;
    document.getElementById('timerContainer').classList.remove('hidden');
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const remaining = Math.max(0, roundEndTime - Date.now());
        const seconds = Math.ceil(remaining / 1000);
        const percentage = (remaining / duration) * 100;
        
        const timerBar = document.getElementById('timerBar');
        const timerText = document.getElementById('timerText');
        
        timerBar.style.width = percentage + '%';
        timerText.textContent = seconds + 's';
        
        // Renk değişimi
        timerBar.className = 'timer-bar';
        if (percentage < 30) {
            timerBar.classList.add('danger');
        } else if (percentage < 50) {
            timerBar.classList.add('warning');
        }
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    document.getElementById('timerContainer').classList.add('hidden');
}

function joinGame() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();

    if (!name) {
        showStatus('Lütfen bir isim girin!', 'error');
        return;
    }

    ws.send(JSON.stringify({
        type: 'setName',
        name: name
    }));
}

function makeGuess() {
    const guessInput = document.getElementById('guessInput');
    const guess = parseInt(guessInput.value);

    if (isNaN(guess) || guess < 100 || guess > 999) {
        showStatus('Lütfen 100-999 arası geçerli bir 3 basamaklı sayı girin!', 'error');
        return;
    }

    ws.send(JSON.stringify({
        type: 'guess',
        guess: guess
    }));

    guessInput.value = '';
    guessInput.focus();
}

function enableGuessing() {
    const guessInput = document.getElementById('guessInput');
    guessInput.disabled = false;
    guessInput.value = ''; // Input'u temizle
    guessInput.focus();
    document.getElementById('guessBtn').disabled = false;
}

function disableGuessing() {
    document.getElementById('guessBtn').disabled = true;
    document.getElementById('guessInput').disabled = true;
}

function updateGuessCount(count) {
    document.getElementById('guessCount').textContent = count;
}

function updateMatchScore(score) {
    document.getElementById('matchScore').textContent = score;
}

function updateTotalScore(score) {
    document.getElementById('totalScore').textContent = score;
}

function resetRoundStats() {
    document.getElementById('guessCount').textContent = '0';
    document.getElementById('guessInput').value = ''; // Input'u temizle
}

function resetMatchStats() {
    document.getElementById('matchScore').textContent = '0';
    document.getElementById('guessCount').textContent = '0';
}

function addHistoryItem(guess, result, isCorrect) {
    const historyList = document.getElementById('historyList');
    const item = document.createElement('div');
    
    item.className = 'history-item' + (isCorrect ? ' correct' : '');
    
    const guessDiv = document.createElement('div');
    guessDiv.className = 'guess-number';
    guessDiv.textContent = guess.toString().padStart(3, '0');
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'guess-result';
    
    if (isCorrect) {
        resultDiv.innerHTML = '<span style="font-size: 2em;">🎉</span> <strong>DOĞRU!</strong>';
    } else {
        resultDiv.innerHTML = `
            <span class="result-badge green">🟢 ${result.correct}</span>
            <span class="result-badge yellow">🟡 ${result.misplaced}</span>
        `;
    }
    
    item.appendChild(guessDiv);
    item.appendChild(resultDiv);
    
    historyList.insertBefore(item, historyList.firstChild);
    
    // En fazla 15 tahmin göster
    if (historyList.children.length > 15) {
        historyList.removeChild(historyList.lastChild);
    }
}

function clearHistory() {
    document.getElementById('historyList').innerHTML = '';
}

function showMatchResults(results) {
    // Burada maç sonuçlarını gösterebilirsiniz
    console.log('Maç sonuçları:', results);
}

function updateLeaderboard(leaderboard) {
    const leaderboardEl = document.getElementById('leaderboard');
    
    if (leaderboard.length === 0) {
        leaderboardEl.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">Henüz oyuncu yok</li>';
        return;
    }

    leaderboardEl.innerHTML = leaderboard.map((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        return `
            <li class="leaderboard-item">
                <div class="player-info">
                    <span class="player-name">${medal} ${player.name}</span>
                    <span class="player-matches">Maç: ${player.matchScore}p | Round: ${player.roundsWon}🏆</span>
                </div>
                <span class="player-score">${player.totalScore}p</span>
            </li>
        `;
    }).join('');
}

// Enter tuşu ile tahmin yapma
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    document.getElementById('guessInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') makeGuess();
    });

    // 3 basamak kontrolü
    document.getElementById('guessInput').addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length > 3) {
            e.target.value = value.slice(0, 3);
        }
    });

    // Bağlantıyı başlat
    connect();
});

