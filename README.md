# Currency Converter

Frankfurter’ın referans kurlarıyla döviz çeviren ve kur geçmişini gösteren, tarayıcıda çalışan bir uygulama.

## Çalıştırma

İnternet bağlantısı olan güncel bir tarayıcıda `index.html` dosyasını aç. Kurulum, derleme veya API anahtarı gerekmez.

## Kullanım

1. Tutarı ve iki para birimini seç. Birim kur, kurun yayımlandığı tarih ve çevrilen tutar gösterilir.
2. **Para birimlerini değiştir** düğmesi kaynak ve hedefi ters çevirir.
3. Sağdaki dönem düğmeleriyle grafiği güncelle. **Kayıt seç** kaydırıcısını veya klavyenin ok tuşlarını kullanarak bir kaydın tarihini ve kurunu okuyabilirsin.

| Dönem | Gösterilen veri |
|---|---|
| 1G | Son yayımlanan günlük referans kur |
| 5G / 1A | Son 5 / 30 takvim günü içindeki günlük kayıtlar |
| 1Y | Son bir yıldaki haftalık kayıtlar |
| 5Y / Maks. | Son beş yıldaki / mevcut tüm geçmişteki aylık kayıtlar |

[Frankfurter v2](https://frankfurter.dev/) referans kurları yayımlar. Kapsam seçilen para birimlerine göre değişir. Geçmiş aralıklarının bitişi son yayımlanan kur tarihidir.

## Kontroller

Node.js 20 veya üzeriyle:

```sh
node --check app.js
node --check rates.js
node --check history.js
node --test
```

Testler dış ağa bağlanmadan çevirme, hata sonrası yeniden deneme, tarih aralıkları ve eski isteklerin yeni sonuçları değiştirmemesi gibi durumları doğrular.

## Dosyalar

- `index.html` ve `style.css` — mobil ve masaüstü arayüzü.
- `rates.js` — Frankfurter istekleri ve yanıt doğrulaması.
- `app.js` — dönüştürme ve para birimi seçimi.
- `history.js` — dönem seçimi, grafik ve kayıt inceleme.
