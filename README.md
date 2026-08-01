# swea-hieltscher.at

Keine Website mit Menü und Unterseiten. Ein Blatt Papier, auf dem gemalte
Kreise liegen. Jeder Kreis ist ein Bereich ihres Wirkens. Man nähert sich
einem Kreis, taucht hinein — und der Inhalt windet sich als **Spirale**
vom Mittelpunkt nach außen. Man reist ihn entlang, statt zu scrollen.

## Ansehen

```
npx serve .          # dann http://localhost:3000
```

Oder **vorschau.html** doppelklicken — alles in einer Datei, ohne Server.
`index.html` direkt zu öffnen funktioniert nicht: Browser sperren bei
`file://` die ES-Module, dann bleibt nur die Textfassung übrig.

## Der Gedanke

Alles was Swea tut ist derselbe Kreis: die konzentrischen Ringe ihrer
Malerei, das Kreisgehen im Bagua Zhang, der Qi-Umlauf im Qigong, der
Bogenstrich auf der Violine, die Felder der Aurachirurgie. Die Seite
behauptet das nicht — sie ist so gebaut.

## Ebenen

| Ebene | Was |
|---|---|
| Papier | Bütten-Grund, Faser liegt *über* der Farbe |
| Pigment | acht gemalte Kreise in WebGL — Ringe driften, Kanten von Hand |
| Linien | Kandinsky-Striche, Rotoskop-Figur |
| Feld | die acht Wörter, an die Kreise geheftet |
| Räume | je eine Spirale aus Fragmenten |

## Aufbau

```
index.html            alles, was es zu lesen gibt
assets/css/           01 Grund · 02 Feld · 03 Räume · 04 Textansicht
assets/js/
  main.js             fügt zusammen
  inhalt.js           Kreise: Farben, Lage, Ringzahl
  pigment.js          WebGL — der gemalte Kreis
  feld.js             Ebene 0
  raum.js             die Spirale
  artefakte.js        Saite, Bagua, Atem, Wurzel
  roto.js             die gehende Figur (kochende Linie, 8 Bilder/s)
  atem.js             gemeinsame Uhr: 4 s ein, 6 s aus
assets/fonts/         Fraunces, Instrument Sans/Serif — lokal, DSGVO
assets/vendor/        three.js
```

## Werkzeuge

```
node pruefen.mjs           # führt die Seite in echtem DOM aus, prüft alles
node pruefen-vorschau.mjs  # prüft das Bündel
node bauen.mjs             # baut vorschau.html
node bild.mjs 1200 750     # rendert das Feld als PNG, ohne Browser
```

`pruefen.mjs` braucht `jsdom`, `postcss`, `acorn`.

## Bewusst so gebaut

- **Ohne JavaScript** bleibt ein vollständiges, lesbares Dokument.
- **Textansicht** (Schalter unten rechts) für alle, die nur lesen wollen.
- **Ruhe** hält jede Bewegung an. `prefers-reduced-motion` wird beachtet.
- **Tastatur**: Pfeiltasten gehen die Spirale ab, Tab zieht die Kamera nach,
  Esc führt zurück ins Feld.
- **Kein CDN, kein Tracking, keine Cookies.** Alles vom eigenen Server.
- **Ohne WebGL** läuft die Seite weiter, nur ohne gemalte Kreise.

## Noch zu tun

- [ ] Echte Aufnahmen ihrer Bilder nach `assets/img/werke/`
      (ersetzen die gemalten Platzhalter in `.werk__flaeche`)
- [ ] Texte im Raum **Bild** stammen von mir — von Swea ersetzen lassen
- [ ] Formular: derzeit `mailto:`. Für ein echtes Absenden braucht es
      einen kleinen Server-Endpunkt.
- [ ] Foto von Swea
# swea-hieltscher.at
