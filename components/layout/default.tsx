import DefaultNavbar from "./navbar";

interface Props {
    children: React.ReactNode;
};

export default function DefaultLayout({ children }: Props) {
    return (
        <div className="">
            <DefaultNavbar />
            
            {children}
        </div>
    );
}