import React from "react";
import { useAuth } from '../../contexts/AuthContext';

const Header = ({userVisible = true}) => {
    const { user, logout } = useAuth();
    return (
        <header className='flex bg-blue-400 min-h-[150px] items-center justify-center border-black border-solid border-b-[5px] border-[5px]'>
            <div className="flex-1"></div>
            <h1 className='text-[5rem] flex-1 text-center'>TRANSCENDENCE</h1>

            <div className="flex-1 relative">
                <div className={`${userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute h-[90px] right-[10px] bottom-[20px] w-[220px] border-solid border-[5px] cursor-pointer text-[1.5rem] overflow-hidden`}>
                <img src="" alt="icon" className="min-h-[60px] min-w-[60px] border-2 border-solid m-2"/>
                <h3 className='inline'>
                    {user?.username.toUpperCase()}
                </h3>
                </div>
                <div className="border-2 absolute right-[10px] bottom-[-100px] w-[220px] translate-y-1/2 bg-white">
                    <ul className="text-[1.5rem] divide-y-4 cursor-pointer">
                        <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Profile</li>
                        <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Friends</li>
                        <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Log Out</li>
                    </ul>
                </div>
            </div>
        </header>
    );
};

export default Header;