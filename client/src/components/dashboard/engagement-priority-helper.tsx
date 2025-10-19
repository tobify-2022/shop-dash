import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface EngagementPriorityHelperProps {
  className?: string;
}

// Mock data - would need real engagement tracking
const mockEngagementData = {
  '90+': [
    { name: 'Acme Corp', days: 120 },
    { name: 'Beta Industries', days: 95 },
  ],
  '61-90': [
    { name: 'Gamma LLC', days: 75 },
    { name: 'Delta Systems', days: 68 },
  ],
  '31-60': [
    { name: 'Epsilon Co', days: 45 },
    { name: 'Zeta Group', days: 38 },
    { name: 'Eta Partners', days: 35 },
  ],
  'active': [
    { name: 'Theta Inc', days: 5 },
    { name: 'Iota Solutions', days: 12 },
    { name: 'Kappa Enterprises', days: 18 },
    { name: 'Lambda Tech', days: 22 },
  ],
};

export function EngagementPriorityHelper({ className }: EngagementPriorityHelperProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '90+': true,
    '61-90': true,
    '31-60': false,
    'active': false,
  });

  const toggleExpanded = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { key: '90+', title: '90+ Days', color: 'text-red-600', bgColor: 'bg-red-50' },
    { key: '61-90', title: '61-90 Days', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { key: '31-60', title: '31-60 Days', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { key: 'active', title: 'Active', color: 'text-green-600', bgColor: 'bg-green-50' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-[#008060]" />
          Engagement Priority Helper
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Last engagement tracking</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {sections.map(section => {
            const data = mockEngagementData[section.key as keyof typeof mockEngagementData];
            const isExpanded = expanded[section.key];

            return (
              <div key={section.key} className={`rounded-lg border ${section.bgColor} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-semibold text-sm ${section.color}`}>
                    {section.title}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(section.key)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="text-xs font-medium mb-2">{data.length} merchants</div>
                {isExpanded && (
                  <div className="space-y-1">
                    {data.map((merchant, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="font-medium">{merchant.name}</div>
                        <div className="text-muted-foreground">{merchant.days} days ago</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

