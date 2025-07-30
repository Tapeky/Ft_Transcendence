import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import BackBtn from "../components/Common/BackBtn";
import MatchRecap from "../components/Dashboard/MatchRecap";
import { apiService, User, Match } from "../services/api";
import { useState, useEffect } from "react";
import { useNav } from "../contexts/NavContext";
import CloseBtn from "../components/Common/CloseBtn";

type Props = {
  id: string,
};

const Dashboard = ({ id }: Props) => {

    const { user, loading, isAuthenticated } = useAuth();
    const [player, setPlayer] = useState<User>();
    const [match, setMatch] = useState<Match[]>([]);
	const [graph, setGraph] = useState(false);
	const { goTo } = useNav();

	useEffect(() => {
		if (!loading && !(isAuthenticated && user)) {
			goTo('/');
		}
	}, [loading, isAuthenticated, user, goTo]);

    useEffect(() =>
    {
        const fetchPlayer = async() =>
        {
            try {
                const data = await apiService.getUserById(Number(id));
                setPlayer(data);
            } catch (error) {
                console.error(error);
            }
        };
        
        fetchPlayer();
        }
        , [id]
    );

    useEffect(() =>
    {
        const fetchMatches = async() =>
        {
            try {
                const { data } = await apiService.getMatches({player_id: Number(id)});
                setMatch(data || []);
            } catch (error) {
                console.error(error);
                setMatch([]);
            }
        };
        
        if (id) {
            fetchMatches();
        }
        }
        , [id]
    );

	if (loading) {
		return <div className='bg-purple-800 text-white text-3xl'>Loading...</div>;
	}

	if (!(isAuthenticated && user)) {
		return null;
	}


    return (
        <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white  ">
            <Header />  
            <div className="w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600  self-center border-x-4 border-t-4 flex flex-col p-4">
                <div className="text-center text-[4rem] border-b-2 w-full flex">

                    <BackBtn />

                    <h1 className="flex-1">{player?.username}'s <br /> Dashboard</h1>
                    <div className="flex-1 flex items-center justify-center">
						<button onClick={() => setGraph(true)} className="border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[120px] flex items-center justify-center text-[3rem]">More</button>
					</div>
                </div>

                <div className="flex flex-col mt-6 mx-10 flex-grow text-white text-[3rem]">
                    <div className="border-b-2 pb-6 border-dashed mb-10">
                        <h3 className="text-center text-[2.5rem]">Games played : {player?.total_games || 0}</h3>
                        <ul className="flex justify-evenly text-[2.2rem]">
                            <li>Wins : {player?.total_wins || 0}</li>
                            <li>Losses : {player?.total_losses || 0}</li>
                        </ul>
                    </div>
                    <div className="flex flex-col gap-2 items-center">
                        <h3 className="border-b-2 border-white">Match history</h3>
                        {(!match || match.length === 0) &&
                        <div>Nothing to see here</div>
                        }
                        {match && match.map(match => <MatchRecap key={match.id} match={match}/>)}


                    </div>

                </div>


            </div>

			<div className={`${graph ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-center text-white`}>
						<div className="h-[500px] w-[1200px] bg-gradient-to-tl from-purple-700 to-blue-800 border-4 flex flex-col gap-10">
							<CloseBtn func={() => setGraph(false)}/>

							<div className="flex h-full text-[2.5rem]">

								<div className="flex-1 h-full">



								</div>

								<div className="flex-1 h-full">
									

								</div>

							</div>



						</div>
			</div>


        </div>
    );


}

export default Dashboard;