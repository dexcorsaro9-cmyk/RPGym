# ⚔️ RPGym — L'Avventura del Viandante

Un gioco di ruolo fantasy che trasforma **camminate, corse e pedalate** in
un'avventura epica. Pensato per motivare i ragazzi a muoversi: ogni chilometro
reale diventa esperienza, oro, loot e progressi nella storia.

È una **PWA** (Progressive Web App): niente app store, niente abbonamenti,
niente backend. Tutto gira nel browser e i salvataggi restano sul telefono.

## 🎮 Come si gioca

1. **Crea il tuo Eroe** — scegli nome e avatar (puoi caricare una foto/immagine personalizzata).
2. **Allenati nella vita reale** — cyclette, camminata o corsa. I km li leggi
   dall'app Salute / Fitness / Strava del telefono.
3. **Sincronizza l'Avventura** — inserisci i km nel gioco: guadagni XP, oro,
   legna e pietra. Il "Custode del Tempo" blocca i valori impossibili (anti-baro!).
4. **Progredisci**:
   - **Liv. 1–4** — dormi accanto al falò, sopravvivenza pura
   - **Liv. 5** — sblocchi la **costruzione della casa** 🏡
   - **Liv. 10** — l'**Evento del Risveglio**: il Lupo Astrale 🐺 (cavalcatura + compagno)
   - **Liv. 20** — level cap: serve l'**Amuleto del Viaggiatore Esperto** per l'Ascensione
5. **Missioni** — dalle Rovine di Oakhaven alla Foresta Sussurrante fino al
   Deserto di Ruggine, inseguendo il misterioso **Cavaliere del Drago**.
6. **Colleziona** — Sacchi del Viaggiatore ogni 5 km, Frammenti di Memoria ogni
   20 km, e **Carte collezionabili** con rarità (comune → leggendaria).
7. **Taglie Uniche settimanali** — il primo eroe che completa l'impresa vince
   una ricompensa estetica esclusiva. L'altro trova solo un cartello… 😏

### Meccaniche chiave

| Attività  | XP per km | Limite anti-baro |
|-----------|-----------|------------------|
| 🚴 Cyclette  | 10 | 60 km/sessione |
| 🚶 Camminata | 15 | 40 km/sessione |
| 🏃 Corsa     | 30 | 30 km/sessione |

- **Giorno di Riposo** (max 2/settimana): il prossimo allenamento vale **x2**
- **Bonus della casa**: Letto (+10% oro), Fucina (+10% XP), Laboratorio (+10% risorse)
- **Avventure parallele**: ogni eroe ha il suo salvataggio; si può *visitare*
  la base dell'altro ma non interferire ("invidia positiva"!)

## 🚀 Come pubblicarla (gratis, con GitHub Pages)

1. Vai su **Settings → Pages** di questo repository
2. In *Source* scegli **Deploy from a branch**, branch `main` (o questo branch), cartella `/ (root)`
3. Dopo un minuto l'app sarà online su `https://<tuo-utente>.github.io/RPGym/`

## 📱 Come installarla sugli iPhone dei ragazzi

1. Apri il link con **Safari**
2. Tocca **Condividi** (quadrato con freccia) → **Aggiungi alla schermata Home**
3. L'icona ⚔️ apparirà come una vera app, a tutto schermo e funzionante offline

## 🛠️ Struttura del progetto

```
index.html            → struttura delle schermate
style.css             → stile "pergamena fantasy"
game.js               → logica di gioco (livelli, loot, missioni, carte…)
app.js                → interfaccia e interazioni
sw.js                 → service worker (offline)
manifest.webmanifest  → configurazione PWA
assets/               → icone e (in futuro) avatar/sfondi generati con l'IA
```

### Personalizzare la grafica con l'IA

Il gioco è già predisposto per le immagini generate con l'IA — basta salvarle
con questi nomi esatti (il gioco le rileva da solo, senza toccare il codice):

| File | Dove appare |
|------|-------------|
| `assets/backgrounds/pergamena.jpg` | Sfondo della **Scheda dell'Eroe** |
| `assets/avatars/eroe1.png` | Avatar a figura intera (1° protagonista) — appare tra le scelte alla creazione |
| `assets/avatars/eroe2.png` | Avatar a figura intera (2° protagonista) — idem |

In alternativa, l'avatar si può caricare direttamente dal gioco alla creazione
dell'eroe (viene salvato sul telefono). I nomi degli eroi usano il font
medievale **Uncial Antiqua**.

## 🔮 Prossimi passi possibili

- **Firebase** per sincronizzare i due fratelli su dispositivi diversi
  (basi visitabili in tempo reale, Taglie Uniche condivise)
- **Lettura automatica da Apple Health** (richiede app nativa + TestFlight)
- Nuove zone, boss e carte stagionali
