const fs = require('fs');
const { isValidObjectId } = require('mongoose');
const mongoose = require('mongoose');
const path = require('path');
const Letter = require('@letters/models/Letter');
const LetterThema = require('@letters/models/LetterThema');
const limitDocs = 50;

module.exports.addThema = async function(ctx, next){
    //if(!ctx.request.body.title) return ctx.throw(400, 'Тема должна быть заполнена');
    try{
        const thema = await LetterThema.create({
            title: ctx.request.body.title
            //description: ctx.request.body.description || undefined
            // user: ...
        });

        ctx.body = {
            id: thema._id,
            title: thema.title,
            createdAt: thema.createdAt, 
            updatedAt: thema.updatedAt, 
        };
    }
    catch(error){
        if(error.name === 'ValidationError') {
            ctx.throw(400, 'Тема должна быть заполнена');
        } else throw error;
    }
};
//получает дату в строке вида "ДД.ММ.ГГГГ", пытается преобразовать во временную метку и возвращает её в случае успеха или null
function getTimestamp(str){
    if(!str) return null;
    
    let arr = str.split(/\D/g).reverse();

    for(let i = -1; ++i < arr.length;){
      
      arr[i] = Number.parseInt(arr[i]);
      if(i == 0 && (arr[i] < 1) && (arr[i] > 31)) return null;
      if(i == 1 && (arr[i] < 1) && (arr[i] > 12)) return null;
    }

    if(arr[1]) --arr[1];
      else arr[1] = 0;

    const d = new Date(...arr);
    if (Object.prototype.toString.call(d) === "[object Date]") {
      // it is a date
      if (isNaN(d.getTime())) return null; // date is not valid
          else return d; // date is valid
    } else {
        return null; // not a date
    }
}

module.exports.addLetter = async function (ctx, next){
    //console.log(ctx.request.body);
    //console.log(ctx.request.files);

    //uncomment this
    //
    if(!ctx.request.files){
        return ctx.throw(400, 'файл не загружен');
    }

    if(!ctx.request.files.scanCopyLetter.size){
        //delete temp file
        fs.unlink(ctx.request.files.scanCopyLetter.path, err => {
            if(err) console.log(err);
        });
        return ctx.throw(400, 'файл не загружен');
    }

    let newFileName = ctx.request.files.scanCopyLetter.hash + '_' + Date.now() + '.' + ctx.request.files.scanCopyLetter.name.split('.').pop();
    fs.rename(ctx.request.files.scanCopyLetter.path, './components/letters/scancopy/'+newFileName, err => {
        //if(err) throw err;
        if(err) ctx.throw(500, err);
    });

    const thema = await LetterThema.findOne({'_id': ctx.request.body.id_thema});

    const letter = await Letter.create({
        thema: ctx.request.body.id_thema,
        thema_tags: thema.title,
        number: ctx.request.body.number,
        date: getTimestamp(ctx.request.body.date) || undefined,
        description: ctx.request.body.description || undefined,
        // uncomment this
        //
        scanCopyFile: newFileName
    });


    ctx.body = {
        id: thema._id,
        letters: [getLetterStruct(letter)],
    }
}

module.exports.objectIdValidator = async function(ctx, next){
    if(ctx.request.query.letter_id) 
        if(!isValidObjectId(ctx.request.query.letter_id)) ctx.throw(400, "letter_id is not ObjectId");

    if(ctx.request.query.thema_id) 
        if(!isValidObjectId(ctx.request.query.thema_id)) ctx.throw(400, "thema_id is not ObjectId");
    
    await next();
};

module.exports.allThemas = async function(ctx, next){
    if(ctx.request.query.needle) return await next();

    const filter = {};

    if(ctx.request.query.thema_id) filter._id = {$lt: ctx.request.query.thema_id};

   const themas = await LetterThema
    .find(filter)
    .sort({ _id: -1 }).limit(limitDocs)
    .populate('letters');

    ctx.body = themas.map(thema => ({
        id: thema._id,
        title: thema.title,
        createdAt: thema.createdAt,
        updatedAt: thema.updatedAt,
        letters: thema.letters.map(letter => getLetterStruct(letter)),
    }));
};

