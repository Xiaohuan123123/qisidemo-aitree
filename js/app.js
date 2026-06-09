/**
 * 栖思 demo 2.0 PC端 — 主控模块
 */
var App = (function() {
  'use strict';

  var currentTab = 'growth';
  var _previousTab = 'growth'; // 记录打开卡片详情前的Tab

  // ===== AI 知识库数据 =====
  var KNOWLEDGE_BASE = [
    {
      domain: '深度学习',
      icon: '🧠',
      items: [
        { title: '神经网络基础', level: 2, summary: '通过大量参数拟合复杂函数，每一层提取不同层次的特征。', keyPoints: ['感知器与多层网络', '激活函数（ReLU/Sigmoid/Tanh）', '前向传播过程', '万能近似定理直觉'], resources: ['3Blue1Brown 神经网络系列', 'CS231n 第1-2讲'] },
        { title: '反向传播算法', level: 3, summary: '链式法则让梯度从输出层逐层传回，每层参数都知道自己该往哪个方向调整。', keyPoints: ['链式法则的计算图理解', '梯度消失与梯度爆炸的区别', '自动微分 vs 手动推导'], resources: ['CS231n 第4讲', '反向传播直觉（colah博客）'] },
        { title: 'Transformer 注意力机制', level: 3, summary: '通过注意力机制让模型"选择性关注"输入中的重要部分。', keyPoints: ['自注意力（Self-Attention）', '多头注意力的作用', '位置编码', 'QKV 矩阵的直觉'], resources: ['Attention Is All You Need 原论文', 'The Illustrated Transformer'] },
        { title: '过拟合与正则化', level: 3, summary: '模型把训练数据的噪声当成了规律，就像死记硬背答案却不理解原理。', keyPoints: ['过拟合的直觉与检测', 'Dropout 为什么有效', 'L1/L2 正则化', '数据增强'], resources: ['CS231n 第7讲', 'Deep Learning 第7章'] },
        { title: '卷积神经网络（CNN）', level: 3, summary: '用小窗口扫描图像提取局部特征，再通过池化压缩信息。', keyPoints: ['卷积操作的直觉', '池化层的作用', '1×1 卷积的意义', '经典架构（ResNet/VGG）'], resources: ['CS231n 第5-6讲', 'CNN 可视化教程'] },
      ]
    },
    {
      domain: '机器学习',
      icon: '📊',
      items: [
        { title: '梯度下降优化', level: 2, summary: '沿着损失函数下降最快的方向一步步走，学习率决定了每一步迈多大。', keyPoints: ['批量梯度下降 vs SGD vs Mini-batch', '学习率调度策略', '动量与自适应方法（Adam）', '收敛性直觉'], resources: ['吴恩达 ML 课程第2周', 'Optimization for Deep Learning（综述）'] },
        { title: '损失函数选择', level: 2, summary: '损失函数是模型的指南针，告诉模型当前预测和正确答案差多远。', keyPoints: ['均方误差 vs 交叉熵', '为什么交叉熵更适合分类', 'Huber Loss 的鲁棒性', '自定义损失函数设计'], resources: ['CS231n 损失函数部分', 'Pattern Recognition 第6章'] },
        { title: '贝叶斯公式直觉', level: 3, summary: '新的证据如何更新你对某个假设的信念强度，本质是"用数据修正先验"。', keyPoints: ['条件概率的直觉', '先验/后验/似然的关系', '贝叶斯 vs 频率派', '朴素贝叶斯分类器'], resources: ['3Blue1Brown 贝叶斯视频', '统计学习方法 第1章'] },
        { title: '学习范式分类', level: 2, summary: '有标签引导 vs 自己发现结构，本质区别在于是否有"标准答案"。', keyPoints: ['监督/无监督/半监督/自监督', '强化学习的特殊性', '不同范式的适用场景'], resources: ['吴恩达 ML 课程第1周', '周志华《机器学习》第1章'] },
      ]
    },
    {
      domain: 'AIPM',
      icon: '🎯',
      items: [
        { title: 'Prompt Engineering', level: 4, summary: '不是背模板，而是把你的意图用模型能理解的方式结构化表达。', keyPoints: ['Zero-shot vs Few-shot', '思维链（CoT）为什么有效', '系统提示词设计', '输出格式约束'], resources: ['OpenAI Prompt Engineering Guide', 'Prompt Engineering Guide（DAIR.AI）'] },
        { title: 'AI Agent 架构', level: 4, summary: '核心不是对话，而是行动——它能调用工具、查询数据、执行操作。', keyPoints: ['Agent = LLM + 记忆 + 工具 + 规划', 'ReAct 框架', '多 Agent 协作', '工具调用（Function Calling）'], resources: ['Lilian Weng: LLM Powered Agents', 'LangChain Agent 文档'] },
        { title: 'RAG 检索增强生成', level: 4, summary: '先找再答，让大模型基于检索到的真实文档回答，而不是凭记忆编造。', keyPoints: ['检索质量决定回答质量', '向量检索 vs 关键词检索', 'Chunking 策略', 'RAG 评估指标'], resources: ['LangChain RAG 教程', 'RAG 综述论文'] },
      ]
    },
    {
      domain: 'AI 工程',
      icon: '⚙️',
      items: [
        { title: '向量 Embedding', level: 3, summary: '把文字变成向量，让计算机能计算"语义相似度"。', keyPoints: ['Embedding 的几何直觉', '余弦相似度', '不同模型的维度选择', '向量数据库入门'], resources: ['OpenAI Embeddings Guide', 'Pinecone 学习中心'] },
        { title: '模型微调策略', level: 3, summary: 'Fine-tuning 改模型，Prompt 改输入，成本和效果完全不同。', keyPoints: ['全量微调 vs 参数高效微调', 'LoRA 的原理', '数据质量 > 数据数量', '过拟合风险控制'], resources: ['HuggingFace Fine-tuning 教程', 'LoRA 原论文'] },
      ]
    },
    {
      domain: '数学基础',
      icon: '📐',
      items: [
        { title: '线性代数直觉', level: 3, summary: '矩阵乘法是一种线性变换，旋转、缩放、剪切都可以用矩阵表示。', keyPoints: ['矩阵 = 线性变换', '特征值分解的物理意义', 'SVD 分解', '在 ML 中的应用场景'], resources: ['3Blue1Brown 线性代数系列', 'MIT 18.06 线性代数'] },
        { title: '概率论基础', level: 3, summary: '不确定性是 AI 的核心语言，概率论提供了描述不确定性的数学工具。', keyPoints: ['条件概率与独立性', '期望与方差', '常用分布（高斯/伯努利）', '大数定律与中心极限定理'], resources: ['3Blue1Brown 概率论', 'MIT 6.041 概率导论'] },
      ]
    }
  ];

  function init() {
    if (!Storage.Onboarding.isDone()) _showOnboarding();
    _seedDemoCards(); // 演示用：首次加载时填充示例卡片
    Chat.init();
    document.querySelectorAll('.nav-item').forEach(function(item) {
      item.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });
    // 监听对话更新，刷新右侧面板
    document.addEventListener('chat:updated', _updateRightPanel);
    // 监听卡片生成事件
    document.addEventListener('cards:generated', function(e) {
      var cards = e.detail ? e.detail.cards : [];
      _updateEchoPage();
      _updateTreePage();
      _updateProfilePage();
      _updateRightPanel();
    });
    // 监听评价完成事件（刷新"我的"页和右侧面板）
    document.addEventListener('evaluate:done', function(e) {
      _updateProfilePage();
      _updateRightPanel();
    });
    var theme = Storage.Theme.get();
    if (theme) document.body.className = theme;
    Storage.Analytics.track('app_launch', { isFirst: !Storage.Onboarding.isDone() });
    _updateProfilePage();
    _updateTreePage();
    _updateEchoPage();
    _updateRightPanel();
    _updateTrashBadge();
  }

  // ===== 示例卡片种子 =====
  function _seedDemoCards() {
    if (Storage.Echoes.load().length > 0) return;
    var now = Date.now();
    var D = 86400000;
    var examples = [
      // 深度学习分支
      { id:'demo-1', createdAt:new Date(now-D*12).toISOString(), insight:'你理解了神经网络的本质：通过大量参数拟合复杂函数，每一层提取不同层次的特征。', blindSpot:'你还不清楚为什么深层网络比浅层网络更强——表达能力的差距在哪里？', action:'用一个3层MLP和一个1层网络对比MNIST分类效果。', domain:'深度学习', level:2, topic:'神经网络基础' },
      { id:'demo-2', createdAt:new Date(now-D*10).toISOString(), insight:'你搞清楚了反向传播的核心：链式法则让梯度从输出层逐层传回，每层参数都知道自己该往哪个方向调整。', blindSpot:'你把梯度消失和梯度爆炸搞混了——它们的成因和解法完全不同。', action:'手动推导一个2层网络的反向传播过程，写出每一步的梯度公式。', domain:'深度学习', level:3, topic:'反向传播算法' },
      { id:'demo-3', createdAt:new Date(now-D*8).toISOString(), insight:'你理解了Transformer通过注意力机制让模型"选择性关注"输入中的重要部分，类似人类阅读时自动聚焦关键词。', blindSpot:'你还没深入理解多头注意力的作用——为什么要同时关注多个不同的位置？', action:'用PyTorch实现一个简化版注意力计算，跑一遍QKV矩阵相乘。', domain:'深度学习', level:3, topic:'Transformer注意力机制' },
      { id:'demo-4', createdAt:new Date(now-D*5).toISOString(), insight:'你认识到"过拟合"的直觉：模型把训练数据的噪声也当成了规律，就像死记硬背答案却不理解原理。', blindSpot:'你知道Dropout能缓解过拟合，但不清楚为什么随机丢弃神经元反而能提升泛化能力。', action:'分别训练有Dropout和无Dropout的网络，对比验证集准确率。', domain:'深度学习', level:3, topic:'过拟合与正则化' },
      { id:'demo-5', createdAt:new Date(now-D*3).toISOString(), insight:'你理解了CNN的卷积操作：用小窗口扫描图像，提取局部特征，再通过池化压缩信息。', blindSpot:'你还不清楚1×1卷积的作用——它看起来没有"卷积"，为什么却很重要？', action:'用CNN在CIFAR-10上训练，对比有无1×1卷积的参数量差异。', domain:'深度学习', level:3, topic:'卷积神经网络' },

      // 机器学习分支
      { id:'demo-6', createdAt:new Date(now-D*11).toISOString(), insight:'你搞清楚了梯度下降的核心思想：沿着损失函数下降最快的方向一步步走，学习率决定了每一步迈多大。', blindSpot:'你把SGD和Batch GD搞混了——它们的更新频率和收敛行为完全不同。', action:'对比SGD和Batch GD在一个简单数据集上的收敛曲线。', domain:'机器学习', level:2, topic:'梯度下降优化' },
      { id:'demo-7', createdAt:new Date(now-D*9).toISOString(), insight:'你理解了"损失函数"的作用：它是模型的指南针，告诉模型当前预测和正确答案差多远。', blindSpot:'你还没想过为什么交叉熵比均方误差更适合分类任务。', action:'分别用MSE和交叉熵训练同一个二分类网络，观察收敛速度差异。', domain:'机器学习', level:2, topic:'损失函数选择' },
      { id:'demo-8', createdAt:new Date(now-D*7).toISOString(), insight:'你理解了贝叶斯公式的直觉：新的证据如何更新你对某个假设的信念强度，本质是"用数据修正先验"。', blindSpot:'你对"先验概率怎么选"还很模糊，不同的先验会导致完全不同的结论。', action:'用感冒vs新冠的场景自己手算一遍贝叶斯更新。', domain:'机器学习', level:3, topic:'贝叶斯公式直觉' },
      { id:'demo-9', createdAt:new Date(now-D*4).toISOString(), insight:'你认识到监督学习和无监督学习的本质区别：有标签引导vs自己发现结构。', blindSpot:'你还不清楚半监督学习在什么场景下比纯监督学习更有效。', action:'用同一数据集分别跑有监督和无监督，对比结果。', domain:'机器学习', level:2, topic:'学习范式分类' },

      // AIPM分支
      { id:'demo-10', createdAt:new Date(now-D*6).toISOString(), insight:'你意识到Prompt Engineering的本质不是背模板，而是把你的意图用模型能理解的方式结构化表达。', blindSpot:'你还没有思考过思维链为什么能提升推理效果——它改变了模型的计算方式吗？', action:'拿一个推理题，分别用直接提问和"一步步思考"来对比输出质量。', domain:'AIPM', level:4, topic:'Prompt Engineering' },
      { id:'demo-11', createdAt:new Date(now-D*2).toISOString(), insight:'你认识到AI Agent的核心不是对话，而是行动——它能调用工具、查询数据、执行操作。', blindSpot:'你对Agent的记忆系统还不清楚——短期记忆和长期记忆是怎么配合的？', action:'用Function Calling实现一个能查天气的Agent。', domain:'AIPM', level:4, topic:'AI Agent架构' },
      { id:'demo-12', createdAt:new Date(now-D*1).toISOString(), insight:'你理解了RAG的核心思路：先找再答，让大模型基于检索到的真实文档回答，而不是凭记忆编造。', blindSpot:'你还没意识到检索质量直接决定回答质量——检索到不相关文档反而会误导模型。', action:'用LangChain搭建一个最简单的RAG流程。', domain:'AIPM', level:4, topic:'RAG检索增强生成' },

      // AI工程分支
      { id:'demo-13', createdAt:new Date(now-D*3).toISOString(), insight:'你理解了Embedding的作用：把文字变成向量，让计算机能计算"语义相似度"。', blindSpot:'你还不清楚不同Embedding模型的维度选择对检索精度的影响。', action:'用OpenAI Embedding对比两段文字的余弦相似度。', domain:'AI工程', level:3, topic:'向量Embedding' },
      { id:'demo-14', createdAt:new Date(now-D*1.5).toISOString(), insight:'你认识到Fine-tuning和Prompt Engineering的取舍：前者改模型，后者改输入，成本和效果完全不同。', blindSpot:'你还不清楚LoRA等参数高效微调方法的原理。', action:'对比同一个任务用Prompt和Fine-tuning的效果差异。', domain:'AI工程', level:3, topic:'模型微调策略' },

      // 数学基础
      { id:'demo-15', createdAt:new Date(now-D*6).toISOString(), insight:'你理解了矩阵乘法的几何直觉：它是一种线性变换，旋转、缩放、剪切都可以用矩阵表示。', blindSpot:'你还不清楚特征值分解的物理意义——它找到了什么"不变"的东西？', action:'用Python可视化一个2×2矩阵对一组点的变换效果。', domain:'数学基础', level:3, topic:'线性代数直觉' },
    ];
    Storage.Echoes.save(examples);
    // 右侧面板：默认显示最近5张
    if (Storage.RecentCards.load().length === 0) {
      Storage.RecentCards.save(examples.slice(-5));
    }
  }

  function switchTab(tab) {
    if (tab === currentTab) return;
    // 切换Tab时退出回响删除模式
    if (_isEchoDeleteMode) cancelEchoDelete();
    currentTab = tab;
    document.querySelectorAll('.page-section').forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById('page-' + tab);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(n) {
      n.classList.toggle('active', n.dataset.tab === tab);
    });
    Storage.Analytics.track('tab_switch', { to: tab });
    if (tab === 'echo') _updateEchoPage();
    if (tab === 'tree') _updateTreePage();
    if (tab === 'forest') _updateForestPage();
    if (tab === 'profile') _updateProfilePage();
  }

  // 我的页 Tab 切换
  function switchProfileTab(ptab) {
    document.querySelectorAll('.profile-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.ptab === ptab);
    });
    document.querySelectorAll('.profile-panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'panel-' + ptab);
    });
  }

  function _showOnboarding() {
    var overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.add('active');
  }

  function completeOnboarding() {
    var profile = {
      nickname: _getInputVal('ob-nickname', ''),
      school: _getInputVal('ob-school', ''),
      major: _getInputVal('ob-major', ''),
      grade: _getSelectVal('ob-grade', ''),
      courses: _getChipValues('ob-courses'),
      goals: _getSelectVal('ob-goals', ''),
      style: _getRadioVal('ob-style', '温和'),
      treeSpecies: _getSelectVal('ob-tree', '银杏'),
    };
    Storage.Profile.save(profile);
    Storage.Onboarding.markDone();
    var overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.remove('active');
    Storage.Analytics.track('onboarding_complete', profile);
    _updateProfilePage();
  }

  function skipOnboarding() {
    Storage.Onboarding.markDone();
    var overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.remove('active');
    Storage.Analytics.track('onboarding_skip', {});
  }

  function _updateProfilePage() {
    var p = Storage.Profile.load();
    _setText('val-school', p.school || '未填写');
    _setText('val-major', p.major || '未填写');
    _setText('val-grade', p.grade || '未填写');
    _setText('val-courses', (p.courses && p.courses.length) ? p.courses.join('、') : '未填写');
    _setText('val-goals', p.goals || '未填写');
    _setText('val-style', p.style || '温和');
    var streak = Storage.Streak.getCurrent();
    _setText('streak-count', streak);
    _setText('sidebar-streak', '连续思考 ' + streak + ' 天');
    var s = Storage.Analytics.getSummary();
    _setText('stat-chats', s.totalChats);
    _setText('stat-cards', s.totalCards);
    _setText('stat-chats2', s.totalChats);
    _setText('stat-cards2', s.totalCards);
    var name = p.nickname || '栖思用户';
    _setText('displayName', name);
    _setText('sidebar-name', name);
    // 简介
    var bio = p.goals ? p.goals : '每天回答一个问题，种一棵只属于你的树';
    _setText('profileBio', bio);

    // 认知成长档案
    _renderCognitiveProfile();
    // 学习统计面板
    _renderStatPanels();
  }

  // ===== 认知成长档案渲染（6维度新版） =====
  var _COG_DIMS = {
    probe:     { icon: '🔍', name: '追问力', color: '#FF6B6B',
      levels: ['接受者','好奇者','质疑者','深挖者','哲学家'],
      descs: ['接受AI给出的解释，很少追问','会问"为什么"，但停留在表面','会挑战前提、追问边界条件','连续追问3层以上，触及本质','追问到认识论层面，质疑知识本身'] },
    connect:   { icon: '🔗', name: '联结力', color: '#FF9F43',
      levels: ['孤岛','搭桥','织网','融合','跃迁'],
      descs: ['每个知识点独立，不关联','偶尔提到"这个和X有点像"','主动寻找知识间的联系','把不同领域的知识整合成新理解','跨学科迁移，产生原创性洞察'] },
    structure: { icon: '🧩', name: '结构力', color: '#54A0FF',
      levels: ['散点','列表','分类','体系','建模'],
      descs: ['表达零散，想到什么说什么','能列举要点，但缺乏层次','能按维度分类，有初步框架','能构建完整的知识框架','能抽象出通用模型或思维范式'] },
    accuracy:  { icon: '🎯', name: '准确力', color: '#1DD1A1',
      levels: ['模糊','近似','精确','严谨','专家'],
      descs: ['概念含混，经常"大概是这个意思"','方向对但细节有误','核心概念准确，偶有小误','术语准确，逻辑自洽','能区分微妙差异，指出常见误解'] },
    focus:     { icon: '🌊', name: '专注力', color: '#5F27CD',
      levels: ['游离','跟随','聚焦','深潜','心流'],
      descs: ['频繁跳转话题，难以深入','能跟着AI引导走，但容易跑偏','围绕主题展开，偶尔发散后能回来','持续深入一个话题5轮以上','高度专注，自然进入深度思考状态'] },
    transfer:  { icon: '💡', name: '迁移力', color: '#F368E0',
      levels: ['就事论事','联想','应用','改造','创造'],
      descs: ['只讨论当前话题，不延伸','偶尔想到相关场景，但不深入','主动提出"这个可以用在哪里"','能把知识适配到不同场景','用已有知识解决全新问题'] },
  };

  var _COG_STYLES = [
    { key: 'structure', icon: '🏗️', name: '结构型思考者', desc: '善于整理框架，把混沌变有序' },
    { key: 'probe',     icon: '🔬', name: '探究型思考者', desc: '追问不停，直到挖到本质' },
    { key: 'connect',   icon: '🌐', name: '联结型思考者', desc: '知识网络编织者，擅长类比' },
    { key: 'accuracy',  icon: '🎯', name: '精确型思考者', desc: '追求准确，不容忍模糊' },
    { key: 'transfer',  icon: '🚀', name: '实践型思考者', desc: '学了就想用，行动力强' },
    { key: 'focus',     icon: '🧘', name: '沉浸型思考者', desc: '深度专注，容易进入心流' },
  ];

  // 模拟认知画像数据
  function _getMockCogProfile() {
    return {
      dimensions: {
        probe:     { level: 3, score: 62 },
        connect:   { level: 2, score: 45 },
        structure: { level: 3, score: 58 },
        accuracy:  { level: 4, score: 78 },
        focus:     { level: 3, score: 55 },
        transfer:  { level: 2, score: 40 },
      }
    };
  }

  function _renderCognitiveProfile() {
    var container = document.getElementById('cogProfileNew');
    if (!container) return;

    var profile = _getMockCogProfile();
    var dims = profile.dimensions;

    // 找最强维度 → 思维风格
    var strongest = 'structure';
    var highestScore = 0;
    Object.keys(dims).forEach(function(k) {
      var composite = dims[k].level * 100 + dims[k].score;
      if (composite > highestScore) { highestScore = composite; strongest = k; }
    });
    var style = _COG_STYLES.find(function(s) { return s.key === strongest; }) || _COG_STYLES[0];

    // 找 top2 strengths 和 bottom2 growth areas
    var sorted = Object.keys(dims).sort(function(a, b) {
      return (dims[b].level * 100 + dims[b].score) - (dims[a].level * 100 + dims[a].score);
    });
    var strengths = sorted.slice(0, 2);
    var growths = sorted.slice(-2);

    // 维度顺序（展示用）
    var dimOrder = ['probe','connect','structure','accuracy','focus','transfer'];

    var html = '<div class="cog-new">';

    // 1. 雷达图
    html += '<div class="cog-radar-wrap">';
    html += _renderRadarSvg(dims, dimOrder);
    html += '</div>';

    // 2. 思维风格卡片
    html += '<div class="cog-style-card">';
    html += '<div class="cog-style-icon">' + style.icon + '</div>';
    html += '<div class="cog-style-name">' + style.name + '</div>';
    html += '<div class="cog-style-desc">' + style.desc + '</div>';
    html += '</div>';

    // 3. 栖思之树的评价
    html += '<div class="cog-tree-eval">';
    html += '<div class="cog-tree-eval-label">🌳 栖思之树的评价</div>';
    html += '<div class="cog-tree-eval-text">' + _generateTreeEval(dims, strongest, sorted) + '</div>';
    html += '</div>';

    // 4. 优势 & 成长区
    html += '<div class="cog-tags-row">';
    html += '<div class="cog-tags-card"><div class="cog-tags-title">💪 优势</div><div class="cog-tags-list">';
    strengths.forEach(function(k) {
      html += '<span class="cog-tag">' + _COG_DIMS[k].icon + ' ' + _COG_DIMS[k].name + '</span>';
    });
    html += '</div></div>';
    html += '<div class="cog-tags-card"><div class="cog-tags-title">🌱 成长区</div><div class="cog-tags-list">';
    growths.forEach(function(k) {
      html += '<span class="cog-tag">' + _COG_DIMS[k].icon + ' ' + _COG_DIMS[k].name + '</span>';
    });
    html += '</div></div>';
    html += '</div>';

    // 4. 维度详情
    html += '<div class="cog-dim-list">';
    dimOrder.forEach(function(k) {
      var d = dims[k];
      var meta = _COG_DIMS[k];
      var levelName = meta.levels[Math.min(d.level - 1, 4)];
      var levelDesc = meta.descs[Math.min(d.level - 1, 4)];
      html += '<div class="cog-dim-card">';
      html += '<div class="cog-dim-top">';
      html += '<div class="cog-dim-left">';
      html += '<span class="cog-dim-icon">' + meta.icon + '</span>';
      html += '<span class="cog-dim-name">' + meta.name + '</span>';
      html += '<span class="cog-dim-level">L' + d.level + ' ' + levelName + '</span>';
      html += '</div>';
      html += '<span class="cog-dim-score">' + d.score + '</span>';
      html += '</div>';
      html += '<div class="cog-dim-bar-wrap"><div class="cog-dim-bar-fill ' + k + '" style="width:' + d.score + '%"></div></div>';
      html += '<div class="cog-dim-desc">' + levelDesc + '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
  }

  // 雷达图 SVG
  function _renderRadarSvg(dims, dimOrder) {
    var cx = 130, cy = 130, R = 100;
    var n = dimOrder.length;
    var angles = dimOrder.map(function(_, i) { return (Math.PI * 2 * i / n) - Math.PI / 2; });

    function polar(angle, r) {
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }

    var svg = '<svg class="cog-radar-svg" width="260" height="260" viewBox="0 0 260 260">';

    // 背景网格（3 层）
    [0.33, 0.66, 1].forEach(function(ratio) {
      var points = angles.map(function(a) {
        var p = polar(a, R * ratio);
        return p.x + ',' + p.y;
      }).join(' ');
      svg += '<polygon points="' + points + '" fill="none" stroke="var(--border)" stroke-width="1" />';
    });

    // 轴线
    angles.forEach(function(a) {
      var p = polar(a, R);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x + '" y2="' + p.y + '" stroke="var(--border)" stroke-width="1" />';
    });

    // 数据多边形
    var dataPoints = dimOrder.map(function(k, i) {
      var d = dims[k];
      var r = (d.score / 100) * R;
      var p = polar(angles[i], r);
      return p.x + ',' + p.y;
    }).join(' ');
    svg += '<polygon points="' + dataPoints + '" fill="rgba(255,180,50,0.15)" stroke="#5CB85C" stroke-width="1.2" />';

    // 数据点圆点
    dimOrder.forEach(function(k, i) {
      var d = dims[k];
      var r = (d.score / 100) * R;
      var p = polar(angles[i], r);
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + _COG_DIMS[k].color + '" stroke="#fff" stroke-width="1.5" />';
    });

    // 标签
    dimOrder.forEach(function(k, i) {
      var meta = _COG_DIMS[k];
      var p = polar(angles[i], R + 18);
      var anchor = 'middle';
      if (p.x < cx - 10) anchor = 'end';
      else if (p.x > cx + 10) anchor = 'start';
      svg += '<text x="' + p.x + '" y="' + p.y + '" text-anchor="' + anchor + '" dominant-baseline="central"';
      svg += ' font-size="12" fill="var(--text-secondary)" font-weight="500">';
      svg += meta.icon + ' ' + meta.name + '</text>';
    });

    svg += '</svg>';
    return svg;
  }

  // 栖思之树的评价（根据维度数据生成温暖鼓励的评语）
  function _generateTreeEval(dims, strongest, sorted) {
    var meta = _COG_DIMS;
    var topKey = sorted[0];
    var secondKey = sorted[1];
    var bottomKey = sorted[sorted.length - 1];
    var top = dims[topKey];
    var bottom = dims[bottomKey];

    // 开头：肯定最强维度
    var openings = [
      '在你最近的思考中，' + meta[topKey].name + '是你最闪亮的一面。',
      '你的' + meta[topKey].name + '正在稳步成长，这很让人欣喜。',
      '看得出来，你在' + meta[topKey].name + '上下了不少功夫。',
    ];
    var opening = openings[Math.floor(top.level % openings.length)];

    // 中间：描述当前状态
    var mid = '';
    if (top.level >= 4) {
      mid = '你已经能像' + meta[topKey].levels[top.level - 1] + '一样思考了，这是很珍贵的能力。';
    } else if (top.level >= 3) {
      mid = '你正在从' + meta[topKey].levels[top.level - 2] + '成长为' + meta[topKey].levels[top.level - 1] + '，每一步都在积累。';
    } else {
      mid = '你正在' + meta[topKey].levels[top.level - 1] + '的阶段，好奇心是最好的老师。';
    }

    // 鼓励成长区
    var grow = '';
    if (bottom.level <= 2) {
      var nextLevel = meta[bottomKey].levels[bottom.level] || meta[bottomKey].levels[bottom.level - 1];
      grow = '如果想让思考更丰富，可以试试在' + meta[bottomKey].name + '上多停留一会儿——哪怕只是多问一个"还能用在哪里"，你就会发现新的风景。';
    } else {
      grow = '你的各个维度都在均衡发展，继续保持这种节奏就好。';
    }

    // 结尾
    var endings = [
      '知识之树的每一片叶子，都记录着你思考的痕迹。🌿',
      '不用着急，慢慢来，每一次对话都是一次生长。🌱',
      '你种下的每一个问题，都会在未来某天长成一棵大树。🌳',
    ];
    var ending = endings[(top.level + bottom.level) % endings.length];

    return opening + ' ' + mid + ' ' + grow + ' ' + ending;
  }

  // ===== 学习统计面板渲染 =====
  var _DOMAIN_COLORS = ['oklch(72% 0.06 25)','oklch(75% 0.05 55)','oklch(68% 0.05 250)','oklch(70% 0.04 155)','oklch(65% 0.06 300)','oklch(72% 0.05 340)','oklch(78% 0.04 85)','oklch(70% 0.04 210)'];
  var _LEVEL_COLORS = ['oklch(78% 0.04 160)','oklch(75% 0.05 15)','oklch(72% 0.05 290)','oklch(76% 0.04 350)','oklch(74% 0.04 230)'];

  function _renderStatPanels() {
    _renderTreeComment();
    _renderDomainBars();
    _renderTrendChart();
    _renderLevelBars();
  }

  // 栖思之树的学习统计评语
  function _renderTreeComment() {
    var container = document.getElementById('statTreeComment');
    if (!container) return;
    var echoes = Storage.Echoes.load();
    var streak = Storage.Streak.getCurrent();
    var total = echoes.length;
    // 统计最近7天新增
    var now = new Date();
    var weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    var recentCount = 0;
    echoes.forEach(function(c) {
      if (c.createdAt && new Date(c.createdAt) >= weekAgo) recentCount++;
    });
    // 统计涉及领域数
    var domainSet = {};
    echoes.forEach(function(c) { domainSet[c.domain || '未分类'] = true; });
    var domainCount = Object.keys(domainSet).length;

    var text = '';
    if (total === 0) {
      text = '你的知识之树还没有长出第一片叶子。去对话页和栖思聊聊吧，每一次思考都是一颗种子 🌱';
    } else if (total < 5) {
      text = '你的知识之树刚刚发芽，已经积累 ' + total + ' 片叶子了。保持好奇心，继续和栖思对话，叶子会越来越多的 🌿';
    } else {
      // 有足够数据，生成具体评语
      var parts = [];
      parts.push('你已经积累了 ' + total + ' 张知识卡片');
      if (domainCount >= 2) parts.push('横跨 ' + domainCount + ' 个领域');
      if (streak >= 3) parts.push('连续思考 ' + streak + ' 天，这份坚持很珍贵');
      if (recentCount >= 3) parts.push('最近一周新增了 ' + recentCount + ' 张卡片，节奏很好');
      else if (recentCount >= 1) parts.push('最近一周有 ' + recentCount + ' 张新卡片，有空可以多和栖思聊聊');
      else parts.push('最近几天没有新卡片，知识之树在等你回来浇水');

      text = parts.join('。') + '。';
      // 鼓励语
      if (streak >= 7) {
        text += ' 你已经连续学习超过一周了，这股韧劲会帮你走得更远 💪';
      } else if (recentCount >= 5) {
        text += ' 最近学习状态很棒，知识网络正在快速扩展 🌳';
      } else if (total >= 15) {
        text += ' 知识之树越长越茂盛了，记得时常回来修剪和回顾 🍃';
      } else {
        text += ' 每天回答一个问题，你的知识之树会慢慢长成一片森林 🌲';
      }
    }
    container.textContent = text;
  }

  // 知识领域分布
  function _renderDomainBars() {
    var container = document.getElementById('statDomainBars');
    if (!container) return;
    var echoes = Storage.Echoes.load();
    if (!echoes.length) { container.innerHTML = '<div style="font-size:13px;color:var(--text-muted)">还没有卡片数据 🌱</div>'; return; }
    var counts = {};
    echoes.forEach(function(c) { var d = c.domain || '未分类'; counts[d] = (counts[d]||0) + 1; });
    var sorted = Object.keys(counts).sort(function(a,b) { return counts[b] - counts[a]; });
    var max = counts[sorted[0]] || 1;
    var html = '';
    sorted.forEach(function(d, i) {
      var pct = Math.round(counts[d] / max * 100);
      var color = _DOMAIN_COLORS[i % _DOMAIN_COLORS.length];
      html += '<div class="domain-bar-row">';
      html += '<span class="domain-bar-name" title="' + _esc(d) + '">' + _esc(d) + '</span>';
      html += '<div class="domain-bar-track"><div class="domain-bar-fill" style="width:' + pct + '%;background:' + color + '">' + counts[d] + '</div></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  // 近7天新增卡片
  function _renderTrendChart() {
    var container = document.getElementById('statTrend');
    if (!container) return;
    var echoes = Storage.Echoes.load();
    var today = new Date();
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today); d.setDate(d.getDate() - i);
      days.push({ date: d, label: ['日','一','二','三','四','五','六'][d.getDay()], count: 0 });
    }
    echoes.forEach(function(c) {
      if (!c.createdAt) return;
      var cd = new Date(c.createdAt);
      var cs = cd.toISOString().split('T')[0];
      days.forEach(function(day) {
        if (day.date.toISOString().split('T')[0] === cs) day.count++;
      });
    });
    var max = 1;
    days.forEach(function(d) { if (d.count > max) max = d.count; });
    var html = '<div class="trend-chart">';
    days.forEach(function(d) {
      var h = max > 0 ? Math.round(d.count / max * 80) : 0;
      var cls = 'trend-bar' + (d.count === 0 ? ' zero' : '');
      html += '<div class="trend-bar-wrap">';
      html += '<span class="trend-count">' + (d.count || '') + '</span>';
      html += '<div class="' + cls + '" style="height:' + Math.max(h, 2) + 'px"></div>';
      html += '<span class="trend-day">周' + d.label + '</span>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // 认知等级分布
  function _renderLevelBars() {
    var container = document.getElementById('statLevelBars');
    if (!container) return;
    var echoes = Storage.Echoes.load();
    if (!echoes.length) { container.innerHTML = '<div style="font-size:13px;color:var(--text-muted)">还没有卡片数据 🌱</div>'; return; }
    var dist = {1:0, 2:0, 3:0, 4:0, 5:0};
    echoes.forEach(function(c) { var lv = Math.min(5, Math.max(1, c.level || 1)); dist[lv]++; });
    var total = echoes.length;
    var html = '<div class="level-stack-wrap">';
    html += '<div class="level-stack-bar">';
    for (var lv = 1; lv <= 5; lv++) {
      if (dist[lv] === 0) continue;
      var pct = Math.round(dist[lv] / total * 100);
      html += '<div class="level-segment" style="width:' + pct + '%;background:' + _LEVEL_COLORS[lv-1] + '">' + (pct >= 8 ? dist[lv] : '') + '</div>';
    }
    html += '</div>';
    html += '<div class="level-legend">';
    var levelNames = ['','L1 初始','L2 理解','L3 分析','L4 综合','L5 评价'];
    for (var lv = 1; lv <= 5; lv++) {
      html += '<span class="level-legend-item"><span class="level-legend-dot" style="background:' + _LEVEL_COLORS[lv-1] + '"></span>' + levelNames[lv] + ' ' + dist[lv] + '张</span>';
    }
    html += '</div>';
    html += '</div>';
    container.innerHTML = html;
  }

  // ===== 森林页 =====
  function _updateForestPage() {
    _renderForestKnowledge();
    _renderForestRecommend();
  }

  function _renderForestKnowledge() {
    var container = document.getElementById('forestKnowledge');
    if (!container) return;
    container.innerHTML = '';

    KNOWLEDGE_BASE.forEach(function(domain, dIdx) {
      var domainEl = document.createElement('div');
      domainEl.className = 'forest-domain' + (dIdx === 0 ? ' expanded' : '');

      var header = document.createElement('div');
      header.className = 'forest-domain-header';
      header.innerHTML =
        '<span class="forest-domain-icon">' + domain.icon + '</span>' +
        '<span class="forest-domain-name">' + _esc(domain.domain) + '</span>' +
        '<span class="forest-domain-count">' + domain.items.length + ' 个知识点</span>' +
        '<span class="forest-domain-arrow">›</span>';
      header.addEventListener('click', function() {
        domainEl.classList.toggle('expanded');
      });
      domainEl.appendChild(header);

      var itemsEl = document.createElement('div');
      itemsEl.className = 'forest-domain-items';
      domain.items.forEach(function(item, iIdx) {
        var itemEl = document.createElement('div');
        itemEl.className = 'forest-item';
        itemEl.innerHTML =
          '<div class="forest-item-top">' +
            '<span class="forest-item-title">' + _esc(item.title) + '</span>' +
            '<span class="forest-item-level">L' + item.level + '</span>' +
          '</div>' +
          '<div class="forest-item-summary">' + _esc(item.summary) + '</div>';
        itemEl.addEventListener('click', function() {
          _showForestDetail(domain.domain, domain.icon, item);
        });
        itemsEl.appendChild(itemEl);
      });
      domainEl.appendChild(itemsEl);

      container.appendChild(domainEl);
    });
  }

  async function _renderForestRecommend() {
    var container = document.getElementById('forestRecommend');
    if (!container) return;

    // 先显示缓存（如果有）
    var cached = Storage.ForestRecommend.getRecommendations();
    if (cached.length > 0) {
      _paintForestRecommend(cached, container);
    } else {
      container.innerHTML = '<div class="forest-recommend-loading">正在为你规划学习方向...</div>';
    }

    // 如果缓存有效，不请求API
    if (Storage.ForestRecommend.isFresh()) return;

    // 调用推荐API
    var recs = await Recommend.getForestRecommendations(false);
    if (recs.length > 0) {
      _paintForestRecommend(recs, container);
    } else {
      var echoes = Storage.Echoes.load();
      if (echoes.length < 3) {
        container.innerHTML = '<div class="forest-recommend-loading">多和我聊几轮，我就能为你定制学习方向了 🌱</div>';
      } else if (cached.length === 0) {
        container.innerHTML = '<div class="forest-recommend-loading">暂时没有推荐，继续保持学习 🌿</div>';
      }
    }
  }

  function _paintForestRecommend(recs, container) {
    container.innerHTML = '';
    var typeIcons = { '补缺': '🌱', '深入': '🔍', '拓展': '🌈' };

    recs.forEach(function(rec) {
      var card = document.createElement('div');
      card.className = 'forest-rec-card';
      card.innerHTML =
        '<div class="forest-rec-header">' +
          '<span class="forest-rec-type forest-rec-type-' + _esc(rec.type || '') + '">' + _esc(rec.type || '') + '</span>' +
          '<span class="forest-rec-title">' + _esc(rec.title || '') + '</span>' +
        '</div>' +
        '<div class="forest-rec-reason">' + _esc(rec.reason || '') + '</div>' +
        (rec.action ? '<div class="forest-rec-action">📌 ' + _esc(rec.action) + '</div>' : '') +
        '<button class="forest-rec-btn" data-topic="' + _esc(rec.title || '') + '">开始探索 →</button>';
      container.appendChild(card);
    });

    // 绑定"开始探索"按钮
    container.querySelectorAll('.forest-rec-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var topic = this.dataset.topic;
        switchTab('growth');
        // 在输入框预填话题并自动发送
        setTimeout(function() {
          var input = document.getElementById('inputField');
          if (input) {
            input.value = '我想深入了解：' + topic;
            // 触发发送
            if (typeof Chat !== 'undefined' && Chat.sendMessage) {
              Chat.sendMessage();
            }
          }
        }, 300);
      });
    });
  }

  function refreshForestRecommend() {
    var container = document.getElementById('forestRecommend');
    if (container) container.innerHTML = '<div class="forest-recommend-loading">正在为你规划学习方向...</div>';
    Storage.ForestRecommend.clear();
    _renderForestRecommend();
  }

  function _showForestDetail(domain, icon, item) {
    var overlay = document.getElementById('forestDetailOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'forestDetailOverlay';
      overlay.className = 'forest-detail-overlay';
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) _closeForestDetail();
      });
      document.body.appendChild(overlay);
    }

    var pointsHTML = '';
    if (item.keyPoints && item.keyPoints.length) {
      pointsHTML = '<ul class="forest-detail-points">';
      item.keyPoints.forEach(function(p) { pointsHTML += '<li>' + _esc(p) + '</li>'; });
      pointsHTML += '</ul>';
    }

    var resourcesHTML = '';
    if (item.resources && item.resources.length) {
      resourcesHTML = '<ul class="forest-detail-points">';
      item.resources.forEach(function(r) { resourcesHTML += '<li>' + _esc(r) + '</li>'; });
      resourcesHTML += '</ul>';
    }

    overlay.innerHTML =
      '<div class="forest-detail">' +
        '<div class="forest-detail-title">' + icon + ' ' + _esc(item.title) + '</div>' +
        '<div class="fforest-detail-meta">' + _esc(domain) + ' · L' + item.level + '</div>' +
        '<div class="forest-detail-section">' +
          '<div class="forest-detail-section-title">💡 核心理解</div>' +
          '<div class="forest-detail-text">' + _esc(item.summary) + '</div>' +
        '</div>' +
        (pointsHTML ? '<div class="forest-detail-section"><div class="forest-detail-section-title">📌 关键要点</div>' + pointsHTML + '</div>' : '') +
        (resourcesHTML ? '<div class="forest-detail-section"><div class="forest-detail-section-title">📖 学习资源</div>' + resourcesHTML + '</div>' : '') +
        '<div class="forest-detail-close">' +
          '<button class="forest-detail-close-btn" onclick="App.closeForestDetail()">关闭</button>' +
        '</div>' +
      '</div>';

    requestAnimationFrame(function() { overlay.classList.add('visible'); });
  }

  function _closeForestDetail() {
    var overlay = document.getElementById('forestDetailOverlay');
    if (overlay) overlay.classList.remove('visible');
  }

  function _updateTreePage() {
    var echoes = Storage.Echoes.load();
    var streak = Storage.Streak.getCurrent();
    _renderGraph(echoes);
    _renderTreeLeaves(echoes);
    _setText('tree-streak', streak);
    _setText('narrativeText', _getNarrative(streak, echoes.length));
  }

  function _getNarrative(streak, n) {
    if (n === 0) return '你的种子刚刚种下 🌱';
    if (streak === 0) return '树在安静等你，不急 🌳';
    if (streak === 1) return '今天你的树多了一片叶子 🍃';
    if (streak <= 3) return '连续' + streak + '天了 🌿';
    if (streak <= 7) return streak + '天生长轮回 🌳';
    return '你的树比上周茂密了不少 🌲';
  }

  function _renderTreeLeaves(echoes) {
    var c = document.getElementById('treeLeaves');
    if (!c) return;
    c.innerHTML = '';
    var colors = { 1:'#F5E6CC', 2:'#E8D5A8', 3:'#F0B27A', 4:'#E88D4F', 5:'#D4735E' };
    echoes.forEach(function(card) {
      var leaf = document.createElement('div');
      leaf.className = 'tree-leaf';
      leaf.style.left = (10 + Math.random() * 80) + '%';
      leaf.style.top = (10 + Math.random() * 80) + '%';
      leaf.style.background = colors[card.level] || colors[1];
      leaf.title = (card.topic || card.domain || '') + ' · L' + (card.level || 1);
      leaf.onclick = function() { openCardDetail(card); };
      c.appendChild(leaf);
    });
  }

  // ===== D3 知识图谱（树形布局）=====
  function _renderGraph(echoes) {
    var container = document.getElementById('graphContainer');
    if (!container) return;
    var svg = d3.select('#graphSvg');
    svg.selectAll('*').remove();

    if (!echoes.length) {
      _setText('tree-node-count', 0);
      _setText('tree-edge-count', 0);
      _setText('tree-domain-count', 0);
      return;
    }

    var width = container.clientWidth;
    var height = container.clientHeight;

    // 按领域分组
    var domainGroups = {};
    echoes.forEach(function(card) {
      var d = card.domain || '未分类';
      if (!domainGroups[d]) domainGroups[d] = [];
      domainGroups[d].push(card);
    });
    var domainNames = Object.keys(domainGroups);

    // 构建节点：根节点 + 领域节点 + 卡片节点
    var nodes = [];
    var edges = [];

    // 根节点
    nodes.push({ id: 'root', label: '知识之树', domain: '', level: 0, insight: '你的全部知识', radius: 30, isRoot: true });

    // 领域节点
    var domainColors = { '深度学习':'#54A0FF', '机器学习':'#1DD1A1', 'AIPM':'#FF9F43', 'AI工程':'#5F27CD', '数学基础':'#FF6B6B' };
    domainNames.forEach(function(d) {
      var domainId = 'domain_' + d;
      nodes.push({ id: domainId, label: d, domain: d, level: 0, insight: d + '领域', radius: 22, isDomain: true, color: domainColors[d] || '#999' });
      edges.push({ source: 'root', target: domainId, type: 'component', color: domainColors[d] || '#999' });
    });

    // 卡片节点
    echoes.forEach(function(card) {
      var domainId = 'domain_' + (card.domain || '未分类');
      nodes.push({
        id: card.id,
        label: (card.topic || '').substring(0, 6),
        domain: card.domain || '未分类',
        level: card.level || 1,
        insight: card.insight || '',
        radius: 14 + (card.level || 1) * 2,
      });
      edges.push({ source: domainId, target: card.id, type: 'deepen', color: domainColors[card.domain] || '#999' });
    });

    // 同领域卡片间加关联边
    var edgeColors = { 'prerequisite':'#FF6B6B', 'deepen':'#FF9F43', 'associate':'#54A0FF', 'contrast':'#5F27CD', 'component':'#1DD1A1' };
    var edgeTypes = ['prerequisite', 'deepen', 'associate', 'contrast', 'component'];
    for (var i = 0; i < echoes.length; i++) {
      for (var j = i + 1; j < echoes.length; j++) {
        if (echoes[i].domain === echoes[j].domain && Math.random() > 0.5) {
          var type = edgeTypes[Math.floor(Math.random() * edgeTypes.length)];
          edges.push({ source: echoes[i].id, target: echoes[j].id, type: type, color: edgeColors[type] });
        }
      }
    }

    // 更新统计
    _setText('tree-node-count', echoes.length);
    _setText('tree-edge-count', edges.length);
    _setText('tree-domain-count', domainNames.length);

    // 力导向图（树形布局）
    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(function(d) { return d.id; }).distance(function(d) {
        if (d.source.id === 'root') return 140;
        if (d.source.isDomain) return 80;
        return 100;
      }))
      .force('charge', d3.forceManyBody().strength(function(d) {
        if (d.isRoot) return -800;
        if (d.isDomain) return -400;
        return -200;
      }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('radial', d3.forceRadial(function(d) {
        if (d.isRoot) return 0;
        if (d.isDomain) return 120;
        return 220;
      }, width / 2, height / 2).strength(0.8))
      .force('collision', d3.forceCollide().radius(function(d) { return d.radius + 8; }));

    // 绘制边（曲线）
    var link = svg.append('g')
      .selectAll('path')
      .data(edges)
      .enter().append('path')
      .attr('class', 'graph-edge')
      .attr('stroke', function(d) { return d.color; })
      .attr('stroke-opacity', function(d) { return d.source === 'root' || (d.source && d.source.isDomain) ? 0.8 : 0.4; })
      .attr('stroke-width', function(d) { return d.source === 'root' || (d.source && d.source.isDomain) ? 2.5 : 1.5; });

    // 绘制节点
    var levelColors = { 1:'#F5E6CC', 2:'#E8D5A8', 3:'#F0B27A', 4:'#E88D4F', 5:'#D4735E' };

    var node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'graph-node')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

    // 节点圆
    node.append('circle')
      .attr('r', function(d) { return d.radius; })
      .attr('fill', function(d) {
        if (d.isRoot) return '#1DD1A1';
        if (d.isDomain) return d.color || '#999';
        return levelColors[d.level] || levelColors[1];
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // 节点文字
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', function(d) { return d.isRoot ? '12px' : (d.isDomain ? '11px' : '10px'); })
      .attr('font-weight', function(d) { return (d.isRoot || d.isDomain) ? '600' : '500'; })
      .attr('fill', function(d) { return d.isRoot || d.isDomain ? '#fff' : 'var(--text-primary)'; })
      .text(function(d) { return d.label; });

    // 悬停提示
    var tooltip = document.getElementById('graphTooltip');
    node.on('mouseover', function(event, d) {
      if (d.isRoot || d.isDomain) return;
      tooltip.innerHTML =
        '<div class="graph-tooltip-domain">' + d.domain + ' · L' + d.level + '</div>' +
        '<div>' + (d.insight || '').substring(0, 60) + '...</div>';
      tooltip.classList.add('visible');
    })
    .on('mousemove', function(event) {
      tooltip.style.left = (event.offsetX + 15) + 'px';
      tooltip.style.top = (event.offsetY - 10) + 'px';
    })
    .on('mouseout', function() { tooltip.classList.remove('visible'); })
    .on('click', function(event, d) {
      if (d.isRoot || d.isDomain) return;
      var card = echoes.find(function(c) { return c.id === d.id; });
      if (card) openCardDetail(card);
    });

    // 力更新
    simulation.on('tick', function() {
      link.attr('d', function(d) {
        var dx = d.target.x - d.source.x;
        var dy = d.target.y - d.source.y;
        var dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
      });
      node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  }

  function _showToast(msg) {
    var toast = document.getElementById('qisiToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'qisiToast';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--text-primary);color:var(--bg);padding:10px 24px;border-radius:9999px;font-size:14px;z-index:200;opacity:0;transition:opacity 0.3s;pointer-events:none;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(function() { toast.style.opacity = '0'; }, 2500);
  }

  // 评价叙事文案Toast（带边框样式，区别于普通Toast）
  function _showEvalToast(narrative) {
    var toast = document.getElementById('evalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'evalToast';
      toast.className = 'eval-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = narrative;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 4000);
  }

  // ===== 筛选状态 =====
  var _filterDomain = 'all';
  var _filterLevel = 'all';
  var _filterTime = 'all';
  var _domainDeleteMode = false;
  var _pendingDeleteDomain = null;

  function _updateEchoPage() {
    var echoes = Storage.Echoes.load();
    // 生成领域筛选chips
    _buildDomainChips(echoes);
    // 绑定筛选事件
    _bindFilterEvents();
    // 渲染卡片
    _renderFilteredCards(echoes);
  }

  function _buildDomainChips(echoes) {
    var container = document.getElementById('domainChips');
    if (!container) return;
    // 收集所有领域
    var domains = {};
    echoes.forEach(function(c) {
      var d = c.domain || '未分类';
      domains[d] = (domains[d] || 0) + 1;
    });
    // 合并自定义领域（即使没有卡片也显示）
    var customList = Storage.CustomDomains.load();
    customList.forEach(function(d) {
      if (!domains[d]) domains[d] = 0;
    });
    container.innerHTML = '';
    if (_domainDeleteMode) container.parentElement.classList.add('domain-delete-mode');
    else container.parentElement.classList.remove('domain-delete-mode');
    // "全部"按钮
    var allBtn = document.createElement('button');
    allBtn.className = 'filter-chip' + (_filterDomain === 'all' ? ' active' : '');
    allBtn.dataset.domain = 'all';
    allBtn.textContent = '全部';
    container.appendChild(allBtn);
    // 各领域按钮
    Object.keys(domains).sort().forEach(function(d) {
      var isCustom = customList.indexOf(d) >= 0;
      var wrap = document.createElement('span');
      wrap.className = 'domain-chip-wrap';
      var btn = document.createElement('button');
      btn.className = 'filter-chip' + (_filterDomain === d ? ' active' : '') + (isCustom ? ' domain-chip-custom' : '');
      btn.dataset.domain = d;
      btn.textContent = d + (domains[d] > 0 ? ' (' + domains[d] + ')' : '');
      wrap.appendChild(btn);
      // 删除模式：所有领域显示 ×（"未分类"除外）
      if (_domainDeleteMode && d !== '未分类') {
        var del = document.createElement('span');
        del.className = 'domain-delete-x';
        del.textContent = '×';
        del.title = '删除「' + d + '」领域';
        del.onclick = function(e) {
          e.stopPropagation();
          _pendingDeleteDomain = d;
          document.getElementById('confirmDomainName').textContent = d;
          document.getElementById('confirmOverlay').classList.add('active');
        };
        wrap.appendChild(del);
      } else if (isCustom && !_domainDeleteMode) {
        // 非删除模式下自定义领域显示 ×
        var del2 = document.createElement('span');
        del2.className = 'domain-chip-delete';
        del2.textContent = '×';
        del2.title = '删除自定义领域';
        del2.onclick = function(e) {
          e.stopPropagation();
          Storage.CustomDomains.remove(d);
          if (_filterDomain === d) _filterDomain = 'all';
          _updateEchoPage();
        };
        wrap.appendChild(del2);
      }
      container.appendChild(wrap);
    });
  }

  function _bindFilterEvents() {
    // 领域筛选
    document.querySelectorAll('#domainChips .filter-chip').forEach(function(chip) {
      chip.onclick = function() {
        _filterDomain = this.dataset.domain;
        _updateEchoPage();
      };
    });
    // 深度筛选
    document.querySelectorAll('#levelChips .filter-chip').forEach(function(chip) {
      chip.onclick = function() {
        _filterLevel = this.dataset.level;
        document.querySelectorAll('#levelChips .filter-chip').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        _renderFilteredCards(Storage.Echoes.load());
      };
    });
    // 时间筛选
    document.querySelectorAll('#timeChips .filter-chip').forEach(function(chip) {
      chip.onclick = function() {
        _filterTime = this.dataset.time;
        document.querySelectorAll('#timeChips .filter-chip').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        _renderFilteredCards(Storage.Echoes.load());
      };
    });
  }

  function _renderFilteredCards(echoes) {
    var grid = document.getElementById('cardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // 筛选
    var filtered = echoes.filter(function(card) {
      if (_filterDomain !== 'all' && (card.domain || '未分类') !== _filterDomain) return false;
      if (_filterLevel !== 'all' && String(card.level || 1) !== _filterLevel) return false;
      if (_filterTime !== 'all') {
        var days = parseInt(_filterTime);
        var cardDate = new Date(card.createdAt);
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (cardDate < cutoff) return false;
      }
      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-cards">没有匹配的卡片 🍂</div>';
      return;
    }

    filtered.slice().reverse().forEach(function(card) {
      var el = document.createElement('div');
      el.className = 'echo-card level-' + (card.level || 1);
      if (_isEchoDeleteMode) el.classList.add('selectable');
      el.style.cursor = 'pointer';
      el.dataset.cardId = card.id;
      var dateStr = card.createdAt ? new Date(card.createdAt).toLocaleDateString('zh-CN') : '';
      el.innerHTML =
        '<div class="card-header"><span class="card-domain">' + _esc(card.domain||'未分类') + '</span><span class="card-level">L'+(card.level||1)+'</span></div>' +
        '<div class="card-insight">' + _esc(card.insight||'') + '</div>' +
        '<div class="card-action">📌 ' + _esc(card.action||'') + '</div>' +
        '<div class="card-date">' + dateStr + '</div>';
      el.addEventListener('click', function() {
        if (_isEchoDeleteMode) {
          // 多选模式：切换选中状态
          el.classList.toggle('selected');
          _updateEchoDeleteCount();
        } else {
          openCardDetail(card);
        }
      });
      grid.appendChild(el);
    });
  }

  // ===== 卡片详情 =====
  var _currentCardId = null; // 当前打开的卡片ID，用于笔记功能

  function openCardDetail(card) {
    console.log('[CardDetail] 打开卡片:', card);
    _currentCardId = card.id;
    try {
    // 记录来源Tab，用于返回
    _previousTab = currentTab;
    // 切换到详情页（不更新currentTab，避免干扰返回逻辑）
    document.querySelectorAll('.page-section').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('page-detail').classList.add('active');

    // 填充数据
    _setText('detailDomain', card.domain || '未分类');
    _setText('detailLevel', 'L' + (card.level || 1));
    _setText('detailDate', card.createdAt ? new Date(card.createdAt).toLocaleDateString('zh-CN') : '');
    _setText('detailTopic', card.topic || card.domain || '—');

    // 思考路径：生成模拟时间线
    var timeline = document.getElementById('detailTimeline');
    if (timeline) {
      var steps = _generateTimeline(card);
      console.log('[CardDetail] 时间线数据:', steps);
      timeline.innerHTML = '';
      if (steps && steps.length) {
        steps.forEach(function(step) {
          if (!step || !step.role) return;
          var node = document.createElement('div');
          node.className = 'timeline-node';
          node.innerHTML =
            '<div class="timeline-dot ' + (step.role === 'user' ? 'user-dot' : 'ai-dot') + '">' +
              (step.role === 'user' ? '我' : 'AI') +
            '</div>' +
            '<div>' +
              '<div class="timeline-role">' + (step.role === 'user' ? '我' : '栖思') + '</div>' +
            '<div class="timeline-content">' + _esc(step.text) + '</div>' +
          '</div>';
        timeline.appendChild(node);
        });
      }
    }

    // 我的顿悟
    _loadInsight(card);

    // 我的笔记
    _loadCardNote(card.id);

    // 知识锚点
    var anchors = document.getElementById('detailAnchors');
    if (anchors) {
      anchors.innerHTML = '';
      var anchorList = _generateAnchors(card);
      anchorList.forEach(function(a) {
        var tag = document.createElement('span');
        tag.className = 'anchor-tag';
        tag.textContent = a;
        anchors.appendChild(tag);
      });
    }

    // 盲区
    _setText('detailBlindspot', card.blindSpot || card.blindspot || '—');

    // 卡片类型
    var typeMap = { 1:'📖 知识型 Concept', 2:'📖 知识型 Concept', 3:'🧠 思考型 Socratic', 4:'🧠 思考型 Socratic', 5:'🎯 实践型 Practice' };
    var typeLabel = document.querySelector('#detailType .type-label');
    var typeIcon = document.querySelector('#detailType .type-icon');
    if (typeLabel) typeLabel.textContent = typeMap[card.level || 3] || '🧠 思考型 Socratic';
    if (typeIcon) typeIcon.textContent = (card.level <= 2) ? '📖' : ((card.level >= 5) ? '🎯' : '🧠');

    // 知识坐标
    _setText('detailDomainPath', card.domain || '未分类');

    // 掌握度
    var stars = document.getElementById('detailStars');
    if (stars) {
      stars.innerHTML = '';
      for (var i = 1; i <= 5; i++) {
        var star = document.createElement('span');
        star.className = 'star' + (i <= (card.level || 1) ? ' filled' : '');
        star.textContent = '★';
        star.addEventListener('click', (function(level) {
          return function() {
            card.level = level;
            // 更新星星显示
            document.querySelectorAll('#detailStars .star').forEach(function(s, idx) {
              s.classList.toggle('filled', idx < level);
            });
            // 更新存储
            var echoes = Storage.Echoes.load();
            var idx = echoes.findIndex(function(c) { return c.id === card.id; });
            if (idx >= 0) { echoes[idx].level = level; Storage.Echoes.save(echoes); }
          };
        })(i));
        stars.appendChild(star);
      }
    }

    // 实践任务
    _setText('detailAction', card.action || '—');

    // 关联卡片
    var related = document.getElementById('detailRelated');
    if (related) {
      var echoes = Storage.Echoes.load();
      var sameDomain = echoes.filter(function(c) { return c.id !== card.id && c.domain === card.domain; }).slice(0, 3);
      if (sameDomain.length) {
        related.innerHTML = '';
        sameDomain.forEach(function(rc) {
          var mini = document.createElement('div');
          mini.className = 'related-card-mini';
          mini.textContent = (rc.topic || rc.insight || '').substring(0, 30) + '...';
          mini.addEventListener('click', function() { openCardDetail(rc); });
          related.appendChild(mini);
        });
      } else {
        related.innerHTML = '<div class="related-empty">暂无同领域卡片</div>';
      }
    }
    } catch (err) {
      console.error('[CardDetail] 渲染出错:', err);
    }
  }

  function closeCardDetail() {
    // 恢复到打开详情前的页面（修复返回bug）
    var backTo = _previousTab || 'echo';
    // 强制重置currentTab，确保switchTab不会因same-tab提前返回
    currentTab = '';
    _currentCardId = null;
    switchTab(backTo);
  }

  // ===== 我的笔记 =====
  function _loadCardNote(cardId) {
    var note = Storage.CardNotes.get(cardId);
    var display = document.getElementById('noteDisplay');
    var editing = document.getElementById('noteEditing');
    var noteText = document.getElementById('noteText');
    if (!display || !editing || !noteText) return;

    if (note) {
      noteText.textContent = note;
      noteText.classList.remove('note-empty');
    } else {
      noteText.textContent = '点击「编辑」记录你的思考…';
      noteText.classList.add('note-empty');
    }
    display.style.display = '';
    editing.style.display = 'none';
  }

  function editCardNote() {
    var display = document.getElementById('noteDisplay');
    var editing = document.getElementById('noteEditing');
    var textarea = document.getElementById('noteTextarea');
    if (!display || !editing || !textarea) return;

    var current = Storage.CardNotes.get(_currentCardId);
    textarea.value = current || '';
    display.style.display = 'none';
    editing.style.display = '';
    setTimeout(function() { textarea.focus(); }, 50);
  }

  function saveCardNote() {
    var textarea = document.getElementById('noteTextarea');
    if (!textarea || !_currentCardId) return;
    Storage.CardNotes.save(_currentCardId, textarea.value);
    _loadCardNote(_currentCardId);
    _showToast('笔记已保存');
  }

  function cancelCardNote() {
    _loadCardNote(_currentCardId);
  }

  // ===== 我的顿悟（可编辑） =====
  var _currentCard = null; // 保存当前卡片完整引用，用于恢复原文

  function _loadInsight(card) {
    _currentCard = card;
    var userEdited = Storage.CardNotes.get('insight:' + card.id);
    var text = userEdited || card.insight || '—';

    var display = document.getElementById('insightDisplay');
    var editing = document.getElementById('insightEditing');
    var insightText = document.getElementById('insightText');
    if (!display || !editing || !insightText) return;

    insightText.textContent = text;
    display.style.display = '';
    editing.style.display = 'none';
  }

  function editInsight() {
    var display = document.getElementById('insightDisplay');
    var editing = document.getElementById('insightEditing');
    var textarea = document.getElementById('insightTextarea');
    var resetBtn = document.getElementById('insightResetBtn');
    if (!display || !editing || !textarea) return;

    var userEdited = Storage.CardNotes.get('insight:' + _currentCardId);
    textarea.value = userEdited || (_currentCard ? _currentCard.insight : '') || '';
    // 只有用户改过原文才显示"恢复原文"按钮
    if (resetBtn) resetBtn.style.display = userEdited ? '' : 'none';
    display.style.display = 'none';
    editing.style.display = '';
    setTimeout(function() { textarea.focus(); }, 50);
  }

  function saveInsight() {
    var textarea = document.getElementById('insightTextarea');
    if (!textarea || !_currentCardId) return;
    Storage.CardNotes.save('insight:' + _currentCardId, textarea.value);
    _loadInsight(_currentCard);
    _showToast('顿悟已更新');
  }

  function cancelInsight() {
    _loadInsight(_currentCard);
  }

  function resetInsight() {
    if (!_currentCardId) return;
    Storage.CardNotes.remove('insight:' + _currentCardId);
    _loadInsight(_currentCard);
    _showToast('已恢复AI原始内容');
  }

  // 生成思考路径时间线
  function _generateTimeline(card) {
    var topic = card.topic || '这个概念';
    return [
      { role: 'user', text: '我今天学了' + topic + '...' },
      { role: 'ai', text: '你是怎么理解' + topic + '的？能用自己的话说说吗？' },
      { role: 'user', text: '我觉得它应该是...' },
      { role: 'ai', text: '不错！那你能想到它和什么有关系吗？' },
      { role: 'user', text: '（思考后回答）' },
      { role: 'ai', text: '很好，你已经抓住核心了。' },
    ];
  }

  // 生成知识锚点
  function _generateAnchors(card) {
    var domainAnchors = {
      '深度学习': ['反向传播', '梯度消失', '激活函数'],
      '机器学习': ['损失函数', '正则化', '交叉验证'],
      'AIPM': ['用户画像', '需求分析', 'PRD'],
      '概率论': ['条件概率', '贝叶斯', '期望'],
      'AI工程': ['向量数据库', 'Embedding', 'Prompt'],
    };
    return domainAnchors[card.domain] || ['基础概念', '核心原理'];
  }

  // 右侧面板：最新卡片（从RecentCards读取，独立于回响页）
  var _isDeleteMode = false;

  function _updateRightPanel() {
    var cards = Storage.RecentCards.load();
    var panel = document.getElementById('rightPanelCards');
    if (!panel) return;
    panel.innerHTML = '';

    _isDeleteMode = false;

    if (!cards.length) {
      panel.innerHTML = '<div class="right-panel-empty">对话结束后<br>知识卡片会出现在这里 ✨</div>';
    } else {
      cards.slice().reverse().forEach(function(card) {
        var el = document.createElement('div');
        el.className = 'mini-card';
        el.innerHTML =
          '<div class="mini-card-domain">' + _esc(card.domain||'未分类') + ' · L'+(card.level||1)+'</div>' +
          '<div class="mini-card-insight">' + _esc(card.insight||'') + '</div>';
        panel.appendChild(el);
      });
    }

    _renderRightPanelEvaluation(panel);
  }

  // 进入删除选择模式
  function _enterDeleteMode() {
    var cards = Storage.RecentCards.load();
    if (!cards.length) { _showToast('没有可删除的卡片'); return; }

    _isDeleteMode = true;
    var panel = document.getElementById('rightPanelCards');
    if (!panel) return;
    panel.innerHTML = '';

    // 全选行
    var selectAll = document.createElement('label');
    selectAll.className = 'mini-card-select-all';
    selectAll.innerHTML = '<input type="checkbox" id="selectAllCards"> 全选';
    panel.appendChild(selectAll);

    // 卡片列表（带复选框）
    cards.slice().reverse().forEach(function(card) {
      var el = document.createElement('label');
      el.className = 'mini-card mini-card-selectable';
      el.innerHTML =
        '<input type="checkbox" class="card-checkbox" data-id="' + card.id + '">' +
        '<div>' +
          '<div class="mini-card-domain">' + _esc(card.domain||'未分类') + ' · L'+(card.level||1)+'</div>' +
          '<div class="mini-card-insight">' + _esc(card.insight||'') + '</div>' +
        '</div>';
      panel.appendChild(el);
    });

    // 全选逻辑
    var selectAllInput = document.getElementById('selectAllCards');
    selectAllInput.addEventListener('change', function() {
      panel.querySelectorAll('.card-checkbox').forEach(function(cb) {
        cb.checked = selectAllInput.checked;
      });
    });

    // 操作按钮
    var actions = document.createElement('div');
    actions.className = 'mini-card-delete-actions';
    actions.innerHTML =
      '<button class="mini-card-del-btn mini-card-del-confirm" onclick="App.confirmDeleteSelected()">删除选中</button>' +
      '<button class="mini-card-del-btn mini-card-del-cancel" onclick="App.cancelDeleteMode()">取消</button>';
    panel.appendChild(actions);
  }

  // 确认删除选中卡片
  function confirmDeleteSelected() {
    var checkboxes = document.querySelectorAll('.card-checkbox:checked');
    if (!checkboxes.length) { _showToast('请先选择要删除的卡片'); return; }

    var ids = [];
    checkboxes.forEach(function(cb) { ids.push(cb.dataset.id); });

    Storage.RecentCards.removeByIds(ids);
    _showToast('已删除 ' + ids.length + ' 张卡片');
    _updateRightPanel();
  }

  // 取消删除模式
  function cancelDeleteMode() {
    _updateRightPanel();
  }

  // ===== 回响页：多选删除模式 =====
  var _isEchoDeleteMode = false;

  function enterEchoDeleteMode() {
    var echoes = Storage.Echoes.load();
    if (!echoes.length) { _showToast('没有可删除的卡片'); return; }

    _isEchoDeleteMode = true;
    var grid = document.getElementById('cardsGrid');
    if (!grid) return;

    // 给每个卡片添加 selectable 样式
    grid.querySelectorAll('.echo-card').forEach(function(el) {
      el.classList.add('selectable');
    });

    // 显示底部操作栏
    var bar = document.getElementById('echoDeleteBar');
    if (bar) bar.classList.add('active');
    _updateEchoDeleteCount();

    // 全选逻辑
    var selectAll = document.getElementById('echoSelectAll');
    if (selectAll) {
      selectAll.checked = false;
      selectAll.onchange = function() {
        grid.querySelectorAll('.echo-card.selectable').forEach(function(el) {
          if (selectAll.checked) {
            el.classList.add('selected');
          } else {
            el.classList.remove('selected');
          }
        });
        _updateEchoDeleteCount();
      };
    }
  }

  function _updateEchoDeleteCount() {
    var count = document.querySelectorAll('.echo-card.selectable.selected').length;
    var countEl = document.getElementById('echoDeleteCount');
    if (countEl) countEl.textContent = '已选 ' + count + ' 张';
  }

  function confirmEchoDelete() {
    var selected = document.querySelectorAll('.echo-card.selectable.selected');
    if (!selected.length) { _showToast('请先选择要删除的卡片'); return; }

    var ids = [];
    selected.forEach(function(el) {
      var id = el.dataset.cardId;
      if (id) ids.push(id);
    });

    if (!ids.length) { _showToast('未找到卡片ID'); return; }

    // 从 Echoes 中取出这些卡片，移到 Trash
    var echoes = Storage.Echoes.load();
    var toTrash = [];
    var rest = [];
    echoes.forEach(function(c) {
      if (ids.indexOf(c.id) >= 0) {
        toTrash.push(c);
      } else {
        rest.push(c);
      }
    });

    Storage.Echoes.save(rest);
    Storage.Trash.addMany(toTrash);

    _showToast('已移入垃圾箱 ' + toTrash.length + ' 张卡片');
    cancelEchoDelete();
    _updateEchoPage();
    _updateTreePage();
    _updateRightPanel();
    _updateTrashBadge();
  }

  function cancelEchoDelete() {
    _isEchoDeleteMode = false;
    var bar = document.getElementById('echoDeleteBar');
    if (bar) bar.classList.remove('active');
    // 移除 selectable/selected 样式
    var grid = document.getElementById('cardsGrid');
    if (grid) {
      grid.querySelectorAll('.echo-card').forEach(function(el) {
        el.classList.remove('selectable', 'selected');
      });
    }
  }

  // ===== 自定义领域：添加 =====
  function promptAddDomain() {
    var overlay = document.getElementById('domainInputOverlay');
    var input = document.getElementById('domainInputField');
    if (!overlay || !input) return;
    input.value = '';
    overlay.classList.add('active');
    setTimeout(function() { input.focus(); }, 100);
    // 回车确认
    input.onkeydown = function(e) { if (e.key === 'Enter') confirmAddDomain(); };
    // 点击背景关闭
    overlay.onclick = function(e) { if (e.target === overlay) cancelAddDomain(); };
  }

  function confirmAddDomain() {
    var input = document.getElementById('domainInputField');
    if (!input) return;
    var name = input.value.trim();
    if (!name) { _showToast('请输入领域名称'); return; }
    // 检查是否与已有领域重名
    var echoes = Storage.Echoes.load();
    var exists = echoes.some(function(c) { return (c.domain || '未分类') === name; });
    var customList = Storage.CustomDomains.load();
    if (customList.indexOf(name) >= 0) exists = true;
    if (exists) { _showToast('该领域已存在'); return; }
    Storage.CustomDomains.add(name);
    cancelAddDomain();
    _updateEchoPage();
    _showToast('已添加领域「' + name + '」');
  }

  function cancelAddDomain() {
    var overlay = document.getElementById('domainInputOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ===== 删除领域模式 =====
  function enterDomainDeleteMode() {
    var echoes = Storage.Echoes.load();
    var customList = Storage.CustomDomains.load();
    // 至少要有一个可删除的领域
    var hasDeletable = echoes.some(function(c) { return c.domain && c.domain !== '未分类'; }) || customList.length > 0;
    if (!hasDeletable) { _showToast('没有可删除的领域'); return; }

    _domainDeleteMode = !_domainDeleteMode;
    var btn = document.querySelector('.domain-del-btn');
    if (btn) btn.classList.toggle('active', _domainDeleteMode);
    _updateEchoPage();
  }

  function confirmDeleteDomain() {
    if (!_pendingDeleteDomain) return;
    var domain = _pendingDeleteDomain;
    // 关闭弹窗
    document.getElementById('confirmOverlay').classList.remove('active');
    // 1. 从自定义领域中删除（如果是自定义的）
    Storage.CustomDomains.remove(domain);
    // 2. 清除卡片中的该领域
    var echoes = Storage.Echoes.load();
    echoes.forEach(function(c) {
      if (c.domain === domain) {
        c.domain = ''; // 清空，不删除卡片
      }
    });
    Storage.Echoes.save(echoes);
    // 3. 退出删除模式
    _domainDeleteMode = false;
    _pendingDeleteDomain = null;
    var btn = document.querySelector('.domain-del-btn');
    if (btn) btn.classList.remove('active');
    if (_filterDomain === domain) _filterDomain = 'all';
    _updateEchoPage();
    _updateTreePage();
    _showToast('已删除领域「' + domain + '」');
  }

  function cancelDeleteDomain() {
    document.getElementById('confirmOverlay').classList.remove('active');
    _pendingDeleteDomain = null;
  }

  // ===== 多选归类：领域选择 =====
  function openDomainPicker() {
    var selected = document.querySelectorAll('.echo-card.selectable.selected');
    if (!selected.length) { _showToast('请先选择要归类的卡片'); return; }

    // 收集所有领域（AI领域 + 自定义领域）
    var echoes = Storage.Echoes.load();
    var domains = {};
    echoes.forEach(function(c) { domains[c.domain || '未分类'] = true; });
    var customList = Storage.CustomDomains.load();
    customList.forEach(function(d) { domains[d] = true; });

    var list = document.getElementById('domainPickerList');
    if (!list) return;
    list.innerHTML = '';

    Object.keys(domains).sort().forEach(function(d) {
      var item = document.createElement('div');
      item.className = 'domain-picker-item';
      item.textContent = d;
      item.onclick = function() { _classifyCards(d); };
      list.appendChild(item);
    });

    // 也允许输入新领域
    var newItem = document.createElement('div');
    newItem.className = 'domain-picker-item domain-picker-new';
    newItem.textContent = '+ 新建领域…';
    newItem.onclick = function() {
      closeDomainPicker();
      promptAddDomainForClassify();
    };
    list.appendChild(newItem);

    var overlay = document.getElementById('domainPickerOverlay');
    if (overlay) {
      overlay.classList.add('active');
      overlay.onclick = function(e) { if (e.target === overlay) closeDomainPicker(); };
    }
  }

  function closeDomainPicker() {
    var overlay = document.getElementById('domainPickerOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 新建领域并直接归类（从归类弹窗跳转）
  function promptAddDomainForClassify() {
    var overlay = document.getElementById('domainInputOverlay');
    var input = document.getElementById('domainInputField');
    if (!overlay || !input) return;
    input.value = '';
    overlay.classList.add('active');
    setTimeout(function() { input.focus(); }, 100);
    input.onkeydown = function(e) { if (e.key === 'Enter') _confirmAddAndClassify(); };
    overlay.onclick = function(e) { if (e.target === overlay) cancelAddDomain(); };
    // 替换确认按钮行为
    var confirmBtn = overlay.querySelector('.domain-input-confirm');
    if (confirmBtn) {
      confirmBtn.onclick = function() { _confirmAddAndClassify(); };
    }
  }

  function _confirmAddAndClassify() {
    var input = document.getElementById('domainInputField');
    if (!input) return;
    var name = input.value.trim();
    if (!name) { _showToast('请输入领域名称'); return; }
    var echoes = Storage.Echoes.load();
    var exists = echoes.some(function(c) { return (c.domain || '未分类') === name; });
    var customList = Storage.CustomDomains.load();
    if (customList.indexOf(name) >= 0) exists = true;
    if (exists) { _showToast('该领域已存在'); return; }
    Storage.CustomDomains.add(name);
    cancelAddDomain();
    _classifyCards(name);
  }

  // 执行归类
  function _classifyCards(domain) {
    var selected = document.querySelectorAll('.echo-card.selectable.selected');
    if (!selected.length) return;

    var ids = [];
    selected.forEach(function(el) {
      var id = el.dataset.cardId;
      if (id) ids.push(id);
    });

    var echoes = Storage.Echoes.load();
    var count = 0;
    echoes.forEach(function(c) {
      if (ids.indexOf(c.id) >= 0) {
        c.domain = domain;
        count++;
      }
    });
    Storage.Echoes.save(echoes);

    closeDomainPicker();
    _showToast('已将 ' + count + ' 张卡片归类到「' + domain + '」');
    cancelEchoDelete();
    _updateEchoPage();
    _updateTreePage();
  }

  // ===== 垃圾箱 =====
  function openTrash() {
    var overlay = document.getElementById('trashOverlay');
    if (overlay) {
      overlay.classList.add('active');
      // 点击背景关闭
      overlay.onclick = function(e) {
        if (e.target === overlay) closeTrash();
      };
    }
    _renderTrash();
  }

  function closeTrash() {
    var overlay = document.getElementById('trashOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function _renderTrash() {
    var body = document.getElementById('trashBody');
    if (!body) return;

    var items = Storage.Trash.loadPurged();
    _updateTrashBadge();

    if (!items.length) {
      body.innerHTML = '<div class="trash-empty">垃圾箱是空的 🌿</div>';
      return;
    }

    body.innerHTML = '';
    items.forEach(function(card) {
      var el = document.createElement('div');
      el.className = 'trash-item';

      var deletedAt = card.deletedAt ? new Date(card.deletedAt) : null;
      var timeStr = '';
      if (deletedAt) {
        var remain = 7 - Math.floor((Date.now() - card.deletedAt) / 86400000);
        timeStr = remain > 0 ? '剩余 ' + remain + ' 天自动清空' : '即将清空';
      }

      el.innerHTML =
        '<div class="trash-item-main">' +
          '<div class="trash-item-domain">' + _esc(card.domain || '未分类') + ' · L' + (card.level || 1) + '</div>' +
          '<div class="trash-item-insight">' + _esc(card.insight || '') + '</div>' +
          '<div class="trash-item-time">' + timeStr + '</div>' +
        '</div>' +
        '<div class="trash-item-actions">' +
          '<button class="trash-restore-btn" data-id="' + card.id + '">恢复</button>' +
          '<button class="trash-perm-delete-btn" data-id="' + card.id + '">彻底删除</button>' +
        '</div>';
      body.appendChild(el);
    });

    // 绑定事件
    body.querySelectorAll('.trash-restore-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        var card = Storage.Trash.restore(id);
        if (card) {
          Storage.Echoes.add(card);
          _showToast('已恢复卡片');
          _renderTrash();
          _updateEchoPage();
          _updateTreePage();
          _updateRightPanel();
        }
      });
    });

    body.querySelectorAll('.trash-perm-delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.dataset.id;
        Storage.Trash.permanDelete(id);
        _showToast('已彻底删除');
        _renderTrash();
      });
    });
  }

  function _updateTrashBadge() {
    var badge = document.getElementById('trashBadge');
    if (!badge) return;
    var count = Storage.Trash.loadPurged().length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function _renderRightPanelEvaluation(panel) {
    var latest = Storage.Evaluate.getLatest();
    var hasData = latest && latest.scores;

    var div = document.createElement('div');
    div.className = 'right-eval';

    var html = '<div class="right-eval-title">本次对话评价</div>';

    var dims = [
      { key: 'depth',     label: '深度' },
      { key: 'purity',    label: '纯度' },
      { key: 'accuracy',  label: '准确' },
      { key: 'coherence', label: '连贯' },
    ];

    if (hasData) {
      // 有评价数据：显示实际分数
      dims.forEach(function(d) {
        var val = latest.scores[d.key] || 0;
        html += '<div class="right-eval-row">' +
          '<span class="right-eval-label">' + d.label + '</span>' +
          '<div class="right-eval-bar"><div class="right-eval-fill" style="width:' + val + '%"></div></div>' +
          '<span class="right-eval-val">' + val + '</span>' +
        '</div>';
      });
      var narrative = Evaluate.getNarrative(latest.score || 0);
      html += '<div class="right-eval-summary">综合 ' + (latest.score || 0) + ' · 🌳 ' + _esc(narrative) + '</div>';
      if (latest.suggestion) {
        html += '<div class="right-eval-suggestion">💡 ' + _esc(latest.suggestion) + '</div>';
      }
    } else {
      // 无评价数据：显示0分 + 引导文案
      dims.forEach(function(d) {
        html += '<div class="right-eval-row">' +
          '<span class="right-eval-label">' + d.label + '</span>' +
          '<div class="right-eval-bar"><div class="right-eval-fill" style="width:0%"></div></div>' +
          '<span class="right-eval-val">0</span>' +
        '</div>';
      });
      html += '<div class="right-eval-hint">多聊几轮再结束对话，就能看到你的学习思考评价了 🌱</div>';
    }

    div.innerHTML = html;
    panel.appendChild(div);
  }

  // ===== 触发推荐Agent =====
  function triggerRecommend() {
    // 切换到生长页（对话区）
    switchTab('growth');
    // 调用推荐模块
    Recommend.getRecommendations();
  }

  function switchTheme(t) { document.body.className = t; Storage.Theme.set(t); }

  // 清空思考弹窗
  function confirmClearChat() {
    var popup = document.getElementById('clearPopup');
    if (popup) popup.classList.add('active');
  }

  function closeClearPopup() {
    var popup = document.getElementById('clearPopup');
    if (popup) popup.classList.remove('active');
  }

  function chooseNewTopic() {
    closeClearPopup();
    Chat.startNewTopic();
  }

  function chooseClearAll() {
    closeClearPopup();
    Chat.clearChat();
  }

  function _getInputVal(id,def) { var e=document.getElementById(id); return e?e.value.trim():def; }
  function _getSelectVal(id,def) { var e=document.getElementById(id); return e?e.value:def; }
  function _getRadioVal(n,def) { var e=document.querySelector('input[name="'+n+'"]:checked'); return e?e.value:def; }
  function _getChipValues(cid) { return Array.from(document.querySelectorAll('#'+cid+' .chip.active')).map(function(c){return c.textContent.trim();}); }
  function _setText(id,t) { var e=document.getElementById(id); if(e) e.textContent=t; }
  function _esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function deleteLatestCards() {
    // 已废弃，改用 enterDeleteMode
    _enterDeleteMode();
  }

  return {
    init: init, switchTab: switchTab, switchTheme: switchTheme,
    completeOnboarding: completeOnboarding, skipOnboarding: skipOnboarding,
    confirmClearChat: confirmClearChat, closeClearPopup: closeClearPopup,
    switchProfileTab: switchProfileTab,
    chooseNewTopic: chooseNewTopic, chooseClearAll: chooseClearAll,
    updateRightPanel: _updateRightPanel,
    enterDeleteMode: _enterDeleteMode, confirmDeleteSelected: confirmDeleteSelected,
    cancelDeleteMode: cancelDeleteMode,
    openCardDetail: openCardDetail,
    closeCardDetail: closeCardDetail, _showToast: _showToast,
    editCardNote: editCardNote, saveCardNote: saveCardNote, cancelCardNote: cancelCardNote,
    editInsight: editInsight, saveInsight: saveInsight, cancelInsight: cancelInsight, resetInsight: resetInsight,
    triggerRecommend: triggerRecommend,
    refreshForestRecommend: refreshForestRecommend,
    closeForestDetail: _closeForestDetail,
    // 回响页删除 + 垃圾箱
    enterEchoDeleteMode: enterEchoDeleteMode,
    confirmEchoDelete: confirmEchoDelete,
    cancelEchoDelete: cancelEchoDelete,
    openTrash: openTrash,
    closeTrash: closeTrash,
    // 自定义领域 + 归类
    promptAddDomain: promptAddDomain,
    confirmAddDomain: confirmAddDomain,
    cancelAddDomain: cancelAddDomain,
    enterDomainDeleteMode: enterDomainDeleteMode,
    confirmDeleteDomain: confirmDeleteDomain,
    cancelDeleteDomain: cancelDeleteDomain,
    openDomainPicker: openDomainPicker,
    closeDomainPicker: closeDomainPicker,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
