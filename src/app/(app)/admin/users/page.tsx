'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { User } from '@/types';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Mock user data for admin view
const MOCK_ALL_USERS: User[] = [
  { id: 'student001', name: 'Alice Wonderland', email: 'alice@example.com', role: 'Student', avatar: 'https://picsum.photos/seed/student001/40/40' },
  { id: 'student002', name: 'Bob The Builder', email: 'bob@example.com', role: 'Student', avatar: 'https://picsum.photos/seed/student002/40/40' },
  { id: 'faculty001', name: 'Dr. Elara Vance', email: 'elara.vance@example.com', role: 'Faculty', avatar: 'https://picsum.photos/seed/faculty001/40/40' },
  { id: 'admin001', name: 'Admin User', email: 'admin@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/admin001/40/40' },
];

const fetchAllUsers = async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return MOCK_ALL_USERS;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'Admin') {
        fetchAllUsers().then(data => {
            setAllUsers(data);
            setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }, [user]);

  if (!user || user.role !== 'Admin') {
    return <p>Access denied. This page is for administrators only.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><ShieldCheck className="mr-2 h-8 w-8 text-primary" /> User Management</h1>
        <Button disabled>
          <UserPlus className="mr-2 h-4 w-4" /> Add New User (Coming Soon)
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and permissions across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[100px]">Role</TableHead>
                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allUsers.map(u => (
                        <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" disabled>Edit</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Advanced user management features like role assignment, bulk actions, and audit logs will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
