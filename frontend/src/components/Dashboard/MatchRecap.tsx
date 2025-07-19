import { Match } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { getAvatarUrl } from "../../utils/avatar";
import MatchStats from "./MatchStats";
import { useState } from "react";

type Props = {
  match: Match;
};


const MatchRecap = ({match}: Props) => {

    const { user } = useAuth();
    const victory = (match.winner_id === user?.id ? true : false);
    const [stats, setStats] = useState(false);

    const showStats = () =>
    {
        setStats(true);
    };

    return (
        <div className={`${victory ? 'bg-blue-800' : 'bg-pink-800'} h-[180px] w-4/5 border-2 
            self-center cursor-pointer hover:scale-105 transition duration-300 text-[2rem] p-4 flex`} onClick={showStats}>

            <div className="flex-1">
                <h1 className="text-[3rem]">{victory ? "Victory" : "Defeat"}</h1>
                <h2>{match.created_at}</h2>
            </div>

            <div className="flex-[2] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
                    <img src={getAvatarUrl(match.player1_avatar_url)} alt="icon" className="border-2 h-[100px] w-[100px]"/> 
                    <h1>{match.player1_username || match.player1_guest_name || 'Unknown'}</h1>
                </div>

                <h1 className="flex-1 text-center text-[4rem]">{match.player1_score} - {match.player2_score}</h1>
                
                <div className="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
                    <img src={getAvatarUrl(match.player2_avatar_url)} alt="icon" className="border-2 h-[100px] w-[100px]"/> 
                    <h1>{match.player2_username || match.player2_guest_name || 'Unknown'}</h1>
                </div>
            </div>

            <MatchStats visible={stats} setVisible={() => setStats(false)} id={match.id} />
        </div>

    );
};

export default MatchRecap;
