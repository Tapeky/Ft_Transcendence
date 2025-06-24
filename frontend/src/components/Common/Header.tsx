import { useAuth } from '../../contexts/AuthContext';
import Options from "./Options";
import FriendList from "./FriendList";
import Profile from "./Profile";

const Header = ({userVisible = true}) => {
    const { user } = useAuth();

    const toggleOptions = () => {
        const options = document.getElementById("options");

        if (options?.classList.contains('hidden'))
            options?.classList.replace('hidden', 'block');
        else
            options?.classList.replace('block', 'hidden');
    };

    return (
        <header className='flex  bg-[url("./img/city.png")] bg-cover bg-center min-h-[150px] items-center justify-center border-black border-solid border-b-[5px] border-[5px]'>
            <div className="flex-1"></div>

            <h1 className='text-[5rem] flex-1 text-center text-white backdrop-blur backdrop-brightness-90'>TRANSCENDENCE</h1>

            <div className="flex-1 relative">
                <div onClick={toggleOptions} className={`${userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute
                    h-[90px] right-[10px] bottom-[20px] w-[220px] border-white border-[5px] cursor-pointer overflow-hidden text-white bg-purple-900`}>
                    <img src={`${user?.avatar_url}`} alt="icon" className="h-[60px] w-[60px] border-2 border-solid m-2"/>
                    <div className="flex flex-col">
                        <h3 className="text-[1.5rem]">
                            {user?.username.toUpperCase()}
                        </h3>
                        <div className="text-[1.3rem] flex gap-2 items-center">
                            <div id='statusLight' className='bg-green-500 w-3 h-3 rounded-full'></div>
                            <div id="status">Online</div>
                        </div>
                </div>
                
                </div>
                <Options />
            </div>

            <Profile />
            <FriendList />
        </header>
    );
};

export default Header;