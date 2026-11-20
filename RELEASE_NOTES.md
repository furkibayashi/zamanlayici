## Zamanlayıcı v2.2.0

**İndir:** `Zamanlayici-2.2.0.exe` (kurulum gerektirmez, çift tıklayıp çalıştırın)

### Yenilikler
- 📱 **Telefondan kontrol:** Ayarlar → Telefondan kontrol'ü açın, QR kodu aynı Wi-Fi'deki telefonunuzla okutun. Telefon tarayıcısından eylem seçin, süreyi yazın, başlatın, erteleyin veya iptal edin. Uygulama indirmeye gerek yok.
  - Varsayılan olarak kapalı; yalnızca yerel ağda çalışır, internete bir şey göndermez.
  - Her istek QR koddaki rastgele bağlantı anahtarını ister; "Yeni bağlantı kodu" eski bağlantıları geçersiz kılar.
  - İlk açılışta Windows güvenlik duvarı sorarsa yalnızca **Özel ağlar** için izin verin.
- ⌨️ **Sayıları elle yazın:** Kadrandaki saat/dakikaya tıklayıp doğrudan yazın. `Tab` saat ile dakika arasında geçer, `Enter` onaylar, `Esc` vazgeçer. Seçili moda göre sınırlar uygulanır (ör. dakikaya 90 yazarsanız 1 sa 30 dk olur).

### Bu dosyanın güvenli olduğunu nasıl doğrularım?
Bu exe, GitHub Actions tarafından bu depodaki açık kaynak koddan derlendi. Derleme kayıtları herkese açık.

```powershell
Get-FileHash .\Zamanlayici-2.2.0.exe -Algorithm SHA256          # SHA256SUMS.txt ile karşılaştırın
gh attestation verify .\Zamanlayici-2.2.0.exe -R furkibayashi/zamanlayici
```

Ayrıntılar: [README → Güvenlik](https://github.com/furkibayashi/zamanlayici#guvenlik).

---

**English:** New in 2.2.0 — opt-in phone remote over your local Wi-Fi (scan a QR code, no app needed) and type-in numbers on the dial. Built from source by GitHub Actions with signed build provenance; verify with `gh attestation verify Zamanlayici-2.2.0.exe -R furkibayashi/zamanlayici`.
