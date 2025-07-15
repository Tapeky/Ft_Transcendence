import { apiService } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

const ChangeDisplayName = () =>
{
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (loading) return;

        const displayInput = document.getElementById('displayInput') as HTMLInputElement | null;
        if (!displayInput)
            return;

        const newValue = displayInput.value.trim();
        const currentValue = user?.display_name?.trim() ?? '';

        if (newValue.length < 3) {
            console.log('Not enough characters');
            return;
        }

        if (newValue === currentValue) {
            console.log('Display name unchanged, no update needed');
            return;
        }

        setLoading(true);

        try {
            await apiService.updateProfileDisplayName(displayInput.value);
            console.log('Display name updated !');
            await refreshUser();
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
  };

    return (                        
        <div className="flex justify-between">
            <h4 className="flex-1">Display name</h4>
            <input id="displayInput" type="text" defaultValue={user?.display_name} className="flex-1 rounded-md text-black indent-4" minLength={3} maxLength={12}/>
            <div className="flex-1">
                <button onClick={handleClick} className="bg-blue-400 w-[50px] rounded-md hover:scale-90 ml-3 border-2 border-white">&#x2713;</button>
            </div>
        </div>);
}

export default ChangeDisplayName;