## Zamanlayıcı v2.1.0

**İndir:** `Zamanlayici-2.1.0.exe` (kurulum gerektirmez, çift tıklayıp çalıştırın)

### Yenilikler
- 5 dil: Türkçe, English, Deutsch, Español, Français
- 4 tema: Sistem, Açık, Koyu, Siyah (OLED) + 5 vurgu rengi
- Her zaman üstte duran **mini sayaç**
- Belirli saat modunda **her gün tekrarla**
- Genel kısayollar: `Ctrl+Alt+Z` göster/gizle, `Ctrl+Alt+X` iptal
- GitHub üzerinden güncelleme denetimi (ayarlardan kapatılabilir)

### Bu dosyanın güvenli olduğunu nasıl doğrularım?
Bu exe, GitHub Actions tarafından bu depodaki açık kaynak koddan derlendi. Derleme kayıtları herkese açık.

```powershell
# 1) SHA-256 özetini SHA256SUMS.txt ile karşılaştırın
Get-FileHash .\Zamanlayici-2.1.0.exe -Algorithm SHA256

# 2) GitHub köken kanıtını doğrulayın (GitHub CLI gerekir)
gh attestation verify .\Zamanlayici-2.1.0.exe -R furkibayashi/zamanlayici
```

Ayrıntılar: [README → Güvenlik](https://github.com/furkibayashi/zamanlayici#guvenlik).

---

**English:** Portable Windows shutdown/restart/sleep/lock timer. Built from source by GitHub Actions with signed build provenance; verify with `gh attestation verify Zamanlayici-2.1.0.exe -R furkibayashi/zamanlayici`.
