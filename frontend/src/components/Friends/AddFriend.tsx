import { apiService } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

const AddFriend = () => {

	const {user} = useAuth();
	const [status, setStatus] = useState('ok');
	const [showStatus, setShowStatus] = useState(false);

	useEffect(() =>
	{
		if (showStatus)
		{
			const timer = setTimeout(() => {
				setShowStatus(false);
			}, 5000);

			return () => clearTimeout(timer);
		}
	}
		, [status, showStatus]
	);

	const addFriend = async() =>
	{
		const nameInput = document.getElementById('nameInput') as HTMLInputElement | null;
		if (!nameInput)
			return;

		if (nameInput.value.length < 3)
		{
			setStatus('len');
			setShowStatus(true);
			return;
		}

		if (nameInput.value === user?.username)
		{
			setStatus('self');
			setShowStatus(true);
			return;
		}

		try {
			const data = await apiService.searchUsers(nameInput.value);
			const index = data.findIndex(user => user.username === nameInput.value);
			if (index === -1)
			{
				setStatus('ko');
				setShowStatus(true);
				return;
			}
			await apiService.sendFriendRequest(data[index].id);
			setStatus('ok');
			setShowStatus(true);
			nameInput.value = '';
		}
		catch (error) {
			console.error(error);
		}
	}

    return (
		<div className="mx-3 mb-4 border-b-2 z-50">
			<div className="flex items-start">
				<h2 className="flex-1">Add friend</h2>
				<h3 className={`flex-1 ${status === 'ok' ? 'text-green-500' : 'text-orange-500'} ${showStatus ? 'block' : 'hidden'}`}>
					{status === 'ok' && 'Request sent !'}
					{status === 'ko' && 'User not found'}
					{status === 'len' && '3 characters min'}
					{status === 'self' && "Can't add yourself"}
				</h3>
			</div>
			<input id="nameInput" type="text" className="rounded-md mr-3 mb-5 text-black indent-4 w-[330px]" maxLength={12}/>
			<button className="rounded-md border-[2px] px-3 hover:scale-110 ml-4" onClick={addFriend}>ADD</button>
		</div>
    );
}

export default AddFriend;