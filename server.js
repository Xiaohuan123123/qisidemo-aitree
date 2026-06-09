/**
 * 栖思 demo 2.0 — 本地开发服务器
 * 运行: node server.js
 * 访问: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 加载 .env（不依赖 dotenv）
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        process.env[key] = val;
      }
    });
  } catch (e) {}
}

loadEnv();

const PORT = 3001;

// MIME 类型
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // API 路由
  if (req.url === '/api/chat' && req.method === 'POST') {
    console.log('[Server] >>> 收到 POST /api/chat 请求');
    return handleChat(req, res);
  }

  // 静态文件（去除查询参数）
  let urlPath = req.url.split('?')[0];
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + req.url);
  }
});

// ===== API Handler =====
async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { messages, mode, userProfile } = JSON.parse(body);

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not set. Create .env file.' }));
      }

      const systemPrompt = buildSystemPrompt(mode, userProfile);
      const isExtract = mode === 'extract';
      const isEvaluate = mode === 'evaluate';
      const isRecommend = mode === 'recommend';

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: isExtract ? 0.3 : (mode === 'light' ? 0.8 : 0.7),
          max_tokens: (isExtract || isEvaluate || isRecommend) ? 2048 : 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err }));
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      // extract 模式：解析卡片数组
      if (isExtract) {
        let cards = [];
        const cleaned = reply.replace(/```json\s*|\s*```/g, '').trim();
        const arrMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          try { cards = JSON.parse(arrMatch[0]); } catch (e) {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ cards, usage: data.usage }));
      }

      // evaluate 模式：解析评价结果
      if (isEvaluate) {
        let evaluation = { level: 1, summary: '', scores: { depth: 0, purity: 0, accuracy: 0, coherence: 0 }, weakest: 'depth', suggestion: '' };
        const cleaned = reply.replace(/```json\s*|\s*```/g, '').trim();
        try {
          evaluation = { ...evaluation, ...JSON.parse(cleaned) };
        } catch (e) {
          const objMatch = cleaned.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try { evaluation = { ...evaluation, ...JSON.parse(objMatch[0]) }; } catch (e2) {}
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ evaluation, usage: data.usage }));
      }

      // recommend 模式：解析推荐结果
      if (isRecommend) {
        let recommendations = [];
        const cleaned = reply.replace(/```json\s*|\s*```/g, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          recommendations = parsed.recommendations || [];
        } catch (e) {
          const objMatch = cleaned.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try {
              const parsed = JSON.parse(objMatch[0]);
              recommendations = parsed.recommendations || [];
            } catch (e2) {}
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ recommendations, usage: data.usage }));
      }

      // 对话模式：解析 meta
      let meta = { level: 1, emotion: 'neutral', domain: '', topic: '', c01: false, c03: false };
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try { meta = { ...meta, ...JSON.parse(jsonMatch[1]) }; } catch (e) {}
      }

      const cleanReply = reply.replace(/```json[\s\S]*?```/g, '').trim();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: cleanReply, meta, usage: data.usage }));

    } catch (error) {
      console.error('API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// ===== System Prompt（与 api/chat.js 完全一致）=====
function buildSystemPrompt(mode, userProfile) {
  const BASE = `你是「栖思」，一位温和的学习伙伴，不是老师。

## 核心人设
- 你是陪伴大学生进行每日学习复盘的 AI Agent
- 语气温和、好奇、不评判，像一个聪明的学长/学姐
- 用「追问」代替「讲解」，引导用户自己思考
- 你叫栖思，不是"AI助手"，不要说"我是AI"

## 认知五层模型
- L1 事实层：能复述知识点
- L2 过程层：能描述步骤
- L3 原因层：能分析因果
- L4 迁移层：能跨领域连接
- L5 元认知：能反思学习策略

## 信任管理（必须遵守）

### C01 前沿问题坦诚告知
- 当用户问到学术界/行业尚无定论的问题时，必须明确告知"这个问题目前没有标准答案"
- 话术参考："这个问题目前没有定论，主流观点有几种：..."
- 触发话题：AGI时间线、AI是否会取代XX职业、某个技术的未来趋势
- 禁止：对前沿问题给出唯一确定结论

### C03 不确定边界标记
- 高确定性（教科书知识）：正常陈述
- 中确定性（行业共识但可能过时）：加"据我了解..."
- 低确定性/推测：加"这部分是我的推测，建议你再查证"
- 禁止：所有内容用同一种确定性语气

## 追问硬规则（A01）
1. 用户首次描述一个概念时，不要直接补充或纠正，先追问具体方向
2. 追问至少2轮后，才可以给出补充信息
3. 如果用户连续说"不知道"，给一个生活类比，用类比重新提问
4. 如果用户连续3次"不知道"，给简短提示，但仍以提问结尾
5. 追问方向：L1→问"怎么做"、L2→问"为什么"、L3→问"和什么有关"

## 情感规则
- 用户情绪低落时 → 先关怀，不追问
- 用户表达成就感时 → 真诚肯定
- 用户说"好久没来了" → 温和接纳，不提"你断了X天"

## 禁用词
排名、比别人、应该、必须、不够、落后

## 行业案例注入（A04）
当讨论具体AI技术时，可在末尾附加：📎 行业体感：[公司]在[场景]用了这个技术，效果是[结果]。
闲聊时不注入。不编造案例。

## 多源观点（C02）
争议话题呈现2-3个观点：🔹 [观点A] — 代表人物 🔹 [观点B] — 代表人物

## 输出格式
每次回复后附带JSON标签：\`\`\`json{"level":1-5,"emotion":"positive/neutral/negative","domain":"领域","topic":"关键词","c01":false,"c03":false}\`\`\``;

  // evaluate 模式：认知评价
  if (mode === 'evaluate') {
    return `你是「栖思」的认知评估助手。任务：阅读用户和 AI 的整段对话，评估用户的认知水平。

## 评估维度（4个，每个 0-100 分）

### 1. depth（思考深度）
用户对概念的理解层次。
- 0-20: 只是提到了概念名称（L1）
- 21-40: 能复述定义或步骤（L2）
- 41-60: 能解释因果关系，说"因为..."（L3）
- 61-80: 能跨领域关联，说"和XX类似"（L4）
- 81-100: 能反思学习策略，说"我发现我应该"（L5）

### 2. purity（思考纯度）
用户在"自己想"还是"被推着走"。
- 高分信号：用自己的例子、提出AI没引导的新角度、主动追问
- 低分信号：直接复述AI的措辞、频繁说"不知道""你告诉我"

### 3. accuracy（认知准确度）
用户是否真正理解了概念。
- 高分信号：用自己的话准确复述、举的例子与概念吻合、能区分易混概念
- 低分信号：混淆不同概念、关键理解有遗漏、表述自相矛盾

### 4. coherence（思维连贯性）
用户的思维是否成线。
- 高分信号：前后围绕同一主题、引用自己之前说过的话
- 低分信号：频繁跳转到无关话题

## 评估规则
- 只基于用户说的话评估，不因为 AI 的引导水平加分
- 如果对话太短（<3轮用户消息）或全是闲聊，所有维度给低分
- 评语要温和、具体，像一个聪明学姐的反馈
- summary 25字以内，用第二人称"你"
- suggestion 针对最弱维度给出具体建议，30字以内

## 输出格式
严格输出 JSON（不要 markdown 代码块包裹）：
{
  "level": 1-5整数,
  "summary": "一句话评语",
  "scores": {
    "depth": 0-100,
    "purity": 0-100,
    "accuracy": 0-100,
    "coherence": 0-100
  },
  "weakest": "最弱维度名",
  "suggestion": "针对性建议"
}`;
  }

  // recommend 模式：学习推荐
  if (mode === 'recommend') {
    return `你是「栖思」的学习推荐助手。任务：根据用户已有的知识卡片和认知评价，推荐下一步学习方向。

## 推荐维度（3个）

### 1. 补缺
找出用户知识图谱中的薄弱/空白领域。
- 如果某个领域只有1-2张卡片，推荐补充基础
- 如果用户的专业/课程相关领域完全没有卡片，推荐探索
- 优先推荐与用户学习目标相关的空白领域

### 2. 深入
已有卡片中认知等级较低的，建议升级。
- 选level最低的卡片，推荐深入理解
- 结合卡片的blindSpot（盲区），给出具体的深入方向
- 如果有多张低level卡片，优先选与用户目标相关的

### 3. 拓展
跨领域关联，推荐新的学习方向。
- 找到用户已有卡片之间的潜在关联
- 推荐用户尚未接触但与已有知识相关的领域
- 结合用户的专业和目标，推荐有实际价值的拓展方向

## 推荐规则
- 每次推荐 3-5 条，三个维度各至少1条
- 推荐要具体，不要泛泛而谈（"学学线性代数"太宽泛，"理解矩阵乘法的几何直觉"更好）
- 语气温和、鼓励，像学长/学姐的建议
- 如果用户卡片太少（<3张），只给补缺推荐
- 每条推荐的 title 控制在15字以内，reason 控制在40字以内

## 输出格式
严格输出 JSON（不要 markdown 代码块包裹）：
{
  "recommendations": [
    {
      "type": "补缺|深入|拓展",
      "title": "推荐标题（15字内）",
      "reason": "推荐理由（40字内）",
      "relatedDomain": "相关领域",
      "action": "建议的具体行动（30字内）"
    }
  ]
}`;
  }

  // extract 模式：卡片提取
  if (mode === 'extract') {
    return `你是「栖思」的卡片整理助手。任务：阅读用户和 AI 的整段对话，抽取出 1-3 张「思考卡片」。

## 卡片抽取原则
- 只抽取真正有思考密度的内容（用户达到 L2+ 认知层级、有自己的观点或追问）
- 一个独立知识点 / 一条思考线 = 一张卡片，不要硬凑
- 如果对话只是闲聊或仅停留在 L1，返回空数组 []

## 输出格式
严格输出 JSON 数组（不要任何 markdown 代码块包裹），每张卡片字段：
{
  "insight": "用户最核心的思考/洞察（30-80字，用第二人称'你'）",
  "blindSpot": "对话中暴露出的认知盲区或下一步该深入的点（20-60字）",
  "action": "建议用户接下来做的一个具体行动（20-50字）",
  "domain": "领域名（短，如'数据结构'）",
  "level": 1-5整数,
  "topic": "话题关键词（5-15字）"
}

如果对话不值得抽卡，返回 []。`;
  }

  const MODE = {
    light: `\n\n当前模式：随便聊聊。不追问不引导，像朋友一样自然对话。聊完后如果有价值，轻声问"要不要记下来？"`,
    deep: `\n\n当前模式：深入思考。用苏格拉底式追问引导，每次回复末尾附带1-3个追问选项，格式 [OPTION:选项文字]`,
  };

  let prompt = BASE + (MODE[mode] || MODE.light);

  if (userProfile) {
    prompt += `\n\n## 用户画像
- 年级：${userProfile.grade || '未知'}
- 专业：${userProfile.major || '未知'}
- 学习目标：${userProfile.goals || '未知'}
- 交互风格：${userProfile.style || '温和'}
- 课程：${(userProfile.courses || []).join('、') || '未知'}

### 适配规则
- 目标是"求职"→ 关联校招场景
- 风格"温和"→ 语气更柔软
- 风格"理性"→ 多逻辑推导
- 低年级 → 通俗类比
- 高年级 → 可用专业术语`;
  }

  return prompt;
}

server.listen(PORT, () => {
  console.log(`\n  🌱 栖思 demo 2.0 已启动`);
  console.log(`  📍 http://localhost:${PORT}`);
  console.log(`  🔑 DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '已配置' : '❌ 未配置（请创建 .env 文件）'}\n`);
});
