// Функция сбора данных со страницы
function scanFavoriteList() {
  const items = document.querySelectorAll('li.item');
  const scannedMovies = {};

  items.forEach(item => {
    const favButton = item.querySelector('button.favorite');
    if (!favButton) return;

    const movieId = favButton.getAttribute('data-movie-id');
    const titleEl = item.querySelector('.title a');
    const labelEl = item.querySelector('.label');
    const yearEl = item.querySelector('.year');

    const title = titleEl ? titleEl.textContent.trim() : 'Без названия';
    const url = titleEl ? titleEl.getAttribute('href') : '#';
    const currentLabel = labelEl ? labelEl.textContent.trim() : 'Фильм / Вышел';
    const quality = yearEl ? yearEl.textContent.trim().split(', ')[1] || 'Неизвестно' : 'Неизвестно';

    scannedMovies[movieId] = {
      id: movieId,
      title: title,
      url: url,
      lastLabel: currentLabel,
      quality: quality,
      updatedAt: new Date().toLocaleString()
    };
  });

  // Сравниваем со старыми данными в базе и обновляем ее
  chrome.storage.local.get({ trackedMovies: {} }, (result) => {
    const oldMovies = result.trackedMovies;
    let hasUpdates = false;

    for (let id in scannedMovies) {
      // Если этот фильм уже был в базе, проверяем, изменилась ли серия или качество
      if (oldMovies[id]) {
        if (oldMovies[id].lastLabel !== scannedMovies[id].lastLabel || oldMovies[id].quality !== scannedMovies[id].quality) {
          console.log(`Обновление найдено для: ${scannedMovies[id].title}`);
          scannedMovies[id].isNewUpdate = true; // Ставим маркер "Новое!"
          hasUpdates = true;
        } else {
          // Сохраняем маркер новизны, если пользователь его еще не сбросил
          scannedMovies[id].isNewUpdate = oldMovies[id].isNewUpdate || false;
        }
      } else {
        // Если фильма вообще не было в базе — это новое добавление
        scannedMovies[id].isNewUpdate = false;
      }
    }

    // Записываем обновленный массив обратно в Chrome Storage
    chrome.storage.local.set({ trackedMovies: { ...oldMovies, ...scannedMovies } });
  });
}

// Запускаем сканирование при загрузке страницы
setTimeout(scanFavoriteList, 2000); 
