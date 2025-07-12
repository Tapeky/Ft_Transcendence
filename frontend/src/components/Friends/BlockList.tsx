import { useState, useEffect } from "react";
import BlockedUser from "./BlockedUser";
import { apiService, User } from "../../services/api";

const BlockList = () => {

    const [list, setList] = useState(false);
    const [blocked, setBlocked] = useState<User[]>([]);

    const toggleList = () =>
    {
        setList(!list);
    };

    useEffect(() => {
        const fetchBlocked = async () => {
            try {
                const data = await apiService.getBlockedUsers();
                setBlocked(data);
            } catch (error) {
                console.error(error);
            }
        };
        
        if (list === true)
            fetchBlocked();
        }, [list]);

    return (
        <div className="absolute ml-3 mt-2 mb-0">
            <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black" onClick={toggleList}>
                <img src="/src/img/blocklist.svg" alt="block list" />
            </button>

            <div className={`${list ? 'flex' : 'hidden'} bg-blue-800 border-black border-2 h-[400px] w-[350px] relative right-[370px] top-[250px] flex-col items-center z-[45]`}>
                <h2 className="text-white border-b-2 border-white">Blocked users</h2>
                <div className="flex flex-col overflow-auto">
                {blocked.length === 0 && 
                <div>
                    No one in there :)
                </div>
                }
                {blocked.map((user) => (
					<BlockedUser key={user.id} username={user.username} avatar={user.avatar_url} id={user.id} />
				))}
                </div>
            </div>

        </div>
    );
}

export default BlockList;