import React from "react";
import { useAuth } from '../../contexts/AuthContext';

const UserBox = () => {
    const { user, logout } = useAuth();

    return (
        <div className='flex absolute top-[20px] right-[20px] h-[90px] w-[220px] border-solid border-[5px] cursor-pointer text-[1.5rem] overflow-hidden'>
            <img src="" alt="icon" className="h-[60px] w-[60px] border-2 border-solid m-2"/>
            <h3 className='inline'>
                {user?.username.toUpperCase()} user + amis + logout
            </h3>
        </div>
    );
};

export default UserBox;