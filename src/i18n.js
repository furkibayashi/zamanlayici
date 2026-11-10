/* Ortak dil dosyası: hem ana süreç (require) hem arayüz (<script>) kullanır. */
(function (root) {
  'use strict';

  const LANGS = { tr: 'Türkçe', en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français' };
  const LOCALES = { tr: 'tr-TR', en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };

  const dict = {
    // ===================================================================== TR
    tr: {
      'app.name': 'Zamanlayıcı',
      'state.ready': 'Hazır', 'state.running': 'Çalışıyor', 'state.paused': 'Duraklatıldı', 'state.warning': 'Son uyarı', 'state.watching': 'İzleniyor',

      'action.shutdown': 'Kapat', 'action.restart': 'Yeniden başlat', 'action.sleep': 'Uyku',
      'action.hibernate': 'Hazırda beklet', 'action.logoff': 'Oturumu kapat', 'action.lock': 'Kilitle',
      'short.shutdown': 'Kapat', 'short.restart': 'Yeniden\nbaşlat', 'short.sleep': 'Uyku',
      'short.hibernate': 'Hazırda\nbeklet', 'short.logoff': 'Oturumu\nkapat', 'short.lock': 'Kilitle',
      'will.shutdown': 'Bilgisayar kapatılacak', 'will.restart': 'Bilgisayar yeniden başlatılacak', 'will.sleep': 'Bilgisayar uyku moduna geçecek',
      'will.hibernate': 'Bilgisayar hazırda bekletilecek', 'will.logoff': 'Oturum kapatılacak', 'will.lock': 'Bilgisayar kilitlenecek',
      'past.shutdown': 'Kapatıldı', 'past.restart': 'Yeniden başlatıldı', 'past.sleep': 'Uykuya alındı',
      'past.hibernate': 'Hazırda bekletildi', 'past.logoff': 'Oturum kapatıldı', 'past.lock': 'Kilitlendi',

      'unit.h': 'sa', 'unit.m': 'dk',
      'fmt.hm': '{h} sa {m} dk', 'fmt.h': '{h} saat', 'fmt.m': '{m} dk', 'fmt.s': '{s} sn',
      'desc.after': '{d} sonra', 'desc.at': 'Saat {t}', 'desc.idle': '{n} dk boşta kalınca', 'desc.daily': 'her gün',

      'section.what': 'Ne yapılsın?',
      'mode.duration': 'Süre sonra', 'mode.clock': 'Belirli saatte', 'mode.idle': 'Boşta kalınca',
      'sub.around': '{day} <b>{time}</b> civarında', 'sub.pick': 'Bir süre seçin', 'sub.in': '{day} · <b>{d}</b> sonra',
      'sub.idle': 'boyunca fare/klavye kullanılmazsa', 'sub.idleRun': 'boşta · hedef <b>{n} dk</b>',
      'sub.paused': 'Duraklatıldı', 'sub.end': 'Bitiş · {day} <b>{time}</b>', 'sub.nextDaily': 'Her gün · sonraki {day} <b>{time}</b>',
      'day.today': 'Bugün', 'day.tomorrow': 'Yarın', 'day.yesterday': 'Dün',
      'repeat.daily': 'Her gün tekrarla',

      'btn.start': 'Zamanlayıcıyı başlat', 'btn.startIdle': 'İzlemeyi başlat', 'btn.cancel': 'İptal et',
      'btn.pause': 'Duraklat', 'btn.resume': 'Devam et', 'btn.savePreset': 'Ön ayar olarak kaydet',
      'btn.new': 'Yeni', 'btn.clear': 'Temizle', 'btn.quit': 'Uygulamadan çık', 'btn.save': 'Kaydet',
      'btn.dismiss': 'Vazgeç', 'btn.min': 'Küçült', 'btn.close': 'Kapat', 'btn.reset': 'Sıfırla', 'btn.mini': 'Mini sayaç',
      'hint.dial': 'Kadranı sürükleyin, fare tekerleğini kullanın veya ↑ ↓ tuşlarına basın',

      'nav.timer': 'Zamanlayıcı', 'nav.presets': 'Ön ayarlar', 'nav.history': 'Geçmiş', 'nav.settings': 'Ayarlar',

      'presets.title': 'Ön ayarlar', 'presets.desc': 'Sık kullandığınız zamanlayıcıları tek dokunuşla başlatın.',
      'presets.empty': 'Henüz ön ayar yok.<br>Zamanlayıcı ekranındaki yer imi simgesiyle ekleyin.',
      'presets.load': 'Zamanlayıcıya yükle', 'presets.play': 'Hemen başlat', 'presets.delete': 'Sil', 'presets.placeholder': 'Örn. Film gecesi',
      'history.title': 'Geçmiş', 'history.desc': 'Son zamanlayıcılarınız ve sonuçları.', 'history.empty': 'Geçmiş boş.',
      'stat.total': 'Toplam', 'stat.executed': 'Uygulanan', 'stat.other': 'İptal / atlanan',
      'result.executed': 'Uygulandı', 'result.cancelled': 'İptal', 'result.missed': 'Atlandı', 'result.handoff': 'Windows\'a devredildi',

      'settings.title': 'Ayarlar', 'settings.desc': 'Uygulamayı kendinize göre düzenleyin.',
      'grp.appearance': 'Görünüm', 'grp.warnings': 'Uyarılar', 'grp.behavior': 'Davranış', 'grp.shortcuts': 'Kısayollar', 'grp.about': 'Hakkında',
      'set.language': 'Dil', 'set.languageDesc': 'Arayüz ve bildirim dili',
      'set.theme': 'Tema', 'set.themeDesc': 'Açık, koyu veya sistem',
      'theme.system': 'Sistem', 'theme.dark': 'Koyu', 'theme.light': 'Açık', 'theme.oled': 'Siyah',
      'set.accent': 'Vurgu rengi', 'set.accentDesc': 'Arayüzün ana rengi',
      'set.warning': 'Son uyarı penceresi', 'set.warningDesc': 'Eylemden önce iptal/erteleme şansı',
      'set.notify': 'Önceden bildirim', 'set.notifyDesc': 'Windows bildirimi ile hatırlat', 'off': 'Kapalı',
      'set.sound': 'Sesli uyarı', 'set.soundDesc': 'Son saniyelerde bip sesi',
      'set.force': 'Uygulamaları zorla kapat', 'set.forceDesc': 'Kaydedilmemiş işler kaybolabilir',
      'set.tray': 'Kapatınca tepsiye küçült', 'set.trayDesc': 'Zamanlayıcı arka planda çalışmaya devam eder',
      'set.startup': 'Windows ile başlat', 'set.startupDesc': 'Tepside sessizce açılır (her gün tekrar için gerekli)',
      'set.mini': 'Mini sayacı otomatik göster', 'set.miniDesc': 'Başlayınca her zaman üstte küçük bir sayaç açılır',
      'set.global': 'Genel kısayollar', 'set.globalDesc': 'Ctrl+Alt+Z göster/gizle · Ctrl+Alt+X iptal',
      'set.updates': 'Güncellemeleri denetle', 'set.updatesDesc': 'Açılışta GitHub\'da yeni sürüm var mı bakar',
      'about.source': 'Kaynak kodu', 'about.version': 'Sürüm {v}', 'about.dry': 'deneme modu', 'about.check': 'Güncelleme denetle',
      'about.checking': 'Denetleniyor…', 'about.upToDate': 'En güncel sürümü kullanıyorsunuz', 'about.newVersion': 'Yeni sürüm hazır: {v}',
      'about.checkFailed': 'Denetlenemedi (internet yok mu?)', 'about.license': 'Açık kaynak · MIT lisansı',
      'kbd.start': 'Başlat', 'kbd.cancel': 'İptal et', 'kbd.action': 'Eylem seç', 'kbd.adjust': '±1 dk', 'kbd.shift': '(Shift ±10)',

      'toast.started': '{action} zamanlayıcısı başladı', 'toast.cancelled': 'Zamanlayıcı iptal edildi', 'toast.pickDuration': 'Önce bir süre seçin',
      'toast.added': '{n} dakika eklendi', 'toast.presetSaved': 'Ön ayar kaydedildi', 'toast.presetStarted': 'Ön ayar başlatıldı',
      'toast.presetDeleted': 'Ön ayar silindi', 'toast.historyCleared': 'Geçmiş temizlendi',
      'modal.title': 'Ön ayar olarak kaydet',

      'warn.desc': 'Açık işlerinizi kaydedin ya da erteleyin.', 'warn.descIdle': 'Uzun süredir hareket yok. Fareyi oynatmanız da iptal eder.',
      'warn.seconds': 'saniye içinde', 'warn.snooze': '10 dk ertele', 'warn.backToWait': 'Beklemeye dön', 'warn.now': 'Şimdi', 'warn.nowTitle': 'Hemen uygula',
      'mini.open': 'Pencereyi aç', 'mini.idle': 'boşta',

      'n.cancelled': 'Zamanlayıcı iptal edildi', 'n.missedTitle': 'Zamanlayıcı atlandı',
      'n.missedBody': 'Bilgisayar bu sırada uykudaydı; eylem güvenlik için uygulanmadı.',
      'n.leftTitle': '{n} dakika kaldı', 'n.leftBody': '{will}. Ertelemek için tıklayın.',
      'n.activityTitle': 'Hareket algılandı', 'n.activityBody': 'Boşta kalma sayacı sıfırlandı, izlemeye devam ediliyor.',
      'n.trayTitle': 'Arka planda çalışıyor', 'n.trayBody': 'Zamanlayıcı sistem tepsisinde. Tamamen kapatmak için tepsi simgesine sağ tıklayın.',
      'n.startedTitle': 'Zamanlayıcı başladı', 'n.presetStarted': '"{name}" başladı', 'n.presetFailed': 'Ön ayar başlatılamadı',
      'n.updateTitle': 'Yeni sürüm: {v}', 'n.updateBody': 'Zamanlayıcı\'nın yeni sürümü yayında. İndirmek için tıklayın.',

      'tray.show': 'Zamanlayıcıyı göster', 'tray.snooze': '{n} dakika ertele', 'tray.quick': 'Hızlı başlat',
      'tray.quickItem': '{d} sonra: {action}', 'tray.presets': 'Ön ayarlar', 'tray.quit': 'Çıkış',
      'tip.ready': '{app} — hazır', 'tip.remaining': 'Kalan: {time}', 'tip.paused': '(duraklatıldı)',

      'q.title': 'Zamanlayıcı aktif', 'q.message': 'Aktif bir zamanlayıcı var.',
      'q.detailHandoff': 'Windows\'a devrederseniz uygulama kapansa bile bilgisayar zamanında kapanır (uyarı penceresi ve erteleme olmadan).',
      'q.detailCancel': 'Çıkarsanız zamanlayıcı iptal edilecek.',
      'q.handoff': 'Windows\'a devret ve çık', 'q.cancelQuit': 'İptal et ve çık', 'q.back': 'Vazgeç',

      'err.invalid': 'Geçersiz ayar', 'err.duration': 'Süre 1 sn ile 7 gün arasında olmalı', 'err.time': 'Geçersiz saat',
      'err.idle': 'Boşta süresi 1 dk ile 24 saat arasında olmalı', 'err.notFound': 'Ön ayar bulunamadı',
      'preset.film': 'Film gecesi', 'preset.music': 'Uyurken müzik', 'preset.midnight': 'Gece yarısı', 'preset.download': 'İndirme bitince',
    },

    // ===================================================================== EN
    en: {
      'app.name': 'Shutdown Timer',
      'state.ready': 'Ready', 'state.running': 'Running', 'state.paused': 'Paused', 'state.warning': 'Final warning', 'state.watching': 'Watching',

      'action.shutdown': 'Shut down', 'action.restart': 'Restart', 'action.sleep': 'Sleep',
      'action.hibernate': 'Hibernate', 'action.logoff': 'Sign out', 'action.lock': 'Lock',
      'short.shutdown': 'Shut\ndown', 'short.restart': 'Restart', 'short.sleep': 'Sleep',
      'short.hibernate': 'Hibernate', 'short.logoff': 'Sign\nout', 'short.lock': 'Lock',
      'will.shutdown': 'Your PC will shut down', 'will.restart': 'Your PC will restart', 'will.sleep': 'Your PC will go to sleep',
      'will.hibernate': 'Your PC will hibernate', 'will.logoff': 'You will be signed out', 'will.lock': 'Your PC will be locked',
      'past.shutdown': 'Shut down', 'past.restart': 'Restarted', 'past.sleep': 'Put to sleep',
      'past.hibernate': 'Hibernated', 'past.logoff': 'Signed out', 'past.lock': 'Locked',

      'unit.h': 'h', 'unit.m': 'min',
      'fmt.hm': '{h} h {m} min', 'fmt.h': '{h} h', 'fmt.m': '{m} min', 'fmt.s': '{s} s',
      'desc.after': 'in {d}', 'desc.at': 'at {t}', 'desc.idle': 'after {n} min idle', 'desc.daily': 'daily',

      'section.what': 'What should happen?',
      'mode.duration': 'After', 'mode.clock': 'At time', 'mode.idle': 'When idle',
      'sub.around': '{day} around <b>{time}</b>', 'sub.pick': 'Pick a duration', 'sub.in': '{day} · in <b>{d}</b>',
      'sub.idle': 'without mouse/keyboard input', 'sub.idleRun': 'idle · target <b>{n} min</b>',
      'sub.paused': 'Paused', 'sub.end': 'Ends · {day} <b>{time}</b>', 'sub.nextDaily': 'Daily · next {day} <b>{time}</b>',
      'day.today': 'Today', 'day.tomorrow': 'Tomorrow', 'day.yesterday': 'Yesterday',
      'repeat.daily': 'Repeat every day',

      'btn.start': 'Start timer', 'btn.startIdle': 'Start watching', 'btn.cancel': 'Cancel',
      'btn.pause': 'Pause', 'btn.resume': 'Resume', 'btn.savePreset': 'Save as preset',
      'btn.new': 'New', 'btn.clear': 'Clear', 'btn.quit': 'Quit app', 'btn.save': 'Save',
      'btn.dismiss': 'Cancel', 'btn.min': 'Minimize', 'btn.close': 'Close', 'btn.reset': 'Reset', 'btn.mini': 'Mini timer',
      'hint.dial': 'Drag the dial, use the mouse wheel or press ↑ ↓',

      'nav.timer': 'Timer', 'nav.presets': 'Presets', 'nav.history': 'History', 'nav.settings': 'Settings',

      'presets.title': 'Presets', 'presets.desc': 'Start the timers you use most with one click.',
      'presets.empty': 'No presets yet.<br>Add one with the bookmark icon on the timer screen.',
      'presets.load': 'Load into timer', 'presets.play': 'Start now', 'presets.delete': 'Delete', 'presets.placeholder': 'e.g. Movie night',
      'history.title': 'History', 'history.desc': 'Your recent timers and how they ended.', 'history.empty': 'History is empty.',
      'stat.total': 'Total', 'stat.executed': 'Executed', 'stat.other': 'Cancelled / skipped',
      'result.executed': 'Executed', 'result.cancelled': 'Cancelled', 'result.missed': 'Skipped', 'result.handoff': 'Handed to Windows',

      'settings.title': 'Settings', 'settings.desc': 'Make the app your own.',
      'grp.appearance': 'Appearance', 'grp.warnings': 'Warnings', 'grp.behavior': 'Behaviour', 'grp.shortcuts': 'Shortcuts', 'grp.about': 'About',
      'set.language': 'Language', 'set.languageDesc': 'Interface and notification language',
      'set.theme': 'Theme', 'set.themeDesc': 'Light, dark or system',
      'theme.system': 'System', 'theme.dark': 'Dark', 'theme.light': 'Light', 'theme.oled': 'Black',
      'set.accent': 'Accent colour', 'set.accentDesc': 'Main colour of the interface',
      'set.warning': 'Final warning window', 'set.warningDesc': 'A last chance to cancel or snooze',
      'set.notify': 'Early notification', 'set.notifyDesc': 'Remind me with a Windows notification', 'off': 'Off',
      'set.sound': 'Sound', 'set.soundDesc': 'Beep during the last seconds',
      'set.force': 'Force-close apps', 'set.forceDesc': 'Unsaved work may be lost',
      'set.tray': 'Close to tray', 'set.trayDesc': 'The timer keeps running in the background',
      'set.startup': 'Start with Windows', 'set.startupDesc': 'Opens quietly in the tray (needed for daily repeat)',
      'set.mini': 'Show mini timer automatically', 'set.miniDesc': 'A small always-on-top countdown when a timer starts',
      'set.global': 'Global shortcuts', 'set.globalDesc': 'Ctrl+Alt+Z show/hide · Ctrl+Alt+X cancel',
      'set.updates': 'Check for updates', 'set.updatesDesc': 'Looks for a new release on GitHub at launch',
      'about.source': 'Source code', 'about.version': 'Version {v}', 'about.dry': 'dry-run mode', 'about.check': 'Check for updates',
      'about.checking': 'Checking…', 'about.upToDate': 'You are on the latest version', 'about.newVersion': 'New version available: {v}',
      'about.checkFailed': 'Could not check (offline?)', 'about.license': 'Open source · MIT licence',
      'kbd.start': 'Start', 'kbd.cancel': 'Cancel', 'kbd.action': 'Pick action', 'kbd.adjust': '±1 min', 'kbd.shift': '(Shift ±10)',

      'toast.started': '{action} timer started', 'toast.cancelled': 'Timer cancelled', 'toast.pickDuration': 'Pick a duration first',
      'toast.added': '{n} minutes added', 'toast.presetSaved': 'Preset saved', 'toast.presetStarted': 'Preset started',
      'toast.presetDeleted': 'Preset deleted', 'toast.historyCleared': 'History cleared',
      'modal.title': 'Save as preset',

      'warn.desc': 'Save your work or snooze.', 'warn.descIdle': 'No activity for a while. Moving the mouse also cancels.',
      'warn.seconds': 'seconds left', 'warn.snooze': 'Snooze 10 min', 'warn.backToWait': 'Keep waiting', 'warn.now': 'Now', 'warn.nowTitle': 'Run now',
      'mini.open': 'Open window', 'mini.idle': 'idle',

      'n.cancelled': 'Timer cancelled', 'n.missedTitle': 'Timer skipped',
      'n.missedBody': 'The PC was asleep at that time; the action was skipped for safety.',
      'n.leftTitle': '{n} minutes left', 'n.leftBody': '{will}. Click to snooze.',
      'n.activityTitle': 'Activity detected', 'n.activityBody': 'Idle counter reset, still watching.',
      'n.trayTitle': 'Running in the background', 'n.trayBody': 'The timer lives in the system tray. Right-click the tray icon to quit.',
      'n.startedTitle': 'Timer started', 'n.presetStarted': '"{name}" started', 'n.presetFailed': 'Could not start preset',
      'n.updateTitle': 'New version: {v}', 'n.updateBody': 'A new version is available. Click to download.',

      'tray.show': 'Show timer', 'tray.snooze': 'Snooze {n} minutes', 'tray.quick': 'Quick start',
      'tray.quickItem': '{action} in {d}', 'tray.presets': 'Presets', 'tray.quit': 'Quit',
      'tip.ready': '{app} — ready', 'tip.remaining': 'Remaining: {time}', 'tip.paused': '(paused)',

      'q.title': 'Timer active', 'q.message': 'A timer is still running.',
      'q.detailHandoff': 'If you hand it to Windows, the PC will still shut down on time after the app closes (without the warning window or snooze).',
      'q.detailCancel': 'Quitting will cancel the timer.',
      'q.handoff': 'Hand to Windows and quit', 'q.cancelQuit': 'Cancel and quit', 'q.back': 'Go back',

      'err.invalid': 'Invalid settings', 'err.duration': 'Duration must be between 1 s and 7 days', 'err.time': 'Invalid time',
      'err.idle': 'Idle time must be between 1 min and 24 h', 'err.notFound': 'Preset not found',
      'preset.film': 'Movie night', 'preset.music': 'Music to sleep', 'preset.midnight': 'Midnight', 'preset.download': 'After download',
    },

    // ===================================================================== DE
    de: {
      'app.name': 'Abschalt-Timer',
      'state.ready': 'Bereit', 'state.running': 'Läuft', 'state.paused': 'Pausiert', 'state.warning': 'Letzte Warnung', 'state.watching': 'Überwacht',

      'action.shutdown': 'Herunterfahren', 'action.restart': 'Neu starten', 'action.sleep': 'Energie sparen',
      'action.hibernate': 'Ruhezustand', 'action.logoff': 'Abmelden', 'action.lock': 'Sperren',
      'short.shutdown': 'Herunter-\nfahren', 'short.restart': 'Neu\nstarten', 'short.sleep': 'Energie\nsparen',
      'short.hibernate': 'Ruhe-\nzustand', 'short.logoff': 'Abmelden', 'short.lock': 'Sperren',
      'will.shutdown': 'Der PC wird heruntergefahren', 'will.restart': 'Der PC wird neu gestartet', 'will.sleep': 'Der PC wechselt in den Energiesparmodus',
      'will.hibernate': 'Der PC wechselt in den Ruhezustand', 'will.logoff': 'Sie werden abgemeldet', 'will.lock': 'Der PC wird gesperrt',
      'past.shutdown': 'Heruntergefahren', 'past.restart': 'Neu gestartet', 'past.sleep': 'Energiesparmodus',
      'past.hibernate': 'Ruhezustand', 'past.logoff': 'Abgemeldet', 'past.lock': 'Gesperrt',

      'unit.h': 'Std', 'unit.m': 'Min',
      'fmt.hm': '{h} Std {m} Min', 'fmt.h': '{h} Std', 'fmt.m': '{m} Min', 'fmt.s': '{s} Sek',
      'desc.after': 'in {d}', 'desc.at': 'um {t}', 'desc.idle': 'nach {n} Min Inaktivität', 'desc.daily': 'täglich',

      'section.what': 'Was soll passieren?',
      'mode.duration': 'Nach Dauer', 'mode.clock': 'Um Uhrzeit', 'mode.idle': 'Bei Inaktivität',
      'sub.around': '{day} gegen <b>{time}</b>', 'sub.pick': 'Dauer wählen', 'sub.in': '{day} · in <b>{d}</b>',
      'sub.idle': 'ohne Maus-/Tastatureingabe', 'sub.idleRun': 'inaktiv · Ziel <b>{n} Min</b>',
      'sub.paused': 'Pausiert', 'sub.end': 'Ende · {day} <b>{time}</b>', 'sub.nextDaily': 'Täglich · nächstes {day} <b>{time}</b>',
      'day.today': 'Heute', 'day.tomorrow': 'Morgen', 'day.yesterday': 'Gestern',
      'repeat.daily': 'Täglich wiederholen',

      'btn.start': 'Timer starten', 'btn.startIdle': 'Überwachung starten', 'btn.cancel': 'Abbrechen',
      'btn.pause': 'Pause', 'btn.resume': 'Fortsetzen', 'btn.savePreset': 'Als Vorlage speichern',
      'btn.new': 'Neu', 'btn.clear': 'Leeren', 'btn.quit': 'App beenden', 'btn.save': 'Speichern',
      'btn.dismiss': 'Abbrechen', 'btn.min': 'Minimieren', 'btn.close': 'Schließen', 'btn.reset': 'Zurück', 'btn.mini': 'Mini-Timer',
      'hint.dial': 'Ziffernblatt ziehen, Mausrad nutzen oder ↑ ↓ drücken',

      'nav.timer': 'Timer', 'nav.presets': 'Vorlagen', 'nav.history': 'Verlauf', 'nav.settings': 'Einstellungen',

      'presets.title': 'Vorlagen', 'presets.desc': 'Häufig genutzte Timer mit einem Klick starten.',
      'presets.empty': 'Noch keine Vorlagen.<br>Fügen Sie eine mit dem Lesezeichen-Symbol hinzu.',
      'presets.load': 'In Timer laden', 'presets.play': 'Jetzt starten', 'presets.delete': 'Löschen', 'presets.placeholder': 'z. B. Filmabend',
      'history.title': 'Verlauf', 'history.desc': 'Ihre letzten Timer und deren Ergebnis.', 'history.empty': 'Verlauf ist leer.',
      'stat.total': 'Gesamt', 'stat.executed': 'Ausgeführt', 'stat.other': 'Abgebr. / übersprungen',
      'result.executed': 'Ausgeführt', 'result.cancelled': 'Abgebrochen', 'result.missed': 'Übersprungen', 'result.handoff': 'An Windows übergeben',

      'settings.title': 'Einstellungen', 'settings.desc': 'Passen Sie die App an.',
      'grp.appearance': 'Darstellung', 'grp.warnings': 'Warnungen', 'grp.behavior': 'Verhalten', 'grp.shortcuts': 'Tastenkürzel', 'grp.about': 'Info',
      'set.language': 'Sprache', 'set.languageDesc': 'Sprache für Oberfläche und Hinweise',
      'set.theme': 'Design', 'set.themeDesc': 'Hell, dunkel oder System',
      'theme.system': 'System', 'theme.dark': 'Dunkel', 'theme.light': 'Hell', 'theme.oled': 'Schwarz',
      'set.accent': 'Akzentfarbe', 'set.accentDesc': 'Hauptfarbe der Oberfläche',
      'set.warning': 'Letztes Warnfenster', 'set.warningDesc': 'Letzte Chance zum Abbrechen/Verschieben',
      'set.notify': 'Vorab-Hinweis', 'set.notifyDesc': 'Erinnerung per Windows-Benachrichtigung', 'off': 'Aus',
      'set.sound': 'Ton', 'set.soundDesc': 'Signalton in den letzten Sekunden',
      'set.force': 'Apps erzwungen schließen', 'set.forceDesc': 'Ungespeicherte Arbeit kann verloren gehen',
      'set.tray': 'In den Infobereich schließen', 'set.trayDesc': 'Der Timer läuft im Hintergrund weiter',
      'set.startup': 'Mit Windows starten', 'set.startupDesc': 'Startet still im Infobereich (für tägliche Wiederholung)',
      'set.mini': 'Mini-Timer automatisch zeigen', 'set.miniDesc': 'Kleiner Countdown, immer im Vordergrund',
      'set.global': 'Globale Tastenkürzel', 'set.globalDesc': 'Strg+Alt+Z zeigen/verbergen · Strg+Alt+X abbrechen',
      'set.updates': 'Nach Updates suchen', 'set.updatesDesc': 'Prüft beim Start GitHub auf neue Versionen',
      'about.source': 'Quellcode', 'about.version': 'Version {v}', 'about.dry': 'Testmodus', 'about.check': 'Nach Updates suchen',
      'about.checking': 'Wird geprüft…', 'about.upToDate': 'Sie nutzen die neueste Version', 'about.newVersion': 'Neue Version verfügbar: {v}',
      'about.checkFailed': 'Prüfung fehlgeschlagen (offline?)', 'about.license': 'Open Source · MIT-Lizenz',
      'kbd.start': 'Starten', 'kbd.cancel': 'Abbrechen', 'kbd.action': 'Aktion wählen', 'kbd.adjust': '±1 Min', 'kbd.shift': '(Umschalt ±10)',

      'toast.started': 'Timer „{action}“ gestartet', 'toast.cancelled': 'Timer abgebrochen', 'toast.pickDuration': 'Bitte zuerst eine Dauer wählen',
      'toast.added': '{n} Minuten hinzugefügt', 'toast.presetSaved': 'Vorlage gespeichert', 'toast.presetStarted': 'Vorlage gestartet',
      'toast.presetDeleted': 'Vorlage gelöscht', 'toast.historyCleared': 'Verlauf geleert',
      'modal.title': 'Als Vorlage speichern',

      'warn.desc': 'Speichern Sie Ihre Arbeit oder verschieben Sie.', 'warn.descIdle': 'Länger keine Aktivität. Mausbewegung bricht ebenfalls ab.',
      'warn.seconds': 'Sekunden', 'warn.snooze': '10 Min später', 'warn.backToWait': 'Weiter warten', 'warn.now': 'Jetzt', 'warn.nowTitle': 'Sofort ausführen',
      'mini.open': 'Fenster öffnen', 'mini.idle': 'inaktiv',

      'n.cancelled': 'Timer abgebrochen', 'n.missedTitle': 'Timer übersprungen',
      'n.missedBody': 'Der PC war zu dieser Zeit im Energiesparmodus; die Aktion wurde sicherheitshalber übersprungen.',
      'n.leftTitle': 'Noch {n} Minuten', 'n.leftBody': '{will}. Zum Verschieben klicken.',
      'n.activityTitle': 'Aktivität erkannt', 'n.activityBody': 'Inaktivitätszähler zurückgesetzt, Überwachung läuft weiter.',
      'n.trayTitle': 'Läuft im Hintergrund', 'n.trayBody': 'Der Timer ist im Infobereich. Zum Beenden Rechtsklick auf das Symbol.',
      'n.startedTitle': 'Timer gestartet', 'n.presetStarted': '„{name}“ gestartet', 'n.presetFailed': 'Vorlage konnte nicht starten',
      'n.updateTitle': 'Neue Version: {v}', 'n.updateBody': 'Eine neue Version ist verfügbar. Zum Herunterladen klicken.',

      'tray.show': 'Timer anzeigen', 'tray.snooze': '{n} Minuten verschieben', 'tray.quick': 'Schnellstart',
      'tray.quickItem': '{action} in {d}', 'tray.presets': 'Vorlagen', 'tray.quit': 'Beenden',
      'tip.ready': '{app} — bereit', 'tip.remaining': 'Verbleibend: {time}', 'tip.paused': '(pausiert)',

      'q.title': 'Timer aktiv', 'q.message': 'Ein Timer läuft noch.',
      'q.detailHandoff': 'Bei Übergabe an Windows fährt der PC auch nach dem Beenden der App pünktlich herunter (ohne Warnfenster).',
      'q.detailCancel': 'Beim Beenden wird der Timer abgebrochen.',
      'q.handoff': 'An Windows übergeben', 'q.cancelQuit': 'Abbrechen und beenden', 'q.back': 'Zurück',

      'err.invalid': 'Ungültige Einstellung', 'err.duration': 'Dauer muss zwischen 1 Sek und 7 Tagen liegen', 'err.time': 'Ungültige Uhrzeit',
      'err.idle': 'Inaktivität muss zwischen 1 Min und 24 Std liegen', 'err.notFound': 'Vorlage nicht gefunden',
      'preset.film': 'Filmabend', 'preset.music': 'Musik zum Einschlafen', 'preset.midnight': 'Mitternacht', 'preset.download': 'Nach dem Download',
    },

    // ===================================================================== ES
    es: {
      'app.name': 'Temporizador',
      'state.ready': 'Listo', 'state.running': 'En curso', 'state.paused': 'En pausa', 'state.warning': 'Último aviso', 'state.watching': 'Vigilando',

      'action.shutdown': 'Apagar', 'action.restart': 'Reiniciar', 'action.sleep': 'Suspender',
      'action.hibernate': 'Hibernar', 'action.logoff': 'Cerrar sesión', 'action.lock': 'Bloquear',
      'short.shutdown': 'Apagar', 'short.restart': 'Reiniciar', 'short.sleep': 'Suspender',
      'short.hibernate': 'Hibernar', 'short.logoff': 'Cerrar\nsesión', 'short.lock': 'Bloquear',
      'will.shutdown': 'El equipo se apagará', 'will.restart': 'El equipo se reiniciará', 'will.sleep': 'El equipo se suspenderá',
      'will.hibernate': 'El equipo hibernará', 'will.logoff': 'Se cerrará la sesión', 'will.lock': 'El equipo se bloqueará',
      'past.shutdown': 'Apagado', 'past.restart': 'Reiniciado', 'past.sleep': 'Suspendido',
      'past.hibernate': 'Hibernado', 'past.logoff': 'Sesión cerrada', 'past.lock': 'Bloqueado',

      'unit.h': 'h', 'unit.m': 'min',
      'fmt.hm': '{h} h {m} min', 'fmt.h': '{h} h', 'fmt.m': '{m} min', 'fmt.s': '{s} s',
      'desc.after': 'en {d}', 'desc.at': 'a las {t}', 'desc.idle': 'tras {n} min de inactividad', 'desc.daily': 'cada día',

      'section.what': '¿Qué debe ocurrir?',
      'mode.duration': 'Tras un tiempo', 'mode.clock': 'A una hora', 'mode.idle': 'Si está inactivo',
      'sub.around': '{day} hacia las <b>{time}</b>', 'sub.pick': 'Elige una duración', 'sub.in': '{day} · en <b>{d}</b>',
      'sub.idle': 'sin usar ratón ni teclado', 'sub.idleRun': 'inactivo · objetivo <b>{n} min</b>',
      'sub.paused': 'En pausa', 'sub.end': 'Fin · {day} <b>{time}</b>', 'sub.nextDaily': 'Cada día · próximo {day} <b>{time}</b>',
      'day.today': 'Hoy', 'day.tomorrow': 'Mañana', 'day.yesterday': 'Ayer',
      'repeat.daily': 'Repetir cada día',

      'btn.start': 'Iniciar temporizador', 'btn.startIdle': 'Empezar a vigilar', 'btn.cancel': 'Cancelar',
      'btn.pause': 'Pausar', 'btn.resume': 'Reanudar', 'btn.savePreset': 'Guardar como ajuste',
      'btn.new': 'Nuevo', 'btn.clear': 'Borrar', 'btn.quit': 'Salir de la app', 'btn.save': 'Guardar',
      'btn.dismiss': 'Cancelar', 'btn.min': 'Minimizar', 'btn.close': 'Cerrar', 'btn.reset': 'Reiniciar', 'btn.mini': 'Mini temporizador',
      'hint.dial': 'Arrastra el dial, usa la rueda del ratón o pulsa ↑ ↓',

      'nav.timer': 'Temporizador', 'nav.presets': 'Ajustes guardados', 'nav.history': 'Historial', 'nav.settings': 'Opciones',

      'presets.title': 'Ajustes guardados', 'presets.desc': 'Inicia tus temporizadores favoritos con un clic.',
      'presets.empty': 'Aún no hay ajustes.<br>Añade uno con el icono de marcador.',
      'presets.load': 'Cargar en el temporizador', 'presets.play': 'Iniciar ahora', 'presets.delete': 'Eliminar', 'presets.placeholder': 'p. ej. Noche de cine',
      'history.title': 'Historial', 'history.desc': 'Tus últimos temporizadores y su resultado.', 'history.empty': 'El historial está vacío.',
      'stat.total': 'Total', 'stat.executed': 'Ejecutados', 'stat.other': 'Cancelados / omitidos',
      'result.executed': 'Ejecutado', 'result.cancelled': 'Cancelado', 'result.missed': 'Omitido', 'result.handoff': 'Delegado a Windows',

      'settings.title': 'Opciones', 'settings.desc': 'Personaliza la aplicación.',
      'grp.appearance': 'Apariencia', 'grp.warnings': 'Avisos', 'grp.behavior': 'Comportamiento', 'grp.shortcuts': 'Atajos', 'grp.about': 'Acerca de',
      'set.language': 'Idioma', 'set.languageDesc': 'Idioma de la interfaz y avisos',
      'set.theme': 'Tema', 'set.themeDesc': 'Claro, oscuro o del sistema',
      'theme.system': 'Sistema', 'theme.dark': 'Oscuro', 'theme.light': 'Claro', 'theme.oled': 'Negro',
      'set.accent': 'Color de acento', 'set.accentDesc': 'Color principal de la interfaz',
      'set.warning': 'Ventana de último aviso', 'set.warningDesc': 'Última oportunidad para cancelar o posponer',
      'set.notify': 'Aviso previo', 'set.notifyDesc': 'Recordatorio con notificación de Windows', 'off': 'No',
      'set.sound': 'Sonido', 'set.soundDesc': 'Pitido en los últimos segundos',
      'set.force': 'Forzar cierre de apps', 'set.forceDesc': 'Puede perderse el trabajo sin guardar',
      'set.tray': 'Cerrar a la bandeja', 'set.trayDesc': 'El temporizador sigue en segundo plano',
      'set.startup': 'Iniciar con Windows', 'set.startupDesc': 'Se abre en la bandeja (necesario para repetir cada día)',
      'set.mini': 'Mostrar mini temporizador', 'set.miniDesc': 'Pequeña cuenta atrás siempre visible al iniciar',
      'set.global': 'Atajos globales', 'set.globalDesc': 'Ctrl+Alt+Z mostrar/ocultar · Ctrl+Alt+X cancelar',
      'set.updates': 'Buscar actualizaciones', 'set.updatesDesc': 'Comprueba GitHub al iniciar',
      'about.source': 'Código fuente', 'about.version': 'Versión {v}', 'about.dry': 'modo de prueba', 'about.check': 'Buscar actualizaciones',
      'about.checking': 'Comprobando…', 'about.upToDate': 'Tienes la última versión', 'about.newVersion': 'Nueva versión disponible: {v}',
      'about.checkFailed': 'No se pudo comprobar (¿sin conexión?)', 'about.license': 'Código abierto · licencia MIT',
      'kbd.start': 'Iniciar', 'kbd.cancel': 'Cancelar', 'kbd.action': 'Elegir acción', 'kbd.adjust': '±1 min', 'kbd.shift': '(Mayús ±10)',

      'toast.started': 'Temporizador «{action}» iniciado', 'toast.cancelled': 'Temporizador cancelado', 'toast.pickDuration': 'Elige primero una duración',
      'toast.added': '{n} minutos añadidos', 'toast.presetSaved': 'Ajuste guardado', 'toast.presetStarted': 'Ajuste iniciado',
      'toast.presetDeleted': 'Ajuste eliminado', 'toast.historyCleared': 'Historial borrado',
      'modal.title': 'Guardar como ajuste',

      'warn.desc': 'Guarda tu trabajo o pospón.', 'warn.descIdle': 'Sin actividad desde hace rato. Mover el ratón también cancela.',
      'warn.seconds': 'segundos', 'warn.snooze': 'Posponer 10 min', 'warn.backToWait': 'Seguir esperando', 'warn.now': 'Ahora', 'warn.nowTitle': 'Ejecutar ahora',
      'mini.open': 'Abrir ventana', 'mini.idle': 'inactivo',

      'n.cancelled': 'Temporizador cancelado', 'n.missedTitle': 'Temporizador omitido',
      'n.missedBody': 'El equipo estaba suspendido; la acción se omitió por seguridad.',
      'n.leftTitle': 'Quedan {n} minutos', 'n.leftBody': '{will}. Haz clic para posponer.',
      'n.activityTitle': 'Actividad detectada', 'n.activityBody': 'Contador de inactividad reiniciado, se sigue vigilando.',
      'n.trayTitle': 'Funcionando en segundo plano', 'n.trayBody': 'El temporizador está en la bandeja. Clic derecho en el icono para salir.',
      'n.startedTitle': 'Temporizador iniciado', 'n.presetStarted': '«{name}» iniciado', 'n.presetFailed': 'No se pudo iniciar el ajuste',
      'n.updateTitle': 'Nueva versión: {v}', 'n.updateBody': 'Hay una nueva versión. Haz clic para descargarla.',

      'tray.show': 'Mostrar temporizador', 'tray.snooze': 'Posponer {n} minutos', 'tray.quick': 'Inicio rápido',
      'tray.quickItem': '{action} en {d}', 'tray.presets': 'Ajustes guardados', 'tray.quit': 'Salir',
      'tip.ready': '{app} — listo', 'tip.remaining': 'Restante: {time}', 'tip.paused': '(en pausa)',

      'q.title': 'Temporizador activo', 'q.message': 'Hay un temporizador en curso.',
      'q.detailHandoff': 'Si lo delegas a Windows, el equipo se apagará a tiempo aunque cierres la app (sin ventana de aviso).',
      'q.detailCancel': 'Al salir se cancelará el temporizador.',
      'q.handoff': 'Delegar a Windows y salir', 'q.cancelQuit': 'Cancelar y salir', 'q.back': 'Volver',

      'err.invalid': 'Ajuste no válido', 'err.duration': 'La duración debe estar entre 1 s y 7 días', 'err.time': 'Hora no válida',
      'err.idle': 'La inactividad debe estar entre 1 min y 24 h', 'err.notFound': 'Ajuste no encontrado',
      'preset.film': 'Noche de cine', 'preset.music': 'Música para dormir', 'preset.midnight': 'Medianoche', 'preset.download': 'Tras la descarga',
    },

    // ===================================================================== FR
    fr: {
      'app.name': 'Minuteur',
      'state.ready': 'Prêt', 'state.running': 'En cours', 'state.paused': 'En pause', 'state.warning': 'Dernier avertissement', 'state.watching': 'Surveillance',

      'action.shutdown': 'Arrêter', 'action.restart': 'Redémarrer', 'action.sleep': 'Mettre en veille',
      'action.hibernate': 'Veille prolongée', 'action.logoff': 'Se déconnecter', 'action.lock': 'Verrouiller',
      'short.shutdown': 'Arrêter', 'short.restart': 'Redé-\nmarrer', 'short.sleep': 'Veille',
      'short.hibernate': 'Veille\nprolongée', 'short.logoff': 'Décon-\nnexion', 'short.lock': 'Verrouiller',
      'will.shutdown': 'Le PC va s’arrêter', 'will.restart': 'Le PC va redémarrer', 'will.sleep': 'Le PC va se mettre en veille',
      'will.hibernate': 'Le PC va passer en veille prolongée', 'will.logoff': 'Vous allez être déconnecté', 'will.lock': 'Le PC va être verrouillé',
      'past.shutdown': 'Arrêté', 'past.restart': 'Redémarré', 'past.sleep': 'En veille',
      'past.hibernate': 'Veille prolongée', 'past.logoff': 'Déconnecté', 'past.lock': 'Verrouillé',

      'unit.h': 'h', 'unit.m': 'min',
      'fmt.hm': '{h} h {m} min', 'fmt.h': '{h} h', 'fmt.m': '{m} min', 'fmt.s': '{s} s',
      'desc.after': 'dans {d}', 'desc.at': 'à {t}', 'desc.idle': 'après {n} min d’inactivité', 'desc.daily': 'chaque jour',

      'section.what': 'Que faire ?',
      'mode.duration': 'Après', 'mode.clock': 'À une heure', 'mode.idle': 'Si inactif',
      'sub.around': '{day} vers <b>{time}</b>', 'sub.pick': 'Choisissez une durée', 'sub.in': '{day} · dans <b>{d}</b>',
      'sub.idle': 'sans souris ni clavier', 'sub.idleRun': 'inactif · objectif <b>{n} min</b>',
      'sub.paused': 'En pause', 'sub.end': 'Fin · {day} <b>{time}</b>', 'sub.nextDaily': 'Chaque jour · prochain {day} <b>{time}</b>',
      'day.today': 'Aujourd’hui', 'day.tomorrow': 'Demain', 'day.yesterday': 'Hier',
      'repeat.daily': 'Répéter chaque jour',

      'btn.start': 'Démarrer le minuteur', 'btn.startIdle': 'Démarrer la surveillance', 'btn.cancel': 'Annuler',
      'btn.pause': 'Pause', 'btn.resume': 'Reprendre', 'btn.savePreset': 'Enregistrer comme préréglage',
      'btn.new': 'Nouveau', 'btn.clear': 'Effacer', 'btn.quit': 'Quitter l’app', 'btn.save': 'Enregistrer',
      'btn.dismiss': 'Annuler', 'btn.min': 'Réduire', 'btn.close': 'Fermer', 'btn.reset': 'Remettre à 0', 'btn.mini': 'Mini minuteur',
      'hint.dial': 'Faites glisser le cadran, utilisez la molette ou ↑ ↓',

      'nav.timer': 'Minuteur', 'nav.presets': 'Préréglages', 'nav.history': 'Historique', 'nav.settings': 'Réglages',

      'presets.title': 'Préréglages', 'presets.desc': 'Lancez vos minuteurs favoris en un clic.',
      'presets.empty': 'Aucun préréglage.<br>Ajoutez-en un avec l’icône signet.',
      'presets.load': 'Charger dans le minuteur', 'presets.play': 'Démarrer', 'presets.delete': 'Supprimer', 'presets.placeholder': 'ex. Soirée film',
      'history.title': 'Historique', 'history.desc': 'Vos derniers minuteurs et leur issue.', 'history.empty': 'L’historique est vide.',
      'stat.total': 'Total', 'stat.executed': 'Exécutés', 'stat.other': 'Annulés / ignorés',
      'result.executed': 'Exécuté', 'result.cancelled': 'Annulé', 'result.missed': 'Ignoré', 'result.handoff': 'Confié à Windows',

      'settings.title': 'Réglages', 'settings.desc': 'Personnalisez l’application.',
      'grp.appearance': 'Apparence', 'grp.warnings': 'Avertissements', 'grp.behavior': 'Comportement', 'grp.shortcuts': 'Raccourcis', 'grp.about': 'À propos',
      'set.language': 'Langue', 'set.languageDesc': 'Langue de l’interface et des notifications',
      'set.theme': 'Thème', 'set.themeDesc': 'Clair, sombre ou système',
      'theme.system': 'Système', 'theme.dark': 'Sombre', 'theme.light': 'Clair', 'theme.oled': 'Noir',
      'set.accent': 'Couleur d’accent', 'set.accentDesc': 'Couleur principale de l’interface',
      'set.warning': 'Fenêtre d’avertissement', 'set.warningDesc': 'Dernière chance d’annuler ou reporter',
      'set.notify': 'Notification préalable', 'set.notifyDesc': 'Rappel par notification Windows', 'off': 'Non',
      'set.sound': 'Son', 'set.soundDesc': 'Bip pendant les dernières secondes',
      'set.force': 'Forcer la fermeture des apps', 'set.forceDesc': 'Le travail non enregistré peut être perdu',
      'set.tray': 'Fermer dans la zone de notification', 'set.trayDesc': 'Le minuteur continue en arrière-plan',
      'set.startup': 'Lancer avec Windows', 'set.startupDesc': 'S’ouvre discrètement (requis pour la répétition)',
      'set.mini': 'Afficher le mini minuteur', 'set.miniDesc': 'Petit compte à rebours toujours visible au démarrage',
      'set.global': 'Raccourcis globaux', 'set.globalDesc': 'Ctrl+Alt+Z afficher/masquer · Ctrl+Alt+X annuler',
      'set.updates': 'Rechercher des mises à jour', 'set.updatesDesc': 'Vérifie GitHub au démarrage',
      'about.source': 'Code source', 'about.version': 'Version {v}', 'about.dry': 'mode test', 'about.check': 'Rechercher des mises à jour',
      'about.checking': 'Vérification…', 'about.upToDate': 'Vous avez la dernière version', 'about.newVersion': 'Nouvelle version : {v}',
      'about.checkFailed': 'Vérification impossible (hors ligne ?)', 'about.license': 'Open source · licence MIT',
      'kbd.start': 'Démarrer', 'kbd.cancel': 'Annuler', 'kbd.action': 'Choisir l’action', 'kbd.adjust': '±1 min', 'kbd.shift': '(Maj ±10)',

      'toast.started': 'Minuteur « {action} » démarré', 'toast.cancelled': 'Minuteur annulé', 'toast.pickDuration': 'Choisissez d’abord une durée',
      'toast.added': '{n} minutes ajoutées', 'toast.presetSaved': 'Préréglage enregistré', 'toast.presetStarted': 'Préréglage démarré',
      'toast.presetDeleted': 'Préréglage supprimé', 'toast.historyCleared': 'Historique effacé',
      'modal.title': 'Enregistrer comme préréglage',

      'warn.desc': 'Enregistrez votre travail ou reportez.', 'warn.descIdle': 'Aucune activité depuis un moment. Bouger la souris annule aussi.',
      'warn.seconds': 'secondes', 'warn.snooze': 'Reporter 10 min', 'warn.backToWait': 'Continuer d’attendre', 'warn.now': 'Maintenant', 'warn.nowTitle': 'Exécuter maintenant',
      'mini.open': 'Ouvrir la fenêtre', 'mini.idle': 'inactif',

      'n.cancelled': 'Minuteur annulé', 'n.missedTitle': 'Minuteur ignoré',
      'n.missedBody': 'Le PC était en veille ; l’action a été ignorée par sécurité.',
      'n.leftTitle': 'Plus que {n} minutes', 'n.leftBody': '{will}. Cliquez pour reporter.',
      'n.activityTitle': 'Activité détectée', 'n.activityBody': 'Compteur d’inactivité remis à zéro, surveillance maintenue.',
      'n.trayTitle': 'Fonctionne en arrière-plan', 'n.trayBody': 'Le minuteur est dans la zone de notification. Clic droit sur l’icône pour quitter.',
      'n.startedTitle': 'Minuteur démarré', 'n.presetStarted': '« {name} » démarré', 'n.presetFailed': 'Impossible de démarrer le préréglage',
      'n.updateTitle': 'Nouvelle version : {v}', 'n.updateBody': 'Une nouvelle version est disponible. Cliquez pour la télécharger.',

      'tray.show': 'Afficher le minuteur', 'tray.snooze': 'Reporter de {n} minutes', 'tray.quick': 'Démarrage rapide',
      'tray.quickItem': '{action} dans {d}', 'tray.presets': 'Préréglages', 'tray.quit': 'Quitter',
      'tip.ready': '{app} — prêt', 'tip.remaining': 'Restant : {time}', 'tip.paused': '(en pause)',

      'q.title': 'Minuteur actif', 'q.message': 'Un minuteur est en cours.',
      'q.detailHandoff': 'Si vous le confiez à Windows, le PC s’arrêtera à l’heure même après la fermeture de l’app (sans fenêtre d’avertissement).',
      'q.detailCancel': 'Quitter annulera le minuteur.',
      'q.handoff': 'Confier à Windows et quitter', 'q.cancelQuit': 'Annuler et quitter', 'q.back': 'Retour',

      'err.invalid': 'Réglage invalide', 'err.duration': 'La durée doit être entre 1 s et 7 jours', 'err.time': 'Heure invalide',
      'err.idle': 'L’inactivité doit être entre 1 min et 24 h', 'err.notFound': 'Préréglage introuvable',
      'preset.film': 'Soirée film', 'preset.music': 'Musique pour dormir', 'preset.midnight': 'Minuit', 'preset.download': 'Après le téléchargement',
    },
  };

  function t(lang, key, vars) {
    const table = dict[lang] || dict.en;
    let s = table[key];
    if (s == null) s = dict.en[key];
    if (s == null) s = dict.tr[key];
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }

  function fmtMinutes(lang, min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (h && m) return t(lang, 'fmt.hm', { h, m });
    if (h) return t(lang, 'fmt.h', { h });
    return t(lang, 'fmt.m', { m });
  }

  /** d = { mode, totalMs?, minutes?, time?, idleMinutes?, repeat? } */
  function describe(lang, d) {
    let s;
    if (d.mode === 'duration') {
      const ms = d.totalMs != null ? d.totalMs : (d.minutes || 0) * 60000;
      s = t(lang, 'desc.after', { d: ms < 60000 ? t(lang, 'fmt.s', { s: Math.round(ms / 1000) }) : fmtMinutes(lang, Math.round(ms / 60000)) });
    } else if (d.mode === 'clock') {
      s = t(lang, 'desc.at', { t: d.time });
      if (d.repeat) s += ' · ' + t(lang, 'desc.daily');
    } else {
      s = t(lang, 'desc.idle', { n: d.idleMinutes });
    }
    return s;
  }

  function detect(locale) {
    const l = String(locale || '').toLowerCase().slice(0, 2);
    return LANGS[l] ? l : 'en';
  }

  const api = { LANGS, LOCALES, dict, t, fmtMinutes, describe, detect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.I18N = api;
})(typeof self !== 'undefined' ? self : this);
