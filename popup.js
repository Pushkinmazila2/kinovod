document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('list');
  const clearBtn = document.getElementById('clear-all');

  // Читаем базу данных
  chrome.storage.local.get({ trackedMovies: {} }, (result) => {
    const movies = result.trackedMovies;
    const keys = Object.keys(movies);

    if (keys.length === 0) {
      listContainer.innerHTML = '<p style="color:#aaa;">Список пуст. Зайдите на страницу "Избранного" на Киноводе для сканирования.</p>';
      return;
    }

    listContainer.innerHTML = ''; // Очищаем текст загрузки

    // Выводим каждый фильм
    keys.forEach(id => {
      const movie = movies[id];
      const item = document.createElement('div');
      item.className = 'movie-item';

      const updateBadge = movie.isNewUpdate ? '<span class="badge">NEW</span>' : '';

      item.innerHTML = `
        <div class="movie-info">
          <a href="https://knvd1.xyz${movie.url}" target="_blank" class="movie-title">${movie.title}</a>
          <div class="movie-meta">${movie.lastLabel} | ${movie.quality}</div>
        </div>
        ${updateBadge}
      `;
      listContainer.appendChild(item);
    });
  });

  // Кнопка сброса статуса "Новое"
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.get({ trackedMovies: {} }, (result) => {
      const movies = result.trackedMovies;
      for (let id in movies) {
        movies[id].isNewUpdate = false;
      }
      chrome.storage.local.set({ trackedMovies: movies }, () => {
        location.reload(); // Перезапускаем окно для обновления интерфейса
      });
    });
  });
});
