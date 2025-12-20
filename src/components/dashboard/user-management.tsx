'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  KeyRound,
  Loader2,
  AlertCircle,
  Shield,
  Users,
  User,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT'

interface AppUser {
  id: string
  email: string
  name: string
  role: UserRole
  require_password_change: boolean
  created_at: string
  updated_at: string
}

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  SUPERVISOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  AGENT: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  AGENT: 'Agent',
}

const roleIcons: Record<UserRole, React.ElementType> = {
  ADMIN: Shield,
  SUPERVISOR: Users,
  AGENT: User,
}

export function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'AGENT' as UserRole,
    temporaryPassword: '',
  })

  // Edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [editData, setEditData] = useState({ name: '', role: '' as UserRole })

  // Reset password dialog
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null)
  const [newTempPassword, setNewTempPassword] = useState('')

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setUsers(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setCreateDialogOpen(false)
      setNewUser({ email: '', name: '', role: 'AGENT', temporaryPassword: '' })
      fetchUsers()
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return

    setEditLoading(true)

    try {
      const response = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setEditDialogOpen(false)
      setEditUser(null)
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordUser) return

    setResetPasswordLoading(true)

    try {
      const response = await fetch(`/api/users/${resetPasswordUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          temporaryPassword: newTempPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setResetPasswordDialogOpen(false)
      setResetPasswordUser(null)
      setNewTempPassword('')
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return

    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/users/${deleteUser.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setDeleteDialogOpen(false)
      setDeleteUser(null)
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const openEditDialog = (user: AppUser) => {
    setEditUser(user)
    setEditData({ name: user.name, role: user.role })
    setEditDialogOpen(true)
  }

  const openResetPasswordDialog = (user: AppUser) => {
    setResetPasswordUser(user)
    setNewTempPassword('')
    setResetPasswordDialogOpen(true)
  }

  const openDeleteDialog = (user: AppUser) => {
    setDeleteUser(user)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Kullanıcı Yönetimi</h3>
          <p className="text-sm text-muted-foreground">
            Ekip üyelerinizi ekleyin ve yönetin
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Kullanıcı Ekle
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Kayıt Tarihi</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const RoleIcon = roleIcons[user.role]
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('gap-1', roleBadgeColors[user.role])}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.require_password_change ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Şifre Değişimi Bekliyor
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Aktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), 'd MMM yyyy', { locale: tr })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={user.id === currentUser?.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openResetPasswordDialog(user)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Şifre Sıfırla
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Henüz kullanıcı eklenmemiş
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            <DialogDescription>
              Ekibinize yeni bir kullanıcı ekleyin. Kullanıcı ilk girişte şifresini değiştirecek.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ahmet Yılmaz"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="ahmet@sirket.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Agent
                      </div>
                    </SelectItem>
                    <SelectItem value="SUPERVISOR">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Supervisor
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempPassword">Geçici Şifre</Label>
                <Input
                  id="tempPassword"
                  type="text"
                  value={newUser.temporaryPassword}
                  onChange={(e) => setNewUser({ ...newUser, temporaryPassword: e.target.value })}
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Bu şifreyi kullanıcıyla paylaşın. İlk girişte değiştirmesi istenecek.
                </p>
              </div>
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {createError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kullanıcı Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Ad Soyad</Label>
                <Input
                  id="editName"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Rol</Label>
                <Select
                  value={editData.role}
                  onValueChange={(value: UserRole) => setEditData({ ...editData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Sıfırla</DialogTitle>
            <DialogDescription>
              {resetPasswordUser?.name} ({resetPasswordUser?.email}) için yeni geçici şifre belirleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newTempPassword">Yeni Geçici Şifre</Label>
                <Input
                  id="newTempPassword"
                  type="text"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Kullanıcı bu şifreyle giriş yapınca yeni şifre belirleyecek.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={resetPasswordLoading}>
                {resetPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifreyi Sıfırla
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteUser?.name}</strong> kullanıcısını silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
