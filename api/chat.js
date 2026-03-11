const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function buildSystemPrompt(kb) {
  const faqs = (kb?.faqs || []).map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
  return `You are a friendly AI support bot for a community called "${kb?.name || 'this community'}".

ABOUT THE COMMUNITY:
${kb?.desc || 'No info provided yet.'}

PRICING:
${kb?.price || 'No pricing info provided yet.'}

REFUND POLICY:
${kb?.refund || 'No refund policy provided yet.'}

${faqs ? 'FREQUENTLY ASKED QUESTIONS:\n' + faqs : ''}

STRICT RULES:
- Only answer using the information above. Never make things up.
- Be warm, friendly and use emojis occasionally.
- Keep answers concise: 2-4 sentences max.
- If you don't have the answer, say: "Great question! I'll flag this for the team to answer shortly 🙌"
- Never claim to be human. You are WhopBot.
- Never discuss anything unrelated to the community.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, userId } = req.body;

  if (!messages || !Array.isArray(messages) || !userId) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  let kb = {};
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('kb')
      .eq('id', userId)
      .single();
    if (!error && data?.kb) kb = data.kb;
  } catch (e) {
    console.error('KB fetch error:', e);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
       model: 'claude-sonnet-4-5',
        max_tokens: 500,
        system: buildSystemPrompt(kb),
        messages: messages.slice(-10)
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', JSON.stringify(data.error));
      return res.status(500).json({ reply: data.error.message || "I'm having a moment — please try again! 😅" });
    }

    const reply = data.content?.[0]?.text || "Sorry, I couldn't respond. Please try again!";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ reply: "Something went wrong. Please try again!" });
  }
};
