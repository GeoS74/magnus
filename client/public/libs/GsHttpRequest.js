/*
let fd = new FormData;
fd.append(key, null); //null будет записан как строка и передан на сервер
data = {
	form_data: fd.append(key, null), //null будет записан как строка и передан на сервер
	val_1: null, 					//отправится пустое значение
	val_2: undefined,				//отправится пустое значение
	val_3: [1,2,3],					//будут записаны значения с числовыми ключами (0, 1...n)
}
*/
"use strict"
var GsHttpRequest = {
	
	/*void query(string path, mixed data, function handler, bool cache)
	*/
	query: function(path, data, handler, cache)
	{
		//добавить проверку path...
		data = this.createFormData(data, new FormData());
		//добавить проверку handler...
		cache = cache || false;

		this.send(path, data, handler, cache);
	},

	/*string correctFieldName( string current_name, string new_name )
	*/
	correctFieldName: function(current_name, new_name)
	{
		new_name = new_name.replace(/\s/g, ''); //удалить возможные пробелы

		if(!current_name.length) return new_name;

		if( new_name.indexOf('[') > 0 )
		{
			return current_name+'['+new_name.slice(0, new_name.indexOf('['))+']'+new_name.slice(new_name.indexOf('['));
		}
		else return current_name+'['+ new_name+']';
	},

	/*FormData createFormData( object data, FormData form_data, string field_name )
	*/
	createFormData: function(data, form_data, field_name)
	{
		field_name = field_name || '';
		
		if(typeof data !== 'object') return form_data;

		for(let key in data)
		{
			if(typeof data[key] == 'object' && data[key] !== null) //typeof null === 'object' //true
			{
				switch(true)
				{
					case data[key] instanceof File: //добавление файла
						form_data.append(this.correctFieldName(field_name, key), data[key]);
						continue;

					case data[key] instanceof FormData: //добавление объекта FormData
						//WARNING!!! FormData.entries() не работает в IE
						//WARNING!!! for...of не работает в IE
						/* *
						let n = this.correctFieldName(field_name, key);
						for (let val of data[key].entries())
						{
							form_data.append(this.correctFieldName(n, val[0]), (val[1] || ''));
						}
						/* */

						//реализация объединения объектов FormData с поддержкой IE11
						//требует подключения formdata-полифил
						//читай про этот полифил: https://stackoverflow.com/questions/37938955/iterating-through-formdata-in-ie
						let n = this.correctFieldName(field_name, key);
						let iterator = data[key].entries();
						while(true)
						{
							let result = iterator.next();
							if(result.done) break;
							let val = result.value;					

							/*если в форме есть поле типа file, его нужно записывать только по своему ключу игнорируя вложенность структуры
							*всех передаваемых frontend-ом данных.
							*иначе значения полей типа text и т.д. будут затертыми ключами полей типа file
							*/
							if(val[1] instanceof File)
								form_data.append(this.correctFieldName('', val[0]), val[1]);
							else
								form_data.append(this.correctFieldName(n, val[0]), (val[1] || ''));
						}
						continue;

					default:
						this.createFormData(data[key], form_data, this.correctFieldName(field_name, key)); //рекурсия
						continue;
				}
			}
			else form_data.append(this.correctFieldName(field_name, key), (data[key] || ''));
		}
		return form_data;
	},

	/*void send(string path, FormData form_data, function handler, bool cache)
	*/
	send: function(path, form_data, handler, cache)
	{
		fetch(path, {
			method: 'POST',
			headers: {
				//'Content-Type': 'application/json;charset=utf-8' //multipart/form-data
				},
			body: form_data
		})
		.then(function(response){
				/*headers
				let iterator = response.headers.entries();
				while(true)
				{
					let result = iterator.next();
					if(result.done) break;
					let val = result.value;
					console.log(val[0] + ': ' + val[1]);
				}
				*/				
			return response.json();
		})
		.then(function(answer){
			if(answer.buffer) console.log(answer.buffer);
			try
			{
				handler(answer.result);
			}
			catch(e)
			{
				console.log(e);
			}
		});

		/*
		$.ajax({
                url: path,
				type: 'post',
				data: form_data,
                cache: false,

				dataType : false, //'json' / false / 'html'
				contentType: false, //'application/octet-stream', //false / 'application/octet-stream' / 'multipart/form-data'
				processData: false,
				
                success: function(data)
				{
					try //попытка декодировать JSON данные от сервера
					{
						//answer.buffer - содержит весь буфер вывода
						//answer.result - данные от сервера для ajax запроса
						let answer = JSON.parse(data);
						if(answer.buffer) console.log(answer.buffer);
						try
						{
							handler(answer.result);
						}
						catch(e)
						{
							console.log(e);
						}
					}
					catch(e)
					{
						console.log(e);
						console.log(data);
					}
                },
		});
		*/
	},
};