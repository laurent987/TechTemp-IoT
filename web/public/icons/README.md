# TechTemp PWA Icons

🌡️ Icônes officielles de l'application TechTemp IoT avec design thermomètre bleu.

## Icônes principales (PWA)
- `icon-96.png` - 96x96px - Petite taille
- `icon-144.png` - 144x144px - Android home screen  
- `icon-192.png` - 192x192px - Standard PWA
- `icon-384.png` - 384x384px - Grande taille
- `icon-512.png` - 512x512px - App stores, splash screen
- `badge-72.png` - 72x72px - Badge notifications

## Icônes d'action (Notifications)
- `checkmark.png` - Action positive (Voir détails)
- `xmark.png` - Action fermeture (Fermer)

## Fichiers source
- `icon-base.svg` - Fichier SVG source principal
- `checkmark.svg` - Source checkmark
- `xmark.svg` - Source xmark

## Design
**Thème:** Bleu TechTemp (#2563EB)
**Style:** Thermomètre avec gradient mercure rouge-orange-jaune
**Éléments:** 
- Texte "TechTemp" et "IoT Monitoring"
- Échelle de température (10°-30°)
- Points IoT animés
- Background radial bleu

## Génération
Les icônes sont générées depuis `icon-base.svg` avec le script `generate-icons.js`:
```bash
node generate-icons.js
```

Nécessite ImageMagick, Inkscape ou rsvg-convert.
