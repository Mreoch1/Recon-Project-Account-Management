# Storage Bucket Setup Guide

Since we're encountering issues with programmatic bucket creation due to permissions, follow these manual steps to set up the required storage bucket in the Supabase dashboard:

## Steps to Create the Storage Bucket

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select your project: **Recon-Projects**
3. In the left sidebar, click on **Storage**
4. Click the **+ Create Bucket** button
5. Enter the following settings:
   - **Bucket Name**: `invoice-attachments` (exactly as written, using hyphens instead of underscores)
   - **Public Bucket**: Leave UNCHECKED (this should be a private bucket)
   - **File Size Limit**: 10MB
6. Click **Create**

## Set Up Storage Policies

After creating the bucket, you need to add policies to allow authenticated users to work with files:

1. In the Storage section, click on your newly created `invoice-attachments` bucket
2. Click on the **Policies** tab
3. Add the following policies for authenticated users:

### Policy 1: Allow uploads (INSERT)
- **Policy Name**: Users can upload invoice files
- **Allowed Operations**: INSERT
- **For Users In These Roles**: authenticated
- **Target Paths**: All Files
- **With These Added Security Checks**: None (or add a check if you want to restrict further)

### Policy 2: Allow downloads (SELECT)
- **Policy Name**: Users can read their invoice files
- **Allowed Operations**: SELECT
- **For Users In These Roles**: authenticated
- **Target Paths**: All Files
- **With These Added Security Checks**: None (or add a check if you want to restrict further)

### Policy 3: Allow updates (UPDATE)
- **Policy Name**: Users can update their invoice files
- **Allowed Operations**: UPDATE
- **For Users In These Roles**: authenticated
- **Target Paths**: All Files
- **With These Added Security Checks**: None (or add a check if you want to restrict further)

### Policy 4: Allow deletion (DELETE)
- **Policy Name**: Users can delete their invoice files
- **Allowed Operations**: DELETE
- **For Users In These Roles**: authenticated
- **Target Paths**: All Files
- **With These Added Security Checks**: None (or add a check if you want to restrict further)

## Add file_url Column to Invoices Table

If the `file_url` column doesn't exist in the invoices table, follow these steps:

1. In the Supabase dashboard, go to the **Table Editor** section
2. Find and select the `invoices` table
3. Click on **Edit Table**
4. Add a new column with the following settings:
   - **Name**: `file_url`
   - **Type**: `text`
   - **Default Value**: Leave empty
   - **Allow Nulls**: Check this option
   - **Primary Key**: Uncheck this option
5. Click **Save**

After completing these steps, the file upload functionality should work properly. 