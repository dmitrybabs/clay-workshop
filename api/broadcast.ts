import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_PASSWORD = '2252525';

interface TelegramUser {
  id: number;
  chatId: number;
  firstName: string;
  lastName: string;
  username: string;
  subscribedAt: string;
}

async function sendMessageWithBase64Photo(
  chatId: number | string, 
  text: string, 
  photoBase64: string
): Promise<boolean> {
  // Извлекаем base64 данные из data URL
  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Создаём FormData для отправки файла
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  
  const formDataParts: string[] = [];
  
  // chat_id
  formDataParts.push(`--${boundary}`);
  formDataParts.push('Content-Disposition: form-data; name="chat_id"');
  formDataParts.push('');
  formDataParts.push(String(chatId));
  
  // caption
  formDataParts.push(`--${boundary}`);
  formDataParts.push('Content-Disposition: form-data; name="caption"');
  formDataParts.push('');
  formDataParts.push(text);
  
  // parse_mode
  formDataParts.push(`--${boundary}`);
  formDataParts.push('Content-Disposition: form-data; name="parse_mode"');
  formDataParts.push('');
  formDataParts.push('HTML');
  
  const textPart = formDataParts.join('\r\n') + '\r\n';
  
  // photo file part
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--\r\n`;
  
  // Собираем всё вместе
  const textBuffer = Buffer.from(textPart);
  const headerBuffer = Buffer.from(fileHeader);
  const footerBuffer = Buffer.from(fileFooter);
  
  const body = Buffer.concat([textBuffer, headerBuffer, buffer, footerBuffer]);
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: body,
  });
  
  return response.ok;
}

async function sendMessage(chatId: number | string, text: string, photo?: string, photoBase64?: string) {
  // Если есть base64 фото, отправляем через multipart/form-data
  if (photoBase64) {
    return sendMessageWithBase64Photo(chatId, text, photoBase64);
  }
  
  if (photo) {
    // Отправляем фото по URL
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photo,
        caption: text,
        parse_mode: 'HTML',
      }),
    });
    
    return response.ok;
  } else {
    // Отправляем только текст
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });
    
    return response.ok;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — получить список подписчиков
  if (req.method === 'GET') {
    const { password } = req.query;
    
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const usersData = await redis.hgetall('telegram_users');
      
      if (!usersData) {
        return res.status(200).json({ users: [], count: 0 });
      }

      const users: TelegramUser[] = Object.values(usersData).map(u => 
        typeof u === 'string' ? JSON.parse(u) : u
      );

      return res.status(200).json({ 
        users,
        count: users.length 
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // POST — отправить рассылку
  if (req.method === 'POST') {
    const { password, message, photo, photoBase64 } = req.body;

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const usersData = await redis.hgetall('telegram_users');
      
      if (!usersData || Object.keys(usersData).length === 0) {
        return res.status(200).json({ 
          success: true, 
          sent: 0, 
          failed: 0,
          message: 'No subscribers yet' 
        });
      }

      const users: TelegramUser[] = Object.values(usersData).map(u => 
        typeof u === 'string' ? JSON.parse(u) : u
      );

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const success = await sendMessage(user.chatId, message, photo, photoBase64);
          if (success) {
            sent++;
          } else {
            failed++;
          }
          // Небольшая задержка чтобы не превысить лимит Telegram API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send to ${user.chatId}:`, error);
          failed++;
        }
      }

      return res.status(200).json({ 
        success: true, 
        sent, 
        failed,
        total: users.length 
      });
    } catch (error) {
      console.error('Broadcast error:', error);
      return res.status(500).json({ error: 'Failed to send broadcast' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
