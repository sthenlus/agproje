# 🎯 Mastermind Sayı Oyunu - Çok Oyunculu WebSocket Oyunu

Ağ programlama projesi için geliştirilmiş, WebSocket tabanlı çok oyunculu bir sayı tahmin oyunudur. Klasik Mastermind oyunundan esinlenilerek 3 basamaklı sayılarla oynanır.

## 📋 Özellikler

### Oyun Mekanikleri
- **Çok Oyunculu**: Aynı anda birden fazla oyuncu oyuna katılabilir
- **Gerçek Zamanlı**: WebSocket protokolü ile anlık iletişim
- **3 Basamaklı Sayı**: 100-999 arası rastgele sayı tahmin etme
- **Mastermind Tarzı İpucu Sistemi**: 
  - 🟢 **Doğru rakam, doğru yerde**: Hem rakam hem de konumu doğru
  - 🟡 **Doğru rakam, yanlış yerde**: Rakam doğru ama farklı pozisyonda
  - Örnek: Hedef 456, Tahmin 465 → 🟢 1 (6 doğru yerde), 🟡 2 (4 ve 5 yanlış yerde)

### Maç ve Round Sistemi
- **Maç Yapısı**: Her maç 5 round'dan oluşur
- **Round Süresi**: Her round 60 saniye sürer
- **Otonom Başlangıç**: Maçlar otomatik olarak 45 saniyede bir başlar
- **Bekleme Mekaniği**: Yeni gelen oyuncu mevcut round'un bitmesini bekler
- **Süre Limiti**: Her round için 60 saniyelik geri sayım

### Puanlama Sistemi
Puan hesaplaması şu faktörlere göre yapılır:
- **Temel Puan**: 100 puan
- **Zaman Bonusu**: Kalan süreye göre 0-75 arası bonus puan
  - 60 saniyenin tamamını kullanan: +0 bonus
  - İlk 5 saniyede bilen: ~+45 bonus
  - Ne kadar erken tahmin ederseniz o kadar fazla puan! ⚡
- **Minimum Puan**: 50 puan garantisi
- **Maç Puanı**: Her round'da kazanılan puanların toplamı
- **Toplam Puan**: Tüm maçlarda kazanılan puanların genel toplamı

### İstatistikler
- ✅ Anlık round skoru
- 📊 Maç skoru (5 round toplamı)
- 🏆 Genel toplam skor
- 📈 Kazanılan round sayısı
- 📜 Detaylı tahmin geçmişi (🟢 ve 🟡 ile)
- ⏱️ Gerçek zamanlı geri sayım

### Arayüz
- 🎨 Modern ve kullanıcı dostu web arayüzü
- 📱 Responsive tasarım (mobil uyumlu)
- 🌈 Gradient renkler ve animasyonlar
- ⚡ Gerçek zamanlı güncelleme
- ⏰ Görsel geri sayım çubuğu
- 🔔 Bildirim mesajları
- 📊 Canlı liderlik tablosu

## 🚀 Kurulum

### Gereksinimler
- Node.js (v12 veya üzeri)
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Sunucuyu başlatın:**
```bash
npm start
```

veya

```bash
node server.js
```

3. **Tarayıcıdan erişin:**
```
http://localhost:8080
```

## 🎮 Nasıl Oynanır?

### Oyuna Katılma
1. Tarayıcınızda `http://localhost:8080` adresine gidin
2. İsminizi girin ve "Oyuna Katıl" butonuna tıklayın
3. Eğer bir maç devam ediyorsa, mevcut round'un bitmesini bekleyin

### Tahmin Yapma
1. 100-999 arası 3 basamaklı bir sayı girin
2. "Tahmin Et" butonuna tıklayın veya Enter tuşuna basın
3. İpuçlarına göre tahmininizi güncelleyin:
   - 🟢 sayısı: Kaç rakam doğru yerde
   - 🟡 sayısı: Kaç rakam doğru ama yanlış yerde
4. 60 saniye içinde doğru sayıyı bulmaya çalışın!

### Kazanma
- Doğru sayıyı tahmin edin
- Puanınız otomatik olarak hesaplanır (erken tahmin = fazla puan!)
- Round biter ve 5 saniye sonra yeni round başlar
- 5 round sonra maç biter
- 45 saniye sonra yeni maç otomatik başlar

