import { useState } from "react";
import { apiService } from "../../services/api";

type Props = {
  username: string;
  avatar: string;
  id: number;
};

const FriendRequests = ({ username, avatar, id }: Props) => 
{

	const [visible, setVisible] = useState(true);

	const dismiss = () =>
	{
		setVisible(false);
	}

	const accept = async () =>
	{
		try {
			await apiService.acceptFriendRequest(id);
			console.log('Accepted !')
			dismiss();
		} catch (error) {
			console.error(error);
		}
	}

	const reject = async () =>
	{
		try {
			await apiService.declineFriendRequest(id);
			console.log('Rejected !')
			dismiss();
		} catch (error) {
			console.error(error);
		}
	}

	const block = async () =>
	{
		try {
			console.log(id);
			await apiService.blockUser(id);
			console.log('Blocked !')
			dismiss();
		} catch (error) {
			console.error(error);
		}
	}

    return (
        <div className={`${visible ? 'block' : 'hidden'} border-white border-2 min-h-[120px] w-[320px] flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden mx-2`}>
            <div className="flex items-center justify-center min-w-[120px]">
                <img src={avatar} alt="icon" className="h-[90px] w-[90px] border-2"/>
            </div>
            <div className="flex flex-col">
                <h2 className="mt-2 flex-grow">{username}</h2>
				<div className="flex gap-2 items-end ml-12">
					<button onClick={block} className="border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
						<img src="./src/img/block.svg" alt="block" />
					</button>
					<button onClick={reject} className="border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
						<img src="./src/img/reject.svg" alt="reject" />
					</button>
					<button onClick={accept} className="border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
						<img src="./src/img/accept.svg" alt="accept" />
					</button>
				</div>
            </div>
        </div>
    );
};

export default FriendRequests;