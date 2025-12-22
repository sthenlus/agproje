const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// HTTP server oluştur (client dosyalarını sunmak için)
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'client.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Dosya okunamadı');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (req.url === '/client.js') {
    fs.readFile(path.join(__dirname, 'client.js'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Dosya okunamadı');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Sayfa bulunamadı');
  }
});

// WebSocket server oluştur
const wss = new WebSocket.Server({ server });

// Oyun sabitleri
const MATCH_INTERVAL = 45000; // 45 saniye (ms)
const ROUND_DURATION = 60000; // 60 saniye (ms)
const ROUNDS_PER_MATCH = 5;
const MIN_NUMBER = 100;
const MAX_NUMBER = 999;

// Oyun durumu
let gameState = {
  targetNumber: null,
  targetDigits: [], // [1, 2, 3] gibi
  isMatchActive: false,
  isRoundActive: false,
  matchStartTime: null,
  roundStartTime: null,
  roundEndTime: null,
  currentRound: 0,
  matchNumber: 0,
  players: new Map(), // playerId -> playerData
  roundScores: [], // Her round'un skorları
  matchTimer: null,
  roundTimer: null,
  nextMatchTimer: null
};

// Rastgele 3 basamaklı sayı üret (100-999 arası)
function generateRandomNumber() {
  const num = Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
  return {
    number: num,
    digits: num.toString().split('').map(d => parseInt(d))
  };
}

// Tahmin kontrolü - Mastermind tarzı
function checkGuess(guess, target) {
  const guessDigits = guess.toString().padStart(3, '0').split('').map(d => parseInt(d));
  const targetDigits = [...target];
  
  let correct = 0; // Doğru rakam doğru yerde (🟢)
  let misplaced = 0; // Doğru rakam yanlış yerde (🟡)
  
  const targetCopy = [...targetDigits];
  const guessCopy = [...guessDigits];
  
  // Önce tam eşleşmeleri bul (doğru rakam doğru yerde)
  for (let i = 0; i < 3; i++) {
    if (guessCopy[i] === targetCopy[i]) {
      correct++;
      guessCopy[i] = -1; // İşaretle
      targetCopy[i] = -2; // İşaretle
    }
  }
  
  // Sonra yanlış yerdeki doğru rakamları bul
  for (let i = 0; i < 3; i++) {
    if (guessCopy[i] !== -1) {
      const index = targetCopy.indexOf(guessCopy[i]);
      if (index !== -1) {
        misplaced++;
        targetCopy[index] = -2; // İşaretle
      }
    }
  }
  
  return { correct, misplaced, isWin: correct === 3 };
}

// Puan hesaplama
function calculateScore(guessTime, roundStartTime, roundDuration, guessCount) {
  const timeElapsed = guessTime - roundStartTime; // ms
  const timeRemaining = roundDuration - timeElapsed; // ms
  
  // Temel puan: 100
  let score = 100;
  
  // Zaman bonusu: Kalan süreye göre 0-75 arası bonus
  const timeBonus = Math.floor((timeRemaining / roundDuration) * 75);
  score += Math.max(0, timeBonus);
  
  // Tahmin sayısına göre puan çarpanı (az tahmin = daha fazla puan)
  // Daha gerçekçi aralıklar:
  // 1-5 tahmin: %100-%80 (her tahmin için %5 azalma)
  // 6-10 tahmin: %75-%55 (her tahmin için %4 azalma)
  // 11-15 tahmin: %50-%30 (her tahmin için %4 azalma)
  // 16+ tahmin: %30 (minimum)
  let guessMultiplier;
  if (guessCount <= 5) {
    // İlk 5 tahmin: %100'den %80'e kadar (her tahmin %5 azalır)
    guessMultiplier = 1 - (guessCount - 1) * 0.05; // 1=>100%, 2=>95%, 3=>90%, 4=>85%, 5=>80%
  } else if (guessCount <= 10) {
    // 6-10 tahmin: %75'ten %55'e kadar (her tahmin %4 azalır)
    guessMultiplier = 0.75 - (guessCount - 6) * 0.04; // 6=>75%, 7=>71%, 8=>67%, 9=>63%, 10=>59%
  } else if (guessCount <= 15) {
    // 11-15 tahmin: %50'den %30'a kadar (her tahmin %4 azalır)
    guessMultiplier = 0.50 - (guessCount - 11) * 0.04; // 11=>50%, 12=>46%, 13=>42%, 14=>38%, 15=>34%
  } else {
    // 16+ tahmin: %30 minimum
    guessMultiplier = 0.30;
  }
  
  score = Math.floor(score * guessMultiplier);
  
  // Minimum 50 puan garanti
  score = Math.max(score, 50);
  
  return score;
}

