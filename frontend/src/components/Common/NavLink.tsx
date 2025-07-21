import { useNav } from "../../contexts/NavContext";

type NavLinkProps = {
  to: string;
  children: React.ReactNode;
};

const NavLink = ({ to, children }: NavLinkProps) => {
	const { goTo } = useNav();

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		goTo(to);
	};

	return <a href={to} onClick={handleClick}>{children}</a>;
};

export default NavLink;