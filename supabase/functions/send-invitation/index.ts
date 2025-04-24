// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get invitation details from the request
    const { record } = await req.json()
    const { project_id, email, token, role } = record

    // Get project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('name, user_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    // Get inviter details
    const { data: inviter, error: inviterError } = await supabaseAdmin
      .from('user_profiles')
      .select('email, user_metadata')
      .eq('id', project.user_id)
      .single()

    if (inviterError || !inviter) {
      throw new Error('Inviter not found')
    }

    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'
    const invitationLink = `${siteUrl}/join-project?token=${token}`

    // Send the email using Supabase's email service
    const { error: emailError } = await supabaseAdmin.auth.admin.sendRawEmail({
      to: email,
      subject: `Invitation to join ${project.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You've been invited to join ${project.name}</h2>
          
          <p style="color: #374151; font-size: 16px;">
            ${inviter.user_metadata?.name || inviter.email} has invited you to join their project as a ${role}.
          </p>
          
          <div style="margin: 30px 0;">
            <a href="${invitationLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This invitation will expire in 7 days.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            If you don't have an account yet, you'll be able to create one when you accept the invitation.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
      // Add a text version for email clients that don't support HTML
      text: `
You've been invited to join ${project.name}

${inviter.user_metadata?.name || inviter.email} has invited you to join their project as a ${role}.

Accept the invitation by visiting this link:
${invitationLink}

This invitation will expire in 7 days.

If you don't have an account yet, you'll be able to create one when you accept the invitation.
      `.trim()
    })

    if (emailError) {
      console.error('Email error:', emailError)
      throw emailError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation email sent successfully'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400,
      }
    )
  }
})