import { apiService, Avatar } from "../../services/api";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

const AvatarSelect = () => {
    const { refreshUser } = useAuth();
    const [avatars, setAvatars] = useState<Avatar[]>([]);

    const handleClick = async (id: string) => {
        try {
            await apiService.setAvatar(id);
            await refreshUser();
        } catch (error) {
            console.error('Erreur lors du changement d\'avatar:', error);
            alert('Erreur lors du changement d\'avatar');
        }
    } 

    useEffect(() => {
        const fetchAvatars = async () => {
            try {
                const data = await apiService.getAvatars();
                setAvatars(data);
            } catch (error) {
                console.error("Can't load avatars.", error);
            }
        };

        fetchAvatars();
    }, []);

    return (
    <div className="flex gap-10 flex-wrap justify-center mt-3">
        {avatars.length === 0 && <p>Loading</p>}
        {avatars.map((avatar, index) => (
        <img key={index} src={avatar.url} alt="avatar" className="h-[170px] w-[170px] cursor-pointer border-2 border-black hover:scale-125 transition duration-300"
            onClick={() => handleClick(avatar.id)}/>
        ))}
    </div>
    );
}

export default AvatarSelect;



