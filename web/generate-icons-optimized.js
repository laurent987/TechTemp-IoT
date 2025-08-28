#!/usr/bin/env node

/**
 * Générateur d'icônes TechTemp optimisées
 * Crée des PNG simples sans dépendre de la conversion SVG
 */

const fs = require('fs');
const path = require('path');

// Créer un SVG simple optimisé pour conversion PNG
const createSimpleIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#2563EB"/>
  
  <!-- Thermometer body -->
  <rect x="${size * 0.3}" y="${size * 0.15}" width="${size * 0.4}" height="${size * 0.6}" 
        rx="${size * 0.2}" ry="${size * 0.2}" fill="white" stroke="#1E40AF" stroke-width="${size * 0.02}"/>
  
  <!-- Mercury bulb -->
  <circle cx="${size / 2}" cy="${size * 0.8}" r="${size * 0.12}" fill="#DC2626" stroke="#1E40AF" stroke-width="${size * 0.015}"/>
  
  <!-- Mercury column -->
  <rect x="${size * 0.4}" y="${size * 0.3}" width="${size * 0.2}" height="${size * 0.45}" fill="#DC2626"/>
  <rect x="${size * 0.4}" y="${size * 0.3}" width="${size * 0.2}" height="${size * 0.08}" rx="${size * 0.04}" ry="${size * 0.04}" fill="#DC2626"/>
  
  <!-- Temperature marks -->
  <line x1="${size * 0.75}" y1="${size * 0.25}" x2="${size * 0.85}" y2="${size * 0.25}" stroke="white" stroke-width="${size * 0.02}"/>
  <line x1="${size * 0.75}" y1="${size * 0.4}" x2="${size * 0.85}" y2="${size * 0.4}" stroke="white" stroke-width="${size * 0.02}"/>
  <line x1="${size * 0.75}" y1="${size * 0.55}" x2="${size * 0.85}" y2="${size * 0.55}" stroke="white" stroke-width="${size * 0.02}"/>
  
  <!-- Text TechTemp (pour grandes tailles) -->
  ${size >= 192 ? `<text x="${size / 2}" y="${size * 0.1}" text-anchor="middle" fill="white" 
    font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold">TechTemp</text>` : ''}
</svg>`;

const outputDir = path.join(__dirname, 'public/icons');
const sizes = [96, 144, 192, 384, 512];

console.log('🎨 Génération d\'icônes TechTemp optimisées...\n');

// Créer le dossier de sortie
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Générer les SVG temporaires et les convertir
for (const size of sizes) {
  const svgContent = createSimpleIcon(size);
  const tempSvgPath = path.join(outputDir, `temp-${size}.svg`);
  const pngPath = path.join(outputDir, `icon-${size}.png`);

  try {
    // Écrire le SVG temporaire
    fs.writeFileSync(tempSvgPath, svgContent);
    console.log(`📝 SVG temporaire créé: temp-${size}.svg`);

    // Convertir en PNG avec ImageMagick
    const { execSync } = require('child_process');
    const cmd = `magick "${tempSvgPath}" -background none -density 300 "${pngPath}"`;

    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ PNG généré: icon-${size}.png`);

    // Supprimer le SVG temporaire
    fs.unlinkSync(tempSvgPath);

  } catch (error) {
    console.log(`❌ Erreur pour ${size}px:`, error.message);
  }
}

// Créer aussi les icônes spéciales
try {
  const badgeSvg = createSimpleIcon(72);
  fs.writeFileSync(path.join(outputDir, 'temp-badge.svg'), badgeSvg);

  const { execSync } = require('child_process');
  execSync(`magick "${path.join(outputDir, 'temp-badge.svg')}" -background none -density 300 "${path.join(outputDir, 'badge-72.png')}"`, { stdio: 'pipe' });

  fs.unlinkSync(path.join(outputDir, 'temp-badge.svg'));
  console.log(`✅ Badge généré: badge-72.png`);
} catch (error) {
  console.log(`❌ Erreur badge:`, error.message);
}

console.log('\n🎉 Génération terminée !');
console.log('Les nouvelles icônes sont dans:', outputDir);
