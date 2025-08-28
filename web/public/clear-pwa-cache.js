// Script à exécuter dans la console pour nettoyer complètement le cache PWA
console.log('🧹 Nettoyage complet du cache PWA TechTemp...');

// 1. Désinscrire tous les Service Workers
navigator.serviceWorker.getRegistrations().then(function (registrations) {
  for (let registration of registrations) {
    registration.unregister();
    console.log('✅ Service Worker désinstallé:', registration.scope);
  }
});

// 2. Vider tous les caches
if ('caches' in window) {
  caches.keys().then(function (names) {
    names.forEach(function (name) {
      caches.delete(name);
      console.log('✅ Cache supprimé:', name);
    });
  });
}

// 3. Vider le localStorage
localStorage.clear();
console.log('✅ localStorage vidé');

// 4. Vider le sessionStorage  
sessionStorage.clear();
console.log('✅ sessionStorage vidé');

console.log('🎉 Nettoyage terminé ! Rechargez la page avec Cmd+Shift+R');
