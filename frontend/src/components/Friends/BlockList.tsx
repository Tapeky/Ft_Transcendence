import { useState } from "react";
import BlockedUser from "./BlockedUser";
import { apiService } from "../../services/api";

const BlockList = () => {

    const [list, setList] = useState(false);

    const test = async() =>
    {
        const data = await apiService.searchUsers('fire');
        console.log(data);
    }

    const toggleList = () =>
    {
        setList(!list);
        test();
    };

    //unblock user

    return (
        <div className="absolute ml-3 mt-2 mb-0">
            <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black" onClick={toggleList}>
                <img src="./src/img/blocklist.svg" alt="block list" />
            </button>

            <div className={`${list ? 'block' : 'hidden'} bg-blue-800 border-black border-2 h-[400px] w-[350px] relative right-[370px] top-[250px] flex flex-col items-center`}>
                <h2 className="text-white border-b-2 border-white">Blocked users</h2>
                <div className="flex flex-col overflow-auto">
                    
                    <BlockedUser />
                    <BlockedUser />

                </div>
            </div>

        </div>
    );
}

export default BlockList;