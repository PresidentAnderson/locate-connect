// Run with a temporary @electric-sql/pglite installation via NODE_PATH.
// This harness uses only an in-memory PostgreSQL fixture, never application credentials.
import { createRequire } from 'node:module';
const { PGlite } = createRequire(import.meta.url)('@electric-sql/pglite');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
CREATE TYPE public.user_role AS ENUM ('user','law_enforcement','journalist','admin','developer');
CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text NOT NULL, first_name text, last_name text, phone text, role public.user_role DEFAULT 'user', is_verified boolean DEFAULT false, verification_status public.verification_status DEFAULT 'pending', verified_at timestamptz, verified_by uuid);
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
`);
if (process.argv[2] !== 'baseline') await db.exec(await readFile(new URL('../supabase/migrations/20260930220000_protect_profile_verification.sql', import.meta.url), 'utf8'));
await db.exec(`SET request.jwt.claim.role = 'service_role'; INSERT INTO profiles(id,email) VALUES('00000000-0000-0000-0000-000000000001','test@example.com'); SET request.jwt.claim.role='authenticated';`);
let cases = 0;
async function denied(sql) {
  await assert.rejects(() => db.exec(sql), error => error.code === '42501'); cases++;
}
await denied(`UPDATE profiles SET role='admin' WHERE id='00000000-0000-0000-0000-000000000001'`);
await denied(`UPDATE profiles SET is_verified=true WHERE id='00000000-0000-0000-0000-000000000001'`);
await denied(`UPDATE profiles SET verification_status='approved' WHERE id='00000000-0000-0000-0000-000000000001'`);
await denied(`UPDATE profiles SET verified_at=now() WHERE id='00000000-0000-0000-0000-000000000001'`);
await denied(`UPDATE profiles SET verified_by='00000000-0000-0000-0000-000000000001' WHERE id='00000000-0000-0000-0000-000000000001'`);
await denied(`INSERT INTO profiles(id,email,role,is_verified) VALUES('00000000-0000-0000-0000-000000000002','fake@example.com','admin',true)`);
await db.exec(`UPDATE profiles SET first_name='Updated',phone='123' WHERE id='00000000-0000-0000-0000-000000000001'`);
assert.equal((await db.query('SELECT first_name FROM profiles')).rows[0].first_name,'Updated'); cases++;
await db.exec(`SET request.jwt.claim.role='service_role'; UPDATE profiles SET role='admin',is_verified=true,verification_status='approved',verified_at=now() WHERE id='00000000-0000-0000-0000-000000000001'`);
assert.equal((await db.query('SELECT is_verified FROM profiles')).rows[0].is_verified,true); cases++;
await db.exec(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); SET request.jwt.claim.role='anon'; INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000003','signup@example.com','{"role":"admin","first_name":"Signup"}');`);
const profile=(await db.query("SELECT role,is_verified FROM profiles WHERE id='00000000-0000-0000-0000-000000000003'")).rows[0];
assert.deepEqual(profile,{role:'user',is_verified:false}); cases++;
await db.exec(`INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000004','le@example.com','{"role":"law_enforcement"}');`);
assert.equal((await db.query("SELECT role FROM profiles WHERE id='00000000-0000-0000-0000-000000000004'")).rows[0].role,'law_enforcement'); cases++;
await db.close();
console.log(`${cases} profile-security SQL assertions passed (in-memory PostgreSQL only).`);
