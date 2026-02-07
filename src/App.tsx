import { useState, useEffect } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Booking, TIME_SLOTS, PRICE_PER_HOUR, WORKSHOP_INFO } from './types/booking';
import { 
  createBooking,
  getNextSaturday, 
  formatDate, 
  generateId
} from './utils/api';

export function App() {
  const [currentPage, setCurrentPage] = useState<'app' | 'admin'>('app');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    
    if (page === 'admin') {
      setCurrentPage('admin');
    }
  }, []);

  return currentPage === 'admin' ? <AdminPanel /> : <TelegramMiniApp />;
}

function TelegramMiniApp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [parentPhone, setParentPhone] = useState('');
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<Booking | null>(null);
  // Блок "О мастерской" теперь всегда открыт
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const nextSaturday = getNextSaturday();
  const saturdayStr = nextSaturday.toISOString().split('T')[0];

  const totalPrice = hours * PRICE_PER_HOUR;

  // Расчёт максимально доступных часов в зависимости от времени начала
  const getAvailableHours = (time: string): number[] => {
    const startHour = parseInt(time.split(':')[0]);
    const endHour = 14; // Мастер-класс до 14:00
    const maxHours = endHour - startHour;
    return Array.from({ length: maxHours }, (_, i) => i + 1);
  };

  const availableHours = startTime ? getAvailableHours(startTime) : [1, 2, 3, 4];

  // Сброс часов если выбрано больше чем доступно
  useEffect(() => {
    if (startTime) {
      const maxHours = getAvailableHours(startTime).length;
      if (hours > maxHours) {
        setHours(maxHours);
      }
    }
  }, [startTime, hours]);

  const getEndTime = () => {
    if (!startTime) return '';
    const startHour = parseInt(startTime.split(':')[0]);
    return `${startHour + hours}:00`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !age || !gender || !startTime || !parentPhone) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    setSubmitting(true);

    try {
      const booking: Booking = {
        id: generateId(),
        firstName,
        lastName,
        age: parseInt(age),
        gender,
        parentPhone,
        startTime,
        hours,
        totalPrice,
        createdAt: new Date().toISOString(),
        bookingDate: saturdayStr
      };

      await createBooking(booking);
      setSubmittedBooking(booking);
      setSubmitted(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Произошла ошибка при записи. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && submittedBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Вы записаны! 🎉</h2>
          
          <div className="bg-amber-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <p className="text-gray-700">
              <span className="font-semibold">👤 Имя:</span> {submittedBooking.firstName} {submittedBooking.lastName}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">📞 Контакт:</span> {submittedBooking.parentPhone}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">📅 Дата:</span> {formatDate(nextSaturday)}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">⏰ Время:</span> {submittedBooking.startTime} - {getEndTime()}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">⏳ Длительность:</span> {submittedBooking.hours} ч.
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">📍 Адрес:</span> {WORKSHOP_INFO.address}
            </p>
            <div className="border-t border-amber-200 pt-2 mt-2">
              <p className="text-lg font-bold text-amber-700">
                💰 Итого: {submittedBooking.totalPrice} ₽
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4 text-left">
            <p className="text-blue-800 text-sm">
              📱 Подробности отправлены вам в этот чат!
            </p>
          </div>

          <p className="text-gray-600 text-sm mb-4">Ждём вас на мастер-классе! 🤲</p>
          
          <button
            onClick={() => {
              setSubmitted(false);
              setSubmittedBooking(null);
              setFirstName('');
              setLastName('');
              setAge('');
              setGender('');
              setParentPhone('');
              setStartTime('');
              setHours(1);
            }}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            ← Записать ещё одного ребёнка
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🤲</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{WORKSHOP_INFO.name}</h1>
            <p className="text-orange-100 text-sm">Творим вместе</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Banner - всегда открыт */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📍</span>
            <span className="font-semibold text-gray-800">О мастерской</span>
          </div>
          
          <div className="pt-4 border-t border-gray-100 space-y-3 text-sm text-gray-600">
            <p><span className="font-semibold">📍 Адрес:</span> {WORKSHOP_INFO.address}</p>
            <p><span className="font-semibold">📞 Телефон:</span> {WORKSHOP_INFO.phone}</p>
            <p><span className="font-semibold">⏰ Мастер-классы:</span> Каждую субботу с 10:00 до 14:00</p>
            <p><span className="font-semibold">💰 Стоимость:</span> {PRICE_PER_HOUR}₽/час (все материалы включены)</p>
            <p className="text-amber-700 mt-2">🎨 Мы научим вас создавать уникальные изделия из глины! Подходит для детей от 5 лет.</p>
          </div>
        </div>

        {/* Booking Info */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-semibold text-gray-800">Ближайший мастер-класс</p>
              <p className="text-orange-600 text-sm">{formatDate(nextSaturday)}</p>
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
              <span className="ml-2 text-gray-600">Загрузка...</span>
            </div>
          )}
        </div>

        {/* Booking Form */}
        {!loading && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-5 space-y-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>✍️</span> Форма записи
            </h2>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя ребёнка
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Например: Маша"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фамилия ребёнка
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Например: Иванова"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Возраст ребёнка
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Например: 7"
                min="3"
                max="17"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пол ребёнка
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-3 px-4 rounded-xl border-2 transition font-medium ${
                    gender === 'male'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  👦 Мальчик
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-3 px-4 rounded-xl border-2 transition font-medium ${
                    gender === 'female'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  👧 Девочка
                </button>
              </div>
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон родителя
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время начала
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setStartTime(slot)}
                    className={`py-3 px-2 rounded-xl border-2 transition font-medium text-sm ${
                      startTime === slot
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            {startTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество часов
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((h) => {
                    const isAvailable = availableHours.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => isAvailable && setHours(h)}
                        disabled={!isAvailable}
                        className={`py-3 px-2 rounded-xl border-2 transition font-medium ${
                          !isAvailable
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : hours === h
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {h} ч.
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Время занятия: {startTime} — {getEndTime()}
                </p>
                {availableHours.length < 4 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ℹ️ Мастер-класс длится до 14:00
                  </p>
                )}
              </div>
            )}

            {/* Price Display */}
            {startTime && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Стоимость:</span>
                  <span className="text-xl font-bold text-amber-700">{totalPrice} ₽</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {hours} ч. × {PRICE_PER_HOUR} ₽/час
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] active:scale-[0.98] ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Записываем...
                </span>
              ) : (
                'Записаться на мастер-класс 🎨'
              )}
            </button>
          </form>
        )}
        
        {/* Admin link */}
        <div className="text-center pt-4">
          <a 
            href="?page=admin" 
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            Панель администратора →
          </a>
        </div>
      </div>
    </div>
  );
}
