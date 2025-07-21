import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Common/Header';
import Choice from '../components/Menu/Choice';
import Banner from '../components/Menu/Banner';
import { useNav } from '../contexts/NavContext';


const Menu = () => {
	const { goTo } = useNav();
	const { loading, user, isAuthenticated } = useAuth();

	if (loading)
	{
		return <div className='bg-purple-800 text-white text-3xl'>Loading...</div>;
	}

	if (!(isAuthenticated && user))
	{
		goTo('/');
		return null;
	}

	return (
		<div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none">

			<Header userVisible={true}/>

			<Banner />

			<Choice />
			
		</div>
	);
}

export default Menu;
