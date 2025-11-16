import { CogIcon } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
}

export default function AdministratorPageHeader({
  title = 'Administrator Dashboard',
  description = 'View, manage and configure apps from here.',
}: Props) {
  return (
    <div id="page_header" className="flex items-center gap-2 p-4">
      <div className="bg-muted text-muted-foreground border rounded p-2">
        <CogIcon className="size-8" />
      </div>

      <div className="leading-5">
        <h6 className="font-semibold text-lg">{title}</h6>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
