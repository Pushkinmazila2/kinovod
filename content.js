function scanFavoriteList() {
  const items = document.querySelectorAll('li.item');
  if (items.length === 0) return; // Если мы не на странице со списками, ничего не делаем

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
    const quality = yearEl ? yearEl.textContent.trim() : 'Неизвестно';

    scannedMovies[movieId] = {
      id: movieId,
      title: title,
      url: url,
      lastLabel: currentLabel,
      quality: quality,
      updatedAt: new Date().toLocaleString()
    };
  });

  chrome.storage.local.get({ trackedMovies: {} }, (result) => {
    const oldMovies = result.trackedMovies;

    for (let id in scannedMovies) {
      if (oldMovies[id]) {
        if (oldMovies[id].lastLabel !== scannedMovies[id].lastLabel || oldMovies[id].quality !== scannedMovies[id].quality) {
          scannedMovies[id].isNewUpdate = true;
        } else {
          scannedMovies[id].isNewUpdate = oldMovies[id].isNewUpdate || false;
        }
      } else {
        scannedMovies[id].isNewUpdate = false;
      }
    }

    chrome.storage.local.set({ trackedMovies: { ...oldMovies, ...scannedMovies } });
  });
}

// Запуск сканирования через 2 секунды после полной загрузки
setTimeout(scanFavoriteList, 2000);
