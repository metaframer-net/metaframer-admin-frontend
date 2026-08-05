import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ExportScope = 'view' | 'selection' | 'all';
export type ExportFormat = 'csv' | 'xls';

export interface ExportMenuProps {
  selectedCount?: number | undefined;
  onExport: (format: ExportFormat, scope: ExportScope) => void | Promise<void>;
  /** When provided, an "import" section is added to the menu. */
  onImport?: ((file: File) => void | Promise<void>) | undefined;
}

/** CSV / Excel export + optional CSV import. */
export function ExportMenu({ selectedCount = 0, onExport, onImport }: ExportMenuProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const scopes: { scope: ExportScope; label: string; disabled?: boolean }[] = [
    { scope: 'view', label: 'Bu sayfa' },
    { scope: 'selection', label: `Seçili (${selectedCount})`, disabled: selectedCount === 0 },
    { scope: 'all', label: 'Tüm eşleşenler' },
  ];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onImport) {
      void onImport(file);
    }
    // Reset so the same file can be re-imported
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <>
      {/* Hidden file input for import */}
      {onImport && (
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" data-action="open-export" data-entity="table">
            <Download className="size-4" />
            <span className="hidden md:inline">{onImport ? 'İçe / Dışa aktar' : 'Dışa aktar'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Import section */}
          {onImport && (
            <>
              <DropdownMenuLabel>İÇE AKTAR</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => fileRef.current?.click()}
                data-action="import"
                data-entity="table"
              >
                <Upload className="mr-2 size-4" />
                CSV / Excel dosyası yükle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Export section */}
          <DropdownMenuLabel>DIŞA AKTAR</DropdownMenuLabel>
          {(['csv', 'xls'] as const).map((format) => (
            <div key={format}>
              <DropdownMenuLabel className="text-xs">{format.toUpperCase()}</DropdownMenuLabel>
              {scopes.map(({ scope, label, disabled }) => (
                <DropdownMenuItem
                  key={`${format}-${scope}`}
                  disabled={disabled ?? false}
                  onSelect={() => void onExport(format, scope)}
                  data-action="export"
                  data-entity="table"
                >
                  {label}
                </DropdownMenuItem>
              ))}
              {format === 'csv' && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