//Вариант 4 - find() and populate()
//
//почитать про $meta
//https://docs.mongodb.com/manual/reference/operator/aggregation/meta/#mongodb-expression-exp.-meta
module.exports.searchThemas = async function(ctx, next){
    const filter = {
        $text: { 
            $search: ctx.request.query.needle,
            $language: 'russian'
        }};

    const projection = {
        score: { $meta: "textScore" } //добавить в данные оценку текстового поиска (релевантность)
    };

    if(ctx.request.query.letter_id) filter._id = {$lt: ctx.request.query.letter_id};

    const letters = await Letter
        .find(filter, projection)
        .sort({
            _id: -1,
           //score: { $meta: "textScore" } //сортировка по релевантности
        }).limit(limitDocs)
        .populate('thema');

    let themas = {};
    letters.map(letter => {
        if(themas[letter.thema._id]){
            themas[letter.thema._id].letters.push(getLetterStruct(letter));
            return;
        }

        themas[letter.thema._id] = {
            id: letter.thema._id,
            title: letter.thema.title,
            createdAt: letter.thema.createdAt,
            updatedAt: letter.thema.updatedAt,
            letters: [getLetterStruct(letter)]
        };
    });

    ctx.body = Object.values(themas);
};

//Вариант 5 - aggregate()
//
//работает - агрегация с новой схемой БД
module.exports.searchThemas_ = async function(ctx, next){
    console.log('тест Вариант 5:');
    const filter = [{
        $text: { 
            $search: ctx.request.query.needle,
            $language: 'russian'
        }}];

    if(ctx.request.query.letter_id)
        filter.push({ _id: { $lt: new mongoose.Types.ObjectId(ctx.request.query.letter_id) } });

    const result = await Letter
        .aggregate([
            { $match: { $and: filter }},
            { 
                $sort: { //этап сортировки писем должен быть первым иначе поиск тормозит.
                    '_id': -1,
                    //score: { $meta: "textScore" } //сортировка по релевантности добавляет тормозов (на 3,5М +1 sec)
                }}, 
            {
                $lookup: {
                    from: "letterthemes", 
                    localField: "thema", 
                    foreignField: "_id",
                    as: "thema_parent"
                }
            },
            { $limit: limitDocs },
            {
                $group: { 
                    _id: "$thema",
                    id: { "$first": "$thema_parent._id" },
                    title: { "$first": "$thema_parent.title" },
                    createdAt: { "$first": "$thema_parent.createdAt" },
                    updatedAt: { "$first": "$thema_parent.updatedAt" },
                    letters: { "$push": {
                        id: "$_id",
                        description: "$description",
                        number: "$number",
                        date: "$date",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt",
                    }}}
            },
            { $sort: { 'letters.id': -1 }}, //дополнительный этап сортировки по _id тем нужен, чтобы не было ошибок подгрузки данных
            {
                $project: {
                    _id: 0,
                    id: 1,
                    title: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    letters: 1,
                }
            }
        ])
        //.explain()
        ;
        //console.log(result);
        ctx.body = result;
};

//сформировать структуру данных письма
function getLetterStruct(letter){
    return {
        id: letter._id,
        description: letter.description,
        number: letter.number,
        date: letter.date,
        pathFile: letter.scanCopyFile,
        createdAt: letter.createdAt,
        updatedAt: letter.updatedAt,
    };
}

