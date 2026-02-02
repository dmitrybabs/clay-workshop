export interface Booking {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  startTime: string;
  hours: number;
  createdAt: string;
  bookingDate: string; // Дата субботы на которую записались
}

export const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00'] as const;
export type TimeSlot = typeof TIME_SLOTS[number];

export const HOURS_OPTIONS = [1, 2, 3, 4] as const;
