import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Options = () => {

    const { user, logout } = useAuth();
    const options = document.getElementById("options");
    
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const openFriends = () => {
        const window = document.getElementById("friendWindow");

        options?.classList.replace('block', 'hidden');
        window?.classList.replace('hidden', 'flex');
    };

    return (
        <div id="options" className='border-2 border-black absolute right-[20px] bottom-[-125px] w-[260px] translate-y-1/2 bg-white hidden text-black'>
            <ul className="text-[1.5rem] divide-y-2 cursor-pointer divide-black indent-2">
                <Link to={"/profile"}><li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]">
                    Profile 
                    <span className="flex flex-grow justify-end items-center mr-6"><img src="./src/img/profile.svg" alt="logout" className="h-[25x] w-[25px]"/></span>
                </li></Link>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]" onClick={openFriends}>
                    Friends
                    <span className="flex flex-grow justify-end items-center mr-6"><img src="./src/img/friends.svg" alt="logout" className="h-[25x] w-[25px]"/></span>
                </li>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]" onClick={handleLogout}>
                    Log Out
                    <span className="flex flex-grow justify-end items-center mr-6"><img src="./src/img/logout.svg" alt="logout" className="h-[25x] w-[25px]"/></span>
                </li>
            </ul>

        </div>
    );
};

export default Options;