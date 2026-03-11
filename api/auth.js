const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password, name } = req.body;

  try {
    if (action === 'signup') {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (authError) {
        if (authError.message.includes('already')) return res.status(400).json({ error: 'Email already registered.' });
        return res.status(400).json({ error: authError.message });
      }

      const userId = authData.user.id;

      // 2. Create profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, name, email, kb: { name: '', desc: '', price: '', refund: '', faqs: [] } });

      if (profileError) return res.status(500).json({ error: 'Failed to create profile.' });

      // 3. Sign in to get session token
      const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return res.status(500).json({ error: 'Signup succeeded but login failed. Please sign in.' });

      return res.status(200).json({
        token: signIn.session.access_token,
        user: { id: userId, name, email }
      });
    }

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ error: 'Invalid email or password.' });

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return res.status(200).json({
        token: data.session.access_token,
        user: { id: data.user.id, name: profile?.name || '', email }
      });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
