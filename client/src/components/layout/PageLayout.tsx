import { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  filters?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-[640px]',
  md: 'max-w-[768px]',
  lg: 'max-w-[1024px]',
  xl: 'max-w-[1280px]',
  '2xl': 'max-w-[1600px]',
  full: 'max-w-full',
};

export function PageLayout({ 
  title, 
  description, 
  children, 
  filters,
  maxWidth = '2xl' 
}: PageLayoutProps) {
  return (
    <div className="bg-background min-h-full">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-6 py-6`}>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mb-6">{description}</p>
          )}
          
          {/* Page-specific filters/controls */}
          {filters && (
            <div className="mb-6">
              {filters}
            </div>
          )}
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}

