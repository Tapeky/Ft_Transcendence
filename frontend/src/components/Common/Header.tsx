import React from "react";
import { useAuth } from '../../contexts/AuthContext';
import Options from "./Options";
import { useState } from "react";

const Header = ({userVisible = true}) => {
    const { user } = useAuth();
    const [optionsOpen, setOptionsOpen] = useState(false);

    function showOptions()
    {
        setOptionsOpen(prev => !prev);
    };

    return (
        <header className='flex  bg-[url("./img/oui.png")] bg-cover bg-center min-h-[150px] items-center justify-center border-black border-solid border-b-[5px] border-[5px]'>
            <div className="flex-1"></div>
            <h1 className='text-[5rem] flex-1 text-center text-white backdrop-blur backdrop-brightness-90'>TRANSCENDENCE</h1>

            <div className="flex-1 relative select-none">
                <div onClick={showOptions} className={`${userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute 
                    h-[90px] right-[10px] bottom-[20px] w-[220px] border-white border-[5px] cursor-pointer text-[1.5rem] overflow-hidden text-white`}>
                <img src={`${user?.avatar_url}`} alt="icon" className="min-h-[60px] min-w-[60px] border-2 border-solid m-2"/>
                <h3 className='inline'>
                    {user?.username.toUpperCase()}
                </h3>
                </div>
                <Options optionsOpen={optionsOpen}/>
            </div>
        </header>
    );
};

export default Header;