import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_language, additional_languages, communication_language, needs_interpreter')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferred_language: data?.preferred_language || 'en',
    additional_languages: data?.additional_languages || [],
    communication_language: data?.communication_language || 'en',
    needs_interpreter: data?.needs_interpreter || false,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const updateData: {
    preferred_language?: string;
    additional_languages?: string[];
    communication_language?: string;
    needs_interpreter?: boolean;
  } = {};

  if (body.preferred_language !== undefined) {
    updateData.preferred_language = body.preferred_language;
  }
  if (body.additional_languages !== undefined) {
    updateData.additional_languages = body.additional_languages;
  }
  if (body.communication_language !== undefined) {
    updateData.communication_language = body.communication_language;
  }
  if (body.needs_interpreter !== undefined) {
    updateData.needs_interpreter = body.needs_interpreter;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select('preferred_language, additional_languages, communication_language, needs_interpreter')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferred_language: data.preferred_language,
    additional_languages: data.additional_languages,
    communication_language: data.communication_language,
    needs_interpreter: data.needs_interpreter,
  });
}
