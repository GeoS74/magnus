const fs = require('fs');
const Staffer = require('@valdane/models/Staffer');
const StafferFile = require('@valdane/models/StafferFile');
const limitDocs = 50;


exports.checkCredentials = (ctx, next) => {
    if (ctx.request.body.birthday) {
        if (!ctx.getDate(ctx.request.body.birthday)) {
            ctx.status = 400;
            ctx.body = { path: 'birthday', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.startDate) {
        if (!ctx.getDate(ctx.request.body.startDate)) {
            ctx.status = 400;
            ctx.body = { path: 'startDate', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.vaccinationStart) {
        if (!ctx.getDate(ctx.request.body.vaccinationStart)) {
            ctx.status = 400;
            ctx.body = { path: 'vaccinationStart', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.vaccinationEnd) {
        if (!ctx.getDate(ctx.request.body.vaccinationEnd)) {
            ctx.status = 400;
            ctx.body = { path: 'vaccinationEnd', message: 'Не корректная дата' };
            return;
        }
    }
    if (ctx.request.body.position) {
        if (!ctx.checkObjectId(ctx.request.body.position)) {
            ctx.status = 400;
            ctx.body = { path: 'position', message: 'Не валидный id должности' };
            return;
        }
    }
    return next();
};

exports.uploadFile = async ctx => {
    if (!ctx.checkObjectId(ctx.request.body.id_staffer)) {
        return ctx.throw(403, 'не валидный id сотрудника');
    }


    if(!ctx.request.files){
        return ctx.throw(400, 'файл не загружен');
    }

    if(!ctx.request.files.scanCopy.size){
        //delete temp file
        fs.unlink(ctx.request.files.scanCopy.path, err => {
            if(err) console.log(err);
        });
        return ctx.throw(400, 'файл не загружен');
    }

    if(ctx.request.files.scanCopy.size > 50000000){ //50Mb
        //delete temp file
        fs.unlink(ctx.request.files.scanCopy.path, err => {
            if(err) console.log(err);
        });
        return ctx.throw(400, 'файл слишком большой');
    }

    let newFileName = ctx.request.files.scanCopy.hash + '_' + Date.now() + '.' + ctx.request.files.scanCopy.name.split('.').pop();
    fs.rename(ctx.request.files.scanCopy.path, './components/valdane/scancopy/'+newFileName, err => {
        if(err) ctx.throw(500, err);
    });
 

    const stafferFile = await StafferFile.create({
        staffer: ctx.request.body.id_staffer,
        scanCopyFile: newFileName,
        alias: ctx.request.body.file_alias || undefined
    });


    // ctx.body = {
    //     id: thema._id,
    //     letters: [getLetterStruct(letter)],
    // }

    // console.log(ctx.request.body);
    // console.log(ctx.request.files);
    // console.log(stafferFile);
    ctx.body = {
        files: [{
            id: stafferFile._id,
            alias: stafferFile.alias,
            fname: stafferFile.scanCopyFile
        }]
    };
};

exports.delFile = async ctx => {
    const delFile = await StafferFile.findOneAndDelete({_id: ctx.params.id});
    fs.unlink('./components/valdane/scancopy/'+delFile.scanCopyFile, err => {
        if(err) console.log(err);
    });

    ctx.body = {
        id: ctx.params.id
    };
};

exports.searchStaffers = async ctx => {
    const filter = {
        $text: { 
            $search: ctx.request.query.needle,
            $language: 'russian'
        }};

    const projection = {
        score: { $meta: "textScore" } //добавить в данные оценку текстового поиска (релевантность)
    };

    if(ctx.request.query.last_id) filter._id = {$lt: ctx.request.query.last_id};

    const staffers = await Staffer
        .find(filter, projection)
        .sort({
            _id: -1,
           //score: { $meta: "textScore" } //сортировка по релевантности
        }).limit(limitDocs)
        .populate('position');

        ctx.body = staffers.map(staff => ({
            id: staff._id,
            name: staff.name,
            status: staff.status,
            position: (staff.position && staff.position.title)  ? staff.position.title : '',
            shortName: staff.shortName,
        }));
};


exports.allStaffers = async (ctx, next) => {
    if(ctx.request.query.needle) return next();

    try {
        const filter = {};

        if(ctx.request.query.last_id) filter._id = {$lt: ctx.request.query.last_id};

        const staffers = await Staffer.find(filter)
            .sort({ _id: -1 })
            .limit(limitDocs)
            .populate('position');
        // console.log(staffers);

        ctx.body = staffers.map(staff => ({
            id: staff._id,
            name: staff.name,
            status: staff.status,
            position: (staff.position && staff.position.title)  ? staff.position.title : '',
            shortName: staff.shortName,
        }));
    }
    catch (error) {
        throw error;
    }
};

exports.addStaffer = async ctx => {
    try {
        const staffer = await Staffer.create({
            name: ctx.request.body.name.trim(),
            personnelNumber: ctx.request.body.personnelNumber.trim() || undefined,
            position: ctx.request.body.position || undefined,
            skill: ctx.request.body.skill.trim() || undefined,
            passport: ctx.request.body.passport.trim() || undefined,
            birthday: ctx.getDate(ctx.request.body.birthday) || undefined,
            contacts: ctx.request.body.contacts.trim() || undefined,
            placeOfResidence: ctx.request.body.placeOfResidence.trim() || undefined,
            baseCity: ctx.request.body.baseCity.trim() || undefined,
            isBusy: ctx.request.body.hasOwnProperty('isBusy') || false,
            startDate: ctx.getDate(ctx.request.body.startDate) || undefined,
            bankcardNumber: ctx.request.body.bankcardNumber.trim() || undefined,
            status: ctx.request.body.status.trim() || undefined,
            characteristic: ctx.request.body.characteristic.trim() || undefined,
            biometricData: {
                coveralls: ctx.request.body.coveralls.trim() || undefined,
                sizeHead: ctx.request.body.sizeHead.trim() || undefined,
                height: ctx.request.body.height.trim() || undefined,
                clothingSize: ctx.request.body.clothingSize.trim() || undefined,
                shoeSize: ctx.request.body.shoeSize.trim() || undefined,
            },
            vaccination: {
                start: ctx.getDate(ctx.request.body.vaccinationStart) || undefined,
                end: ctx.getDate(ctx.request.body.vaccinationEnd) || undefined
            }
        });

        ctx.body = {
            id: staffer._id
        };
    }
    catch (error) {
        // console.log(error.errors);

        if (error.name === 'ValidationError') {
            ctx.status = 400;

            if (error.errors.name) {
                if (error.errors.name.kind === 'required') {
                    return ctx.body = { path: 'name', message: 'Ф.И.О. не может быть пустым' };
                }
                if (error.errors.name.kind === 'unique') {
                    return ctx.body = { path: 'name', message: 'Такой сотрудник уже есть' };
                }
            } else throw error; //для ошибок валидации, которые не обрабатываются (напр. не корректный ObjectId должности сотрудника)

        } else throw error;
    }
};

exports.getStaffer = async ctx => {
    if (!ctx.checkObjectId(ctx.params.id)) return ctx.throw(400, 'user not found');
    const staffer = await Staffer.findOne({ _id: ctx.params.id }).populate('position').populate('files');
    if (!staffer) return ctx.throw(400, 'user not found');

    ctx.body = {
        id: staffer._id,
        position: staffer.position ? {
            title: staffer.position.title,
            id: staffer.position._id,
        } : {},
        bankcardNumber: staffer.bankcardNumber,
        baseCity: staffer.baseCity,
        biometricData: staffer.biometricData,
        birthday: staffer.birthday,
        characteristic: staffer.characteristic,
        contacts: staffer.contacts,
        isBusy: staffer.isBusy,
        name: staffer.name,
        passport: staffer.passport,
        personnelNumber: staffer.personnelNumber,
        placeOfResidence: staffer.placeOfResidence,
        skill: staffer.skill,
        startDate: staffer.startDate,
        status: staffer.status,
        vaccination: staffer.vaccination || {},
        files: staffer.files ? staffer.files.map(f => ({
            id: f._id,
            alias: f.alias,
            fname: f.scanCopyFile
        })) : {}
    }
};

exports.delStaffer = async ctx => {
    try {
        await Staffer.findOneAndDelete({ _id: ctx.params.id });

        //удаление всех связанных файлов
        const files = await StafferFile.find({staffer: ctx.params.id});
        if(files.length){
            for(const file of files) {
                fs.unlink('./components/valdane/scancopy/'+file.scanCopyFile, err => {
                    if(err) console.log(err);
                });
            }
        }
        await StafferFile.deleteMany({staffer: ctx.params.id});

        ctx.body = {
            id: ctx.params.id
        };
    }
    catch (error) {
        throw error;
    }
};

exports.updStaffer = async ctx => {
    try {
        const staffer = await Staffer.findOneAndUpdate(
            { _id: ctx.params.id },
            {
                name: ctx.request.body.name.trim(),
                personnelNumber: ctx.request.body.personnelNumber.trim() || null,
                position: ctx.request.body.position || null,
                skill: ctx.request.body.skill.trim() || null,
                passport: ctx.request.body.passport.trim() || null,
                birthday: ctx.getDate(ctx.request.body.birthday) || null,
                contacts: ctx.request.body.contacts.trim() || null,
                placeOfResidence: ctx.request.body.placeOfResidence.trim() || null,
                baseCity: ctx.request.body.baseCity.trim() || null,
                isBusy: ctx.request.body.hasOwnProperty('isBusy') || false,
                startDate: ctx.getDate(ctx.request.body.startDate) || null,
                bankcardNumber: ctx.request.body.bankcardNumber.trim() || null,
                status: ctx.request.body.status.trim() || null,
                characteristic: ctx.request.body.characteristic.trim() || null,
                biometricData: {
                    coveralls: ctx.request.body.coveralls.trim() || null,
                    sizeHead: ctx.request.body.sizeHead.trim() || null,
                    height: ctx.request.body.height.trim() || null,
                    clothingSize: ctx.request.body.clothingSize.trim() || null,
                    shoeSize: ctx.request.body.shoeSize.trim() || null,
                },
                vaccination: {
                    start: ctx.getDate(ctx.request.body.vaccinationStart) || null,
                    end: ctx.getDate(ctx.request.body.vaccinationEnd) || null
                }
            },
            {
                new: true,
                runValidators: true //запускает валидаторы схемы перед записью
            }
        );
        ctx.body = {id: staffer._id};
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            ctx.status = 400;

            if (error.errors.name) {
                if (error.errors.name.kind === 'required') {
                    return ctx.body = { path: 'name', message: 'Ф.И.О. не может быть пустым' };
                }
                if (error.errors.name.kind === 'unique') {
                    return ctx.body = { path: 'name', message: 'Такой сотрудник уже есть' };
                }
            } else throw error; //для ошибок валидации, которые не обрабатываются (напр. не корректный ObjectId должности сотрудника)

        } else throw error;
    }
};


function delay(ms) {
    return new Promise(res => {
        setTimeout(_ => res(), ms);
    });
}