import React from "react";
import { useAuth } from '../../contexts/AuthContext';
import Options from "./Options";

const Header = ({userVisible = true}) => {
    const { user } = useAuth();

    const toggleOptions = () => {
        const options = document.getElementById("options");

        if (options?.classList.contains('hidden'))
            options?.classList.replace('hidden', 'block');
        else
            options?.classList.replace('block', 'hidden');
    }

    return (
        <header className='flex  bg-[url("./img/city.png")] bg-cover bg-center min-h-[150px] items-center justify-center border-black border-solid border-b-[5px] border-[5px]'>
            <div className="flex-1"></div>

            <h1 className='text-[5rem] flex-1 text-center text-white backdrop-blur backdrop-brightness-90'>TRANSCENDENCE</h1>

            <div className="flex-1 relative select-none">
                <div onClick={toggleOptions} className={`${userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute 
                    h-[90px] right-[10px] bottom-[20px] w-[220px] border-white border-[5px] cursor-pointer text-[1.5rem] overflow-hidden text-white`}>
                <img src={`${user?.avatar_url}`} alt="icon" className="min-h-[60px] min-w-[60px] border-2 border-solid m-2"/>
                <h3 className='inline'>
                    {user?.username.toUpperCase()}
                </h3>
                </div>
                <Options />
            </div>
        </header>
    );
};

export default Header;