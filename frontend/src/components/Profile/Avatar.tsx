import { useAuth } from "../../contexts/AuthContext";
import AvatarSelect from "./AvatarSelect";
import { useRef } from "react";

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

        const formData = new FormData();
        formData.append('file', file);

        try {
        const token = localStorage.getItem('auth_token');
        console.log('Token found:', !!token, token?.substring(0, 20) + '...');
        
        if (!token) {
            alert('No authentication token found. Please log in again.');
            return;
        }

        console.log('Making request to upload endpoint...');
        const response = await fetch('https://localhost:8000/api/avatars/upload', {
            method: 'POST',
            headers: {
            'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (!responseText) {
            alert('Upload failed: Empty response from server');
            return;
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            alert(`Upload failed: Invalid response format - ${responseText.substring(0, 100)}`);
            return;
        }
        
        if (response.ok) {
            alert('Avatar uploaded successfully!');
            window.location.reload();
        } else {
            alert(`Upload failed: ${result.error || result.message || 'Unknown error'}`);
        }
        } catch (error) {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Network error'}`);
        }
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
        alt="Avatar" className="h-[300px] w-[300px] border-4 p-0 border-blue-700"/>

        <button className="absolute top-[280px] border-2 p-2 px-6 bg-blue-600 hover:scale-90 text-white text-[1.3rem] rounded-md" 
        onClick={openAvatar}>
        EDIT
        </button>

        <div id="avatarWindow" className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center hidden'>
            <div className='flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem]'>
                <div className="flex flex-col h-[50px] mb-4">
                    <button className='bg-inherit self-end mr-3 mb-5 whitespace-pre' onClick={closeWindow}>Close   X</button>
                </div>
                <AvatarSelect />

                <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                ref={ref}
                />
                <div className="flex-grow flex items-center justify-center">
                  <button className="border-2 p-2 px-6 bg-pink-500 hover:scale-90 text-white text-[1.5rem] rounded-md" onClick={upload}>IMPORT FILE</button>
                </div>
            </div>
        </div>
    </div>
  );

};

export default Avatar;