import { useAuth } from "../contexts/AuthContext";
import { useNav } from "../contexts/NavContext";
import Header from "../components/Common/Header";
import BackBtn from "../components/Common/BackBtn";
import { useEffect, useState } from "react";
import { apiService, Tournament as TournamentType, TournamentParticipant } from "../services/api";

const Tournament = () => {
    const { user, loading, isAuthenticated } = useAuth();
    const { goTo } = useNav();
    const [tournaments, setTournaments] = useState<TournamentType[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [tournamentForm, setTournamentForm] = useState({
        name: '',
        description: '',
        max_players: 4
    });
    const [loadingTournaments, setLoadingTournaments] = useState(true);

    useEffect(() => {
        if (!loading && !(isAuthenticated && user)) {
            goTo('/');
        }
    }, [loading, isAuthenticated, user, goTo]);

    useEffect(() => {
        if (isAuthenticated && user) {
            loadTournaments();
        }
    }, [isAuthenticated, user]);

    const loadTournaments = async () => {
        try {
            const data = await apiService.getTournaments();
            setTournaments(data);
        } catch (error) {
            console.error('Error loading tournaments:', error);
        } finally {
            setLoadingTournaments(false);
        }
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiService.createTournament(tournamentForm);
            setTournamentForm({ name: '', description: '', max_players: 4 });
            setShowCreateForm(false);
            await loadTournaments();
        } catch (error) {
            console.error('Error creating tournament:', error);
        }
    };

    const handleJoinTournament = async (tournamentId: number) => {
        try {
            const alias = prompt('Enter your tournament alias:');
            if (alias) {
                await apiService.joinTournament(tournamentId, alias);
                await loadTournaments();
            }
        } catch (error) {
            console.error('Error joining tournament:', error);
        }
    };

    if (loading) {
        return <div className='bg-purple-800 text-white text-3xl'>Loading...</div>;
    }

    if (!(isAuthenticated && user)) {
        return null;
    }

    return (
        <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none">
            <Header userVisible={true}/>
            
            <div className="flex-1 bg-gradient-to-br from-purple-800 to-blue-900 text-white">
                <div className="container mx-auto px-8 py-8">
                    <div className="flex items-center gap-4 mb-8">
                        <BackBtn />
                        <h1 className="text-5xl font-bold">🏆 Tournaments</h1>
                    </div>

                    {/* Create Tournament Button */}
                    <div className="mb-8">
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-xl font-bold transition duration-200"
                        >
                            Create Tournament
                        </button>
                    </div>

                    {/* Create Tournament Form */}
                    {showCreateForm && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
                            <h2 className="text-2xl font-bold mb-4">Create New Tournament</h2>
                            <form onSubmit={handleCreateTournament} className="space-y-4">
                                <div>
                                    <label className="block text-lg mb-2">Tournament Name</label>
                                    <input
                                        type="text"
                                        value={tournamentForm.name}
                                        onChange={(e) => setTournamentForm({...tournamentForm, name: e.target.value})}
                                        className="w-full p-3 rounded-lg text-black"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-lg mb-2">Description</label>
                                    <textarea
                                        value={tournamentForm.description}
                                        onChange={(e) => setTournamentForm({...tournamentForm, description: e.target.value})}
                                        className="w-full p-3 rounded-lg text-black h-24"
                                    />
                                </div>
                                <div>
                                    <label className="block text-lg mb-2">Max Players</label>
                                    <select
                                        value={tournamentForm.max_players}
                                        onChange={(e) => setTournamentForm({...tournamentForm, max_players: parseInt(e.target.value)})}
                                        className="w-full p-3 rounded-lg text-black"
                                    >
                                        <option value={4}>4 Players</option>
                                        <option value={8}>8 Players</option>
                                        <option value={16}>16 Players</option>
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
                                    >
                                        Create
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Tournament List */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <h2 className="text-3xl font-bold mb-6">Available Tournaments</h2>
                        
                        {loadingTournaments ? (
                            <div className="text-center text-xl">Loading tournaments...</div>
                        ) : tournaments.length === 0 ? (
                            <div className="text-center text-xl">
                                <div className="text-6xl mb-4">🎯</div>
                                <div>No tournaments available</div>
                                <div className="text-lg text-gray-300 mt-2">Create the first one!</div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {tournaments.map((tournament) => (
                                    <div
                                        key={tournament.id}
                                        className="bg-white/20 rounded-lg p-4 border border-white/20"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold">{tournament.name}</h3>
                                                <p className="text-gray-300">{tournament.description}</p>
                                                <div className="flex gap-4 mt-2 text-sm">
                                                    <span>👥 {tournament.current_players}/{tournament.max_players} players</span>
                                                    <span>📊 Status: {tournament.status}</span>
                                                    <span>👤 By: {tournament.creator_username}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Created: {new Date(tournament.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                {tournament.status === 'open' && tournament.current_players < tournament.max_players ? (
                                                    <button
                                                        onClick={() => handleJoinTournament(tournament.id)}
                                                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                                                    >
                                                        Join
                                                    </button>
                                                ) : tournament.status === 'in_progress' ? (
                                                    <button
                                                        onClick={() => goTo(`/tournament/${tournament.id}/bracket`)}
                                                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                                                    >
                                                        View Bracket
                                                    </button>
                                                ) : tournament.status === 'full' ? (
                                                    <span className="bg-red-600 px-4 py-2 rounded-lg">Full</span>
                                                ) : (
                                                    <span className="bg-gray-600 px-4 py-2 rounded-lg">Closed</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tournament;