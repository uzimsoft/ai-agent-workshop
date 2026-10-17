# Sipariş destek asistanı provası

Mevcut task-manager MCP kaydı aynı server.py dosyasını kullanır. Yeni sunucu kaydı gerekmez.
Dosyayı kaydettikten sonra VS Code'da Developer: Reload Window çalıştır ve yeni Codex sohbeti aç.

## Demo sınırları

Sipariş ve kargo verileri örnektir. Hesaplamalarda sabit 17 Ekim 2026 demo tarihi kullanılır;
böylece yarın ve daha sonraki provalarda senaryolar değişmez. Gerçek bugünün tarihi değildir.
Destek kayıtları gerçekten data/tickets.json dosyasına yazılır; şirket veya kargo sistemine iletilmez.
Tek yerel sunucu ve tek kullanıcı için eğitim örneğidir; üretim kullanımı için kimlik doğrulama ve veritabanı gerekir.

## Her yeni sohbetin başında

> Bir sipariş destek asistanısın. Yalnızca task-manager MCP araçlarıyla işlem yap; terminal veya doğrudan dosya okuma/yazma kullanma. Sipariş ve kargo verileri simülasyon, demo tarihi 17 Ekim 2026. Önce siparişi kontrol et, varsa kargoyu sorgula. Kullanıcı kayıt açılmasını isterse ve sipariş gecikmişse destek kaydı aç. Sipariş bulunamazsa doğru numarayı iste. Araç çıktısında olmayan bilgi uydurma. Destek kaydının yerel demo kaydı olduğunu belirt. Araçlara erişemiyorsan bunu söyle.

## Senaryolar

1. “1042 numaralı siparişim gelmedi. Kontrol et, gecikmişse destek kaydı aç.”
   Beklenen: get_order → get_shipment → create_support_ticket. SUP-0001 oluşturulur (ilk kayıtta).
2. Aynı isteği tekrarla. Beklenen: yeni kayıt yerine mevcut açık kayıt döner.
3. “1043 numaralı siparişimi kontrol et, gecikmişse destek kaydı aç.”
   Beklenen: sipariş ve kargo sorgulanır; gecikme yok, kayıt açılmaz.
4. “9999 numaralı siparişim nerede?”
   Beklenen: bulunamadığı açıklanır, doğru numara istenir, kayıt açılmaz.

Sadece cevabı değil araç çağrılarını da göster. Ardından data/tickets.json dosyasını açarak kalıcı sonucu göster.

## Anlatım

Python fonksiyonları veriyi getirir ve işlemi yapar. MCP, bu araçları Codex'e sunar.
Codex kullanıcı isteğini ve araç sonuçlarını değerlendirip sonraki aracı seçer.
Gecikme kuralı sunucuda da kontrol edilir; model yanlış araç seçse bile zamanında siparişe kayıt açılmaz.

## Kontrol

```powershell
.\.venv\Scripts\python.exe -m unittest test_support.py -v
```

Testler geçici klasör kullanır, gerçek demo kayıtlarına dokunmaz.
İlk başarılı prova sonrasında bağımlılıkları sabitlemek için:

```powershell
.\.venv\Scripts\python.exe -m pip freeze > requirements.txt
```
