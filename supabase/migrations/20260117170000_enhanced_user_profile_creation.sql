-- Enhanced user profile creation to support all role-specific metadata
-- This migration updates the handle_new_user trigger function to properly handle
-- organization and badge_number fields for law enforcement and journalist roles

-- Drop and recreate the handle_new_user function with enhanced metadata support
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    organization,
    badge_number
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'badge_number'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
