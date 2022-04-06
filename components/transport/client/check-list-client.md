1) поправить выпадающие списки подбора городов
2) проработать возможность выгружать БД на клиента и использовать её через SessionStorage
3) добавить расширенные настройки для расчёта. Данные по настройкам хранить на клиенте


----------Запрос на расчёт:----------
адрес: /transport/calculation
метод: POST

в данных должен передаваться ключ `carrier` с названием перевозчика.
См. файл @transport/index.js метод router.post('/calculation', ...)

----------Ответ сервера:----------
если код 200-299
{
    main: {
        carrier: 'название перевозчика',
        price: 'общая стоимость перевозки',
        days: 'кол-во дней',
    },
    detail: [
       {
           name: '...',
           value: '...'
       },
       {
           ...
       }
    ]
}

Кдючи main и detail присутствуют в каждом ответе сервера. Объект main гарантировано будет иметь ключи carrier, price, days.
Массив detail может быть пустым или содержать объекты. Если объекты есть, то у них 2 ключа: name и value.

если код 400
будет возвращен объект
{
    path: 'id поля с ошибочными данными'
    message: 'сообщение об ошибке'
}

если любой другой код
будет возвращен объект
{
    error: 'описание ошибки'
}