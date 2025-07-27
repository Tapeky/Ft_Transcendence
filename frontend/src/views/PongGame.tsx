import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Common/Header';
import BackBtn from '../components/Common/BackBtn';


const PongGame: React.FC = () => {
	const [gameStarted, setGameStarted] = useState(false);
	const socketRef = useRef<WebSocket | null>(null);
	const [ballX, setBallX] = useState(500);
	const [ballY, setBallY] = useState(200);
	let id = Number;

	useEffect(() =>
	{

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

	}

	const connect = () =>
	{
		const ready = document.getElementById('ready');
		const lobby = document.getElementById('lobby');

		ready?.classList.replace('flex', 'hidden');
		lobby?.classList.replace('hidden', 'flex');

		socketRef.current = new WebSocket('wss://localhost:8000/ws');
	
		socketRef.current.onopen = () =>
		{
			console.log('Hey !');
			auth();
			socketRef.current?.send(JSON.stringify({"type": "online_users"}));	//tout changer sans react
		};
	
		socketRef.current.onmessage = (event) => {

			const data = JSON.parse(event.data);
			
			switch(data.type)
			{
				case 'connected':
					console.log('Connected !');
					break;
				case 'game_update':

					break;
				case 'auth_success':
					id = data.data.userId;
					break;
				case 'online_users':
					update_list(data);
					break;

			}
			
		};
	
		socketRef.current.onerror = (error) => console.error(error);
	
		socketRef.current.onclose = () => console.log('Bye !');
	}

	const update_list = (data: any) =>
	{
		const online_users = document.getElementById('online_users')!;

		if (data.data.length !== 0)
		{
			let error = 0;
			online_users.innerHTML = '';

			const ul = document.createElement('ul');
			ul.className = 'text-[3rem] items-center text-center mx-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8';

			data.data.forEach((user: any) => {
				if (user.id === id)
				{
					if (data.data.length === 1)
						error = 1;
					return ;
				}
				const li = document.createElement('li');
				li.className = 'border-b-2 border-white w-full';
				li.textContent = user.username;
				ul.appendChild(li);
			});
			if (!error)
				online_users.appendChild(ul);
			else
				online_users.innerHTML = `<h1> No opponent for now </h1>`;	
		}
		else
			online_users.innerHTML = `<h1> No opponent for now </h1>`;
		console.log('list updated');
	};



  
return (
	<div className="relative min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none bg-gradient-to-br from-purple-800 to-blue-900 text-white">

	<Header />

	<div className='flex mb-8'>
		<BackBtn />
		<h2 className="text-[5rem] border-b-2 border-white w-full flex-1 text-center">Pong</h2>
		<div className='flex-1'></div>
	</div>

	{!gameStarted ? (
	<div className="flex flex-col items-center">
		<button id='ready' className='border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[100px] w-[250px] flex items-center justify-center text-[4rem]' onClick={connect}>
			Ready
		</button>

		<div id='lobby' className='min-w-[450px] h-[500px] border-2 flex-col items-center text-[2rem] text-center hidden'>
			<div className='flex w-full mt-2'>
				<div className='flex-[0.5] items-center justify-center'>
					<button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black" onClick={() => socketRef.current?.send(JSON.stringify({"type": "online_users"}))}>
                		<img src="/src/img/refresh.svg" alt="block list" />
            		</button>
				</div>
				<h1 className='border-b-2 flex-[2] text-[3rem]' >Online players</h1>
				<div className='flex-[0.5]'></div>
			</div>

			<div id='online_users' className='flex-col items-center text-[2rem] flex-grow w-full'>

			</div>


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