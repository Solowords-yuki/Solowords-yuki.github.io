// Cloudflare Workers + Hono シンプルなキャッシュプロキシ
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS設定
app.use('/*', cors({
  origin: ['https://solowords-yuki.github.io', 'http://localhost:8080', 'http://127.0.0.1:5500'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));


// GitHub Pages からランキングデータを取得してキャッシュ
app.get('/api/ranking/:level/:type', async (c) => {
  const level = c.req.param('level');
  const type = c.req.param('type');
  
  try {
    // GitHub Pages上の統合JSONを取得
    const baseURL = 'https://solowords-yuki.github.io/ranking-data';
    const response = await fetch(`${baseURL}/rankings.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const allData = await response.json();
    const levelKey = `level${level}`;
    const limit = parseInt(c.req.query('limit') || '10');
    
    // 統合ファイルから該当レベルのランキングを抽出
    if (allData?.levels?.[levelKey]?.rankings?.[type]) {
      const rankings = allData.levels[levelKey].rankings[type];
      return c.json({
        data: rankings.slice(0, limit),
        cached: false,
        source: 'github'
      });
    }
    
    return c.json({
      data: [],
      cached: false,
      source: 'github'
    });
  } catch (error) {
    console.error('Ranking fetch error:', error);
    return c.json({ error: 'Failed to fetch ranking data', details: error.message }, 500);
  }
});

// 統計情報取得
app.get('/api/stats/:level', async (c) => {
  const level = c.req.param('level');
  
  try {
    const baseURL = 'https://solowords-yuki.github.io/ranking-data';
    const response = await fetch(`${baseURL}/rankings.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    
    const allData = await response.json();
    const levelKey = `level${level}`;
    
    // 統合ファイルから統計情報を抽出
    if (allData?.levels?.[levelKey]) {
      return c.json({
        data: {
          clearCount: allData.levels[levelKey].totalClears || 0
        },
        cached: false,
        source: 'github'
      });
    }
    
    return c.json({
      data: { clearCount: 0 },
      cached: false,
      source: 'github'
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return c.json({ error: 'Failed to fetch stats', details: error.message }, 500);
  }
});

// スコア送信（クライアント側でFirebase SDKを使用）
app.post('/api/score', async (c) => {
  try {
    const body = await c.req.json();
    
    // クライアント側でFirebase SDKを使って保存するため、
    // ここでは成功レスポンスのみ返す
    return c.json({
      success: true,
      message: 'Score will be saved via Firebase SDK on client side'
    });
  } catch (error) {
    console.error('Score endpoint error:', error);
    return c.json({ error: 'Bad request' }, 400);
  }
});

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ルート
app.get('/', (c) => {
  return c.json({
    name: 'Solowords Ranking API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      ranking: '/api/ranking/:level/:type',
      stats: '/api/stats/:level',
      score: 'POST /api/score'
    }
  });
});

// Cloudflare Workers標準エクスポート（Module Worker形式）
export default app;
