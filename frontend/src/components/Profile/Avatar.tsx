import { useAuth } from "../../contexts/AuthContext";
import AvatarSelect from "./AvatarSelect";
import { useRef } from "react";
import CloseBtn from "../Common/CloseBtn";
import { apiService } from "../../services/api";

const Avatar = () => {
    const { user, logout } = useAuth();
    const ref = useRef<HTMLInputElement>(null);
  

    const closeWindow = () => {
            const window = document.getElementById("avatarWindow");

            window?.classList.replace('flex', 'hidden');
    };

    const openAvatar = () => {
        const window = document.getElementById("avatarWindow");

        window?.classList.replace('hidden', 'flex');
    };
    
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        
        if (!file) return;

        console.log('Starting upload for file:', file.name, file.size, file.type);

        apiService.uploadAvatar(file);
    };


    const upload = () => {
        if (ref.current)
            ref.current.click();
    };

  return (
    <div className="flex-[0.5] flex justify-center relative">
                        
        <img src={user?.avatar_url?.startsWith('/uploads/') 
        ? `https://localhost:8000${user.avatar_url}` 
        : user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'
        } 
        alt="Avatar" className="h-[295px] w-[300px] border-4 p-0 border-blue-800"/>

        <button className="absolute top-[275px] border-2 p-2 px-6 bg-blue-800 hover:scale-90 text-white text-[1.3rem] rounded-md" 
        onClick={openAvatar}>
        EDIT
        </button>

        <div id="avatarWindow" className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center hidden'>
            <div className='flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem]'>
                <CloseBtn func={closeWindow}/>
                <AvatarSelect />

                <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                ref={ref}
                />
                <div className="flex-grow flex items-center justify-center">
                  <button className="border-2 p-2 px-6 bg-blue-800 hover:scale-90 text-white text-[1.5rem] rounded-md" onClick={upload}>IMPORT FILE</button>
                </div>
            </div>
        </div>
    </div>
  );

};

export default Avatar;