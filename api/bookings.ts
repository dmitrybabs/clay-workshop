import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Инициализация Redis из переменных окружения
const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    throw new Error('Redis credentials not configured');
  }
  
  return new Redis({ url, token });
};

const BOOKINGS_KEY = 'clay_workshop_bookings';
const PRICE_PER_HOUR = 700;

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female';
  parentPhone: string;
  startTime: string;
  hours: number;
  totalPrice: number;
  createdAt: string;
  bookingDate: string;
}

// Информация о мастерской
const WORKSHOP_INFO = {
  name: 'Студия керамики «Майолика»',
  address: 'Токсово, Привокзальная пл. 1 (здание Токсовской бани)',
  phone: '+7 (921) 755-92-88',
};

// Отправка сообщения в Telegram всем админам
async function sendTelegramNotification(booking: Booking): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // Поддержка нескольких админов через запятую: 917022431,706357294
  const adminIds = process.env.TELEGRAM_ADMIN_IDS?.split(',').map(id => id.trim()) || [];
  
  if (!botToken || adminIds.length === 0) {
    console.log('Telegram credentials not configured, skipping notification');
    return;
  }

  const bookingDate = new Date(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const startHour = parseInt(booking.startTime.split(':')[0]);
  const endTime = `${startHour + booking.hours}:00`;

  const message = `
🎨 *Новая запись на мастер-класс!*

👤 *Кто:* ${booking.firstName} ${booking.lastName}
👶 *Возраст:* ${booking.age} лет
${booking.gender === 'male' ? '👦' : '👧'} *Пол:* ${booking.gender === 'male' ? 'Мальчик' : 'Девочка'}
📞 *Телефон родителя:* ${booking.parentPhone}

📅 *Когда:* ${formattedDate}
⏰ *Время:* ${booking.startTime} — ${endTime}
⏳ *Длительность:* ${booking.hours} ч.

📍 *Адрес:* ${WORKSHOP_INFO.address}

💰 *Стоимость:* ${booking.totalPrice} ₽
`.trim();

  // Отправляем уведомление каждому админу
  for (const adminId of adminIds) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: adminId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to send notification to admin ${adminId}:`, error);
      } else {
        console.log(`Notification sent to admin ${adminId}`);
      }
    } catch (error) {
      console.error(`Error sending notification to admin ${adminId}:`, error);
    }
  }
}

// Отправка сообщения пользователю в Mini App
async function sendUserConfirmation(booking: Booking, userId?: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken || !userId) {
    console.log('Cannot send user confirmation: missing bot token or user ID');
    return;
  }

  const bookingDate = new Date(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const startHour = parseInt(booking.startTime.split(':')[0]);
  const endTime = `${startHour + booking.hours}:00`;

  const message = `
✅ *Вы записаны на мастер-класс!*

👤 *Участник:* ${booking.firstName} ${booking.lastName}

📅 *Дата:* ${formattedDate}
⏰ *Время:* ${booking.startTime} — ${endTime}
⏳ *Длительность:* ${booking.hours} ч.

📍 *Куда приходить:*
${WORKSHOP_INFO.address}

📞 *Телефон:* ${WORKSHOP_INFO.phone}

💰 *Стоимость:* ${booking.totalPrice} ₽

🎨 Ждём вас! Не забудьте взять сменную одежду.
`.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: userId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send user confirmation:', error);
    } else {
      console.log('User confirmation sent successfully');
    }
  } catch (error) {
    console.error('Error sending user confirmation:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const redis = getRedis();

    // GET - получить все записи
    if (req.method === 'GET') {
      const data = await redis.get<Booking[]>(BOOKINGS_KEY);
      const bookings = data || [];
      
      // Очистка старых записей (до сегодняшней даты)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeBookings = bookings.filter((b: Booking) => {
        const bookingDate = new Date(b.bookingDate);
        return bookingDate >= today;
      });
      
      // Если были удалены старые записи, обновляем в базе
      if (activeBookings.length !== bookings.length) {
        await redis.set(BOOKINGS_KEY, activeBookings);
      }
      
      return res.status(200).json(activeBookings);
    }

    // POST - добавить новую запись
    if (req.method === 'POST') {
      const { booking, telegramUserId } = req.body;
      
      // Поддержка старого формата (без обёртки)
      const bookingData: Booking = booking || req.body;
      
      if (!bookingData.id || !bookingData.firstName || !bookingData.startTime || !bookingData.bookingDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Убедимся, что цена установлена
      if (!bookingData.totalPrice) {
        bookingData.totalPrice = bookingData.hours * PRICE_PER_HOUR;
      }
      
      const data = await redis.get<Booking[]>(BOOKINGS_KEY);
      const bookings = data || [];
      
      bookings.push(bookingData);
      await redis.set(BOOKINGS_KEY, bookings);
      
      // Отправляем уведомление админу
      await sendTelegramNotification(bookingData);
      
      // Отправляем подтверждение пользователю (если есть Telegram ID)
      if (telegramUserId) {
        await sendUserConfirmation(bookingData, telegramUserId);
      }
      
      return res.status(201).json(bookingData);
    }

    // DELETE - удалить запись
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing booking id' });
      }
      
      const data = await redis.get<Booking[]>(BOOKINGS_KEY);
      const bookings = data || [];
      const filteredBookings = bookings.filter((b: Booking) => b.id !== id);
      
      if (filteredBookings.length === bookings.length) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      await redis.set(BOOKINGS_KEY, filteredBookings);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    
    // Если Redis не настроен, возвращаем пустой массив для GET
    if (req.method === 'GET') {
      return res.status(200).json([]);
    }
    
    return res.status(500).json({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
