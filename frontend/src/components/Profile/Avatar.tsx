import { useAuth } from "../../contexts/AuthContext";
import AvatarSelect from "./AvatarSelect";
import { useRef, useState } from "react";
import CloseBtn from "../Common/CloseBtn";
import { apiService } from "../../services/api";
import { getAvatarUrl } from "../../utils/avatar";

const Avatar = () => {
    const { user, refreshUser } = useAuth();
    const ref = useRef<HTMLInputElement>(null);
    const [showWindow, setShowWindow] = useState(false);
  

    const closeWindow = () => {
            setShowWindow(false);
    };

    const openAvatar = () => {
        setShowWindow(true);
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        
        if (!file) return;

        console.log('Starting upload for file:', file.name, file.size, file.type);

        try {
            const result = await apiService.uploadAvatar(file);
            console.log('Upload successful:', result);
            
            await refreshUser();
            
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert(`Upload error: ${error}`);
        }
    };

    const upload = () => {
        if (ref.current)
            ref.current.click();
    };

  return (
    <div className="flex-[0.5] flex justify-center relative">
                        
        <img src={getAvatarUrl(user?.avatar_url)} 
        alt="Avatar" className="h-[295px] w-[300px] border-4 p-0 border-blue-800"/>

        <button className="absolute top-[275px] border-2 p-2 px-6 bg-blue-800 hover:scale-90 text-white text-[1.3rem] rounded-md" 
        onClick={openAvatar}>
        EDIT
        </button>

        <div className={`${showWindow ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center`}>
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