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

interface Booking {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  startTime: string;
  hours: number;
  createdAt: string;
  bookingDate: string;
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
      const booking: Booking = req.body;
      
      if (!booking.id || !booking.name || !booking.startTime || !booking.bookingDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const data = await redis.get<Booking[]>(BOOKINGS_KEY);
      const bookings = data || [];
      
      // Проверяем, нет ли конфликта по времени
      const startHour = parseInt(booking.startTime.split(':')[0]);
      const requestedSlots = new Set<string>();
      for (let i = 0; i < booking.hours; i++) {
        requestedSlots.add(`${startHour + i}:00`);
      }
      
      const bookedSlots = new Set<string>();
      bookings
        .filter((b: Booking) => b.bookingDate === booking.bookingDate)
        .forEach((b: Booking) => {
          const bStartHour = parseInt(b.startTime.split(':')[0]);
          for (let i = 0; i < b.hours; i++) {
            bookedSlots.add(`${bStartHour + i}:00`);
          }
        });
      
      for (const slot of requestedSlots) {
        if (bookedSlots.has(slot)) {
          return res.status(409).json({ error: 'Time slot already booked' });
        }
      }
      
      bookings.push(booking);
      await redis.set(BOOKINGS_KEY, bookings);
      
      return res.status(201).json(booking);
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
