import Link from 'next/link';
import { Button } from '../ui/button';
import { HouseIcon } from 'lucide-react';
import LoginDialog from '../dialog/login';

export default function DefaultNavbar() {
  return (
    <nav className="w-full flex items-center gap-2 border p-2">
      <Link href="/">
        <Button variant="link">
          <HouseIcon />
          Home
        </Button>
      </Link>

      <div className="ml-auto">
        <LoginDialog />
      </div>
    </nav>
  );
}
