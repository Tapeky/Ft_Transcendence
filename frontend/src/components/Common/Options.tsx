import { useAuth } from "../../contexts/AuthContext";
import NavLink from "./NavLink";
import { useNav } from "../../contexts/NavContext";
import { useState } from "react";
import FriendList from "../Friends/FriendList";

type Props = {
    setVisible: () => void;
    visible: boolean;
};

const Options = ({setVisible, visible}: Props) => {

    const { logout } = useAuth();
    const [friends, setFriends] = useState(false);
	const { goTo } = useNav();

    const handleLogout = async () => {
        await logout();
        goTo('/');
		return null;
    };

    const openFriends = () =>
    {
        setVisible();
        setFriends(true);
    }


    return (
        <div className={`${visible ? 'block' : 'hidden'} border-2 border-black absolute right-[20px] bottom-[-60px] w-[260px] translate-y-1/2 bg-white text-black`}>
            <ul className="text-[1.5rem] divide-y-2 cursor-pointer divide-black indent-2">

                <NavLink to={"/profile"}>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]">
                    Profile 
                    <span className="flex flex-grow justify-end items-center mr-6"><img src="/src/img/profile.svg" alt="logout" className="h-[25px] w-[25px]"/></span>
                </li>
                </NavLink>

                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]" onClick={openFriends}>
                    Friends
                    <span className="flex flex-grow justify-end items-center mr-6"><img src="/src/img/friends.svg" alt="logout" className="h-[25px] w-[25px]"/></span>
                </li>

                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]" onClick={handleLogout}>
                    Log Out
                    <span className="flex flex-grow justify-end items-center mr-6"><img src="/src/img/logout.svg" alt="logout" className="h-[25px] w-[25px]"/></span>
                </li>

            </ul>
            <FriendList setVisible={() => setFriends(false)} visible={friends}/>

        </div>
    );
};

export default Options;