export interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female';
  parentPhone: string; // Телефон родителей
  startTime: string;
  hours: number;
  totalPrice: number;
  createdAt: string;
  bookingDate: string; // Дата на которую записались
}

export const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00'] as const;
export type TimeSlot = typeof TIME_SLOTS[number];

export const HOURS_OPTIONS = [1, 2, 3, 4] as const;

export const PRICE_PER_HOUR = 700; // рублей за час

export const WORKSHOP_INFO = {
  name: 'Студия "Глиняная сказка"',
  address: 'г. Москва, ул. Творческая, д. 15',
  phone: '+7 (999) 123-45-67',
};
