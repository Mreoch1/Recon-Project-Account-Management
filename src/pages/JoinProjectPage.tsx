import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

function JoinProjectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    const acceptInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          // User needs to sign in or sign up
          navigate('/auth', { 
            state: { 
              returnTo: `/join-project?token=${token}`
            }
          });
          return;
        }

        // Get the invitation details
        const { data: invitation, error: inviteError } = await supabase
          .from('project_invitations')
          .select('*, project:projects(name)')
          .eq('token', token)
          .single();

        if (inviteError || !invitation) {
          throw new Error('Invalid or expired invitation');
        }

        if (invitation.accepted) {
          throw new Error('This invitation has already been accepted');
        }

        if (new Date(invitation.expires_at) < new Date()) {
          throw new Error('This invitation has expired');
        }

        // Verify the user's email matches the invitation
        if (user.email !== invitation.email) {
          throw new Error(`Please sign in with ${invitation.email} to accept this invitation`);
        }

        // Add the user to project members
        const { error: memberError } = await supabase
          .from('project_members')
          .insert([{
            project_id: invitation.project_id,
            user_id: user.id,
            role: invitation.role
          }]);

        if (memberError) {
          if (memberError.code === '23505') {
            throw new Error('You are already a member of this project');
          }
          throw memberError;
        }

        // Mark the invitation as accepted
        const { error: updateError } = await supabase
          .from('project_invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        // Navigate to the project
        navigate(`/projects/${invitation.project_id}`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/auth')}
                className="text-blue-600 hover:text-blue-500"
              >
                Return to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default JoinProjectPage;