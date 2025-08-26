// Palette prédéfinie ou générée
const PALETTE = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
  "#AA336A", "#A8D8EA", "#774898", "#E54B4B", "#F8B400"
];

// Crée un mapping UNIQUE pièce→couleur (hash par index connu / ou alphabetique)
export function colorForRoom(roomName) {
  // Pour être déterministe : trie/canonicalise si besoin
  // Possibilité : Hash, ou juste la position dans le tableau rooms !
  // Option la plus simple :
  let hash = 0;
  for (let i = 0; i < roomName.length; i++) {
    hash = roomName.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Index entre 0 et PALETTE.length-1
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}