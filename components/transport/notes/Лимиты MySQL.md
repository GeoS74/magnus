### php.ini
- upload_max_filesize — максимальный размер загружаемого файла
- post_max_size — максимальный размер сообщения методом POST

### для XAMPP
в файле: xampp\phpMyAdmin\libraries\config.default.php
- `$cfg['ExecTimeLimit'] = 10000;` - максимальное время для импорта

### Ubuntu  
найти директоирю с phpmyadmin в ubuntu: `find / -iname "phpmyadmin*" -type d`