import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Options = () => {

    const { user, logout } = useAuth();
    const options = document.getElementById("options");
    
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    }

    const openFriends = () => {
        const window = document.getElementById("friendWindow");

        options?.classList.replace('block', 'hidden');
        window?.classList.replace('hidden', 'flex');
    }

    return (
        <div id="options" className='border-2 border-black absolute right-[10px] bottom-[-105px] w-[220px] translate-y-1/2 bg-white hidden'>
            <ul className="text-[1.5rem] divide-y-2 cursor-pointer divide-black">
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Profile</li>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4" onClick={openFriends}>Friends</li>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4" onClick={handleLogout}>Log Out</li>
            </ul>
        </div>
    );
};

export default Options;