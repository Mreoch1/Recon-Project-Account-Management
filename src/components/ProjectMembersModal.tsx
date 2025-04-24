import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Mail, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';
import { useNavigate } from 'react-router-dom';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  auth_user: {
    email: string;
  };
}

export function ProjectMembersModal({
  isOpen,
  onClose,
  projectId
}: ProjectMembersModalProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'contractor'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, projectId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          auth_user:user_id(
            email
          )
        `)
        .eq('project_id', projectId)
        .order('role', { ascending: true });

      if (membersError) throw membersError;

      const validMembers = membersData
        ?.filter(member => member.auth_user)
        ?.map(member => ({
          ...member,
          auth_user: {
            email: member.auth_user.email
          }
        })) || [];

      setMembers(validMembers);
      setIsOwner(validMembers.some(
        member => member.user_id === user.id && member.role === 'owner'
      ));

    } catch (err: any) {
      setError('Failed to load project members');
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setInviteLink(null);

    try {
      // Check if the user is already a member
      const existingMember = members.find(member => member.auth_user.email === email);
      if (existingMember) {
        throw new Error('This user is already a member of the project.');
      }

      // Check for existing invitation
      const { data: existingInvitation, error: checkError } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .eq('email', email)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (checkError) throw checkError;

      let invitation;

      if (existingInvitation) {
        // Use existing invitation if it's still valid
        invitation = existingInvitation;
      } else {
        // Create new invitation if none exists or existing one is expired
        const { data: newInvitation, error: inviteError } = await supabase
          .from('project_invitations')
          .upsert([{
            project_id: projectId,
            email,
            role,
            token: crypto.randomUUID(),
            accepted: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
          }], {
            onConflict: 'project_id,email',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (inviteError) throw inviteError;
        invitation = newInvitation;
      }

      // Generate invitation link
      const inviteUrl = `${window.location.origin}/join-project?token=${invitation.token}`;
      setInviteLink(inviteUrl);
      setSuccess('Invitation link generated successfully! Share it with your colleague.');
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;

      await loadMembers();
      setIsRemoveConfirmOpen(false);
      setSelectedMember(null);
      setSuccess('Member removed successfully');
    } catch (err: any) {
      setError('Failed to remove member');
      console.error('Error removing member:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Project Members</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Current Members List */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Members</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No members found</p>
          ) : (
            <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                    {isOwner && (
                      <th className="relative py-3.5 pl-3 pr-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {member.auth_user.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {member.role}
                      </td>
                      {isOwner && member.role !== 'owner' && (
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setIsRemoveConfirmOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                      {isOwner && member.role === 'owner' && (
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                          <span className="text-gray-400">Owner</span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Form */}
        {isOwner && (
          <form onSubmit={handleInvite} className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Member</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="colleague@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'contractor')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="member">Member</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>

            {inviteLink && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Share this link with your colleague. They'll need to sign in or create an account to join the project.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Generate Invitation Link'
                )}
              </button>
            </div>
          </form>
        )}

        <ConfirmDialog
          isOpen={isRemoveConfirmOpen}
          onClose={() => {
            setIsRemoveConfirmOpen(false);
            setSelectedMember(null);
          }}
          onConfirm={handleRemoveMember}
          title="Remove Member"
          message={`Are you sure you want to remove ${selectedMember?.auth_user.email} from the project?`}
          confirmText="Remove"
        />
      </div>
    </div>
  );
}