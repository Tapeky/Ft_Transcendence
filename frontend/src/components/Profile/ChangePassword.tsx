import { apiService } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";
import CloseBtn from "../Common/CloseBtn";

const ChangePassword = () =>
{
	const { refreshUser } = useAuth();
	const [showWindow, setShowWindow] = useState(false);
	const [reveal_1, setReveal_1 ] = useState(false); 
	const [reveal_2, setReveal_2 ] = useState(false); 
	const [reveal_3, setReveal_3 ] = useState(false); 

	const current = document.getElementById("current") as HTMLInputElement;
	const newww = document.getElementById("newww") as HTMLInputElement;
	const confirm = document.getElementById("confirm") as HTMLInputElement;

	const openWindow = () =>
	{
		setShowWindow(true);
	};

	const closeWindow = () =>
	{
		clearInputs();
		setShowWindow(false);
	};

	const clearInputs = () =>
	{
		current.value = '';
		newww.value = '';
		confirm.value = '';
	};

	const firstReveal = () =>
	{
		setReveal_1(!reveal_1);
	}

	const secondReveal = () =>
	{
		setReveal_2(!reveal_2)
	}

	const thirdReveal = () =>
	{
		setReveal_3(!reveal_3)
	}

	return (
		<div className="flex justify-center">
            <h4 className="flex-1">Password</h4>
            <div className="flex-1">
                <button className="border-2 w-full bg-blue-800 hover:scale-105 text-white rounded-md translate-x-[-20px]" onClick={openWindow}>
					Change
				</button>
            </div>
			<div className="flex-1"></div>

		<div className={`${showWindow ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center`}>
            <div className='flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem]'>
                <CloseBtn func={closeWindow}/>

			<div className="flex flex-col justify-center items-center mt-6 gap-4">

				<div>
					<h2>Current password</h2>
					<div className="flex">
						<input type={reveal_1 ? 'input' : 'password'} className="text-black rounded-md indent-4" id="current"/>
						<button className={`w-[50px] rounded-md ml-3 border-2 ${reveal_1 ? 'border-black bg-white' : 'border-white'}`} onClick={firstReveal}>
							<img src={reveal_1 ? '/src/img/eye_black.svg' : '/src/img/eye_white.svg'} alt="reveal" className="w-[50px] h-[50px]"/>
						</button>
					</div>
				</div>

				<div>
					<h2>New password</h2>
					<div className="flex">
						<input type={reveal_2 ? 'input' : 'password'} className="text-black rounded-md indent-4" id="newww" />
						<button className={`w-[50px] rounded-md ml-3 border-2 ${reveal_2 ? 'border-black bg-white' : 'border-white'}`} onClick={secondReveal}>
							<img src={reveal_2 ? '/src/img/eye_black.svg' : '/src/img/eye_white.svg'} alt="reveal" className="w-[50px] h-[50px]"/>
						</button>
					</div>
				</div>

				<div>
					<h2>Confirm new password</h2>
					<div className="flex">
						<input type={reveal_3 ? 'input' : 'password'} className="text-black rounded-md indent-4" id="confirm" />
						<button className={`w-[50px] rounded-md ml-3 border-2 ${reveal_3 ? 'border-black bg-white' : 'border-white'}`} onClick={thirdReveal}>
							<img src={reveal_3 ? '/src/img/eye_black.svg' : '/src/img/eye_white.svg'} alt="reveal" className="w-[50px] h-[50px]"/>
						</button>
					</div>
				</div>

				<h2>(Status)</h2>

				<button className="border-2 p-2 px-6 bg-blue-800 hover:scale-110 text-white rounded-md">
					OK
				</button>
			</div>
				


            </div>
        </div>
        </div>);
}

export default ChangePassword;
