import { Booking } from '../types/booking';

const STORAGE_KEY = 'clay_workshop_bookings';

export function getBookings(): Booking[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addBooking(booking: Booking): void {
  const bookings = getBookings();
  bookings.push(booking);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function deleteBooking(id: string): void {
  const bookings = getBookings().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function clearOldBookings(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookings = getBookings().filter(b => {
    const bookingDate = new Date(b.bookingDate);
    return bookingDate >= today;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function getNextSaturday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(0, 0, 0, 0);
  return nextSaturday;
}

export function isFriday(): boolean {
  return new Date().getDay() === 5;
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
  
  // Также учитываем, что мастер-класс заканчивается в 14:00
  const hoursUntilEnd = 14 - startHour;
  return Math.min(maxHours, hoursUntilEnd);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
