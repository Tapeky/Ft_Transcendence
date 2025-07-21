import { useAuth } from '../../contexts/AuthContext';
import Options from "./Options";
import FriendList from "../Friends/FriendList";
import { useState } from 'react';
import { getAvatarUrl } from "../../utils/avatar";

const Header = ({userVisible = true}) => {
    const { user } = useAuth();
    const [click, setClick] = useState(false);
    const [options, setOptions] = useState(false);

    const showClick = () => {
        setClick(!click);
    };

    const showOptions = () => {
        setOptions(!options);
    };


    return (
        <header className='flex bg-[url("./img/city.png")] bg-cover bg-center min-h-[150px] 
            items-center justify-center border-black border-solid border-b-[5px] border-[5px] sticky top-0 z-50'>
            <div className="flex-1"></div>

            <h1 className='text-[5rem] flex-1 text-center text-white backdrop-blur backdrop-brightness-90'>TRANSCENDENCE</h1>

            <div className="flex-1">
                <div onClick={showOptions} onMouseEnter={showClick} onMouseLeave={showClick} className={`${userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute
                    h-[100px] right-[20px] bottom-[70px] w-[260px] border-white border-[5px] cursor-pointer overflow-hidden
                    text-white bg-gradient-to-t from-purple-900 to-blue-800`}>
                    
                    <div className='flex justify-center items-center'>
                    <img src={getAvatarUrl(user?.avatar_url)}  alt="icon" className="h-[70px] w-[70px] min-h-[70px] min-w-[70px] border-2 border-solid m-2"/>
                    </div>

                    <div className="flex flex-grow flex-col">
                        <h3 className="text-[1.5rem]">
                            {user?.display_name}
                        </h3>
                        <h3 className="text-[1.2rem]" id='displayName'>
                            {user?.username}
                        </h3>
                    </div>
                    <div className='absolute bottom-2 right-2'>
                        <img src="/src/img/click.svg" alt="logout" className={`${click ? 'block' : 'hidden'} h-[25x] w-[25px]`}/>
                    </div>

                </div>
                <Options visible={options} setVisible={() => setOptions(false)} />
            </div>

        </header>
    );
};

export default Header;