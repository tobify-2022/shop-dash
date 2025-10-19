import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardList } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface SuccessPlanStatusChartProps {
  msmName?: string;
}

// Mock data for now - would need to implement real BigQuery query
const mockData = {
  visions: [
    { name: 'Complete', value: 25, color: '#10b981' },
    { name: 'In Progress', value: 10, color: '#f59e0b' },
    { name: 'Not Started', value: 5, color: '#ef4444' },
  ],
  priorities: [
    { name: 'Complete', value: 30, color: '#10b981' },
    { name: 'In Progress', value: 8, color: '#f59e0b' },
    { name: 'Not Started', value: 2, color: '#ef4444' },
  ],
  outcomes: [
    { name: 'Complete', value: 20, color: '#10b981' },
    { name: 'In Progress', value: 15, color: '#f59e0b' },
    { name: 'Not Started', value: 5, color: '#ef4444' },
  ],
};

export function SuccessPlanStatusChart({ msmName: _msmName }: SuccessPlanStatusChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-[#008060]" />
          Success Plan Status
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Strategic vision tracking</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visions">
          <TabsList className="w-full">
            <TabsTrigger value="visions" className="flex-1">Visions</TabsTrigger>
            <TabsTrigger value="priorities" className="flex-1">Priorities</TabsTrigger>
            <TabsTrigger value="outcomes" className="flex-1">Outcomes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visions">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockData.visions}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mockData.visions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="priorities">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockData.priorities}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mockData.priorities.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="outcomes">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockData.outcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mockData.outcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

