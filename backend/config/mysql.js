const mysql = require('mysql2/promise');
const path = require('path');
const { seedInMemoryAdmin } = require('../utils/adminSeed');
const localDbSync = require('../utils/localDbSync');

let dotenv;
try {
    dotenv = require('dotenv');
} catch (e) {}

if (dotenv) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const realPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'hyrost',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 4000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 5000,
    queueLimit: 0
});

let isConnected = false;

const connectionReady = (async () => {
    try {
        const conn = await realPool.getConnection();
        isConnected = true;
        console.log('✅ MySQL Database Connected Successfully!');
        conn.release();
    } catch (err) {
        isConnected = false;
        console.log('⚠️ MySQL Database Unreachable:', err.message);
        console.log('⚡ Active: IN-MEMORY FALLBACK MODE (Local Testing Active)');
        const loaded = await localDbSync.loadInto(inMemoryStore);
        if (loaded) {
            console.log('📂 Loaded local file store: data/store/database.json');
        }
        await seedInMemoryAdmin(inMemoryStore);
        await localDbSync.persistImmediate(inMemoryStore);
        console.log('✅ Admin user credentials synchronized from .env to local store.');
    }
})();

// In-Memory Database Store for Fallback
const inMemoryStore = {
    users: [],
    roles: [
        { id: 1, name: 'Admin', badge_text: 'ADMIN', badge_color: '#ff0000', price_coin: 0, price_idr: 0, description: 'Administrator' },
        { id: 2, name: 'Member', badge_text: 'MEMBER', badge_color: '#888888', price_coin: 0, price_idr: 0, description: 'Member' },
        { id: 3, name: 'Vip', badge_text: 'VIP', badge_color: '#ffd700', price_coin: 100, price_idr: 15000, description: 'VIP Status' }
    ],
    banned_words: [],
    threads: [
        {
            id: 1,
            user_id: 1,
            title: 'Selamat Datang di Forum Komunitas Hyrost Realm!',
            content: 'Halo petualang! Selamat bergabung di forum resmi Hyrost Realm. Bagikan panduan, cerita petualangan, dan ide-ide menarik kamu di sini.',
            category: 'General',
            tags: 'welcome, community, hyrost',
            image_url: null,
            status: 'active',
            is_pinned: 1,
            views: 42,
            reply_count: 1,
            vote_score: 5,
            username: 'System',
            avatar_url: 'https://ui-avatars.com/api/?name=H&background=6366f1&color=fff',
            user_role: 'Admin',
            badge_text: 'ADMIN',
            badge_color: '#ff0000',
            created_at: new Date(),
            updated_at: new Date()
        }
    ],
    replies: [
        {
            id: 1,
            thread_id: 1,
            user_id: 1,
            content: 'Terima kasih telah bergabung! Jangan ragu untuk membuat diskusi baru.',
            image_url: null,
            likes: 3,
            like_count: 3,
            username: 'System',
            avatar_url: 'https://ui-avatars.com/api/?name=H&background=6366f1&color=fff',
            user_role: 'Admin',
            badge_text: 'ADMIN',
            badge_color: '#ff0000',
            created_at: new Date(),
            updated_at: new Date()
        }
    ],
    votes: [],
    messages: [],
    friends: [],
    infractions: [],
    jobs: [],
    cosmetic_items: [],
    user_cosmetics: [],
    activity_logs: [],
    account_links: [],
    pending_deliveries: [],
    server_sync_logs: [],
    blocked_users: [],
    tickets: [],
    ticket_replies: [],
    wiki_articles: [
        { id: 1, title: 'Panduan Awal Hyrost Realm', category: 'Guide', icon: 'fa-compass', content: 'Selamat datang di Hyrost Realm! Kumpulkan koin, gabung forum, dan nikmati petualangan di server play.hyrost.net.', created_at: new Date() },
        { id: 2, title: 'Aturan & Etika Komunitas', category: 'Rules', icon: 'fa-gavel', content: 'Dilarang menggunakan cheat, toxic, atau spamming di forum dan server chat.', created_at: new Date() }
    ],
    notifications: [],
    ip_blacklist: [],
    vouchers: [
        { id: 1, code: 'HYROST2026', reward_type: 'gold', reward_amount: 100, max_uses: 100, used_count: 0, expires_at: '2030-12-31' },
        { id: 2, code: 'WELCOMEBONUS', reward_type: 'bronze', reward_amount: 500, max_uses: 500, used_count: 0, expires_at: '2030-12-31' }
    ],
    user_vouchers: [],
    quests: [
        { id: 1, title: 'Klaim Daily Reward', description: 'Klaim koin harian gratis di menu Daily Rewards', reward_type: 'bronze', reward_amount: 50, icon: 'fa-gift' },
        { id: 2, title: 'Penjelajah Forum', description: 'Buat postingan atau balasan komentar di Forum', reward_type: 'silver', reward_amount: 25, icon: 'fa-comments' },
        { id: 3, title: 'Kolektor Realm', description: 'Miliki minimal 1 item kosmetik di toko', reward_type: 'gold', reward_amount: 10, icon: 'fa-gem' }
    ],
    user_quests: [],
    live_chats: [
        { id: 1, user_id: 1, username: 'System', avatar_url: 'https://ui-avatars.com/api/?name=H&background=6366f1&color=fff', message: 'Selamat datang di Hyrost Realm Chatbox!', created_at: new Date() }
    ],
    settings: [
        { setting_key: 'announcement', setting_value: 'Selamat datang di Hyrost Realm!' },
        { setting_key: 'maintenance', setting_value: 'false' }
    ],
    build_showcases: [
        {
            id: 1,
            user_id: 1,
            username: 'HyrostArchitect',
            avatar_url: 'https://cravatar.eu/avatar/Steve/64.png',
            title: 'Kastil Obsidian Citadel & Dragon Spire',
            description: 'Kastil megah dengan menara naga berarsitektur gothic obsidian di ketinggian Y:180 Realm Utama.',
            image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
            category: 'Castle',
            coordinates: 'X: 1240, Y: 72, Z: -890',
            likes_count: 142,
            created_at: new Date(Date.now() - 3600000 * 24)
        },
        {
            id: 2,
            user_id: 1,
            username: 'RedstoneMaster',
            avatar_url: 'https://cravatar.eu/avatar/Alex/64.png',
            title: 'Automated Industrial Sorting District',
            description: 'Pusat industri penyimpanan otomatis 128 item dengan stasiun shulker box unloader dan flying machine.',
            image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
            category: 'Redstone',
            coordinates: 'X: -340, Y: 64, Z: 512',
            likes_count: 98,
            created_at: new Date(Date.now() - 3600000 * 48)
        },
        {
            id: 3,
            user_id: 1,
            username: 'ForestElf',
            avatar_url: 'https://cravatar.eu/avatar/Steve/64.png',
            title: 'Elven Village of Eldoria',
            description: 'Desa peri tersembunyi di kanopi pohon raksasa dengan jembatan gantung dan pencahayaan glowstone mistis.',
            image_url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1200&q=80',
            category: 'Fantasy',
            coordinates: 'X: 850, Y: 110, Z: 1420',
            likes_count: 115,
            created_at: new Date(Date.now() - 3600000 * 12)
        },
        {
            id: 4,
            user_id: 1,
            username: 'CyberBuilder',
            avatar_url: 'https://cravatar.eu/avatar/Alex/64.png',
            title: 'Cyberpunk Metropolis 2077 District',
            description: 'Gedung pencakar langit futuristik dengan billboard neon kaca berwarna, lift air gelembung, dan monorail terbang.',
            image_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
            category: 'Modern',
            coordinates: 'X: -1200, Y: 68, Z: 900',
            likes_count: 87,
            created_at: new Date(Date.now() - 3600000 * 6)
        },
        {
            id: 5,
            user_id: 1,
            username: 'VikingLord',
            avatar_url: 'https://cravatar.eu/avatar/Steve/64.png',
            title: 'Nordic Harbor & Windmill Village',
            description: 'Pelabuhan kapal drakkar bangsa Nordik lengkap dengan kincir angin fungsional dan gudang perikanan laut.',
            image_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
            category: 'Medieval',
            coordinates: 'X: 420, Y: 65, Z: -1500',
            likes_count: 104,
            created_at: new Date(Date.now() - 3600000 * 30)
        },
        {
            id: 6,
            user_id: 1,
            username: 'BunkerSurvivalist',
            avatar_url: 'https://cravatar.eu/avatar/Alex/64.png',
            title: 'Subterranean Mountain Vault Base',
            description: 'Markas bawah tanah tahan ledakan tnt di bawah tebing pegunungan es dengan kebun otomatis hidroponik.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            category: 'Survival Base',
            coordinates: 'X: 1890, Y: 22, Z: 430',
            likes_count: 120,
            created_at: new Date(Date.now() - 3600000 * 8)
        }
    ],
    showcase_likes: [],
    referrals: [],
    referral_claims: [],
    uploads: []
};

