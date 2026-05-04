export default {
  async fetch(request, env) {

    const origin = request.headers.get('Origin') || '';

    const allowedOrigins = [
      'https://solboxcloud.github.io',
      'http://localhost',
      'http://127.0.0.1',
    ];

    const corsOrigin = allowedOrigins.includes(origin) ? origin : 'null';

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    // 토큰 검증
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== env.API_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const payload = await request.json();

      const slackRes = await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!slackRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: 'Slack 전송 실패' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: '요청 처리 중 오류가 발생했습니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
