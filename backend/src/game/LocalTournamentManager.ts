/**
 * Local Tournament Manager - Système de tournoi local avec joueurs humains et IA
 * Permet à plusieurs personnes de jouer sur le même PC avec IA de remplissage
 */

export interface LocalPlayer {
  id: number;
  name: string;
  alias: string;
  type: 'human' | 'ai';
  aiLevel?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
}

export interface LocalMatch {
  id: number;
  round: number;
  position: number;
  player1: LocalPlayer;
  player2: LocalPlayer;
  winner?: LocalPlayer;
  status: 'scheduled' | 'in_progress' | 'completed' | 'simulated';
  player1Score?: number;
  player2Score?: number;
  isHumanMatch: boolean; // True si au moins un joueur est humain
}

export interface LocalTournamentBracket {
  tournamentId: number;
  players: LocalPlayer[];
  matches: LocalMatch[];
  rounds: number;
  currentMatch?: LocalMatch;
  status: 'setup' | 'in_progress' | 'completed';
  winner?: LocalPlayer;
}

export class LocalTournamentManager {
  private static instance: LocalTournamentManager;
  private currentTournament: LocalTournamentBracket | null = null;
  private aiNamePool = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Fox', 'Golf', 'Hotel',
    'Nova', 'Orion', 'Phoenix', 'Quantum', 'Razor', 'Storm', 'Titan', 'Vortex'
  ];

  public static getInstance(): LocalTournamentManager {
    if (!LocalTournamentManager.instance) {
      LocalTournamentManager.instance = new LocalTournamentManager();
    }
    return LocalTournamentManager.instance;
  }

  /**
   * Créer un nouveau tournoi local
   */
  createLocalTournament(humanPlayers: Array<{name: string, alias: string}>): LocalTournamentBracket {
    const totalPlayers = 8; // Bracket fixe à 8 joueurs
    const playersNeeded = totalPlayers - humanPlayers.length;
    
    if (humanPlayers.length === 0) {
      throw new Error('Au moins un joueur humain requis');
    }
    
    if (humanPlayers.length > totalPlayers) {
      throw new Error(`Maximum ${totalPlayers} joueurs autorisés`);
    }

    // Créer les joueurs humains
    const players: LocalPlayer[] = humanPlayers.map((human, index) => ({
      id: index + 1,
      name: human.name,
      alias: human.alias,
      type: 'human',
      isActive: true
    }));

    // Ajouter les IA de remplissage
    const aiPlayers = this.generateAIPlayers(playersNeeded, humanPlayers.length + 1);
    players.push(...aiPlayers);

    // Mélanger les joueurs pour un bracket équitable
    const shuffledPlayers = this.shufflePlayers(players);

    // Générer les matches
    const matches = this.generateMatches(shuffledPlayers);

    const tournament: LocalTournamentBracket = {
      tournamentId: Date.now(),
      players: shuffledPlayers,
      matches,
      rounds: 3, // 8 joueurs = 3 rounds (4->2->1)
      status: 'setup',
      currentMatch: this.findNextHumanMatch(matches)
    };

    this.currentTournament = tournament;
    return tournament;
  }

  /**
   * Générer des joueurs IA avec différents niveaux
   */
  private generateAIPlayers(count: number, startId: number): LocalPlayer[] {
    const aiPlayers: LocalPlayer[] = [];
    const availableNames = [...this.aiNamePool];
    
    for (let i = 0; i < count; i++) {
      const nameIndex = Math.floor(Math.random() * availableNames.length);
      const name = availableNames.splice(nameIndex, 1)[0];
      
      // Distribution des niveaux IA
      let aiLevel: 'easy' | 'medium' | 'hard';
      if (i < Math.ceil(count * 0.4)) {
        aiLevel = 'easy';
      } else if (i < Math.ceil(count * 0.8)) {
        aiLevel = 'medium';
      } else {
        aiLevel = 'hard';
      }

      aiPlayers.push({
        id: startId + i,
        name: `AI_${name}`,
        alias: `${name}`,
        type: 'ai',
        aiLevel,
        isActive: false
      });
    }

    return aiPlayers;
  }

  /**
   * Mélanger les joueurs pour équilibrer le bracket
   */
  private shufflePlayers(players: LocalPlayer[]): LocalPlayer[] {
    const humans = players.filter(p => p.type === 'human');
    const ais = players.filter(p => p.type === 'ai');
    
    // Mélanger séparément
    const shuffledHumans = humans.sort(() => Math.random() - 0.5);
    const shuffledAIs = ais.sort(() => Math.random() - 0.5);
    
    // Distribuer pour éviter que les humains se rencontrent trop tôt
    const result: LocalPlayer[] = [];
    const totalSlots = 8;
    
    // Placer les humains de manière espacée
    const humanPositions = [];
    if (shuffledHumans.length === 2) {
      humanPositions.push(0, 4); // Positions opposées
    } else if (shuffledHumans.length === 3) {
      humanPositions.push(0, 3, 6);
    } else {
      // Distribution uniforme pour plus de 3 humains
      for (let i = 0; i < shuffledHumans.length; i++) {
        humanPositions.push(Math.floor((i * totalSlots) / shuffledHumans.length));
      }
    }
    
    // Remplir le tableau
    let humanIndex = 0;
    let aiIndex = 0;
    
    for (let i = 0; i < totalSlots; i++) {
      if (humanPositions.includes(i) && humanIndex < shuffledHumans.length) {
        result[i] = shuffledHumans[humanIndex++];
      } else if (aiIndex < shuffledAIs.length) {
        result[i] = shuffledAIs[aiIndex++];
      }
    }
    
    return result;
  }

  /**
   * Générer tous les matches du bracket
   */
  private generateMatches(players: LocalPlayer[]): LocalMatch[] {
    const matches: LocalMatch[] = [];
    let matchId = 1;

    // Round 1 (8 -> 4)
    for (let i = 0; i < 4; i++) {
      const player1 = players[i * 2];
      const player2 = players[i * 2 + 1];
      
      matches.push({
        id: matchId++,
        round: 1,
        position: i,
        player1,
        player2,
        status: 'scheduled',
        isHumanMatch: player1.type === 'human' || player2.type === 'human'
      });
    }

    // Round 2 (4 -> 2) - Places vides pour l'instant
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: matchId++,
        round: 2,
        position: i,
        player1: { id: 0, name: 'TBD', alias: 'TBD', type: 'ai' },
        player2: { id: 0, name: 'TBD', alias: 'TBD', type: 'ai' },
        status: 'scheduled',
        isHumanMatch: false // Sera mis à jour quand les gagnants seront connus
      });
    }

    // Round 3 (Finale) - Places vides
    matches.push({
      id: matchId++,
      round: 3,
      position: 0,
      player1: { id: 0, name: 'TBD', alias: 'TBD', type: 'ai' },
      player2: { id: 0, name: 'TBD', alias: 'TBD', type: 'ai' },
      status: 'scheduled',
      isHumanMatch: false
    });

    return matches;
  }

  /**
   * Simuler un match IA vs IA
   */
  simulateAIMatch(match: LocalMatch): LocalMatch {
    if (match.player1.type === 'human' || match.player2.type === 'human') {
      throw new Error('Cannot simulate match with human players');
    }

    // Calculer les probabilités basées sur les niveaux IA
    const player1Strength = this.getAIStrength(match.player1.aiLevel!);
    const player2Strength = this.getAIStrength(match.player2.aiLevel!);
    
    const totalStrength = player1Strength + player2Strength;
    const player1WinChance = player1Strength / totalStrength;
    
    // Déterminer le gagnant
    const player1Wins = Math.random() < player1WinChance;
    const winner = player1Wins ? match.player1 : match.player2;
    const loser = player1Wins ? match.player2 : match.player1;
    
    // Générer des scores réalistes
    const winnerScore = 11;
    let loserScore: number;
    
    if (Math.abs(player1Strength - player2Strength) > 2) {
      // Match déséquilibré
      loserScore = Math.floor(Math.random() * 6) + 2; // 2-7
    } else {
      // Match équilibré
      loserScore = Math.floor(Math.random() * 4) + 7; // 7-10
    }

    return {
      ...match,
      winner,
      status: 'simulated',
      player1Score: player1Wins ? winnerScore : loserScore,
      player2Score: player1Wins ? loserScore : winnerScore
    };
  }

  /**
   * Obtenir la force d'une IA
   */
  private getAIStrength(level: 'easy' | 'medium' | 'hard'): number {
    switch (level) {
      case 'easy': return 3;
      case 'medium': return 5;
      case 'hard': return 7;
      default: return 4;
    }
  }

  /**
   * Enregistrer le résultat d'un match humain
   */
  recordHumanMatchResult(matchId: number, winnerId: number, player1Score: number, player2Score: number): void {
    if (!this.currentTournament) {
      throw new Error('No active tournament');
    }

    const match = this.currentTournament.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (!match.isHumanMatch) {
      throw new Error('Cannot record result for AI-only match');
    }

    // Trouver le gagnant
    const winner = winnerId === match.player1.id ? match.player1 : match.player2;
    
    match.winner = winner;
    match.status = 'completed';
    match.player1Score = player1Score;
    match.player2Score = player2Score;

    // Progression automatique
    this.advanceWinner(match);
    this.simulateAllAIMatches();
    this.updateCurrentMatch();
  }

  /**
   * Faire avancer le gagnant au round suivant
   */
  private advanceWinner(completedMatch: LocalMatch): void {
    if (!this.currentTournament || !completedMatch.winner) return;

    const nextRound = completedMatch.round + 1;
    if (nextRound > 3) return; // Pas de round après la finale

    // Trouver le match suivant
    const nextMatchPosition = Math.floor(completedMatch.position / 2);
    const nextMatch = this.currentTournament.matches.find(
      m => m.round === nextRound && m.position === nextMatchPosition
    );

    if (!nextMatch) return;

    // Placer le gagnant dans la bonne position
    if (completedMatch.position % 2 === 0) {
      nextMatch.player1 = completedMatch.winner;
    } else {
      nextMatch.player2 = completedMatch.winner;
    }

    // Mettre à jour si c'est un match humain
    nextMatch.isHumanMatch = nextMatch.player1.type === 'human' || nextMatch.player2.type === 'human';
  }

  /**
   * Simuler tous les matches IA disponibles
   */
  private simulateAllAIMatches(): void {
    if (!this.currentTournament) return;

    let changed = true;
    while (changed) {
      changed = false;
      
      for (const match of this.currentTournament.matches) {
        if (match.status === 'scheduled' && 
            !match.isHumanMatch && 
            match.player1.id !== 0 && 
            match.player2.id !== 0) {
          
          const simulatedMatch = this.simulateAIMatch(match);
          Object.assign(match, simulatedMatch);
          this.advanceWinner(match);
          changed = true;
          
          console.log(`🤖 AI Match: ${match.player1.alias} ${match.player1Score} - ${match.player2Score} ${match.player2.alias} | Winner: ${match.winner?.alias}`);
        }
      }
    }
  }

  /**
   * Trouver le prochain match avec joueur humain
   */
  private findNextHumanMatch(matches: LocalMatch[]): LocalMatch | undefined {
    return matches.find(match => 
      match.status === 'scheduled' && 
      match.isHumanMatch &&
      match.player1.id !== 0 && 
      match.player2.id !== 0
    );
  }

  /**
   * Mettre à jour le match courant
   */
  private updateCurrentMatch(): void {
    if (!this.currentTournament) return;

    this.currentTournament.currentMatch = this.findNextHumanMatch(this.currentTournament.matches);
    
    if (!this.currentTournament.currentMatch) {
      // Plus de matches humains, vérifier si tournoi terminé
      const allCompleted = this.currentTournament.matches.every(m => 
        m.status === 'completed' || m.status === 'simulated'
      );
      
      if (allCompleted) {
        const finalMatch = this.currentTournament.matches.find(m => m.round === 3);
        this.currentTournament.status = 'completed';
        this.currentTournament.winner = finalMatch?.winner;
      }
    }
  }

  /**
   * Obtenir le tournoi actuel
   */
  getCurrentTournament(): LocalTournamentBracket | null {
    return this.currentTournament;
  }

  /**
   * Obtenir les statistiques du tournoi
   */
  getTournamentStats(): any {
    if (!this.currentTournament) return null;

    const completedMatches = this.currentTournament.matches.filter(m => 
      m.status === 'completed' || m.status === 'simulated'
    );
    
    const humanMatches = this.currentTournament.matches.filter(m => m.isHumanMatch);
    const completedHumanMatches = humanMatches.filter(m => m.status === 'completed');

    return {
      totalMatches: this.currentTournament.matches.length,
      completedMatches: completedMatches.length,
      humanMatches: humanMatches.length,
      completedHumanMatches: completedHumanMatches.length,
      currentRound: this.currentTournament.currentMatch?.round || 'Finished',
      status: this.currentTournament.status
    };
  }

  /**
   * Réinitialiser pour un nouveau tournoi
   */
  reset(): void {
    this.currentTournament = null;
  }
}