## 🏗️ Teknik Detaylar

### Sunucu (server.js)
- **Node.js** ile geliştirilmiştir
- **ws** kütüphanesi ile WebSocket desteği
- HTTP server ile statik dosya sunumu
- Oyun durumu yönetimi
- Çok oyunculu eşzamanlı oyun desteği
- Otomatik maç zamanlayıcısı
- Round zamanlayıcısı ve süre yönetimi

### İstemci (client.html)
- Saf **HTML, CSS, JavaScript** (framework kullanılmamıştır)
- WebSocket istemcisi
- Responsive tasarım
- Gerçek zamanlı güncelleme
- Görsel geri sayım sistemi
- Mastermind tarzı ipucu gösterimi

### Protokol
WebSocket üzerinden JSON formatında mesajlaşma:

**İstemciden Sunucuya:**
```json
{
  "type": "setName",
  "name": "Oyuncu Adı"
}
```

```json
{
  "type": "guess",
  "guess": 456
}
```

**Sunucudan İstemciye:**
```json
{
  "type": "hint",
  "guess": 465,
  "result": {
    "correct": 1,
    "misplaced": 2,
    "isWin": false
  },
  "message": "🟢 1 doğru, 🟡 2 yanlış yerde"
}
```

```json
{
  "type": "correctGuess",
  "score": 145,
  "matchScore": 289,
  "totalScore": 1456
}
```

```json
{
  "type": "roundStart",
  "roundNumber": 3,
  "totalRounds": 5,
  "roundDuration": 30000
}
```

## 🌐 Ağ Mimarisi

