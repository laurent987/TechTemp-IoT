#!/usr/bin/env node

/**
 * Script pour générer les icônes PWA depuis le SVG de base
 * Utilise les outils système disponibles (Inkscape, ImageMagick, ou svg2png)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const svgPath = path.join(__dirname, 'public/icons/icon-base.svg');
const outputDir = path.join(__dirname, 'public/icons');

// Tailles requises pour PWA
const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 72, name: 'badge-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 384, name: 'icon-384.png' }
];

console.log('🎨 Génération des icônes PWA TechTemp...\n');

// Vérifier que le SVG existe
if (!fs.existsSync(svgPath)) {
  console.error('❌ Fichier SVG source introuvable:', svgPath);
  process.exit(1);
}

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Fonction pour tenter différents outils de conversion
function convertSvgToPng(svgFile, outputFile, size) {
  const commands = [
    // Inkscape (le plus fiable)
    `inkscape --export-png="${outputFile}" --export-width=${size} --export-height=${size} "${svgFile}"`,
    
    // ImageMagick
    `convert -density 300 -background transparent -resize ${size}x${size} "${svgFile}" "${outputFile}"`,
    
    // rsvg-convert (si disponible)
    `rsvg-convert -w ${size} -h ${size} -o "${outputFile}" "${svgFile}"`,
  ];

  for (const cmd of commands) {
    try {
      console.log(`📐 Génération ${size}x${size} -> ${path.basename(outputFile)}`);
      execSync(cmd, { stdio: 'pipe' });
      
      if (fs.existsSync(outputFile)) {
        console.log(`✅ ${path.basename(outputFile)} généré avec succès`);
        return true;
      }
    } catch (error) {
      // Essayer la commande suivante
      continue;
    }
  }
  
  return false;
}

// Générer toutes les tailles
let successCount = 0;

for (const { size, name } of sizes) {
  const outputPath = path.join(outputDir, name);
  
  if (convertSvgToPng(svgPath, outputPath, size)) {
    successCount++;
  } else {
    console.log(`⚠️  Échec de génération pour ${name}`);
  }
}

console.log(`\n🎉 Génération terminée: ${successCount}/${sizes.length} icônes créées`);

if (successCount === 0) {
  console.log('\n❌ Aucun outil de conversion trouvé. Essayez d\'installer:');
  console.log('- Inkscape: brew install inkscape');
  console.log('- ImageMagick: brew install imagemagick');
  console.log('- rsvg-convert: brew install librsvg');
} else if (successCount < sizes.length) {
  console.log('\n⚠️  Certaines icônes n\'ont pas pu être générées.');
  console.log('Vous pouvez les créer manuellement ou installer un outil de conversion.');
} else {
  console.log('\n✨ Toutes les icônes ont été générées avec succès !');
  console.log('Les fichiers sont dans:', outputDir);
}
