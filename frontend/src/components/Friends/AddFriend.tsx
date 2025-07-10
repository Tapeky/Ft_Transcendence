import { apiService } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const AddFriend = () => {

	const {user} = useAuth();

	const addFriend = async() =>
	{
		const nameInput = document.getElementById('nameInput') as HTMLInputElement | null;
		if (!nameInput)
			return;

		if (nameInput.value.length < 3)
		{
			console.log("Not enough characters");
			return;
		}

		if (nameInput.value === user?.username)
		{
			console.log("Can't add yourself");
			return;
		}

		try {
			const data = await apiService.searchUsers(nameInput.value);
			const index = data.findIndex(user => user.username === nameInput.value);
			if (index === -1)
			{
				console.log('User not found');
				return;
			}
			await apiService.sendFriendRequest(data[index].id);
			console.log('Sent !');
			nameInput.value = '';
		}
		catch (error) {
			console.error(error);
		}
	}

    return (
		<div className="mx-3 mb-4 border-b-2 z-50">
			<h2 className="">Add friend</h2>
			<input id="nameInput" type="text" className="rounded-md mr-3 mb-5 text-black indent-4" maxLength={12}/>
			<button className="rounded-md border-[2px] px-3 hover:scale-110 ml-4" onClick={addFriend}>ADD</button>
		</div>
    );
}

export default AddFriend;