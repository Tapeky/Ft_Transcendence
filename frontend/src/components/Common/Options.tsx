
const Options = ({optionsOpen = false}) => {

    return (
        <div className={`${optionsOpen ? 'block' : 'hidden'} border-2 border-black absolute right-[10px] bottom-[-105px] w-[220px] translate-y-1/2 bg-white`}>
            <ul className="text-[1.5rem] divide-y-2 cursor-pointer divide-black">
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Profile</li>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Friends</li>
                <li className="py-2 pl-2 cursor-pointer hover:underline underline-offset-4">Log Out</li>
            </ul>
        </div>
    );
};

export default Options;