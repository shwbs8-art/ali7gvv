const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');

// ==================== الإعدادات ====================
const config = {
    minecraft: {
        host: process.env.MC_HOST || 'localhost',
        port: parseInt(process.env.MC_PORT) || 25565,
        username: process.env.MC_USERNAME || 'SecurityBot',
        auth: 'offline'
    },
    discord: {
        token: process.env.DISCORD_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID
    },
    messageInterval: 3600000 // ساعة
};

// ==================== الحماية من السبام ====================
const spamProtection = {
    messages: new Map(),
    threshold: 3,
    timeWindow: 3000
};

let messagesEnabled = true;

// ==================== بوت الديسكورد ====================
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let bot;
let statusMessage;

// ==================== إنشاء بوت ماينكرافت ====================
function createBot() {
    bot = mineflayer.createBot(config.minecraft);

    bot.on('login', () => {
        console.log('✅ بوت ماينكرافت دخل السيرفر');
        startStatusUpdates();
        startRandomMovements();
        startAutoMessages();
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        
        // === أوامر الشات ===
        if (message === '!حالة' || message === '!status') {
            showStatusInChat();
            return;
        }
        
        if (message === '!اوامر' || message === '!help') {
            showHelpInChat();
            return;
        }
        
        if (message === '!لاعبين' || message === '!players') {
            showPlayersInChat();
            return;
        }
        
        if (message === '!ديسكورد' || message === '!discord') {
            bot.chat('§b§l🔗 رابط الديسكورد: §ahttps://discord.gg/EpCyF3A6Up');
            return;
        }

        // === نظام كشف السبام ===
        const now = Date.now();
        if (!spamProtection.messages.has(username)) {
            spamProtection.messages.set(username, []);
        }
        const userMessages = spamProtection.messages.get(username);
        userMessages.push(now);
        
        while (userMessages.length > 0 && userMessages[0] < now - spamProtection.timeWindow) {
            userMessages.shift();
        }
        
        if (userMessages.length >= spamProtection.threshold) {
            handleSpam(username);
            return;
        }

        // === إرسال الشات للديسكورد ===
        const channel = discordClient.channels.cache.get(config.discord.channelId);
        if (channel) {
            channel.send(`💬 **${username}**: ${message}`).catch(() => {});
        }
    });

    bot.on('end', () => {
        console.log('🔄 جاري إعادة الاتصال...');
        setTimeout(createBot, 5000);
    });

    bot.on('error', (err) => {
        console.error('❌ خطأ:', err.message);
    });

    bot.on('kicked', (reason) => {
        console.log('🚫 تم طرد البوت:', reason);
    });
}

// ==================== أوامر الشات ====================
function showStatusInChat() {
    const players = Object.values(bot.players).map(p => p.username);
    bot.chat('§6§l━━━━━━━━━━━━━━━━━━');
    bot.chat('§a§l✅ حالة السيرفر: نشط');
    bot.chat(`§b§l👥 عدد اللاعبين: §f${players.length}`);
    if (players.length > 0) {
        bot.chat(`§e§l🎮 اللاعبين: §f${players.join(', ')}`);
    } else {
        bot.chat('§cلا يوجد لاعبين حالياً');
    }
    bot.chat('§d§l🔗 ديسكورد: §ahttps://discord.gg/EpCyF3A6Up');
    bot.chat('§6§l━━━━━━━━━━━━━━━━━━');
}

function showHelpInChat() {
    bot.chat('§6§l━━━━━━ الأوامر ━━━━━━');
    bot.chat('§a!حالة §f- عرض حالة السيرفر');
    bot.chat('§a!لاعبين §f- عرض اللاعبين المتصلين');
    bot.chat('§a!ديسكورد §f- رابط الديسكورد');
    bot.chat('§a!اوامر §f- عرض الأوامر');
    bot.chat('§6§l━━━━━━━━━━━━━━━━━━');
}

function showPlayersInChat() {
    const players = Object.values(bot.players).map(p => p.username);
    if (players.length > 0) {
        bot.chat(`§b§l👥 اللاعبين المتصلين (${players.length}):`);
        bot.chat(`§f${players.join(', ')}`);
    } else {
        bot.chat('§c❌ لا يوجد لاعبين حالياً');
    }
}

// ==================== طرد السبامر ====================
async function handleSpam(username) {
    try {
        bot.chat(`/kick ${username} سبام - تم التبليغ للإدارة`);
        spamProtection.messages.delete(username);
        
        const channel = discordClient.channels.cache.get(config.discord.channelId);
        if (channel) {
            await channel.send({
                embeds: [{
                    title: '🚨 تنبيه سبام!',
                    description: `تم كشف سبام من اللاعب **${username}**\nتم طرده تلقائياً`,
                    color: 0xFF0000,
                    timestamp: new Date()
                }]
            });
        }
    } catch (err) {
        console.error('فشل طرد السبامر:', err);
    }
}

