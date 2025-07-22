import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Common/Header';
import BackBtn from '../components/Common/BackBtn';


const PongGame: React.FC = () => {
	const [gameStarted, setGameStarted] = useState(false);
	const socketRef = useRef<WebSocket | null>(null);
	const [ballX, setBallX] = useState(500);
	const [ballY, setBallY] = useState(200);

	useEffect(() =>
	{
		console.log('Waiting...')
		setTimeout(connect, 100); //pour eviter une erreur navigateur
		
		return () => socketRef.current?.close();

	}, []);

	const auth = () =>
	{
		const socket = socketRef.current;
		const token = localStorage.getItem('auth_token');

		const msg = 
		{
			"type": "auth",
			"token": token
		}

		if (!(socket && socket.readyState === WebSocket.OPEN))
		{
			console.error('socket closed');
			return ;
		}

		socket?.send(JSON.stringify(msg));
		setBallX(500);
		setBallY(200);
	}

	const connect = () =>
	{
		socketRef.current = new WebSocket('wss://localhost:8000/ws');
	
		socketRef.current.onopen = () =>
		{
			console.log('Hey !');
			auth();
		};
	
		socketRef.current.onmessage = (event) => {

			const data = JSON.parse(event.data);
			
			switch(data.type)
			{
				case 'connected':
					console.log('Connected !');
					break;
				case 'game_update':
					game(data);
					break;

			}
			
		};
	
		socketRef.current.onerror = (error) => console.error(error);
	
		socketRef.current.onclose = () => console.log('Bye !');
	}


	const game = (data: any) =>
	{
		const x = data.data.ball.pos.x * 2;
		const y = data.data.ball.pos.y * 2;
		console.log(x);
		console.log(y);

		setBallX(x);
		setBallY(y);
	}

	const test = () =>
	{
		const socket = socketRef.current;


		if (!(socket && socket.readyState === WebSocket.OPEN))
		{
			console.error('socket closed');
			return ;
		}

		const test =
		{
			"type": "start_game",
			"opponentId": 10
		};

		socket?.send(JSON.stringify(test));
		console.log('click');
	};


  
return (
	<div className="relative min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none bg-gradient-to-r from-blue-600 to-red-600 text-white">

	<Header />

	<div className='flex mb-8'>
		<BackBtn />
		<h2 className="text-[5rem] border-b-2 border-white w-full flex-1 text-center">Pong</h2>
		<div className='flex-1'></div>
	</div>

	<div className='flex justify-center gap-10'>
		<button className='border-2 w-[300px] h-[200px] text-[2rem]' onClick={test}>Click here when both players are on page</button>
		<h1 className='text-[4rem] text-red-500'>X : {ballX}</h1>
		<h1 className='text-[4rem] text-blue-500'>Y : { String(ballY).substring(0, 6) }</h1>
	</div>
		
	{gameStarted ? (
	<div className="flex flex-col items-center">
		<div className='min-w-[450px] h-[500px] border-2 flex flex-col items-center justify-evenly text-[2rem]'>
		<h1>Reglages ?</h1>
		<h1>choix</h1>
		<h1>choix</h1>



		<button 
			className="bg-blue-500 hover:scale-110 text-white py-2 px-4 rounded-md border-white border-2 w-2/3"
			onClick={test}>
			Start 
		</button>
	</div>


	</div>
	) : (
	<div className="relative flex flex-col items-center">
		<div className='border-4 h-[400px] w-[1000px] relative'>
			<div className='h-[10px] w-[10px] absolute border-2' style={{ top: `${ballY}px`, left: `${ballX}px` }}></div>

		</div>

		<button 
		className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4"
		onClick={() => setGameStarted(false)}
		>
		Arrêter
		</button>
	</div>
	)}

	</div>

);
};

export default PongGame;