// Yeni maç başlat
function startNewMatch() {
  console.log(`\n🎮 ═══════════════════════════════════════`);
  console.log(`🏆 YENİ MAÇ BAŞLIYOR! Maç #${gameState.matchNumber + 1}`);
  console.log(`═══════════════════════════════════════\n`);
  
  gameState.isMatchActive = true;
  gameState.matchStartTime = Date.now();
  gameState.currentRound = 0;
  gameState.matchNumber++;
  gameState.roundScores = [];
  
  // Tüm oyuncuların maç skorlarını sıfırla
  gameState.players.forEach(p => {
    p.matchScore = 0;
    p.roundsWon = 0;
  });
  
  broadcast({
    type: 'matchStart',
    matchNumber: gameState.matchNumber,
    totalRounds: ROUNDS_PER_MATCH,
    message: `🏆 YENİ MAÇ BAŞLADI! (Maç #${gameState.matchNumber})`
  });
  
  // İlk round'u başlat
  setTimeout(() => startNewRound(), 2000);
}

// Yeni round başlat
function startNewRound() {
  if (gameState.currentRound >= ROUNDS_PER_MATCH) {
    endMatch();
    return;
  }
  
  gameState.currentRound++;
  const randomNum = generateRandomNumber();
  gameState.targetNumber = randomNum.number;
  gameState.targetDigits = randomNum.digits;
  gameState.isRoundActive = true;
  gameState.roundStartTime = Date.now();
  gameState.roundEndTime = gameState.roundStartTime + ROUND_DURATION;
  
  console.log(`\n🎯 Round ${gameState.currentRound}/${ROUNDS_PER_MATCH} başladı!`);
  console.log(`📊 Hedef sayı: ${gameState.targetNumber} [${gameState.targetDigits.join(', ')}]`);
  
  // Tüm oyuncuların round istatistiklerini sıfırla
  gameState.players.forEach(p => {
    p.roundScore = 0;
    p.guessCount = 0;
    p.hasWonRound = false;
    p.roundGuesses = [];
  });
  
  broadcast({
    type: 'roundStart',
    roundNumber: gameState.currentRound,
    totalRounds: ROUNDS_PER_MATCH,
    roundDuration: ROUND_DURATION,
    matchNumber: gameState.matchNumber,
    message: `🎯 Round ${gameState.currentRound}/${ROUNDS_PER_MATCH} başladı! 60 saniyeniz var!`
  });
  
  // Round zamanlayıcısı
  gameState.roundTimer = setTimeout(() => {
    endRound();
  }, ROUND_DURATION);
}

// Tüm aktif oyuncuların round'u kazanıp kazanmadığını kontrol et
function checkIfAllPlayersWon() {
  // İsmi olan aktif oyuncuları bul
  const activePlayers = Array.from(gameState.players.values()).filter(p => p.name && p.name.trim() !== '');
  
  // Eğer hiç aktif oyuncu yoksa, false döndür
  if (activePlayers.length === 0) return false;
  
  // Tüm aktif oyuncular kazandı mı?
  return activePlayers.every(p => p.hasWonRound);
}

// Round'u bitir
function endRound(earlyEnd = false) {
  if (!gameState.isRoundActive) return;
  
  gameState.isRoundActive = false;
  clearTimeout(gameState.roundTimer);
  
  if (earlyEnd) {
    console.log(`\n🎉 Round ${gameState.currentRound} erken bitti! Tüm oyuncular kazandı!`);
  } else {
    console.log(`\n⏰ Round ${gameState.currentRound} süresi doldu!`);
  }
  console.log(`✅ Doğru sayı: ${gameState.targetNumber}\n`);
  
  // Round kazananlarını belirle
  const roundWinners = [];
  gameState.players.forEach(p => {
    if (p.hasWonRound) {
      roundWinners.push({
        name: p.name,
        score: p.roundScore,
        guesses: p.guessCount
      });
    }
  });
  
  // Round skorlarını kaydet
  gameState.roundScores.push({
    roundNumber: gameState.currentRound,
    targetNumber: gameState.targetNumber,
    winners: roundWinners
  });
  
  broadcast({
    type: 'roundEnd',
    roundNumber: gameState.currentRound,
    targetNumber: gameState.targetNumber,
    winners: roundWinners,
    hasMoreRounds: gameState.currentRound < ROUNDS_PER_MATCH,
    earlyEnd: earlyEnd
  });
  
  // Skor tablosunu güncelle
  broadcastLeaderboard();
  
  // Bir sonraki round'u başlat veya maçı bitir
  if (gameState.currentRound < ROUNDS_PER_MATCH) {
    setTimeout(() => startNewRound(), 5000);
  } else {
    setTimeout(() => endMatch(), 5000);
  }
}

