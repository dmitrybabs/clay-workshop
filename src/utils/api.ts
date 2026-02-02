import { Booking } from '../types/booking';

const API_URL = '/api/bookings';

// Определяем, работаем ли мы локально или на Vercel
const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Локальное хранилище как fallback
const STORAGE_KEY = 'clay_workshop_bookings';

function getLocalBookings(): Booking[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalBookings(bookings: Booking[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

// API функции с fallback на localStorage для локальной разработки
export async function fetchBookings(): Promise<Booking[]> {
  // При локальной разработке используем localStorage
  if (isLocalDev) {
    const bookings = getLocalBookings();
    // Очистка старых записей
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings.filter(b => new Date(b.bookingDate) >= today);
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }
    const data = await response.json();
    // Кэшируем в localStorage для быстрого отображения
    setLocalBookings(data);
    return data;
  } catch (error) {
    console.warn('API unavailable, using localStorage:', error);
    // Fallback на localStorage
    return getLocalBookings();
  }
}

export async function createBooking(booking: Booking): Promise<Booking> {
  // При локальной разработке используем localStorage
  if (isLocalDev) {
    const bookings = getLocalBookings();
    bookings.push(booking);
    setLocalBookings(bookings);
    return booking;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }

    const created = await response.json();
    // Обновляем локальный кэш
    const localBookings = getLocalBookings();
    localBookings.push(created);
    setLocalBookings(localBookings);
    return created;
  } catch (error) {
    console.warn('API unavailable, using localStorage:', error);
    // Fallback на localStorage
    const bookings = getLocalBookings();
    bookings.push(booking);
    setLocalBookings(bookings);
    return booking;
  }
}

export async function removeBooking(id: string): Promise<void> {
  // При локальной разработке используем localStorage
  if (isLocalDev) {
    const bookings = getLocalBookings().filter(b => b.id !== id);
    setLocalBookings(bookings);
    return;
  }

  try {
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete booking');
    }

    // Обновляем локальный кэш
    const localBookings = getLocalBookings().filter(b => b.id !== id);
    setLocalBookings(localBookings);
  } catch (error) {
    console.warn('API unavailable, using localStorage:', error);
    // Fallback на localStorage
    const bookings = getLocalBookings().filter(b => b.id !== id);
    setLocalBookings(bookings);
  }
}

// Utility функции (перенесены из storage.ts для удобства)
export function getNextSaturday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(0, 0, 0, 0);
  return nextSaturday;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getAvailableSlots(bookings: Booking[], date: string): string[] {
  const bookedSlots = new Set<string>();
  
  bookings
    .filter(b => b.bookingDate === date)
    .forEach(booking => {
      const startHour = parseInt(booking.startTime.split(':')[0]);
      for (let i = 0; i < booking.hours; i++) {
        bookedSlots.add(`${startHour + i}:00`);
      }
    });
  
  return ['10:00', '11:00', '12:00', '13:00'].filter(slot => !bookedSlots.has(slot));
}

export function getMaxHours(startTime: string, availableSlots: string[]): number {
  const startHour = parseInt(startTime.split(':')[0]);
  let maxHours = 0;
  
  for (let i = 0; i < 4; i++) {
    const checkSlot = `${startHour + i}:00`;
    if (availableSlots.includes(checkSlot) && startHour + i <= 13) {
      maxHours++;
    } else {
      break;
    }
  }
  
  const hoursUntilEnd = 14 - startHour;
  return Math.min(maxHours, hoursUntilEnd);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
