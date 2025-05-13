
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, UserPlus, Users, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { User, UserStatus } from '@/types';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAllUsersAction, updateUserStatusAction } from '@/actions/profile-actions';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';


export default function AdminUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UserStatus | 'all'>('all');


  const loadUsers = (statusFilter?: UserStatus | 'all') => {
    if (user && user.role === 'Admin') {
        setIsLoading(true);
        const filters = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
        fetchAllUsersAction(filters).then(data => {
            setAllUsers(data);
            setIsLoading(false);
        }).catch(err => {
            console.error("Error fetching users:", err);
            toast({ title: "Error", description: "Could not load user list.", variant: "destructive" });
            setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab, toast]);

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus, userName: string) => {
    setIsLoading(true); // Can use a more specific loading state if preferred
    try {
        const success = await updateUserStatusAction(userId, newStatus);
        if (success) {
            toast({ title: "Status Updated", description: `${userName}'s status changed to ${newStatus}.`, className: "bg-success text-success-foreground" });
            loadUsers(activeTab); // Refresh user list
        } else {
            toast({ title: "Update Failed", description: `Could not update status for ${userName}.`, variant: "destructive" });
        }
    } catch (error) {
        console.error("Error updating user status:", error);
        toast({ title: "Error", description: `Failed to update status: ${(error as Error).message}`, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: UserStatus }) => {
    let IconComponent = Hourglass;
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let className = "";

    switch (status) {
        case 'Active':
            IconComponent = CheckCircle;
            variant = "default";
            className = "bg-success text-success-foreground hover:bg-success/90";
            break;
        case 'PendingApproval':
            IconComponent = Hourglass;
            variant = "default";
            className = "bg-warning text-warning-foreground hover:bg-warning/90";
            break;
        case 'Rejected':
        case 'Disabled':
            IconComponent = XCircle;
            variant = "destructive";
            break;
        default:
            IconComponent = Hourglass; // Default for any other status
            variant = "secondary";
    }
    return (
      <Badge variant={variant} className={cn("capitalize", className)}>
        <IconComponent className="mr-1 h-3 w-3" />
        {status === 'PendingApproval' ? 'Pending' : status}
      </Badge>
    );
  };


  if (!user || user.role !== 'Admin') {
    return <p>Access denied. This page is for administrators only.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><ShieldCheck className="mr-2 h-8 w-8 text-primary" /> User Management</h1>
        <Button disabled> {/* TODO: Implement add user functionality */}
          <UserPlus className="mr-2 h-4 w-4" /> Add New User (Coming Soon)
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="PendingApproval">Pending</TabsTrigger>
          <TabsTrigger value="Active">Active</TabsTrigger>
          <TabsTrigger value="Rejected">Rejected</TabsTrigger>
          <TabsTrigger value="Disabled">Disabled</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>User List ({allUsers.length})</CardTitle>
          <CardDescription>Manage user accounts, roles, and statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell className="text-right space-x-1"><Skeleton className="h-8 w-20 inline-block" /><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[100px]">Role</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="text-right w-[220px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allUsers.map(u => (
                        <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell><StatusBadge status={u.status} /></TableCell>
                            <TableCell className="text-right space-x-1">
                                {u.status === 'PendingApproval' && (
                                    <>
                                    <Button variant="ghost" size="sm" className="text-success hover:bg-success/10 hover:text-success" onClick={() => handleUpdateStatus(u.id, 'Active', u.name)} disabled={isLoading}>
                                        <CheckCircle className="mr-1 h-4 w-4"/> Approve
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleUpdateStatus(u.id, 'Rejected', u.name)} disabled={isLoading}>
                                        <XCircle className="mr-1 h-4 w-4"/> Reject
                                    </Button>
                                    </>
                                )}
                                {u.status === 'Active' && (
                                     <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleUpdateStatus(u.id, 'Disabled', u.name)} disabled={isLoading}>
                                        <XCircle className="mr-1 h-4 w-4"/> Disable
                                    </Button>
                                )}
                                {(u.status === 'Rejected' || u.status === 'Disabled') && (
                                     <Button variant="ghost" size="sm" className="text-success hover:bg-success/10 hover:text-success" onClick={() => handleUpdateStatus(u.id, 'Active', u.name)} disabled={isLoading}>
                                        <CheckCircle className="mr-1 h-4 w-4"/> Activate
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" disabled>Edit</Button> {/* TODO: Implement edit */}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
          {allUsers.length === 0 && !isLoading && (
            <p className="text-center py-4 text-muted-foreground">No users found for the selected filter.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

