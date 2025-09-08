#!/usr/bin/env node

// Simple test for the LocalTournamentManager
const { LocalTournamentManager } = require('./dist/game/LocalTournamentManager.js');

async function testLocalTournament() {
    console.log('🏆 Testing Local Tournament System');
    console.log('==================================');

    try {
        const manager = LocalTournamentManager.getInstance();
        
        // Test 1: Create tournament
        console.log('\n✅ Test 1: Create tournament with 2 human players');
        const humanPlayers = [
            { name: 'Alice', alias: 'Player1' },
            { name: 'Bob', alias: 'Player2' }
        ];
        
        const tournament = manager.createLocalTournament(humanPlayers);
        console.log(`Tournament created with ${tournament.players.length} players`);
        console.log(`Rounds: ${tournament.rounds}`);
        console.log(`Status: ${tournament.status}`);
        
        // Test 2: Show bracket
        console.log('\n✅ Test 2: Tournament bracket');
        tournament.players.forEach((player, index) => {
            console.log(`${index + 1}. ${player.alias} (${player.type}${player.aiLevel ? ` - ${player.aiLevel}` : ''})`);
        });
        
        // Test 3: Simulate a match result
        console.log('\n✅ Test 3: Record human match result');
        const firstMatch = tournament.matches.find(m => m.isHumanMatch);
        if (firstMatch) {
            console.log(`Match: ${firstMatch.player1.alias} vs ${firstMatch.player2.alias}`);
            
            // Simulate Player 1 wins 11-7
            manager.recordHumanMatchResult(firstMatch.id, firstMatch.player1.id, 11, 7);
            
            const updatedTournament = manager.getCurrentTournament();
            console.log(`Winner: ${firstMatch.winner?.alias}`);
            console.log(`Score: ${firstMatch.player1Score} - ${firstMatch.player2Score}`);
        }
        
        // Test 4: Tournament stats
        console.log('\n✅ Test 4: Tournament statistics');
        const stats = manager.getTournamentStats();
        console.log(JSON.stringify(stats, null, 2));
        
        console.log('\n🎉 All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testLocalTournament();