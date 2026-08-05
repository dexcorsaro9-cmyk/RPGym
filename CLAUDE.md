# RPGym — istruzioni permanenti per Claude Code

## Immagini / Asset

Ogni volta che un'immagine viene caricata nel progetto (JPG, PNG, JPEG o qualsiasi altro formato raster), convertila **automaticamente in WebP** prima di commitarla:

```bash
cwebp -q 88 input.jpg -o output.webp && rm input.jpg
```

- Qualità consigliata: 88 (buon bilanciamento qualità/peso)
- Rimuovi sempre il file originale dopo la conversione
- Aggiorna i riferimenti nel codice dall'estensione originale a `.webp`

## Git / PR

- Crea sempre PR e mergela immediatamente dopo il push — senza chiedere conferma
- Non lasciare mai commit/push pendenti sul branch
- Non lasciare mai richieste pendenti in branch che non siano main
