-- Keep role and verification decisions outside self-service profile edits.
-- Existing profile RLS allows users to edit their own row; row ownership alone
-- does not protect the authorization columns used by server-side role checks.
CREATE OR REPLACE FUNCTION public.protect_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     OR COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      -- Preserve the existing unverified LE/journalist signup requests.
      IF NEW.role IS NULL OR NEW.role NOT IN ('user', 'law_enforcement', 'journalist')
         OR NEW.is_verified IS DISTINCT FROM false
         OR NEW.verification_status IS DISTINCT FROM 'pending'::public.verification_status
         OR NEW.verified_at IS NOT NULL OR NEW.verified_by IS NOT NULL THEN
        RAISE EXCEPTION 'Profile authorization fields require a trusted verification process'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
      RAISE EXCEPTION 'Profile authorization fields require a trusted verification process'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_verification_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_verification();

-- Auth signup metadata is user-controlled. Preserve selectable application
-- roles while preventing signup metadata from provisioning admin/developer.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('law_enforcement', 'journalist')
      THEN (NEW.raw_user_meta_data->>'role')::public.user_role
      ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;
