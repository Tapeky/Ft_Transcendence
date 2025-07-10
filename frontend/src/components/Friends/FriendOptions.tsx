import { apiService } from "../../services/api";
import CloseBtn from "../Common/CloseBtn";
import { Link } from "react-router-dom";

type Props = {
  username: string;
  displayName: string;
  avatar: string;
  id: number;
  isOpen: boolean;
  setIsOpen: () => void;
  setDismiss: () => void;
};

const FriendOptions = ({username, displayName, avatar, id, isOpen, setIsOpen, setDismiss}: Props) =>
{

	const removeFriend = async() =>
	{
		try {
			const data = await apiService.removeFriend(id);
			console.log('Friend removed !');
			setDismiss();
			setIsOpen();
		}
		catch(error)
		{
			console.error(error);
		}
	}

	const block = async () =>
	{
		try {
			await apiService.blockUser(id);
			console.log('Blocked !')
			setDismiss();
			setIsOpen();
		} catch (error) {
			console.error(error);
		}
	}

	return (
		<div className={`${isOpen ? 'flex' : 'hidden'} fixed top-0 left-0 z-[60] bg-opacity-20 w-screen h-screen justify-center items-center text-white`}>
			<div className={`z-[65] w-[500px] h-[600px] border-[5px] border-black bg-purple-800 text-[2rem] fixed`}>

				<div className="flex flex-col h-full z-[65]">

					<CloseBtn func={setIsOpen}/>

					<div className="flex justify-center items-start">
						<img src={avatar} alt="icon" className="h-[150px] w-[150px] border-2 m-5" />
						<div className="flex flex-col flex-grow items-start justify-start overflow-hidden">
							<h1 className="text-[2.6rem] ">{username}</h1>
							<h2>{displayName}</h2>
						</div>
					</div>

					<div className="flex flex-col items-center justify-center gap-2 mt-2">
						<h2 className="text-[2rem]">▼ See {username}'s stats ▼</h2>
						<div className="h-[100px] w-3/4 text-center">
							<Link to='/dashboard'>
							<button className="text-[2.5rem] border-2 px-4 hover:scale-110 rounded-md bg-blue-800 w-full h-full transition duration-200">
								Dashboard
							</button>
							</Link>
						</div>
					</div>

					<div className="flex-grow flex justify-evenly items-center">
						<button className="border-2 h-[60px] w-[60px] mr-2 bg-white border-black">
							<img src="./src/img/block.svg" alt="block" onClick={block}/>
						</button>
						<button className="border-2 h-[60px] w-[60px] mr-2 bg-white border-black" >
							<img src="./src/img/remove.svg" alt="remove" onClick={removeFriend}/>
						</button>
					</div>

				</div>
			</div>
		</div>
	);
};

export default FriendOptions;