# Güvenlik Politikası / Security Policy

## Desteklenen sürümler
Yalnızca [en son sürüm](https://github.com/furkibayashi/zamanlayici/releases/latest) güvenlik düzeltmesi alır.

## Güvenlik açığı bildirme
Lütfen güvenlik açıklarını herkese açık bir issue olarak **paylaşmayın**. Bunun yerine GitHub'ın
[özel güvenlik bildirimi](https://github.com/furkibayashi/zamanlayici/security/advisories/new) özelliğini kullanın.

## İndirdiğiniz dosyayı doğrulama
```powershell
gh attestation verify .\Zamanlayici-<sürüm>.exe -R furkibayashi/zamanlayici
Get-FileHash .\Zamanlayici-<sürüm>.exe -Algorithm SHA256   # SHA256SUMS.txt ile karşılaştırın
```

Yalnızca bu deponun **Releases** sayfasından indirilen dosyalar resmidir. Başka sitelerdeki kopyalara güvenmeyin.

---

Please report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/furkibayashi/zamanlayici/security/advisories/new).
Only files downloaded from this repository's Releases page are official; verify them with
`gh attestation verify <file> -R furkibayashi/zamanlayici`.
