const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const port = 3456;

const url_client = 'https://client-camera-food.vercel.app/';

// Настройки CORS
const corsOptions = {
    origin: '*', // Разрешаем запросы только с этого домена
    methods: 'GET', // Разрешаем только GET-запросы
    optionsSuccessStatus: 200 // Для старых браузеров
};

// Применяем настройки CORS
app.use(cors(corsOptions));

// Добавляем middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

app.get('/product/info', async (req, res) => {
    // Явно устанавливаем CORS заголовки
    res.header('Access-Control-Allow-Origin', url_client);
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    const barcode = req.query.barcode;
    
    if (!barcode) {
        return res.status(400).json({
            success: false,
            error: 'Штрих-код не указан'
        });
    }

    try {
        console.log(`Получен запрос на поиск штрих-кода: ${barcode}`);
        const targetUrl = `https://barcode-list.ru/barcode/RU/Поиск.htm?barcode=${barcode}`;
        
        console.log(`Отправка запроса к: ${targetUrl}`);
        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Ошибка при запросе к API: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const htmlText = await response.text();
        console.log('Получен ответ от сервера barcode-list.ru');
        
        // Ищем информацию о товаре
        let productName = null;

        // Метод 1: Поиск в тексте страницы
        const productMatch = htmlText.match(/Этот штрих-код встречается в следующих товарах:\s*([^;]+)/);
        if (productMatch && productMatch[1]) {
            productName = productMatch[1].trim();
            console.log('Найдено название товара (метод 1):', productName);
        }

        // Метод 2: Поиск в заголовке
        if (!productName) {
            const titleMatch = htmlText.match(/<title>([^-]+) - Штрих-код:/i);
            if (titleMatch && titleMatch[1]) {
                productName = titleMatch[1].trim();
                console.log('Найдено название товара (метод 2):', productName);
            }
        }

        if (productName) {
            const responseData = {
                success: true,
                name: productName,
                barcode: barcode
            };
            console.log('Отправка ответа клиенту:', responseData);
            res.json(responseData);
        } else {
            console.log('Товар не найден в базе данных');
            res.json({
                success: false,
                error: 'Товар не найден в базе данных'
            });
        }

    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при загрузке данных'
        });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на https://server-camera-food.onrender.com`);
    console.log(`CORS настроен для домена ${url_client}`);
}); 
