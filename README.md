# DSP Core Surface — Android App

Touchscreen mixing surface voor de DSP Core server.  
Volledig equivalent aan de X Touch / ESP32 surfaces, met:

- 8 kanaalstrips met motorfader simulatie
- VU meters per kanaal
- Rotary encoder (touch-draai gesture) per kanaal
- ON / PFL / Talkback knoppen
- LCD scherm per kanaal (menu-tekst identiek aan ESP32 surface1)
- Menu systeem: HOME → SOURCE SELECT → MAIN → GAIN / EQ / COMP / BUS
- Studio selectie bij opstart via `https://mapmedia.nl/tfttunnel/tunnels.json`
- Handmatig adres invoeren mogelijk (ws:// of wss://)
- Bank navigatie voor meer dan 8 kanalen

---

## Vereisten

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI voor APK build: `npm install -g eas-cli`
- Android telefoon of tablet (Android 8+, landscape modus aanbevolen)

---

## Installeren

```bash
cd android
npm install
```

---

## Starten (development)

```bash
npm start
# of
npx expo start
```

Scan de QR-code met de Expo Go app op je telefoon.

---

## APK bouwen (preview / sideload)

### 1. Inloggen bij Expo

```bash
eas login
```

### 2. Project koppelen (eenmalig)

```bash
eas build:configure
```

### 3. APK bouwen

```bash
npm run build:apk
# of
eas build -p android --profile preview
```

De APK wordt gebouwd in de cloud en is te downloaden via de Expo dashboard link.  
Je kunt hem direct installeren op je Android apparaat (sideload via `adb` of direct downloaden).

---

## Lokale APK zonder EAS (Expo Classic Build)

```bash
npx expo run:android
```

Vereist Android Studio + SDK geïnstalleerd.

---

## Configuratie

### Studio ID aanpassen

De app haalt automatisch studio's op via de tunnel JSON.  
Bij handmatig verbinden: voer het WebSocket adres in:
- Lokaal: `ws://192.168.1.x:8750`
- Cloudflare: `wss://xxxx.trycloudflare.com`

### Tweede unit (ch5–ch8)

In `src/context/SurfaceContext.tsx` de `DEFAULT_CHANNELS` aanpassen:
```ts
const DEFAULT_CHANNELS = ['ch5','ch6','ch7','ch8'];
```

---

## Mappenstructuur

```
android/
├── App.tsx                          # Root app + navigatie
├── app.json                         # Expo config
├── package.json
├── babel.config.js
├── tsconfig.json
└── src/
    ├── context/
    │   └── SurfaceContext.tsx       # WebSocket + state + menu logica
    ├── screens/
    │   ├── StudioSelectScreen.tsx   # Opstart studio keuze
    │   └── MixerScreen.tsx          # Hoofdmengscherm (8 strips)
    ├── components/
    │   ├── ChannelStrip.tsx         # Kanaalstrip (fader+knoppen+LCD)
    │   ├── LcdDisplay.tsx           # LCD tekst per menu state
    │   ├── VuMeter.tsx              # VU meter (16 segmenten)
    │   ├── MotorFader.tsx           # Touchscreen fader
    │   └── RotaryEncoder.tsx        # Rotary encoder (draai-gesture)
    ├── services/
    │   └── tunnelDiscovery.ts       # Tunnel JSON ophalen
    └── theme/
        └── colors.ts                # Kleurenpalet
```

---

## Menu systeem

Identiek aan ESP32 surface1:

| State | Omschrijving |
|---|---|
| `HOME` | Kanaalinfo: label, source, fader, on/off, PFL |
| `SOURCE_SELECT` | Snelle bronkeuze via encoder draaien |
| `MAIN` | Hoofdmenu: SRC / GAIN / EQ / COMP / BUS / STUDIO / BACK |
| `GAIN` | Encoder draaien = +/- 0.5 dB |
| `EQ` | LOW / MID / HIGH, encoder draaien per band |
| `COMP` | THRESHOLD / RATIO aanpassen |
| `BUS` | PGM1 / PGM2 / REC / AUX / MON toggle |

**Encoder bediening:**
- **Draaien omhoog** = positieve waarde / volgende item
- **Tikken (kort drukken)** = bevestigen / volgende stap
- **Vanuit HOME draaien** = MAIN menu openen