//заполнение БД для тестов (отключи обязательную загрузку файлов)
module.exports.manyCreate = async function(ctx, next){
    const arr = [
        {title: 'Lorem ipsum dolor sit amet'},
        {title: 'Pellentesque habitant morbi tristique'},
        {title: 'Vestibulum efficitur pharetra neque'},
        {title: 'Aliquam et augue'},
        {title: 'Morbi id mauris condimentum'},
        {title: 'Donec tincidunt dapibus libero'},
        {title: 'Curabitur eu nibh eu lorem posuere sagittis'},
        {title: 'Nam vitae porta odio'},
        {title: 'Mauris vitae nulla rhoncu'},
        {title: 'Cras lacinia sapien'},
        {title: 'Pellentesque pharetra eleifend enim non pulvinar'},
        {title: 'Duis tincidunt ultrices neque quis vestibulum'},
        {title: 'Nunc dignissim felis magna'},
        {title: 'Pellentesque'},
        {title: 'Vestibulum vulputate condimentum enim in varius'},
        {title: 'Class aptent taciti sociosqu'},
        {title: 'litora torquent per'},
        {title: 'Phasellus sed facilisis ante'},
        {title: 'Quisque fringilla'},
        {title: 'neque leo vestibulum ipsum'},
    ];



    for(let i = 0; i < 50000; i++) {
       let themas = await LetterThema.create(arr);

       let letters = [];
       for(let t of themas) {
           letters.push({
                thema: t._id,
                thema_tags: t.title,
                description: t.title
           });
       }

       await Letter.create(letters);
    }

    ctx.body = 'run time: ' + ((Date.now() - start)/1000) + ' sec';
};





/*********** это тестовые функции поиска, не используй их ***********/

//Вариант 3
//
//работает - агрегация (простая схема БД)
module.exports._searchThemas = async function(ctx, next){
    let start = Date.now();

    const regexp = new RegExp(ctx.request.query.needle);

    const result = await LetterThema
        .aggregate([
            //{ $match:{ '_id': { $lt: new mongoose.Types.ObjectId('6188cb6691ec020242f21239') } } },
            
            
            //  {
            //     // $match: { $text: { 
            //     //     $search: ctx.request.query.needle,
            //     //     $language: 'russian'
            //     // }},
            { $sort: {'_id': -1} }, //этап сортировки должен быть первым иначе поиск тормозит. При этом выдачу почему-то трясёт
            {
                $lookup: {
                    from: "letters", 
                    localField: "_id", 
                    foreignField: "thema",
                    as: "letters"
                }
            },
            {
                $unwind: {
                    path: '$letters',
                    preserveNullAndEmptyArrays: true
                }
            },
            {  
                $match: {
                    $or: [
                        { 'thema':          { $regex: regexp, $options: "i" } },
                        { 'letters.number': { $regex: regexp, $options: "i" } }
                    ]
                }
            },
            { $limit: limitDocs },
            {
                $group: { 
                    _id: "$_id",
                    thema:     { "$first": "$thema" },
                    createdAt: { "$first": "$createdAt" },
                    updatedAt: { "$first": "$updatedAt" },
                    letters: { "$push": "$letters" }
                }
            }
        ])

        //{ hint: { 'TextSearchIndex': 1 } })
        //.explain()
        ;
        console.log('~~~~~~~~~~~~~~~~~~~~~');
        console.log( 'run time: ', (Date.now() - start)/1000, ' sec' );
        ctx.body = result;
};


