import CloseBtn from "../Common/CloseBtn";
import FriendItem from "./FriendItem";
import BlockList from "./BlockList";
import Requests from "./Requests";
import AddFriend from "./AddFriend";
import { useState, useEffect } from "react";
import { apiService, Friend } from "../../services/api";
import { createPortal } from "react-dom";

type Props = {
    setVisible: () => void;
    visible: boolean;
};

const FriendList = ({setVisible, visible}: Props) => {

    const [friends, setFriends] = useState<Friend[]>([]);
    const [refresh, setRefresh] = useState(false);

    const refreshList = () =>
    {
        setRefresh(refresh => !refresh);
    };

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                if (visible)
                {
                    const data = await apiService.getFriends();
                    setFriends(data);
                }

            } catch (error) {
                console.error(error);
            }
        };
        
        fetchFriends();
        }, [refresh, visible]); 


    return createPortal(
        <div className={`${visible ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-center text-white`}>
            <div className='flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 min-w-[500px] h-[600px] border-[5px] border-black text-[2rem] box-border font-iceland select-none'>
                <CloseBtn func={setVisible}/>
                <BlockList />
                <Requests />
                <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black absolute ml-[7.2rem] mt-2 mb-0" onClick={refreshList}>
                    <img src="/src/img/refresh.svg" alt="refresh" />
                </button>
                <AddFriend />

                <div className='flex-grow overflow-auto flex flex-col items-center gap-4'>
                    {friends.length === 0 &&
                        <div className="flex flex-col items-center">NO FRIEND<img src="/src/img/ouin.gif" alt="OUIN" className="w-[350px]"/></div>
                    }
                    {friends.map(friend => <FriendItem key={friend.id} username={friend.username} displayName={friend.display_name} avatar={friend.avatar_url}
                                    is_online={friend.is_online} id={friend.id} />)}
                </div>
            </div>
        </div>
    , document.body
    );
}

export default FriendList;
