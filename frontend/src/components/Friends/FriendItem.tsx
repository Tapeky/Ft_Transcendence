import { useState } from "react";
import FriendOptions from "./FriendOptions";
import { getAvatarUrl } from "../../utils/avatar";

type Props = {
  username: string;
  displayName: string;
  avatar: string | null;
  is_online: boolean;
  id: number;
};

const FriendItem = ({username, displayName, avatar, is_online, id}: Props) =>
{
    const [visible, setVisible] = useState(true);
    const [options, setOptions] = useState(false);

    const openOptions = () =>
    {
        setOptions(true);
    };

    return (
        <div className={`${visible ? 'block' : 'hidden'} ${options ? 'z-[55]' : 'z-[50]'} border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800 relative`}>
            <div className="flex items-center justify-center min-w-[120px]">
                <img src={getAvatarUrl(avatar)} alt="icon" className="h-[90px] w-[90px] border-2"/>
            </div>
            <div className="leading-none flex flex-col gap-1 flex-grow overflow-hidden">
                <h2 className="mt-2">{displayName}</h2>
                <h2 className="text-[1.5rem]">{username}</h2>
            </div>
            <div className="min-w-[110px] flex flex-col pl-2">
                <div className="flex-1 flex justify-start items-center ml-1">
                    <h2 className="text-[1.5rem]">{is_online ? 'Online' : 'Offline'}</h2>
                </div>
                <div className="flex-1 flex justify-evenly items-start mt-1">
                    <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
                        <img src="/src/img/chat.svg" alt="chat" />
                    </button>
                    <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black" >
                        <img src="/src/img/plus.svg" alt="more" onClick={openOptions}/>
                    </button>
                </div>
            </div>

        <FriendOptions username={username} displayName={displayName} avatar={getAvatarUrl(avatar)} id={id} isOpen={options} 
            setIsOpen={() => setOptions(false)}  setDismiss={() => setVisible(false)}/>


        </div>
    );
};

export default FriendItem;
