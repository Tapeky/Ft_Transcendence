import { useAuth } from "../../contexts/AuthContext";
import NavLink from "../Common/NavLink";


const Banner = () => {
    const { user } = useAuth();

    return (
        <div className='text-[30px] p-2 border-b-2 border-black bg-white text-black'>
            <ul className='flex justify-evenly'>
                <li>
                    Welcome <span className='text-blue-400'>{user?.display_name || user?.username}</span> !
                </li>
                <li>
                    Wins : {user?.total_wins || 0}
                </li>
                <li>
                    Losses : {user?.total_losses || 0}
                </li>
                <li className="border-x-2 border-black px-6">
                    <NavLink to={`/dashboard/${user?.id}`}><button className="hover:text-blue-400">► Dashboard ◄</button></NavLink>
                </li>
            </ul>
        </div>
    );
}

export default Banner;
