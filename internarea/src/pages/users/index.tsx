import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Users, ArrowLeft, Search, Trash2, Pencil, X, Check, Loader, UserCircle, Mail, ChevronDown, ChevronUp, UserPlus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getApiEndpoint } from '@/utils/api';

interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  photo?: string;
  subscription?: { planId: string; status: string };
  createdAt?: any;
  lastLogin?: any;
}

export default function UsersPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/adminlogin');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthorized) fetchUsers();
  }, [isAuthorized]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(getApiEndpoint('/users'));
      if (data?.success) setUsers(data.users);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(uid);
    try {
      await axios.delete(getApiEndpoint(`/users/${uid}`));
      toast.success(`User "${name}" deleted`);
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', email: user.email || '' });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '' });
  };

  const handleSave = async (uid: string) => {
    setSavingId(uid);
    try {
      await axios.put(getApiEndpoint(`/users/${uid}`), editForm);
      toast.success('User updated');
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...editForm } : u));
      cancelEdit();
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setSavingId(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.password) {
      toast.error('All fields are required');
      return;
    }
    if (addForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setAddingUser(true);
    try {
      const { data } = await axios.post(getApiEndpoint('/users'), addForm);
      if (data?.success) {
        toast.success(`User "${addForm.name}" created successfully`);
        setUsers(prev => [data.user, ...prev]);
        setShowAddModal(false);
        setAddForm({ name: '', email: '', password: '' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts._seconds ? ts._seconds * 1000 : ts);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const planBadge = (planId?: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-600',
      bronze: 'bg-amber-100 text-amber-700',
      silver: 'bg-slate-200 text-slate-700',
      gold: 'bg-yellow-100 text-yellow-700',
    };
    return colors[planId || 'free'] || colors.free;
  };

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-600" />
              Manage Users
              <span className="ml-2 text-sm font-normal text-gray-400">({users.length} total)</span>
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchUsers}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-16">
            <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Joined</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Last Login</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(user => (
                    <React.Fragment key={user.uid}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        {/* User */}
                        <td className="px-4 py-3">
                          {editingUser?.uid === user.uid ? (
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                              className="border border-indigo-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {user.photo ? (
                                <img src={user.photo} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <UserCircle className="w-8 h-8 text-gray-300" />
                              )}
                              <span className="font-medium text-gray-800">{user.name || '—'}</span>
                            </div>
                          )}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-gray-600">
                          {editingUser?.uid === user.uid ? (
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                              className="border border-indigo-300 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          ) : (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {user.email || '—'}
                            </span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planBadge(user.subscription?.planId)}`}>
                            {user.subscription?.planId || 'free'}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>

                        {/* Last Login */}
                        <td className="px-4 py-3 text-gray-500">{formatDate(user.lastLogin)}</td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {editingUser?.uid === user.uid ? (
                              <>
                                <button
                                  onClick={() => handleSave(user.uid)}
                                  disabled={savingId === user.uid}
                                  className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                  title="Save"
                                >
                                  {savingId === user.uid ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(user)}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(user.uid, user.name)}
                                  disabled={deletingId === user.uid}
                                  className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition disabled:opacity-50"
                                  title="Delete"
                                >
                                  {deletingId === user.uid ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => setExpandedUser(expandedUser === user.uid ? null : user.uid)}
                                  className="p-1.5 bg-gray-50 text-gray-500 rounded hover:bg-gray-100 transition"
                                  title="Details"
                                >
                                  {expandedUser === user.uid ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {expandedUser === user.uid && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-indigo-50 border-t border-indigo-100">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">UID</p>
                                <p className="text-gray-700 font-mono break-all">{user.uid}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Subscription Status</p>
                                <p className="text-gray-700 capitalize">{user.subscription?.status || '—'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Profile Photo</p>
                                <p className="text-gray-700 truncate">{user.photo || 'No photo'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Plan</p>
                                <p className="text-gray-700 capitalize">{user.subscription?.planId || 'free'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => { setShowAddModal(false); setAddForm({ name: '', email: '', password: '' }); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                <p className="text-sm text-gray-400">Creates a Firebase Auth account + Firestore profile</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Bishal Shah"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">The user will log in with this password</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddForm({ name: '', email: '', password: '' }); }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {addingUser ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Creating...</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Create User</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
