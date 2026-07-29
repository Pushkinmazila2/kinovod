// Слушаем сообщения (если понадобятся), но главное — инициализируем хранилище
chrome.runtime.onInstalled.addListener(() => {
  console.log("Kinovod Update Tracker успешно установлен!");
});

// Слушаем изменения в chrome.storage.local
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.trackedMovies) {
    const oldVal = changes.trackedMovies.oldValue || {};
    const newVal = changes.trackedMovies.newValue || {};

    // Проверяем, появились ли маркеры новых обновлений
    for (let id in newVal) {
      if (newVal[id].isNewUpdate && (!oldVal[id] || !oldVal[id].isNewUpdate)) {
        // Выводим системное уведомление на экран
        chrome.notifications.create(id, {
          type: 'basic',
          iconUrl: 'icon.png', // Сюда можно будет положить любую иконку 128x128 в папку
          title: 'Обновление на Киноводе!',
          message: `${newVal[id].title}\nНовая серия: ${newVal[id].lastLabel}`,
          priority: 2
        });
      }
    }
  }
});
