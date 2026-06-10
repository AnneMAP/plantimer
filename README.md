# PlanTimer App

Een Android APK app met timer functionaliteit die:
1. Je telefoon op geplande tijden activeert (wake-up)
2. Vraagt om telefoon te unlocken (vingerafdruk, PIN of patroon)
3. Automatisch de Mijneigenplan app (of een andere geconfigureerde app) opent

## Features

- **Timer/Alarm Planning**: Stel meerdere tijden in wanneer de actie moet plaatsvinden
- **App Configuratie**: Kies welke app geopend moet worden bij elke timer
- **Wake & Unlock**: Automatisch wakker maken van het apparaat en unlock aanvragen
- **Batterij Optimalisatie Check**: Waarschuwt als batterij-optimalisatie de timers kan blokkeren
- **Overlay Permissie**: Mogelijkheid om over het lockscreen te tonen

## Installatie

### Vereisten
- Android 8.0+ (API 26+)
- Expo Go app (voor ontwikkeling)
- Node.js 18+ en npm (voor build)

### APK Bouwen via GitHub Actions (AANBEVOLEN)

Deze methode gebruikt **geen** Expo cloud - alles wordt lokaal gebouwd met Gradle.

### Automatisch bij push
1. Push je code naar de `main` of `master` branch
2. GitHub Actions start automatisch een debug build
3. Ga naar het "Actions" tabblad in je GitHub repository
4. Klik op de nieuwste workflow run
5. Download de APK van de "Artifacts" sectie

### Handmatig triggeren
1. Ga naar het "Actions" tabblad in je GitHub repository
2. Klik op "Build PlanTimer APK (Local Gradle Build)"
3. Klik op "Run workflow" dropdown
4. Kies build type:
   - `debug` - Snelle build met debug signing (aanbevolen voor test)
   - `release` - Geoptimaliseerde build (vereist eigen signing key)
5. Klik "Run workflow"
6. Wacht ~5-15 minuten
7. Download de APK van de "Artifacts" sectie

### Release Download
Na een push naar main/master wordt automatisch een draft release aangemaakt:
1. Ga naar "Releases" in je GitHub repository
2. Vind de nieuwste release
3. Download de APK bestanden

### Lokaal Bouwen (met Portable Build Script)

```bash
cd K:\RADIO\apk-build
python build_portable\setup_and_build.py
```

### Handmatig Bouwen

```bash
# Installeer dependencies
npm install

# Genereer native Android project
npx expo prebuild --platform android

# Bouw release APK
cd android
./gradlew assembleRelease
```

## Permissies

De app vraagt om de volgende permissies:

- **WAKE_LOCK**: Om het apparaat wakker te maken
- **DISABLE_KEYGUARD**: Om het lockscreen te ontgrendelen
- **SCHEDULE_EXACT_ALARM**: Voor exacte alarmtijden
- **SYSTEM_ALERT_WINDOW**: Om over andere apps te tonen
- **REQUEST_IGNORE_BATTERY_OPTIMIZATIONS**: Voor betrouwbare achtergrond timers

## Configuratie

### Standaard App Instellen

De standaard app die geopend wordt is `com.mijneigenplan.app`. Je kunt dit aanpassen in de app instellingen.

Bekende package namen:
- `com.mijneigenplan.app` - Mijneigenplan app
- `com.whatsapp` - WhatsApp
- `com.android.calendar` - Kalender
- `com.google.android.apps.maps` - Google Maps

### Batterij Optimalisatie

Voor betrouwbare werking, schakel batterij-optimalisatie uit voor PlanTimer:

1. Instellingen > Apps > PlanTimer
2. Batterij > Batterij optimalisatie
3. Kies "Niet optimaliseren"

### Overlay Permissie

Voor het tonen van alarmen boven het lockscreen:

1. Instellingen > Apps > Speciale app-toegang
2. Over andere apps tonen > PlanTimer
3. Schakel in

## Project Structuur

```
apk-build/
├── .github/workflows/      # GitHub Actions workflows
├── android-native-modules/ # Native Android code (wordt geïnjecteerd)
├── assets/                 # App icons en afbeeldingen
├── modules/plantimer/    # Expo native module voor Android features
├── App.js                  # Hoofd React Native app
├── app.json                # Expo configuratie
├── package.json            # Node.js dependencies
└── README.md              # Deze file
```

## Native Modules

De app bevat een custom native module (`modules/plantimer`) met Kotlin code voor:

- `wakeupAndUnlock()`: Wake up device en toon boven lockscreen
- `openApp(packageName)`: Open een andere app
- `isDeviceLocked()`: Check of device vergrendeld is
- `requestWakeLock()`: Houd CPU wakker voor achtergrond taken
- `isBatteryOptimizationEnabled()`: Check batterij optimalisatie status
- `requestBatteryOptimizationDisable()`: Vraag gebruiker om optimalisatie uit te zetten
- `canDrawOverlays()`: Check overlay permissie
- `requestOverlayPermission()`: Vraag overlay permissie aan

## Troubleshooting

### Timers werken niet
- Controleer of batterij-optimalisatie is uitgeschakeld
- Controleer of overlay permissie is gegeven
- Controleer of notificatie permissies zijn gegeven
- Op sommige apparaten: voeg toe aan "Auto-start" lijst in beveiligingsapp

### App opent niet automatisch
- Controleer of het juiste package name is ingevoerd
- Sommige apps blokkeren externe start attempts
- Probeer eerst met een systeem app zoals Calculator

### Wake-up werkt niet
- Zorg dat "Bedtijd modus" of "Niet storen" uit staat
- Controleer of het apparaat niet in Diep Standby is

## Ontwikkeling

### Lokale ontwikkeling met Expo Go

```bash
npm start
# Scan QR code met Expo Go app
```

### Native code aanpassen

Na wijzigingen in `modules/plantimer/android/`:

```bash
cd android
./gradlew assembleRelease
```

## Licentie

MIT License - Vrij te gebruiken en aan te passen.
