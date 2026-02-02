import { useState, useEffect, useCallback } from 'react';
import { Booking } from '../types/booking';
import { fetchBookings, removeBooking, formatDate } from '../utils/api';

const ADMIN_PASSWORD = '2252525';

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Проверяем сохранённую сессию
    const session = sessionStorage.getItem('admin_authenticated');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const allBookings = await fetchBookings();
      // Сортируем по дате и времени
      allBookings.sort((a, b) => {
        if (a.bookingDate !== b.bookingDate) {
          return a.bookingDate.localeCompare(b.bookingDate);
        }
        return a.startTime.localeCompare(b.startTime);
      });
      setBookings(allBookings);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings();
      // Автообновление каждые 30 секунд
      const interval = setInterval(loadBookings, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadBookings]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setError('');
    } else {
      setError('Неверный пароль');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить эту запись?')) {
      try {
        await removeBooking(id);
        await loadBookings();
      } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Ошибка при удалении записи');
      }
    }
  };

  const getEndTime = (startTime: string, hours: number): string => {
    const startHour = parseInt(startTime.split(':')[0]);
    return `${startHour + hours}:00`;
  };

  const uniqueDates = [...new Set(bookings.map(b => b.bookingDate))].sort();
  
  const filteredBookings = selectedDate === 'all' 
    ? bookings 
    : bookings.filter(b => b.bookingDate === selectedDate);

  const getBookingsByTimeSlot = (date: string) => {
    const dayBookings = bookings.filter(b => b.bookingDate === date);
    const slots: { [key: string]: Booking | null } = {
      '10:00': null,
      '11:00': null,
      '12:00': null,
      '13:00': null
    };

    dayBookings.forEach(booking => {
      const startHour = parseInt(booking.startTime.split(':')[0]);
      for (let i = 0; i < booking.hours; i++) {
        const slotKey = `${startHour + i}:00`;
        if (slots.hasOwnProperty(slotKey)) {
          slots[slotKey] = booking;
        }
      }
    });

    return slots;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Записная книжка</h1>
            <p className="text-gray-500 mt-2">Глиняная Мастерская</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль администратора
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition"
            >
              Войти
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <a 
              href="/" 
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ← Вернуться в приложение
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Записная книжка</h1>
              <p className="text-sm text-gray-500">Глиняная Мастерская</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Connection Status */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-700 text-sm">
            Данные синхронизируются в реальном времени (обновление каждые 30 сек)
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Всего записей</p>
            <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Мальчиков</p>
            <p className="text-2xl font-bold text-blue-600">
              {bookings.filter(b => b.gender === 'male').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Девочек</p>
            <p className="text-2xl font-bold text-pink-600">
              {bookings.filter(b => b.gender === 'female').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Всего часов</p>
            <p className="text-2xl font-bold text-amber-600">
              {bookings.reduce((acc, b) => acc + b.hours, 0)}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Фильтр по дате
          </label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-200 focus:border-amber-500 outline-none"
          >
            <option value="all">Все даты</option>
            {uniqueDates.map(date => (
              <option key={date} value={date}>
                {formatDate(new Date(date))}
              </option>
            ))}
          </select>
        </div>

        {/* Time Grid for selected date */}
        {selectedDate !== 'all' && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">
              Расписание на {formatDate(new Date(selectedDate))}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(getBookingsByTimeSlot(selectedDate)).map(([time, booking]) => (
                <div
                  key={time}
                  className={`p-3 rounded-lg text-center ${
                    booking 
                      ? 'bg-amber-100 border-2 border-amber-300' 
                      : 'bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <p className="font-bold text-gray-800">{time}</p>
                  {booking && (
                    <p className="text-sm text-amber-700 truncate">{booking.name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
            <span className="ml-2 text-gray-600">Загрузка...</span>
          </div>
        )}

        {/* Table */}
        {!loading && filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-gray-500">Нет записей</p>
          </div>
        ) : !loading && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Дата</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Время</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Часов</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Имя</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Возраст</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Пол</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(booking.bookingDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {booking.startTime} — {getEndTime(booking.startTime, booking.hours)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {booking.hours} ч.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {booking.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {booking.age} лет
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          booking.gender === 'male' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {booking.gender === 'male' ? '👦 М' : '👧 Ж'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Refresh button */}
        <div className="text-center">
          <button
            onClick={loadBookings}
            disabled={loading}
            className="text-amber-600 hover:text-amber-700 font-medium text-sm disabled:opacity-50"
          >
            🔄 Обновить данные
          </button>
        </div>
      </main>
    </div>
  );
}
