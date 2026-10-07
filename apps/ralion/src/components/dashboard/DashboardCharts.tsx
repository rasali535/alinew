'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@ralion/ui';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

export function DashboardCharts({
  monthlyCustomerGrowth,
  salesByStage,
}: {
  monthlyCustomerGrowth: Array<{ month: string; customers: number; dealsCreated: number; wonValue: number }>;
  salesByStage: Array<{ stage: string; count: number; value: number }>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Growth</CardTitle>
          <CardDescription>Customers and deals created over the last six months</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyCustomerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: 8 }} />
              <Area type="monotone" dataKey="customers" stroke="#10b981" fill="#10b981" fillOpacity={0.14} />
              <Area type="monotone" dataKey="dealsCreated" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>Current deal value by stage</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="stage" stroke="#71717a" fontSize={10} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#a855f7" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
