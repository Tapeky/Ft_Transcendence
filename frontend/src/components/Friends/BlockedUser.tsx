import { useState } from "react";
import { apiService } from "../../services/api";

type Props = {
  username: string;
  avatar: string | undefined;
  id: number;
};

const BlockedUser = ({username, avatar, id}: Props) =>
{
    const [visible, setVisible] = useState(true);

	const dismiss = () =>
	{
		setVisible(false);
	}

    const unblock = async () =>
    {
        try {
            await apiService.unblockUser(id);
            console.log('User unblocked !');
            dismiss();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className={`${visible ? 'block' : 'hidden'} border-white border-2 min-h-[120px] w-[260px] flex bg-pink-800 text-[1.2rem] mt-4 overflow-hidden mx-2`}>
            <div className="flex items-center justify-center min-w-[120px]">
                <img src={avatar} alt="icon" className="h-[90px] w-[90px] border-2"/>
            </div>
            <div className="flex flex-col">
                <h2 className="mt-2 flex-grow">{username}</h2>
                <button className="border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
                    <img src="./src/img/unblock.svg" alt="unblock" onClick={unblock} />
                </button>
            </div>
        </div>
    );
};

export default BlockedUser;