// Maçı bitir
function endMatch() {
  gameState.isMatchActive = false;
  
  console.log(`\n🏁 ═══════════════════════════════════════`);
  console.log(`🏆 MAÇ BİTTİ! (Maç #${gameState.matchNumber})`);
  console.log(`═══════════════════════════════════════\n`);
  
  // Maç kazananını belirle
  const matchResults = Array.from(gameState.players.values())
    .filter(p => p.name)
    .map(p => ({
      name: p.name,
      matchScore: p.matchScore,
      roundsWon: p.roundsWon,
      totalScore: p.totalScore
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
  
  // Toplam skorları güncelle
  gameState.players.forEach(p => {
    p.totalScore += p.matchScore;
  });
  
  broadcast({
    type: 'matchEnd',
    matchNumber: gameState.matchNumber,
    matchResults: matchResults,
    nextMatchIn: MATCH_INTERVAL
  });
  
  // Skor tablosunu güncelle
  broadcastLeaderboard();
  
  // Sonraki maç zamanlayıcısı
  const waitTime = MATCH_INTERVAL;
  gameState.nextMatchTimer = setTimeout(() => {
    if (gameState.players.size > 0) {
      startNewMatch();
    }
  }, waitTime);
  
  // Geri sayım yayını
  broadcastMatchCountdown(waitTime);
}

// Maç geri sayımı
function broadcastMatchCountdown(totalTime) {
  const interval = 1000; // Her saniye
  let remaining = totalTime;
  
  const countdown = setInterval(() => {
    remaining -= interval;
    
    if (remaining <= 0 || gameState.isMatchActive) {
      clearInterval(countdown);
      return;
    }
    
    broadcast({
      type: 'matchCountdown',
      remainingSeconds: Math.ceil(remaining / 1000)
    });
  }, interval);
}

// Tüm bağlı clientlara mesaj gönder
function broadcast(data, excludeClient = null) {
  wss.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Skor tablosunu güncelle ve gönder
function broadcastLeaderboard() {
  const leaderboard = Array.from(gameState.players.values())
    .filter(p => p.name)
    .map(p => ({
      name: p.name,
      totalScore: p.totalScore,
      matchScore: p.matchScore,
      roundsWon: p.roundsWon
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
  
  broadcast({
    type: 'leaderboard',
    leaderboard: leaderboard
  });
}

// WebSocket bağlantıları
wss.on('connection', (ws) => {
  console.log('✅ Yeni oyuncu bağlandı');
  
  const playerId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Oyuncu verilerini başlat
  const playerData = {
    id: playerId,
    name: '',
    ws: ws,
    totalScore: 0,
    matchScore: 0,
    roundScore: 0,
    guessCount: 0,
    hasWonRound: false,
    roundsWon: 0,
    roundGuesses: []
  };
  
  gameState.players.set(playerId, playerData);
  ws.playerId = playerId;
  
  // Hoş geldin mesajı gönder
  ws.send(JSON.stringify({
    type: 'connected',
    playerId: playerId,
    message: 'Sunucuya bağlandınız! Lütfen isminizi girin.'
  }));
  
  // Mesaj alma
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const player = gameState.players.get(playerId);
      
      if (!player) return;
      
      switch (data.type) {
        case 'setName':
          player.name = data.name || `Oyuncu${playerId.substr(0, 4)}`;
          console.log(`👤 ${player.name} oyuna katıldı`);
          
          ws.send(JSON.stringify({
            type: 'nameSet',
            name: player.name,
            message: `Hoş geldin ${player.name}!`
          }));
          
          // Mevcut oyun durumunu gönder
          if (gameState.isMatchActive) {
            if (gameState.isRoundActive) {
              ws.send(JSON.stringify({
                type: 'waitingForRound',
                currentRound: gameState.currentRound,
                totalRounds: ROUNDS_PER_MATCH,
                remainingTime: gameState.roundEndTime - Date.now(),
                message: `Mevcut round devam ediyor. Round ${gameState.currentRound}/${ROUNDS_PER_MATCH} bitince katılabilirsiniz.`
              }));
            }
          } else {
            // Maç aktif değil, ne kadar süre kaldığını gönder
            const timeSinceMatchEnd = Date.now() - (gameState.matchStartTime || Date.now());
            const nextMatchIn = Math.max(0, MATCH_INTERVAL - timeSinceMatchEnd);
            
            ws.send(JSON.stringify({
              type: 'waitingForMatch',
              nextMatchIn: nextMatchIn,
              message: `Yeni maç başlamak üzere...`
            }));
          }
          
          // Mevcut oyuncuları bilgilendir
          broadcast({
            type: 'playerJoined',
            playerName: player.name,
            totalPlayers: gameState.players.size
          });
          
          // Liderlik tablosunu gönder
          broadcastLeaderboard();
          
          // Eğer hiç maç başlamamışsa ve oyuncu varsa, ilk maçı başlat
          if (!gameState.isMatchActive && gameState.matchNumber === 0) {
            setTimeout(() => startNewMatch(), 3000);
          }
          break;
        
        case 'guess':
          if (!gameState.isRoundActive) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Şu anda aktif bir round yok. Lütfen bekleyin.'
            }));
            return;
          }
          
          if (!player.name) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Önce isminizi girmelisiniz.'
            }));
            return;
          }
          
          if (player.hasWonRound) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Bu round\'u zaten kazandınız! Sonraki round\'u bekleyin.'
            }));
            return;
          }
          
          const guess = parseInt(data.guess);
          
          if (isNaN(guess) || guess < MIN_NUMBER || guess > MAX_NUMBER) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Lütfen ${MIN_NUMBER}-${MAX_NUMBER} arası geçerli bir sayı girin.`
            }));
            return;
          }
          
          player.guessCount++;
          const guessTime = Date.now();
          const result = checkGuess(guess, gameState.targetDigits);
          
          // Tahmin geçmişine ekle
          player.roundGuesses.push({
            guess: guess,
            correct: result.correct,
            misplaced: result.misplaced,
            time: guessTime
          });
          
          if (result.isWin) {
            // KAZANDI!
            const score = calculateScore(guessTime, gameState.roundStartTime, ROUND_DURATION, player.guessCount);
            
            player.roundScore = score;
            player.matchScore += score;
            player.hasWonRound = true;
            player.roundsWon++;
            
            console.log(`🎯 ${player.name} doğru tahmin etti! Puan: ${score} (${player.guessCount} tahminde)`);
            
            ws.send(JSON.stringify({
              type: 'correctGuess',
              guess: guess,
              result: result,
              score: score,
              matchScore: player.matchScore,
              totalScore: player.totalScore + player.matchScore,
              guessCount: player.guessCount,
              guessHistory: player.roundGuesses
            }));
            
            // Diğer oyunculara bildir
            broadcast({
              type: 'playerWonRound',
              playerName: player.name,
              score: score,
              guessCount: player.guessCount
            }, ws);
            
            // Liderlik tablosunu güncelle
            broadcastLeaderboard();
            
            // Tüm aktif oyuncular kazandı mı kontrol et
            if (checkIfAllPlayersWon()) {
              console.log(`\n🎉 Tüm oyuncular round'u kazandı! Round erken bitiyor...`);
              // Kısa bir gecikme sonrası round'u bitir (diğer oyunculara bildirim gönderilsin)
              setTimeout(() => {
                endRound(true);
              }, 1000);
            }
            
          } else {
            // Yanlış tahmin - ipucu ver
            ws.send(JSON.stringify({
              type: 'hint',
              guess: guess,
              result: result,
              message: `🟢 ${result.correct} doğru, 🟡 ${result.misplaced} yanlış yerde`,
              guessCount: player.guessCount,
              guessHistory: player.roundGuesses,
              remainingTime: gameState.roundEndTime - Date.now()
            }));
          }
          break;
        
        default:
          console.log('Bilinmeyen mesaj tipi:', data.type);
      }
    } catch (error) {
      console.error('Mesaj işleme hatası:', error);
    }
  });
  
  // Bağlantı kopunca
  ws.on('close', () => {
    const player = gameState.players.get(playerId);
    if (player) {
      console.log(`❌ ${player.name || 'Oyuncu'} ayrıldı`);
      
      broadcast({
        type: 'playerLeft',
        playerName: player.name || 'Bir oyuncu',
        totalPlayers: gameState.players.size - 1
      });
      
      gameState.players.delete(playerId);
      
      // Liderlik tablosunu güncelle
      broadcastLeaderboard();
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket hatası:', error);
  });
});

// Server'ı başlat
server.listen(PORT, () => {
  console.log(`\n🚀 ═══════════════════════════════════════`);
  console.log(`📡 Server çalışıyor: http://localhost:${PORT}`);
  console.log(`🎮 WebSocket servisi aktif`);
  console.log(`⏱️  Maç süresi: ${MATCH_INTERVAL/1000}sn`);
  console.log(`⏳ Round süresi: ${ROUND_DURATION/1000}sn`);
  console.log(`🎯 Round sayısı: ${ROUNDS_PER_MATCH}`);
  console.log(`🔢 Sayı aralığı: ${MIN_NUMBER}-${MAX_NUMBER}`);
  console.log(`═══════════════════════════════════════\n`);
});
