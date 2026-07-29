import os
import json
import time
import random
import urllib.parse
import psycopg2
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("SITE_HOST") ""
CATEGORIES = ["/animation", "/tv", "/serials", "/films"]

DB_CONFIG = {
    "host": os.environ.get("DB_HOST"),
    "database": os.environ.get("DB_NAME"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"), 
    "port": int(os.environ.get("DB_PORT"))
}

PASSWORD = os.environ.get("SITE_PASSWORD")
PAGES_TO_PARSE = 2

def init_db():
    """Создает таблицу в PostgreSQL, если она не существует."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content (
                id SERIAL PRIMARY KEY,
                kinovod_id TEXT UNIQUE,
                title TEXT,
                type TEXT,
                url TEXT,
                poster TEXT,
                rating TEXT,
                year TEXT,
                last_state TEXT,
                updated_at TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
        print("База данных PostgreSQL успешно инициализирована.")
    except Exception as e:
        print(f"Ошибка при подключении к PostgreSQL (init): {e}")

def save_to_db(data):
    """Сохраняет запись в PostgreSQL. Обновляет дубликаты по уникальному kinovod_id."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        current_time = datetime.now()
        
        query = """
            INSERT INTO content (
                kinovod_id, title, type, url, poster, rating, year, last_state, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (kinovod_id) DO UPDATE SET
                title = EXCLUDED.title,
                type = EXCLUDED.type,
                url = EXCLUDED.url,
                poster = EXCLUDED.poster,
                rating = EXCLUDED.rating,
                year = EXCLUDED.year,
                last_state = EXCLUDED.last_state,
                updated_at = EXCLUDED.updated_at
        """
        
        cursor.execute(query, (
            data.get("kinovod_id"),
            data.get("title"),
            data.get("type"),
            data.get("url"),
            data.get("poster"),
            data.get("rating"),
            data.get("year"),
            data.get("last_state"),
            current_time
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Ошибка записи в базу данных: {e}")

def parse_item(item_html):
    """Парсит одну карточку контента."""
    data = {}
    
    link_element = item_html.select_one(".title a")
    if link_element and link_element.get("href"):
        relative_url = link_element.get("href")
        data["url"] = urllib.parse.urljoin(BASE_URL, relative_url)
        url_parts = relative_url.strip("/").split("/")
        data["type"] = url_parts[0] if url_parts else "unknown"
    
    fav_button = item_html.select_one("button.favorite")
    if fav_button and fav_button.get("data-movie-id"):
        data["kinovod_id"] = fav_button.get("data-movie-id")
    else:
        return None
        
    if link_element:
        data["title"] = link_element.text.strip()
        
    img_element = item_html.select_one(".poster img")
    if img_element and img_element.get("src"):
        data["poster"] = urllib.parse.urljoin(BASE_URL, img_element.get("src"))
        
    label_element = item_html.select_one(".poster .label")
    data["last_state"] = label_element.text.strip() if label_element else None
    
    rating_element = item_html.select_one(".rating")
    data["rating"] = rating_element.text.strip() if rating_element else None
    
    year_element = item_html.select_one(".year")
    if year_element:
        year_raw = year_element.text.strip()
        data["year"] = year_raw.split(",")[0].strip() if "," in year_raw else year_raw
            
    return data

def save_snapshot(filename, content):
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

def wait_delay():
    delay = random.uniform(4.0, 6.0)
    print(f"Ожидание {delay:.2f} сек...")
    time.sleep(delay)

def my_parser_loop():
    """Ваш оригинальный парсер, который крутится в бесконечном цикле"""
    while True:
        try:
            print("--- Запуск цикла парсинга по расписанию ---")
            init_db()
            
            with sync_playwright() as p:
                # ВАЖНО: Добавили флаги оптимизации, чтобы уложиться в 512 МБ на Render
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-accelerated-2d-canvas",
                        "--disable-gpu"
                    ]
                )
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = context.new_page()
                
                print("1. Открываем страницу авторизации...")
                page.goto(BASE_URL)
                page.wait_for_load_state("networkidle")
                
                if page.locator("input[name='kv_auth_pwd']").count() > 0:
                    print(" Форма найдена. Вводим пароль...")
                    page.fill("input[name='kv_auth_pwd']", PASSWORD)
                    wait_delay()
                    
                    print(" Нажимаем кнопку 'Войти'...")
                    page.click("button[type='submit']")
                    page.wait_for_load_state("networkidle")
                    wait_delay()
                else:
                    print("Форма авторизации не найдена.")
                    
                if "Введите пароль" in page.content():
                    print(" Ошибка: Не удалось авторизоваться. Проверьте пароль.")
                    browser.close()
                    continue
                    
                print(" Авторизация успешна! Начинаем сбор данных...")
                
                for category in CATEGORIES:
                    print(f"\n--- Сканируем категорию: {category} ---")
                    page.goto(f"{BASE_URL}{category}?page=1")
                    page.wait_for_load_state("networkidle")
                    soup_init = BeautifulSoup(page.content(), "html.parser")
                    
                    pagination = soup_init.select_one("#pg_full .pagination")
                    total_pages = 1
                    if pagination:
                        links = pagination.select("li a")
                        pages = []
                        for link in links:
                            href = link.get("href", "")
                            if "page=" in href:
                                try: pages.append(int(href.split("page=")[-1]))
                                except ValueError: continue
                        if pages: total_pages = max(pages)
                    
                    print(f"Обнаружено страниц для сбора: {total_pages}")
                    pages_to_parse = min(2, total_pages) 
                    
                    for page_num in range(1, pages_to_parse + 1):
                        page_url = f"{BASE_URL}{category}?page={page_num}"
                        print(f"Обработка страницы {page_num}/{pages_to_parse}: {page_url}")
                        
                        try:
                            page.goto(page_url)
                            page.wait_for_load_state("networkidle")
                            
                            if "Введите пароль" in page.content():
                                print(f" Сессия сброшена на странице {page_num}. Остановка.")
                                break
                                
                            soup = BeautifulSoup(page.content(), "html.parser")
                            items = soup.select("li.item")
                            
                            added_count = 0
                            for item in items:
                                parsed_data = parse_item(item)
                                if parsed_data:
                                    save_to_db(parsed_data)
                                    added_count += 1
                            print(f" Успешно сохранено/обновлено карточек: {added_count}")
                        except Exception as e:
                            print(f"Ошибка страницы {page_num}: {e}")
                browser.close()
        except Exception as big_e:
            print(f"Критическая ошибка в потоке парсера: {big_e}")
            
        print("Парсинг завершен. Засыпаем на 1 час...")
        time.sleep(3600)  # Скрипт будет просыпаться каждый час



import threading
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.on_event("startup")
def start_background_tasks():
    # Запускаем парсер в отдельном независимом потоке
    threading.Thread(target=my_parser_loop, daemon=True).start()

@app.get("/")
def home():
    return {"status": "Parser web-worker is alive"}

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