// ==================== الرسائل التلقائية ====================
function startAutoMessages() {
    const welcomeMessage = '§6§lأهلاً بكم في سيرفر عراق بابلون §f| §bانضموا إلى الديسكورد: §ahttps://discord.gg/EpCyF3A6Up §f| §eنتمنى لكم وقتاً ممتعاً';
    
    setTimeout(() => {
        if (messagesEnabled) sendPeriodicMessage(welcomeMessage);
    }, 10000);
    
    setInterval(() => {
        if (messagesEnabled) sendPeriodicMessage(welcomeMessage);
    }, config.messageInterval);
}

function sendPeriodicMessage(message) {
    if (!bot || !bot.entity) return;
    try {
        bot.chat(message);
        console.log('✅ تم إرسال الرسالة التلقائية');
    } catch (err) {
        console.error('❌ فشل إرسال الرسالة:', err);
    }
}

// ==================== تحديث الحالة في ديسكورد ====================
async function startStatusUpdates() {
    const channel = discordClient.channels.cache.get(config.discord.channelId);
    if (!channel) return;

    // حذف الرسائل القديمة للبوت
    const messages = await channel.messages.fetch({ limit: 10 });
    const oldMessages = messages.filter(m => m.author.id === discordClient.user.id);
    for (const msg of oldMessages.values()) {
        await msg.delete().catch(() => {});
    }

    // إنشاء رسالة الحالة
    statusMessage = await channel.send({
        embeds: [{
            title: '📊 حالة سيرفر ماينكرافت',
            description: '⏳ جاري التحميل...',
            color: 0xF1C40F
        }]
    });

    updateStatus();
    setInterval(updateStatus, 300000);
}

async function updateStatus() {
    const channel = discordClient.channels.cache.get(config.discord.channelId);
    if (!channel || !statusMessage) return;

    try {
        const players = bot && bot.players ? Object.values(bot.players).map(p => p.username) : [];
        const isOnline = bot && bot.entity ? true : false;
        
        const embed = {
            title: '📊 حالة سيرفر ماينكرافت',
            color: isOnline ? 0x00FF00 : 0xFF0000,
            fields: [
                {
                    name: '🟢 حالة السيرفر',
                    value: isOnline ? '**✅ نشط**' : '**❌ مغلق**',
                    inline: true
                },
                {
                    name: '👥 عدد اللاعبين',
                    value: `**${players.length}**`,
                    inline: true
                },
                {
                    name: '🎮 اللاعبين المتصلين',
                    value: players.length > 0 ? players.map(p => `• \`${p}\``).join('\n') : '*لا يوجد لاعبين*',
                    inline: false
                },
                {
                    name: '🔗 رابط الديسكورد',
                    value: 'https://discord.gg/EpCyF3A6Up',
                    inline: false
                }
            ],
            timestamp: new Date(),
            footer: {
                text: '🔄 تحديث كل 5 دقائق | سيرفر عراق بابلون'
            }
        };

        await statusMessage.edit({ embeds: [embed] });
        console.log('✅ تم تحديث الحالة');
    } catch (err) {
        console.error('❌ فشل التحديث:', err);
    }
}

// ==================== حركات عشوائية ====================
function startRandomMovements() {
    setInterval(() => {
        if (!bot || !bot.entity) return;

        const actions = [
            () => {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
            },
            () => {
                const dirs = ['forward', 'back', 'left', 'right'];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                bot.setControlState(dir, true);
                setTimeout(() => bot.setControlState(dir, false), 1000 + Math.random() * 2000);
            },
            () => {
                bot.look(Math.random() * Math.PI * 2, (Math.random() * 1.5) - 0.75, true);
            }
        ];

        actions[Math.floor(Math.random() * actions.length)]();
    }, 5000 + Math.random() * 10000);
}

// ==================== أوامر الديسكورد ====================
discordClient.on('ready', () => {
    console.log(`🤖 ${discordClient.user.tag} جاهز!`);
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!تحديث') {
        await updateStatus();
        await message.reply('✅ تم تحديث حالة السيرفر');
    }
    
    if (message.content === '!لاعبين') {
        if (bot && bot.players) {
            const players = Object.values(bot.players).map(p => p.username);
            await message.channel.send(`👥 **اللاعبين (${players.length}):** ${players.length > 0 ? players.join(', ') : 'لا يوجد'}`);
        }
    }
    
    if (message.content === '!رسالة') {
        const msg = '§6§lأهلاً بكم في سيرفر عراق بابلون §f| §bانضموا إلى الديسكورد: §ahttps://discord.gg/EpCyF3A6Up §f| §eنتمنى لكم وقتاً ممتعاً';
        sendPeriodicMessage(msg);
        await message.reply('✅ تم إرسال رسالة الترحيب');
    }
    
    if (message.content === '!ايقاف') {
        messagesEnabled = false;
        await message.reply('❌ تم إيقاف الرسائل التلقائية');
    }
    
    if (message.content === '!تشغيل') {
        messagesEnabled = true;
        await message.reply('✅ تم تشغيل الرسائل التلقائية');
    }
});

// ==================== تشغيل البوتات ====================
discordClient.login(config.discord.token).then(() => {
    createBot();
});