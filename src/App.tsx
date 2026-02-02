import { useState, useEffect } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Booking, TIME_SLOTS } from './types/booking';
import { 
  fetchBookings, 
  createBooking,
  getNextSaturday, 
  formatDate, 
  getAvailableSlots,
  getMaxHours,
  generateId
} from './utils/api';

export function App() {
  const [currentPage, setCurrentPage] = useState<'app' | 'admin'>('app');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const demo = params.get('demo');
    
    if (page === 'admin') {
      setCurrentPage('admin');
    }
    
    if (demo === 'true') {
      setIsDemo(true);
    }
  }, []);

  return currentPage === 'admin' ? <AdminPanel /> : <MiniAppWithDemo isDemo={isDemo} />;
}

function MiniAppWithDemo({ isDemo }: { isDemo: boolean }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [maxHours, setMaxHours] = useState(4);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const nextSaturday = getNextSaturday();
  const saturdayStr = nextSaturday.toISOString().split('T')[0];
  
  // В демо-режиме всегда можно записаться
  const canBook = isDemo || new Date().getDay() === 5;

  useEffect(() => {
    loadBookings();
  }, [saturdayStr]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const bookings = await fetchBookings();
      const slots = getAvailableSlots(bookings, saturdayStr);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startTime) {
      const max = getMaxHours(startTime, availableSlots);
      setMaxHours(max);
      if (hours > max) {
        setHours(max);
      }
    }
  }, [startTime, availableSlots, hours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !age || !gender || !startTime) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    setSubmitting(true);

    try {
      const booking: Booking = {
        id: generateId(),
        name,
        age: parseInt(age),
        gender,
        startTime,
        hours,
        createdAt: new Date().toISOString(),
        bookingDate: saturdayStr
      };

      await createBooking(booking);
      setSubmitted(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Произошла ошибка при записи. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const getEndTime = () => {
    if (!startTime) return '';
    const startHour = parseInt(startTime.split(':')[0]);
    return `${startHour + hours}:00`;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Вы записаны! 🎉</h2>
          <div className="bg-amber-50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-gray-700 mb-2"><span className="font-semibold">Имя:</span> {name}</p>
            <p className="text-gray-700 mb-2"><span className="font-semibold">Дата:</span> {formatDate(nextSaturday)}</p>
            <p className="text-gray-700 mb-2"><span className="font-semibold">Время:</span> {startTime} - {getEndTime()}</p>
            <p className="text-gray-700"><span className="font-semibold">Длительность:</span> {hours} ч.</p>
          </div>
          <p className="text-gray-600 text-sm mb-4">Ждём вас на мастер-классе! 🏺</p>
          <button
            onClick={async () => {
              setSubmitted(false);
              setName('');
              setAge('');
              setGender('');
              setStartTime('');
              setHours(1);
              await loadBookings();
            }}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            ← Записать ещё одного ребёнка
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-blue-600 text-white text-center py-2 text-sm">
          🧪 Демо-режим: запись доступна в любой день
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🏺</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Глиняная Мастерская</h1>
            <p className="text-amber-100 text-sm">Творим вместе</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Banner */}
        <div 
          className="bg-white rounded-2xl shadow-md p-4 cursor-pointer"
          onClick={() => setShowInfo(!showInfo)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <span className="font-semibold text-gray-800">О мастерской</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showInfo ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {showInfo && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-sm text-gray-600">
              <p><span className="font-semibold">📍 Адрес:</span> г. Москва, ул. Творческая, д. 15</p>
              <p><span className="font-semibold">📞 Телефон:</span> +7 (999) 123-45-67</p>
              <p><span className="font-semibold">📧 Email:</span> hello@clay-workshop.ru</p>
              <p><span className="font-semibold">⏰ Мастер-классы:</span> Каждую субботу с 10:00 до 14:00</p>
              <p><span className="font-semibold">💰 Стоимость:</span> 1500₽/час (все материалы включены)</p>
              <p className="text-amber-700 mt-2">🎨 Мы научим вас создавать уникальные изделия из глины! Подходит для детей от 5 лет.</p>
            </div>
          )}
        </div>

        {/* Booking Info */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-semibold text-gray-800">Ближайший мастер-класс</p>
              <p className="text-amber-600 text-sm">{formatDate(nextSaturday)}</p>
            </div>
          </div>
          
          {!canBook && (
            <div className="bg-amber-50 rounded-xl p-3 mt-3">
              <p className="text-amber-800 text-sm">
                ⚠️ Запись открывается в <span className="font-bold">пятницу</span>. 
                Приходите в пятницу, чтобы записаться на субботу!
              </p>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
              <span className="ml-2 text-gray-600">Загрузка...</span>
            </div>
          ) : availableSlots.length === 0 && canBook && (
            <div className="bg-red-50 rounded-xl p-3 mt-3">
              <p className="text-red-700 text-sm">
                😔 К сожалению, все места на эту субботу заняты.
              </p>
            </div>
          )}
        </div>

        {/* Booking Form */}
        {canBook && availableSlots.length > 0 && !loading && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-5 space-y-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>✍️</span> Форма записи
            </h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя ребёнка
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Маша"
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

            {/* Time Slot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время начала
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isAvailable = availableSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => isAvailable && setStartTime(slot)}
                      disabled={!isAvailable}
                      className={`py-3 px-2 rounded-xl border-2 transition font-medium text-sm ${
                        startTime === slot
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : isAvailable
                          ? 'border-gray-200 text-gray-600 hover:border-gray-300'
                          : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
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
                    const isAvailable = h <= maxHours;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => isAvailable && setHours(h)}
                        disabled={!isAvailable}
                        className={`py-3 px-2 rounded-xl border-2 transition font-medium ${
                          hours === h
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : isAvailable
                            ? 'border-gray-200 text-gray-600 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {h} ч.
                      </button>
                    );
                  })}
                </div>
                {startTime && (
                  <p className="text-sm text-gray-500 mt-2">
                    Время занятия: {startTime} — {getEndTime()}
                  </p>
                )}
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

        {/* Demo mode hint */}
        {!canBook && !isDemo && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <p className="text-blue-800 text-sm text-center">
              💡 <strong>Для тестирования:</strong> добавьте <code className="bg-blue-100 px-1 rounded">?demo=true</code> к адресу, чтобы записаться в любой день
            </p>
          </div>
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
