export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 간단한 Rate Limiting (IP 기반)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:${ip}`;
    const count = await env.RATE_LIMIT.get(rateLimitKey);

    if (count && parseInt(count) >= 5) {
      return new Response(JSON.stringify({ ok: false, error: '잠시 후 다시 시도해 주세요.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 카운트 증가 (10분 TTL)
    await env.RATE_LIMIT.put(rateLimitKey, String((parseInt(count) || 0) + 1), { expirationTtl: 600 });

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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: '잘못된 요청입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
