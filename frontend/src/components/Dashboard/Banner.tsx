import { useAuth } from "../../contexts/AuthContext";


const Banner = () => {
    const { user } = useAuth();

    return (
        <div className='text-[30px] p-2 border-b-2 border-black'>
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
                <li>
                    Total : {user?.total_games || 0}
                </li>
            </ul>
        </div>
    );
}

export default Banner;
