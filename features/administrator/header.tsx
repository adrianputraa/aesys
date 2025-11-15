import { CogIcon } from 'lucide-react';

export default function AdministratorPageHeader() {
  return (
    <div id="page_header" className="flex items-center gap-2 p-4">
      <div className="bg-muted text-muted-foreground border rounded p-2">
        <CogIcon className="size-8" />
      </div>

      <div className="leading-5">
        <h6 className="font-semibold text-lg">Administrator Dashboard</h6>
        <p className="text-muted-foreground">View, manage and configure apps from here.</p>
      </div>
    </div>
  );
}
