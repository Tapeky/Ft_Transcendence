import { useAuth } from '../../contexts/AuthContext';
import Options from "./Options";
import FriendList from "../Friends/FriendList";
import { useState } from 'react';

const Header = ({userVisible = true}) => {
    const { user } = useAuth();
    const [click, setClick] = useState<boolean>(false);

    const showClick = () => {
        setClick(!click);
    };

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
                <div onClick={toggleOptions} onMouseEnter={showClick} onMouseLeave={showClick} className={`${userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute
                    h-[100px] right-[20px] bottom-[5px] w-[260px] border-white border-[5px] cursor-pointer overflow-hidden
                    text-white bg-gradient-to-t from-purple-900 to-blue-800`}>
                    
                    <div className='flex justify-center items-center'>
                    <img src={user?.avatar_url?.startsWith('/uploads/') 
                      ? `https://localhost:8000${user.avatar_url}` 
                      : user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'
                    }  alt="icon" className="h-[70px] w-[70px] min-h-[70px] min-w-[70px] border-2 border-solid m-2"/>
                    </div>

                    <div className="flex flex-grow flex-col">
                        <h3 className="text-[1.5rem]">
                            {user?.username}
                        </h3>
                        <h3 className="text-[1.2rem]" id='displayName'>
                            {user?.display_name}
                        </h3>
                    </div>
                    <div className='absolute bottom-2 right-2'>
                        <img src="./src/img/click.svg" alt="logout" className={`${click ? 'block' : 'hidden'} h-[25x] w-[25px]`}/>
                    </div>

                </div>
                <Options />
            </div>
            <FriendList />

        </header>
    );
};

export default Header;