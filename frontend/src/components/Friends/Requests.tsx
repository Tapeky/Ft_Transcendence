import { apiService, FriendRequest } from "../../services/api";
import { useState, useEffect } from "react";
import FriendRequests from "./FriendRequests";

const Requests = () => {

    const [requestWindow, setRequestWindow] = useState(false);
	const [requests, setRequests] = useState<FriendRequest[]>([]);

    const toggleRequest = () =>
    {
        setRequestWindow(!requestWindow);
    };

	useEffect(() => {
		const fetchRequests = async () => {
			try {
				const data = await apiService.getFriendRequests();
				setRequests(data);
			} catch (error) {
				console.error(error);
			}
		};
		
		if (requestWindow === true)
			fetchRequests();
		}, [requestWindow]);

    return (
        <div className="absolute ml-[4rem] mt-2 mb-0">
            <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black" onClick={toggleRequest}>
                <img src="/src/img/requests.svg" alt="requests" />
            </button>

            <div className={`${requestWindow ? 'flex' : 'hidden'} bg-pink-800 border-black border-2 h-[400px] w-[400px] relative right-[472px] bottom-[150px] z-[45] flex-col items-center`}>
                <h2 className="text-white border-b-2 border-white">Friend requests</h2>
                <div className="flex flex-col overflow-auto">
				{requests.length === 0 && 
					<div>
						No requests. :(
					</div>
				}
				{requests.map((request) => (
					<FriendRequests key={request.id} username={request.username} avatar={request.avatar_url} requestId={request.id} userId={request.user_id}/>
				))}
                </div>
            </div>

        </div>
    );
}

export default Requests;