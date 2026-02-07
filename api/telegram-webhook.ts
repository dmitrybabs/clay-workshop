import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Поддержка нескольких админов через запятую: 917022431,706357294
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '917022431,706357294').split(',').map(id => id.trim());

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function sendMessage(chatId: number | string, text: string, parseMode: string = 'HTML') {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST запросы от Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update: TelegramUpdate = req.body;

    if (update.message) {
      const message = update.message;
      const user = message.from;
      const chatId = message.chat.id;
      const text = message.text || '';

      // Сохраняем пользователя в Redis
      const userData = {
        id: user.id,
        chatId: chatId,
        firstName: user.first_name,
        lastName: user.last_name || '',
        username: user.username || '',
        subscribedAt: new Date().toISOString(),
      };

      await redis.hset('telegram_users', { [user.id.toString()]: JSON.stringify(userData) });

      // Обрабатываем команды
      if (text === '/start') {
        await sendMessage(chatId, `
🤲 <b>Добро пожаловать в Студию керамики «Майолика»!</b>

Здесь вы можете:
• Записаться на мастер-класс
• Получать новости и акции

📍 <b>Адрес:</b> Токсово, Привокзальная пл. 1 (здание Токсовской бани)
📞 <b>Телефон:</b> +7 (921) 755-92-88
⏰ <b>Мастер-классы:</b> Каждую субботу с 10:00 до 14:00

Нажмите кнопку меню ниже, чтобы записаться! 👇
        `.trim());
      } else if (text === '/help') {
        await sendMessage(chatId, `
🤲 <b>Студия керамики «Майолика»</b>

<b>Доступные команды:</b>
/start — Начать
/help — Помощь
/info — О мастерской
/price — Цены

Чтобы записаться на мастер-класс, нажмите кнопку меню!
        `.trim());
      } else if (text === '/info') {
        await sendMessage(chatId, `
🤲 <b>О нашей мастерской</b>

Студия керамики «Майолика» — это уютное место, где дети и взрослые учатся создавать уникальные изделия из глины.

📍 <b>Адрес:</b> Токсово, Привокзальная пл. 1 (здание Токсовской бани)

📞 <b>Телефон:</b> +7 (921) 755-92-88

⏰ <b>Режим работы:</b>
Мастер-классы проводятся каждую субботу с 10:00 до 14:00

🎨 Подходит для детей от 5 лет!
        `.trim());
      } else if (text === '/price') {
        await sendMessage(chatId, `
💰 <b>Стоимость мастер-классов</b>

• 1 час — 700 ₽
• 2 часа — 1 400 ₽
• 3 часа — 2 100 ₽
• 4 часа — 2 800 ₽

✅ Все материалы включены в стоимость!

Записывайтесь через кнопку меню 👇
        `.trim());
      } else {
        // Обычное сообщение — отправляем подсказку
        await sendMessage(chatId, `
Чтобы записаться на мастер-класс, нажмите кнопку меню внизу экрана 👇

Или используйте команды:
/info — О мастерской
/price — Цены
        `.trim());
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