### Sunucu
- **Port**: 8080 (varsayılan)
- **Protokol**: WebSocket (ws://)
- **HTTP Server**: Statik dosya sunumu için

### Çoklu Bilgisayar Desteği
- Sunucu bir bilgisayarda çalışır
- Aynı ağdaki diğer bilgisayarlar sunucunun IP adresi ile bağlanabilir
- Örnek: `http://192.168.1.100:8080`

### Yerel Test
Aynı bilgisayarda birden fazla tarayıcı penceresi açarak çok oyunculu testi yapabilirsiniz.

## 📊 Oyun Akışı

### Maç Döngüsü
```
Maç Başlangıcı (Otomatik, 45 saniyede bir)
    ↓
Round 1 Başlar (60 saniye)
    ↓
Oyuncular tahmin yapar
    ↓
Round biter → Skorlar hesaplanır
    ↓
5 saniye ara
    ↓
Round 2 Başlar
    ↓
... (3 round daha)
    ↓
Maç Biter → Sonuçlar gösterilir
    ↓
45 saniye geri sayım
    ↓
Yeni Maç Başlar
```

### Round Akışı
1. Round başlar (60 saniye)
2. Sunucu 100-999 arası rastgele bir sayı seçer
3. Oyuncular tahminlerini gönderir
4. Sunucu Mastermind tarzı ipuçları verir (🟢 🟡)
5. Doğru tahmin eden oyuncular puan kazanır
6. 60 saniye dolunca veya herkes bilince round biter
7. Skorlar güncellenir ve liderlik tablosu yenilenir

### Puan Örneği
```
Senaryo 1: Hızlı Tahmin
- 5. saniyede doğru bildi
- Kalan süre: 55 saniye
- Temel puan: 100
- Zaman bonusu: ~69
- Toplam: ~169 puan

Senaryo 2: Yavaş Tahmin
- 58. saniyede doğru bildi
- Kalan süre: 2 saniye
- Temel puan: 100
- Zaman bonusu: ~2
- Toplam: ~102 puan
```

## 🔧 Yapılandırma

`server.js` dosyasından değiştirebileceğiniz ayarlar:

```javascript
const PORT = 8080; // Sunucu portu
const MATCH_INTERVAL = 45000; // Maç arası süre (ms) - 45 saniye
const ROUND_DURATION = 60000; // Round süresi (ms) - 60 saniye
const ROUNDS_PER_MATCH = 5; // Her maçtaki round sayısı
const MIN_NUMBER = 100; // Minimum sayı
const MAX_NUMBER = 999; // Maksimum sayı
```

## 🎯 Mastermind İpucu Sistemi

### Nasıl Çalışır?
Oyun, klasik Mastermind mantığını kullanır:

**Örnek 1:**
- Hedef: `456`
- Tahmin: `465`
- Sonuç: 🟢 1 (6 doğru yerde), 🟡 2 (4 ve 5 var ama yanlış yerde)

**Örnek 2:**
- Hedef: `123`
- Tahmin: `321`
- Sonuç: 🟢 1 (2 doğru yerde), 🟡 2 (1 ve 3 var ama yanlış yerde)

**Örnek 3:**
- Hedef: `789`
- Tahmin: `123`
- Sonuç: 🟢 0, 🟡 0 (hiçbir rakam yok)

**Örnek 4:**
- Hedef: `555`
- Tahmin: `565`
- Sonuç: 🟢 2 (iki 5 doğru yerde), 🟡 0

### Strateji İpuçları
- İlk tahmininizle genel bir fikir edinin
- 🟢 ve 🟡 sayılarına dikkat edin
- Hangi rakamların doğru olduğunu not edin
- Rakamları farklı pozisyonlarda deneyin
- Zamana dikkat edin - erken tahmin daha fazla puan!

## 🐛 Sorun Giderme

**Bağlantı kurulamıyor:**
- Firewall ayarlarını kontrol edin
- Port 8080'in kullanımda olmadığından emin olun
- Sunucunun çalıştığından emin olun

**Sayfa yüklenmiyor:**
- `client.html` dosyasının proje klasöründe olduğundan emin olun
- Konsol loglarını kontrol edin

**WebSocket bağlantısı kesildi:**
- Sunucu otomatik olarak yeniden bağlanmayı dener
- Sunucunun aktif olduğundan emir olun

**Round'a katılamıyorum:**
- Mevcut round'un bitmesini bekleyin
- Yeni round başladığında otomatik olarak katılabilirsiniz

## 📝 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.

## 👨‍💻 Geliştirici Notları

### Kod Yapısı
- Temiz ve modüler kod yapısı
- Her fonksiyon açıklayıcı yorumlarla desteklenmiştir
- Modern JavaScript ES6+ özellikleri kullanılmıştır
- Güvenli ve performanslı yapı

### Önemli Fonksiyonlar

**Server.js:**
- `checkGuess()`: Mastermind mantığıyla tahmin kontrolü
- `calculateScore()`: Zaman bazlı puan hesaplama
- `startNewMatch()`: Otonom maç başlatma
- `startNewRound()`: Round başlatma ve zamanlayıcı
- `endRound()`: Round bitirme ve sonuç hesaplama

**Client.html:**
- `startTimer()`: Görsel geri sayım
- `addHistoryItem()`: Tahmin geçmişi gösterimi
- `updateLeaderboard()`: Canlı skor tablosu
- `handleMessage()`: WebSocket mesaj yönetimi

## 🎓 Öğrenim Hedefleri

Bu proje ile şunları öğrenebilirsiniz:
- ✅ WebSocket protokolü kullanımı
- ✅ Client-Server mimarisi
- ✅ Gerçek zamanlı iletişim
- ✅ Oyun durumu yönetimi (state management)
- ✅ Zamanlayıcı ve interval yönetimi
- ✅ Çok oyunculu oyun geliştirme
- ✅ Modern web arayüzü tasarımı
- ✅ Mastermind algoritması implementasyonu
- ✅ Otonom sistem döngüleri

## 🌟 Gelişmiş Özellikler

- **Otonom Maç Sistemi**: Oyun sürekli döngüde çalışır
- **Bekleme Mekaniği**: Geç katılan oyuncular için akıllı bekleme
- **Çoklu Skorlama**: Round/Maç/Toplam skor sistemi
- **Görsel Geri Sayım**: Renkli ve animasyonlu zamanlayıcı
- **Detaylı İstatistikler**: Oyuncu başına çoklu istatistik
- **Otomatik Yeniden Bağlanma**: Bağlantı kesildiğinde otomatik bağlan

---

**Keyifli oyunlar! 🎮🎯**
