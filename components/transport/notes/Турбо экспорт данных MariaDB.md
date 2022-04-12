# Турбо экспорт данных MariaDB
- MariaDB загружает из директории /var/...
    надо скопировать файлы в любую папку внутри /var
- создать таблицу в БД с кол-ом полей равным кол-ву столбцов в .csv
- в терминале MariaDB вызвать команду:
    `LOAD DATA INFILE '/var/testupload/STREET.csv' INTO TABLE streets FIELDS TERMINATED BY ';' ENCLOSED BY '"' LINES TERMINATED BY '\r\n' IGNORE 1 LINES;`

[Читай в документации](https://dev.mysql.com/doc/refman/5.7/en/load-data.html#load-data-file-location)