const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
async function getUserFromToken(token) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('profiles')
      .select('kb, name, email, questions_handled, messages_log, last_active')
      .eq('id', user.id)
      .single();
    if (error) return res.status(500).json({ error: 'Failed to fetch profile.' });
    return res.status(200).json({ kb: data.kb, name: data.name, email: data.email, userId: user.id, questions_handled: data.questions_handled || 0, messages_log: data.messages_log || [], last_active: data.last_active });
  }
  if (req.method === 'POST') {
    const { kb } = req.body;
    if (!kb) return res.status(400).json({ error: 'No KB data provided.' });
    const { error } = await supabase
      .from('profiles')
      .update({ kb, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return res.status(500).json({ error: 'Failed to save KB.' });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
