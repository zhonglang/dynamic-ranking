/**
 * 静态配置：背景主题、星座符号、名次数字主题（供 DynamicRanking 使用）
 * 使用全局对象，以便 file:// 下按顺序加载脚本（无需 ES Module）
 */
window.__dynamicRankingConstants = {
    backgroundThemes: {
        none: { name: '无主题', gradient: ['#000000', '#000000'], type: 'none', effect: 'none' },
        /* 动态 bg3：参考 OLED 赛博仪表盘 / 威胁球 / 终端雨 / 神经束 / PCB / 显示器件纹 */
        dyn_contourFlow: { name: '极光粒子幔', gradient: ['#030510', '#0a0820'], type: 'dynamic', effect: 'bg3_dyn_aurora' },
        dyn_phaseSweep: { name: '全球威胁点云', gradient: ['#020408', '#061018'], type: 'dynamic', effect: 'bg3_dyn_globeDots' },
        dyn_linkMesh: { name: '同步瀑布码', gradient: ['#020508', '#05141c'], type: 'dynamic', effect: 'bg3_dyn_glyphFall' },
        dyn_grating: { name: '神经轴突脉冲', gradient: ['#03060c', '#081828'], type: 'dynamic', effect: 'bg3_dyn_axonPulse' },
        dyn_orbits: { name: '主板电流脉动', gradient: ['#020808', '#051c18'], type: 'dynamic', effect: 'bg3_dyn_pcbPulse' },
        dyn_interference: { name: 'OLED 干扰纹', gradient: ['#040408', '#101018'], type: 'dynamic', effect: 'bg3_dyn_oledArtifacts' },
        /* 静态 bg3：线框地貌 / 星盘 / 星图莫尔 / 碎晶 / 零一环阵 */
        sta_isoGrid: { name: '线框海拔地貌', gradient: ['#020408', '#081018'], type: 'static', effect: 'bg3_sta_terrainWire' },
        sta_instrument: { name: '星盘刻度环', gradient: ['#050408', '#120c18'], type: 'static', effect: 'bg3_sta_astrolabe' },
        sta_topology: { name: '星图星座素线', gradient: ['#02060a', '#0a1422'], type: 'static', effect: 'bg3_sta_starChart' },
        sta_datamatrix: { name: '双色莫尔栅', gradient: ['#030308', '#101020'], type: 'static', effect: 'bg3_sta_moire' },
        sta_hexGlow: { name: '碎晶数据块', gradient: ['#020508', '#0c1428'], type: 'static', effect: 'bg3_sta_shardBlocks' },
        sta_velocity: { name: '零一环阵符', gradient: ['#030408', '#0c1020'], type: 'static', effect: 'bg3_sta_binaryRings' },
        /* 静态 bg3 扩展：HUD / 六角 / 蓝图 / 透视 / 放射 / 量子 / 全息 / 示波 / 轨道 */
        sta_hudFrame: { name: '双层 HUD 角框', gradient: ['#040610', '#0a1428'], type: 'static', effect: 'bg3_sta_hudFrame' },
        sta_hexMesh: { name: '六角渐变密铺', gradient: ['#020608', '#081820'], type: 'static', effect: 'bg3_sta_hexMesh' },
        sta_blueprint: { name: '蓝图工程线网', gradient: ['#020818', '#0a2038'], type: 'static', effect: 'bg3_sta_blueprint' },
        sta_perspectiveGrid: { name: '透视静帧地网', gradient: ['#030408', '#0a1020'], type: 'static', effect: 'bg3_sta_perspectiveGrid' },
        sta_mandalaRadials: { name: '中心放射纹样', gradient: ['#050408', '#140c20'], type: 'static', effect: 'bg3_sta_mandalaRadials' },
        sta_quantumGate: { name: '量子门电路阵', gradient: ['#030510', '#0a1028'], type: 'static', effect: 'bg3_sta_quantumGate' },
        sta_holoPrism: { name: '全息棱镜折面', gradient: ['#040408', '#120c28'], type: 'static', effect: 'bg3_sta_holoPrism' },
        sta_signalWave: { name: '示波器波形屏', gradient: ['#020608', '#081820'], type: 'static', effect: 'bg3_sta_signalWave' },
        sta_orbitTrack: { name: '航天轨道测控', gradient: ['#030408', '#0c1428'], type: 'static', effect: 'bg3_sta_orbitTrack' },
        /* 动态 bg3 扩展：Plexus / 星云 / 流光 / 飞线 / 光雨 / 蜂窝 / 核心 / 隧道 / 全息 */
        dyn_plexusNet: { name: 'Plexus 点线网', gradient: ['#020408', '#061018'], type: 'dynamic', effect: 'bg3_dyn_plexusNet' },
        dyn_particleNebula: { name: '粒子星云旋涡', gradient: ['#030510', '#0a0820'], type: 'dynamic', effect: 'bg3_dyn_particleNebula' },
        dyn_flowRibbon: { name: '多层扭曲流光', gradient: ['#040408', '#101028'], type: 'dynamic', effect: 'bg3_dyn_flowRibbon' },
        dyn_flightArcs: { name: '弧线飞线束', gradient: ['#020608', '#081828'], type: 'dynamic', effect: 'bg3_dyn_flightArcs' },
        dyn_lightRain: { name: '竖直光柱粒子雨', gradient: ['#030408', '#0c1428'], type: 'dynamic', effect: 'bg3_dyn_lightRain' },
        dyn_hexScan: { name: '六角蜂窝扫描', gradient: ['#020808', '#061818'], type: 'dynamic', effect: 'bg3_dyn_hexScan' },
        dyn_coreReactor: { name: '能量核心脉冲', gradient: ['#050408', '#180818'], type: 'dynamic', effect: 'bg3_dyn_coreReactor' },
        dyn_dataTunnel: { name: '数据隧道纵深', gradient: ['#020408', '#0a1020'], type: 'dynamic', effect: 'bg3_dyn_dataTunnel' },
        dyn_holoScan: { name: '全息扫描色差', gradient: ['#040408', '#101018'], type: 'dynamic', effect: 'bg3_dyn_holoScan' }
    },

    zodiacSigns: {
    '白羊座': '♈',
    '金牛座': '♉',
    '双子座': '♊',
    '巨蟹座': '♋',
    '狮子座': '♌',
    '处女座': '♍',
    '天秤座': '♎',
    '天蝎座': '♏',
    '射手座': '♐',
    '摩羯座': '♑',
    '水瓶座': '♒',
    '双鱼座': '♓'
    },

    rankNumberThemePresets: {
    'cyber-blue': { ring: 'rgba(0,255,255,0.5)', ringGlow: 'rgba(0,255,255,0.8)', texA: 'rgba(0,255,255,0.35)', texB: 'rgba(178,107,255,0.35)', g0: '#7CFDFF', g1: '#00E0FF', g2: '#0090FF', g3: '#2A00FF', glow: 'rgba(0,255,255,0.6)', outline: 'rgba(0,255,255,0.85)', halo: 'rgba(0,255,255,0.18)' },
    'neon-pink': { ring: 'rgba(255,80,220,0.5)', ringGlow: 'rgba(255,80,220,0.85)', texA: 'rgba(255,80,220,0.35)', texB: 'rgba(120,70,255,0.35)', g0: '#FFD0FA', g1: '#FF70E6', g2: '#D14BFF', g3: '#5A26FF', glow: 'rgba(255,80,220,0.6)', outline: 'rgba(255,130,235,0.9)', halo: 'rgba(255,80,220,0.2)' },
    'aurora-green': { ring: 'rgba(0,255,170,0.5)', ringGlow: 'rgba(0,255,170,0.85)', texA: 'rgba(0,255,170,0.35)', texB: 'rgba(0,180,255,0.35)', g0: '#D9FFF3', g1: '#44FFD0', g2: '#00E8A2', g3: '#0077C8', glow: 'rgba(0,255,170,0.6)', outline: 'rgba(70,255,200,0.9)', halo: 'rgba(0,255,170,0.2)' },
    'golden-core': { ring: 'rgba(255,210,70,0.55)', ringGlow: 'rgba(255,210,70,0.9)', texA: 'rgba(255,210,70,0.35)', texB: 'rgba(255,130,30,0.3)', g0: '#FFF2B0', g1: '#FFD86B', g2: '#FFB536', g3: '#B36A00', glow: 'rgba(255,190,80,0.55)', outline: 'rgba(255,220,120,0.9)', halo: 'rgba(255,190,80,0.2)' },
    'ice-silver': { ring: 'rgba(195,235,255,0.55)', ringGlow: 'rgba(210,245,255,0.9)', texA: 'rgba(220,245,255,0.35)', texB: 'rgba(130,180,220,0.3)', g0: '#FFFFFF', g1: '#E8F6FF', g2: '#BFDFFF', g3: '#7BA6D9', glow: 'rgba(190,230,255,0.55)', outline: 'rgba(230,250,255,0.95)', halo: 'rgba(200,235,255,0.2)' },
    'lava-red': { ring: 'rgba(255,95,50,0.55)', ringGlow: 'rgba(255,120,60,0.9)', texA: 'rgba(255,110,70,0.35)', texB: 'rgba(255,180,70,0.3)', g0: '#FFE0C8', g1: '#FF9A4D', g2: '#FF5A2E', g3: '#B81500', glow: 'rgba(255,110,60,0.55)', outline: 'rgba(255,150,95,0.9)', halo: 'rgba(255,120,70,0.2)' }
    }
};