//Вариант 2
//
//работает - поиск по индексам (простая схема БД)
module.exports.__searchThemas = async function(ctx, next){
    //console.log(ctx.request.query);

    const finder_themes = {
        $text: { 
            $search: ctx.request.query.needle,
            $language: 'russian'
        }
    };

    if(ctx.request.query.start_thema_id) finder_themes._id = {$lt: ctx.request.query.start_thema_id};

    const themas = await LetterThema
        .find(finder_themes)
        .sort({_id: -1}).limit(limitDocs)
        .populate({
            path: 'foo',
            match: { $text: { 
                $search: ctx.request.query.needle,
                $language: 'russian'
            }}
        });  
    
    
    const finder_letters = {
            $text: { 
                $search: ctx.request.query.needle,
                $language: 'russian'
            }
        };
    
    if(ctx.request.query.start_letter_id) finder_letters._id = {$lt: ctx.request.query.start_letter_id};

    const letters = await Letter
        .find(finder_letters)
        .sort({_id: -1}).limit(limitDocs)
        .populate('thema');
    
    //нормализация структуры писем
    const letters_new = letters.map(letter => ({
        _id: letter.thema._id,
        thema: letter.thema.thema,
        createdAt: letter.thema.createdAt,
        updatedAt: letter.thema.updatedAt,
        foo: [{
            _id: letter._id,
            number: letter.number,
            date: letter.date,
            createdAt: letter.createdAt,
            updatedAt: letter.updatedAt,
        }]
    }));


    
    console.log(themas);
    console.log('~~~~~~~~~~~~~~~~~~~~~~~');
    //console.log(letters);
    console.log('======================');
     console.log(letters_new);
    console.log('----------------------');


    



     ctx.body = themas.map(thema => ({
            id: thema._id,
            thema: thema.thema,
            description: thema.description,
            createdAt: thema.createdAt,
            letters: thema.foo.map(letter => ({
                id: letter._id,
                scanCopyFile: letter.scanCopyFile,
                number: letter.number,
                date: letter.date
            })),
       }));
    
    /*
        const letters = await LetterThema
            .aggregate([
                {
                    $match: { $text: { 
                        $search: ctx.request.query.needle,
                        $language: 'russian'
                    }},
                },
                {
                    $lookup: {
                        from: "letters", 
                        localField: "_id", 
                        foreignField: "thema",
                        pipeline: [
                            { 
                                $match: { $text: { 
                                    $search: ctx.request.query.needle,
                                    $language: 'russian'
                                }}
                             }
                         ],
                        as: "fooz"
                    }
                },
                {$sort: {_id: -1} },
                {$limit: 10}
            ]);
    
    
        const themas = await LetterThema
            .find({ 
                $text: { 
                    $search: '-'+ctx.request.query.needle,
                    $language: 'russian'
            }})
            .sort({_id: -1}).limit(limitDocs)
            .populate('foo');   
        


        console.log(letters);
        console.log('~~~~~~~~~~~~~~~~~~~~~~~');
        // console.log(themas);
        console.log('-----------------------');
    
        const themasWithEmptyLetters = [];
        const themasWithLetters = [];
        
        letters.map(letter => {
            letter.foo.length ? themasWithLetters.push(letter) : themasWithEmptyLetters.push(letter);
        });
    
        const only_themas = themasWithEmptyLetters.filter(thema => {
            for(let t of themas)
                if(t.thema === thema.thema) return thema;
            return false;
        });
    
        ctx.body = themasWithLetters.concat(only_themas).map(thema => ({
            id: thema._id,
            thema: thema.thema,
            description: thema.description,
            createdAt: thema.createdAt,
            letters: thema.foo.map(letter => ({
                id: letter._id,
                scanCopyFile: letter.scanCopyFile,
                number: letter.number,
                date: letter.date
            })),
       }));
       */
    };


