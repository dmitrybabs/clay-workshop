import { useState, useEffect } from 'react';

interface Subscriber {
  id: number;
  chatId: number;
  firstName: string;
  lastName: string;
  username: string;
  subscribedAt: string;
}

interface BroadcastPanelProps {
  onBack: () => void;
}

export default function BroadcastPanel({ onBack }: BroadcastPanelProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  const API_URL = isProduction ? '/api/broadcast' : '';
  const PASSWORD = '2252525';

  // Обработка загрузки фото с телефона
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой! Максимум 5MB');
      return;
    }

    // Проверка типа
    if (!file.type.startsWith('image/')) {
      alert('Можно загружать только изображения!');
      return;
    }

    setUploadingImage(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      setPhotoPreview(base64);
      setPhotoUrl(''); // Очищаем URL если загружено фото
      setUploadingImage(false);
    };
    reader.onerror = () => {
      alert('Ошибка при загрузке изображения');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Очистить загруженное фото
  const clearPhoto = () => {
    setPhotoBase64('');
    setPhotoPreview('');
    setPhotoUrl('');
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    if (!API_URL) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?password=${PASSWORD}`);
      const data = await response.json();
      setSubscribers(data.users || []);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!message.trim()) {
      alert('Напишите сообщение!');
      return;
    }

    if (!confirm(`Отправить сообщение ${subscribers.length} подписчикам?`)) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: PASSWORD,
          message: message.trim(),
          photo: photoUrl.trim() || undefined,
          photoBase64: photoBase64 || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ sent: data.sent, failed: data.failed });
        setMessage('');
        setPhotoUrl('');
        setPhotoBase64('');
        setPhotoPreview('');
      } else {
        alert('Ошибка отправки: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      alert('Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              ← Назад к записям
            </button>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📢 Рассылка сообщений
          </h1>
          <p className="text-gray-600 mt-1">
            Отправка новостей и акций подписчикам бота
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 rounded-xl p-4 flex-1 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {loading ? '...' : subscribers.length}
              </div>
              <div className="text-orange-800 text-sm">Подписчиков</div>
            </div>
            <button
              onClick={fetchSubscribers}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              🔄 Обновить
            </button>
          </div>
        </div>

        {/* Compose Message */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">✍️ Написать сообщение</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст сообщения *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Напишите текст сообщения для подписчиков...

Можно использовать HTML-разметку:
<b>жирный</b>
<i>курсив</i>
<u>подчёркнутый</u>"
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Загрузка фото */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📷 Добавить изображение (необязательно)
              </label>
              
              {/* Кнопка загрузки с телефона */}
              <div className="space-y-3">
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <span className="text-gray-500">⏳ Загрузка...</span>
                  ) : (
                    <>
                      <span className="text-2xl">📱</span>
                      <span className="text-gray-600">Выбрать фото из галереи</span>
                    </>
                  )}
                </label>

                {/* Превью загруженного фото */}
                {photoPreview && (
                  <div className="relative inline-block">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="max-w-xs max-h-48 rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Или ссылка на изображение */}
                {!photoPreview && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-xs text-gray-400">или вставьте ссылку</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                )}

                {!photoPreview && (
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                )}
              </div>
            </div>

            {/* Preview */}
            {message && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="text-sm text-gray-500 mb-2">Предпросмотр:</div>
                {(photoPreview || photoUrl) && (
                  <img 
                    src={photoPreview || photoUrl} 
                    alt="Preview" 
                    className="max-w-xs rounded-lg mb-2"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div 
                  className="text-gray-800 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: message
                      .replace(/</g, '&lt;')
                      .replace(/&lt;b&gt;/g, '<b>')
                      .replace(/&lt;\/b&gt;/g, '</b>')
                      .replace(/&lt;i&gt;/g, '<i>')
                      .replace(/&lt;\/i&gt;/g, '</i>')
                      .replace(/&lt;u&gt;/g, '<u>')
                      .replace(/&lt;\/u&gt;/g, '</u>')
                  }}
                />
              </div>
            )}

            <button
              onClick={sendBroadcast}
              disabled={sending || !message.trim() || subscribers.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {sending ? '⏳ Отправка...' : `📤 Отправить ${subscribers.length} подписчикам`}
            </button>

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-green-800 font-medium">
                  ✅ Отправлено: {result.sent}
                  {result.failed > 0 && (
                    <span className="text-red-600 ml-4">❌ Ошибок: {result.failed}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subscribers List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">👥 Список подписчиков</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Загрузка...</div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <div className="text-gray-500">Пока нет подписчиков</div>
              <div className="text-sm text-gray-400 mt-2">
                Подписчики появятся, когда пользователи напишут боту /start
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Имя</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Username</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Подписался</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {sub.firstName} {sub.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.username ? `@${sub.username}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(sub.subscribedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
