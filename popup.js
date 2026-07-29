document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('list');
  const clearBtn = document.getElementById('clear-all');

  // Читаем фильмы и сохраненный домен
  chrome.storage.local.get({ trackedMovies: {}, activeDomain: 'https://knvd1.xyz' }, (result) => {
    const movies = result.trackedMovies;
    const domain = result.activeDomain; // Ипользуем динамический домен сайта
    const keys = Object.keys(movies);

    if (keys.length === 0) {
      listContainer.innerHTML = '<p style="color:#aaa;">Список пуст. Зайдите на страницу вашего "Избранного" на Киноводе для сканирования.</p>';
      return;
    }

    listContainer.innerHTML = '';

    keys.forEach(id => {
      const movie = movies[id];
      const item = document.createElement('div');
      item.className = 'movie-item';

      const updateBadge = movie.isNewUpdate ? '<span class="badge">NEW</span>' : '';

      // Подставляем актуальный домен к ссылке
      item.innerHTML = `
        <div class="movie-info">
          <a href="${domain}${movie.url}" target="_blank" class="movie-title">${movie.title}</a>
          <div class="movie-meta">${movie.lastLabel} | ${movie.quality}</div>
        </div>
        ${updateBadge}
      `;
      listContainer.appendChild(item);
    });
  });

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.get({ trackedMovies: {} }, (result) => {
      const movies = result.trackedMovies;
      for (let id in movies) {
        movies[id].isNewUpdate = false;
      }
      chrome.storage.local.set({ trackedMovies: movies }, () => {
        location.reload();
      });
    });
  });
});
