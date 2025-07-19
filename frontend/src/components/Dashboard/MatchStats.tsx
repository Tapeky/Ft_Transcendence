import { useState, useEffect } from "react";
import CloseBtn from "../Common/CloseBtn";
import { apiService, MatchDetails } from "../../services/api";

type Props = {
  visible: boolean,
  setVisible: () => void
  id: number
};

const MatchStats = ({ visible, setVisible, id }: Props) => {

	const [match, setMatch] = useState<MatchDetails>();

	useEffect(() =>
	{
		const fetchMatches = async() =>
		{
			try
			{
				const data = await apiService.getMatchById(id);
				setMatch(data);
			} catch (error) {
				console.error(error);
				setMatch(undefined);
			}
		};
		
		if (id) {
			fetchMatches();
		}
		}
		, [id]
	);





	return (
		<div className={`${visible ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-center text-white`}>
			<div className='flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 w-[1000px] h-[600px] border-[5px] border-black text-[3rem] box-border font-iceland select-none'>
				<CloseBtn func={setVisible}/>
				{ match === undefined ? <div className="text-center">Error loading stats</div> : 
				
				<div className="flex flex-col items-center border-collapse m-2">
					
					<div className="flex w-full text-center gap-10">
						<div className="text-[3rem] flex-1 flex overflow-hidden gap-4 justify-start">
							<img src={match?.player1_avatar_url} alt="icon" className="border-2 min-w-[120px] h-[120px]"/>
							<h1> {match?.player1_username}</h1>
						</div>

						<div className="text-[3rem] flex-1 flex overflow-hidden gap-4 justify-end">
							<h1> {match?.player2_username} </h1>
							<img src={match?.player2_avatar_url} alt="icon" className="border-2 min-w-[120px] h-[120px]"/>
						</div>

					</div>
				
					<h2 className="text-[4rem]"> {match?.duration_seconds}s </h2>

					<div className="flex justify-evenly w-full text-center mb-4">
						<h2 className="flex-1">{match?.player1_score}</h2>
						<h2 className="flex-1 border-b-2 border-dashed">Score</h2>
						<h2 className="flex-1">{match?.player2_score}</h2>
					</div>

					<div className="flex justify-evenly w-full text-center mb-4">
						<h2 className="flex-1">{match?.player1_touched_ball}</h2>
						<h2 className="flex-1 border-b-2 border-dashed">Hits</h2>
						<h2 className="flex-1">{match?.player2_touched_ball}</h2>
					</div>

					<div className="flex justify-evenly w-full text-center">
						<h2 className="flex-1">{match?.player1_missed_ball}</h2>
						<h2 className="flex-1 border-b-2 border-dashed">Misses</h2>
						<h2 className="flex-1">{match?.player2_missed_ball}</h2>
					</div>
				
				</div>
				}	

			</div>



		</div>

	);
};

export default MatchStats;