import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('kb, name')
      .eq('id', userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Bot not found.' });

    // Only return safe public info — never expose emails or passwords
    return res.status(200).json({
      communityName: data.kb?.name || 'Community Support',
      botReady: !!(data.kb?.desc)
    });

  } catch (err) {
    console.error('Widget API error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
