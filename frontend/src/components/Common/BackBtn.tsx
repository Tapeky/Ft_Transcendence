import { useNavigate } from "react-router-dom";

const BackBtn = () => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex items-center">
            <button onClick={() => navigate(-1)} 
            className="border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[120px] flex items-center justify-center text-[4rem] ml-6">←</button>
        </div>
    );
};

export default BackBtn;
