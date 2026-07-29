document.addEventListener('DOMContentLoaded', () => {
  const domainInput = document.getElementById('domain');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');

  // Загружаем сохраненный адрес (если его нет, ставим дефолтный)
  chrome.storage.local.get({ activeDomain: 'https://knvd1.xyz' }, (result) => {
    domainInput.value = result.activeDomain;
  });

  // Сохраняем новый адрес при клике
  saveButton.addEventListener('click', () => {
    let domain = domainInput.value.trim();
    
    // Убираем слеш в конце, если пользователь его случайно поставил
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1);
    }

    // Проверяем, ввел ли пользователь http/https
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain;
    }

    chrome.storage.local.set({ activeDomain: domain }, () => {
      statusDiv.textContent = 'Адрес успешно сохранен!';
      setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    });
  });
});
