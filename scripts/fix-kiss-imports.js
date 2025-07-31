#!/usr/bin/env node
// 🔧 Script de vérification et correction des imports KISS

const fs = require('fs');
const path = require('path');

console.log('🔧 Vérification des imports KISS...');

// Vérifier que apiService a la méthode getToken
const apiServicePath = 'frontend/src/services/api.ts';
if (fs.existsSync(apiServicePath)) {
  const apiContent = fs.readFileSync(apiServicePath, 'utf8');
  
  if (apiContent.includes('getToken(): string | null')) {
    console.log('✅ apiService.getToken() méthode présente');
  } else {
    console.log('❌ apiService.getToken() méthode manquante - ajout en cours...');
    
    // Ajouter la méthode getToken si manquante
    const updatedContent = apiContent.replace(
      /isAuthenticated\(\): boolean \{[\s\S]*?\}/,
      `getToken(): string | null {
		return this.token;
	}

	isAuthenticated(): boolean {
		return !!this.token;
	}`
    );
    
    fs.writeFileSync(apiServicePath, updatedContent);
    console.log('✅ Méthode getToken() ajoutée');
  }
} else {
  console.log('❌ Fichier api.ts non trouvé');
}

// Vérifier l'export d'apiService
if (fs.existsSync(apiServicePath)) {
  const apiContent = fs.readFileSync(apiServicePath, 'utf8');
  
  if (apiContent.includes('export const apiService = new ApiService()')) {
    console.log('✅ apiService correctement exporté');
  } else {
    console.log('❌ Export apiService manquant ou incorrect');
  }
}

// Vérifier GameInviteService
const gameInviteServicePath = 'frontend/src/services/GameInviteService.ts';
if (fs.existsSync(gameInviteServicePath)) {
  const gameInviteContent = fs.readFileSync(gameInviteServicePath, 'utf8');
  
  if (gameInviteContent.includes("import { apiService } from './api'")) {
    console.log('✅ GameInviteService import apiService correct');
  } else {
    console.log('❌ GameInviteService import apiService incorrect');
  }
  
  if (gameInviteContent.includes('typeof apiService.getToken !== \'function\'')) {
    console.log('✅ GameInviteService a la vérification défensive');
  } else {
    console.log('⚠️ GameInviteService n\'a pas la vérification défensive');
  }
} else {
  console.log('❌ Fichier GameInviteService.ts non trouvé');
}

// Vérifier les autres imports KISS
const kissFiles = [
  'frontend/src/components/SimpleInvitePopup.ts',
  'frontend/src/utils/kissInvites.ts'
];

kissFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${path.basename(filePath)} présent`);
  } else {
    console.log(`❌ ${path.basename(filePath)} manquant`);
  }
});

console.log('\n🎯 Vérification terminée. Si des erreurs persistent:');
console.log('1. Effacer le cache navigateur (Ctrl+F5)');
console.log('2. Redémarrer le serveur de développement');
console.log('3. Vérifier la console développeur pour plus de détails');