//тест агрегации
//ограничения https://docs.mongodb.com/v4.2/tutorial/text-search-in-aggregation/
module.exports.___searchThemas = async function(ctx, next){
    let start = Date.now();

    const regexp = new RegExp(ctx.request.query.needle);

    const result = await LetterThema
        .aggregate([
            //{ $match:{ '_id': { $lt: new mongoose.Types.ObjectId('6188cb6691ec020242f21239') } } },
            
            
             {
                $match: { $text: { 
                    $search: ctx.request.query.needle,
                    $language: 'russian'
                }}
             },

             {
                $lookup: {
                        from: "letters", 
                        pipeline: [
                            {
                              $match: { $text: { 
                                $search: ctx.request.query.needle,
                                $language: 'russian'
                                }}
                            }
                          ],
                        localField: "_id", 
                        foreignField: "thema",
                        as: "letters"
                }
            },



             { $sort: {'_id': -1} },

            // {
            //     $lookup: {
            //         from: "letters", 
            //         localField: "_id", 
            //         foreignField: "thema",
            //         as: "letters"
            //     }
            // },
            {
                $unwind: {
                    path: '$letters',
                    preserveNullAndEmptyArrays: true
                }
            },
            {  
                $match: {
                    $or: [
                        { 'thema':          { $regex: regexp, $options: "i" } },
                        { 'letters.number': { $regex: regexp, $options: "i" } }
                    ]
                }
            },
            { $limit: limitDocs },
            {
                $group: { 
                    _id: "$_id",
                    thema:     { "$first": "$thema" },
                    createdAt: { "$first": "$createdAt" },
                    updatedAt: { "$first": "$updatedAt" },
                    letters: { "$push": "$letters" }
                }
            }
        ])

        //{ hint: { 'TextSearchIndex': 1 } })
        //.explain()
        ;
        console.log('~~~~~~~~~~~~~~~~~~~~~');
        console.log( 'run time: ', (Date.now() - start)/1000, ' sec' );
        ctx.body = result;  
};



module.exports._searchThemas_ = async function(ctx, next){
console.log(ctx.request.query);

    const letters = await LetterThema
        .find( ctx.request.query.start ? {_id: {$lt: ctx.request.query.start}} : {} )
        .sort({_id: -1}).limit(limitDocs)
        .populate({
                path: 'foo',
                match: { $text: { 
                    $search: ctx.request.query.needle,
                    $language: 'russian'
                }}
            });


    const themas = await LetterThema
        .find({ 
            _id: {$lt: letters[0]._id},
            $text: { 
                $search: ctx.request.query.needle,
                $language: 'russian'
        }})
        .sort({_id: -1}).limit(limitDocs)
        .populate({
            path: 'foo',
            match: { $text: { 
                $search: ctx.request.query.needle,
                $language: 'russian'
            }}
        });            

    const themasWithEmptyLetters = [];
    const themasWithLetters = [];
    
    letters.map(letter => {
        letter.foo.length ? themasWithLetters.push(letter) : themasWithEmptyLetters.push(letter);
    });

    const only_themas = themasWithEmptyLetters.filter(thema => {
        for(let t of themas)
            if(t.thema === thema.thema) return thema;
        return false;
    });

    ctx.body = themasWithLetters.concat(only_themas).map(thema => ({
        id: thema._id,
        thema: thema.thema,
        description: thema.description,
        createdAt: thema.createdAt,
        letters: thema.foo.map(letter => ({
            id: letter._id,
            scanCopyFile: letter.scanCopyFile,
            number: letter.number,
            date: letter.date
        })),
   }));
};













async function allLetter(ctx, next){
    // ctx.body = await Letter.find().populate('thema');
    ctx.body = ctx.params;
}
module.exports.allLetter = allLetter;






async function uploadLetters(ctx, next){
    const files = {};

    for(let fileName in ctx.request.files){
        if(!ctx.request.files[fileName].size){
            fs.unlink(ctx.request.files[fileName].path, err => {
                if(err) throw err;
            });
            continue;
        }

        const fName = fs.rename(
            ctx.request.files[fileName].path, 
            './files/' + ctx.request.files[fileName].hash + path.extname(ctx.request.files[fileName].path), 
            err => {
                if(err) throw err;
            });

        files[fileName] = {
            size: ctx.request.files[fileName].size,
            path: ctx.request.files[fileName].path,
            name: ctx.request.files[fileName].fName,
            type: ctx.request.files[fileName].type,
            hash: ctx.request.files[fileName].hash,
        };
    }

    ctx.files = files;
    next();
}

module.exports.uploadLetters = uploadLetters;