const poolWrapper = {
    execute: async (sql, values = []) => {
        await connectionReady;
        if (isConnected) {
            try {
                return await realPool.execute(sql, values);
            } catch (err) {
                if (['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'PROTOCOL_CONNECTION_LOST'].includes(err.code)) {
                    isConnected = false;
                    console.log('⚡ MySQL Connection lost. Falling back to In-Memory DB.');
                } else {
                    throw err;
                }
            }
        }

        // --- FALLBACK IN-MEMORY SQL HANDLER ---
        const cleanSql = sql.trim().replace(/\s+/g, ' ');

        const fallbackResult = await (async () => {
        if (cleanSql.includes('INSERT INTO threads')) {
            const newId = inMemoryStore.threads.length + 1;
            const [user_id, title, content, category, tags, image_url] = values;
            const user = inMemoryStore.users.find(u => u.id === parseInt(user_id)) || { username: 'Member', role: 'Member' };
            const newThread = {
                id: newId,
                user_id: parseInt(user_id) || 1,
                title: title || 'Untitled Thread',
                content: content || '',
                category: category || 'General',
                tags: tags || '',
                image_url: image_url || null,
                status: 'active',
                is_pinned: 0,
                views: 0,
                reply_count: 0,
                vote_score: 0,
                username: user.username || 'Member',
                avatar_url: user.avatar_url || null,
                user_role: user.role || 'Admin',
                badge_text: user.role ? user.role.toUpperCase() : 'ADMIN',
                badge_color: '#ff0000',
                created_at: new Date(),
                updated_at: new Date()
            };
            inMemoryStore.threads.unshift(newThread);
            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('UPDATE threads')) {
            const id = values[values.length - 1];
            const thread = inMemoryStore.threads.find(t => t.id === parseInt(id));
            if (thread) {
                if (cleanSql.includes('views = views + 1')) thread.views += 1;
                if (cleanSql.includes('is_pinned =')) thread.is_pinned = values[0];
            }
            return [{ affectedRows: 1 }, []];
        }

        if (cleanSql.includes('DELETE FROM threads')) {
            const id = parseInt(values[0]);
            inMemoryStore.threads = inMemoryStore.threads.filter(t => t.id !== id);
            return [{ affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM threads')) {
            if (cleanSql.includes('GROUP BY category')) {
                const catCounts = {};
                inMemoryStore.threads.filter(t => t.status === 'active').forEach(t => {
                    catCounts[t.category] = (catCounts[t.category] || 0) + 1;
                });
                const result = Object.keys(catCounts).map(cat => ({ category: cat, thread_count: catCounts[cat] }));
                return [result, []];
            }

            if (cleanSql.includes('WHERE t.id =') || cleanSql.includes('WHERE id =')) {
                const targetId = parseInt(values[0]);
                const found = inMemoryStore.threads.filter(t => t.id === targetId && t.status === 'active');
                return [found, []];
            }

            let list = [...inMemoryStore.threads.filter(t => t.status === 'active')];
            return [list, []];
        }

        if (cleanSql.includes('INSERT INTO replies')) {
            const newId = inMemoryStore.replies.length + 1;
            const [thread_id, user_id, content, image_url] = values;
            const user = inMemoryStore.users.find(u => u.id === parseInt(user_id)) || { username: 'Member', role: 'Member' };
            const newReply = {
                id: newId,
                thread_id: parseInt(thread_id),
                user_id: parseInt(user_id),
                content: content || '',
                image_url: image_url || null,
                likes: 0,
                like_count: 0,
                username: user.username,
                avatar_url: user.avatar_url || null,
                user_role: user.role || 'Member',
                badge_text: user.role ? user.role.toUpperCase() : 'MEMBER',
                badge_color: '#6366f1',
                created_at: new Date()
            };
            inMemoryStore.replies.push(newReply);
            
            const thread = inMemoryStore.threads.find(t => t.id === parseInt(thread_id));
            if (thread) thread.reply_count = (thread.reply_count || 0) + 1;

            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM replies')) {
            const threadId = values[0] ? parseInt(values[0]) : null;
            const list = threadId ? inMemoryStore.replies.filter(r => r.thread_id === threadId) : inMemoryStore.replies;
            return [list, []];
        }

        // USERS: Select user query (login, leaderboard, profile, list)
        if (cleanSql.includes('FROM users') && !cleanSql.includes('FROM threads')) {
            let matched = inMemoryStore.users.filter(u => !u.deleted_at);

            // Filter specific user if parameters are provided or query has literal search
            if (values && values.length >= 1) {
                const searchVal = values[0];
                matched = matched.filter(u => 
                    u.email === searchVal || u.username === searchVal || u.id === parseInt(searchVal)
                );
            } else if (values && values.length >= 1) {
                const searchVal = values[0];
                matched = matched.filter(u => 
                    u.email === searchVal || u.username === searchVal || u.id === parseInt(searchVal)
                );
            }

            matched.forEach(u => {
                u.total_wealth = (u.coin_gold || 0) * 10000 + (u.coin_silver || 0) * 100 + (u.coin_bronze || 0);
            });

            if (cleanSql.includes('ORDER BY')) {
                matched = [...matched].sort((a, b) => {
                    const diff = (b.total_wealth || 0) - (a.total_wealth || 0);
                    if (diff !== 0) return diff;
                    return (b.id || 0) - (a.id || 0);
                });
            }

            return [matched, []];
        }

        // USERS: Insert user (Register / First Admin / Google Login)
        if (cleanSql.includes('INSERT INTO users')) {
            const newId = inMemoryStore.users.length + 1;
            let username = 'User' + newId;
            let email = 'user' + newId + '@hyrost.net';
            let password = '';
            let role = 'Member';
            let coin_bronze = 0;
            let coin_silver = 0;
            let coin_gold = 0;
            let avatar_url = null;
            let google_id = null;

            if (values && values.length >= 3) {
                username = values[0] || username;
                email = values[1] || email;
                password = values[2] || password;

                if (typeof values[3] === 'string' && isNaN(values[3])) {
                    role = values[3];
                    if (typeof values[4] === 'number') coin_bronze = values[4];
                    else if (typeof values[4] === 'string') google_id = values[4];

                    if (typeof values[5] === 'number') coin_silver = values[5];
                    else if (typeof values[5] === 'string') avatar_url = values[5];

                    if (typeof values[6] === 'number') coin_gold = values[6];
                } else if (typeof values[3] === 'number') {
                    coin_bronze = values[3] || 0;
                    coin_silver = values[4] || 0;
                    coin_gold = values[5] || 0;
                }
            }

            const newUser = {
                id: newId,
                username,
                email,
                password,
                role: role || 'Member',
                avatar_url: avatar_url || null,
                google_id: google_id || null,
                coin_bronze: parseInt(coin_bronze) || 0,
                coin_silver: parseInt(coin_silver) || 0,
                coin_gold: parseInt(coin_gold) || 0,
                last_claim_time: null,
                created_at: new Date(),
                deleted_at: null
            };

            const existingIdx = inMemoryStore.users.findIndex(u => 
                (u.username && u.username.toLowerCase() === username.toLowerCase()) || 
                (u.email && u.email.toLowerCase() === email.toLowerCase())
            );
            if (existingIdx !== -1) {
                inMemoryStore.users[existingIdx] = { ...inMemoryStore.users[existingIdx], ...newUser, id: inMemoryStore.users[existingIdx].id };
                return [{ insertId: inMemoryStore.users[existingIdx].id, affectedRows: 1 }, []];
            } else {
                inMemoryStore.users.push(newUser);
                return [{ insertId: newId, affectedRows: 1 }, []];
            }
        }

        // USERS: Update user profile / coins / role
        if (cleanSql.includes('UPDATE users')) {
            let targetUser;
            if (values && values.length > 0) {
                const lastVal = values[values.length - 1];
                targetUser = inMemoryStore.users.find(u => u.id === parseInt(lastVal) || u.username === lastVal || u.email === lastVal);
            }
            if (targetUser) {
                if (cleanSql.includes('role =')) targetUser.role = (typeof values[0] === 'string' && isNaN(values[0])) ? values[0] : targetUser.role;
                if (cleanSql.includes('password =')) targetUser.password = values[0] || targetUser.password;
                if (cleanSql.includes('coin_bronze = coin_bronze +')) targetUser.coin_bronze += (parseInt(values[0]) || 0);
            }
            return [{ affectedRows: 1 }, []];
        }

        // ROLES: Select / Insert
        if (cleanSql.includes('FROM roles')) {
            return [inMemoryStore.roles, []];
        }
        if (cleanSql.includes('INSERT IGNORE INTO roles')) {
            return [{ affectedRows: 1 }, []];
        }

        // SETTINGS: Select / Insert
        if (cleanSql.includes('FROM settings')) {
            return [inMemoryStore.settings, []];
        }

        // NOTIFICATIONS / WIKI / IP BLACKLIST HANDLERS
        if (cleanSql.includes('INSERT INTO notifications')) {
            const [title, message, target_role, sender_id] = values;
            inMemoryStore.notifications.push({
                id: inMemoryStore.notifications.length + 1,
                title, message, target_role: target_role || 'ALL', sender_id: sender_id || 1, created_at: new Date()
            });
            return [{ insertId: inMemoryStore.notifications.length, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM notifications')) return [inMemoryStore.notifications, []];

        if (cleanSql.includes('INSERT INTO wiki_articles')) {
            const [title, category, icon, content] = values;
            inMemoryStore.wiki_articles.push({
                id: inMemoryStore.wiki_articles.length + 1,
                title, category: category || 'Guide', icon: icon || 'fa-book', content, created_at: new Date()
            });
            return [{ insertId: inMemoryStore.wiki_articles.length, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('DELETE FROM wiki_articles')) {
            const id = parseInt(values[0]);
            inMemoryStore.wiki_articles = inMemoryStore.wiki_articles.filter(w => w.id !== id);
            return [{ affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM wiki_articles')) return [inMemoryStore.wiki_articles, []];

        if (cleanSql.includes('INSERT INTO ip_blacklist')) {
            const [ip_address, reason, blocked_by] = values;
            inMemoryStore.ip_blacklist.push({
                id: inMemoryStore.ip_blacklist.length + 1,
                ip_address, reason: reason || 'Diblokir oleh Admin', blocked_by: blocked_by || 'Admin', created_at: new Date()
            });
            return [{ insertId: inMemoryStore.ip_blacklist.length, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('DELETE FROM ip_blacklist')) {
            const ip = values[0];
            inMemoryStore.ip_blacklist = inMemoryStore.ip_blacklist.filter(b => b.ip_address !== ip);
            return [{ affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM ip_blacklist')) return [inMemoryStore.ip_blacklist, []];

        // VOUCHERS HANDLERS
        if (cleanSql.includes('INSERT INTO vouchers')) {
            const [code, reward_type, reward_amount, max_uses, expires_at] = values;
            inMemoryStore.vouchers.push({
                id: inMemoryStore.vouchers.length + 1,
                code: (code || '').toUpperCase(), reward_type: reward_type || 'bronze', reward_amount: parseInt(reward_amount) || 50, max_uses: parseInt(max_uses) || 100, used_count: 0, expires_at: expires_at || '2030-12-31'
            });
            return [{ insertId: inMemoryStore.vouchers.length, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('DELETE FROM vouchers')) {
            const id = parseInt(values[0]);
            inMemoryStore.vouchers = inMemoryStore.vouchers.filter(v => v.id !== id);
            return [{ affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM vouchers')) return [inMemoryStore.vouchers, []];
        if (cleanSql.includes('FROM user_vouchers')) return [inMemoryStore.user_vouchers, []];

        // QUESTS HANDLERS
        if (cleanSql.includes('FROM quests')) return [inMemoryStore.quests, []];
        if (cleanSql.includes('FROM user_quests')) return [inMemoryStore.user_quests, []];

        // LIVE CHATBOX HANDLERS
        if (cleanSql.includes('INSERT INTO live_chats')) {
            const [user_id, username, avatar_url, message] = values;
            const newMsg = {
                id: inMemoryStore.live_chats.length + 1,
                user_id: user_id || 1, username: username || 'User', avatar_url: avatar_url || null, message: message || '', created_at: new Date()
            };
            inMemoryStore.live_chats.push(newMsg);
            return [{ insertId: newMsg.id, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM live_chats')) return [inMemoryStore.live_chats, []];

        // TICKETS HANDLERS
        if (cleanSql.includes('INSERT INTO tickets')) {
            const [ticketCode, userId, subject, category, priority, message] = values;
            const newId = inMemoryStore.tickets.length + 1;
            const newTicket = {
                id: newId,
                ticket_code: ticketCode || `T-${newId}`,
                user_id: parseInt(userId) || 1,
                subject: subject || 'No Subject',
                category: category || 'General',
                priority: priority || 'Medium',
                status: 'Open',
                message: message || '',
                created_at: new Date(),
                updated_at: new Date()
            };
            inMemoryStore.tickets.unshift(newTicket);
            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM tickets')) {
            if (cleanSql.includes('COUNT(*)')) {
                const userId = values[0] ? parseInt(values[0]) : null;
                const count = userId ? inMemoryStore.tickets.filter(t => t.user_id === userId && (t.status === 'Open' || t.status === 'In Progress')).length : inMemoryStore.tickets.length;
                return [[{ count }], []];
            }
            const userId = values[0] ? parseInt(values[0]) : null;
            let list = inMemoryStore.tickets;
            if (userId && !cleanSql.includes('JOIN')) {
                list = list.filter(t => t.user_id === userId);
            }
            return [list, []];
        }

        if (cleanSql.includes('INSERT INTO ticket_replies')) {
            const [ticketId, userId, message] = values;
            const newId = inMemoryStore.ticket_replies.length + 1;
            const user = inMemoryStore.users.find(u => u.id === parseInt(userId)) || { username: 'Support' };
            inMemoryStore.ticket_replies.push({
                id: newId,
                ticket_id: parseInt(ticketId),
                user_id: parseInt(userId),
                username: user.username,
                message,
                created_at: new Date()
            });
            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM ticket_replies')) {
            const ticketId = values[0] ? parseInt(values[0]) : null;
            const list = ticketId ? inMemoryStore.ticket_replies.filter(r => r.ticket_id === ticketId) : inMemoryStore.ticket_replies;
            return [list, []];
        }

        // PENDING DELIVERIES & ACCOUNT LINKS
        if (cleanSql.includes('INSERT INTO pending_deliveries')) {
            inMemoryStore.pending_deliveries.push({ id: inMemoryStore.pending_deliveries.length + 1, values, created_at: new Date() });
            return [{ insertId: inMemoryStore.pending_deliveries.length, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM pending_deliveries')) return [inMemoryStore.pending_deliveries, []];

        if (cleanSql.includes('INSERT INTO account_links')) {
            const [userId, mcUsername, mcUuid, verifyCode] = values;
            inMemoryStore.account_links.push({ id: inMemoryStore.account_links.length + 1, user_id: userId, mc_username: mcUsername, mc_uuid: mcUuid, is_verified: 1, created_at: new Date() });
            return [{ insertId: inMemoryStore.account_links.length, affectedRows: 1 }, []];
        }
        if (cleanSql.includes('FROM account_links')) return [inMemoryStore.account_links, []];

        // BUILD SHOWCASES & LIKES
        if (cleanSql.includes('INSERT INTO build_showcases')) {
            const newId = inMemoryStore.build_showcases.length + 1;
            const [user_id, title, description, image_url, category, coordinates] = values;
            const user = inMemoryStore.users.find(u => u.id === parseInt(user_id)) || { username: 'HyrostBuilder', role: 'Member', avatar_url: '' };
            const item = {
                id: newId,
                user_id: parseInt(user_id) || 1,
                title: title || 'Untitled Build',
                description: description || '',
                image_url: image_url || '',
                category: category || 'Survival Base',
                coordinates: coordinates || '',
                likes_count: 0,
                username: user.username,
                avatar_url: user.avatar_url,
                user_role: user.role || 'Member',
                created_at: new Date()
            };
            inMemoryStore.build_showcases.unshift(item);
            return [{ insertId: newId, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM build_showcases')) {
            let list = (inMemoryStore.build_showcases || []).map(s => {
                const u = inMemoryStore.users.find(user => user.id === s.user_id) || {};
                return {
                    ...s,
                    username: s.username || u.username || 'HyrostBuilder',
                    avatar_url: s.avatar_url || u.avatar_url || 'https://cravatar.eu/avatar/Steve/64.png',
                    user_role: s.user_role || u.role || 'Member'
                };
            });
            if (values && values.length > 0) {
                if (cleanSql.includes('WHERE s.id =') || cleanSql.includes('WHERE id =')) {
                    const id = parseInt(values[0]);
                    return [list.filter(s => s.id === id), []];
                }
                if (cleanSql.includes('LOWER(s.category) = LOWER(?)')) {
                    const cat = (values[0] || '').toLowerCase();
                    list = list.filter(s => (s.category || '').toLowerCase() === cat);
                }
            }
            if (cleanSql.includes('ORDER BY s.created_at DESC')) {
                list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else {
                list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
            }
            return [list, []];
        }

        if (cleanSql.includes('INSERT INTO showcase_likes')) {
            const [showcase_id, user_id] = values;
            inMemoryStore.showcase_likes.push({
                id: inMemoryStore.showcase_likes.length + 1,
                showcase_id: parseInt(showcase_id),
                user_id: parseInt(user_id),
                created_at: new Date()
            });
            return [{ insertId: inMemoryStore.showcase_likes.length, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('DELETE FROM showcase_likes')) {
            if (values && values.length) {
                inMemoryStore.showcase_likes = inMemoryStore.showcase_likes.filter(l => l.id !== values[0]);
            }
            return [{ affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM showcase_likes')) {
            let list = [...(inMemoryStore.showcase_likes || [])];
            if (cleanSql.includes('WHERE showcase_id = ? AND user_id = ?')) {
                const [sId, uId] = values;
                list = list.filter(l => l.showcase_id === parseInt(sId) && l.user_id === parseInt(uId));
            } else if (cleanSql.includes('WHERE user_id = ?')) {
                list = list.filter(l => l.user_id === parseInt(values[0]));
            }
            return [list, []];
        }

        // REFERRALS & CLAIMS
        if (cleanSql.includes('FROM referrals')) {
            const refUserId = values[0];
            const list = (inMemoryStore.referrals || []).filter(r => r.referrer_id === parseInt(refUserId)).map(r => {
                const u = inMemoryStore.users.find(user => user.id === r.referred_user_id) || {};
                return {
                    id: u.id || 1,
                    username: u.username || 'Friend',
                    avatar_url: u.avatar_url || 'https://cravatar.eu/avatar/Steve/32.png',
                    role: u.role || 'Member',
                    created_at: r.created_at || new Date()
                };
            });
            return [list, []];
        }

        if (cleanSql.includes('FROM referral_claims')) {
            const uId = values[0];
            const list = (inMemoryStore.referral_claims || []).filter(c => c.user_id === parseInt(uId));
            return [list, []];
        }

        if (cleanSql.includes('INSERT INTO referral_claims')) {
            const [uId, tier, details] = values;
            inMemoryStore.referral_claims.push({
                id: inMemoryStore.referral_claims.length + 1,
                user_id: parseInt(uId),
                milestone_tier: parseInt(tier),
                reward_details: details,
                claimed_at: new Date()
            });
            return [{ insertId: inMemoryStore.referral_claims.length, affectedRows: 1 }, []];
        }

        // UPLOADS TABLE
        if (cleanSql.includes('INSERT INTO uploads')) {
            const [user_id, original_name, stored_filename, mime_type, file_size, storage_driver, gdrive_file_id, gdrive_view_link, direct_url] = values;
            const item = {
                id: (inMemoryStore.uploads || []).length + 1,
                user_id: user_id ? parseInt(user_id) : null,
                original_name: original_name || 'file',
                stored_filename: stored_filename || 'file.jpg',
                mime_type: mime_type || 'image/jpeg',
                file_size: file_size || 0,
                storage_driver: storage_driver || 'local',
                gdrive_file_id: gdrive_file_id || null,
                gdrive_view_link: gdrive_view_link || null,
                direct_url: direct_url || '',
                created_at: new Date()
            };
            if (!inMemoryStore.uploads) inMemoryStore.uploads = [];
            inMemoryStore.uploads.unshift(item);
            return [{ insertId: item.id, affectedRows: 1 }, []];
        }

        if (cleanSql.includes('FROM uploads')) {
            let list = [...(inMemoryStore.uploads || [])];
            if (cleanSql.includes('WHERE user_id = ?')) {
                list = list.filter(u => u.user_id === parseInt(values[0]));
            }
            return [list, []];
        }

        // Generic Fallback Insert / Update / Delete
        return [{ insertId: Date.now(), affectedRows: 1 }, []];
        })();

        localDbSync.schedulePersist(inMemoryStore);
        return fallbackResult;
    },

    getConnection: async () => {
        await connectionReady;
        if (isConnected) {
            try {
                return await realPool.getConnection();
            } catch (err) {}
        }
        return {
            execute: async (sql, values) => poolWrapper.execute(sql, values),
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release: () => {}
        };
    }
};

poolWrapper.waitForDb = () => connectionReady;
poolWrapper.isMysqlConnected = () => isConnected;
poolWrapper.getStorageMode = () => (isConnected ? 'mysql' : 'local-file');

module.exports = poolWrapper;
